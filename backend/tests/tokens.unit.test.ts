import { describe, it, expect } from 'vitest';
import { generateOpaqueToken, hashToken } from '../src/lib/tokens';

describe('lib/tokens', () => {
  it('gera tokens diferentes a cada chamada', () => {
    const a = generateOpaqueToken();
    const b = generateOpaqueToken();
    expect(a).not.toBe(b);
    expect(a).toHaveLength(64); // 32 bytes em hex
  });

  it('hash é determinístico para o mesmo token', () => {
    const token = generateOpaqueToken();
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it('hashes de tokens diferentes não colidem', () => {
    const a = generateOpaqueToken();
    const b = generateOpaqueToken();
    expect(hashToken(a)).not.toBe(hashToken(b));
  });

  it('o hash nunca é igual ao token original (não é passthrough)', () => {
    const token = generateOpaqueToken();
    expect(hashToken(token)).not.toBe(token);
  });
});
