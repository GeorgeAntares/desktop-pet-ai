export function normalizeApiKey(value: string): string {
  return value
    .trim()
    .replace(/^bearer\s+/i, '')
    .replace(/^['"]|['"]$/g, '')
    .trim()
}
