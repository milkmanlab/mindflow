import { describe, it, expect } from 'vitest';
import { generateSvgMarkup, getExportFileName, getExportSize } from './exportUtils';
import { THEMES } from './themes';
import { mixHex } from './colorMix';
import type { LayoutResult, MindMap, PositionedNode } from '../types';

const node = {
  id: 'root',
  parentId: null,
  text: `<b>&"'`,
  x: 0,
  y: 0,
  width: 100,
  height: 40,
  depth: 0,
  effectiveSide: 'right',
  hasChildren: false,
  childrenCount: 0,
  branchColor: '#000000',
} as unknown as PositionedNode;

const map = {
  id: 'm',
  title: 't',
  rootId: 'root',
  nodes: { root: node },
  themeId: 'oceanic',
  layoutType: 'right',
  connectorStyle: 'curve',
  createdAt: 0,
  updatedAt: 0,
} as unknown as MindMap;

const layout: LayoutResult = {
  nodes: [node],
  connections: [],
  bounds: { minX: -10, minY: -20, maxX: 90, maxY: 60, width: 100, height: 80 },
  nodeMap: new Map([['root', node]]),
};

describe('getExportFileName', () => {
  it('使えない文字が _ に置き換わる', () => {
    expect(getExportFileName('a/b\\c?d%e*f:g|h"i<j>k', 'png')).toBe('a_b_c_d_e_f_g_h_i_j_k_mindmap.png');
  });
});

