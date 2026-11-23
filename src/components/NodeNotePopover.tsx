import { t } from '../i18n';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getNotePopoverPosition } from '../utils/notePopoverPosition';

/** 印に乗せてから出すまで、離れてから消すまでの時間（ms）。離れてすぐに消さないのは、表示の上へマウスを移せるようにするため */
const SHOW_DELAY = 100;
const HIDE_DELAY = 150;

interface NodeNotePopoverProps {
  note: string;
  anchor: DOMRect;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onDismiss: () => void;
}

/**
 * メモの表示。ノードには拡大率の transform がかかっているので、ポータルでノードの外に描画し、画面に固定して置く。
 * 長いメモは、決まった幅で折り返し、決まった高さを超える分はスクロールで読む
 */
const NodeNotePopover: React.FC<NodeNotePopoverProps> = ({ note, anchor, onPointerEnter, onPointerLeave, onDismiss }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  // 描画したあとに大きさを測って位置を決める（測るまでは見せない）
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setPosition(
      getNotePopoverPosition(
        anchor,
        { width: el.offsetWidth, height: el.offsetHeight },
        { width: window.innerWidth, height: window.innerHeight }
      )
    );
  }, [anchor, note]);

  // 表示の外でマウスを押したとき、ホイールを回したときは消す（キャンバスが動いて位置がずれるため）
  useEffect(() => {
    const dismissOutside = (e: Event) => {
      if (e.target instanceof Node && ref.current?.contains(e.target)) return;
      onDismiss();
    };
    window.addEventListener('mousedown', dismissOutside, true);
    window.addEventListener('wheel', dismissOutside, true);
    return () => {
      window.removeEventListener('mousedown', dismissOutside, true);
      window.removeEventListener('wheel', dismissOutside, true);
    };
  }, [onDismiss]);

  // ポータルでも React のイベントはノードとキャンバスに伝わるため、選択・編集の開始・パン・ズームを止める
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return createPortal(
    <div
      ref={ref}
      role="tooltip"
      style={{ left: position?.left ?? 0, top: position?.top ?? 0, visibility: position ? 'visible' : 'hidden' }}
      className="fixed z-50 max-w-[320px] max-h-[240px] overflow-y-auto px-3 py-2 bg-surface text-ink border border-line rounded-panel shadow-float text-ui-body leading-relaxed whitespace-pre-wrap break-words select-text cursor-default"
      onMouseEnter={onPointerEnter}
      onMouseLeave={onPointerLeave}
      onClick={stop}
      onDoubleClick={stop}
      onMouseDown={stop}
      onMouseUp={stop}
      onWheel={stop}
      onContextMenu={stop}
    >
      {note}
    </div>,
    // dark: のスタイルは #mindflow-app-root の .dark に連動するため、その中に描画する（ここには transform がない）
    document.getElementById('mindflow-app-root') ?? document.body
  );
};

interface NoteIndicatorProps {
  note: string;
  onOpen: () => void;
  children: React.ReactNode;
}

/** メモの印。マウスを乗せるとメモの全文が出て、クリックするとプロパティバーのメモ欄が開く */
export const NoteIndicator: React.FC<NoteIndicatorProps> = ({ note, onOpen, children }) => {
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const timerRef = useRef<number | undefined>(undefined);

  const clearTimer = () => window.clearTimeout(timerRef.current);
  useEffect(() => clearTimer, []);

  const show = useCallback(() => {
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (rect) setAnchor(rect);
    }, SHOW_DELAY);
  }, []);
  const keep = useCallback(() => clearTimer(), []);
  const hide = useCallback(() => {
    clearTimer();
    timerRef.current = window.setTimeout(() => setAnchor(null), HIDE_DELAY);
  }, []);
  const dismiss = useCallback(() => {
    clearTimer();
    setAnchor(null);
  }, []);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpen();
        }}
        onMouseEnter={show}
        onMouseLeave={hide}
        className="text-current opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
        aria-label={t('note.open')}
      >
        {children}
      </button>
      {anchor && (
        <NodeNotePopover note={note} anchor={anchor} onPointerEnter={keep} onPointerLeave={hide} onDismiss={dismiss} />
      )}
    </>
  );
};
