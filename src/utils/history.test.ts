import { describe, it, expect } from 'vitest';
import {
  createHistory,
  pushHistory,
  undoHistory,
  redoHistory,
  replaceHistory,
  discardHistory,
} from './history';

describe('history', () => {
  it('push → undo → redo', () => {
    let h = createHistory('a');
    h = pushHistory(h, 'b');
    h = pushHistory(h, 'c');
    expect(h.present).toBe('c');
    h = undoHistory(h);
    expect(h.present).toBe('b');
    h = undoHistory(h);
    expect(h.present).toBe('a');
    expect(undoHistory(h)).toBe(h);
    h = redoHistory(h);
    expect(h.present).toBe('b');
    h = redoHistory(h);
    expect(h.present).toBe('c');
    expect(redoHistory(h)).toBe(h);
  });

  it('push で future を破棄する', () => {
    let h = pushHistory(createHistory('a'), 'b');
    h = undoHistory(h);
    h = pushHistory(h, 'x');
    expect(h.future).toEqual([]);
    expect(h.present).toBe('x');
  });

  it('同一参照の push は無視する', () => {
    const h = createHistory('a');
    expect(pushHistory(h, 'a')).toBe(h);
  });

  it('replace は直前のステップに統合する', () => {
    let h = pushHistory(createHistory('a'), 'b');
    h = replaceHistory(h, 'b2');
    expect(h.present).toBe('b2');
    h = undoHistory(h);
    expect(h.present).toBe('a');
  });

  it('discard は直前のステップを履歴ごと取り消す', () => {
    let h = pushHistory(createHistory('a'), 'b');
    h = discardHistory(h, 'b', 'fallback');
    expect(h).toEqual({ past: [], present: 'a', future: [] });
  });

  it('discard は present が想定と異なれば fallback を push する', () => {
    let h = pushHistory(createHistory('a'), 'b');
    h = discardHistory(h, 'other', 'c');
    expect(h.present).toBe('c');
    expect(h.past).toEqual(['a', 'b']);
  });

  it('上限を超えた古い履歴を捨てる', () => {
    let h = createHistory(0);
    for (let i = 1; i <= 5; i++) h = pushHistory(h, i, 3);
    expect(h.past).toEqual([2, 3, 4]);
    expect(h.present).toBe(5);
  });
});
