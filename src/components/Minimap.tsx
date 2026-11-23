import { t } from '../i18n';
import React, { useRef } from 'react';
import { LayoutResult } from '../types';
import { Point, Size } from '../utils/canvasGeometry';
import {
  MINIMAP_HEIGHT,
  MINIMAP_WIDTH,
  MinimapRect,
  createMinimapTransform,
  getMinimapNodeRect,
  getMinimapSelectionRect,
  getMinimapViewportRect,
  minimapToWorld,
} from '../utils/minimapGeometry';
import { CloseButton } from './PropertiesBarParts';

interface MinimapProps {
  layout: LayoutResult;
  pan: Point;
  zoom: number;
  viewportSize: Size;
  selectedNodeId: string | null;
  onNavigateTo: (x: number, y: number) => void;
  onToggle: () => void;
}

const rectStyle = (rect: MinimapRect): React.CSSProperties => ({
  left: `${rect.left}px`,
  top: `${rect.top}px`,
  width: `${rect.width}px`,
  height: `${rect.height}px`,
});

/** マップ全体の縮小表示。開いているあいだだけ、親（CanvasViewControls）が描画する */
export const Minimap: React.FC<MinimapProps> = ({
  layout,
  pan,
  zoom,
  viewportSize,
  selectedNodeId,
  onNavigateTo,
  onToggle,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const transform = createMinimapTransform(layout.bounds);
  const selectedNode = selectedNodeId ? layout.nodeMap.get(selectedNodeId) : null;

  /** クリック・ドラッグした位置を、画面の中心にする */
  const navigateToEvent = (clientX: number, clientY: number) => {
    if (!mapContainerRef.current) return;
    const rect = mapContainerRef.current.getBoundingClientRect();
    const target = minimapToWorld({ x: clientX - rect.left, y: clientY - rect.top }, transform);
    onNavigateTo(target.x, target.y);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    navigateToEvent(e.clientX, e.clientY);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (isDraggingRef.current) {
        navigateToEvent(moveEvent.clientX, moveEvent.clientY);
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="relative bg-surface rounded-panel shadow-float border border-line p-2.5 overflow-hidden flex flex-col gap-2 select-none">
      {/* 見出し */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-accent" />
          <span className="text-ui-caption text-ink">{t('minimap.title')}</span>
        </div>
        <CloseButton title={t('canvas.minimapClose')} onClick={onToggle} />
      </div>

      {/* 縮小表示 */}
      <div
        ref={mapContainerRef}
        onMouseDown={handleMouseDown}
        style={{ width: `${MINIMAP_WIDTH}px`, height: `${MINIMAP_HEIGHT}px` }}
        className="relative bg-surface-muted/90 rounded-control overflow-hidden cursor-crosshair border border-line/60"
      >
        {layout.nodes.map((n) => (
          <div
            key={n.id}
            style={{
              ...rectStyle(getMinimapNodeRect(n, transform)),
              backgroundColor: n.depth === 0 ? 'var(--mf-accent)' : n.branchColor || 'var(--mf-ink-muted)',
            }}
            className="absolute rounded-[1px] opacity-75 pointer-events-none"
          />
        ))}

        {/* 選択中のノードの印 */}
        {selectedNode && (
          <div
            style={rectStyle(getMinimapSelectionRect(selectedNode, transform))}
            className="absolute rounded-full border-2 border-accent bg-accent/20 pointer-events-none"
          />
        )}

        {/* いま画面に映っている範囲 */}
        <div
          style={rectStyle(getMinimapViewportRect({ pan, zoom, size: viewportSize }, transform))}
          className="absolute border-2 border-accent bg-accent/20 rounded-control pointer-events-none"
        />
      </div>
    </div>
  );
};
