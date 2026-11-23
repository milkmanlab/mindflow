// 新規マインドマップのファイル名と初期内容。vscode に依存しない純粋関数にして、単体テストできるようにしている

/** マインドマップ専用の拡張子（中身は普通の Markdown） */
export const MAP_FILE_EXTENSION = '.mindflow.md';

/**
 * 新規ファイル名の元になる語。画面の言語によらず固定にする
 * （日本語のファイル名は、環境によって文字化けすることがある）
 */
export const UNTITLED_BASE_NAME = 'Untitled';

// 末尾の拡張子。`foo.mindflow.md` は `.mindflow.md` を 1 つだけ外す（`.md` だけを外して `foo.mindflow` を残さない）
const KNOWN_EXTENSION = /\.(mindflow\.md|md|markdown)$/i;

/** 入力から、前後の空白と末尾の拡張子を除いた名前を取り出す */
function baseNameOf(input: string): string {
  return input.trim().replace(KNOWN_EXTENSION, '').trim();
}

/** 入力を、保存するファイル名（`○○.mindflow.md`）にする */
export function toMapFileName(input: string): string {
  return baseNameOf(input) + MAP_FILE_EXTENSION;
}

/**
 * 空いている最小の番号を付けた名前（`Untitled-1.mindflow.md`、`Untitled-2.mindflow.md`、…）を返す。
 * 既存の名前とは、大文字小文字を区別せずに比べる（macOS / Windows のファイルシステムに合わせる）
 */
export function nextUntitledFileName(existingNames: Iterable<string>, baseName: string = UNTITLED_BASE_NAME): string {
  const taken = new Set<string>();
  for (const name of existingNames) taken.add(name.toLowerCase());
  for (let n = 1; ; n++) {
    const candidate = `${baseName}-${n}${MAP_FILE_EXTENSION}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
}

/** ファイル名（拡張子つき）から、マップの名前（拡張子を除いたもの）を取り出す */
export function mapTitleOf(fileName: string): string {
  return baseNameOf(fileName);
}

/**
 * 新しいファイルの中身。ファイル名をルートの見出しにした 1 行だけにする。
 * フロントマターや子ノードは、最初の編集で `mindMapToMarkdown` が完全な形式で保存する
 */
export function initialMapMarkdown(fileName: string): string {
  return `# ${mapTitleOf(fileName)}\n`;
}
