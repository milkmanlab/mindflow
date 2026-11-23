import React, { useState, useEffect, useCallback } from 'react';
import { PositionedNode } from '../types';
import {
  Point,
  RUBBER_BAND_MIN_DRAG,
  Size,
  findNodesInRect,
  rectFromPoints,
  screenToWorld,
} from '../utils/canvasGeometry';

interface UseCanvasPointerParams {
  containerRef: React.RefObject<HTMLDivElement | null>;
  pan: Point;
  zoom: number;
  viewportSize: Size;
  setPan: (pan: Point) => void;
  nodes: PositionedNode[];
  enableRightClickPan: boolean;
  onSelectNodes?: (nodeIds: string[]) => void;
}

/** 画面座標での範囲選択の始点と現在位置 */
interface RubberBand {
  start: Point;
  current: Point;
}

/** mousedown がノードの上で起きたか（ノードの要素は id が node- で始まる） */
function isOnNode(target: EventTarget | null): boolean {
  return !!(target as HTMLElement | null)?.closest?.('[id^="node-"]');
}

/** 背景ドラッグでのパンと、Shift+ドラッグでの範囲選択 */
export function useCanvasPointer({
  containerRef,
  pan,
  zoom,
  viewportSize,
  setPan,
  nodes,
  enableRightClickPan,
  onSelectNodes,
}: UseCanvasPointerParams) {
  const [isPanning, setIsPanning] = useState(false);
  // パン開始時の「マウス位置 - パン」。移動中はマウス位置からこれを引いてパンを求める
  const [startPan, setStartPan] = useState<Point>({ x: 0, y: 0 });
  const [rubberBand, setRubberBand] = useState<RubberBand | null>(null);

  const stopPanning = useCallback(() => setIsPanning(false), []);

  // コンテナの外でボタンを離したときやドラッグが終わったときにも、確実にパンを止める
  useEffect(() => {
    window.addEventListener('mouseup', stopPanning);
    window.addEventListener('dragend', stopPanning);
    return () => {
      window.removeEventListener('mouseup', stopPanning);
      window.removeEventListener('dragend', stopPanning);
    };
  }, [stopPanning]);

  const startPanning = (e: React.MouseEvent) => {
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const onNode = isOnNode(e.target);

    // 背景での Shift+左クリックで範囲選択を始める
    if (e.shiftKey && e.button === 0 && !onNode) {
      e.preventDefault();
      const p = { x: e.clientX, y: e.clientY };
      setRubberBand({ start: p, current: p });
      return;
    }
    // 右ドラッグは、有効ならノードの上からでもパンする
    if (e.button === 2 && enableRightClickPan) {
      startPanning(e);
      return;
    }
    // 左・中ボタンは背景のときだけパンする
    if ((e.button === 0 || e.button === 1) && !onNode) {
      startPanning(e);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (enableRightClickPan) {
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (rubberBand) {
      setRubberBand({ ...rubberBand, current: { x: e.clientX, y: e.clientY } });
      return;
    }
    if (isPanning) {
      setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
    }
  };

  const finishRubberBand = (band: RubberBand) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const screen = rectFromPoints(band.start, band.current);
    if (screen.maxX - screen.minX <= RUBBER_BAND_MIN_DRAG && screen.maxY - screen.minY <= RUBBER_BAND_MIN_DRAG) {
      return;
    }
    const vp = { pan, zoom, size: viewportSize };
    const min = screenToWorld({ x: screen.minX - rect.left, y: screen.minY - rect.top }, vp);
    const max = screenToWorld({ x: screen.maxX - rect.left, y: screen.maxY - rect.top }, vp);
    const selected = findNodesInRect(nodes, { minX: min.x, minY: min.y, maxX: max.x, maxY: max.y });
    if (selected.length > 0) {
      onSelectNodes?.(selected);
    }
  };

  const handleMouseUp = () => {
    if (rubberBand) {
      setRubberBand(null);
      finishRubberBand(rubberBand);
      return;
    }
    setIsPanning(false);
  };

  /** 範囲選択の枠の、コンテナ基準の位置と大きさ（描画用） */
  const rubberBandBox =
    rubberBand && containerRef.current
      ? (() => {
          const rect = containerRef.current.getBoundingClientRect();
          const r = rectFromPoints(rubberBand.start, rubberBand.current);
          return { left: r.minX - rect.left, top: r.minY - rect.top, width: r.maxX - r.minX, height: r.maxY - r.minY };
        })()
      : null;

  return {
    isPanning,
    stopPanning,
    rubberBandBox,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleContextMenu,
  };
}
