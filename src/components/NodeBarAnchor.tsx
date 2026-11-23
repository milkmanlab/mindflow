import React, { useLayoutEffect, useRef, useState } from 'react';
import type { Point, Size } from '../utils/canvasGeometry';
import { NODE_BAR_EDGE_MARGIN, barScaleForZoom, computeNodeBarPosition, nodeScreenRect } from '../utils/nodeBarPosition';

interface NodeBarAnchorProps {
  /** バーを付ける対象のワールド座標の矩形（最後に選んだノード、または関連線の中点では幅・高さ 0） */
  node: { x: number; y: number; width: number; height: number };
  pan: Point;
  zoom: number;
  viewportSize: Size;
  children: React.ReactNode;
}

/** キャンバスの操作（選択解除・パン・範囲選択・ズーム）が、バーの上で起きないようにする */
const stop = (e: React.SyntheticEvent) => e.stopPropagation();

/**
 * ノードのバーを、選択中のノードの上に置く。
 * バーの大きさは表示してから測る（パネルの開閉で高さが変わる）。測れるまでは見えないようにしておく
 */
export const NodeBarAnchor: React.FC<NodeBarAnchorProps> = ({ node, pan, zoom, viewportSize, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [barSize, setBarSize] = useState<Size | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const { offsetWidth: width, offsetHeight: height } = el;
      setBarSize((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // バーもノードと同じ向きに拡大・縮小する（読めなくなる範囲までは縮めない）。左下を基準に拡縮する
  const scale = barScaleForZoom(zoom);
  const position = barSize
    ? computeNodeBarPosition({
        node: nodeScreenRect(node, { pan, zoom, size: viewportSize }),
        bar: { width: barSize.width * scale, height: barSize.height * scale },
        viewport: viewportSize,
      })
    : null;
  // 画面の外にあるノードのバーは出さない（測るために、DOM には残す）
  const isVisible = position !== null;

  return (
    <div
      ref={ref}
      onMouseDown={stop}
      onClick={stop}
      onDoubleClick={stop}
      onContextMenu={stop}
      onWheel={stop}
      style={{
        position: 'absolute',
        left: position?.left ?? 0,
        top: position?.top ?? 0,
        // 幅は中身の大きさにする（右端に近いと、絶対配置の幅が縮んで測り間違えるため）
        width: 'max-content',
        maxWidth: Math.max((viewportSize.width - NODE_BAR_EDGE_MARGIN * 2) / scale, 0),
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        visibility: isVisible ? 'visible' : 'hidden',
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
      className="z-40"
    >
      {children}
    </div>
  );
};
