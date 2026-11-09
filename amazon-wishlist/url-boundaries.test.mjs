import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAmazonUrl, affiliateUrl, sharedAmazonProductUrl } from './amazon-links.mjs';

test('Amazon product imports reject credentials, custom ports and lookalike hosts', () => {
  const invalid = [
    'https://user:password@amazon.de/dp/B0ABC12345',
    'https://amazon.de:8443/dp/B0ABC12345',
    'https://amazon.de.evil.test/dp/B0ABC12345',
    'https://amazon.de@evil.test/dp/B0ABC12345',
    'https://amazon.de/dp/B0ABC1234',
    'https://amazon.de/dp/B0ABC123456',
    'data:text/html,https://amazon.de/dp/B0ABC12345',
  ];
  for (const url of invalid) {
    assert.equal(parseAmazonUrl(url), null, url);
    assert.equal(sharedAmazonProductUrl(url), null, url);
  }
});

test('shared Amazon.de links strip all external tracking and use HTTPS', () => {
  const input = 'http://smile.amazon.de/gp/product/b0abc12345?tag=attacker-21&ref_=abc&utm_source=other#tracking';
  assert.equal(sharedAmazonProductUrl(input), 'https://www.amazon.de/dp/B0ABC12345');
  assert.equal(sharedAmazonProductUrl('https://amazon.com/dp/B0ABC12345'), null);
});

test('affiliate links reject invalid products and tags without falling back to another market', () => {
  const valid = { asin: 'B0ABC12345', marketplace: 'amazon.de' };
  assert.equal(affiliateUrl(valid, { 'amazon.de': 'duhrrom-21' }),
    'https://www.amazon.de/dp/B0ABC12345?tag=duhrrom-21');
  for (const product of [null, { ...valid, asin: 'short' }, { ...valid, marketplace: 'amazon.de.evil.test' }]) {
    assert.throws(() => affiliateUrl(product, { 'amazon.de': 'duhrrom-21' }));
  }
  for (const tags of [{}, { 'amazon.com': 'other-20' }, { 'amazon.de': 'bad tag!' }]) {
    assert.throws(() => affiliateUrl(valid, tags));
  }
});
