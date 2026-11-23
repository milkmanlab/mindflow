import { describe, it, expect } from 'vitest';
import { EditKeyInput, resolveEditKeyAction } from './nodeEditKeys';

const key = (k: string, overrides: Partial<EditKeyInput> = {}): EditKeyInput => ({
  key: k,
  shiftKey: false,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  keyCode: 0,
  isComposing: false,
  justCompositionEnded: false,
  isRoot: false,
  hasText: true,
  ...overrides,
});

describe('resolveEditKeyAction', () => {
  describe('Enter', () => {
    it('Enter で後ろに、Shift+Enter で前に兄弟を追加すること', () => {
      expect(resolveEditKeyAction(key('Enter'))).toEqual({ type: 'commitAndAddSibling', position: 'after' });
      expect(resolveEditKeyAction(key('Enter', { shiftKey: true }))).toEqual({
        type: 'commitAndAddSibling',
        position: 'before',
      });
    });

    it('ルートの Enter は確定だけで、兄弟を追加しないこと', () => {
      expect(resolveEditKeyAction(key('Enter', { isRoot: true }))).toEqual({ type: 'commit' });
    });

    it('Alt / Ctrl / Cmd+Enter は改行すること（ルートでも）', () => {
      expect(resolveEditKeyAction(key('Enter', { altKey: true }))).toEqual({ type: 'insertNewline' });
      expect(resolveEditKeyAction(key('Enter', { ctrlKey: true }))).toEqual({ type: 'insertNewline' });
      expect(resolveEditKeyAction(key('Enter', { metaKey: true, isRoot: true }))).toEqual({ type: 'insertNewline' });
    });

    it('変換中・keyCode 229・確定直後の Enter は、変換の確定として扱うこと', () => {
      expect(resolveEditKeyAction(key('Enter', { isComposing: true }))).toEqual({ type: 'imeConfirm' });
      expect(resolveEditKeyAction(key('Enter', { keyCode: 229 }))).toEqual({ type: 'imeConfirm' });
      expect(resolveEditKeyAction(key('Enter', { justCompositionEnded: true }))).toEqual({ type: 'imeConfirm' });
    });

    it('変換中の判定は、改行の判定より優先されること', () => {
      expect(resolveEditKeyAction(key('Enter', { isComposing: true, metaKey: true }))).toEqual({ type: 'imeConfirm' });
    });
  });

  describe('Tab', () => {
    it('Tab で子を追加すること', () => {
      expect(resolveEditKeyAction(key('Tab'))).toEqual({ type: 'commitAndAddChild' });
    });

    it('変換中・確定直後の Tab は、変換の確定として扱うこと', () => {
      expect(resolveEditKeyAction(key('Tab', { isComposing: true }))).toEqual({ type: 'imeConfirm' });
      expect(resolveEditKeyAction(key('Tab', { justCompositionEnded: true }))).toEqual({ type: 'imeConfirm' });
    });
  });

  describe('Escape', () => {
    it('Esc で編集を取り消すこと', () => {
      expect(resolveEditKeyAction(key('Escape'))).toEqual({ type: 'cancel' });
    });

    it('変換中の Esc は何もしないこと（IME の変換の取り消しに使う）', () => {
      expect(resolveEditKeyAction(key('Escape', { isComposing: true }))).toEqual({ type: 'none' });
      expect(resolveEditKeyAction(key('Escape', { keyCode: 229 }))).toEqual({ type: 'none' });
    });

    it('確定直後の Esc は、Enter・Tab と違って取り消しになること', () => {
      expect(resolveEditKeyAction(key('Escape', { justCompositionEnded: true }))).toEqual({ type: 'cancel' });
    });
  });

  describe('Cmd / Ctrl の組み合わせ', () => {
    it('Cmd/Ctrl+S で確定すること', () => {
      expect(resolveEditKeyAction(key('s', { metaKey: true }))).toEqual({ type: 'commit' });
      expect(resolveEditKeyAction(key('S', { ctrlKey: true }))).toEqual({ type: 'commit' });
    });

    it('Cmd/Ctrl+Z・Y は、文字があればブラウザの Undo に任せること', () => {
      expect(resolveEditKeyAction(key('z', { metaKey: true }))).toEqual({ type: 'guardUndo', preventDefault: false });
      expect(resolveEditKeyAction(key('y', { ctrlKey: true }))).toEqual({ type: 'guardUndo', preventDefault: false });
    });

    it('Cmd/Ctrl+Z は、空のときブラウザの Undo も止めること', () => {
      expect(resolveEditKeyAction(key('z', { metaKey: true, hasText: false }))).toEqual({
        type: 'guardUndo',
        preventDefault: true,
      });
    });
  });

  it('それ以外のキーは何もしないこと', () => {
    expect(resolveEditKeyAction(key('a'))).toEqual({ type: 'none' });
    expect(resolveEditKeyAction(key('s'))).toEqual({ type: 'none' });
    expect(resolveEditKeyAction(key('ArrowLeft'))).toEqual({ type: 'none' });
  });
});
