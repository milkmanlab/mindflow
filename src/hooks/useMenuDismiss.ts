import React, { useEffect } from 'react';

/**
 * 開いているメニューを、外側のクリックと Esc で閉じる。
 * onClose は描画のたびに作り直さないこと（useCallback で包む）。作り直すと、そのたびにリスナーを登録し直す
 */
export function useMenuDismiss(
  isOpen: boolean,
  /** メニューと、それを開くボタンを囲む要素。この中のクリックでは閉じない */
  containerRef: React.RefObject<HTMLElement | null>,
  onClose: () => void
) {
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // window まで届くと、キャンバスの Esc（親ノードへ移動・選択の解除）も一緒に動いてしまう
      e.stopPropagation();
      onClose();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, containerRef, onClose]);
}
