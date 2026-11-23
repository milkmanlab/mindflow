import React from 'react';
import { useDraftValue } from './useDraftValue';

/** 入力欄の文字を保存する値にする（前後の空白を除き、空なら undefined） */
export const normalizeText = (text: string): string | undefined => text.trim() || undefined;

/** 下書きを保存してよいか。保存済みの値と同じなら、変更の履歴を増やさないために保存しない */
export function shouldCommit(draft: string, saved: string | undefined): boolean {
  return normalizeText(draft) !== (saved || undefined);
}

/** キー入力が「確定」の操作か。IME の変換を確定する Enter は含めない。複数行の入力欄は Ctrl（Mac は Meta）+ Enter のみ */
export function isCommitKey(
  e: { key: string; ctrlKey: boolean; metaKey: boolean; isComposing?: boolean; keyCode?: number },
  multiline: boolean
): boolean {
  if (e.isComposing || e.keyCode === 229) return false;
  if (e.key !== 'Enter') return false;
  return multiline ? e.ctrlKey || e.metaKey : true;
}

const stopPropagation = (e: React.SyntheticEvent) => e.stopPropagation();

/**
 * 文字を打つ入力欄の下書きと、確定の仕方。入力欄から離れたとき・Enter（複数行は Ctrl+Enter）で onCommit を呼ぶ。
 * キー入力と IME の変換は、キャンバスのショートカットに伝えない
 */
export function useCommittedText(options: {
  value: string | undefined;
  /** 選択中のノードの id。変わったら下書きを value に戻す */
  resetKey: string | undefined;
  multiline?: boolean;
  onCommit: (value: string | undefined) => void;
}) {
  const { value, resetKey, multiline = false, onCommit } = options;
  const [draft, setDraft] = useDraftValue(value || '', resetKey);

  const commit = () => {
    if (shouldCommit(draft, value)) onCommit(normalizeText(draft));
  };

  const inputProps = {
    value: draft,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
    onBlur: commit,
    onKeyDown: (e: React.KeyboardEvent) => {
      e.stopPropagation();
      if (isCommitKey({ ...e, isComposing: e.nativeEvent.isComposing }, multiline)) {
        e.preventDefault();
        commit();
      }
    },
    onCompositionStart: stopPropagation,
    onCompositionEnd: stopPropagation,
  };

  return { draft, setDraft, inputProps };
}
