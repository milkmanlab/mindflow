import { ja } from './ja';
import { en } from './en';

// 画面の文字列を引く。言語は読み込み時に 1 回だけ決まる前提のため、ただの関数にしている
// （ライブラリも React の Context も使わない）。キーの打ち間違いは MessageKey の型エラーになる

export type MessageKey = keyof typeof ja;
export type MessageParams = Record<string, string | number>;
export type Locale = 'ja' | 'en';

let cachedLocale: Locale | null = null;

/**
 * 画面の言語を決める。VS Code では、拡張ホストが <html data-mindflow-locale> に入れた値（設定 mindflow.language を反映）。
 * ブラウザ単体の開発モードでは navigator.language。最初の呼び出しで決めて覚える
 */
function detectLocale(): Locale {
  if (typeof document !== 'undefined') {
    const fromHost = document.documentElement?.getAttribute('data-mindflow-locale');
    if (fromHost === 'ja' || fromHost === 'en') return fromHost;
  }
  const language = typeof navigator !== 'undefined' ? navigator.language : '';
  return language.toLowerCase().startsWith('ja') ? 'ja' : 'en';
}

/** 今の言語 */
export function getLocale(): Locale {
  if (cachedLocale === null) cachedLocale = detectLocale();
  return cachedLocale;
}

/** テスト用: 言語を決め直す（null で、次の getLocale() が判定し直す） */
export function setLocaleForTest(locale: Locale | null): void {
  cachedLocale = locale;
}

/** 文字列がメッセージのキーかどうか（キー名と、そのまま出す文字が混ざる表で見分けるときに使う） */
export function isMessageKey(value: string): value is MessageKey {
  return Object.prototype.hasOwnProperty.call(ja, value);
}

/** キーに対応する文字列を返す。`{n}` のような差し込みを params で置き換える */
export function t(key: MessageKey, params?: MessageParams): string {
  const dictionary: Record<MessageKey, string> = getLocale() === 'en' ? en : ja;
  const template = dictionary[key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
  );
}
