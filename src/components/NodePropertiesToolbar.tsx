import { t } from '../i18n';
import React from 'react';
import {
  CheckSquare,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Palette,
  Shapes,
  Smile,
  Type,
} from 'lucide-react';
import { MindNode } from '../types';
import { resolveIsBold } from '../utils/nodeDimensions';
import { IconRenderer } from './IconRenderer';
import { SelectionSummary } from './NodeSelectionSummary';
import { CloseButton, Divider, PanelToggleButton } from './PropertiesBarParts';

/** 下段に開くパネルの種類 */
export type NodePropertyPanel = 'text' | 'color' | 'icon' | 'note' | 'link' | 'image' | 'shape' | 'progress';

interface NodePropertiesToolbarProps {
  node: MindNode;
  isRoot: boolean;
  selectedCount: number;
  activePanel: NodePropertyPanel | null;
  onTogglePanel: (panel: NodePropertyPanel) => void;
  onUpdateProps: (partial: Partial<MindNode>) => void;
  canCreateRelationship?: boolean;
  onCreateRelationship?: () => void;
  onDeleteSelected?: () => void;
  onClose: () => void;
}

/** 複数のノードを選んでいるときに使えるパネル。メモ・リンク・画像はノードごとの内容なので、まとめて設定しない */
export const MULTI_SELECT_PANELS: readonly NodePropertyPanel[] = ['text', 'color', 'icon', 'shape', 'progress'];

/** そのパネルを、今の選択数で使えるか */
export function isPanelAvailable(panel: NodePropertyPanel, selectedCount: number): boolean {
  return selectedCount <= 1 || MULTI_SELECT_PANELS.includes(panel);
}

/** 文字の装飾（サイズ・太字・斜体・下線・色）が、既定と違う値になっているか */
export function hasTextStyle(node: MindNode, isRoot: boolean): boolean {
  return (
    (node.fontSize !== undefined && node.fontSize !== 'base') ||
    resolveIsBold(node, isRoot) !== isRoot ||
    !!node.italic ||
    !!node.underline ||
    !!node.textColor
  );
}

/** ノードのプロパティバーの上段 */
export const NodePropertiesToolbar: React.FC<NodePropertiesToolbarProps> = (props) => {
  const { node, isRoot, selectedCount, activePanel, onTogglePanel, onClose } = props;
  const isMulti = selectedCount > 1;
  const hasProgress = node.progress !== undefined;

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 px-1 py-0.5 overflow-x-auto max-w-full scrollbar-none">
      {/* 1 ノード選択のときは、選んだノードがキャンバスで強調されているので、名前は出さない */}
      {isMulti && (
        <>
          <SelectionSummary {...props} />
          <Divider />
        </>
      )}

      <div className="flex items-center gap-0.5 shrink-0">
        <PanelToggleButton id="prop-btn-text" open={activePanel === 'text'} showDot={hasTextStyle(node, isRoot)} onClick={() => onTogglePanel('text')} title={t('props.text')}>
          <Type className="w-3.5 h-3.5" />
        </PanelToggleButton>
        <PanelToggleButton id="prop-btn-color" open={activePanel === 'color'} showDot={!!node.color} onClick={() => onTogglePanel('color')} title={t('props.color')}>
          <Palette className="w-3.5 h-3.5" />
        </PanelToggleButton>
        <PanelToggleButton id="prop-btn-icon" open={activePanel === 'icon'} onClick={() => onTogglePanel('icon')} title={t('props.icon')}>
          {node.icon ? <IconRenderer name={node.icon} className="w-3.5 h-3.5" /> : <Smile className="w-3.5 h-3.5" />}
        </PanelToggleButton>
        <PanelToggleButton id="prop-btn-shape" open={activePanel === 'shape'} showDot={!!node.shape && node.shape !== 'rounded'} onClick={() => onTogglePanel('shape')} title={t('props.shape')}>
          <Shapes className="w-3.5 h-3.5" />
        </PanelToggleButton>
        <PanelToggleButton
          id="prop-btn-progress"
          open={activePanel === 'progress'}
          sizeClass={hasProgress ? 'h-7 px-1.5 gap-1' : 'h-7 w-7 gap-1'}
          onClick={() => onTogglePanel('progress')}
          title={t('props.progress', { value: hasProgress ? `${node.progress}%` : t('props.progressNone') })}
        >
          <CheckSquare className="w-3.5 h-3.5 shrink-0" />
          {hasProgress && <span className="text-ui-caption tabular-nums">{node.progress}%</span>}
        </PanelToggleButton>
        {/* メモ・リンク・画像は、複数選択のときは出さない（isPanelAvailable と同じ決まり） */}
        {!isMulti && (
          <>
        <PanelToggleButton id="prop-btn-note" open={activePanel === 'note'} showDot={!!node.note} onClick={() => onTogglePanel('note')} title={node.note ? t('props.noteSet', { note: node.note }) : t('props.noteAdd')}>
          <FileText className="w-3.5 h-3.5" />
        </PanelToggleButton>
        <PanelToggleButton id="prop-btn-link" open={activePanel === 'link'} showDot={!!node.link} onClick={() => onTogglePanel('link')} title={node.link ? t('props.linkSet', { link: node.link }) : t('props.linkAdd')}>
          <LinkIcon className="w-3.5 h-3.5" />
        </PanelToggleButton>
        <PanelToggleButton
          id="prop-btn-image"
          open={activePanel === 'image'}
          showDot={!!node.image}
          onClick={() => onTogglePanel('image')}
          title={node.image ? t('props.imageChange') : t('props.imageAdd')}
        >
          <ImageIcon className="w-3.5 h-3.5" />
        </PanelToggleButton>
          </>
        )}
      </div>

      <Divider />

      <CloseButton id="prop-btn-close" title={t('common.closeWithKey')} onClick={onClose} />
    </div>
  );
};
