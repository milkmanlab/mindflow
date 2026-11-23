import { t } from '../i18n';
import React, { useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { MindNode } from '../types';
import { imageProps, resizeImageWidth, resolveImageBox, roundAspect } from '../utils/imageBox';

interface NodeImageProps {
  nodeId: string;
  image: string;
  text: string;
  imageWidth?: number;
  imageAspect?: number;
  /** 子が伸びる側。つまみは、その反対側の下の角に出す（離したあとに画像が動かないように） */
  side: 'left' | 'right';
  /** つまみを出すか（ノードを 1 つだけ選んでいて、編集中でないとき） */
  canResize: boolean;
  onUpdateProps?: (nodeId: string, partial: Partial<MindNode>) => void;
}

/** つまみのドラッグの途中の状態。ドラッグ中はマップを書き換えず、離したときに 1 回だけ保存する */
interface ResizeDrag {
  pointerX: number;
  startWidth: number;
  scale: number;
  aspect: number;
  width: number;
}

const HANDLE_CLASS =
  'absolute -bottom-1.5 w-2.5 h-2.5 rounded-control bg-accent border border-white dark:border-slate-900 touch-none';

/**
 * ノード内の画像。全体を縦横比のまま出し、選択中は角のつまみで表示の幅を変えられる（ホバーで削除ボタン）。
 * 大きさは resolveImageBox が決める（レイアウトの見積もり・書き出しと同じ決まり）
 */
export const NodeImage: React.FC<NodeImageProps> = ({
  nodeId,
  image,
  text,
  imageWidth,
  imageAspect,
  side,
  canResize,
  onUpdateProps,
}) => {
  const box = resolveImageBox({ image, imageWidth, imageAspect });
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<ResizeDrag | null>(null);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  if (!box) return null;

  // つまみは、子が伸びる側と反対の角に出す。右の角なら右へ、左の角なら左へ動かすと大きくなる
  const handleOnRight = side !== 'left';
  const direction = handleOnRight ? 1 : -1;
  const isDragging = dragWidth !== null;
  const dragAspect = dragRef.current?.aspect;
  const visualStyle: React.CSSProperties =
    isDragging && dragAspect
      ? { width: dragWidth, height: Math.max(1, Math.round(dragWidth / dragAspect)) }
      : { width: '100%', height: '100%' };

  // ドラッグ中は、つまみも画像の角（マウスの位置）について動かす
  const handleStyle: React.CSSProperties | undefined =
    isDragging && dragAspect && dragWidth !== null
      ? {
          top: Math.round(dragWidth / dragAspect) - 4,
          bottom: 'auto',
          ...(handleOnRight ? { left: dragWidth - 4, right: 'auto' } : { right: dragWidth - 4, left: 'auto' }),
        }
      : undefined;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const frame = frameRef.current;
    const img = imageRef.current;
    // 読み込めていない画像では、縦横比が分からないので何もしない
    if (!frame || !img || !img.naturalWidth || !img.naturalHeight) return;
    const aspect = imageAspect && imageAspect > 0 ? imageAspect : img.naturalWidth / img.naturalHeight;
    // 画面上の大きさ ÷ レイアウト上の大きさ = キャンバスの拡大率
    const scale = frame.offsetWidth > 0 ? frame.getBoundingClientRect().width / frame.offsetWidth : 1;
    dragRef.current = { pointerX: e.clientX, startWidth: frame.offsetWidth, scale, aspect, width: frame.offsetWidth };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragWidth(frame.offsetWidth);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    drag.width = resizeImageWidth(drag.startWidth, e.clientX - drag.pointerX, drag.scale, drag.aspect, direction);
    setDragWidth(drag.width);
  };

  const finishDrag = (commit: boolean) => {
    const drag = dragRef.current;
    dragRef.current = null;
    setDragWidth(null);
    if (!commit || !drag || drag.width === drag.startWidth) return;
    // 縦横比は、保存してあればそのまま、なければここで保存する
    const aspect = imageAspect && imageAspect > 0 ? imageAspect : roundAspect({ width: drag.aspect, height: 1 });
    onUpdateProps?.(nodeId, { imageWidth: drag.width, imageAspect: aspect });
  };

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <div
      ref={frameRef}
      className="relative group/node-img mb-1.5 shrink-0 mx-auto"
      style={{ width: box.width ?? '100%', height: box.height }}
    >
      {/* 画像の枠。ドラッグ中は、反対側の角を基準に、マウスに合わせた大きさで重ねて描く */}
      <div
        style={visualStyle}
        className={`absolute top-0 ${
          handleOnRight ? 'left-0' : 'right-0'
        } overflow-hidden rounded-control bg-black/5 dark:bg-white/5 border border-slate-200/60 dark:border-slate-700/60 ${
          isDragging ? 'z-10 shadow-float' : ''
        }`}
      >
        <img ref={imageRef} src={image} alt={text || t('image.alt')} draggable={false} className="w-full h-full object-contain" />
      </div>

      {!isDragging && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUpdateProps?.(nodeId, imageProps(undefined));
          }}
          className="absolute top-1 right-1 opacity-0 group-hover/node-img:opacity-100 bg-slate-900/80 hover:bg-rose-600 text-white p-1 rounded-full transition-opacity cursor-pointer"
          title={t('panel.imageClear')}
          aria-label={t('panel.imageClear')}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}

      {canResize && (
        <div
          title={t('image.resizeTitle')}
          aria-label={t('image.resizeLabel')}
          draggable
          className={`${HANDLE_CLASS} z-20 ${handleOnRight ? '-right-1.5 cursor-nwse-resize' : '-left-1.5 cursor-nesw-resize'}`}
          style={handleStyle}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={() => finishDrag(true)}
          onPointerCancel={() => finishDrag(false)}
          // 親のノードの移動（ドラッグ＆ドロップ）・編集の開始・パンを起こさない
          onDragStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={stop}
          onDoubleClick={stop}
        />
      )}
    </div>
  );
};
