import { describe, it, expect } from 'vitest';
import { KeyLike, isImeProcessKey, isImeToggleKey, isNonEditingKey } from './imeKeys';

const key = (overrides: Partial<KeyLike> = {}): KeyLike => ({
  key: 'a',
  code: 'KeyA',
  keyCode: 65,
  isComposing: false,
  ...overrides,
});

describe('isImeProcessKey', () => {
  it('変換中・Process・keyCode 229 を IME の処理中とみなすこと', () => {
    expect(isImeProcessKey(key({ isComposing: true }))).toBe(true);
    expect(isImeProcessKey(key({ key: 'Process' }))).toBe(true);
    expect(isImeProcessKey(key({ keyCode: 229 }))).toBe(true);
  });

  it('通常の文字キーは IME の処理中とみなさないこと', () => {
    expect(isImeProcessKey(key())).toBe(false);
  });
});

describe('isImeToggleKey', () => {
  it('半角/全角などの key を切り替えキーとみなすこと', () => {
    expect(isImeToggleKey(key({ key: 'Zenkaku', code: 'Backquote' }))).toBe(true);
    expect(isImeToggleKey(key({ key: 'Eisu', code: 'Lang2' }))).toBe(true);
  });

  it('古い keyCode（243 など）を、key が文字に見えても切り替えキーとみなすこと', () => {
    expect(isImeToggleKey(key({ key: '`', code: 'Backquote', keyCode: 243 }))).toBe(true);
  });

  it('Backquote は、IME 処理中か文字でない key のときだけ切り替えキーとみなすこと', () => {
    expect(isImeToggleKey(key({ key: '`', code: 'Backquote', keyCode: 192 }))).toBe(false);
    expect(isImeToggleKey(key({ key: '`', code: 'Backquote', keyCode: 229 }))).toBe(true);
    expect(isImeToggleKey(key({ key: 'Unidentified', code: 'Backquote', keyCode: 0 }))).toBe(true);
  });

  it('通常の文字キーは切り替えキーとみなさないこと', () => {
    expect(isImeToggleKey(key())).toBe(false);
  });
});

describe('isNonEditingKey', () => {
  it('修飾キーやファンクションキーでは編集を始めないこと', () => {
    expect(isNonEditingKey('Shift')).toBe(true);
    expect(isNonEditingKey('ContextMenu')).toBe(true);
    expect(isNonEditingKey('F5')).toBe(true);
  });

  it('文字キーでは編集を始めること', () => {
    expect(isNonEditingKey('a')).toBe(false);
    expect(isNonEditingKey('あ')).toBe(false);
  });

  it('F1〜F24 と Fn キーでは編集を始めないこと', () => {
    expect(isNonEditingKey('F1')).toBe(true);
    expect(isNonEditingKey('F12')).toBe(true);
    expect(isNonEditingKey('F24')).toBe(true);
    expect(isNonEditingKey('Fn')).toBe(true);
    expect(isNonEditingKey('FnLock')).toBe(true);
  });

  it('大文字の F では編集を始めること', () => {
    expect(isNonEditingKey('F')).toBe(false);
  });
});
