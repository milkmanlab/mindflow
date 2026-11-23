import type { NodeFontSize } from '../types';

/**
 * フォントサイズの対応表。クラスと px を並べて持ち、画面（クラス）・見積もり（px）・書き出し（px）で同じ段階を使う。
 * ルートは通常のノードより 1 段大きい（行の高さは nodeDimensions.ts の getNodeLineHeight）
 */
export const NODE_FONT_SIZES: Record<'root' | 'node', Record<NodeFontSize, { className: string; px: number }>> = {
  root: {
    sm: { className: 'text-sm', px: 14 },
    base: { className: 'text-base', px: 16 },
    lg: { className: 'text-lg', px: 18 },
    xl: { className: 'text-xl', px: 20 },
  },
  node: {
    sm: { className: 'text-xs', px: 12 },
    base: { className: 'text-sm', px: 14 },
    lg: { className: 'text-base', px: 16 },
    xl: { className: 'text-lg', px: 18 },
  },
};

/** 文字の大きさ（px）。想定外の値（手で書き換えた Markdown など）は base として扱う */
export function getNodeFontPx(fontSize: NodeFontSize | undefined, isRoot: boolean): number {
  const sizes = NODE_FONT_SIZES[isRoot ? 'root' : 'node'];
  return (sizes[fontSize || 'base'] ?? sizes.base).px;
}
