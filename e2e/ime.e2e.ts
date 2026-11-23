import { test, expect } from '@playwright/test';
import { INITIAL_TEXTS, collectPageErrors, nodeTexts, nodes, openApp, pressTabWithImeOn, selectNode, typeWithIme } from './helpers';

test.describe('日本語入力（IME）', () => {
  test('ノードを選んだだけの状態で変換を始めると、編集が始まり、確定するとその文字になる', async ({ page, context }) => {
    const errors = collectPageErrors(page);
    await openApp(page);
    await selectNode(page, 'アイデア 2');

    await typeWithIme(context, page, { composing: ['に', 'にほん'], committed: '日本' });
    // 変換の途中から、ノードは編集中（入力欄がある）
    await expect(nodes(page).locator('textarea')).toHaveCount(1);
    await expect.poll(() => nodeTexts(page)).toContain('日本');

    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');
    await expect.poll(() => nodeTexts(page)).toEqual(INITIAL_TEXTS.map((t) => (t === 'アイデア 2' ? '日本' : t)));
    expect(errors).toEqual([]);
  });

  test('日本語入力がオンのとき、ノードを選んだ直後の Tab も、子ノードの追加になる（#157）', async ({ page, context }) => {
    const errors = collectPageErrors(page);
    await openApp(page);
    await selectNode(page, 'アイデア 1');

    await pressTabWithImeOn(context, page);
    // 子ノードの下書きが始まり、編集欄にフォーカスがある
    await expect(nodes(page)).toHaveCount(INITIAL_TEXTS.length + 1);
    await expect(nodes(page).locator('textarea')).toHaveCount(1);

    await page.keyboard.type('子');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');
    await expect.poll(() => nodeTexts(page)).toEqual([...INITIAL_TEXTS.slice(0, 2), '子', ...INITIAL_TEXTS.slice(2)]);
    expect(errors).toEqual([]);
  });
});
