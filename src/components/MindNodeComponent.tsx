import React, { useState } from 'react';
import { PositionedNode, ThemeConfig, EditInputMode, LayoutType } from '../types';
import { estimateNodeContentWidth, getNodeLineHeight, resolveIsBold } from '../utils/nodeDimensions';
import {
  NODE_FILL_ALPHA,
  getEditingWidth,
  getNodeBorderStyle,
  getNodeFontSizeClass,
  getNodeHeightStyle,
  getNodeShapeClass,
  getNodeTextDecorationClass,
  getNodeTranslateX,
} from '../utils/nodeStyle';
import { useNodeTextEditor } from '../hooks/useNodeTextEditor';
import { NodeTextContent } from './NodeTextContent';
import { NodeDropIndicator } from './NodeDropIndicator';
import { NodeActionButtons } from './NodeActionButtons';
import { NodeLeadingBadges, NodeTrailingIndicators } from './NodeInfoBadges';
import { NodeImage } from './NodeImage';

interface MindNodeComponentProps {
  node: PositionedNode;
  isRoot: boolean;
  isSelected: boolean;
  isEditing: boolean;
  /** クリックで編集が終わり、ボタンを離すまでの間。「＋」などの操作ボタンを出さない */
  isActionsHeld?: boolean;
  initialChar?: string | null;
  editInputMode?: EditInputMode;
  // Text being composed in the canvas IME proxy (null when not composing there)
  imeMirrorText?: string | null;
  enableRightClickPan?: boolean;
  theme: ThemeConfig;
  layoutType?: LayoutType;
  /** マップのフォント。編集中の幅の見積もりに使う */
  fontFamily?: string;
  dropTargetId: string | null;
  dropTargetPosition?: 'before' | 'after' | 'inside' | null;
  /** ルートがドロップ先のとき、入る側（放射状のみ） */
  dropTargetSide?: 'left' | 'right' | null;
  draggedNodeId?: string | null;
  onSelect: (nodeId: string, isMulti?: boolean) => void;
  isMultiSelected?: boolean;
  /** 選択しているノードがこの 1 つだけか。画像の大きさを変えるつまみを出す条件 */
  isSoleSelection?: boolean;
  onStartEdit: (nodeId: string) => void;
  onFinishEdit: (nodeId: string, newText: string) => void;
  onFinishEditAndAddSibling?: (nodeId: string, newText: string, position?: 'before' | 'after') => void;
  onFinishEditAndAddChild?: (nodeId: string, newText: string) => void;
  onAddChild: (parentId: string, sideHint?: 'left' | 'right') => void;
  onAddSibling: (nodeId: string, position?: 'before' | 'after') => void;
  onToggleFold: (nodeId: string) => void;
  onUpdateProps?: (nodeId: string, partial: Partial<PositionedNode>) => void;
  onOpenNote: (nodeId: string) => void;
  /** 画像ファイルをノードに付ける（縮小は呼び出し側で行う） */
  onAttachImage: (nodeId: string, file: File) => Promise<void>;
  onOpenLink: (url: string) => void;
  onDragStart: (e: React.DragEvent, nodeId: string) => void;
  onDragEnd?: (e: React.DragEvent, nodeId: string) => void;
  onDragOver: (e: React.DragEvent, nodeId: string) => void;
  onDragLeave: (e: React.DragEvent, nodeId: string) => void;
  onDrop: (e: React.DragEvent, nodeId: string) => void;
}

/** 「子ノードとして追加」の対象になったノードの拡大率 */
const DROP_INSIDE_SCALE = 1.05;

