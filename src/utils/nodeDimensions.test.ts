import { describe, it, expect } from 'vitest';
import {
  calculateTextVisualWidth,
  estimateNodeDimensions,
  getImageRect,
  getNodeLineHeight,
  getTextAreaSpan,
  getShapeHorizontalPadding,
  getShapePadding,
  resolveIsBold,
} from './nodeDimensions';
import metrics from './fontMetrics.generated.json';
import type { MindNode } from '../types';

const makeNode = (overrides: Partial<MindNode> = {}): MindNode =>
  ({
    id: 'n1',
    text: '',
    parentId: 'root',
    order: 0,
    ...overrides,
  }) as MindNode;

describe('node padding estimation', () => {
  it('実際の Tailwind パディングに合わせた水平パディングを返すこと', () => {
    expect(getShapeHorizontalPadding(undefined, true)).toBe(26); // px-3 + 左右ボーダー 2px
    expect(getShapeHorizontalPadding('underline', false)).toBe(10);
    // 左右のボーダー 2px 分を含む（角丸・ピル）
    expect(getShapeHorizontalPadding('rounded', false)).toBe(22);
    expect(getShapeHorizontalPadding('pill', false)).toBe(26);
    expect(getShapeHorizontalPadding('borderless', false)).toBe(18);
  });

  it('形ごとの左右の余白が、Tailwind のクラス（pl / pr）と同じ値になること', () => {
    expect(getShapePadding(undefined, true)).toEqual({ left: 12, right: 12 });
    expect(getShapePadding(undefined, false)).toEqual({ left: 10, right: 10 });
    expect(getShapePadding('pill', false)).toEqual({ left: 12, right: 12 });
    expect(getShapePadding('underline', false)).toEqual({ left: 6, right: 4 });
    expect(getShapePadding('borderless', false)).toEqual({ left: 8, right: 10 });
  });

  it.each(['あい', 'abc'])('短いテキスト "%s" でも幅がテキスト幅 + 実パディング以上になること', (text) => {
    const node = makeNode({ text });
    const { width } = estimateNodeDimensions(node, false);
    const textWidth = calculateTextVisualWidth(text, false);
    expect(width).toBeGreaterThanOrEqual(textWidth + 16);
  });

  it('アイコン・進捗・メモ・リンクを付けると幅が増えること', () => {
    const base = estimateNodeDimensions(makeNode({ text: 'テスト' }), false).width;
    const withIcon = estimateNodeDimensions(makeNode({ text: 'テスト', icon: 'star' }), false).width;
    const withAll = estimateNodeDimensions(
      makeNode({ text: 'テスト', icon: 'star', progress: 50, note: 'n', link: 'https://example.com' }),
      false
    ).width;
    expect(withIcon).toBeGreaterThan(base);
    expect(withAll).toBeGreaterThan(withIcon);
  });

  it('ルートの bold 判定は明示設定を優先し、未設定ならルートのみ太字になること', () => {
    expect(resolveIsBold(makeNode(), true)).toBe(true);
    expect(resolveIsBold(makeNode({ bold: false }), true)).toBe(false);
    expect(resolveIsBold(makeNode(), false)).toBe(false);
    expect(resolveIsBold(makeNode({ bold: true }), false)).toBe(true);
  });
});

