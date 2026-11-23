import { describe, it, expect } from 'vitest';
import {
  getChildAddSides,
  getEditingWidth,
  getFoldCountWidth,
  getFoldMarker,
  getFoldSide,
  getNodeBorderStyle,
  getNodeColors,
  getProgressBadgeSpec,
  getNodeFontSizeClass,
  getNodeFontSpec,
  getNodeHeightStyle,
  getNodeShapeClass,
  getNodeShapeSpec,
  getNodeTextDecorationClass,
  getNodeTranslateX,
} from './nodeStyle';
import { THEMES } from './themes';
import { mixHex } from './colorMix';

describe('getNodeShapeClass', () => {
  it('ルートは形状によらず同じクラスになること', () => {
    expect(getNodeShapeClass(undefined, true)).toBe('rounded-xl border px-3 py-2.5');
    expect(getNodeShapeClass('underline', true)).toBe('rounded-xl border px-3 py-2.5');
  });

  it('形状ごとに、枠と余白のクラスを返すこと（枠は、角丸・ピルが四辺、下線のみが下辺、枠なしはなし）', () => {
    expect(getNodeShapeClass(undefined, false)).toBe('rounded-lg border px-2.5 py-2');
    expect(getNodeShapeClass('rounded', false)).toBe('rounded-lg border px-2.5 py-2');
    expect(getNodeShapeClass('pill', false)).toBe('rounded-full border px-3 py-2');
    expect(getNodeShapeClass('underline', false)).toBe(
      'rounded-none border-b-2 bg-transparent pl-1.5 pr-1 py-1.5'
    );
    expect(getNodeShapeClass('borderless', false)).toBe(
      'rounded-md border-0 bg-transparent pl-2 pr-2.5 py-1.5'
    );
  });
});

describe('getNodeFontSizeClass', () => {
  it('通常のノードのフォントサイズのクラスを返すこと', () => {
    expect(['sm', 'base', 'lg', 'xl'].map((s) => getNodeFontSizeClass(s as 'sm', false))).toEqual([
      'text-xs',
      'text-sm',
      'text-base',
      'text-lg',
    ]);
  });

  it('ルートは通常のノードより 1 段大きいクラスになること', () => {
    expect(['sm', 'base', 'lg', 'xl'].map((s) => getNodeFontSizeClass(s as 'sm', true))).toEqual([
      'text-sm',
      'text-base',
      'text-lg',
      'text-xl',
    ]);
  });

  it('未設定なら base として扱うこと', () => {
    expect(getNodeFontSizeClass(undefined, false)).toBe('text-sm');
    expect(getNodeFontSizeClass(undefined, true)).toBe('text-base');
  });
});

describe('getNodeTextDecorationClass', () => {
  it('太字でなければ font-medium になること', () => {
    expect(getNodeTextDecorationClass({ isBold: false, isItalic: false, isUnderline: false }).trim()).toBe(
      'font-medium'
    );
  });

  it('太字・斜体・下線のクラスをすべて含むこと', () => {
    const cls = getNodeTextDecorationClass({ isBold: true, isItalic: true, isUnderline: true }).split(/\s+/);
    expect(cls).toEqual(['font-bold', 'italic', 'underline', 'underline-offset-2']);
  });
});

describe('編集中の大きさと位置', () => {
  const node = { x: 100, width: 120, effectiveSide: 'right' as const };

  it('推定幅がノードの幅より小さければ、幅を変えないこと', () => {
    expect(getEditingWidth(120, 80, 0)).toBe(120);
  });

  it('推定幅が大きければ広げ、はみ出した分も足すこと', () => {
    expect(getEditingWidth(120, 200, 15)).toBe(215);
  });

  it('右側のノードは左端を固定すること', () => {
    expect(getNodeTranslateX(node, false, true, 200)).toBe(100);
  });

  it('左側のノードは右端を固定すること', () => {
    expect(getNodeTranslateX({ ...node, effectiveSide: 'left' }, false, true, 200)).toBe(20);
  });

  it('ルートは中央を固定すること', () => {
    expect(getNodeTranslateX(node, true, true, 200)).toBe(60);
  });

  it('編集中でなければ位置を変えないこと', () => {
    expect(getNodeTranslateX({ ...node, effectiveSide: 'left' }, true, false, 200)).toBe(100);
  });

  it('編集中でも、行が増えるまでは高さを固定すること', () => {
    expect(getNodeHeightStyle(40, false, 'a\nb\nc', 'a')).toBe('40px');
    expect(getNodeHeightStyle(40, true, 'abc', 'a')).toBe('40px');
    expect(getNodeHeightStyle(40, true, 'a\nb', 'a\nb')).toBe('40px');
  });

  it('編集中に行が増えたら、高さを中身に合わせること', () => {
    expect(getNodeHeightStyle(40, true, 'a\nb', 'a')).toBeUndefined();
    expect(getNodeHeightStyle(40, true, 'a\nb', '')).toBeUndefined();
  });
});

