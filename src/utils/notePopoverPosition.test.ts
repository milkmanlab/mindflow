import { describe, expect, it } from 'vitest';
import { getNotePopoverPosition } from './notePopoverPosition';

const viewport = { width: 1000, height: 800 };
const popover = { width: 300, height: 100 };
const anchorAt = (left: number, top: number) => ({ left, top, right: left + 14, bottom: top + 14 });

describe('getNotePopoverPosition', () => {
  it('既定は、印の下に、左端をそろえて出すこと', () => {
    expect(getNotePopoverPosition(anchorAt(200, 300), popover, viewport)).toEqual({ left: 200, top: 320 });
  });

  it('下に入らないときは、印の上に出すこと', () => {
    expect(getNotePopoverPosition(anchorAt(200, 720), popover, viewport)).toEqual({ left: 200, top: 720 - 6 - 100 });
  });

  it('右にはみ出すときは、画面の右端から 8px の内側に収めること', () => {
    expect(getNotePopoverPosition(anchorAt(900, 300), popover, viewport).left).toBe(1000 - 8 - 300);
  });

  it('左にはみ出すときは、画面の左端から 8px の内側に収めること', () => {
    expect(getNotePopoverPosition(anchorAt(-50, 300), popover, viewport).left).toBe(8);
  });

  it('上にも下にも入らないときは、画面の内側に収めること', () => {
    const tall = { width: 300, height: 780 };
    const pos = getNotePopoverPosition(anchorAt(200, 400), tall, viewport);
    expect(pos.top).toBe(8 + 4); // 800 - 8 - 780
    expect(pos.top).toBeGreaterThanOrEqual(8);
  });
});
