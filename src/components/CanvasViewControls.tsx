import { t } from '../i18n';
import React, { useState } from 'react';
import { LayoutResult } from '../types';
import { Point, Size } from '../utils/canvasGeometry';
import { Minimap } from './Minimap';
import { FloatingBar } from './FloatingBar';
import { IconButton } from './IconButton';
import { ZoomIn, ZoomOut, Maximize2, Crosshair, Keyboard, Map, UnfoldHorizontal, FoldHorizontal } from 'lucide-react';

interface CanvasViewControlsProps {
  layout: LayoutResult;
  pan: Point;
  zoom: number;
  viewportSize: Size;
  selectedNodeId: string | null;
  onNavigateTo: (x: number, y: number) => void;
  onFitToScreen: () => void;
  onCenterRoot: () => void;
  onResetZoom: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  onOpenShortcutsModal: () => void;
}

const Divider: React.FC = () => <span className="w-px h-4 bg-surface-strong mx-0.5" />;

/** 画面右下のビューツールバーと、その上に開くミニマップ */
export const CanvasViewControls: React.FC<CanvasViewControlsProps> = ({
  layout,
  pan,
  zoom,
  viewportSize,
  selectedNodeId,
  onNavigateTo,
  onFitToScreen,
  onCenterRoot,
  onResetZoom,
  onZoomIn,
  onZoomOut,
  onExpandAll,
  onCollapseAll,
  onOpenShortcutsModal,
}) => {
  const [isMinimapOpen, setIsMinimapOpen] = useState(false);

  return (
    <div className="fixed right-6 bottom-6 z-30 flex flex-col items-end gap-2.5">
      {/* ミニマップ（開いているときはツールバーの真上に出す） */}
      {isMinimapOpen && (
        <Minimap
          layout={layout}
          pan={pan}
          zoom={zoom}
          viewportSize={viewportSize}
          selectedNodeId={selectedNodeId}
          onNavigateTo={onNavigateTo}
          onToggle={() => setIsMinimapOpen(false)}
        />
      )}

      <FloatingBar id="view-toolbar">
        <IconButton
          id="btn-minimap-toggle"
          active={isMinimapOpen}
          onClick={() => setIsMinimapOpen((prev) => !prev)}
          title={isMinimapOpen ? t('canvas.minimapClose') : t('canvas.minimapOpen')}
        >
          <Map className="w-4 h-4" />
        </IconButton>

        <Divider />

        <IconButton id="btn-zoom-out" onClick={onZoomOut} title={t('canvas.zoomOut')}>
          <ZoomOut className="w-4 h-4" />
        </IconButton>

        <button
          id="btn-zoom-reset"
          onClick={onResetZoom}
          className="h-8 px-2 text-ui-body text-ink hover:bg-surface-muted rounded-control transition-colors min-w-[48px] text-center"
          title={t('canvas.zoomReset')}
        >
          {Math.round(zoom * 100)}%
        </button>

        <IconButton id="btn-zoom-in" onClick={onZoomIn} title={t('canvas.zoomIn')}>
          <ZoomIn className="w-4 h-4" />
        </IconButton>

        <Divider />

        <IconButton id="btn-fit-screen" onClick={onFitToScreen} title={t('canvas.fit')}>
          <Maximize2 className="w-4 h-4" />
        </IconButton>

        <IconButton id="btn-center-root" onClick={onCenterRoot} title={t('canvas.centerRoot')}>
          <Crosshair className="w-4 h-4" />
        </IconButton>

        {(onExpandAll || onCollapseAll) && (
          <>
            <Divider />
            {onExpandAll && (
              <IconButton id="btn-expand-all" onClick={onExpandAll} title={t('canvas.expandAll')}>
                <UnfoldHorizontal className="w-4 h-4" />
              </IconButton>
            )}
            {onCollapseAll && (
              <IconButton id="btn-collapse-all" onClick={onCollapseAll} title={t('canvas.collapseAll')}>
                <FoldHorizontal className="w-4 h-4" />
              </IconButton>
            )}
          </>
        )}

        <Divider />

        <IconButton id="btn-shortcuts-help" onClick={onOpenShortcutsModal} title={t('canvas.shortcuts')}>
          <Keyboard className="w-4 h-4" />
        </IconButton>
      </FloatingBar>
    </div>
  );
};
