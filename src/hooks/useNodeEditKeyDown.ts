import React from 'react';
import { PositionedNode } from '../types';
import { resolveEditKeyAction } from '../utils/nodeEditKeys';

/** 編集の確定と、確定と同時に行うノードの追加 */
export interface NodeEditCallbacks {
  onFinishEdit: (nodeId: string, newText: string) => void;
  onFinishEditAndAddSibling?: (nodeId: string, newText: string, position?: 'before' | 'after') => void;
  onFinishEditAndAddChild?: (nodeId: string, newText: string) => void;
  onAddSibling: (nodeId: string, position?: 'before' | 'after') => void;
  onAddChild: (parentId: string) => void;
}

interface UseNodeEditKeyDownParams extends NodeEditCallbacks {
  node: PositionedNode;
  isRoot: boolean;
  editText: string;
  setEditText: (text: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  autoResize: () => void;
  isComposingRef: React.RefObject<boolean>;
  justCompositionEndedRef: React.RefObject<boolean>;
}

/**
 * ノードの編集欄でのキー操作。何をするかは resolveEditKeyAction で決め、ここでは実行だけを行う。
 * effect を持たないため、useNodeTextEditor の中のどこで呼んでも、編集開始の処理の順番に影響しない
 */
export function useNodeEditKeyDown({
  node,
  isRoot,
  editText,
  setEditText,
  textareaRef,
  autoResize,
  isComposingRef,
  justCompositionEndedRef,
  onFinishEdit,
  onFinishEditAndAddSibling,
  onFinishEditAndAddChild,
  onAddSibling,
  onAddChild,
}: UseNodeEditKeyDownParams) {
  /** カーソル位置に改行を入れる */
  const insertNewline = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const val = textarea.value;
    setEditText(val.substring(0, start) + '\n' + val.substring(end));
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 1;
        autoResize();
      }
    }, 0);
  };

  return (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const action = resolveEditKeyAction({
      key: e.key,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
      keyCode: e.keyCode,
      isComposing: e.nativeEvent.isComposing || !!isComposingRef.current,
      justCompositionEnded: !!justCompositionEndedRef.current,
      isRoot,
      hasText: !!editText.trim(),
    });
    if (action.type === 'none') return;
    if (action.type === 'imeConfirm') {
      justCompositionEndedRef.current = false;
      return;
    }
    if (action.type === 'guardUndo') {
      // キャンバスの Undo には流さない。空のときはブラウザの Undo も止める
      if (action.preventDefault) e.preventDefault();
      e.stopPropagation();
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    const textToSave = editText.trim();
    switch (action.type) {
      case 'insertNewline':
        insertNewline();
        return;
      case 'commit':
        onFinishEdit(node.id, textToSave);
        return;
      case 'commitAndAddSibling':
        if (onFinishEditAndAddSibling) {
          onFinishEditAndAddSibling(node.id, textToSave, action.position);
        } else {
          onFinishEdit(node.id, textToSave);
          onAddSibling(node.id, action.position);
        }
        return;
      case 'commitAndAddChild':
        if (onFinishEditAndAddChild) {
          onFinishEditAndAddChild(node.id, textToSave);
        } else {
          onFinishEdit(node.id, textToSave);
          onAddChild(node.id);
        }
        return;
      case 'cancel':
        // 元の文字列に戻す。新しく作った空のノードは '' で確定して削除させる
        onFinishEdit(node.id, node.text && node.text.trim() ? node.text : '');
        return;
    }
  };
}
