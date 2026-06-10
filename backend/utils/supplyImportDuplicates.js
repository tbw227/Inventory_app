const { extractBracketSku } = require('./supplySku');

/**
 * Key used to detect duplicate rows within one import file.
 * Prefer catalog [SKU]; fall back to full normalized name.
 */
function duplicateKeyForItem(item) {
  const sku = extractBracketSku(item?.name);
  if (sku) return `sku:${sku.toLowerCase()}`;
  const name = String(item?.name ?? '').trim().toLowerCase();
  return name ? `name:${name}` : null;
}

/**
 * @param {Array<{ name: string }>} items
 */
function analyzeImportDuplicates(items) {
  const list = Array.isArray(items) ? items : [];
  const firstByKey = new Map();
  const duplicates = [];

  list.forEach((item, index) => {
    const key = duplicateKeyForItem(item);
    if (!key) return;

    const existing = firstByKey.get(key);
    if (!existing) {
      firstByKey.set(key, { index, item, sku: extractBracketSku(item.name) });
      return;
    }

    duplicates.push({
      row: index + 1,
      row_index: index,
      kept_row: existing.index + 1,
      kept_row_index: existing.index,
      sku: existing.sku || extractBracketSku(item.name) || null,
      name: String(item.name ?? '').trim(),
      match_type: existing.sku || extractBracketSku(item.name) ? 'sku' : 'name',
    });
  });

  const kept = list.filter((item, index) => {
    const key = duplicateKeyForItem(item);
    if (!key) return true;
    return firstByKey.get(key)?.index === index;
  });

  return {
    kept,
    duplicates,
    duplicate_count: duplicates.length,
    import_row_count: list.length,
    kept_row_count: kept.length,
  };
}

function stripBracketSkuFromName(name) {
  const raw = String(name ?? '').trim();
  const m = raw.match(/^\[[^\]]+\]\s*(.*)$/);
  const desc = m ? m[1].trim() : '';
  return desc || raw;
}

/**
 * @param {Array<object>} items
 * @param {'skip'|'add_separate'} policy
 */
function applyDuplicatePolicy(items, policy = 'skip') {
  const analysis = analyzeImportDuplicates(items);

  if (policy === 'add_separate') {
    const keyCounts = new Map();
    const transformed = listWithSeparateDuplicates(items, analysis, keyCounts);
    logDuplicateImportDecision('add_separate', analysis);
    return { items: transformed, analysis, policy };
  }

  logDuplicateImportDecision('skip', analysis);
  return { items: analysis.kept, analysis, policy };
}

function listWithSeparateDuplicates(items, analysis, keyCounts) {
  const duplicateRows = new Set(analysis.duplicates.map((d) => d.row_index));
  return items.map((item, index) => {
    if (!duplicateRows.has(index)) return item;

    const key = duplicateKeyForItem(item);
    const occurrence = (keyCounts.get(key) || 1) + 1;
    keyCounts.set(key, occurrence);

    const sku = extractBracketSku(item.name);
    let name;
    if (sku) {
      const desc = stripBracketSkuFromName(item.name);
      name = desc ? `${desc} (${occurrence})` : `${item.name} (${occurrence})`;
    } else {
      name = `${String(item.name ?? '').trim()} (${occurrence})`;
    }

    return { ...item, name };
  });
}

function logDuplicateImportDecision(policy, analysis) {
  if (!analysis.duplicate_count) return;

  console.info(
    `[supply-import] Duplicate policy=${policy}: ${analysis.duplicate_count} duplicate row(s), keeping ${analysis.kept_row_count} of ${analysis.import_row_count}`
  );

  const seenKeys = new Set();
  for (const dup of analysis.duplicates) {
    const label = dup.sku ? `SKU ${dup.sku}` : dup.name;
    const key = `${dup.kept_row_index}:${label}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    console.info(
      `[supply-import] First kept: row ${dup.kept_row} (${label}); later duplicate rows will be ${policy === 'skip' ? 'skipped' : 'added separately'}`
    );
  }
}

module.exports = {
  duplicateKeyForItem,
  analyzeImportDuplicates,
  applyDuplicatePolicy,
  stripBracketSkuFromName,
};
