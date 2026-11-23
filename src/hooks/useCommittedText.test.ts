import { describe, expect, it } from 'vitest';
import { isCommitKey, normalizeText, shouldCommit } from './useCommittedText';

const key = (over: Partial<Parameters<typeof isCommitKey>[0]> = {}) => ({ key: 'Enter', ctrlKey: false, metaKey: false, ...over });

describe('normalizeText', () => {
  it('前後の空白を除き、空なら undefined にすること', () => {
    expect(normalizeText('  a ')).toBe('a');
    expect(normalizeText('   ')).toBeUndefined();
  });
});

describe('shouldCommit', () => {
  it('保存済みの値と同じなら保存しないこと', () => {
    expect(shouldCommit('a', 'a')).toBe(false);
    expect(shouldCommit(' a ', 'a')).toBe(false);
    expect(shouldCommit('', undefined)).toBe(false);
    expect(shouldCommit('  ', '')).toBe(false);
  });
  it('変わっていれば保存すること（空にして消す場合も含む）', () => {
    expect(shouldCommit('b', 'a')).toBe(true);
    expect(shouldCommit('', 'a')).toBe(true);
    expect(shouldCommit('a', undefined)).toBe(true);
  });
});

describe('isCommitKey', () => {
  it('1 行の入力欄は Enter で確定すること', () => {
    expect(isCommitKey(key(), false)).toBe(true);
    expect(isCommitKey(key({ key: 'a' }), false)).toBe(false);
  });
  it('複数行の入力欄は Ctrl / Meta + Enter だけで確定し、Enter は改行のままにすること', () => {
    expect(isCommitKey(key(), true)).toBe(false);
    expect(isCommitKey(key({ ctrlKey: true }), true)).toBe(true);
    expect(isCommitKey(key({ metaKey: true }), true)).toBe(true);
  });
  it('IME の変換中は確定しないこと', () => {
    expect(isCommitKey(key({ isComposing: true }), false)).toBe(false);
    expect(isCommitKey(key({ keyCode: 229 }), false)).toBe(false);
  });
});
