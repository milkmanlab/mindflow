import { test, expect, type Page } from '@playwright/test';
import { nodeTexts, openApp, overflowingNodes, selectNode } from './helpers';

// 推定したノードの大きさ（nodeDimensions.ts）より実際の文字が広いと、文字が箱からはみ出す。
// 過去にずれたもの（全角・半角・絵文字・ギリシャ文字・記号）を、実際の描画で測る。
// 欧文は同梱フォントの字幅の表で見積もるので、環境によらず実際の幅とそろう（書体ごとの確認は font.e2e.ts）。
// 和文・絵文字は OS のフォントで描かれるので、ここには「どの環境でも通る」現実的な文字列だけを入れる

/** アイデア 1 の下に、文字列を 1 つずつ兄弟として入れる */
async function addNodes(page: Page, samples: string[]): Promise<void> {
  await openApp(page);
  await selectNode(page, 'アイデア 1');
  await page.keyboard.press('Tab');
  for (const text of samples) {
    await page.keyboard.type(text);
    await page.keyboard.press('Enter'); // 確定して、次の兄弟へ
  }
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await nodeTexts(page)).filter((t) => samples.includes(t)).length).toBe(samples.length);
}

test('いろいろな文字を入れても、文字がノードの箱からはみ出さない', async ({ page }) => {
  await addNodes(page, [
    '日本語のノードです',
    'Hello World 日本語 mixed',
    '😀😀😀 emoji',
    'αβγδ ЖЗИК',
    '→ ① ─ ■ ★',
    'NASA WWW HELLO WORLD',
    'a long english sentence that goes on and on without any line break at all',
  ]);
  expect(await overflowingNodes(page)).toEqual([]);
});
