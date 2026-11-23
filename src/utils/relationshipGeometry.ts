import type { PositionedNode } from '../types';

type NodeRect = Pick<PositionedNode, 'x' | 'y' | 'width' | 'height' | 'depth' | 'effectiveSide'>;

export interface RelationshipGeometry {
  /** SVG のパス */
  pathD: string;
  /** 線の中点（ワールド座標） */
  mid: { x: number; y: number };
}

/** 2 つのノードを結ぶ関連線のパスと中点 */
export function computeRelationshipGeometry(sourceNode: NodeRect, targetNode: NodeRect): RelationshipGeometry {
  const sCenterY = sourceNode.y + sourceNode.height / 2;
  const tCenterY = targetNode.y + targetNode.height / 2;
  const sCenterX = sourceNode.x + sourceNode.width / 2;
  const tCenterX = targetNode.x + targetNode.width / 2;

  const isBothRight = sourceNode.effectiveSide === 'right' && targetNode.effectiveSide === 'right';
  const isBothLeft = sourceNode.effectiveSide === 'left' && targetNode.effectiveSide === 'left';
  const isSameLevel = sourceNode.depth === targetNode.depth || Math.abs(sourceNode.x - targetNode.x) < 100;

  const startY = sCenterY;
  const endY = tCenterY;
  let startX: number;
  let endX: number;
  let cp1x: number;
  let cp1y: number;
  let cp2x: number;
  let cp2y: number;

  if (isBothRight && isSameLevel) {
    // 右側の同じレベルのノード同士: 右端同士を外側のCカーブ（アーチ）で結ぶ
    startX = sourceNode.x + sourceNode.width;
    endX = targetNode.x + targetNode.width;
    const maxRight = Math.max(startX, endX);
    const bulge = Math.min(220, Math.max(60, Math.abs(endY - startY) * 0.35));
    cp1x = maxRight + bulge;
    cp1y = startY + (endY - startY) * 0.15;
    cp2x = maxRight + bulge;
    cp2y = endY - (endY - startY) * 0.15;
  } else if (isBothLeft && isSameLevel) {
    // 左側の同じレベルのノード同士: 左端同士を外側のCカーブ（アーチ）で結ぶ
    startX = sourceNode.x;
    endX = targetNode.x;
    const minLeft = Math.min(startX, endX);
    const bulge = Math.min(220, Math.max(60, Math.abs(endY - startY) * 0.35));
    cp1x = minLeft - bulge;
    cp1y = startY + (endY - startY) * 0.15;
    cp2x = minLeft - bulge;
    cp2y = endY - (endY - startY) * 0.15;
  } else {
    // 階層を跨ぐ、または左右を横断する場合
    if (tCenterX >= sCenterX) {
      startX = sourceNode.x + sourceNode.width;
      endX = targetNode.x;
    } else {
      startX = sourceNode.x;
      endX = targetNode.x + targetNode.width;
    }
    const dx = (endX - startX) * 0.4;
    const dy = (endY - startY) * 0.2;
    cp1x = startX + dx;
    cp1y = startY + dy - 30;
    cp2x = endX - dx;
    cp2y = endY - dy - 30;
  }

  return {
    pathD: `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`,
    // ベジェ曲線 t=0.5 の中点
    mid: {
      x: 0.125 * startX + 0.375 * cp1x + 0.375 * cp2x + 0.125 * endX,
      y: 0.125 * startY + 0.375 * cp1y + 0.375 * cp2y + 0.125 * endY,
    },
  };
}
