import { describe, it, expect } from 'vitest';
import { KEEP_ORIGINAL_BYTES, MAX_IMAGE_EDGE, fitWithin, pickOutputType, shouldKeepOriginal } from './imageSize';

describe('fitWithin', () => {
  it('長辺が上限を超える横長の画像を、縦横の比を保って縮小すること', () => {
    expect(fitWithin({ width: 4000, height: 3000 })).toEqual({ width: 2048, height: 1536 });
  });

  it('長辺が上限を超える縦長の画像を、縦横の比を保って縮小すること', () => {
    expect(fitWithin({ width: 1500, height: 3000 })).toEqual({ width: 1024, height: 2048 });
  });

  it('上限以内の画像は、拡大も縮小もしないこと', () => {
    expect(fitWithin({ width: 800, height: 600 })).toEqual({ width: 800, height: 600 });
    expect(fitWithin({ width: MAX_IMAGE_EDGE, height: 10 })).toEqual({ width: MAX_IMAGE_EDGE, height: 10 });
  });

  it('極端に細長い画像でも、短辺が 0 にならないこと', () => {
    expect(fitWithin({ width: 100000, height: 10 })).toEqual({ width: 2048, height: 1 });
  });
});

describe('shouldKeepOriginal', () => {
  const small = { width: 400, height: 300 };

  it('上限以内で、小さいファイルは、そのまま使うこと', () => {
    expect(shouldKeepOriginal({ type: 'image/png', size: KEEP_ORIGINAL_BYTES }, small)).toBe(true);
  });

  it('ファイルが大きいときは、寸法が上限以内でも再圧縮すること', () => {
    expect(shouldKeepOriginal({ type: 'image/png', size: KEEP_ORIGINAL_BYTES + 1 }, small)).toBe(false);
  });

  it('長辺が上限を超えるときは、ファイルが小さくても縮小すること', () => {
    expect(shouldKeepOriginal({ type: 'image/png', size: 1000 }, { width: 3000, height: 500 })).toBe(false);
  });

  it('SVG は、大きくてもそのまま使うこと', () => {
    expect(shouldKeepOriginal({ type: 'image/svg+xml', size: 10_000_000 }, { width: 5000, height: 5000 })).toBe(true);
  });
});

describe('pickOutputType', () => {
  it('JPEG は JPEG のまま、それ以外は WebP にすること', () => {
    expect(pickOutputType('image/jpeg')).toBe('image/jpeg');
    expect(pickOutputType('image/png')).toBe('image/webp');
    expect(pickOutputType('image/gif')).toBe('image/webp');
  });
});
