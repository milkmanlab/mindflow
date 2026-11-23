import { describe, it, expect } from 'vitest';
import { getNextFocusIndex } from './useFocusTrap';

describe('getNextFocusIndex', () => {
  it('Tab は次へ、最後からは最初へ回ること', () => {
    expect(getNextFocusIndex(3, 0, false)).toBe(1);
    expect(getNextFocusIndex(3, 2, false)).toBe(0);
  });

  it('Shift+Tab は前へ、最初からは最後へ回ること', () => {
    expect(getNextFocusIndex(3, 2, true)).toBe(1);
    expect(getNextFocusIndex(3, 0, true)).toBe(2);
  });

  it('フォーカスが中にないときは、Tab で最初、Shift+Tab で最後へ入ること', () => {
    expect(getNextFocusIndex(3, -1, false)).toBe(0);
    expect(getNextFocusIndex(3, -1, true)).toBe(2);
  });

  it('要素が 1 つなら、そこに留まり、0 個なら -1 を返すこと', () => {
    expect(getNextFocusIndex(1, 0, false)).toBe(0);
    expect(getNextFocusIndex(1, 0, true)).toBe(0);
    expect(getNextFocusIndex(0, -1, false)).toBe(-1);
  });
});
