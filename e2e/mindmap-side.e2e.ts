import { test, expect } from '@playwright/test';
import { collectPageErrors, nodeByText, nodes } from './helpers';

const STORAGE_KEY = 'mindflow_current_doc_md_v1';

/** 子のない、放射状（左右に展開）のマップを最初から開く */
async function openEmptyMindMap(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript(
    ([key, md]) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, md);
    },
    [STORAGE_KEY, '---\nlayoutType: mindmap\n---\n# 中心\n'] as const
  );
  await page.goto('/');
  await expect(nodes(page).first()).toBeVisible();
}

/** ノードの中心の x 座標が、ルートより右（'right'）か左（'left'）か */
async function sideOfRoot(page: import('@playwright/test').Page, text: string): Promise<'left' | 'right'> {
  const rootBox = (await nodeByText(page, '中心').boundingBox())!;
  const box = (await nodeByText(page, text).boundingBox())!;
  return box.x + box.width / 2 > rootBox.x + rootBox.width / 2 ? 'right' : 'left';
}

test.describe('放射状のマップで、ルートの子を足す側（#175）', () => {
  test('ルートで Tab、続けて Enter で足すと、右に 5 本、次に左に 5 本、そのあとは交互になる', async ({ page }) => {
    const errors = collectPageErrors(page);
    await openEmptyMindMap(page);
    await nodeByText(page, '中心').click();

    const names = Array.from({ length: 12 }, (_, i) => `枝${i + 1}`);
    await page.keyboard.press('Tab');
    for (const name of names) {
      await page.keyboard.type(name);
      await page.keyboard.press('Enter'); // 確定して、次の兄弟の下書きが始まる
    }
    await page.keyboard.press('Escape'); // 空の下書きは捨てられる

    const sides = [];
    for (const name of names) sides.push(await sideOfRoot(page, name));
    expect(sides).toEqual([
      ...Array(5).fill('right'),
      ...Array(5).fill('left'),
      'right',
      'left',
    ]);
    expect(errors).toEqual([]);
  });

  test('右の途中のノードで Enter を押すと、同じ右側のすぐ後ろに入る', async ({ page }) => {
    await openEmptyMindMap(page);
    await nodeByText(page, '中心').click();
    await page.keyboard.press('Tab');
    for (const name of ['枝1', '枝2', '枝3']) {
      await page.keyboard.type(name);
      await page.keyboard.press('Enter');
    }
    await page.keyboard.press('Escape');
    // 5 本そろう前に、途中の枝 1 から Enter
    await nodeByText(page, '枝1').click();
    await page.keyboard.press('Enter');
    await page.keyboard.type('割り込み');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');

    expect(await sideOfRoot(page, '割り込み')).toBe('right');
    const y = async (t: string) => (await nodeByText(page, t).boundingBox())!.y;
    expect(await y('枝1')).toBeLessThan(await y('割り込み'));
    expect(await y('割り込み')).toBeLessThan(await y('枝2'));
  });
});
