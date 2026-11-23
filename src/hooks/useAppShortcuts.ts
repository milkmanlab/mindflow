import React, { useEffect } from 'react';
import { MindMap } from '../types';
import { copySubtree } from '../utils/treeOperations';
import { isCmdOrCtrl, isExternalInputTarget } from './keyboardUtils';

interface UseAppShortcutsParams {
  mindMap: MindMap;
  updateMap: (map: MindMap) => void;
  undo: () => void;
  redo: () => void;
  selectedNodeId: string | null;
  editingNodeId: string | null;
  copiedNodeId: string | null;
  setCopiedNodeId: (id: string | null) => void;
  setSelectedNodeId: (id: string | null) => void;
  setIsSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleManualSave: () => void;
  /** 画像ファイルをノードに付ける（縮小する） */
  attachImage: (nodeId: string, file: File) => Promise<void>;
}

/**
 * アプリ全体のショートカット（検索・保存・コピー・ペースト）、Undo/Redo、画像の貼り付け。
 * ノードの選択・追加・移動などのキャンバス上のキー操作は useCanvasKeyboard が受け持つ
 */
export function useAppShortcuts({
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
}: UseAppShortcutsParams) {
  // 検索・保存・コピー・ペースト
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      const cmdOrCtrl = isCmdOrCtrl(e);
      const key = e.key.toLowerCase();

      // 検索（Ctrl/Cmd + F）
      if (cmdOrCtrl && key === 'f') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
        return;
      }

      // 保存（Ctrl/Cmd + S）。ノードの編集中は、編集欄の側が確定する（自動保存が続けて保存する）
      if (cmdOrCtrl && key === 's') {
        e.preventDefault();
        if (!editingNodeId) handleManualSave();
        return;
      }

      if (isExternalInputTarget(e.target)) return;

      // コピー（Ctrl/Cmd + C）
      if (cmdOrCtrl && key === 'c') {
        if (selectedNodeId) {
          setCopiedNodeId(selectedNodeId);
        }
      }
      // ペースト（Ctrl/Cmd + V）：コピーしたノードを、選択中のノードの子として複製する
      else if (cmdOrCtrl && key === 'v') {
        if (copiedNodeId && selectedNodeId) {
          const { updatedMap, newRootNodeId } = copySubtree(mindMap, copiedNodeId, selectedNodeId);
          // コピー元が削除されているなどで複製できなかったときは、何もしない
          // （変化のないマップを Undo の履歴に積んだり、選択を空にしたりしない）
          if (!newRootNodeId) return;
          updateMap(updatedMap);
          setSelectedNodeId(newRootNodeId);
        }
      }
    };

    // 入力欄は keydown の伝播を止めるので、capture で先に受ける
    window.addEventListener('keydown', handleGlobalShortcuts, true);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts, true);
  }, [
    selectedNodeId,
    copiedNodeId,
    mindMap,
    updateMap,
    handleManualSave,
    editingNodeId,
    setCopiedNodeId,
    setSelectedNodeId,
    setIsSearchOpen,
  ]);

  // Undo / Redo
  // VS Code の Webview は window の keydown を拡張ホストへ転送し、ホスト側で
  // TextDocument の Undo が走る（→ update 受信で履歴・選択がリセットされる）。
  // document で伝播を止め、window まで届かないようにする。
  useEffect(() => {
    const handleUndoRedo = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (!isCmdOrCtrl(e) || (key !== 'z' && key !== 'y')) return;

      e.stopPropagation();

      // 入力欄・ノード編集中はネイティブのテキスト Undo に任せる
      if (isExternalInputTarget(e.target) || editingNodeId) return;

      e.preventDefault();
      if (key === 'y' || e.shiftKey) {
        redo();
      } else {
        undo();
      }
    };

    document.addEventListener('keydown', handleUndoRedo);
    return () => document.removeEventListener('keydown', handleUndoRedo);
  }, [editingNodeId, undo, redo]);

  // クリップボードからの画像の貼り付け（選択中のノードの画像にする）
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (isExternalInputTarget(e.target) || editingNodeId || !selectedNodeId) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.type.startsWith('image/')) continue;
        const file = item.getAsFile();
        if (!file) continue;
        e.preventDefault();
        void attachImage(selectedNodeId, file);
        return;
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [selectedNodeId, editingNodeId, attachImage]);
}
