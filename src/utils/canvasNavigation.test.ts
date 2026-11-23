import { describe, it, expect } from 'vitest';
import { findArrowNavigationTarget } from './canvasNavigation';
import type { PositionedNode } from '../types';

/*
 * テスト用のレイアウト（y は上が負）
 *
 *   L1a ─ L1 ┐        ┌ A ─ A1 (-120)
 *             │        │   └ A2 (-80)
 *        L2 ─┴─ R ────┼ B (0)
 *                      └ C ─ C1 (100)
 */
const node = (
  id: string,
  parentId: string | null,
  y: number,
  depth: number,
  effectiveSide: 'left' | 'right' = 'right'
): PositionedNode => ({ id, parentId, y, x: 0, width: 100, height: 40, depth, effectiveSide, text: id }) as PositionedNode;

const nodes: PositionedNode[] = [
  node('R', null, 0, 0),
  node('A', 'R', -100, 1),
  node('B', 'R', 0, 1),
  node('C', 'R', 100, 1),
  node('A1', 'A', -120, 2),
  node('A2', 'A', -80, 2),
  node('C1', 'C', 100, 2),
  node('L1', 'R', -50, 1, 'left'),
  node('L2', 'R', 50, 1, 'left'),
  node('L1a', 'L1', -50, 2, 'left'),
];
const layout = { nodes, nodeMap: new Map(nodes.map((n) => [n.id, n])) };
const go = (from: string, key: Parameters<typeof findArrowNavigationTarget>[3]) =>
  findArrowNavigationTarget(layout, 'R', from, key);

describe('findArrowNavigationTarget', () => {
  describe('ルートから', () => {
    it('上下で、左右を問わずいちばん上・いちばん下の子へ移動すること', () => {
      expect(go('R', 'ArrowUp')).toBe('A');
      expect(go('R', 'ArrowDown')).toBe('C');
    });

    it('左右で、その側の子の真ん中へ移動すること', () => {
      expect(go('R', 'ArrowRight')).toBe('B'); // A, B, C の真ん中
      expect(go('R', 'ArrowLeft')).toBe('L2'); // L1, L2 → floor(2 / 2) = 1
    });

    it('その側に子がなければ null を返すこと', () => {
      const rightOnly = nodes.filter((n) => n.effectiveSide === 'right');
      const l = { nodes: rightOnly, nodeMap: new Map(rightOnly.map((n) => [n.id, n])) };
      expect(findArrowNavigationTarget(l, 'R', 'R', 'ArrowLeft')).toBeNull();
    });
  });

  describe('上下', () => {
    it('兄弟の間を移動すること', () => {
      expect(go('A2', 'ArrowUp')).toBe('A1');
      expect(go('A1', 'ArrowDown')).toBe('A2');
    });

    it('ルート直下では、同じ側の兄弟の間だけを移動すること', () => {
      // 右側は A(-100), B(0), C(100)、左側は L1(-50), L2(50)。y 順では交互に並ぶ
      expect(go('B', 'ArrowUp')).toBe('A');
      expect(go('B', 'ArrowDown')).toBe('C');
      expect(go('L1', 'ArrowDown')).toBe('L2');
      expect(go('L2', 'ArrowUp')).toBe('L1');
    });

    it('ルート直下の端では、反対側のノードに移動しないこと', () => {
      expect(go('L1', 'ArrowUp')).toBeNull();
      expect(go('L2', 'ArrowDown')).toBeNull();
    });

    it('兄弟の端では、同じ側・同じ深さのいちばん近いノードへ移動すること', () => {
      expect(go('A2', 'ArrowDown')).toBe('C1');
      expect(go('C1', 'ArrowUp')).toBe('A2');
    });

    it('同じ深さになければ、同じ側でいちばん近いノードへ移動すること', () => {
      expect(go('A', 'ArrowUp')).toBe('A1');
    });

    it('兄弟の端から探すときは、反対側のノードに移動しないこと', () => {
      // L1a は兄弟がなく、同じ側（左）には上にも下にもノードがない
      expect(go('L1a', 'ArrowUp')).toBeNull();
      expect(go('L1a', 'ArrowDown')).toBe('L2');
    });

    it('移動先がなければ null を返すこと', () => {
      expect(go('C', 'ArrowDown')).toBeNull();
    });
  });

  describe('左右', () => {
    it('右側のノードは、右で子の真ん中へ、左で親へ移動すること', () => {
      expect(go('A', 'ArrowRight')).toBe('A2'); // A1, A2 → floor(2 / 2) = 1
      expect(go('A', 'ArrowLeft')).toBe('R');
    });

    it('左側のノードは、左で子の真ん中へ、右で親へ移動すること', () => {
      expect(go('L1', 'ArrowLeft')).toBe('L1a');
      expect(go('L1', 'ArrowRight')).toBe('R');
    });

    it('子がなければ null を返すこと', () => {
      expect(go('B', 'ArrowRight')).toBeNull();
    });
  });

  it('レイアウトにないノードからは null を返すこと', () => {
    expect(go('missing', 'ArrowUp')).toBeNull();
  });
});
