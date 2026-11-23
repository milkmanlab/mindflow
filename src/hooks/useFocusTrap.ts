import { RefObject, useEffect } from 'react';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Tab / Shift+Tab で次にフォーカスする位置。端まで来たら反対側に回る。
 * @param current 今のフォーカスの位置。範囲の外（ダイアログの外にフォーカスがある）なら -1
 */
export function getNextFocusIndex(count: number, current: number, backward: boolean): number {
  if (count <= 0) return -1;
  if (current < 0 || current >= count) return backward ? count - 1 : 0;
  return backward ? (current - 1 + count) % count : (current + 1) % count;
}

/**
 * ダイアログを開いている間、フォーカスを中に閉じ込める。
 * 開いたら中の最初の要素へフォーカスを移し、Tab / Shift+Tab は中だけを回る。閉じたら、開く前の要素にフォーカスを戻す
 */
export function useFocusTrap(isOpen: boolean, containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!isOpen) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusables = () => Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    focusables()[0]?.focus({ preventScroll: true });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const next = getNextFocusIndex(items.length, items.indexOf(document.activeElement as HTMLElement), e.shiftKey);
      e.preventDefault();
      items[next]?.focus({ preventScroll: true });
    };
    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [isOpen, containerRef]);
}
