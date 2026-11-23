import React, { useRef } from 'react';
import {
  MindMap,
  MindNode,
  LayoutResult,
  ThemeConfig,
  EditInputMode,
} from '../types';
import { buildFontFamilyCss, resolveFontStyle } from '../utils/fontStyles';
import { MindNodeComponent } from './MindNodeComponent';
import { RelationshipLayer } from './RelationshipLayer';
import { CanvasViewControls } from './CanvasViewControls';
import { ImeProxyTextarea } from './ImeProxyTextarea';
import { NodeBarAnchor } from './NodeBarAnchor';
import { computeRelationshipGeometry } from '../utils/relationshipGeometry';
import { DropPosition } from '../utils/treeOperations';
import { CONNECTION_WIDTH } from '../utils/connectionPath';
import { useCanvasViewport } from '../hooks/useCanvasViewport';
import { useCanvasPointer } from '../hooks/useCanvasPointer';
import { useNodeDragDrop } from '../hooks/useNodeDragDrop';
import { useImeProxy } from '../hooks/useImeProxy';
import { useCanvasKeyboard } from '../hooks/useCanvasKeyboard';
import { useEditEndHold } from '../hooks/useEditEndHold';

interface MindCanvasProps {
  mindMap: MindMap;
  layout: LayoutResult;
  theme: ThemeConfig;
  selectedNodeId: string | null;
  selectedNodeIds?: string[];
  editingNodeId: string | null;
  editingInitialChar?: string | null;
  editInputMode?: EditInputMode;
  enableRightClickPan?: boolean;
  selectedRelationshipId?: string | null;
  onSelectRelationship?: (relId: string | null) => void;
  onDeleteRelationship?: (relId: string) => void;
  onDeleteSelectedNodes?: () => void;
  onSelectNode: (nodeId: string | null, isMulti?: boolean) => void;
  onSelectNodes?: (nodeIds: string[]) => void;
  onStartEditNode: (nodeId: string, initialChar?: string) => void;
  onFinishEditNode: (nodeId: string, text: string) => void;
  onFinishEditAndAddSibling?: (nodeId: string, text: string, position?: 'before' | 'after') => void;
  onFinishEditAndAddChild?: (nodeId: string, text: string) => void;
  onAddChildNode: (parentId: string, sideHint?: 'left' | 'right') => void;
  onAddSiblingNode: (nodeId: string, position?: 'before' | 'after') => void;
  onToggleFoldNode: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onReparentNode: (nodeId: string, targetId: string, position?: DropPosition, side?: 'left' | 'right') => void;
  onMoveSiblingNode?: (nodeId: string, direction: 'up' | 'down') => void;
  onOpenShortcutsModal: () => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  onUpdateNodeProps?: (nodeId: string, partial: Partial<MindNode>) => void;
  onOpenNote: (nodeId: string) => void;
  onAttachImage: (nodeId: string, file: File) => Promise<void>;
  onOpenLink: (url: string) => void;
  /** 選択中のノードの上に出すバー（ノードのプロパティバー）。なければ出さない */
  nodeBar?: React.ReactNode;
  /** 選択中の関連線の中点の上に出すバー（関連線のプロパティバー）。なければ出さない */
  relationshipBar?: React.ReactNode;
}

/** 接続線の SVG を、マップの外側にこれだけ広げて描く（線の太さや曲線のはみ出しを切らないため） */
const SVG_OVERFLOW = 200;

