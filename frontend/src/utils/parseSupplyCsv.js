import Papa from 'papaparse'

/** Strip BOM and normalize newlines for cross-platform CSV exports. */
export function normalizeCsvText(text) {
  let t = String(text ?? '')
  if (t.charCodeAt(0) === 0xfeff) t = t.slice(1)
  return t
    .replace(/\u201c|\u201d/g, '"')
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
}

function isQuoteParseError(err) {
  const msg = String(err?.message || '').toLowerCase()
  const code = String(err?.code || '').toLowerCase()
  return code === 'quotes' || msg.includes('quote')
}

function filterDataRows(data) {
  return (data || []).filter(
    (row) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim() !== '')
  )
}

/** Prefer parses with consistent column counts (bad quote handling often collapses columns). */
function scoreParsedRows(rows) {
  if (!rows.length) return -1
  const widths = rows.map((row) => row.length)
  const max = Math.max(...widths)
  const min = Math.min(...widths)
  const consistent = max === min
  return rows.length * 1000 + max * 10 + (consistent ? 500 : 0)
}

/**
 * Excel often exports comma CSV as quoted fields separated by "," even when a field
 * contains inch marks (e.g. 3" x 4") that confuse strict RFC parsers.
 */
function parseLooseExcelCsvLine(line) {
  const trimmed = String(line ?? '').trim()
  if (!trimmed) return []

  if (!trimmed.includes('","')) {
    return trimmed.split(',').map((cell) => cell.trim().replace(/^"|"$/g, '').replace(/""/g, '"'))
  }

  let inner = trimmed
  if (inner.startsWith('"') && inner.endsWith('"')) {
    inner = inner.slice(1, -1)
  }

  return inner.split('","').map((cell) => cell.replace(/""/g, '"').trim())
}

function parseLooseExcelCsv(text) {
  const lines = normalizeCsvText(text).split('\n')
  const rows = []
  for (const line of lines) {
    const cells = parseLooseExcelCsvLine(line)
    if (cells.some((cell) => String(cell).trim() !== '')) rows.push(cells)
  }
  return rows
}

const PAPA_ATTEMPTS = [
  { skipEmptyLines: 'greedy', delimitersToGuess: [',', '\t', ';', '|'] },
  { skipEmptyLines: 'greedy', delimiter: '\t' },
  { skipEmptyLines: 'greedy', delimiter: ',' },
]

/**
 * Parse supply CSV text with fallbacks for Excel exports (inch marks, smart quotes).
 * @returns {{ rows: string[][], warnings: string[], error: string | null }}
 */
export function parseSupplyCsv(text) {
  const normalized = normalizeCsvText(text)
  if (!normalized.trim()) {
    return { rows: [], warnings: [], error: 'CSV file is empty.' }
  }

  let best = null

  for (const config of PAPA_ATTEMPTS) {
    const { data, errors } = Papa.parse(normalized, config)
    const rows = filterDataRows(data)
    const quoteErrors = (errors || []).filter(isQuoteParseError)
    const fatalErrors = (errors || []).filter((err) => !isQuoteParseError(err))

    if (!rows.length || fatalErrors.length) continue

    const candidate = {
      rows,
      warnings: quoteErrors.map((err) => err.message).filter(Boolean),
      quoteErrorCount: quoteErrors.length,
      score: scoreParsedRows(rows),
      source: 'papa',
    }

    if (
      !best ||
      candidate.score > best.score ||
      (candidate.score === best.score && quoteErrors.length < best.quoteErrorCount)
    ) {
      best = candidate
    }

    if (quoteErrors.length === 0) break
  }

  const looseRows = parseLooseExcelCsv(normalized)
  if (looseRows.length) {
    const looseCandidate = {
      rows: looseRows,
      warnings: [],
      quoteErrorCount: 0,
      score: scoreParsedRows(looseRows),
      source: 'loose',
    }
    if (!best || looseCandidate.score > best.score) {
      best = looseCandidate
    } else if (best.quoteErrorCount > 0 && looseCandidate.score >= best.score - 10) {
      // Papa choked on inch marks but still returned a broken grid — prefer Excel-style split.
      best = looseCandidate
    }
  }

  if (best?.rows.length) {
    const warnings = [...new Set(best.warnings)]
    if (best.source === 'loose' || best.quoteErrorCount > 0) {
      warnings.push(
        'Some cells had quote formatting issues (common with inch marks in product names). Review the column mapping and preview before committing.'
      )
    }
    return { rows: best.rows, warnings, error: null }
  }

  const last = Papa.parse(normalized, PAPA_ATTEMPTS[0])
  const messages = (last.errors || []).map((err) => err.message).filter(Boolean)
  return {
    rows: [],
    warnings: [],
    error: messages.length
      ? messages.slice(0, 3).join('; ') + (messages.length > 3 ? ` (+${messages.length - 3} more)` : '')
      : 'Could not parse delimited text. Try CSV/TSV, or upload the original Excel (.xlsx) file instead.',
  }
}
