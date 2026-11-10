import test from 'node:test';
import assert from 'node:assert/strict';
import { exportWishlistCsv } from './wishlist-utils.mjs';

const validRow = (overrides = {}) => ({
  wishlist_products: { asin: 'B012345678', marketplace: 'amazon.de', title: 'Buch' },
  note: 'Eine Notiz',
  priority: 2,
  created_at: '2026-11-10T00:00:00Z',
  ...overrides,
});

test('CSV export accepts valid public title and note', () => {
  const csv = exportWishlistCsv([validRow()]);
  assert.match(csv, /"Buch";"Eine Notiz";"2"/);
});

test('CSV export rejects empty and oversized public titles', () => {
  for (const title of ['', '  ', 'X'.repeat(251)]) {
    assert.throws(() => exportWishlistCsv([validRow({
      wishlist_products: { asin: 'B012345678', marketplace: 'amazon.de', title },
    })]), /Produkttitel/);
  }
});

test('CSV export rejects oversized notes', () => {
  assert.throws(() => exportWishlistCsv([validRow({ note: 'N'.repeat(501) })]), /Notiz/);
});

test('CSV export normalizes surrounding whitespace and preserves formula protection', () => {
  const csv = exportWishlistCsv([validRow({
    wishlist_products: { asin: 'B012345678', marketplace: 'amazon.de', title: '  =SUM(1,2)  ' },
    note: '  +danger  ',
  })]);
  assert.ok(csv.includes(`"'=SUM(1,2)";"'+danger"`));
});
