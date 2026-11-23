/** Undo/Redo 履歴のスナップショットスタック（純粋関数・イミュータブル） */
export const UNDO_HISTORY_LIMIT = 100;

export interface History<T> {
  past: T[];
  present: T;
  future: T[];
}

export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [] };
}

export function pushHistory<T>(h: History<T>, next: T, limit = UNDO_HISTORY_LIMIT): History<T> {
  if (next === h.present) return h;
  const past = [...h.past, h.present];
  if (past.length > limit) past.splice(0, past.length - limit);
  return { past, present: next, future: [] };
}

/** 直前の履歴ステップに統合する（present を置き換え、past は積まない） */
export function replaceHistory<T>(h: History<T>, next: T): History<T> {
  if (next === h.present) return h;
  return { past: h.past, present: next, future: [] };
}

/**
 * present が expected と一致する場合、直前のステップを取り消して履歴からも消す（redo 不可）。
 * 一致しない・past が空の場合は fallback を通常どおり push する。
 */
export function discardHistory<T>(h: History<T>, expected: T, fallback: T): History<T> {
  if (h.present === expected && h.past.length > 0) {
    return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [] };
  }
  return pushHistory(h, fallback);
}

export function undoHistory<T>(h: History<T>): History<T> {
  if (h.past.length === 0) return h;
  return {
    past: h.past.slice(0, -1),
    present: h.past[h.past.length - 1],
    future: [h.present, ...h.future],
  };
}

export function redoHistory<T>(h: History<T>): History<T> {
  if (h.future.length === 0) return h;
  return {
    past: [...h.past, h.present],
    present: h.future[0],
    future: h.future.slice(1),
  };
}
