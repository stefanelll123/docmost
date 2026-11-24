import { deflateRawSync } from 'node:zlib';

const BASE64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const PLANTUML_ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';

// PlantUML text encoding: raw deflate, then base64 with PlantUML's own alphabet.
export function encodePlantuml(code: string): string {
  const base64 = deflateRawSync(Buffer.from(code, 'utf8')).toString('base64');
  let out = '';
  for (const char of base64) {
    if (char === '=') continue;
    out += PLANTUML_ALPHABET[BASE64_ALPHABET.indexOf(char)];
  }
  return out;
}
