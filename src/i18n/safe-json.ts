/**
 * JSON for embedding inside a <script> tag. Plain JSON.stringify would let a "</script>" (or "<!--") inside a
 * translated string end the script block early; replacing "<" (and the two line-separator characters) with
 * JSON "u" escapes makes that impossible while the data stays identical once parsed.
 * The backslash is built from its character code so no tool or formatter can alter the escape sequences.
 */
const BACKSLASH = String.fromCharCode(92);
const LINE_SEPARATOR = new RegExp(String.fromCharCode(0x2028), 'g');
const PARAGRAPH_SEPARATOR = new RegExp(String.fromCharCode(0x2029), 'g');

export function safeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, `${BACKSLASH}u003c`)
    .replace(LINE_SEPARATOR, `${BACKSLASH}u2028`)
    .replace(PARAGRAPH_SEPARATOR, `${BACKSLASH}u2029`);
}
