export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Size {
  width: number;
  height: number;
}

/** 表示と印の間隔、画面の端からの余白（px） */
export const NOTE_POPOVER_GAP = 6;
export const NOTE_POPOVER_MARGIN = 8;

/**
 * メモの表示の左上の位置を決める。
 * 既定は印の下で、左端を印の左端に合わせる。下に入らないときは印の上に出し、左右は画面の端から余白の内側に収める
 */
export function getNotePopoverPosition(anchor: Rect, popover: Size, viewport: Size): { left: number; top: number } {
  const below = anchor.bottom + NOTE_POPOVER_GAP;
  const above = anchor.top - NOTE_POPOVER_GAP - popover.height;
  const fitsBelow = below + popover.height <= viewport.height - NOTE_POPOVER_MARGIN;
  const fitsAbove = above >= NOTE_POPOVER_MARGIN;
  // どちらにも入らないときは、広いほうに寄せて、画面の端に収める
  const top = fitsBelow || !fitsAbove ? below : above;

  const maxLeft = viewport.width - NOTE_POPOVER_MARGIN - popover.width;
  const maxTop = viewport.height - NOTE_POPOVER_MARGIN - popover.height;
  return {
    left: Math.max(NOTE_POPOVER_MARGIN, Math.min(anchor.left, maxLeft)),
    top: Math.max(NOTE_POPOVER_MARGIN, Math.min(top, maxTop)),
  };
}
