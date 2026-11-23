import { test, expect } from '@playwright/test';
import { INITIAL_TEXTS, nodeByText, nodeTexts, openApp, savedMarkdown, selectNode } from './helpers';

test('ノードを足して再読み込みしても、同じマップが復元される', async ({ page }) => {
  await openApp(page);
  await selectNode(page, 'アイデア 1');
  await page.keyboard.press('Tab');
  await page.keyboard.type('残るはずの子');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');

  // 自動保存（遅れて書き込まれる）を待ってから、再読み込みする
  await expect.poll(() => savedMarkdown(page)).toMatch(/^- アイデア 1 .*\n {2}- 残るはずの子 /m); // 書き出しで、子は 1 段深く入る
  await page.reload();
  await expect
    .poll(() => nodeTexts(page))
    .toEqual([...INITIAL_TEXTS.slice(0, 2), '残るはずの子', ...INITIAL_TEXTS.slice(2)]);
  // 文字の並びだけでなく、親子の関係も戻っている（右に伸びるマップなので、子は親より右にある）
  const parent = (await nodeByText(page, 'アイデア 1').boundingBox())!;
  const child = (await nodeByText(page, '残るはずの子').boundingBox())!;
  expect(child.x).toBeGreaterThan(parent.x + parent.width - 1);
});