export const MindNodeComponent: React.FC<MindNodeComponentProps> = ({
  node,
  isRoot,
  isSelected,
  isEditing,
  isActionsHeld = false,
  initialChar,
  editInputMode = 'overwrite',
  imeMirrorText = null,
  enableRightClickPan = true,
  theme,
  layoutType = 'mindmap',
  fontFamily,
  dropTargetId,
  dropTargetPosition,
  dropTargetSide,
  draggedNodeId = null,
  onSelect,
  isMultiSelected = false,
  isSoleSelection = false,
  onStartEdit,
  onFinishEdit,
  onFinishEditAndAddSibling,
  onFinishEditAndAddChild,
  onAddChild,
  onAddSibling,
  onToggleFold,
  onUpdateProps,
  onOpenNote,
  onAttachImage,
  onOpenLink,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const lineHeight = getNodeLineHeight(node.fontSize, isRoot);

  const { editText, textareaRef, overflowBoost, textareaHandlers } = useNodeTextEditor({
    node,
    isRoot,
    isEditing,
    initialChar,
    editInputMode,
    imeMirrorText,
    lineHeight,
    onFinishEdit,
    onFinishEditAndAddSibling,
    onFinishEditAndAddChild,
    onAddSibling,
    onAddChild,
  });

  const dropPosition = dropTargetId === node.id ? dropTargetPosition ?? null : null;
  const isDropInside = dropPosition === 'inside';

  // 見た目
  const fontSizeClass = getNodeFontSizeClass(node.fontSize, isRoot);
  const decorationClass = getNodeTextDecorationClass({
    isBold: resolveIsBold(node, isRoot),
    isItalic: !!node.italic,
    isUnderline: !!node.underline,
  });
  const themeTextClass = isRoot ? 'text-on-root' : 'text-on-node';
  const borderStyle = getNodeBorderStyle(node, isRoot, isHovered);

  // 編集を始めた瞬間は幅を変えず、文字がはみ出したときだけ広げる
  const editingWidth = isEditing
    ? getEditingWidth(node.width, estimateNodeContentWidth(node, isRoot, editText || '', fontFamily), overflowBoost)
    : node.width;

  const handleDropWithImage = (e: React.DragEvent) => {
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      e.preventDefault();
      e.stopPropagation();
      void onAttachImage(node.id, file);
      return;
    }
    onDrop(e, node.id);
  };

  return (
    <div
      id={`node-${node.id}`}
      draggable={!isRoot && !isEditing}
      onDragStart={(e) => onDragStart(e, node.id)}
      onDragEnd={(e) => onDragEnd?.(e, node.id)}
      onDragOver={(e) => onDragOver(e, node.id)}
      onDragLeave={(e) => onDragLeave(e, node.id)}
      onDrop={handleDropWithImage}
      onContextMenu={(e) => {
        if (enableRightClickPan) {
          e.preventDefault();
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
        const isMulti = e.shiftKey || e.metaKey || e.ctrlKey;
        if (isMulti) {
          onSelect(node.id, true);
        } else if (isSelected && !isEditing) {
          onStartEdit(node.id);
        } else {
          onSelect(node.id, false);
        }
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onStartEdit(node.id);
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        // 拡大は translate と同じ transform に書く。Tailwind の scale-* は CSS の scale プロパティになり、
        // translate の外側にかかるため、ノードの位置まで 1.05 倍にずれてしまう
        transform: `translate(${getNodeTranslateX(node, isRoot, isEditing, editingWidth)}px, ${node.y}px)${
          isDropInside ? ` scale(${DROP_INSIDE_SCALE})` : ''
        }`,
        width: `${editingWidth}px`,
        minHeight: `${node.height}px`,
        height: getNodeHeightStyle(node.height, isEditing, editText, node.text),
        zIndex: isSelected ? 40 : isEditing ? 50 : 10 + node.depth,
      }}
      className={`absolute select-none group cursor-pointer ${
        isDropInside ? 'transition-transform' : ''
      }`}
    >
      {/* ドラッグ中は当たり判定を広げ、兄弟の間に隙間なく落とせるようにする */}
      {draggedNodeId && !isEditing && (
        <div className="absolute -top-3.5 -bottom-3.5 -left-2 -right-2 pointer-events-auto -z-10" />
      )}

      <NodeDropIndicator position={dropPosition} side={dropPosition ? dropTargetSide ?? undefined : undefined} />

      {/* ノード本体 */}
      <div
        style={{
          ...borderStyle.style,
          ...(isDropInside ? { borderColor: theme.accent } : {}),
          ...(node.color ? { backgroundColor: isRoot ? node.color : `${node.color}${NODE_FILL_ALPHA}` } : {}),
        }}
        className={`relative w-full h-full min-h-[inherit] flex flex-col justify-center ${getNodeShapeClass(node.shape, isRoot)} ${
          isRoot
            ? `${node.color ? '' : 'bg-root'} font-bold text-center justify-center`
            : 'bg-node font-medium'
        } ${borderStyle.className} ${
          // 選択はアウトラインで表す。間を空けるのは、ルートの背景がアクセント色と近いテーマでも枠が見えるようにするため
          isSelected || isMultiSelected ? 'outline-2 outline-accent outline-offset-2' : ''
        } ${isDropInside ? 'outline-2 outline-accent outline-offset-2 bg-accent/10' : ''}`}
      >
        {node.image && (
          <NodeImage
            nodeId={node.id}
            image={node.image}
            text={node.text}
            imageWidth={node.imageWidth}
            imageAspect={node.imageAspect}
            side={node.effectiveSide === 'left' ? 'left' : 'right'}
            canResize={isSelected && isSoleSelection && !isEditing}
            onUpdateProps={onUpdateProps}
          />
        )}

        {/* テキストと付属情報の行 */}
        <div className={`w-full flex items-center gap-1.5 min-w-0 ${isRoot ? 'justify-center' : ''}`}>
          {!isEditing && <NodeLeadingBadges node={node} isRoot={isRoot} theme={theme} />}
          <NodeTextContent
            isEditing={isEditing}
            isRoot={isRoot}
            text={node.text}
            editText={editText}
            textareaRef={textareaRef}
            textareaHandlers={textareaHandlers}
            theme={theme}
            fontSizeClass={fontSizeClass}
            decorationClass={decorationClass}
            lineHeight={lineHeight}
            textColor={node.textColor}
            themeTextClass={themeTextClass}
          />
          <NodeTrailingIndicators
            note={node.note}
            link={node.link}
            onOpenNote={() => onOpenNote(node.id)}
            onOpenLink={onOpenLink}
          />
        </div>

        <NodeActionButtons
          node={node}
          isRoot={isRoot}
          isSelected={isSelected}
          isHovered={isHovered}
          isEditing={isEditing || isActionsHeld}
          layoutType={layoutType}
          onAddChild={onAddChild}
          onAddSibling={onAddSibling}
          onToggleFold={onToggleFold}
        />
      </div>
    </div>
  );
};
