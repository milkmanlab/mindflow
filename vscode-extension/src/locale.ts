// 画面・通知の言語を決める。vscode に依存しない純粋関数にして、単体テストできるようにしている

export type Locale = 'ja' | 'en';

/** 設定 mindflow.language の値 */
export type LanguageSetting = 'auto' | 'ja' | 'en';

/**
 * 設定と VS Code の表示言語から、使う言語を決める。
 * `auto`（または知らない値）は、表示言語が日本語なら日本語、それ以外は英語
 */
export function resolveLocale(setting: string | undefined, vscodeLanguage: string): Locale {
  if (setting === 'ja' || setting === 'en') return setting;
  return vscodeLanguage.toLowerCase().startsWith('ja') ? 'ja' : 'en';
}
