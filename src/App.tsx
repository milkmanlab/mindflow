import { t } from './i18n';
import React, { useState, useEffect, useMemo } from 'react';
import { LayoutType, ConnectorStyle } from './types';
import { calculateLayout } from './utils/layout';
import { getTheme, themeCssVariables } from './utils/themes';
import { createDefaultMindMap, updateMapFontFamily } from './utils/treeOperations';
import { DEFAULT_ROOT_TEXT } from './utils/editCommit';
import { exportMapToPngFile, exportMapToSvgFile } from './services/exportService';
import { MindCanvas } from './components/MindCanvas';
import { TopToolbar } from './components/TopToolbar';
import { NodePropertiesBar } from './components/NodePropertiesBar';
import { RelationshipPropertiesBar } from './components/RelationshipPropertiesBar';
import type { NodePropertyPanel } from './components/NodePropertiesToolbar';
import { ShortcutsModal } from './components/ShortcutsModal';
import { SearchBar } from './components/SearchBar';
import { Loader2 } from 'lucide-react';
import { storageAdapter } from './services/storageAdapter';
import { useMindMapSelection } from './hooks/useMindMapSelection';
import { useAutoSave } from './hooks/useAutoSave';
import { useUndoableMap } from './hooks/useUndoableMap';
import { useToast } from './hooks/useToast';
import { useAppPreferences } from './hooks/useAppPreferences';
import { useStorageSync } from './hooks/useStorageSync';
import { usePendingNewNode } from './hooks/usePendingNewNode';
import { useNodeStructureActions } from './hooks/useNodeStructureActions';
import { useNodeEditActions } from './hooks/useNodeEditActions';
import { useRelationshipActions } from './hooks/useRelationshipActions';
import { useAppShortcuts } from './hooks/useAppShortcuts';
import { useUndoSelection } from './hooks/useUndoSelection';
import { useImageAttach } from './hooks/useImageAttach';

