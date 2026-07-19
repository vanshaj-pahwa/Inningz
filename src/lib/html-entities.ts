// Decodes HTML character references in text pulled out of raw markup.
//
// cheerio's `.text()`/`.attr()` already decode entities, but text extracted
// from HTML with a regex (e.g. an anchor's `title="..."`) keeps them encoded.
// React renders such strings verbatim, so `Lord&#x27;s` reaches the screen
// unless we decode it here, at the scraping/ingestion boundary.
//
// Decoding produces a plain string that is still rendered through React's
// default text escaping, so it introduces no XSS risk (no dangerouslySetInnerHTML).

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  copy: '©',
  reg: '®',
  trade: '™',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  deg: '°',
  times: '×',
  divide: '÷',
};

// Matches a decimal ref (&#39;), a hex ref (&#x27;), or a named ref (&amp;).
const ENTITY_RE = /&(#\d+|#[xX][0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g;

/**
 * Decode HTML entities in a string. Handles decimal and hexadecimal numeric
 * references generically plus the common named references. Unknown or malformed
 * references are left untouched. Idempotent for already-decoded text.
 */
export function decodeHtmlEntities(input: string): string {
  if (!input || input.indexOf('&') === -1) return input;

  return input.replace(ENTITY_RE, (match, entity: string) => {
    if (entity[0] === '#') {
      const isHex = entity[1] === 'x' || entity[1] === 'X';
      const codePoint = parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
        return match;
      }
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return match;
      }
    }
    const named = NAMED_ENTITIES[entity];
    return named !== undefined ? named : match;
  });
}
