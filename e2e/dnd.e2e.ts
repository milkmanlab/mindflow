import { test, expect } from '@playwright/test';
import { collectPageErrors, nodeByText, openApp, savedMarkdown } from './helpers';

test('兄弟のノードを別のノードへドラッグすると、その子になる', async ({ page }) => {
  const errors = collectPageErrors(page);
  await openApp(page);
  const source = (await nodeByText(page, 'アイデア 3').boundingBox())!;
  const target = (await nodeByText(page, 'アイデア 1').boundingBox())!;

  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  // 何段階かに分けて動かす（ドラッグの開始と、ドロップ先の判定が走るように）
  await page.mouse.move(source.x + source.width / 2 + 12, source.y + source.height / 2 - 12, { steps: 4 });
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 12 });
  await page.mouse.up();

  // 保存された Markdown で、親子の関係を確かめる（アイデア 1 の下に、1 段深く入る）
  await expect.poll(() => savedMarkdown(page)).toMatch(/^- アイデア 1 .*\n {2}- アイデア 3 /m);
  expect(errors).toEqual([]);
});