export default function App() {
  // マップ本体と Undo/Redo の履歴（初期値は VS Code 接続またはブラウザからの復元）
  const {
    mindMap,
    commit: updateMap,
    amend: amendMap,
    discard: discardMap,
    reset: setMindMap,
    undo: undoMap,
    redo: redoMap,
    canUndo,
    canRedo,
  } = useUndoableMap(() => storageAdapter.getInitialMap() || createDefaultMindMap(DEFAULT_ROOT_TEXT));

  // ノードの選択・編集の状態
  const selection = useMindMapSelection(mindMap.rootId);
  const {
    selectedNodeId,
    selectedNodeIds,
    setSelectedNodeId,
    setSelectedNodeIds,
    editingNodeId,
    setEditingNodeId,
    editingInitialChar,
    setEditingInitialChar,
    copiedNodeId,
    setCopiedNodeId,
    handleSelectNode,
    handleSelectNodes,
    clearSelection,
    resetSelection,
  } = selection;

  // Undo / Redo で移った先のマップに、そのときの選択を戻す
  const { undo, redo } = useUndoSelection({
    mindMap,
    selectedNodeIds,
    setSelectedNodeIds,
    undo: undoMap,
    redo: redoMap,
    canUndo,
    canRedo,
  });

  // モーダル・検索バー
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // フックは依存する順に呼ぶ（トースト → 設定 → 保存先 → 新しいノード → 構造の操作 → 編集 → 関連線 → ショートカット）
  const { toastMessage, showToast } = useToast();
  const preferences = useAppPreferences(showToast);
  const { isStorageReady } = useStorageSync({ setMindMap, resetSelection });
  const { saveStatus, lastSavedAt, handleManualSave } = useAutoSave({ mindMap, onToast: showToast });

  const { commitAndEditNewNode, commitNodeText, removeEmptyNode, isAddLocked } = usePendingNewNode({
    mindMap,
    updateMap,
    amendMap,
    discardMap,
    setSelectedNodeId,
    editingNodeId,
    setEditingNodeId,
    setEditingInitialChar,
  });

  const structure = useNodeStructureActions({
    mindMap,
    updateMap,
    selectedNodeId,
    selectedNodeIds,
    editingNodeId,
    setSelectedNodeId,
    setEditingNodeId,
    setEditingInitialChar,
    clearSelection,
    commitAndEditNewNode,
    isAddLocked,
    showToast,
  });

  const edit = useNodeEditActions({
    mindMap,
    updateMap,
    setSelectedNodeId,
    setEditingNodeId,
    setEditingInitialChar,
    commitAndEditNewNode,
    isAddLocked,
    commitNodeText,
    removeEmptyNode,
  });

  const relationship = useRelationshipActions({
    mindMap,
    updateMap,
    selectedNodeIds,
    handleSelectNode,
    handleSelectNodes,
    clearSelection,
    showToast,
  });

  // ノード上のメモの印を押したら、そのノードを選んでプロパティバーのメモ欄を開く
  const [requestedPanel, setRequestedPanel] = useState<NodePropertyPanel | null>(null);
  const handleOpenNote = (nodeId: string) => {
    relationship.handleSelectNodeWithRelClear(nodeId);
    setRequestedPanel('note');
  };

  // 画像は、ドロップ・ペースト・パネルのどれからでも、縮小してから付ける
  const attachImage = useImageAttach(structure.handleUpdateNodeProps);

  useAppShortcuts({
    mindMap,
    updateMap,
    undo,
    redo,
    selectedNodeId,
    editingNodeId,
    copiedNodeId,
    setCopiedNodeId,
    setSelectedNodeId,
    setIsSearchOpen,
    handleManualSave,
    attachImage,
  });

  // Undo/Redo などでノードが消えたら、選択から外す。
  // 存在しないノードが選択されたままだと、矢印キー・Tab・Enter が何もしなくなるため
  useEffect(() => {
    setSelectedNodeIds((prev) => {
      const existing = prev.filter((id) => mindMap.nodes[id]);
      return existing.length === prev.length ? prev : existing;
    });
  }, [mindMap, setSelectedNodeIds]);

  // レイアウト・テーマ
  const layout = useMemo(() => calculateLayout(mindMap), [mindMap]);
  const theme = getTheme(mindMap.themeId);

  const selectedNode = selectedNodeId ? mindMap.nodes[selectedNodeId] || null : null;
  const { selectedRelationship, selectedRelationshipId, setSelectedRelationshipId } = relationship;

  const closePropertiesBar = () => {
    setSelectedNodeId(null);
    setSelectedRelationshipId(null);
  };

  // ノードのプロパティバー。MindCanvas が、選択中のノードの上に置く（関連線を選んでいるとき・文字を入力しているときは出さない）
  const nodeBar =
    selectedNode && !selectedRelationship && !editingNodeId ? (
      <NodePropertiesBar
        node={selectedNode}
        selectedCount={selectedNodeIds.length}
        theme={theme}
        canCreateRelationship={selectedNodeIds.length === 2}
        onCreateRelationship={() => relationship.handleCreateRelationship(selectedNodeIds[0], selectedNodeIds[1])}
        onDeleteSelected={structure.handleDeleteSelectedNodes}
        isRoot={selectedNode.id === mindMap.rootId}
        requestedPanel={requestedPanel}
        onRequestedPanelHandled={() => setRequestedPanel(null)}
        onUpdateProps={(partial) => structure.handleUpdateNodeProps(selectedNode.id, partial)}
        onAttachImage={(file) => attachImage(selectedNode.id, file)}
        onClose={closePropertiesBar}
      />
    ) : null;

  // 関連線のプロパティバー。MindCanvas が、選択中の関連線の中点の上に置く
  const relationshipBar = selectedRelationship ? (
    <RelationshipPropertiesBar
      relationship={selectedRelationship}
      theme={theme}
      onUpdateRelationship={relationship.handleUpdateRelationship}
      onDeleteRelationship={relationship.handleDeleteRelationship}
      onClose={closePropertiesBar}
    />
  ) : null;

  return (
    <div
      id="mindflow-app-root"
      style={themeCssVariables(theme) as React.CSSProperties}
      className={`relative w-screen h-screen overflow-hidden ${theme.bgClass} ${
        theme.isDark ? 'dark text-ink-strong' : 'text-ink-strong'
      }`}
    >
      {/* ツールバー（ロード完了までデフォルトマップの内容を見せない） */}
      {isStorageReady && (
        <TopToolbar
          mindMap={mindMap}
          saveStatus={saveStatus}
          lastSavedAt={lastSavedAt}
          onChangeTheme={(themeId) => updateMap({ ...mindMap, themeId, updatedAt: Date.now() })}
          onChangeFontFamily={(fontFamily) => updateMap(updateMapFontFamily(mindMap, fontFamily))}
          onChangeLayout={(layoutType: LayoutType) => updateMap({ ...mindMap, layoutType, updatedAt: Date.now() })}
          onChangeConnector={(connectorStyle: ConnectorStyle) => updateMap({ ...mindMap, connectorStyle, updatedAt: Date.now() })}
          editInputMode={preferences.editInputMode}
          enableRightClickPan={preferences.enableRightClickPan}
          onChangeInputMode={preferences.handleChangeInputMode}
          onChangeRightClickPan={preferences.handleChangeRightClickPan}
          isSearchOpen={isSearchOpen}
          onOpenSearch={() => setIsSearchOpen((prev) => !prev)}
          onExportPNG={() => exportMapToPngFile(mindMap, layout)}
          onExportSVG={() => exportMapToSvgFile(mindMap, layout)}
          onManualSave={handleManualSave}
        />
      )}

      {/* メインキャンバス */}
      <main className="w-full h-full relative">
        {!isStorageReady ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-surface-sunken text-ink-muted gap-3 select-none">
            <Loader2 className="w-8 h-8 animate-spin text-ink-muted" />
            <span className="text-ui-body">{t('app.loading')}</span>
          </div>
        ) : (
          <MindCanvas
            mindMap={mindMap}
            layout={layout}
            theme={theme}
            selectedNodeId={selectedNodeId}
            selectedNodeIds={selectedNodeIds}
            selectedRelationshipId={selectedRelationshipId}
            editingNodeId={editingNodeId}
            editingInitialChar={editingInitialChar}
            editInputMode={preferences.editInputMode}
            enableRightClickPan={preferences.enableRightClickPan}
            onSelectRelationship={relationship.handleSelectRelationship}
            onDeleteRelationship={relationship.handleDeleteRelationship}
            onDeleteSelectedNodes={structure.handleDeleteSelectedNodes}
            onSelectNode={relationship.handleSelectNodeWithRelClear}
            onSelectNodes={relationship.handleSelectNodesWithRelClear}
            onStartEditNode={edit.handleStartEdit}
            onFinishEditNode={edit.handleFinishEdit}
            onFinishEditAndAddSibling={edit.handleFinishEditAndAddSibling}
            onFinishEditAndAddChild={edit.handleFinishEditAndAddChild}
            onAddChildNode={structure.handleAddChild}
            onAddSiblingNode={structure.handleAddSibling}
            onToggleFoldNode={structure.handleToggleFold}
            onDeleteNode={structure.handleDeleteNode}
            onReparentNode={structure.handleReparent}
            onMoveSiblingNode={structure.handleMoveSibling}
            onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
            onExpandAll={structure.handleExpandAll}
            onCollapseAll={structure.handleCollapseAll}
            onUpdateNodeProps={structure.handleUpdateNodeProps}
            onOpenNote={handleOpenNote}
            onAttachImage={attachImage}
            onOpenLink={(url) => storageAdapter.openExternal(url)}
            nodeBar={nodeBar}
            relationshipBar={relationshipBar}
          />
        )}
      </main>

      {/* 検索バー (Ctrl+F) */}
      <SearchBar
        isOpen={isSearchOpen}
        mindMap={mindMap}
        onClose={() => setIsSearchOpen(false)}
        onSelectAndCenterNode={(nodeId) => {
          // 関連線の選択が残ると、プロパティバーと Delete が関連線に対して動いてしまう
          setSelectedRelationshipId(null);
          setSelectedNodeId(nodeId);
        }}
      />

      {/* ショートカット一覧モーダル */}
      <ShortcutsModal isOpen={isShortcutsModalOpen} onClose={() => setIsShortcutsModalOpen(false)} />

      {/* トースト通知 */}
      {toastMessage && (
        <div
          id="toast-notification"
          className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-ink-strong text-surface px-4 py-2 rounded-control text-ui-body shadow-float"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
