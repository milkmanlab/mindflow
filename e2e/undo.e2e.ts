import { test, expect } from '@playwright/test';
import { INITIAL_TEXTS, collectPageErrors, nodeTexts, openApp, savedMarkdown, selectNode } from './helpers';

test.describe('Undo/Redo', () => {
  test('追加を Ctrl+Z で戻し、Ctrl+Shift+Z でやり直せる。空のノードは復活しない', async ({ page }) => {
    const errors = collectPageErrors(page);
    await openApp(page);
    await selectNode(page, 'アイデア 1');
    await page.keyboard.press('Tab');
    await page.keyboard.type('子ノード');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');
    const added = [...INITIAL_TEXTS.slice(0, 2), '子ノード', ...INITIAL_TEXTS.slice(2)];
    await expect.poll(() => nodeTexts(page)).toEqual(added);

    await page.keyboard.press('Control+z');
    await expect.poll(() => nodeTexts(page)).toEqual(INITIAL_TEXTS);

    await page.keyboard.press('Control+Shift+z');
    await expect.poll(() => nodeTexts(page)).toEqual(added);
    expect(errors).toEqual([]);
  });

  test('削除を Ctrl+Z で戻せる', async ({ page }) => {
    const errors = collectPageErrors(page);
    await openApp(page);
    await selectNode(page, 'アイデア 3');
    await page.keyboard.press('Delete');
    await expect.poll(() => nodeTexts(page)).toEqual(INITIAL_TEXTS.filter((t) => t !== 'アイデア 3'));

    await page.keyboard.press('Control+z');
    await expect.poll(() => nodeTexts(page)).toEqual(INITIAL_TEXTS);
    expect(errors).toEqual([]);
  });

  test('追加を戻すと、追加する前に選んでいたノードが選択に戻り、続けて子を足せる', async ({ page }) => {
    const errors = collectPageErrors(page);
    await openApp(page);
    await selectNode(page, 'アイデア 4');
    await page.keyboard.press('Tab');
    await page.keyboard.type('一時');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+z');
    await expect.poll(() => nodeTexts(page)).toEqual(INITIAL_TEXTS);

    // 消えたノードが選択されたままだと、Tab は何も起こさない。選択が戻っていれば、アイデア 4 の子が足せる
    await page.keyboard.press('Tab');
    await page.keyboard.type('戻したあとの子');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');
    await expect.poll(() => savedMarkdown(page)).toMatch(/^- アイデア 4 .*\n {2}- 戻したあとの子 /m);
    expect(await savedMarkdown(page)).not.toContain('一時');
    expect(errors).toEqual([]);
  });

  test('削除を戻すと、そのノードが選択に戻り、続けて子を足せる', async ({ page }) => {
    const errors = collectPageErrors(page);
    await openApp(page);
    await selectNode(page, 'アイデア 3');
    await page.keyboard.press('Delete');
    await page.keyboard.press('Control+z');
    await expect.poll(() => nodeTexts(page)).toEqual(INITIAL_TEXTS);

    await page.keyboard.press('Tab');
    await page.keyboard.type('復活した子');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');
    await expect.poll(() => savedMarkdown(page)).toMatch(/^- アイデア 3 .*\n {2}- 復活した子 /m);
    expect(errors).toEqual([]);
  });
});
