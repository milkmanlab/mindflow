import type { LayoutType } from '../types';
import type { DropPosition } from './treeOperations';

type Side = 'left' | 'right';

/** Alt を押しているときの、前後を分ける縦位置 */
const ALT_SPLIT_RATIO = 0.5;
/** 子が伸びる側では「中へ」を広めに取る（上下 15% だけが前後） */
const CHILD_SIDE_EDGE_RATIO = 0.15;
/** 親の線が来る側では、上下 25% を前後にする */
const PARENT_SIDE_EDGE_RATIO = 0.25;
/** 横位置がこの範囲なら「子が伸びる側（または中央）」とみなす */
const CHILD_SIDE_RATIO_X_RIGHT = 0.4; // 右に伸びるノード：左から 40% 以降
const CHILD_SIDE_RATIO_X_LEFT = 0.6; // 左に伸びるノード：左から 60% まで

export interface DropPositionInput {
  /** ドロップ先のノード内での、カーソルの横位置（0〜1） */
  ratioX: number;
  /** ドロップ先のノード内での、カーソルの縦位置（0〜1） */
  ratioY: number;
  isAlt: boolean;
  isRoot: boolean;
  /** ドロップ先のノードの子が伸びる向き */
  childSide: 'left' | 'right';
}

/** ドラッグ中のカーソル位置から、ドロップ位置（前・後・中）を決める */
export function computeDropPosition({ ratioX, ratioY, isAlt, isRoot, childSide }: DropPositionInput): DropPosition {
  // ルートには子として追加するしかない
  if (isRoot) return 'inside';
  // Alt を押しているときは兄弟の並べ替えだけ（中には入れない）
  if (isAlt) return ratioY < ALT_SPLIT_RATIO ? 'before' : 'after';

  const isChildExpansionSide =
    childSide === 'left' ? ratioX <= CHILD_SIDE_RATIO_X_LEFT : ratioX >= CHILD_SIDE_RATIO_X_RIGHT;
  const edge = isChildExpansionSide ? CHILD_SIDE_EDGE_RATIO : PARENT_SIDE_EDGE_RATIO;

  if (ratioY < edge) return 'before';
  if (ratioY > 1 - edge) return 'after';
  return 'inside';
}

/** ドロップ確定時の位置。Alt を押していて対象がルート以外なら、「中へ」ではなく「後ろ」に並べる */
export function resolveDropPosition(position: DropPosition | null, isAlt: boolean, isRoot: boolean): DropPosition {
  const finalPosition = position || 'inside';
  if (isAlt && !isRoot && finalPosition === 'inside') return 'after';
  return finalPosition;
}

/** ルートの左右を分ける横位置 */
const ROOT_SIDE_SPLIT_RATIO = 0.5;

/** 放射状のマップで、ルートにドロップするときに入る側（左半分なら左、右半分なら右）。放射状以外・ルート以外は undefined */
export function computeRootDropSide({
  ratioX,
  isRoot,
  layoutType,
}: {
  ratioX: number;
  isRoot: boolean;
  layoutType: LayoutType;
}): Side | undefined {
  if (!isRoot || layoutType !== 'mindmap') return undefined;
  return ratioX < ROOT_SIDE_SPLIT_RATIO ? 'left' : 'right';
}
