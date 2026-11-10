import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAmazonUrl, affiliateUrl, sharedAmazonProductUrl } from './amazon-links.mjs';
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

test('normalizes ASIN and ignores tracking parameters', () => {
 assert.deepEqual(parseAmazonUrl('https://www.amazon.de/gp/aw/d/b0abc12345?tag=someone-21'), {asin:'B0ABC12345',marketplace:'amazon.de'});
});
test('rejects unsafe URL forms and malformed ASINs', () => {
 for(const u of ['https://user:pass@amazon.de/dp/B0ABC12345','https://amazon.de:8443/dp/B0ABC12345','https://amazon.de/dp/SHORT','https://amazon.de/dp/B0ABC12345XYZ','https://amazon.de.evil.com/dp/B0ABC12345','ftp://amazon.de/dp/B0ABC12345']) assert.equal(parseAmazonUrl(u),null);
});
test('rejects missing or malformed affiliate tags', () => {
 const product={asin:'B0ABC12345',marketplace:'amazon.de'};
 assert.throws(()=>affiliateUrl(product,{}));
 assert.throws(()=>affiliateUrl(product,{'amazon.de':'bad tag!'}));
});

test('canonicalizes imported Amazon.de URLs without preserving tracking tags', () => {
 assert.equal(sharedAmazonProductUrl('https://www.amazon.de/gp/aw/d/b0abc12345?tag=other-21&ref=tracking'),'https://www.amazon.de/dp/B0ABC12345');
 assert.equal(sharedAmazonProductUrl('http://amazon.de/dp/B0ABC12345?utm_source=external'),'https://www.amazon.de/dp/B0ABC12345');
 for(const url of [null,'https://amazon.com/dp/B0ABC12345','https://amazon.de.evil.test/dp/B0ABC12345','https://amazon.de/dp/INVALID'])assert.equal(sharedAmazonProductUrl(url),null);
});

test('mobile Amazon hosts canonicalize to the same marketplace without tracking', () => {
 for (const host of ['m.amazon.de','www.amazon.de','smile.amazon.de','amazon.de']) {
  const input='https://'+host+'/dp/B0ABC12345?tag=other-21#details';
  assert.deepEqual(parseAmazonUrl(input),{asin:'B0ABC12345',marketplace:'amazon.de'});
  assert.equal(sharedAmazonProductUrl(input),'https://www.amazon.de/dp/B0ABC12345');
 }
 for (const host of ['m.amazon.de.evil.test','m.evil.test','mobile.amazon.de','www.m.amazon.de']) {
  assert.equal(parseAmazonUrl('https://'+host+'/dp/B0ABC12345'),null);
 }
});
