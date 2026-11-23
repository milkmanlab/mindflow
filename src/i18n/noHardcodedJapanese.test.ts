import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// 画面に出る日本語が、辞書（src/i18n/ja.ts）の外に直書きされていないことを確かめる。
// TypeScript のパーサーで、文字列・テンプレートリテラル・JSX の文字だけを拾う。コメントと正規表現は対象外

const SRC_DIR = fileURLToPath(new URL('..', import.meta.url));
const JAPANESE = /[ぁ-んァ-ヶ一-龥]/;

/** 辞書そのものと、テスト用の補助は対象外 */
const EXCLUDE = ['i18n/', 'utils/tree/testHelpers.ts'];

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return collectSourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

/** ソースの中で、日本語を含む文字列・JSX の文字がある行（行番号と、その行の中身） */
export function findJapaneseLiterals(source: string, fileName = 'x.tsx'): { line: number; text: string }[] {
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const lines = source.split(/\r?\n/);
  const found = new Map<number, string>();
  const visit = (node: ts.Node) => {
    const isText =
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node) ||
      ts.isJsxText(node);
    if (isText && JAPANESE.test(node.text)) {
      // JSX の文字は、先頭の空白・改行を含むので、日本語のある行を探す
      const start = node.getStart(file);
      const base = file.getLineAndCharacterOfPosition(start).line;
      const offset = node.getText(file).split(/\r?\n/).findIndex((l) => JAPANESE.test(l));
      const line = base + Math.max(offset, 0);
      found.set(line + 1, lines[line].trim());
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return [...found].map(([line, text]) => ({ line, text }));
}

describe('画面の日本語の直書き', () => {
  it('findJapaneseLiterals が、文字列と JSX の文字だけを拾い、コメントと正規表現は拾わないこと', () => {
    const src = [
      "const a = 'あ//い'; // コメント",
      '/* 複数行',
      'コメント */',
      'const b = `う${x}え`;',
      'const c = /[ぁ]/;',
      'const d = <p title="お">か</p>;',
    ].join('\n');
    expect(findJapaneseLiterals(src).map((f) => f.line)).toEqual([1, 4, 6]);
  });

  it('src/i18n/ の外に、日本語の文字列がないこと', () => {
    const found: string[] = [];
    for (const path of collectSourceFiles(SRC_DIR)) {
      const name = relative(SRC_DIR, path).replace(/\\/g, '/');
      if (EXCLUDE.some((e) => name.startsWith(e))) continue;
      for (const { line, text } of findJapaneseLiterals(readFileSync(path, 'utf-8'), name)) {
        found.push(`${name}:${line}  ${text}`);
      }
    }
    expect(found, `辞書に移す文字列:\n${found.join('\n')}`).toEqual([]);
  });
});