export const MindCanvas: React.FC<MindCanvasProps> = ({
  mindMap,
  layout,
  theme,
  selectedNodeId,
  selectedNodeIds = [],
  editingNodeId,
  editingInitialChar,
  editInputMode = 'overwrite',
  enableRightClickPan = true,
  selectedRelationshipId = null,
  onSelectRelationship,
  onDeleteRelationship,
  onDeleteSelectedNodes,
  onSelectNode,
  onSelectNodes,
  onStartEditNode,
  onFinishEditNode,
  onFinishEditAndAddSibling,
  onFinishEditAndAddChild,
  onAddChildNode,
  onAddSiblingNode,
  onToggleFoldNode,
  onDeleteNode,
  onReparentNode,
  onMoveSiblingNode,
  onOpenShortcutsModal,
  onExpandAll,
  onCollapseAll,
  onUpdateNodeProps,
  onOpenNote,
  onAttachImage,
  onOpenLink,
  nodeBar,
  relationshipBar,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // フック同士で値を受け渡すため、呼び出し順はビューポート → ポインター → D&D → IME → キーボードに固定する
  const viewport = useCanvasViewport({ containerRef, layout, mapId: mindMap.id, selectedNodeId });
  const selectedRel = selectedRelationshipId ? mindMap.relationships?.[selectedRelationshipId] : undefined;
  const relSource = selectedRel ? layout.nodeMap.get(selectedRel.sourceId) : undefined;
  const relTarget = selectedRel ? layout.nodeMap.get(selectedRel.targetId) : undefined;
  const selectedRelationshipBarTarget =
    relSource && relTarget ? { ...computeRelationshipGeometry(relSource, relTarget).mid, width: 0, height: 0 } : null;
  const { pan, zoom, viewportSize, centerOnNode, centerRoot, fitToScreen } = viewport;

  const pointer = useCanvasPointer({
    containerRef,
    pan,
    zoom,
    viewportSize,
    setPan: viewport.setPan,
    nodes: layout.nodes,
    enableRightClickPan,
    onSelectNodes,
  });

  const dnd = useNodeDragDrop({ mindMap, layout, onReparentNode, stopPanning: pointer.stopPanning });

  // クリックで編集が終わったとき、ボタンを離すまで、そのノードのバーと「＋」を出さない
  const heldNodeId = useEditEndHold(editingNodeId);

  const ime = useImeProxy({ selectedNodeId, editingNodeId, onStartEditNode });

  useCanvasKeyboard({
    rootId: mindMap.rootId,
    layout,
    selectedNodeId,
    selectedNodeIds,
    editingNodeId,
    selectedRelationshipId,
    imeProxyRef: ime.imeProxyRef,
    fitToScreen,
    centerRoot,
    onSelectNode,
    onStartEditNode,
    onAddChildNode,
    onAddSiblingNode,
    onToggleFoldNode,
    onDeleteNode,
    onDeleteSelectedNodes,
    onDeleteRelationship,
    onMoveSiblingNode,
    onOpenShortcutsModal,
  });

  const currentFontFamilyCss = buildFontFamilyCss(resolveFontStyle(mindMap.fontFamily));

  const { bounds } = layout;
  const svgBox = {
    x: bounds.minX - SVG_OVERFLOW,
    y: bounds.minY - SVG_OVERFLOW,
    width: bounds.width + SVG_OVERFLOW * 2,
    height: bounds.height + SVG_OVERFLOW * 2,
  };

  return (
    <div
      ref={containerRef}
      id="mind-canvas-container"
      onWheel={viewport.handleWheel}
      onMouseDown={pointer.handleMouseDown}
      onMouseMove={pointer.handleMouseMove}
      onMouseUp={pointer.handleMouseUp}
      onContextMenu={pointer.handleContextMenu}
      onClick={() => onSelectNode(null)}
      style={{ fontFamily: currentFontFamilyCss }}
      className={`relative w-full h-full overflow-hidden select-none ${
        pointer.isPanning ? 'cursor-grabbing' : 'cursor-default'
      } ${theme.bgClass} ${theme.canvasGridClass}`}
    >
      <ImeProxyTextarea
        ref={ime.imeProxyRef}
        onCompositionStart={ime.handleCompositionStart}
        onCompositionEnd={ime.handleCompositionEnd}
        onInput={ime.handleInput}
      />

      {/* パンとズームを適用するワールド座標のコンテナ */}
      <div
        id="mind-canvas-world"
        style={{
          transform: `translate(${viewportSize.width / 2 + pan.x}px, ${
            viewportSize.height / 2 + pan.y
          }px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
        className="absolute left-0 top-0"
      >
        {/* 接続線と関連線 */}
        <svg
          id="mind-canvas-svg"
          style={{
            position: 'absolute',
            left: svgBox.x,
            top: svgBox.y,
            width: svgBox.width,
            height: svgBox.height,
            pointerEvents: 'none',
            overflow: 'visible',
          }}
          viewBox={`${svgBox.x} ${svgBox.y} ${svgBox.width} ${svgBox.height}`}
        >
          {layout.connections.map((conn) => (
            <path
              key={conn.id}
              d={conn.path}
              fill="none"
              stroke={conn.color || theme.lineColor}
              strokeWidth={conn.isRootBranch ? CONNECTION_WIDTH.rootBranch : CONNECTION_WIDTH.branch}
              strokeLinecap="round"
              strokeOpacity={0.9}
            />
          ))}
          <RelationshipLayer
            relationships={mindMap.relationships}
            layout={layout}
            selectedRelationshipId={selectedRelationshipId || null}
            onSelectRelationship={(relId) => onSelectRelationship?.(relId)}
            theme={theme}
          />
        </svg>

        {/* ノード */}
        {layout.nodes.map((node) => (
          <MindNodeComponent
            key={node.id}
            node={node}
            isRoot={node.id === mindMap.rootId}
            isSelected={selectedNodeId === node.id}
            isEditing={editingNodeId === node.id}
            isActionsHeld={heldNodeId === node.id}
            initialChar={editingNodeId === node.id ? editingInitialChar : null}
            editInputMode={editInputMode}
            imeMirrorText={editingNodeId === node.id ? ime.imeMirrorText : null}
            enableRightClickPan={enableRightClickPan}
            theme={theme}
            layoutType={mindMap.layoutType}
            fontFamily={mindMap.fontFamily}
            dropTargetId={dnd.dropTargetId}
            dropTargetPosition={dnd.dropTargetId === node.id ? dnd.dropPosition : null}
            dropTargetSide={dnd.dropTargetId === node.id ? dnd.dropSide : null}
            draggedNodeId={dnd.draggedNodeId}
            onSelect={onSelectNode}
            isMultiSelected={selectedNodeIds.includes(node.id)}
            isSoleSelection={selectedNodeIds.length <= 1}
            onStartEdit={onStartEditNode}
            onFinishEdit={onFinishEditNode}
            onFinishEditAndAddSibling={onFinishEditAndAddSibling}
            onFinishEditAndAddChild={onFinishEditAndAddChild}
            onAddChild={(parentId, sideHint) => onAddChildNode(parentId, sideHint)}
            onAddSibling={onAddSiblingNode}
            onToggleFold={onToggleFoldNode}
            onUpdateProps={onUpdateNodeProps}
            onOpenNote={onOpenNote}
            onAttachImage={onAttachImage}
            onOpenLink={onOpenLink}
            onDragStart={dnd.handleNodeDragStart}
            onDragEnd={dnd.handleNodeDragEnd}
            onDragOver={dnd.handleNodeDragOver}
            onDragLeave={dnd.handleNodeDragLeave}
            onDrop={dnd.handleNodeDrop}
          />
        ))}
      </div>

      {/* 範囲選択の枠 */}
      {pointer.rubberBandBox && (
        <div
          style={{ position: 'absolute', ...pointer.rubberBandBox }}
          className="border-2 border-accent bg-accent/15 rounded-control pointer-events-none z-50"
        />
      )}

      {/* ノードのプロパティバー（選択中のノードの上に付いていく）。ドラッグ中は上のノードへ落とす邪魔になるので隠す */}
      {nodeBar && !heldNodeId && !dnd.draggedNodeId && selectedNodeId && layout.nodeMap.get(selectedNodeId) && (
        <NodeBarAnchor node={layout.nodeMap.get(selectedNodeId)!} pan={pan} zoom={zoom} viewportSize={viewportSize}>
          {nodeBar}
        </NodeBarAnchor>
      )}

      {/* 関連線のプロパティバー（選択中の関連線の中点の上に付いていく） */}
      {relationshipBar && selectedRelationshipBarTarget && (
        <NodeBarAnchor node={selectedRelationshipBarTarget} pan={pan} zoom={zoom} viewportSize={viewportSize}>
          {relationshipBar}
        </NodeBarAnchor>
      )}

      <CanvasViewControls
        layout={layout}
        pan={pan}
        zoom={zoom}
        viewportSize={viewportSize}
        selectedNodeId={selectedNodeId}
        onNavigateTo={(wx, wy) => centerOnNode(wx, wy)}
        onFitToScreen={fitToScreen}
        onCenterRoot={centerRoot}
        onResetZoom={centerRoot}
        onZoomIn={viewport.zoomIn}
        onZoomOut={viewport.zoomOut}
        onExpandAll={onExpandAll}
        onCollapseAll={onCollapseAll}
        onOpenShortcutsModal={onOpenShortcutsModal}
      />
    </div>
  );
};
