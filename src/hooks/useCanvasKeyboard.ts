import { useEffect } from 'react';
import {
  CanvasKeyboardContext,
  handleEditingShortcut,
  handleModifierShortcut,
  handleNoSelectionShortcut,
  handleSelectionShortcut,
  handleTypeToEdit,
  isCmdOrCtrl,
  isStrayTabWhileEditing,
  isTextInput,
  shouldIgnoreKey,
} from './canvasKeyboardHandlers';

/**
 * キャンバスのグローバルなキーボードショートカット。
 * ハンドラーを上から順に試し、処理したところで止める（順番が優先度になる）。
 */
export function useCanvasKeyboard(ctx: CanvasKeyboardContext) {
  const {
    rootId,
    layout,
    selectedNodeId,
    selectedNodeIds,
    editingNodeId,
    selectedRelationshipId,
    imeProxyRef,
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
  } = ctx;

  useEffect(() => {
    // ctx オブジェクトは描画のたびに新しくなるため、依存配列には中身を個別に入れ、ここで組み立て直す
    const current: CanvasKeyboardContext = {
      rootId,
      layout,
      selectedNodeId,
      selectedNodeIds,
      editingNodeId,
      selectedRelationshipId,
      imeProxyRef,
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
    };

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 編集中の Tab でフォーカスが部品へ逃げないよう、ブラウザの既定の動作だけ止める
      if (isStrayTabWhileEditing(e, current)) {
        e.preventDefault();
        return;
      }
      if (shouldIgnoreKey(e, current)) return;
      const cmdOrCtrl = isCmdOrCtrl(e);
      if (handleModifierShortcut(e, current, cmdOrCtrl)) return;
      if (handleEditingShortcut(e, current)) return;
      if (handleSelectionShortcut(e, current, cmdOrCtrl)) return;
      if (!selectedNodeId) {
        handleNoSelectionShortcut(e, current);
        return;
      }
      handleTypeToEdit(e, current, selectedNodeId, cmdOrCtrl);
    };

    // フォーカスが入力欄以外にあるときに IME の変換が始まったら、選択中のノードの編集を始める
    const handleGlobalCompositionStart = (e: CompositionEvent) => {
      if (isTextInput(e.target)) return;
      if (selectedNodeId && !editingNodeId) {
        onStartEditNode(selectedNodeId, '');
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('compositionstart', handleGlobalCompositionStart);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('compositionstart', handleGlobalCompositionStart);
    };
  }, [
    rootId,
    layout,
    selectedNodeId,
    selectedNodeIds,
    editingNodeId,
    selectedRelationshipId,
    imeProxyRef,
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
  ]);
}