describe('calculateTextVisualWidth', () => {
  it('日本語および英数字の視覚的文字幅が正しく計算されること', () => {
    const asciiWidth = calculateTextVisualWidth('abcde', false);
    const cjkWidth = calculateTextVisualWidth('あいうえお', false);

    // 全角日本語は半角英字の約2倍の幅になること
    expect(cjkWidth).toBeGreaterThan(asciiWidth * 1.5);
    expect(asciiWidth).toBeGreaterThan(0);
  });

  it('大文字英字 (SMXMECTL等) の視覚的文字幅が小文字よりも広く計算されること', () => {
    expect(calculateTextVisualWidth('SMXMECTL', false)).toBeGreaterThan(calculateTextVisualWidth('smxmectl', false) * 1.1);
  });

  it.each(['→→→→→', '①②③④⑤', '★★★★★', '─────', '■□●○▶', '……※'])(
    '全角で描画される記号 "%s" を全角の幅で見積もること',
    (text) => {
      // 14px のフォントで 1 文字 14px。半角（9.2px）として数えると枠からはみ出す
      expect(calculateTextVisualWidth(text, false)).toBeGreaterThanOrEqual([...text].length * 14);
    }
  );

  it.each(['✅✅✅', '⭐⭐⭐', '✨✨✨', '😀😀😀', '❤️❤️❤️'])('絵文字 "%s" を実際の幅以上に見積もること', (text) => {
    // 14px のフォントで絵文字 1 つは約 19.2px
    expect(calculateTextVisualWidth(text, false)).toBeGreaterThanOrEqual(3 * 19.2);
  });

  it('サロゲートペア・異体字セレクタ・ゼロ幅接合子を二重に数えないこと', () => {
    const one = calculateTextVisualWidth('😀', false);
    expect(calculateTextVisualWidth('❤️', false)).toBe(one); // U+2764 + U+FE0F
    expect(calculateTextVisualWidth('😀‍', false)).toBe(one);
    expect(calculateTextVisualWidth('😀😀', false)).toBe(one * 2);
  });

  it('絵文字の幅もフォントサイズとルートかどうかで変わること', () => {
    const base = calculateTextVisualWidth('✅', false);
    expect(calculateTextVisualWidth('✅', false, 'xl')).toBeGreaterThan(base);
    expect(calculateTextVisualWidth('✅', false, 'sm')).toBeLessThan(base);
    expect(calculateTextVisualWidth('✅', true)).toBeGreaterThan(base);
  });
});

describe('getNodeLineHeight', () => {
  it('フォントサイズごとに、描画と同じ行の高さを返すこと', () => {
    expect([getNodeLineHeight('sm', false), getNodeLineHeight('base', false), getNodeLineHeight('lg', false), getNodeLineHeight('xl', false)]).toEqual([18, 20, 24, 28]);
    expect([getNodeLineHeight('sm', true), getNodeLineHeight('base', true), getNodeLineHeight('lg', true), getNodeLineHeight('xl', true)]).toEqual([20, 24, 28, 34]);
  });

  it('フォントサイズが未設定なら base として扱うこと', () => {
    expect(getNodeLineHeight(undefined, false)).toBe(20);
    expect(getNodeLineHeight(undefined, true)).toBe(24);
  });

  it('大きいフォントの 1 行のノードの高さが、行の高さを含むこと', () => {
    const { height } = estimateNodeDimensions(makeNode({ text: 'abc', fontSize: 'xl' }), false);
    expect(height).toBeGreaterThanOrEqual(getNodeLineHeight('xl', false));
  });
});

describe('node height estimation', () => {
  it('高さが、行の高さ + 上下の余白と枠線（通常 18px、ルート 22px）になること', () => {
    expect(estimateNodeDimensions(makeNode({ text: 'abc' }), false).height).toBe(18 + getNodeLineHeight('base', false));
    expect(estimateNodeDimensions(makeNode({ text: 'abc' }), true).height).toBe(22 + getNodeLineHeight('base', true));
  });

  it('行が増えると、行の高さの分だけ増えること', () => {
    const one = estimateNodeDimensions(makeNode({ text: 'a' }), false).height;
    const three = estimateNodeDimensions(makeNode({ text: 'a\nb\nc' }), false).height;
    expect(three - one).toBe(2 * getNodeLineHeight('base', false));
  });
});

