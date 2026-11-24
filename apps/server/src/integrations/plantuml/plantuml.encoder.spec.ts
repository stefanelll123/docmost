import { inflateRawSync } from 'node:zlib';
import { encodePlantuml } from './plantuml.encoder';

const BASE64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const PLANTUML_ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';

function decode(encoded: string): string {
  const base64 = [...encoded]
    .map((c) => BASE64_ALPHABET[PLANTUML_ALPHABET.indexOf(c)])
    .join('');
  return inflateRawSync(Buffer.from(base64, 'base64')).toString('utf8');
}

describe('encodePlantuml', () => {
  it('uses only the PlantUML alphabet', () => {
    expect(encodePlantuml('@startuml\nA -> B\n@enduml')).toMatch(
      /^[0-9A-Za-z\-_]+$/,
    );
  });

  it('round-trips unicode diagrams', () => {
    const code = '@startuml\nAlice -> Bob: Salut, ça va ?\n@enduml';
    expect(decode(encodePlantuml(code))).toBe(code);
  });

  it('matches the reference encoding', () => {
    expect(encodePlantuml('@startuml\nBob -> Alice : hello\n@enduml')).toBe(
      'SoWkIImgAStDuNBAJrBGjLDmpCbCJbMmKiX8pSd9vt98pKi1IW80',
    );
  });
});
