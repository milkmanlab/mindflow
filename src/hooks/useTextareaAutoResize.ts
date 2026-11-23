import React, { useState, useCallback } from 'react';

interface UseTextareaAutoResizeParams {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  /** 1 行の高さ（px）。layout.ts の getNodeLineHeight と同じ値 */
  lineHeight: number;
}

/** ノードの編集欄の高さを行数に合わせ、文字が横にはみ出したら幅を足す */
export function useTextareaAutoResize({ textareaRef, lineHeight }: UseTextareaAutoResizeParams) {
  // 編集欄が実際にはみ出したときに足す幅（幅の推定がずれたときの安全策）
  const [overflowBoost, setOverflowBoost] = useState(0);

  const resetOverflowBoost = useCallback(() => setOverflowBoost(0), []);

  /** ブラウザの横スクロールで、テキストの先頭が左端に隠れないようにする */
  const resetScrollLeft = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea && textarea.scrollLeft !== 0) {
      textarea.scrollLeft = 0;
    }
  }, [textareaRef]);

  const autoResize = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const lines = (textarea.value || '').split('\n').length;
    const expectedHeight = Math.max(1, lines) * lineHeight;
    textarea.style.height = 'auto';
    const actualScrollHeight = textarea.scrollHeight;
    // 1 行のときは、表示中のテキストと同じ高さに合わせる（編集を始めたときに高さが揺れないように）
    const finalHeight = lines === 1 ? expectedHeight : Math.max(expectedHeight, actualScrollHeight);
    textarea.style.height = `${finalHeight}px`;
    const overflow = textarea.scrollWidth - textarea.clientWidth;
    if (overflow > 0) {
      setOverflowBoost((prev) => prev + overflow);
    }
    resetScrollLeft();
  };

  return { autoResize, overflowBoost, resetOverflowBoost, resetScrollLeft };
}