describe('generateSvgMarkup', () => {
  it('ノードのテキストがエスケープされる', () => {
    const svg = generateSvgMarkup(map, layout);
    expect(svg).toContain('&lt;b&gt;&amp;&quot;&apos;');
    expect(svg).not.toContain('<b>');
  });

  it('viewBox が getExportSize と一致する', () => {
    const { width, height } = getExportSize(layout);
    const svg = generateSvgMarkup(map, layout);
    expect(svg).toContain(`viewBox="${layout.bounds.minX - 60} ${layout.bounds.minY - 60} ${width} ${height}"`);
  });

  describe('ルートノード', () => {
    const rootRect = (svg: string) => svg.match(/<rect width="100"[^>]*\/>/)?.[0] ?? '';
    const withRoot = (patch: Record<string, unknown>, themeId = 'oceanic') => {
      const root = { ...node, ...patch } as unknown as PositionedNode;
      return generateSvgMarkup(
        { ...map, themeId, nodes: { root } } as unknown as MindMap,
        { ...layout, nodes: [root], nodeMap: new Map([['root', root]]) }
      );
    };

    it('塗りが、テーマのルートの色になり、テーマのルートの枠が 1px で付く', () => {
      for (const t of Object.values(THEMES)) {
        const svg = withRoot({}, t.id);
        expect(rootRect(svg), t.id).toContain(`fill="${t.root.bg}"`);
        expect(svg, t.id).toContain(`rx="11.5" fill="none" stroke="${t.root.border}" stroke-width="1"`);
      }
    });

    it('node.color があれば、枠もその色になる', () => {
      expect(withRoot({ color: '#ff0000' })).toContain('fill="none" stroke="#ff0000" stroke-width="1"');
    });

    it('文字の色が、テーマのルートの文字の色になる', () => {
      expect(withRoot({}, 'darkAurora')).toContain(`fill="${THEMES.darkAurora.root.text}"`);
    });

    it('node.color があれば、塗りはその色で、文字はテーマのルートの文字の色になる', () => {
      const svg = withRoot({ color: '#ff0000' }, 'darkAurora');
      expect(rootRect(svg)).toContain('fill="#ff0000"');
      expect(svg).toContain(`fill="${THEMES.darkAurora.root.text}"`);
    });

    it('角丸が、高さに関係なく画面と同じ 12 になる', () => {
      expect(rootRect(withRoot({}))).toContain('rx="12"');
      expect(rootRect(withRoot({ height: 80, shape: 'pill' }))).toContain('rx="12"');
    });

    it('知らない themeId は、既定のテーマの色になる', () => {
      expect(rootRect(withRoot({}, 'unknown'))).toContain(`fill="${THEMES.natural.root.bg}"`);
    });
  });

  describe('ルート以外のノード', () => {
    const lastNodeGroup = (svg: string) => svg.split(/<g transform="translate\(-?[\d.]+, -?[\d.]+\)">/).slice(-1)[0];
    const child = (patch: Record<string, unknown>, themeId = 'natural') => {
      const root = { ...node, text: 'r' } as unknown as PositionedNode;
      const c = { ...node, id: 'c', parentId: 'root', text: 'child', depth: 2, ...patch } as unknown as PositionedNode;
      return generateSvgMarkup(
        { ...map, themeId, nodes: { root, c } } as unknown as MindMap,
        { ...layout, nodes: [root, c], nodeMap: new Map([['root', root], ['c', c]]) }
      );
    };
    const childGroup = (svg: string) => lastNodeGroup(svg);
    const withRootGroup = (patch: Record<string, unknown>) => {
      const root = { ...node, ...patch } as unknown as PositionedNode;
      return lastNodeGroup(
        generateSvgMarkup(
          { ...map, themeId: 'natural', nodes: { root } } as unknown as MindMap,
          { ...layout, nodes: [root], nodeMap: new Map([['root', root]]) }
        )
      );
    };

    it('rounded は、テーマの塗りで角丸 8 の矩形になる', () => {
      for (const t of Object.values(THEMES)) {
        const g = childGroup(child({}, t.id));
        expect(g, t.id).toContain(`rx="8" fill="${t.node.bg}"`);
        expect(g, t.id).toContain(`fill="${t.node.text}"`);
      }
    });

    it('pill は、高さの半分の角丸になる', () => {
      expect(childGroup(child({ shape: 'pill', height: 40 }))).toContain('rx="20"');
    });

    it('rounded・pill は、枝の色の枠（60%）を 1px で内側に収めて描く', () => {
      const g = childGroup(child({}));
      expect(g).toContain(
        `<rect x="0.5" y="0.5" width="99" height="39" rx="7.5" fill="none" stroke="#000000" stroke-opacity="0.6" stroke-width="1" />`
      );
      expect(childGroup(child({ shape: 'pill', height: 40 }))).toContain('rx="19.5" fill="none"');
    });

    it('node.color があれば、枠はその色の薄め（画面の枠の 60%）になる', () => {
      expect(childGroup(child({ color: '#ff0000' }))).toContain('stroke="#ff0000" stroke-opacity="0.6" stroke-width="1"');
    });

    it('枠は、枝の色の薄め（60%）。階層 1 でも同じ', () => {
      expect(childGroup(child({ depth: 1, branchColor: '#123456' }))).toContain(
        'stroke="#123456" stroke-opacity="0.6" stroke-width="1"'
      );
    });

    it('underline は、四辺の枠を描かず、下辺に枝色の線を引く', () => {
      const g = childGroup(child({ shape: 'underline' }));
      expect(g).not.toContain('<rect');
      expect(g).toContain('<line x1="0" y1="39" x2="100" y2="39" stroke="#000000"');
    });

    it('borderless は、矩形も線も描かない', () => {
      const g = childGroup(child({ shape: 'borderless' }));
      expect(g).not.toContain('<rect');
      expect(g).not.toContain('<line');
    });

    it('underline の線は、node.color があればその色、なければブランチの色になる（深さによらない）', () => {
      expect(childGroup(child({ shape: 'underline', depth: 1, branchColor: '#123456' }))).toContain('stroke="#123456"');
      expect(childGroup(child({ shape: 'underline', depth: 3, branchColor: '#123456' }))).toContain('stroke="#123456"');
      expect(childGroup(child({ shape: 'underline', color: '#ff0000', branchColor: '#123456' }))).toContain(
        'y2="39" stroke="#ff0000"'
      );
    });

    it('node.color があれば、塗りは画面と同じ透明度のその色になる', () => {
      expect(childGroup(child({ color: '#ff0000' }))).toContain('fill="#ff0000" fill-opacity="0.082"');
      expect(childGroup(child({ color: '#ff0000' }))).not.toMatch(/#[0-9a-f]{8}/i);
    });

    describe('折りたたみの数の印', () => {
      it('閉じているノードには、枝色の丸い印と数を、辺の外の線の出口の高さに描く', () => {
        const g = childGroup(child({ hasChildren: true, isFolded: true, childrenCount: 3, branchColor: '#123456' }));
        expect(g).toContain('<rect x="104" y="12" width="16" height="16" rx="8" fill="#123456" />');
        expect(g).toContain('fill="#ffffff">3</text>');
      });

      it('2 桁なら、印が横に伸びる。左側のノードは左の辺の外に描く', () => {
        const g = childGroup(
          child({ hasChildren: true, isFolded: true, childrenCount: 12, effectiveSide: 'left', branchColor: '#123456' })
        );
        expect(g).toContain('<rect x="-26" y="12" width="22" height="16"');
      });

      it('「下線のみ」の印は、下線の高さに描く', () => {
        const g = childGroup(child({ shape: 'underline', hasChildren: true, isFolded: true, childrenCount: 2 }));
        expect(g).toContain('y="31" width="16" height="16"');
      });

      it('開いているノードと、子がないノードには描かない', () => {
        expect(childGroup(child({ hasChildren: true, isFolded: false, childrenCount: 3 }))).not.toContain('>3</text>');
        expect(childGroup(child({ hasChildren: false, isFolded: true, childrenCount: 0 }))).not.toContain('>0</text>');
      });
    });

    describe('ノードの中身（アイコン・進捗・印・文字の位置）', () => {
      it('左のアクセントバーは描かない', () => {
        for (const shape of ['rounded', 'pill', 'borderless', 'underline']) {
          expect(childGroup(child({ shape, branchColor: '#123456' })), shape).not.toContain('<path d="M');
        }
      });

      it('何も付けていないノードは、文字のほかに、アイコン・バッジ・印を描かない', () => {
        const g = childGroup(child({}));
        expect(g).not.toContain('<g '); // アイコン・印は <g> で描く
        expect(g).not.toContain('%');
      });

      it('アイコンが、ブランチの色で、左端の余白の内側に出る。ルートは文字の色', () => {
        const g = childGroup(child({ icon: 'Star', branchColor: '#123456', height: 40 }));
        expect(g).toContain('translate(11 12) scale(0.6666666666666666)');
        expect(g).toContain('stroke="#123456" stroke-width="2"');
        expect(withRootGroup({ icon: 'Star' })).toContain(`stroke="${THEMES.natural.root.text}" stroke-width="2"`);
      });

      it('一覧にないアイコンの名前は、Tag で描く', () => {
        expect(childGroup(child({ icon: 'NoSuchIcon' }))).toContain('<circle cx="7.5" cy="7.5" r=".5" fill="#');
      });

      it('進捗バッジが、100% だけテーマの完了色で出る', () => {
        const { done, node } = THEMES.natural;
        expect(childGroup(child({ progress: 100 }))).toContain(`fill="${mixHex(done, node.bg, 0.15)}"`);
        expect(childGroup(child({ progress: 100 }))).toContain(`stroke="${done}"`);
        expect(childGroup(child({ progress: 60 }))).toContain(`fill="${mixHex(node.text, node.bg, 0.1)}"`);
        expect(childGroup(child({ progress: 60 }))).toContain(`fill="${node.text}">60%</text>`);
        expect(childGroup(child({ progress: 20 }))).toContain(`fill="${node.text}">20%</text>`);
      });

      it('メモとリンクの印が、右端に出る', () => {
        const g = childGroup(child({ note: 'メモ', link: 'https://example.com', width: 200, height: 40 }));
        // 枠 1、右の余白 10、空き 6、リンク 18（中の 14 は +2）、間隔 4、メモ 14 → メモは x=147
        expect(g).toContain('translate(147 13)');
        expect(g).toContain('<g opacity="0.6">');
        expect(g).toContain(`stroke="${THEMES.natural.node.text}"`);
        expect(g.match(/<g opacity="0.6">/g)).toHaveLength(2); // リンクとメモ
        expect(childGroup(child({ note: 'メモ' }))).toContain('<g opacity="0.6">');
        expect(childGroup(child({ note: 'メモ' }))).not.toContain('#f59e0b');
      });

      it('ルート以外の文字は左寄せで、アイコンとバッジの分だけ右に寄る', () => {
        const plain = childGroup(child({}));
        expect(plain).toContain('text-anchor="start"');
        expect(plain).toContain('<tspan x="11"'); // 枠 1 + 左の余白 10
        // アイコン 16 + 間隔 6 + バッジ（60 は 12 + 14 + 8 = 34）+ 間隔 6
        expect(childGroup(child({ icon: 'Star', progress: 60 }))).toContain('<tspan x="73"');
      });

      it('ルートの文字は、文字の列の中央に置く', () => {
        const g = withRootGroup({ width: 100 });
        expect(g).toContain('text-anchor="middle"');
        expect(g).toContain('<tspan x="47"'); // (左 12 + (幅 100 - 右 12 - 間隔 6)) / 2
      });

      it('複数行の文字は、行の高さの間隔で並ぶ', () => {
        const g = childGroup(child({ text: 'a\nb', height: 60 }));
        const ys = [...g.matchAll(/<tspan x="11" y="([\d.]+)"/g)].map((m) => Number(m[1]));
        expect(ys[1] - ys[0]).toBe(20);
      });
    });

    it('文字の大きさ・太字・斜体・下線が、ノードの指定に従う', () => {
      const g = childGroup(child({ fontSize: 'xl', bold: true, italic: true, underline: true }));
      expect(g).toContain('font-size="18px"');
      expect(g).toContain('font-weight="bold"');
      expect(g).toContain('font-style="italic"');
      expect(g).toContain('text-decoration="underline"');
      expect(childGroup(child({}))).toContain('font-size="14px"');
      expect(childGroup(child({}))).toContain('font-weight="500"');
    });
  });
});

describe('generateSvgMarkup の画像', () => {
  const IMG = 'https://example.com/a.png?x=1&y=2';
  const build = (overrides: Partial<PositionedNode>) => {
    const imageNode = { ...node, text: 'a', ...overrides } as PositionedNode;
    return generateSvgMarkup(
      { ...map, nodes: { root: imageNode } } as unknown as MindMap,
      { ...layout, nodes: [imageNode], nodeMap: new Map([['root', imageNode]]) }
    );
  };

  it('画像は全体が見えるように（meet）、保存した大きさで置かれること', () => {
    const svg = build({ image: IMG, imageAspect: 2, imageWidth: 100, width: 140, height: 90 } as Partial<PositionedNode>);
    expect(svg).toContain('preserveAspectRatio="xMidYMid meet"');
    expect(svg).toContain('width="100" height="50"');
    expect(svg).not.toContain('slice');
  });

  it('画像の URL の & はエスケープされること', () => {
    const svg = build({ image: IMG } as Partial<PositionedNode>);
    expect(svg).toContain('x=1&amp;y=2');
  });

  it('縦横比が分からない画像は、中身の幅いっぱい・高さ 109 で置かれること', () => {
    const svg = build({ image: IMG, width: 200, height: 160 } as Partial<PositionedNode>);
    expect(svg).toMatch(/<image [^>]*height="109"/);
  });
});
