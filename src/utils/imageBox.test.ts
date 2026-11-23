import { describe, expect, it } from 'vitest';
import {
  FALLBACK_IMAGE_HEIGHT,
  MAX_IMAGE_EDGE_IN_NODE,
  MIN_IMAGE_WIDTH,
  imageProps,
  resizeImageWidth,
  resolveImageBox,
} from './imageBox';

const IMG = 'data:image/png;base64,AAAA';

describe('resolveImageBox', () => {
  it('画像がないときは null', () => {
    expect(resolveImageBox({})).toBeNull();
    expect(resolveImageBox({ imageWidth: 100, imageAspect: 2 })).toBeNull();
  });

  it('縦横比が分からない画像は、幅いっぱい・決まった高さの枠にする', () => {
    expect(resolveImageBox({ image: IMG })).toEqual({ width: null, height: FALLBACK_IMAGE_HEIGHT });
  });

  it('手で書き換えた不正な縦横比は、ないものとして扱うこと', () => {
    for (const imageAspect of [0, -1, NaN, Infinity, '2' as unknown as number]) {
      expect(resolveImageBox({ image: IMG, imageAspect })).toEqual({ width: null, height: FALLBACK_IMAGE_HEIGHT });
    }
  });

  it('縦横比だけ分かるときは、240 × 180 に収まる最大の大きさにすること', () => {
    expect(resolveImageBox({ image: IMG, imageAspect: 2 })).toEqual({ width: 240, height: 120 }); // 横長：幅で決まる
    expect(resolveImageBox({ image: IMG, imageAspect: 0.5 })).toEqual({ width: 90, height: 180 }); // 縦長：高さで決まる
  });

  it('保存した幅があれば、それを使い、高さは縦横比から決めること', () => {
    expect(resolveImageBox({ image: IMG, imageAspect: 2, imageWidth: 400 })).toEqual({ width: 400, height: 200 });
  });

  it('幅は下限と上限の内側に収めること', () => {
    expect(resolveImageBox({ image: IMG, imageAspect: 1, imageWidth: 10 })?.width).toBe(MIN_IMAGE_WIDTH);
    // 横長：幅が上限を超えない
    expect(resolveImageBox({ image: IMG, imageAspect: 4, imageWidth: 5000 })).toEqual({
      width: MAX_IMAGE_EDGE_IN_NODE,
      height: 200,
    });
    // 縦長：高さが上限を超えない
    expect(resolveImageBox({ image: IMG, imageAspect: 0.25, imageWidth: 5000 })).toEqual({ width: 200, height: 800 });
  });

  it('極端に細長い画像でも、下限を優先すること', () => {
    const box = resolveImageBox({ image: IMG, imageAspect: 0.01, imageWidth: 100 });
    expect(box?.width).toBe(MIN_IMAGE_WIDTH);
  });
});

describe('resizeImageWidth', () => {
  it('ドラッグの量を拡大率で割って、幅に足すこと', () => {
    expect(resizeImageWidth(200, 100, 2, 1)).toBe(250);
    expect(resizeImageWidth(200, 100, 0.5, 1)).toBe(400);
  });

  it('向きが -1 のときは、左へ動かすと大きくなること', () => {
    expect(resizeImageWidth(200, -50, 1, 1, -1)).toBe(250);
  });

  it('下限と上限の内側に収め、拡大率が不正なときは 1 として扱うこと', () => {
    expect(resizeImageWidth(100, -500, 1, 1)).toBe(MIN_IMAGE_WIDTH);
    expect(resizeImageWidth(100, 5000, 1, 1)).toBe(MAX_IMAGE_EDGE_IN_NODE);
    expect(resizeImageWidth(100, 20, 0, 1)).toBe(120);
  });
});

describe('imageProps', () => {
  it('画像を付けるときは、幅を捨て、縦横比を小数 4 桁で入れること', () => {
    expect(imageProps(IMG, { width: 300, height: 200 })).toEqual({
      image: IMG,
      imageWidth: undefined,
      imageAspect: 1.5,
    });
    expect(imageProps(IMG, { width: 1, height: 3 }).imageAspect).toBe(0.3333);
  });

  it('大きさが分からない、または 0 のときは、縦横比を入れないこと', () => {
    expect(imageProps(IMG).imageAspect).toBeUndefined();
    expect(imageProps(IMG, { width: 0, height: 10 }).imageAspect).toBeUndefined();
  });

  it('画像を消すときは、3 つとも消すこと', () => {
    expect(imageProps(undefined, { width: 10, height: 10 })).toEqual({
      image: undefined,
      imageWidth: undefined,
      imageAspect: undefined,
    });
  });
});
