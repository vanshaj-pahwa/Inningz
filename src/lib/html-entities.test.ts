import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeHtmlEntities } from './html-entities';

test('decodes hexadecimal references (Lord&#x27;s)', () => {
  assert.equal(decodeHtmlEntities('Lord&#x27;s, London'), "Lord's, London");
  assert.equal(decodeHtmlEntities('Lord&#X27;s'), "Lord's"); // uppercase X
});

test('decodes decimal references (Moeen&#39;s)', () => {
  assert.equal(decodeHtmlEntities("Moeen&#39;s"), "Moeen's");
  assert.equal(decodeHtmlEntities('&#8217;'), '’'); // right single quote
  assert.equal(decodeHtmlEntities('&#039;'), "'"); // leading zero
});

test('decodes common named references', () => {
  assert.equal(decodeHtmlEntities('Tom &amp; Jerry'), 'Tom & Jerry');
  assert.equal(decodeHtmlEntities('&lt;b&gt;'), '<b>');
  assert.equal(decodeHtmlEntities('a &quot;quote&quot;'), 'a "quote"');
  assert.equal(decodeHtmlEntities('Kohli&apos;s'), "Kohli's");
});

test('handles multiple and mixed entities', () => {
  assert.equal(
    decodeHtmlEntities('R &amp; D&#39;s &lt;test&gt; at Lord&#x27;s'),
    "R & D's <test> at Lord's",
  );
});

test('leaves already-decoded text unchanged (idempotent)', () => {
  const clean = "Lord's, London";
  assert.equal(decodeHtmlEntities(clean), clean);
  assert.equal(decodeHtmlEntities(decodeHtmlEntities('Lord&#x27;s')), "Lord's");
});

test('leaves unknown or malformed references untouched', () => {
  assert.equal(decodeHtmlEntities('AT&T'), 'AT&T'); // bare ampersand
  assert.equal(decodeHtmlEntities('&notareal;'), '&notareal;');
  assert.equal(decodeHtmlEntities('100 &amp 200'), '100 &amp 200'); // missing semicolon
  assert.equal(decodeHtmlEntities('&#xZZ;'), '&#xZZ;'); // invalid hex
});

test('handles empty and entity-free input fast-path', () => {
  assert.equal(decodeHtmlEntities(''), '');
  assert.equal(decodeHtmlEntities('no entities here'), 'no entities here');
});

test('does not itself execute or alter decoded markup (XSS is React’s job)', () => {
  // Decoding yields a plain string; the caller renders it as escaped React text.
  assert.equal(
    decodeHtmlEntities('&lt;script&gt;alert(1)&lt;/script&gt;'),
    '<script>alert(1)</script>',
  );
});
