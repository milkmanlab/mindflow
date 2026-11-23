import { describe, it, expect } from 'vitest';
import { resolveLocale } from './locale';

describe('resolveLocale', () => {
  it('設定が ja / en のときは、VS Code の表示言語によらずその言語になること', () => {
    expect(resolveLocale('ja', 'en')).toBe('ja');
    expect(resolveLocale('ja', 'ja')).toBe('ja');
    expect(resolveLocale('en', 'ja')).toBe('en');
    expect(resolveLocale('en', 'en')).toBe('en');
  });

  it('auto のときは、表示言語が日本語なら日本語、それ以外は英語になること', () => {
    expect(resolveLocale('auto', 'ja')).toBe('ja');
    expect(resolveLocale('auto', 'JA')).toBe('ja');
    expect(resolveLocale('auto', 'en')).toBe('en');
    expect(resolveLocale('auto', 'en-US')).toBe('en');
    expect(resolveLocale('auto', 'fr')).toBe('en');
  });

  it('設定が未設定・知らない値のときは、auto と同じに扱うこと', () => {
    expect(resolveLocale(undefined, 'ja')).toBe('ja');
    expect(resolveLocale('zh', 'en')).toBe('en');
  });
});