describe('getChildAddSides', () => {
  it('マインドマップ型のルートは、右・左の順に 2 つ出すこと', () => {
    expect(getChildAddSides(true, 'mindmap', 'right')).toEqual([
      { side: 'right', idPrefix: 'btn-add-child-right-', title: '右側に子ノードを追加 (Tab)' },
      { side: 'left', idPrefix: 'btn-add-child-left-', title: '左側に子ノードを追加 (Tab)' },
    ]);
  });

  it('ツリー型のルートは、レイアウトの向きに 1 つ出すこと', () => {
    expect(getChildAddSides(true, 'tree-left', 'right')).toEqual([
      { side: 'left', idPrefix: 'btn-add-child-', title: '子ノードを追加 (Tab)' },
    ]);
    expect(getChildAddSides(true, 'tree-right', 'left')[0].side).toBe('right');
  });

  it('通常のノードは、自分の側に 1 つ出すこと', () => {
    expect(getChildAddSides(false, 'mindmap', 'left')).toEqual([
      { side: 'left', idPrefix: 'btn-add-child-', title: '子ノードを追加 (Tab)' },
    ]);
  });
});

describe('getNodeShapeSpec', () => {
  it('ルートは高さや形によらず、角丸 12 の塗りになる', () => {
    expect(getNodeShapeSpec('pill', true, 80)).toEqual({ radius: 12, filled: true, bottomLine: false });
  });

  it('形ごとに、角丸・塗り・下辺の線を返す', () => {
    expect(getNodeShapeSpec(undefined, false, 40)).toEqual({ radius: 8, filled: true, bottomLine: false });
    expect(getNodeShapeSpec('pill', false, 40)).toEqual({ radius: 20, filled: true, bottomLine: false });
    expect(getNodeShapeSpec('underline', false, 40)).toEqual({ radius: 0, filled: false, bottomLine: true });
    expect(getNodeShapeSpec('borderless', false, 40)).toEqual({ radius: 6, filled: false, bottomLine: false });
  });
});

describe('getNodeFontSpec', () => {
  it('ルートは通常のノードより 1 段大きく、既定で太字になる', () => {
    expect(getNodeFontSpec({}, true)).toMatchObject({ px: 16, lineHeight: 24, bold: true });
    expect(getNodeFontSpec({}, false)).toMatchObject({ px: 14, lineHeight: 20, bold: false });
  });

  it('クラスの段階と px の段階が対応する', () => {
    expect(getNodeFontSpec({ fontSize: 'sm' }, false).px).toBe(12);
    expect(getNodeFontSpec({ fontSize: 'xl' }, false).px).toBe(18);
    expect(getNodeFontSizeClass('xl', false)).toBe('text-lg');
    expect(getNodeFontSpec({ fontSize: 'xl' }, true).px).toBe(20);
    expect(getNodeFontSizeClass('xl', true)).toBe('text-xl');
  });

  it('太字の指定が既定より優先される', () => {
    expect(getNodeFontSpec({ bold: false }, true).bold).toBe(false);
    expect(getNodeFontSpec({ bold: true }, false).bold).toBe(true);
  });
});

