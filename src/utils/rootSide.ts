// 放射状（mindmap）のマップで、ルートの子をどちら側に置くかの決まり。
// 追加（Tab / Enter）・読み込み・描画が同じ決まりを使う。utils/tree/ には依存しない

export type RootSide = 'left' | 'right';

/** 右側を先に埋める本数（最初の 5 本は右、そのあと左） */
export const ROOT_RIGHT_FIRST_COUNT = 5;

/**
 * 新しいルートの子を置く側。右の数 R、左の数 L として、R < max(N, L + 1) なら右、そうでなければ左。
 * 1〜N 本目は右、N+1〜2N 本目は左（左右が同数になる）、そのあとは右・左の交互になる
 */
export function nextRootChildSide(rightCount: number, leftCount: number): RootSide {
  return rightCount < Math.max(ROOT_RIGHT_FIRST_COUNT, leftCount + 1) ? 'right' : 'left';
}

/**
 * ルートの子（並び順）の側を決める。side を持つ子はそのまま、持たない子は、
 * それまでの左右の数から nextRootChildSide で決める
 */
export function assignRootChildSides(children: { side?: RootSide }[]): RootSide[] {
  let right = 0;
  let left = 0;
  return children.map((child) => {
    const side = child.side === 'left' || child.side === 'right' ? child.side : nextRootChildSide(right, left);
    if (side === 'left') left++;
    else right++;
    return side;
  });
}
