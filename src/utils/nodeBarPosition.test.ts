import { describe, expect, it } from 'vitest';
import { NODE_BAR_EDGE_MARGIN, NODE_BAR_GAP, computeNodeBarPosition, nodeScreenRect } from './nodeBarPosition';

const viewport = { width: 800, height: 600 };
const bar = { width: 300, height: 40 };
const node = (left: number, top: number, width = 100, height = 40) => ({ left, top, width, height });

describe('computeNodeBarPosition', () => {
  it('ノードの上に、左端を揃えて置くこと', () => {
    expect(computeNodeBarPosition({ node: node(350, 300), bar, viewport })).toEqual({
      left: 350,
      top: 300 - NODE_BAR_GAP - bar.height,
    });
  });

  it('上端からはみ出すときは、余白で止まること（ノードに重なる）', () => {
    const pos = computeNodeBarPosition({ node: node(350, 20), bar, viewport });
    expect(pos?.top).toBe(NODE_BAR_EDGE_MARGIN);
  });

  it('左端・右端からはみ出すときは、内側で止まること', () => {
    expect(computeNodeBarPosition({ node: node(-50, 300), bar, viewport })?.left).toBe(NODE_BAR_EDGE_MARGIN);
    expect(computeNodeBarPosition({ node: node(750, 300), bar, viewport })?.left).toBe(
      viewport.width - NODE_BAR_EDGE_MARGIN - bar.width
    );
  });

  it('バーが画面より広いときは、左の余白に揃えること', () => {
    expect(computeNodeBarPosition({ node: node(350, 300), bar: { width: 900, height: 40 }, viewport })?.left).toBe(
      NODE_BAR_EDGE_MARGIN
    );
  });

  it('ノードが画面の外にあるときは null、一部でも見えていれば出すこと', () => {
    expect(computeNodeBarPosition({ node: node(-200, 300), bar, viewport })).toBeNull();
    expect(computeNodeBarPosition({ node: node(900, 300), bar, viewport })).toBeNull();
    expect(computeNodeBarPosition({ node: node(300, -100), bar, viewport })).toBeNull();
    expect(computeNodeBarPosition({ node: node(300, 700), bar, viewport })).toBeNull();
    expect(computeNodeBarPosition({ node: node(-50, 300), bar, viewport })).not.toBeNull();
    expect(computeNodeBarPosition({ node: node(300, -20), bar, viewport })).not.toBeNull();
  });
});

describe('nodeScreenRect', () => {
  it('ズームとパンを反映した、画面上の矩形になること', () => {
    const rect = nodeScreenRect(
      { x: -50, y: -20, width: 100, height: 40 },
      { pan: { x: 10, y: 20 }, zoom: 2, size: { width: 800, height: 600 } }
    );
    expect(rect).toEqual({ left: 400 + 10 - 100, top: 300 + 20 - 40, width: 200, height: 80 });
  });
});