describe('getNodeColors', () => {
  const theme = THEMES.natural;

  it('ルートは、テーマのルートの色か node.color になる', () => {
    expect(getNodeColors({ depth: 0 }, true, theme)).toEqual({
      fill: theme.root.bg,
      fillOpacity: 1,
      text: theme.root.text,
      line: theme.root.border,
      icon: theme.root.text,
      border: theme.root.border,
      borderOpacity: 1,
    });
    expect(getNodeColors({ depth: 0, color: '#ff0000' }, true, theme).fill).toBe('#ff0000');
    expect(getNodeColors({ depth: 0, color: '#ff0000' }, true, theme).border).toBe('#ff0000');
  });

  it('通常のノードは、テーマの色になる', () => {
    expect(getNodeColors({ depth: 2, branchColor: '#111111' }, false, theme)).toEqual({
      fill: theme.node.bg,
      fillOpacity: 1,
      text: theme.node.text,
      line: '#111111',
      icon: '#111111',
      border: '#111111',
      borderOpacity: 0x99 / 255,
    });
  });

  it('node.color は塗りを薄くし、textColor は文字を替える', () => {
    const c = getNodeColors({ depth: 2, color: '#ff0000', textColor: '#00ff00' }, false, theme);
    expect(c.fill).toBe('#ff0000');
    expect(c.fillOpacity).toBeCloseTo(0x15 / 255, 5);
    expect(c.text).toBe('#00ff00');
  });

  it('下線の色は、node.color、なければブランチの色、それもなければテーマの枠の色になる（深さによらない）', () => {
    expect(getNodeColors({ depth: 1, branchColor: '#111111' }, false, theme).line).toBe('#111111');
    expect(getNodeColors({ depth: 3, branchColor: '#111111' }, false, theme).line).toBe('#111111');
    expect(getNodeColors({ depth: 1, color: '#222222', branchColor: '#111111' }, false, theme).line).toBe('#222222');
    expect(getNodeColors({ depth: 2 }, false, theme).line).toBe(theme.node.border);
  });

  it('枠は、枝の色の薄め（60%）。色を指定したノードは指定色（枝の色もそれになる）。枝の色がなければテーマの枠', () => {
    const c1 = getNodeColors({ depth: 1, branchColor: '#111111' }, false, theme);
    expect(c1.border).toBe('#111111');
    expect(c1.borderOpacity).toBeCloseTo(0x99 / 255, 5);
    const c2 = getNodeColors({ depth: 2, color: '#ff0000', branchColor: '#ff0000' }, false, theme);
    expect(c2.border).toBe('#ff0000');
    expect(c2.borderOpacity).toBeCloseTo(0x99 / 255, 5);
    expect(getNodeColors({ depth: 2 }, false, theme)).toMatchObject({ border: theme.node.border, borderOpacity: 1 });
  });
});

describe('getProgressBadgeSpec', () => {
  const theme = THEMES.natural;

  it('100% だけテーマの完了色になり、それ以外は文字色の薄い面になること', () => {
    const done = getProgressBadgeSpec(100, false, theme);
    expect(done).toMatchObject({ className: 'bg-done/15 text-done', text: theme.done, check: theme.done });
    for (const progress of [0, 25, 50, 75, 99]) {
      const spec = getProgressBadgeSpec(progress, false, theme);
      expect(spec.className, String(progress)).toBe('bg-on-node/10 text-on-node');
      expect(spec.text).toBe(theme.node.text);
    }
  });

  it('背景が、面に色を混ぜた色（画面の bg-done/15 と同じ割合）になること', () => {
    expect(getProgressBadgeSpec(100, false, theme).bg).toBe(mixHex(theme.done, theme.node.bg, 0.15));
    expect(getProgressBadgeSpec(50, false, theme).bg).toBe(mixHex(theme.node.text, theme.node.bg, 0.1));
  });

  it('ルートは、ルートの文字色で作る（面が濃くても読める）こと', () => {
    const spec = getProgressBadgeSpec(100, true, theme);
    expect(spec.className).toBe('bg-on-root/15 text-on-root');
    expect(spec.text).toBe(theme.root.text);
    expect(spec.bg).toBe(mixHex(theme.root.text, theme.root.bg, 0.15));
  });

  it('ダークでも、完了色はそのテーマの色になること', () => {
    expect(getProgressBadgeSpec(100, false, THEMES.darkAurora).text).toBe(THEMES.darkAurora.done);
  });
});

