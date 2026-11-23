import { describe, expect, it } from 'vitest';
import { CanvasKeyboardContext, handleEditingShortcut, isInsideMenu, isStrayTabWhileEditing, shouldIgnoreKey } from './canvasKeyboardHandlers';

/** closest だけを持つ、最小の要素のふり */
function fakeElement(options: { tagName?: string; insideMenu?: boolean } = {}): EventTarget {
  return {
    tagName: options.tagName ?? 'BUTTON',
    isContentEditable: false,
    closest: (selector: string) =>
      options.insideMenu && selector === '[data-keyboard-scope="menu"]' ? {} : null,
  } as unknown as EventTarget;
}

function keyEvent(target: EventTarget): KeyboardEvent {
  return { target, isComposing: false, keyCode: 13 } as unknown as KeyboardEvent;
}

const ctx = { editingNodeId: null, imeProxyRef: { current: null } } as unknown as CanvasKeyboardContext;

describe('メニュー内のキー操作', () => {
  it('メニューの中にフォーカスがあるときは、キャンバスのショートカットを動かさないこと', () => {
    expect(shouldIgnoreKey(keyEvent(fakeElement({ insideMenu: true })), ctx)).toBe(true);
  });

  it('メニューの外のボタンでは、これまでどおりショートカットを動かすこと', () => {
    expect(shouldIgnoreKey(keyEvent(fakeElement()), ctx)).toBe(false);
  });

  it('発生元が要素でないときは、メニューの中とみなさないこと', () => {
    expect(isInsideMenu(null)).toBe(false);
    expect(isInsideMenu({} as EventTarget)).toBe(false);
  });
});

describe('編集中の Tab', () => {
  const proxy = fakeElement({ tagName: 'TEXTAREA' });
  const editing = { editingNodeId: 'n1', imeProxyRef: { current: proxy } } as unknown as CanvasKeyboardContext;
  const tab = (target: EventTarget) => ({ ...keyEvent(target), key: 'Tab' }) as KeyboardEvent;

  it('IME のプロキシや、ボタンの上の Tab は、フォーカスを動かさないよう止めること', () => {
    expect(isStrayTabWhileEditing(tab(proxy), editing)).toBe(true);
    expect(isStrayTabWhileEditing(tab(fakeElement()), editing)).toBe(true);
  });

  it('ノードの編集欄や、ほかの入力欄の Tab は、そのままにすること', () => {
    const editor = { ...(fakeElement({ tagName: 'TEXTAREA' }) as object), classList: { contains: (c: string) => c === 'mind-node-textarea' } };
    expect(isStrayTabWhileEditing(tab(editor as unknown as EventTarget), editing)).toBe(false);
    expect(isStrayTabWhileEditing(tab(fakeElement({ tagName: 'INPUT' })), editing)).toBe(false);
  });

  it('編集中でないとき、Tab 以外のキー、メニューの中は対象にしないこと', () => {
    expect(isStrayTabWhileEditing(tab(fakeElement()), ctx)).toBe(false);
    expect(isStrayTabWhileEditing({ ...tab(fakeElement()), key: 'a' } as KeyboardEvent, editing)).toBe(false);
    expect(isStrayTabWhileEditing(tab(fakeElement({ insideMenu: true })), editing)).toBe(false);
  });
});

describe('日本語入力がオンのときの Tab', () => {
  const proxy = fakeElement({ tagName: 'TEXTAREA' });
  const idle = { editingNodeId: null, imeProxyRef: { current: proxy } } as unknown as CanvasKeyboardContext;
  const processTab = (overrides: object = {}) =>
    ({ target: proxy, key: 'Process', code: 'Tab', keyCode: 229, isComposing: false, preventDefault() {}, ...overrides }) as unknown as KeyboardEvent;

  it('変換中でなければ、プロキシで keyCode 229 の Tab もショートカットとして扱うこと', () => {
    expect(shouldIgnoreKey(processTab(), idle)).toBe(false);
  });

  it('変換中の Tab や、Tab 以外の 229 は、これまでどおり無視すること', () => {
    expect(shouldIgnoreKey(processTab({ isComposing: true }), idle)).toBe(true);
    expect(shouldIgnoreKey(processTab({ code: 'KeyA' }), idle)).toBe(true);
  });

  it('その Tab で、子ノードを追加すること', () => {
    const added: string[] = [];
    const withAdd = { ...idle, selectedNodeId: 'n1', rootId: 'root', onAddChildNode: (id: string) => added.push(id) } as unknown as CanvasKeyboardContext;
    expect(handleEditingShortcut(processTab(), withAdd)).toBe(true);
    expect(added).toEqual(['n1']);
  });
});
