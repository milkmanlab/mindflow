import { describe, it, expect } from 'vitest';
import { errorMessage } from './errorMessage';

describe('errorMessage', () => {
  it('Error はメッセージを返し、それ以外は文字列にすること', () => {
    expect(errorMessage(new Error('失敗'))).toBe('失敗');
    expect(errorMessage('text')).toBe('text');
    expect(errorMessage(42)).toBe('42');
  });
});
