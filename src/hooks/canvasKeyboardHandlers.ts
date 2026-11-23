import React from 'react';
import { LayoutResult } from '../types';
import { findArrowNavigationTarget, isArrowKey } from '../utils/canvasNavigation';
import { isImeProcessKey, isImeToggleKey, isNonEditingKey } from '../utils/imeKeys';

/** キーボードショートカットが参照する状態と操作 */
export interface CanvasKeyboardContext {
  rootId: string;
  layout: LayoutResult;
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  editingNodeId: string | null;
  selectedRelationshipId: string | null;
  imeProxyRef: React.RefObject<HTMLTextAreaElement | null>;
  fitToScreen: () => void;
  centerRoot: () => void;
  onSelectNode: (nodeId: string | null) => void;
  onStartEditNode: (nodeId: string, initialChar?: string) => void;
  onAddChildNode: (parentId: string) => void;
  onAddSiblingNode: (nodeId: string, position?: 'before' | 'after') => void;
  onToggleFoldNode: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onDeleteSelectedNodes?: () => void;
  onDeleteRelationship?: (relId: string) => void;
  onMoveSiblingNode?: (nodeId: string, direction: 'up' | 'down') => void;
  onOpenShortcutsModal: () => void;
}

export { isCmdOrCtrl } from './keyboardUtils';

export function isTextInput(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return ['INPUT', 'TEXTAREA'].includes(el?.tagName || '') || Boolean(el?.isContentEditable);
}

/** ルート以外のノードが選ばれているか（折りたたみ・削除・親への移動の対象になる） */
function isNonRoot(ctx: CanvasKeyboardContext, id: string | null): id is string {
  return !!id && id !== ctx.rootId;
}

/** メニューの枠に付ける印。この中にフォーカスがあるあいだは、キャンバスのショートカットを動かさない */
export const MENU_SCOPE_PROPS = { 'data-keyboard-scope': 'menu' } as const;
const MENU_SCOPE_SELECTOR = '[data-keyboard-scope="menu"]';

/** キーの発生元が、開いているメニューの中か */
export function isInsideMenu(target: EventTarget | null): boolean {
  const el = target as Element | null;
  return typeof el?.closest === 'function' && el.closest(MENU_SCOPE_SELECTOR) !== null;
}

/**
 * 日本語入力がオンのとき、ノードを選んだ直後（プロキシにフォーカスが移った直後）の最初のキーは、
 * 変換中でなくても keyCode 229・key 'Process' で届くことがある。物理キーの code が Tab で、変換中でなければ、Tab として扱う
 */
export function isIdleImeTab(e: KeyboardEvent): boolean {
  return e.code === 'Tab' && !e.isComposing;
}

/** Tab が押されたか（日本語入力がオンで 'Process' として届いた Tab を含む） */
export function isTabKey(e: KeyboardEvent): boolean {
  return e.key === 'Tab' || isIdleImeTab(e);
}

/** 入力欄での入力中・メニュー内の操作・IME の変換中は、ショートカットを動かさない */
export function shouldIgnoreKey(e: KeyboardEvent, ctx: CanvasKeyboardContext): boolean {
  const isImeProxyTarget = e.target === ctx.imeProxyRef.current;
  if (ctx.editingNodeId || (!isImeProxyTarget && isTextInput(e.target))) return true;
  if (isInsideMenu(e.target)) return true;
  // プロキシでの変換に使われたキーは、どのショートカットにも使わない
  return isImeProxyTarget && (e.isComposing || (e.keyCode === 229 && !isIdleImeTab(e)));
}

/**
 * ノードの編集中に、編集欄以外（IME のプロキシ、フォーカスのない状態、ボタン）で Tab が押されたか。
 * この Tab は誰も処理しないので、そのままだとブラウザが次の部品へフォーカスを移してしまう。
 * 編集欄（mind-node-textarea）や、プロパティバー・検索バーなどの入力欄の Tab は対象外
 */
export function isStrayTabWhileEditing(e: KeyboardEvent, ctx: CanvasKeyboardContext): boolean {
  if (!isTabKey(e) || !ctx.editingNodeId || isInsideMenu(e.target)) return false;
  if (e.target === ctx.imeProxyRef.current) return true;
  const el = e.target as HTMLElement | null;
  return !isTextInput(e.target) && !el?.classList?.contains('mind-node-textarea');
}

/** Cmd/Ctrl の組み合わせと Alt+/。処理したら true */
export function handleModifierShortcut(e: KeyboardEvent, ctx: CanvasKeyboardContext, cmdOrCtrl: boolean): boolean {
  const { selectedNodeId } = ctx;
  if (cmdOrCtrl) {
    const key = e.key.toLowerCase();
    if (key === 'z' || key === 'y') {
      // Undo/Redo は App が処理する。ここではブラウザ既定の動作を止めるだけ
      e.preventDefault();
      e.stopPropagation();
      return true;
    }
    if (e.key === '0') {
      e.preventDefault();
      ctx.fitToScreen();
      return true;
    }
    if (e.key === '1') {
      e.preventDefault();
      ctx.centerRoot();
      return true;
    }
    if (e.key === '.') {
      e.preventDefault();
      if (isNonRoot(ctx, selectedNodeId)) ctx.onToggleFoldNode(selectedNodeId);
      return true;
    }
    // それ以外の Cmd/Ctrl の組み合わせ（Cmd+Shift+矢印、Cmd+Enter など）は、後のハンドラーに回す
  }
  if (e.altKey && e.key === '/') {
    e.preventDefault();
    if (isNonRoot(ctx, selectedNodeId)) ctx.onToggleFoldNode(selectedNodeId);
    return true;
  }
  return false;
}

