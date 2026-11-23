import { t } from '../i18n';
import { useState, useEffect, useRef, useCallback } from 'react';
import { MindMap, SaveStatus } from '../types';
import { storageAdapter } from '../services/storageAdapter';

/** 例外からユーザーに見せるメッセージを取り出す。取り出せないときは fallback */
function errorMessageOf(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

interface UseAutoSaveParams {
  mindMap: MindMap;
  onToast?: (msg: string) => void;
}

export function useAutoSave({ mindMap, onToast }: UseAutoSaveParams) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [storageBytes, setStorageBytes] = useState<number>(0);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isInitialMount = useRef(true);
  const saveTimerRef = useRef<number | null>(null);
  const saveTransitionTimerRef = useRef<number | null>(null);

  // 自動保存デバウンス処理
  useEffect(() => {
    // 初回マウント時は保存ステータスを変更しない
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setSaveStatus('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (saveTransitionTimerRef.current) clearTimeout(saveTransitionTimerRef.current);

    saveTimerRef.current = window.setTimeout(async () => {
      try {
        const { bytes } = await storageAdapter.save(mindMap);
        if (storageAdapter.isVsCode) {
          storageAdapter.sendSaveCommand();
        }
        setStorageBytes(bytes);
        setLastSavedAt(Date.now());
        setSaveError(null);

        // 視覚的に保存処理が行われたことがわかるよう、わずかにsaving状態を維持
        saveTransitionTimerRef.current = window.setTimeout(() => {
          setSaveStatus('saved');
        }, 350);
      } catch (e) {
        console.error('Failed to save document', e);
        setSaveStatus('error');
        setSaveError(errorMessageOf(e, t('save.docFailed')));
      }
    }, 150);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (saveTransitionTimerRef.current) clearTimeout(saveTransitionTimerRef.current);
    };
  }, [mindMap]);

  // 手動保存ハンドラー (Ctrl+S や保存ボタン等)
  const handleManualSave = useCallback(async () => {
    setSaveStatus('saving');
    try {
      const { bytes } = await storageAdapter.save(mindMap);
      if (storageAdapter.isVsCode) {
        storageAdapter.sendSaveCommand();
      }
      setStorageBytes(bytes);
      setLastSavedAt(Date.now());
      setSaveError(null);
      setTimeout(() => {
        setSaveStatus('saved');
      }, 300);
    } catch (e) {
      setSaveStatus('error');
      setSaveError(errorMessageOf(e, t('save.failed')));
      onToast?.(t('save.failed'));
    }
  }, [mindMap, onToast]);

  return {
    saveStatus,
    lastSavedAt,
    storageBytes,
    saveError,
    handleManualSave,
  };
}
