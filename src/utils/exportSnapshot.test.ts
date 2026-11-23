import { describe, it, expect } from 'vitest';
import { generateSvgMarkup } from './exportUtils';
import type { LayoutResult, MindMap, PositionedNode } from '../types';

// ノード 1 つの SVG（renderNodeSvg）の結果を、リファクタリングの前後で比べるためのテスト

const base = {
  parentId: 'root',
  x: 10,
  y: 20,
  width: 200,
  height: 44,
  depth: 1,
  effectiveSide: 'right',
  hasChildren: false,
  childrenCount: 0,
  branchColor: '#3b7a57',
};

const VARIANTS: Record<string, Record<string, unknown>> = {
  素のノード: { text: '子' },
  複数行: { text: '一行目\n二行目\n三行目', height: 80 },
  アイコンと進捗: { text: 'タスク', icon: 'Star', progress: 60 },
  完了: { text: '終わり', progress: 100 },
  メモとリンク: { text: 'メモ', note: 'n', link: 'https://example.com', width: 220 },
  メモだけ: { text: 'メモ', note: 'n' },
  リンクだけ: { text: 'リンク', link: 'https://example.com' },
  下線の形: { text: '下線', shape: 'underline' },
  枠なしの形: { text: '枠なし', shape: 'borderless' },
  色指定: { text: '色', color: '#ff0000', textColor: '#00ff00' },
  太字斜体下線: { text: '装飾', bold: true, italic: true, underline: true, fontSize: 'lg' },
  画像つき: { text: '画像', image: 'data:image/png;base64,AAAA', imageWidth: 120, imageAspect: 0.5, height: 120 },
  閉じた枝の数: { text: '閉', isFolded: true, hasChildren: true, childrenCount: 7 },
  左側で閉じた枝: { text: '左', isFolded: true, hasChildren: true, childrenCount: 12, effectiveSide: 'left' },
  エスケープ: { text: `<&'">` },
};

function render(
  patch: Record<string, unknown>,
  themeId: string,
  layoutType: string,
  asRoot: boolean,
  fontFamily?: string
): string {
  const root = { ...base, id: 'root', parentId: null, depth: 0, text: 'ルート', x: 0, y: 0 } as unknown as PositionedNode;
  const child = { ...base, id: 'c1', ...patch } as unknown as PositionedNode;
  const nodes = asRoot ? [{ ...root, ...patch, id: 'root', parentId: null, depth: 0 } as PositionedNode] : [root, child];
  const map = {
    id: 'm',
    title: 't',
    rootId: 'root',
    nodes: Object.fromEntries(nodes.map((n) => [n.id, n])),
    themeId,
    layoutType,
    connectorStyle: 'arc',
    fontFamily,
    createdAt: 0,
    updatedAt: 0,
  } as unknown as MindMap;
  const layout: LayoutResult = {
    nodes,
    connections: [],
    bounds: { minX: 0, minY: 0, maxX: 300, maxY: 200, width: 300, height: 200 },
    nodeMap: new Map(nodes.map((n) => [n.id, n])),
  };
  // 埋め込んだフォント（数十 KB の base64）は、どの太さ・斜体が入ったかだけを残す
  return generateSvgMarkup(map, layout).replace(/url\(data:font\/woff2;base64,[^)]+\)/g, 'url(<woff2>)');
}

describe('ノードの SVG（結果を固定する）', () => {
  for (const [name, patch] of Object.entries(VARIANTS)) {
    it(`${name}（ナチュラル・子ノード）`, () => {
      expect(render(patch, 'natural', 'tree-right', false)).toMatchSnapshot();
    });
  }

  for (const [name, patch] of Object.entries({ 素: {}, アイコンと進捗: { icon: 'Star', progress: 40 }, 色指定: { color: '#123456' }, 閉じた枝: { isFolded: true, hasChildren: true, childrenCount: 3 }, 複数行: { text: 'a\nb', height: 70 } })) {
    it(`ルート：${name}（ダーク・マインドマップ型）`, () => {
      expect(render(patch, 'darkAurora', 'mindmap', true)).toMatchSnapshot();
    });
  }

  it('テーマが変わると、色が変わること', () => {
    const a = render({ text: 'x', progress: 100 }, 'natural', 'tree-right', false);
    const b = render({ text: 'x', progress: 100 }, 'oceanic', 'tree-right', false);
    expect(a).not.toBe(b);
  });
});

describe('書き出しに埋め込むフォント', () => {
  /** 埋め込まれた @font-face（書体名・太さ・字形） */
  const faces = (svg: string) =>
    [...svg.matchAll(/font-family: '([^']+)'; src: url\([^)]+\) format\('woff2'\); font-weight: (\d+); font-style: (\w+)/g)].map(
      (m) => `${m[1]} ${m[2]} ${m[3]}`
    );

  it('使っている太さ・字形だけを埋め込むこと', () => {
    // 太字でないルートだけ → 500 の通常だけ
    expect(faces(render({ bold: false }, 'natural', 'tree-right', true))).toEqual(['Mindflow Sans 500 normal']);
    // 斜体のルート（太字は既定のまま）→ 700 の斜体だけ
    expect(faces(render({ italic: true }, 'natural', 'tree-right', true))).toEqual(['Mindflow Sans 700 italic']);
    // 進捗バッジは太字
    expect(faces(render({ bold: false, progress: 40 }, 'natural', 'tree-right', true))).toEqual([
      'Mindflow Sans 500 normal',
      'Mindflow Sans 700 normal',
    ]);
  });

  it('書体に合わせたフォントを埋め込み、なくした書体はゴシックになること', () => {
    expect(faces(render({ bold: false }, 'natural', 'tree-right', true, 'serif'))).toEqual(['Mindflow Serif 500 normal']);
    expect(faces(render({ bold: false }, 'natural', 'tree-right', true, 'handwriting'))).toEqual(['Mindflow Sans 500 normal']);
  });

  it('斜体のない等幅は、斜体を埋め込まないこと（ブラウザが傾けて代用する）', () => {
    expect(faces(render({ bold: false, italic: true }, 'natural', 'tree-right', true, 'mono'))).toEqual([]);
    expect(render({ bold: false, italic: true }, 'natural', 'tree-right', true, 'mono')).not.toContain('<defs>');
  });

  it('埋め込むフォントは woff2 の data URI であること', () => {
    const map = render({ bold: false }, 'natural', 'tree-right', true);
    expect(map).toContain('url(<woff2>)');
  });
});
