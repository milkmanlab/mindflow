import React, { useState, useEffect, useCallback } from 'react';
import { LayoutResult } from '../types';
import {
  DEFAULT_VIEWPORT_SIZE,
  Point,
  Size,
  ZOOM_BUTTON_STEP,
  computeAutoPan,
  computeFitView,
  zoomAtPoint,
  zoomByStep,
} from '../utils/canvasGeometry';

interface UseCanvasViewportParams {
  containerRef: React.RefObject<HTMLDivElement | null>;
  layout: LayoutResult;
  mapId: string;
  selectedNodeId: string | null;
}

/** キャンバスのパン・ズーム・ビューポートの大きさと、それを動かす操作 */
export function useCanvasViewport({ containerRef, layout, mapId, selectedNodeId }: UseCanvasViewportParams) {
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [viewportSize, setViewportSize] = useState<Size>(DEFAULT_VIEWPORT_SIZE);

  // コンテナの大きさを計測する
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setViewportSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [containerRef]);

  /** ワールド座標 (x, y) を画面の中心に置く。newZoom を渡すとズームも変える */
  const centerOnNode = useCallback(
    (targetX: number, targetY: number, newZoom?: number) => {
      const currentZoom = newZoom !== undefined ? newZoom : zoom;
      setPan({ x: -targetX * currentZoom, y: -targetY * currentZoom });
      if (newZoom !== undefined) {
        setZoom(newZoom);
      }
    },
    [zoom]
  );

  /** ルートを中心に、ズーム 100% に戻す */
  const centerRoot = useCallback(() => {
    centerOnNode(0, 0, 1);
  }, [centerOnNode]);

  const fitToScreen = useCallback(() => {
    const fit = computeFitView(layout.bounds, viewportSize);
    if (!fit) return;
    centerOnNode(fit.center.x, fit.center.y, fit.zoom);
  }, [layout.bounds, viewportSize, centerOnNode]);

  // ボタンでの拡大・縮小は、画面の中心にある場所を保つ（ズームだけ変えると、動かないのがルートの位置になる）
  const zoomByButton = useCallback(
    (step: number) => {
      const next = zoomByStep({ pan, zoom, size: viewportSize }, step);
      setZoom(next.zoom);
      setPan(next.pan);
    },
    [pan, zoom, viewportSize]
  );
  const zoomIn = useCallback(() => zoomByButton(ZOOM_BUTTON_STEP), [zoomByButton]);
  const zoomOut = useCallback(() => zoomByButton(-ZOOM_BUTTON_STEP), [zoomByButton]);

  // マップが切り替わったときだけ中央に戻す。centerRoot はズームが変わるたびに作り直されるため、依存配列に入れない
  useEffect(() => {
    centerRoot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapId]);

  // 選択ノードが画面の端に近づいたら、見える位置までパンする。
  // pan を依存配列に入れると、ユーザーがパンするたびに選択ノードへ引き戻されるため、わざと外している。
  // zoom も外している。拡大・縮小のたびに引き戻すと、見ている場所ではなく選択ノードを中心にズームしているように動くため
  useEffect(() => {
    if (!selectedNodeId || !containerRef.current) return;
    const node = layout.nodeMap.get(selectedNodeId);
    if (!node) return;
    const nextPan = computeAutoPan({ x: node.x, y: node.y }, { pan, zoom, size: viewportSize });
    if (nextPan) {
      setPan(nextPan);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId, layout, viewportSize]);

  // ホイールでのズーム（マウス位置を中心に拡大・縮小する）
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouse = {
      x: e.clientX - rect.left - viewportSize.width / 2,
      y: e.clientY - rect.top - viewportSize.height / 2,
    };
    const next = zoomAtPoint({ pan, zoom, size: viewportSize }, mouse, e.deltaY);
    setZoom(next.zoom);
    setPan(next.pan);
  };

  return {
    pan,
    setPan,
    zoom,
    viewportSize,
    centerOnNode,
    centerRoot,
    fitToScreen,
    zoomIn,
    zoomOut,
    handleWheel,
  };
}
