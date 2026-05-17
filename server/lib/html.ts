/**
 * Decodes HTML entities in a string — handles numeric (decimal + hex) and named entities.
 */
export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g,          (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
}
