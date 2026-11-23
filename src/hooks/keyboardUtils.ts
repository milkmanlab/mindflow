/** Mac では Cmd、それ以外では Ctrl が押されているか */
export function isCmdOrCtrl(e: KeyboardEvent): boolean {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  return isMac ? e.metaKey : e.ctrlKey;
}

/**
 * ノードの編集欄と IME プロキシ以外の入力欄（プロパティバー、検索バーなど）にフォーカスがあるか。
 * ここでの入力中は、App のショートカット・Undo/Redo・画像の貼り付けを動かさない
 */
export function isExternalInputTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return (
    (['INPUT', 'TEXTAREA'].includes(el?.tagName || '') &&
      !el?.classList.contains('mind-node-textarea') &&
      !el?.dataset.imeProxy) ||
    Boolean(el?.isContentEditable)
  );
}
