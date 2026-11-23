import { describe, it, expect, afterEach, vi } from 'vitest';
import { t, isMessageKey, getLocale, setLocaleForTest } from './index';
import { ja } from './ja';
import { en } from './en';

afterEach(() => {
  vi.unstubAllGlobals();
  setLocaleForTest('ja');
});

describe('t', () => {
  it('日本語のとき、日本語の辞書から引くこと', () => {
    setLocaleForTest('ja');
    expect(getLocale()).toBe('ja');
    expect(t('common.delete')).toBe(ja['common.delete']);
  });

  it('英語のとき、英語の辞書から引くこと', () => {
    setLocaleForTest('en');
    expect(t('common.delete')).toBe(en['common.delete']);
    expect(t('common.delete')).toBe('Delete');
  });

  it('差し込みを置き換え、渡されなかった名前はそのまま残すこと', () => {
    setLocaleForTest('ja');
    expect(t('time.minutesAgo', { n: 3 })).toBe('3分前');
    setLocaleForTest('en');
    expect(t('time.minutesAgo', { n: 3 })).toBe('3m ago');
    expect(t('time.minutesAgo')).toBe('{n}m ago');
  });

  it('isMessageKey が、辞書にあるキーだけを true にすること', () => {
    expect(isMessageKey('common.delete')).toBe(true);
    expect(isMessageKey('Tab')).toBe(false);
    expect(isMessageKey('toString')).toBe(false);
  });

  it('<html data-mindflow-locale> があれば、それに従うこと', () => {
    vi.stubGlobal('document', { documentElement: { getAttribute: () => 'en' } });
    setLocaleForTest(null);
    expect(getLocale()).toBe('en');
  });

  it('<html> に指定がなければ、navigator.language が日本語のときだけ日本語になること', () => {
    vi.stubGlobal('document', { documentElement: { getAttribute: () => null } });
    vi.stubGlobal('navigator', { language: 'ja-JP' });
    setLocaleForTest(null);
    expect(getLocale()).toBe('ja');
    vi.stubGlobal('navigator', { language: 'fr-FR' });
    setLocaleForTest(null);
    expect(getLocale()).toBe('en');
  });
});
