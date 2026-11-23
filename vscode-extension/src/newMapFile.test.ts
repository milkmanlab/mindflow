import { describe, it, expect } from 'vitest';
import { initialMapMarkdown, mapTitleOf, nextUntitledFileName, toMapFileName } from './newMapFile';

describe('toMapFileName', () => {
  it('拡張子を .mindflow.md にそろえること', () => {
    for (const input of ['foo', 'foo.md', 'foo.MD', 'foo.markdown', 'foo.mindflow.md', 'foo.MindFlow.MD', '  foo  ']) {
      expect(toMapFileName(input), input).toBe('foo.mindflow.md');
    }
  });

  it('名前の途中にある拡張子のような文字は残すこと', () => {
    expect(toMapFileName('v1.2')).toBe('v1.2.mindflow.md');
    expect(toMapFileName('a.md.b')).toBe('a.md.b.mindflow.md');
  });

  it('日本語やスペースを含む名前をそのまま使うこと', () => {
    expect(toMapFileName('企画 メモ')).toBe('企画 メモ.mindflow.md');
  });
});

describe('nextUntitledFileName', () => {
  it('空いていれば 1 番を返すこと', () => {
    expect(nextUntitledFileName([])).toBe('Untitled-1.mindflow.md');
    expect(nextUntitledFileName(['a.md', 'notes.mindflow.md'])).toBe('Untitled-1.mindflow.md');
  });

  it('使われている番号を飛ばし、空いている最小の番号を使うこと', () => {
    expect(nextUntitledFileName(['Untitled-1.mindflow.md'])).toBe('Untitled-2.mindflow.md');
    expect(nextUntitledFileName(['Untitled-1.mindflow.md', 'Untitled-3.mindflow.md'])).toBe('Untitled-2.mindflow.md');
  });

  it('大文字小文字を区別せずに避けること', () => {
    expect(nextUntitledFileName(['UNTITLED-1.MINDFLOW.MD'])).toBe('Untitled-2.mindflow.md');
  });

  it('元になる語を指定できること', () => {
    expect(nextUntitledFileName(['無題-1.mindflow.md'], '無題')).toBe('無題-2.mindflow.md');
  });
});

describe('mapTitleOf / initialMapMarkdown', () => {
  it('ファイル名から拡張子を除いた名前を取り出すこと', () => {
    expect(mapTitleOf('foo.mindflow.md')).toBe('foo');
    expect(mapTitleOf('企画 メモ.mindflow.md')).toBe('企画 メモ');
  });

  it('ルートの見出しだけの Markdown を返すこと', () => {
    expect(initialMapMarkdown('foo.mindflow.md')).toBe('# foo\n');
  });
});
