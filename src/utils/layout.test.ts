import { describe, it, expect } from 'vitest';
import { calculateLayout } from './layout';
import { createDefaultMindMap } from './treeOperations';
import type { ConnectorStyle, LayoutType, MindMap, MindNode } from '../types';

describe('layout', () => {
  it('デフォルトマップのレイアウト計算が NaN なく完了し、bounds と connections を含むこと', () => {
    const map = createDefaultMindMap('レイアウトテスト');
    const result = calculateLayout(map);

    expect(result.nodes.length).toBe(Object.keys(map.nodes).length);
    expect(result.connections.length).toBeGreaterThan(0);

    // すべてのノードの座標が有限数（NaN でないこと）
    result.nodes.forEach((node) => {
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
      expect(node.width).toBeGreaterThan(0);
      expect(node.height).toBeGreaterThan(0);
    });

    // bounds が正しく計算されていること
    expect(result.bounds.width).toBeGreaterThan(0);
    expect(result.bounds.height).toBeGreaterThan(0);
  });

  it('tree-right レイアウトの場合、子ノードがすべて右側 (x > 0) に配置されること', () => {
    const map = createDefaultMindMap('右ツリー');
    map.layoutType = 'tree-right';

    const result = calculateLayout(map);
    const root = result.nodes.find((n) => n.id === map.rootId);
    expect(root).toBeDefined();

    const children = result.nodes.filter((n) => n.id !== map.rootId);
    children.forEach((child) => {
      expect(child.x).toBeGreaterThan(root!.x);
    });
  });

  it('画像付きノードの場合、幅と高さが拡張されてレイアウト計算されること', () => {
    const map = createDefaultMindMap('画像テスト');
    const childId = Object.keys(map.nodes).find((id) => id !== map.rootId)!;
    
    // 画像なしのレイアウト
    const layoutWithoutImage = calculateLayout(map);
    const nodeWithoutImage = layoutWithoutImage.nodes.find((n) => n.id === childId)!;

    // 画像ありのマップ
    map.nodes[childId] = {
      ...map.nodes[childId],
      image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    };

    const layoutWithImage = calculateLayout(map);
    const nodeWithImage = layoutWithImage.nodes.find((n) => n.id === childId)!;

    expect(nodeWithImage.width).toBeGreaterThanOrEqual(190);
    expect(nodeWithImage.height).toBeGreaterThan(nodeWithoutImage.height + 100);
  });
});

// ---- calculateLayout の結果を固定するテスト ----
// 構造を変えるリファクタリングで、配置・接続線・範囲が変わらないことを確かめる。
// 配置のしかたを意図して変えたときだけ、スナップショットを更新する

type NodeSpec = Partial<MindNode> & { id: string; parentId: string | null };

