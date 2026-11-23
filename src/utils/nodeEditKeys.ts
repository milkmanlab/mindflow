/** 編集中のキー操作の判定に使う値（DOM に依存しないため、必要なものだけを渡す） */
export interface EditKeyInput {
  key: string;
  shiftKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  keyCode: number;
  /** ネイティブの isComposing、または compositionstart〜compositionend の間 */
  isComposing: boolean;
  /** 変換を確定した直後（compositionend と同じタスク内） */
  justCompositionEnded: boolean;
  isRoot: boolean;
  /** 編集中の文字列が空白以外を含むか */
  hasText: boolean;
}

export type EditKeyAction =
  /** 何もしない（ブラウザ既定の動作に任せる） */
  | { type: 'none' }
  /** 変換を確定する Enter / Tab。ノードの追加はせず、確定直後のフラグだけ下ろす */
  | { type: 'imeConfirm' }
  /** Alt / Ctrl / Cmd+Enter：ノード内で改行する */
  | { type: 'insertNewline' }
  /** ルートの Enter、Cmd/Ctrl+S：確定する */
  | { type: 'commit' }
  /** Enter（後ろ）/ Shift+Enter（前）：確定して兄弟を追加する */
  | { type: 'commitAndAddSibling'; position: 'before' | 'after' }
  /** Tab：確定して子を追加する */
  | { type: 'commitAndAddChild' }
  /** Esc：編集を取り消す */
  | { type: 'cancel' }
  /** Cmd/Ctrl+Z・Y：キャンバスの Undo に流さない。空のときはブラウザの Undo も止める */
  | { type: 'guardUndo'; preventDefault: boolean };

/**
 * IME で変換中のキーか。
 * Enter と Tab は、変換を確定した直後のキーも変換中として扱う（確定の Enter で兄弟が追加されないように）。
 * Esc は確定直後を含めない。
 */
function isImeKey(input: EditKeyInput, includeJustEnded: boolean): boolean {
  return input.isComposing || input.keyCode === 229 || (includeJustEnded && input.justCompositionEnded);
}

/** 編集中のキー操作で何をするかを決める。判定は上から順に行う */
export function resolveEditKeyAction(input: EditKeyInput): EditKeyAction {
  const { key, shiftKey, altKey, ctrlKey, metaKey, isRoot, hasText } = input;
  const cmdOrCtrl = ctrlKey || metaKey;

  if (key === 'Enter') {
    if (isImeKey(input, true)) return { type: 'imeConfirm' };
    if (altKey || ctrlKey || metaKey) return { type: 'insertNewline' };
    // ルートには兄弟がないので、確定して編集を終えるだけ
    if (isRoot) return { type: 'commit' };
    return { type: 'commitAndAddSibling', position: shiftKey ? 'before' : 'after' };
  }
  if (key === 'Tab') {
    if (isImeKey(input, true)) return { type: 'imeConfirm' };
    return { type: 'commitAndAddChild' };
  }
  if (key === 'Escape') {
    if (isImeKey(input, false)) return { type: 'none' };
    return { type: 'cancel' };
  }
  if (cmdOrCtrl && key.toLowerCase() === 's') {
    return { type: 'commit' };
  }
  if (cmdOrCtrl && (key.toLowerCase() === 'z' || key.toLowerCase() === 'y')) {
    return { type: 'guardUndo', preventDefault: !hasText };
  }
  return { type: 'none' };
}
