import { describe, it, expect } from 'vitest';
import { assignRootChildSides, nextRootChildSide } from './rootSide';

describe('nextRootChildSide', () => {
  it('1〜5 本目は右、6〜10 本目は左、そのあとは右・左の交互になること', () => {
    let right = 0;
    let left = 0;
    const sides: string[] = [];
    for (let i = 0; i < 14; i++) {
      const side = nextRootChildSide(right, left);
      sides.push(side);
      if (side === 'right') right++;
      else left++;
    }
    expect(sides.join(' ')).toBe(
      'right right right right right left left left left left right left right left'
    );
  });

  it('右が多いときは左、左が多いときは右になること', () => {
    expect(nextRootChildSide(8, 0)).toBe('left');
    expect(nextRootChildSide(0, 3)).toBe('right');
    expect(nextRootChildSide(3, 3)).toBe('right');
    expect(nextRootChildSide(6, 5)).toBe('left');
  });
});

describe('assignRootChildSides', () => {
  it('side のない 7 本は、右 5・左 2 になること', () => {
    expect(assignRootChildSides(Array.from({ length: 7 }, () => ({}))).join(' ')).toBe(
      'right right right right right left left'
    );
  });

  it('side を持つ子は変えず、持たない子はそれまでの数から決めること', () => {
    expect(assignRootChildSides([{ side: 'left' }, {}, { side: 'left' }, {}])).toEqual(['left', 'right', 'left', 'right']);
  });
});