describe('書体ごとの文字の幅の見積もり', () => {
  /** 字幅の表から出した幅（px）。1 文字ごとに、丸めなしと整数に丸めた幅の大きいほう（ヒンティングが効く環境の分） */
  const fromTable = (text: string, table: Record<string, number>, px: number) =>
    [...text].reduce((sum, ch) => {
      const w = table[String(ch.codePointAt(0))] * px;
      return sum + Math.max(w, Math.round(w));
    }, 0);

  it('欧文は、同梱フォントの字幅の表 × 文字の大きさで見積もること', () => {
    expect(calculateTextVisualWidth('Hello 123', false)).toBeCloseTo(fromTable('Hello 123', metrics.sans['500-normal'], 14));
    expect(calculateTextVisualWidth('Hello', true, 'base', true)).toBeCloseTo(fromTable('Hello', metrics.sans['700-normal'], 16));
    expect(calculateTextVisualWidth('Hello', false, 'xl', false, 'serif')).toBeCloseTo(
      fromTable('Hello', metrics.serif['500-normal'], 18)
    );
  });

  it('字送りが整数 px に丸められる環境（ヒンティング）の幅以上になること', () => {
    // CI の Chromium で実測した値（--font-render-hinting=full）。丸めなしの幅は 242.1px・124.8px で、それより実際が広かった
    const hinted = (text: string, table: Record<string, number>, px: number) =>
      [...text].reduce((sum, ch) => sum + Math.round(table[String(ch.codePointAt(0))] * px), 0);
    const sentence = 'The quick brown fox jumps over 123';
    expect(hinted(sentence, metrics.sans['500-normal'], 14)).toBe(248);
    expect(calculateTextVisualWidth(sentence, false)).toBeGreaterThanOrEqual(248);
    expect(hinted('Mindflow Root', metrics.mono['700-normal'], 16)).toBe(130);
    expect(calculateTextVisualWidth('Mindflow Root', true, 'base', true, 'mono')).toBeGreaterThanOrEqual(130);
    expect(calculateTextVisualWidth(sentence, false, 'base', false, 'serif')).toBeGreaterThanOrEqual(250);
  });

  it('太字・斜体は、その字幅の表を使うこと', () => {
    expect(calculateTextVisualWidth('Wave', false, 'base', true, 'sans')).toBeCloseTo(
      fromTable('Wave', metrics.sans['700-normal'], 14)
    );
    expect(calculateTextVisualWidth('Wave', false, 'base', false, 'serif', true)).toBeCloseTo(
      fromTable('Wave', metrics.serif['500-italic'], 14)
    );
  });

  it('等幅では、細い文字も広い文字も同じ幅になること（斜体も同じ）', () => {
    const narrow = calculateTextVisualWidth('iiii', false, 'base', false, 'mono');
    expect(narrow).toBeCloseTo(4 * 0.6 * 14);
    expect(calculateTextVisualWidth('MMMM', false, 'base', false, 'mono')).toBeCloseTo(narrow);
    expect(calculateTextVisualWidth('iiii', false, 'base', false, 'mono', true)).toBeCloseTo(narrow);
  });

  it('欧文の幅は書体によって変わること', () => {
    expect(calculateTextVisualWidth('Hello', false, 'base', false, 'serif')).not.toBeCloseTo(
      calculateTextVisualWidth('Hello', false, 'base', false, 'sans')
    );
  });

  it.each(['αβγδε', 'АБВГД'])('同梱フォントにない "%s" は、どの書体でも全角として見積もること', (text) => {
    for (const font of ['sans', 'serif', 'mono']) {
      expect(calculateTextVisualWidth(text, false, 'base', false, font)).toBeGreaterThanOrEqual(text.length * 14);
    }
  });

  it.each(['Łódź', 'Đà Nẵng', 'ğüşıİ', 'ｱｲｳｴｵ', 'สวัสดี', 'مرحبا'])(
    '同梱フォントにも和文にも当たらない "%s" は、全角ではなく 0.65em で見積もること',
    (text) => {
      // ラテン拡張・半角カナ・タイ文字・アラビア文字は、字幅のそろわない字形で描かれる（実測 0.45〜0.6em）。
      // 全角（14px のとき 15.5px）で数えると、ノードが 2 倍近く広くなる
      const table: Record<string, number> = metrics.sans['500-normal'];
      const inTable = (ch: string) => table[String(ch.codePointAt(0))] !== undefined;
      const unlisted = [...text].filter((ch) => !inTable(ch)).length;
      const known = fromTable([...text].filter(inTable).join(''), table, 14);
      const width = calculateTextVisualWidth(text, false);
      expect(width).toBeCloseTo(known + unlisted * 0.65 * 14);
      expect(width).toBeLessThan([...text].length * 14);
    }
  );

  it('表にない文字の幅は、太字で少し広がり、文字の大きさに比例すること', () => {
    expect(calculateTextVisualWidth('ł', false, 'base', true)).toBeGreaterThan(calculateTextVisualWidth('ł', false));
    expect(calculateTextVisualWidth('ł', true, 'xl')).toBeCloseTo(0.65 * 20);
  });

  it('× ÷ ± は同梱フォントで描くので、表の幅で見積もること', () => {
    expect(calculateTextVisualWidth('×÷±', false, 'base', false, 'serif')).toBeCloseTo(
      fromTable('×÷±', metrics.serif['500-normal'], 14)
    );
  });

  it.each(['rounded', 'handwriting', 'unknown', undefined])('書体 %s は、ゴシックとして見積もること', (font) => {
    expect(calculateTextVisualWidth('Hello あ', false, 'base', false, font)).toBe(
      calculateTextVisualWidth('Hello あ', false, 'base', false, 'sans')
    );
  });

  it('ノードの幅にも反映されること', () => {
    const node = makeNode({ text: 'iiiiiiiiii' });
    expect(estimateNodeDimensions(node, false, 'mono').width).toBeGreaterThan(estimateNodeDimensions(node, false, 'sans').width);
    expect(estimateNodeDimensions(makeNode({ text: 'iiiiiiiiii', italic: true }), false, 'serif').width).not.toBe(
      estimateNodeDimensions(node, false, 'serif').width
    );
  });
});

