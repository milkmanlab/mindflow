import { describe, it, expect } from 'vitest';
import { buildWebviewCsp } from './webviewCsp';

describe('buildWebviewCsp', () => {
  const csp = buildWebviewCsp('vscode-webview://abc');

  it("script-src に 'unsafe-eval' を入れないこと", () => {
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).toContain('script-src vscode-webview://abc;');
  });

  it("既定をすべて拒否（default-src 'none'）から始めること", () => {
    expect(csp.startsWith("default-src 'none'")).toBe(true);
  });

  it('Markdown の https 画像と貼り付けた画像（data / blob）を表示できること', () => {
    expect(csp).toContain('img-src vscode-webview://abc https: data: blob:');
  });
});
