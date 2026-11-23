import { useState, useCallback } from 'react';
import { MindMap } from '../types';
import {
  History,
  createHistory,
  pushHistory,
  replaceHistory,
  discardHistory,
  undoHistory,
  redoHistory,
} from '../utils/history';

/**
 * マップ全体のスナップショット方式の Undo/Redo。
 * MindMap はイミュータブルなので参照を積むだけでよい。履歴はメモリ上・セッション内のみ。
 */
export function useUndoableMap(initial: () => MindMap) {
  const [history, setHistory] = useState<History<MindMap>>(() => createHistory(initial()));

  /** 履歴対象の更新 */
  const commit = useCallback((next: MindMap) => setHistory((h) => pushHistory(h, next)), []);
  /** 直前の履歴ステップに統合する更新（新規ノードへの初回テキスト入力など） */
  const amend = useCallback((next: MindMap) => setHistory((h) => replaceHistory(h, next)), []);
  /**
   * 直前のステップ（present === expected）を履歴ごと取り消す。
   * 想定外の状態なら fallback を通常どおり commit する。
   */
  const discard = useCallback(
    (expected: MindMap, fallback: MindMap) =>
      setHistory((h) => discardHistory(h, expected, fallback)),
    []
  );
  /** 外部更新・初期ロード用。履歴をリセットして置き換える */
  const reset = useCallback((next: MindMap) => setHistory(createHistory(next)), []);
  const undo = useCallback(() => setHistory(undoHistory), []);
  const redo = useCallback(() => setHistory(redoHistory), []);

  return {
    mindMap: history.present,
    commit,
    amend,
    discard,
    reset,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