describe('画像付きノードの大きさ', () => {
  const IMG = 'data:image/png;base64,AAAA';

  it('縦横比が分からない画像は、従来どおり高さ +115、最小の幅 190（ルートは 200）になること', () => {
    const plain = estimateNodeDimensions(makeNode({ text: 'a' }), false);
    const withImage = estimateNodeDimensions(makeNode({ text: 'a', image: IMG }), false);
    expect(withImage.height - plain.height).toBe(115);
    expect(withImage.width).toBe(190);
    expect(estimateNodeDimensions(makeNode({ text: 'a', image: IMG }), true).width).toBe(200);
  });

  it('縦横比が分かる画像は、画像の高さ + 間隔 6 だけ高くなり、幅は画像 + 余白になること', () => {
    const plain = estimateNodeDimensions(makeNode({ text: 'a' }), false);
    const node = makeNode({ text: 'a', image: IMG, imageAspect: 2, imageWidth: 300 });
    const size = estimateNodeDimensions(node, false);
    expect(size.height - plain.height).toBe(150 + 6);
    expect(size.width).toBe(300 + getShapeHorizontalPadding(undefined, false));
  });

  it('画像の幅を変えると、高さも縦横比に合わせて変わること', () => {
    const small = estimateNodeDimensions(makeNode({ image: IMG, imageAspect: 2, imageWidth: 100 }), false);
    const large = estimateNodeDimensions(makeNode({ image: IMG, imageAspect: 2, imageWidth: 400 }), false);
    expect(large.height - small.height).toBe(150);
  });

  it('文字の行が画像より広いときは、画像を中身の領域の中央に置くこと', () => {
    const node = makeNode({ text: 'a', image: IMG, imageAspect: 1, imageWidth: 60 });
    const rect = getImageRect(node, false, 200);
    expect(rect).toMatchObject({ width: 60, height: 60 });
    // 左の余白 10 + 枠 1、右の余白 10 + 枠 1 の内側（幅 178）の中央
    expect(rect!.x).toBe(11 + (178 - 60) / 2);
  });

  it('縦横比が分からない画像の枠は、中身の幅いっぱいになること', () => {
    const rect = getImageRect(makeNode({ image: IMG }), false, 190);
    expect(rect).toMatchObject({ x: 11, width: 168, height: 109 });
  });

  it('画像がなければ null、文字の領域はノード全体から上下の余白を引いたものになること', () => {
    expect(getImageRect(makeNode({ text: 'a' }), false, 100)).toBeNull();
    expect(getTextAreaSpan(makeNode({ text: 'a' }), false, 100, 38)).toEqual({ top: 9, bottom: 29 });
  });

  it('画像付きの文字の領域は、画像と間隔の下から始まること', () => {
    const node = makeNode({ text: 'a', image: IMG, imageAspect: 1, imageWidth: 60 });
    const size = estimateNodeDimensions(node, false);
    const span = getTextAreaSpan(node, false, size.width, size.height);
    expect(span.top).toBe(9 + 60 + 6);
    expect(span.bottom).toBe(size.height - 9);
  });
});
