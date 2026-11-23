import { describe, it, expect } from 'vitest';
import { en } from './en';
import { ja } from './ja';

const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');

describe('英語の辞書', () => {
  const keys = Object.keys(ja) as (keyof typeof ja)[];

  it('日本語の辞書と同じキーを持つこと', () => {
    expect(Object.keys(en).sort()).toEqual([...keys].sort());
  });

  it('値が空でなく、日本語の文字が混ざっていないこと', () => {
    for (const key of keys) {
      expect(en[key], key).not.toBe('');
      expect(en[key], key).not.toMatch(/[ぁ-んァ-ヶ一-龥]/);
    }
  });

  it('差し込み（{n} など）が、日本語の辞書と同じ集合であること', () => {
    for (const key of keys) expect(placeholders(en[key]), key).toBe(placeholders(ja[key]));
  });
});
