import { describe, it, expect } from 'vitest';
import { mixHex } from './colorMix';

describe('mixHex', () => {
  it('割合が 0 なら b、1 なら a になる', () => {
    expect(mixHex('#ff0000', '#0000ff', 0)).toBe('#0000ff');
    expect(mixHex('#ff0000', '#0000ff', 1)).toBe('#ff0000');
  });
  it('a を ratio の割合で b に混ぜる', () => {
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mixHex('#059669', '#ffffff', 0.15)).toBe('#daefe9');
  });
});
