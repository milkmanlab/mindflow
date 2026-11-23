import { expect, type BrowserContext, type Locator, type Page } from '@playwright/test';

/** マップのノード。プロパティバーなど、id が node- で始まるだけの別の要素は含めない */
export function nodes(page: Page): Locator {
  return page.locator('#mind-canvas-world [id^="node-"]:not(#node-properties-bar)');
}

/** 画面にあるノードの文字（上から順）。空のノードは '' になる */
export async function nodeTexts(page: Page): Promise<string[]> {
  return nodes(page).evaluateAll((els) =>
    els.map((el) => {
      const field = el.querySelector('textarea') as HTMLTextAreaElement | null;
      return ((field ? field.value : (el as HTMLElement).innerText) ?? '').trim();
    })
  );
}

/** 文字でノードを探す（id は毎回変わるので、id には頼らない） */
export function nodeByText(page: Page, text: string): Locator {
  return nodes(page).filter({ hasText: new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`) });
}

/** 初期のマップ（日本語）。画面の文言は src/i18n/ja.ts の content.* */
export const ROOT = '中心トピック';
export const IDEAS = ['アイデア 1', 'アイデア 2', 'アイデア 3', 'アイデア 4'];
export const INITIAL_TEXTS = [ROOT, ...IDEAS];

/** ページのエラー（未処理の例外）を集める。テストの最後に空であることを確かめる */
export function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

/** まっさらな状態でアプリを開く */
export async function openApp(page: Page): Promise<void> {
  await page.goto('/');
  await expect(nodes(page).first()).toBeVisible();
}

/** ノードを選ぶ（クリック） */
export async function selectNode(page: Page, text: string): Promise<void> {
  await nodeByText(page, text).click();
}

/** IME の変換を、途中の文字 → 確定の順で送る（Chrome DevTools Protocol） */
export async function typeWithIme(
  context: BrowserContext,
  page: Page,
  steps: { composing: string[]; committed: string }
): Promise<void> {
  const cdp = await context.newCDPSession(page);
  for (const text of steps.composing) {
    await cdp.send('Input.imeSetComposition', { text, selectionStart: text.length, selectionEnd: text.length });
  }
  await cdp.send('Input.insertText', { text: steps.committed });
}

/**
 * 日本語入力がオンのときの Tab を送る。ブラウザは変換中でなくても、このキーを
 * key 'Process'・keyCode 229・code 'Tab' で報告する（canvasKeyboardHandlers.ts の isIdleImeTab を参照）
 */
export async function pressTabWithImeOn(context: BrowserContext, page: Page): Promise<void> {
  const cdp = await context.newCDPSession(page);
  const base = { key: 'Process', code: 'Tab', windowsVirtualKeyCode: 229, nativeVirtualKeyCode: 229 };
  await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...base });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
}

const STORAGE_KEY = 'mindflow_current_doc_md_v1';

/** ブラウザ単体モードが localStorage に保存した Markdown（まだ保存されていなければ null） */
export async function savedMarkdown(page: Page): Promise<string | null> {
  return page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
}

/** 文字が、ノードの箱からはみ出しているノード（はみ出していなければ空） */
export async function overflowingNodes(page: Page): Promise<{ text: string; left: number; right: number }[]> {
  return page.evaluate(() => {
    const result: { text: string; left: number; right: number }[] = [];
    document.querySelectorAll('[data-node-text]').forEach((el) => {
      const box = el.closest('[id^="node-"]');
      if (!box || !el.textContent) return;
      const range = document.createRange();
      range.selectNodeContents(el);
      const text = range.getBoundingClientRect();
      const frame = box.getBoundingClientRect();
      const left = Math.round((frame.left - text.left) * 10) / 10;
      const right = Math.round((text.right - frame.right) * 10) / 10;
      if (left > 0.5 || right > 0.5) result.push({ text: el.textContent, left, right });
    });
    return result;
  });
}

/**
 * 同じキーを、画面の更新（React の描画）を挟まずに続けて送る。
 * page.keyboard.press は 1 回ごとに描画を待ってしまい、「更新前の古い状態から操作が重なる」不具合を再現できないため、
 * ブラウザの中で、1 回の処理として keydown を続けて発火する（実機のキーの自動連打に近い）
 */
export async function pressKeyBurst(page: Page, key: string, times: number): Promise<void> {
  await page.evaluate(
    ({ key, times }) => {
      const target = document.activeElement ?? document.body;
      for (let i = 0; i < times; i++) {
        target.dispatchEvent(new KeyboardEvent('keydown', { key, code: key, bubbles: true, cancelable: true }));
      }
    },
    { key, times }
  );
}
