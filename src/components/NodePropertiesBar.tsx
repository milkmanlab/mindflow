import React, { useEffect, useState } from 'react';
import { MindNode, ThemeConfig } from '../types';
import { FloatingBarShell } from './PropertiesBarParts';
import { NodePropertiesToolbar, NodePropertyPanel, isPanelAvailable } from './NodePropertiesToolbar';
import { AccentColorPanel, IconPanel, ProgressPanel, ShapePanel } from './NodeStylePanels';
import { NodeTextPanel } from './NodeTextPanel';
import { ImagePanel, LinkPanel, NotePanel } from './NodeContentPanels';

interface NodePropertiesBarProps {
  node: MindNode;
  selectedCount?: number;
  /** 色のプリセット（ノードの色・関連線の色）を作るために使う */
  theme: ThemeConfig;
  isRoot: boolean;
  /** 外（ノード上のメモの印など）から開くよう頼まれたパネル。開いたら onRequestedPanelHandled で知らせる */
  requestedPanel?: NodePropertyPanel | null;
  onRequestedPanelHandled?: () => void;
  onUpdateProps: (partial: Partial<MindNode>) => void;
  onAttachImage?: (file: File) => Promise<void>;
  onClose: () => void;
  // 複数選択の追加プロパティ
  canCreateRelationship?: boolean;
  onCreateRelationship?: () => void;
  onDeleteSelected?: () => void;
}

/**
 * ノードのプロパティバー。選択中のノードの上に出る（置く位置は NodeBarAnchor が決める）。パネルは上段の上に出す（下端が固定なので、開いても上段のボタンは動かない）。
 * 複数のノードを選んでいるときの設定は、App が選択中のノードすべてに反映する
 */
export const NodePropertiesBar: React.FC<NodePropertiesBarProps> = ({
  node,
  selectedCount = 1,
  theme,
  isRoot,
  requestedPanel = null,
  onRequestedPanelHandled,
  onUpdateProps,
  onAttachImage,
  onClose,
  canCreateRelationship,
  onCreateRelationship,
  onDeleteSelected,
}) => {
  // 下段に開いているパネル。App はこのバーを作り直さずに使い回すので、ノードを選び直しても開いたまま
  const [activePanel, setActivePanel] = useState<NodePropertyPanel | null>(null);

  useEffect(() => {
    if (!requestedPanel) return;
    setActivePanel(requestedPanel);
    onRequestedPanelHandled?.();
  }, [requestedPanel, onRequestedPanelHandled]);

  // 複数選択になったら、まとめて設定できないパネル（メモ・リンク・画像）を閉じる
  useEffect(() => {
    setActivePanel((current) => (current && !isPanelAvailable(current, selectedCount) ? null : current));
  }, [selectedCount]);

  // 外から開くよう頼まれたパネルが、今の選択数で使えないもの（複数選択中のメモなど）のときは、開かない
  const openPanel = activePanel && isPanelAvailable(activePanel, selectedCount) ? activePanel : null;
  const togglePanel = (panel: NodePropertyPanel) => setActivePanel((current) => (current === panel ? null : panel));
  const panelProps = { node, onUpdateProps, onAttachImage };

  return (
    <FloatingBarShell id="node-properties-bar">
      {openPanel === 'text' && <NodeTextPanel node={node} isRoot={isRoot} onUpdateProps={onUpdateProps} />}
      {openPanel === 'color' && <AccentColorPanel {...panelProps} theme={theme} />}
      {openPanel === 'icon' && <IconPanel {...panelProps} />}
      {openPanel === 'shape' && <ShapePanel {...panelProps} />}
      {openPanel === 'note' && <NotePanel {...panelProps} />}
      {openPanel === 'link' && <LinkPanel {...panelProps} />}
      {openPanel === 'progress' && <ProgressPanel {...panelProps} />}
      {openPanel === 'image' && <ImagePanel {...panelProps} />}

      <NodePropertiesToolbar
        node={node}
        isRoot={isRoot}
        selectedCount={selectedCount}
        activePanel={openPanel}
        onTogglePanel={togglePanel}
        onUpdateProps={onUpdateProps}
        canCreateRelationship={canCreateRelationship}
        onCreateRelationship={onCreateRelationship}
        onDeleteSelected={onDeleteSelected}
        onClose={onClose}
      />
    </FloatingBarShell>
  );
};