/** id・order・createdAt を固定したマップを組み立てる（order は同じ親の中での出現順） */
function buildMap(specs: NodeSpec[], overrides: Partial<MindMap> = {}): MindMap {
  const nodes: Record<string, MindNode> = {};
  const childCounts = new Map<string | null, number>();
  specs.forEach((spec, index) => {
    const order = childCounts.get(spec.parentId) ?? 0;
    childCounts.set(spec.parentId, order + 1);
    nodes[spec.id] = { text: spec.id, order, createdAt: 1000 + index, updatedAt: 1000 + index, ...spec };
  });
  return {
    id: 'map',
    title: 'テスト',
    rootId: 'root',
    nodes,
    themeId: 'oceanic',
    layoutType: 'mindmap',
    connectorStyle: 'curved',
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

const BASIC_SPECS: NodeSpec[] = [
  { id: 'root', parentId: null, text: '中心トピック' },
  { id: 'a', parentId: 'root', text: '企画', side: 'right' },
  { id: 'b', parentId: 'root', text: 'Design', side: 'left' },
  { id: 'c', parentId: 'root', text: '実装とテスト', side: 'right' },
  { id: 'd', parentId: 'root', text: 'リリース', side: 'left' },
  { id: 'a1', parentId: 'a', text: '市場調査', side: 'right' },
  { id: 'a2', parentId: 'a', text: '要件定義', side: 'right' },
  { id: 'b1', parentId: 'b', text: 'UI', side: 'left' },
  { id: 'c1', parentId: 'c', text: 'フロントエンド', side: 'right' },
  { id: 'c2', parentId: 'c', text: 'バックエンド', side: 'right' },
  { id: 'c3', parentId: 'c', text: 'QA', side: 'right' },
];

/** スナップショットに入れる部分（nodeMap は nodes と同じ内容なので別に確かめる） */
function snapshotOf(map: MindMap) {
  const { nodes, connections, bounds } = calculateLayout(map);
  return { nodes, connections, bounds };
}

describe('calculateLayout の結果の固定', () => {
  const layoutTypes: LayoutType[] = ['mindmap', 'tree-right', 'tree-left'];
  const connectorStyles: ConnectorStyle[] = ['curved', 'straight', 'rounded', 'arc'];

  layoutTypes.forEach((layoutType) => {
    connectorStyles.forEach((connectorStyle) => {
      it(`基本のマップ（${layoutType}・${connectorStyle}）`, () => {
        expect(snapshotOf(buildMap(BASIC_SPECS, { layoutType, connectorStyle }))).toMatchSnapshot();
      });
    });
  });

  it('折りたたんだノードの子は配置せず、hasChildren と childrenCount は残ること', () => {
    const specs = BASIC_SPECS.map((s) => (s.id === 'c' ? { ...s, isFolded: true } : s));
    const result = calculateLayout(buildMap(specs));
    expect(result.nodes.map((n) => n.id)).not.toContain('c1');
    expect(result.nodeMap.get('c')).toMatchObject({ hasChildren: true, childrenCount: 3 });
    expect(snapshotOf(buildMap(specs))).toMatchSnapshot();
  });

  it('子より背の高いノード（画像付き・複数行）', () => {
    const specs: NodeSpec[] = [
      { id: 'root', parentId: null, text: '中心' },
      { id: 'a', parentId: 'root', text: '画像', side: 'right', image: 'data:image/png;base64,AAAA' },
      { id: 'a1', parentId: 'a', text: '子', side: 'right' },
      { id: 'b', parentId: 'root', text: '1 行目\n2 行目\n3 行目', side: 'right' },
      { id: 'b1', parentId: 'b', text: '子', side: 'right' },
      { id: 'c', parentId: 'root', text: '左の画像', side: 'left', image: 'data:image/png;base64,AAAA' },
      { id: 'c1', parentId: 'c', text: '子 1', side: 'left' },
      { id: 'c2', parentId: 'c', text: '子 2', side: 'left' },
    ];
    expect(snapshotOf(buildMap(specs))).toMatchSnapshot();
  });

  it('4 階層のマップ', () => {
    const specs: NodeSpec[] = [
      { id: 'root', parentId: null, text: '中心' },
      { id: 'a', parentId: 'root', text: '階層 1', side: 'right' },
      { id: 'a1', parentId: 'a', text: '階層 2', side: 'right' },
      { id: 'a11', parentId: 'a1', text: '階層 3', side: 'right' },
      { id: 'a111', parentId: 'a11', text: '階層 4-1', side: 'right' },
      { id: 'a112', parentId: 'a11', text: '階層 4-2', side: 'right' },
      { id: 'a2', parentId: 'a', text: '階層 2-2', side: 'right' },
      { id: 'b', parentId: 'root', text: '左', side: 'left' },
      { id: 'b1', parentId: 'b', text: '左の階層 2', side: 'left' },
      { id: 'b11', parentId: 'b1', text: '左の階層 3', side: 'left' },
    ];
    expect(snapshotOf(buildMap(specs))).toMatchSnapshot();
  });

  it('side のないルートの子は、並び順で右を先に埋めて振り分けること（side を持つ子は変えない）', () => {
    const specs: NodeSpec[] = [
      { id: 'root', parentId: null, text: '中心' },
      { id: 'a', parentId: 'root' },
      { id: 'b', parentId: 'root' },
      { id: 'c', parentId: 'root', side: 'left' },
      { id: 'd', parentId: 'root' },
      { id: 'e', parentId: 'root' },
      { id: 'a1', parentId: 'a' },
      { id: 'b1', parentId: 'b' },
    ];
    const result = calculateLayout(buildMap(specs));
    const sideOf = (id: string) => result.nodeMap.get(id)!.effectiveSide;
    expect(['a', 'b', 'c', 'd', 'e', 'a1', 'b1'].map(sideOf)).toEqual([
      'right',
      'right',
      'left',
      'right',
      'right',
      'right',
      'right',
    ]);
    expect(snapshotOf(buildMap(specs))).toMatchSnapshot();
  });

  it('色を指定したノードの色を、子孫の枝の色に引き継ぐこと', () => {
    const specs: NodeSpec[] = [
      { id: 'root', parentId: null, text: '中心' },
      { id: 'a', parentId: 'root', side: 'right', color: '#ff0000' },
      { id: 'a1', parentId: 'a', side: 'right' },
      { id: 'a2', parentId: 'a', side: 'right', color: '#00ff00' },
      { id: 'a21', parentId: 'a2', side: 'right' },
      { id: 'b', parentId: 'root', side: 'right' },
      { id: 'b1', parentId: 'b', side: 'right', color: '#0000ff' },
      { id: 'c', parentId: 'root', side: 'left' },
    ];
    const result = calculateLayout(buildMap(specs));
    const colorOf = (id: string) => result.nodeMap.get(id)!.branchColor;
    expect([colorOf('a'), colorOf('a1'), colorOf('a2'), colorOf('a21'), colorOf('b1')]).toEqual([
      '#ff0000',
      '#ff0000',
      '#00ff00',
      '#00ff00',
      '#0000ff',
    ]);
    expect(snapshotOf(buildMap(specs))).toMatchSnapshot();
  });

  it('形状・フォント・アイコン・進捗・メモ・リンクを付けたノード', () => {
    const specs: NodeSpec[] = [
      { id: 'root', parentId: null, text: 'Root Topic', fontSize: 'xl', icon: 'star' },
      { id: 'a', parentId: 'root', text: 'pill', side: 'right', shape: 'pill', fontSize: 'sm' },
      { id: 'b', parentId: 'root', text: 'underline', side: 'right', shape: 'underline', bold: true },
      { id: 'c', parentId: 'root', text: 'borderless', side: 'right', shape: 'borderless', fontSize: 'lg' },
      { id: 'd', parentId: 'root', text: '進捗', side: 'left', progress: 50, icon: 'check' },
      { id: 'e', parentId: 'root', text: '完了 ✅', side: 'left', progress: 100, note: 'メモ', link: 'https://example.com' },
      { id: 'f', parentId: 'root', text: 'A → B ①', side: 'left', fontSize: 'xl', note: 'メモ' },
    ];
    expect(snapshotOf(buildMap(specs))).toMatchSnapshot();
  });

  it('ルートだけのマップ', () => {
    expect(snapshotOf(buildMap([{ id: 'root', parentId: null, text: '中心' }]))).toMatchSnapshot();
  });

  it('ルートがないマップは、空の結果を返すこと', () => {
    const result = calculateLayout(buildMap([{ id: 'other', parentId: null }]));
    expect(result.nodes).toEqual([]);
    expect(result.connections).toEqual([]);
    expect(result.bounds).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 });
    expect(result.nodeMap.size).toBe(0);
  });

  it('nodeMap は nodes と同じ内容・同じ順番であること', () => {
    const result = calculateLayout(buildMap(BASIC_SPECS));
    expect([...result.nodeMap.keys()]).toEqual(result.nodes.map((n) => n.id));
    result.nodes.forEach((n) => expect(result.nodeMap.get(n.id)).toBe(n));
  });
});

describe('書体ごとのレイアウト', () => {
  it('マップの書体の字幅でノードの幅を見積もること（等幅では細い文字も広くなる）', () => {
    const map = buildMap([
      { id: 'root', parentId: null, text: '中心' },
      { id: 'a', parentId: 'root', text: 'illicit little lilies' },
    ]);
    const widthOf = (fontFamily: string | undefined) =>
      calculateLayout({ ...map, fontFamily }).nodeMap.get('a')!.width;
    expect(widthOf('mono')).toBeGreaterThan(widthOf('sans'));
    // なくした書体は、ゴシックとして見積もる
    expect(widthOf('handwriting')).toBe(widthOf('sans'));
    expect(widthOf(undefined)).toBe(widthOf('sans'));
  });
});
