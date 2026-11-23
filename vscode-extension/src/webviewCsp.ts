/**
 * Webview の Content-Security-Policy を組み立てる。
 * - script-src に 'unsafe-eval' は入れない（ビルドした Webview は eval を使わない）
 * - img-src の https: は、Markdown の ![代替文](https://...) を画像として出すために残す
 * - style-src の 'unsafe-inline' は、React の style 属性（座標・枝の色）に必要
 */
export function buildWebviewCsp(cspSource: string): string {
  return [
    "default-src 'none'",
    `img-src ${cspSource} https: data: blob:`,
    `font-src ${cspSource} data:`,
    `style-src 'unsafe-inline' ${cspSource}`,
    `script-src ${cspSource}`,
  ].join('; ') + ';';
}