describe('getNodeBorderStyle', () => {
  it('ルートは、ふだんはテーマの枠、ホバーで文字色寄りの枠になる。色を指定したら、ふだんはその色', () => {
    expect(getNodeBorderStyle({}, true, false)).toEqual({ className: 'border-root-line', style: {} });
    expect(getNodeBorderStyle({}, true, true)).toEqual({ className: 'border-on-root/60', style: {} });
    expect(getNodeBorderStyle({ color: '#ff0000' }, true, false)).toEqual({
      className: '',
      style: { borderColor: '#ff0000' },
    });
  });

  it('角丸・ピルは、ふだんは枝の色の 60%、ホバーで枝の色そのままの枠になる。階層によらない', () => {
    for (const shape of [undefined, 'rounded', 'pill'] as const) {
      expect(getNodeBorderStyle({ shape, branchColor: '#111111' }, false, false).style).toEqual({ borderColor: '#11111199' });
      expect(getNodeBorderStyle({ shape, branchColor: '#111111' }, false, true).style).toEqual({ borderColor: '#111111' });
    }
  });

  it('枝の色がないときだけ、テーマの枠（ホバーで文字色寄り）になる', () => {
    expect(getNodeBorderStyle({}, false, false)).toEqual({ className: 'border-node-line', style: {} });
    expect(getNodeBorderStyle({}, false, true)).toEqual({ className: 'border-on-node/45', style: {} });
  });

  it('色を指定したノードは、ふだんは指定色の 60%、ホバーで指定色そのままの枠になる', () => {
    expect(getNodeBorderStyle({ color: '#ff0000' }, false, false).style).toEqual({ borderColor: '#ff000099' });
    expect(getNodeBorderStyle({ color: '#ff0000' }, false, true).style).toEqual({ borderColor: '#ff0000' });
  });

  it('下線のみは、下線を指定色か枝色にし、ホバーで薄い塗りが出る', () => {
    expect(getNodeBorderStyle({ shape: 'underline', branchColor: '#111111' }, false, false).style).toEqual({
      borderColor: '#111111',
      backgroundColor: undefined,
    });
    expect(
      getNodeBorderStyle({ shape: 'underline', color: '#222222', branchColor: '#111111' }, false, false).style.borderColor
    ).toBe('#222222');
    expect(getNodeBorderStyle({ shape: 'underline', branchColor: '#111111' }, false, true).style.backgroundColor).toContain(
      'color-mix'
    );
    expect(getNodeBorderStyle({ shape: 'underline' }, false, false).className).toBe('border-node-line');
  });

  it('枠なしは、ふだんは何も付けず、ホバーで薄い塗りが出る', () => {
    expect(getNodeBorderStyle({ shape: 'borderless' }, false, false)).toEqual({
      className: '',
      style: { backgroundColor: undefined },
    });
    expect(getNodeBorderStyle({ shape: 'borderless' }, false, true).style.backgroundColor).toContain('color-mix');
  });
});

describe('getFoldMarker', () => {
  const folded = { hasChildren: true, isFolded: true, childrenCount: 12 };
  const open = { hasChildren: true, isFolded: false, childrenCount: 3 };
  const idle = { isEditing: false, isHovered: false, isSelected: false };

  it('閉じているノードは、いつも数の印を出す', () => {
    expect(getFoldMarker(folded, idle)).toEqual({ kind: 'count', count: 12 });
    expect(getFoldMarker(folded, { ...idle, isHovered: true })).toEqual({ kind: 'count', count: 12 });
  });

  it('開いているノードは、ふだんは出さず、ホバーか選択のときだけ「折りたためる」印を出す', () => {
    expect(getFoldMarker(open, idle)).toBeNull();
    expect(getFoldMarker(open, { ...idle, isHovered: true })).toEqual({ kind: 'collapse' });
    expect(getFoldMarker(open, { ...idle, isSelected: true })).toEqual({ kind: 'collapse' });
  });

  it('子がないノードと、編集中のノードには出さない', () => {
    expect(getFoldMarker({ hasChildren: false, childrenCount: 0 }, { ...idle, isHovered: true })).toBeNull();
    expect(getFoldMarker(folded, { ...idle, isEditing: true })).toBeNull();
    expect(getFoldMarker(open, { isEditing: true, isHovered: true, isSelected: true })).toBeNull();
  });
});

describe('getFoldCountWidth', () => {
  it('1 桁は丸（16px）で、桁が増えると横に伸びる', () => {
    expect(getFoldCountWidth(2)).toBe(16);
    expect(getFoldCountWidth(12)).toBe(22);
    expect(getFoldCountWidth(123)).toBe(29);
  });
});

describe('getFoldSide', () => {
  it('ルート以外は子が伸びる側、ルートのマインドマップ型は右、ツリー型は子が伸びる側', () => {
    expect(getFoldSide(false, 'mindmap', 'left')).toBe('left');
    expect(getFoldSide(true, 'mindmap', 'right')).toBe('right');
    expect(getFoldSide(true, 'tree-right', 'right')).toBe('right');
    expect(getFoldSide(true, 'tree-left', 'right')).toBe('left');
  });
});
