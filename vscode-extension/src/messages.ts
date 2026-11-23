import { Locale } from './locale';

// 拡張ホストが VS Code の通知やダイアログに出す文字列。Webview の辞書（src/i18n）とは別。
// vscode.l10n は VS Code の表示言語にしか従わず、設定 mindflow.language の上書きと食い違うため使わない

const ja = {
  'warn.selectFile': '開くMarkdownファイルを選択してください。',
  'error.openUrl': 'URLを開けませんでした: {message}',
  'dialog.save': '保存',
  'info.imageSaved': '画像を保存しました: {name}',
  'error.saveFailed': '保存に失敗しました: {message}',
  'error.fileExists': '同じ名前のファイルがすでにあります: {name}',
  'error.createFailed': 'マインドマップを作成できませんでした: {message}',
} as const;

export type HostMessageKey = keyof typeof ja;

const en: Record<HostMessageKey, string> = {
  'warn.selectFile': 'Select a Markdown file to open.',
  'error.openUrl': 'Could not open the URL: {message}',
  'dialog.save': 'Save',
  'info.imageSaved': 'Image saved: {name}',
  'error.saveFailed': 'Failed to save: {message}',
  'error.fileExists': 'A file with the same name already exists: {name}',
  'error.createFailed': 'Could not create the mind map: {message}',
};

const DICTIONARIES: Record<Locale, Record<HostMessageKey, string>> = { ja, en };

/** 通知・ダイアログの文字列を返す。`{name}` のような差し込みを params で置き換える */
export function hostMessage(locale: Locale, key: HostMessageKey, params?: Record<string, string>): string {
  const template = DICTIONARIES[locale][key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? params[name] : match
  );
}
