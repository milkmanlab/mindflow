import { useState, useEffect } from 'react';
import { MindMap } from '../types';
import { storageAdapter } from '../services/storageAdapter';

interface UseStorageSyncParams {
  /** 外部からのマップで置き換える（Undo の履歴もリセットされる） */
  setMindMap: (map: MindMap) => void;
  resetSelection: (rootId: string) => void;
}

/** 保存先（VS Code / ブラウザ）との接続。初期マップと外部からの更新を受け取る */
export function useStorageSync({ setMindMap, resetSelection }: UseStorageSyncParams) {
  // 初期ドキュメントの読み込み完了。VS Code モードでは受信するまで既定のマップを見せない（ちらつき防止）
  const [isStorageReady, setIsStorageReady] = useState<boolean>(!storageAdapter.isVsCode);

  useEffect(() => {
    storageAdapter
      .init({
        onDocUpdate: (newMap) => {
          setMindMap(newMap);
          resetSelection(newMap.rootId);
          setIsStorageReady(true);
        },
        onStatusChange: (mode, text) => {
          console.log(`[StorageAdapter:${mode}] ${text}`);
        },
      })
      .then((initialMap) => {
        if (initialMap) {
          setMindMap(initialMap);
          resetSelection(initialMap.rootId);
        }
        // VS Code モードでは init/update 受信（onDocUpdate）までロード完了としない
        if (!storageAdapter.isVsCode) {
          setIsStorageReady(true);
        }
      });
  }, [setMindMap, resetSelection]);

  return { isStorageReady };
}
