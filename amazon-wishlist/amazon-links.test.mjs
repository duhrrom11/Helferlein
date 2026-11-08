import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAmazonUrl, affiliateUrl } from './amazon-links.mjs';
test('parses supported Amazon product links', () => {
 assert.deepEqual(parseAmazonUrl('https://www.amazon.de/dp/B0ABC12345?th=1'), { asin:'B0ABC12345', marketplace:'amazon.de' });
 assert.deepEqual(parseAmazonUrl('https://amazon.com/gp/product/B0ABC12345'), { asin:'B0ABC12345', marketplace:'amazon.com' });
});
test('rejects lookalike domains and non-product links', () => {
 for (const u of ['https://amazon.de.evil.test/dp/B0ABC12345','https://evil.test/dp/B0ABC12345','javascript:alert(1)','https://amazon.de/s?k=abc']) assert.equal(parseAmazonUrl(u),null);
});
test('uses only configured marketplace affiliate tag', () => {
 assert.equal(affiliateUrl({asin:'B0ABC12345',marketplace:'amazon.de'},{'amazon.de':'example-21'}),'https://www.amazon.de/dp/B0ABC12345?tag=example-21');
 assert.throws(()=>affiliateUrl({asin:'B0ABC12345',marketplace:'amazon.com'},{'amazon.de':'example-21'}));
});
