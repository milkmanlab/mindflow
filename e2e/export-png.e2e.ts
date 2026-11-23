import { test, expect, type Page } from '@playwright/test';
import { collectPageErrors, nodeByText, nodes } from './helpers';

// PNG の書き出しは、SVG を `<img>` に読み込んで canvas に描く（exportService.ts）。`<img>` の SVG はページのフォントを使えないので、
// SVG の中に埋め込んだ同梱フォント（exportUtils.ts の @font-face）が、描く時点で効いていなければならない。
// 効いていないと、PNG は画面と違うフォント（OS の代わりのフォント）で描かれる。
// ここでは、画面の操作で書き出した PNG が、次の 2 つの描画のどちらと一致するかを調べる。
//   ・フォントを埋め込んだ SVG を描いた結果 … 一致すること
//   ・フォントを抜いた SVG を描いた結果   … 一致しないこと（一致したら、埋め込みが効いていない）

const STORAGE_KEY = 'mindflow_current_doc_md_v1';

const markdownWithFont = (fontFamily: string) =>
  `---\ntitle: png\nfontFamily: ${fontFamily}\nlayoutType: tree-right\n---\n\n# Mindflow Root\n\n- Wave AVATAR office fjord 123\n- italic Quick brown fox <!-- mindflow:{"italic":true} -->\n`;

async function openWithFont(page: Page, fontFamily: string): Promise<void> {
  await page.addInitScript(
    ([key, md]) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, md);
    },
    [STORAGE_KEY, markdownWithFont(fontFamily)] as const
  );
  await page.goto('/');
  await expect(nodeByText(page, 'Wave AVATAR office fjord 123')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

/** 画面の操作で PNG を書き出し、ダウンロードされたファイルの base64 を返す */
async function exportPngViaUi(page: Page): Promise<string> {
  await page.locator('#btn-export-menu').click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'PNG で保存' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/_mindmap\.png$/);
  const path = await download.path();
  const { readFileSync } = await import('node:fs');
  return readFileSync(path).toString('base64');
}

/**
 * 同じマップの SVG（generateSvgMarkup）を、exportService.ts の PNG と同じ手順（data URL → img → canvas、2 倍）で描いた結果の base64。
 * withoutFonts が真のときは、埋め込んだ @font-face（<defs>）を抜いた SVG を描く
 */
async function renderPngInPage(page: Page, options: { withoutFonts: boolean }): Promise<string> {
  return page.evaluate(async ({ withoutFonts }) => {
    // 開発サーバー（Vite）が配る、アプリと同じモジュール。パスを変数にして、e2e の型チェックで解決しないようにする
    const load = (path: string) => import(/* @vite-ignore */ path);
    const { markdownToMindMap } = (await load('/src/utils/markdownSync.ts')) as {
      markdownToMindMap: (md: string) => unknown;
    };
    const { calculateLayout } = (await load('/src/utils/layout.ts')) as {
      calculateLayout: (map: unknown) => { bounds: { width: number; height: number } };
    };
    const { generateSvgMarkup, getExportSize } = (await load('/src/utils/exportUtils.ts')) as {
      generateSvgMarkup: (map: unknown, layout: unknown) => string;
      getExportSize: (layout: unknown) => { width: number; height: number };
    };

    const md = localStorage.getItem('mindflow_current_doc_md_v1')!;
    const map = markdownToMindMap(md);
    const layout = calculateLayout(map);
    let svg = generateSvgMarkup(map, layout);
    if (withoutFonts) svg = svg.replace(/<defs>[\s\S]*?<\/defs>/, '');
    const { width, height } = getExportSize(layout);

    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = height * 2;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(2, 2);
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('SVG を読み込めませんでした'));
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    });
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
  }, options);
}

for (const fontFamily of ['sans', 'serif', 'mono']) {
  test(`${fontFamily}: 書き出した PNG は、埋め込んだ同梱フォントで描かれる（フォントを抜いた SVG の描画とは違う）`, async ({
    page,
  }) => {
    const errors = collectPageErrors(page);
    await openWithFont(page, fontFamily);
    await expect(nodes(page)).toHaveCount(3);

    const exported = await exportPngViaUi(page);
    const withFonts = await renderPngInPage(page, { withoutFonts: false });
    const withoutFonts = await renderPngInPage(page, { withoutFonts: true });

    // 手順の写しが正しいこと（画面の操作で書き出した PNG と、ページの中で同じ手順で描いた PNG が、1 バイトも違わない）
    expect(exported.length).toBeGreaterThan(1000);
    expect(exported === withFonts).toBe(true);
    // 埋め込んだフォントが効いていること（抜くと絵が変わる）
    expect(exported === withoutFonts).toBe(false);
    expect(errors).toEqual([]);
  });
}
