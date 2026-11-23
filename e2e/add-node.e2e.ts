import { test, expect } from '@playwright/test';
import { INITIAL_TEXTS, collectPageErrors, nodeTexts, nodes, openApp, pressKeyBurst, selectNode } from './helpers';

test.describe('ノードの追加', () => {
  test('Tab で子を足して文字を入れ、編集を終えると、空のノードが残らない', async ({ page }) => {
    const errors = collectPageErrors(page);
    await openApp(page);
    await selectNode(page, 'アイデア 1');
    await page.keyboard.press('Tab');
    await page.keyboard.type('子ノード');
    await page.keyboard.press('Enter'); // 確定して、兄弟の下書きが始まる
    await page.keyboard.press('Escape'); // 空の下書きは捨てられる

    await expect.poll(() => nodeTexts(page)).toEqual([...INITIAL_TEXTS.slice(0, 2), '子ノード', ...INITIAL_TEXTS.slice(2)]);
    expect(errors).toEqual([]);
  });

  test('Tab を続けて何度も押しても、空のノードが残らない（#163）', async ({ page }) => {
    const errors = collectPageErrors(page);
    await openApp(page);
    await selectNode(page, 'アイデア 2');
    await pressKeyBurst(page, 'Tab', 5); // 描画を挟まず、続けて 5 回
    await page.keyboard.press('Escape');

    await expect.poll(async () => (await nodeTexts(page)).filter((t) => t === '').length).toBe(0);
    await expect(nodes(page)).toHaveCount(INITIAL_TEXTS.length);
    expect(errors).toEqual([]);
  });
});
