import React from 'react';

interface ImeProxyTextareaProps {
  ref: React.Ref<HTMLTextAreaElement>;
  onCompositionStart: () => void;
  onCompositionEnd: (e: React.CompositionEvent<HTMLTextAreaElement>) => void;
  onInput: (e: React.FormEvent<HTMLTextAreaElement>) => void;
}

/** 画面には見えないが、フォーカスと IME 入力を受け取れるようにする */
const PROXY_STYLE: React.CSSProperties = {
  position: 'fixed',
  left: 0,
  top: 0,
  zIndex: -1,
  opacity: 0,
  pointerEvents: 'none',
  resize: 'none',
  overflow: 'hidden',
  border: 'none',
  outline: 'none',
  padding: 0,
};

/**
 * IME 入力を受けるための透明な textarea（仕組みは useImeProxy を参照）。
 * data-ime-proxy は App の Undo/Redo 処理が、この要素を通常の入力欄と区別するのに使う。
 */
export const ImeProxyTextarea: React.FC<ImeProxyTextareaProps> = ({
  ref,
  onCompositionStart,
  onCompositionEnd,
  onInput,
}) => (
  <textarea
    ref={ref}
    data-ime-proxy="true"
    aria-hidden="true"
    tabIndex={-1}
    rows={1}
    onCompositionStart={onCompositionStart}
    onCompositionEnd={onCompositionEnd}
    onInput={onInput}
    onClick={(e) => e.stopPropagation()}
    onMouseDown={(e) => e.stopPropagation()}
    style={PROXY_STYLE}
  />
);
