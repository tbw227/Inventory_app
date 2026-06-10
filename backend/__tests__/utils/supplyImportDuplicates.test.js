const {
  analyzeImportDuplicates,
  applyDuplicatePolicy,
} = require('../../utils/supplyImportDuplicates');

describe('supplyImportDuplicates', () => {
  test('detects duplicate SKUs and keeps the first row', () => {
    const items = [
      { name: '[A1] Widget', quantity_on_hand: 1 },
      { name: '[B2] Other', quantity_on_hand: 2 },
      { name: '[A1] Widget copy', quantity_on_hand: 9 },
    ];
    const analysis = analyzeImportDuplicates(items);
    expect(analysis.duplicate_count).toBe(1);
    expect(analysis.kept_row_count).toBe(2);
    expect(analysis.duplicates[0].row).toBe(3);
    expect(analysis.duplicates[0].kept_row).toBe(1);
  });

  test('skip policy imports only first occurrences', () => {
    const items = [
      { name: '[A1] Widget' },
      { name: '[A1] Widget again' },
    ];
    const { items: out, policy } = applyDuplicatePolicy(items, 'skip');
    expect(policy).toBe('skip');
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('[A1] Widget');
  });

  test('add_separate policy renames duplicate rows without SKU prefix', () => {
    const items = [
      { name: '[A1] Widget' },
      { name: '[A1] Widget again' },
      { name: '[A1] Widget third' },
    ];
    const { items: out } = applyDuplicatePolicy(items, 'add_separate');
    expect(out).toHaveLength(3);
    expect(out[0].name).toBe('[A1] Widget');
    expect(out[1].name).toBe('Widget again (2)');
    expect(out[2].name).toBe('Widget third (3)');
  });
});
