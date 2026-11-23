import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 読み込みの結果を、リファクタリングの前後で比べるためのテスト（id と時刻を固定する）
let idCounter = 0;
vi.mock('./id', () => ({ generateId: () => `gen_${++idCounter}` }));

import { markdownToMindMap } from './markdownSync';

const FIXED_NOW = 1700000000000;

beforeEach(() => {
  idCounter = 0;
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});
afterEach(() => vi.useRealTimers());

const FULL = `---
title: "全部入り"
layoutType: vertical-tree
themeId: oceanic
connectorStyle: rounded
fontFamily: serif
updatedAt: 2026-01-02T03:04:05.000Z
unknownKey: ignored
---

# ルート <!-- ignored -->
<!-- mindflow-meta:{"id":"root_1","color":"#112233","icon":"Star"} -->

- 子 A <!-- mindflow:{"id":"a","color":"#ff0000","bold":true,"isFolded":true,"note":"メモ","link":"https://example.com"} -->
  - 孫 A1
    - ひ孫 A1x
  - [x] 孫 A2 完了
  - [ ] 孫 A3 (50%)
  - [ ] 孫 A4 <!-- mindflow:{"progress":25} -->
- 子 B <!-- mindflow:{"id":"b","side":"left","shape":"underline","fontSize":"lg","italic":true,"underline":true} -->
\t- タブの孫
* 子 C ![図](https://example.com/a.png)
+ 子 D<br>二行目
1. 子 E
- <!-- mindflow:{"id":"empty_1"} -->
- 
- 壊れたメタ <!-- mindflow:{broken -->
<!-- mindflow-relations:[{"id":"r1","sourceId":"a","targetId":"b","label":"関連","color":"#00ff00","style":"solid","arrow":"both"},{"id":"r2","sourceId":"a","targetId":"nothing"},null,{"id":"r3","sourceId":"b","targetId":"a","arrow":"none"}] -->
`;

describe('markdownToMindMap（読み込みの結果を固定する）', () => {
  it('フロントマター・ルート・箇条書き・関連線を含む文書の結果が変わらないこと', () => {
    expect(markdownToMindMap(FULL)).toMatchSnapshot();
  });

  it('フロントマターがなく、# の見出しもない文書は、最初の文をルートにすること', () => {
    expect(markdownToMindMap('はじめの文\n\n- 子 1\n  - 孫')).toMatchSnapshot();
  });

  it('空の文書は、フォールバックの題名のルートだけになること', () => {
    expect(markdownToMindMap('', '無題')).toMatchSnapshot();
  });

  it('マインドマップ型では、side のないルートの子が、右 5 本のあと左へ振り分けられること', () => {
    const md = '---\nlayoutType: mindmap\n---\n# R\n- a\n- b\n- c\n- d\n';
    expect(markdownToMindMap(md)).toMatchSnapshot();
    const seven = '---\nlayoutType: mindmap\n---\n# R\n' + 'abcdefg'.split('').map((c) => `- ${c}\n`).join('');
    const map = markdownToMindMap(seven);
    const sides = Object.values(map.nodes)
      .filter((n) => n.parentId === map.rootId)
      .sort((x, y) => (x.order ?? 0) - (y.order ?? 0))
      .map((n) => n.side);
    expect(sides).toEqual(['right', 'right', 'right', 'right', 'right', 'left', 'left']);
  });

  it('左向きの木では、ルートの子がすべて左になること', () => {
    expect(markdownToMindMap('---\nlayoutType: tree-left\n---\n# R\n- a\n  - a1\n- b\n')).toMatchSnapshot();
  });

  it('壊れた JSON のルートのメタと、フロントマターの閉じ忘れで、落ちないこと', () => {
    expect(markdownToMindMap('# R\n<!-- mindflow-meta:{broken -->\n- a\n')).toMatchSnapshot();
    expect(markdownToMindMap('---\ntitle: 閉じ忘れ\n# R\n- a\n')).toMatchSnapshot();
  });

  it('関連線は、両端のノードが存在するものだけ残ること', () => {
    const map = markdownToMindMap(FULL);
    expect(Object.keys(map.relationships ?? {}).sort()).toEqual(['r1', 'r3']);
  });
});