/** ノードの追加と編集の開始。処理したら true */
export function handleEditingShortcut(e: KeyboardEvent, ctx: CanvasKeyboardContext): boolean {
  const { selectedNodeId, rootId } = ctx;
  if (isTabKey(e)) {
    e.preventDefault();
    ctx.onAddChildNode(selectedNodeId || rootId);
    return true;
  }
  if (e.key === 'Enter') {
    // Shift+Enter は前（上）、Enter は後ろ（下）に兄弟を追加する
    e.preventDefault();
    ctx.onAddSiblingNode(selectedNodeId || rootId, e.shiftKey ? 'before' : 'after');
    return true;
  }
  if (e.key === ' ' || e.key === 'F2') {
    e.preventDefault();
    if (selectedNodeId) ctx.onStartEditNode(selectedNodeId);
    return true;
  }
  return false;
}

/** 矢印キー：Alt+↑↓ / Cmd+Shift+↑↓ は兄弟の並べ替え、それ以外は移動 */
function handleArrowKey(e: KeyboardEvent, ctx: CanvasKeyboardContext, cmdOrCtrl: boolean) {
  const { selectedNodeId, rootId } = ctx;
  if (!selectedNodeId) {
    ctx.onSelectNode(rootId);
    return;
  }
  const isVertical = e.key === 'ArrowUp' || e.key === 'ArrowDown';
  if ((e.altKey || (cmdOrCtrl && e.shiftKey)) && ctx.onMoveSiblingNode && isVertical) {
    ctx.onMoveSiblingNode(selectedNodeId, e.key === 'ArrowUp' ? 'up' : 'down');
    return;
  }
  if (!isArrowKey(e.key)) return;
  const target = findArrowNavigationTarget(ctx.layout, rootId, selectedNodeId, e.key);
  if (target) ctx.onSelectNode(target);
}

/** 選択の移動、折りたたみ、削除。処理したら true */
export function handleSelectionShortcut(e: KeyboardEvent, ctx: CanvasKeyboardContext, cmdOrCtrl: boolean): boolean {
  const { selectedNodeId, rootId, layout } = ctx;
  switch (e.key) {
    case 'Escape':
      // 親へ移動する。ルートか未選択なら選択を解除する
      e.preventDefault();
      if (isNonRoot(ctx, selectedNodeId)) {
        ctx.onSelectNode(layout.nodeMap.get(selectedNodeId)?.parentId || rootId);
      } else {
        ctx.onSelectNode(null);
      }
      return true;
    case 'Home':
      e.preventDefault();
      ctx.onSelectNode(rootId);
      ctx.centerRoot();
      return true;
    case 'End': {
      // 子の最後へ移動する
      e.preventDefault();
      if (selectedNodeId) {
        const children = layout.nodes.filter((n) => n.parentId === selectedNodeId);
        if (children.length > 0) ctx.onSelectNode(children[children.length - 1].id);
      }
      return true;
    }
    case '\\':
      e.preventDefault();
      if (isNonRoot(ctx, selectedNodeId)) ctx.onToggleFoldNode(selectedNodeId);
      return true;
    case 'Delete':
    case 'Backspace':
      if (ctx.selectedRelationshipId) {
        e.preventDefault();
        ctx.onDeleteRelationship?.(ctx.selectedRelationshipId);
      } else if (ctx.selectedNodeIds.length > 1) {
        e.preventDefault();
        ctx.onDeleteSelectedNodes?.();
      } else if (isNonRoot(ctx, selectedNodeId)) {
        e.preventDefault();
        ctx.onDeleteNode(selectedNodeId);
      }
      return true;
  }
  if (isArrowKey(e.key)) {
    e.preventDefault();
    handleArrowKey(e, ctx, cmdOrCtrl);
    return true;
  }
  return false;
}

/** ノードを選んでいないときだけ使えるキー */
export function handleNoSelectionShortcut(e: KeyboardEvent, ctx: CanvasKeyboardContext) {
  const key = e.key.toLowerCase();
  if (key === 'f') {
    e.preventDefault();
    ctx.fitToScreen();
  } else if (key === 'r') {
    e.preventDefault();
    ctx.centerRoot();
  } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
    ctx.onOpenShortcutsModal();
  }
}

/** 選択中のノードで文字を打つと、そのまま編集を始める */
export function handleTypeToEdit(e: KeyboardEvent, ctx: CanvasKeyboardContext, nodeId: string, cmdOrCtrl: boolean) {
  if (cmdOrCtrl || e.altKey || isNonEditingKey(e.key)) return;
  // IME の切り替えキーは、そのまま IME に届ける
  if (isImeToggleKey(e)) return;
  if (isImeProcessKey(e)) {
    // フォーカスがプロキシ以外にあるときの IME 入力。英字が混ざらないよう、空の状態で編集を始める
    ctx.onStartEditNode(nodeId, '');
    return;
  }
  if (e.key.length === 1) {
    e.preventDefault();
    ctx.onStartEditNode(nodeId, e.key);
  }
}
