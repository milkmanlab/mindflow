import { describe, it, expect } from 'vitest';
import { mindMapToMarkdown, markdownToMindMap } from './markdownSync';
import { createDefaultMindMap, addChildNode } from './treeOperations';

describe('markdownSync', () => {
  describe('接続線の種類（connectorStyle）', () => {
    it.each(['curved', 'rounded', 'straight', 'arc'] as const)('%s が往復で保持されること', (connectorStyle) => {
      const map = { ...createDefaultMindMap('接続線'), connectorStyle };
      expect(markdownToMindMap(mindMapToMarkdown(map)).connectorStyle).toBe(connectorStyle);
    });

    it('知らない値と、書いていないときは、既定（弧）として開くこと', () => {
      const markdown = mindMapToMarkdown({ ...createDefaultMindMap('接続線'), connectorStyle: 'arc' }).replace(
        'connectorStyle: arc',
        'connectorStyle: zigzag'
      );
      expect(markdownToMindMap(markdown).connectorStyle).toBe('arc');
      expect(markdownToMindMap('# 題名\n\n- 子').connectorStyle).toBe('arc');
    });
  });

  describe('Round-trip (可逆性) テスト', () => {
    it('デフォルトのマインドマップを Markdown 往復変換してもデータが失われないこと', () => {
      const originalMap = createDefaultMindMap('プロダクト構想');
      originalMap.updatedAt = 1700000000000;
      const markdown1 = mindMapToMarkdown(originalMap);
      const parsedMap = markdownToMindMap(markdown1);
      parsedMap.updatedAt = originalMap.updatedAt;
      const markdown2 = mindMapToMarkdown(parsedMap);

      expect(parsedMap.title).toBe(originalMap.title);
      expect(parsedMap.themeId).toBe(originalMap.themeId);
      expect(parsedMap.layoutType).toBe(originalMap.layoutType);
      expect(parsedMap.connectorStyle).toBe(originalMap.connectorStyle);

      // Markdown の文字列表現が往復で完全一致すること（冪等性）
      expect(markdown2).toBe(markdown1);
    });

    it('ノードの装飾・メタデータ（色、配置、折りたたみ、アイコン）が往復で保持されること', () => {
      const map = createDefaultMindMap('プロジェクト計画');
      const rootId = map.rootId;

      // 子ノードの追加とメタデータ設定
      const { updatedMap: mapWithChild, newNodeId } = addChildNode(map, rootId, '重要タスク', 'right');
      mapWithChild.nodes[newNodeId] = {
        ...mapWithChild.nodes[newNodeId],
        color: '#ef4444',
        textColor: '#ffffff',
        icon: 'AlertTriangle',
        isFolded: true,
        bold: true,
        note: '注意メモです',
      };

      const markdown = mindMapToMarkdown(mapWithChild);
      expect(markdown).toContain('<!-- mindflow:');
      expect(markdown).toContain('"color":"#ef4444"');
      expect(markdown).toContain('"icon":"AlertTriangle"');
      expect(markdown).toContain('"isFolded":true');

      // 復元テスト
      const restored = markdownToMindMap(markdown);
      const restoredNodes = Object.values(restored.nodes);
      const target = restoredNodes.find((n) => n.text === '重要タスク');

      expect(target).toBeDefined();
      expect(target?.color).toBe('#ef4444');
      expect(target?.textColor).toBe('#ffffff');
      expect(target?.icon).toBe('AlertTriangle');
      expect(target?.isFolded).toBe(true);
      expect(target?.bold).toBe(true);
      expect(target?.note).toBe('注意メモです');
      expect(target?.side).toBe('right');
    });

    it('ノードの画像 (image) が Markdown 往復で保持されること', () => {
      const map = createDefaultMindMap('画像テスト');
      const rootId = map.rootId;
      const { updatedMap: mapWithChild, newNodeId } = addChildNode(map, rootId, '画像ノード', 'right');
      const sampleImageUrl = 'https://example.com/sample.png';
      mapWithChild.nodes[newNodeId] = {
        ...mapWithChild.nodes[newNodeId],
        image: sampleImageUrl,
      };

      const markdown = mindMapToMarkdown(mapWithChild);
      expect(markdown).toContain(`"image":"${sampleImageUrl}"`);

      const restored = markdownToMindMap(markdown);
      const restoredNode = Object.values(restored.nodes).find((n) => n.text === '画像ノード');
      expect(restoredNode).toBeDefined();
      expect(restoredNode?.image).toBe(sampleImageUrl);
    });

    it('画像の幅 (imageWidth) と縦横比 (imageAspect) が、ノードとルートの両方で往復すること', () => {
      const map = createDefaultMindMap('画像の大きさ');
      const { updatedMap, newNodeId } = addChildNode(map, map.rootId, '子', 'right');
      const sized = {
        ...updatedMap,
        nodes: {
          ...updatedMap.nodes,
          [newNodeId]: { ...updatedMap.nodes[newNodeId], image: 'https://example.com/a.png', imageWidth: 320, imageAspect: 1.5 },
          [map.rootId]: { ...updatedMap.nodes[map.rootId], image: 'https://example.com/r.png', imageAspect: 0.5 },
        },
      };

      const restored = markdownToMindMap(mindMapToMarkdown(sized));
      const child = Object.values(restored.nodes).find((n) => n.text === '子');
      expect(child?.imageWidth).toBe(320);
      expect(child?.imageAspect).toBe(1.5);
      const root = restored.nodes[restored.rootId];
      expect(root.imageAspect).toBe(0.5);
      expect(root.imageWidth).toBeUndefined();
    });

    it('画像のないノードには、画像の大きさを書き出さないこと', () => {
      const map = createDefaultMindMap('画像なし');
      const { updatedMap, newNodeId } = addChildNode(map, map.rootId, '子', 'right');
      const stale = {
        ...updatedMap,
        nodes: { ...updatedMap.nodes, [newNodeId]: { ...updatedMap.nodes[newNodeId], imageWidth: 100, imageAspect: 2 } },
      };
      const markdown = mindMapToMarkdown(stale);
      expect(markdown).not.toContain('imageWidth');
      expect(markdown).not.toContain('imageAspect');
    });

    it('インライン Markdown 画像構文 ![alt](url) を正しくパースして image プロパティに変換できること', () => {
      const mdWithImage = `# 画像マップ
- アイコン付きノード ![図面](https://example.com/diagram.png)
`;
      const map = markdownToMindMap(mdWithImage);
      const childNode = Object.values(map.nodes).find((n) => n.id !== map.rootId);
      expect(childNode).toBeDefined();
      expect(childNode?.text).toBe('アイコン付きノード 図面');
      expect(childNode?.image).toBe('https://example.com/diagram.png');
    });

    it('ノード間の関連線 (relationships) が Markdown 往復で完全に保持されること', () => {
      const map = createDefaultMindMap('リレーションテスト');
      const rootId = map.rootId;
      const { updatedMap: m1, newNodeId: nodeA } = addChildNode(map, rootId, '原因ノード', 'left');
      const { updatedMap: m2, newNodeId: nodeB } = addChildNode(m1, rootId, '結果ノード', 'right');

      const relId = 'rel_test_1';
      m2.relationships = {
        [relId]: {
          id: relId,
          sourceId: nodeA,
          targetId: nodeB,
          label: '引き起こす',
          color: '#ef4444',
          style: 'dashed',
          arrow: 'forward',
        },
      };

      const markdown = mindMapToMarkdown(m2);
      expect(markdown).toContain('<!-- mindflow-relations:');
      expect(markdown).toContain('引き起こす');

      const restored = markdownToMindMap(markdown);
      expect(restored.relationships).toBeDefined();
      expect(restored.relationships?.[relId]).toBeDefined();

      const rel = restored.relationships![relId];
      expect(rel.sourceId).toBe(nodeA);
      expect(rel.targetId).toBe(nodeB);
      expect(rel.label).toBe('引き起こす');
      expect(rel.color).toBe('#ef4444');
      expect(rel.style).toBe('dashed');
    });
  });

  describe('Markdown パースのエッジケース', () => {
    it('新規作成コマンドが書く「# 名前」だけの Markdown が、子のないマップとして開けること', () => {
      const map = markdownToMindMap('# 企画メモ\n');
      expect(map.nodes[map.rootId].text).toBe('企画メモ');
      expect(Object.keys(map.nodes)).toHaveLength(1);
    });

    it('Frontmatter なしの素の Markdown 箇条書きから正しくツリーを構築できること', () => {
      const plainMd = `# 親ノード
- 子ノード 1
  - 孫ノード 1-1
- 子ノード 2
`;
      const map = markdownToMindMap(plainMd);
      expect(map.title).toBe('親ノード');

      const rootNode = map.nodes[map.rootId];
      expect(rootNode.text).toBe('親ノード');

      const children = Object.values(map.nodes).filter((n) => n.parentId === map.rootId);
      expect(children).toHaveLength(2);

      const child1 = children.find((n) => n.text === '子ノード 1');
      expect(child1).toBeDefined();

      const grandChildren = Object.values(map.nodes).filter((n) => n.parentId === child1?.id);
      expect(grandChildren).toHaveLength(1);
      expect(grandChildren[0].text).toBe('孫ノード 1-1');
    });

    it('タスク記法 (- [x] / - [ ]) をパースして progress に反映できること', () => {
      const taskMd = `# タスクリスト
- [x] 完了したタスク
- [ ] 未着手のタスク
- [ ] 進行中のタスク (50%)
`;
      const map = markdownToMindMap(taskMd);
      const nodes = Object.values(map.nodes);

      const completed = nodes.find((n) => n.text === '完了したタスク');
      expect(completed?.progress).toBe(100);

      const ongoing = nodes.find((n) => n.text === '進行中のタスク');
      expect(ongoing?.progress).toBe(50);
    });

    it('進捗（25 / 50 / 75 / 100）が、メタデータ付きの行でも往復で保持されること', () => {
      for (const progress of [25, 50, 75, 100]) {
        const map = createDefaultMindMap('進捗');
        const { updatedMap, newNodeId } = addChildNode(map, map.rootId, 'タスク', 'right');
        updatedMap.nodes[newNodeId] = { ...updatedMap.nodes[newNodeId], progress, icon: 'Star' };

        const parsed = markdownToMindMap(mindMapToMarkdown(updatedMap));
        const task = parsed.nodes[newNodeId];

        expect(task.progress).toBe(progress);
        // 「(75%)」のような進捗の表記が、文字に残らないこと
        expect(task.text).toBe('タスク');
        expect(task.icon).toBe('Star');
      }
    });

    it('進捗の表記 (NN%) が行末でなくても、読み取って文字から取り除くこと', () => {
      const md = `# 進捗
- [ ] 進行中 (75%) <!-- mindflow:{"id":"n1","progress":75} -->
- [ ] メタデータの値だけ <!-- mindflow:{"id":"n2","progress":25} -->
`;
      const nodes = markdownToMindMap(md).nodes;
      expect(nodes.n1.text).toBe('進行中');
      expect(nodes.n1.progress).toBe(75);
      // 「(NN%)」がなくても、メタデータの進捗を使うこと
      expect(nodes.n2.progress).toBe(25);
    });

    it('空行や不規則なインデントがあっても安全にパースできること', () => {
      const irregularMd = `
---
title: "不規則テスト"
---

# メイン

  - 2スペース
    - 4スペース
- トップレベル戻り
`;
      const map = markdownToMindMap(irregularMd);
      expect(map.title).toBe('不規則テスト');
      expect(Object.keys(map.nodes).length).toBe(4);
    });

    it('空文字列や壊れた入力に対しても例外を投げずにデフォルトツリーを返すこと', () => {
      expect(() => markdownToMindMap('')).not.toThrow();
      const emptyMap = markdownToMindMap('');
      expect(emptyMap.rootId).toBeDefined();
      expect(Object.keys(emptyMap.nodes).length).toBeGreaterThanOrEqual(1);
    });

    it('未知の将来メタデータや旧形式メタデータが含まれていても壊れずに復元できること（下位互換性）', () => {
      const futureMd = `---
themeId: ocean
unknownFutureMapProp: 456
---

# 将来互換テスト
<!-- mindflow-meta:{"unknownRootProp":true} -->

- 子ノード <!-- mindflow:{"color":"#10b981","newProp":"testValue","isFolded":false} -->
`;
      const map = markdownToMindMap(futureMd);
      expect(map.title).toBe('将来互換テスト');
      expect(map.themeId).toBe('ocean');

      const child = Object.values(map.nodes).find((n) => n.text === '子ノード');
      expect(child).toBeDefined();
      expect(child?.color).toBe('#10b981');
      expect(child?.isFolded).toBe(false);
    });

    it('メタデータ内の link や note プロパティが安全に往復復元できること', () => {
      const linkMd = `# リンクとメモのテスト
- 参考リンク <!-- mindflow:{"link":"https://github.com","note":"メモ内容です"} -->
`;
      const map = markdownToMindMap(linkMd);
      const child = Object.values(map.nodes).find((n) => n.text === '参考リンク');

      expect(child).toBeDefined();
      expect(child?.link).toBe('https://github.com');
      expect(child?.note).toBe('メモ内容です');
    });

    it('特殊文字（バッククォート、パイプ、不等号、ダブルクォート等）を含むノードが安全に往復できること', () => {
      const map = createDefaultMindMap('特殊文字テスト');
      const rootId = map.rootId;
      const specialText = '`code` | "quotes" <tag> & *bold* \\ /';
      const { updatedMap } = addChildNode(map, rootId, specialText, 'right');

      const markdown = mindMapToMarkdown(updatedMap);
      const restored = markdownToMindMap(markdown);
      const child = Object.values(restored.nodes).find((n) => n.text === specialText);

      expect(child).toBeDefined();
      expect(child?.text).toBe(specialText);
    });

    it('layoutType 未指定の Markdown を開いたとき、デフォルトで tree-right (右へ展開) となること', () => {
      const plainMd = `# 新規ファイル
- トピック 1
- トピック 2
`;
      const map = markdownToMindMap(plainMd);
      expect(map.layoutType).toBe('tree-right');
    });

    it('旧形式の vertical-tree (下方向ツリー) が設定された Markdown を開いたとき、安全に tree-right にフォールバックされること', () => {
      const legacyMd = `---
title: "旧設定ファイル"
layoutType: vertical-tree
---
# メイン
- トピック
`;
      const map = markdownToMindMap(legacyMd);
      expect(map.layoutType).toBe('tree-right');
    });
  });

  it('パース → 再シリアライズで同一の Markdown になること（保存ループ防止）', () => {
    const map = createDefaultMindMap('ループ防止');
    map.updatedAt = 1700000000000;
    const md = mindMapToMarkdown(map);
    expect(mindMapToMarkdown(markdownToMindMap(md))).toBe(md);
  });

  it('ノード内の改行（Alt+Enter）が保存・再読み込みで失われないこと', () => {
    const map = createDefaultMindMap();
    const { updatedMap } = addChildNode(map, map.rootId, '1行目\n2行目');
    const md = mindMapToMarkdown(updatedMap);
    expect(md).toContain('- 1行目<br>2行目');
    const parsed = markdownToMindMap(md);
    const texts = Object.values(parsed.nodes).map((n) => n.text);
    expect(texts).toContain('1行目\n2行目');
    expect(mindMapToMarkdown(parsed)).toBe(md);
  });

  it('空テキストの新規ノードを往復しても Markdown が変わらないこと（選択リセット防止）', () => {
    const map = createDefaultMindMap('空ノード');
    map.updatedAt = 1700000000000;
    const { updatedMap } = addChildNode(map, map.rootId, '');
    const md = mindMapToMarkdown(updatedMap);
    expect(mindMapToMarkdown(markdownToMindMap(md))).toBe(md);
  });
});

describe('fontFamily（書体）', () => {
  const withFont = (font: string) => `---\ntitle: t\nfontFamily: ${font}\n---\n\n# root\n\n- child\n`;

  it.each(['sans', 'serif', 'mono'])('%s を読み込んで書き出すと、そのまま残ること', (font) => {
    const map = markdownToMindMap(withFont(font));
    expect(map.fontFamily).toBe(font);
    expect(mindMapToMarkdown(map)).toContain(`fontFamily: ${font}\n`);
  });

  it.each(['rounded', 'handwriting'])('なくした書体 %s も、ファイルの値は書き換えずに残すこと', (font) => {
    const map = markdownToMindMap(withFont(font));
    expect(map.fontFamily).toBe(font);
    // ノードの文字を直して保存しても、値は変わらない（関係のない編集で git の差分を出さない）
    const child = Object.values(map.nodes).find((n) => n.text === 'child')!;
    const edited = { ...map, nodes: { ...map.nodes, [child.id]: { ...child, text: 'edited' } } };
    expect(mindMapToMarkdown(edited)).toContain(`fontFamily: ${font}\n`);
  });
});
