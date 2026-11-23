import { test, expect, type Page } from '@playwright/test';
import { collectPageErrors, nodeByText, nodes } from './helpers';

// 書体（fontStyles.ts）と、同梱フォントの字幅の表による見積もり（nodeDimensions.ts）を、実際の描画で確かめる。
// 欧文は同梱フォント（Noto）で描くので、環境に入っているフォントによらず、見積もりと実際の幅がそろう

const STORAGE_KEY = 'mindflow_current_doc_md_v1';

/** 太字・斜体の組み合わせを持つ欧文のノード。ルート（既定で太字）も測る */
const SAMPLES = [
  { text: 'The quick brown fox jumps over 123', meta: '' },
  { text: 'Wave AVATAR office fjord', meta: ' <!-- mindflow:{"bold":true} -->' },
  { text: 'italic Wave illicit fjord', meta: ' <!-- mindflow:{"italic":true} -->' },
  { text: 'iiiiiiiiii MMMMMMMMMM', meta: '' },
];

/**
 * 同梱フォントにない文字（ラテン拡張・半角カナ・タイ文字）。OS のフォントで描かれるので、幅は環境で変わる。
 * 見積もりが実際の幅を下回らず、全角（1em）で数えたときより小さいことだけを確かめる
 */
const UNLISTED_SAMPLES = ['Zażółć gęślą jaźń', 'Đà Nẵng Việt Nam', 'Şişli ğüzel İstanbul', 'ｱｲｳｴｵｶｷｸｹｺ', 'สวัสดีครับ'];
const ROOT_TEXT = 'Mindflow Root';

function markdownWithFont(fontFamily: string): string {
  const children = [...SAMPLES.map((s) => `- ${s.text}${s.meta}`), ...UNLISTED_SAMPLES.map((t) => `- ${t}`)].join('\n');
  return `---\ntitle: t\nfontFamily: ${fontFamily}\n---\n\n# ${ROOT_TEXT}\n\n${children}\n`;
}

async function openWithFont(page: Page, fontFamily: string): Promise<void> {
  await page.addInitScript(
    ([key, md]) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, md);
    },
    [STORAGE_KEY, markdownWithFont(fontFamily)] as const
  );
  await page.goto('/');
  await expect(nodeByText(page, ROOT_TEXT)).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

/** 文字ごとの、見積もった幅と実際の幅（px）。見積もりは、開発サーバーから nodeDimensions.ts を読んで計算する */
async function measureWidths(page: Page, fontFamily: string) {
  return page.evaluate(
    async ({ fontFamily, rootText, samples, unlisted }) => {
      // 開発サーバー（Vite）が配る、アプリと同じモジュール。パスを変数にして、e2e の型チェックで解決しないようにする
      const modulePath = '/src/utils/nodeDimensions.ts';
      const { calculateTextVisualWidth } = (await import(modulePath)) as {
        calculateTextVisualWidth: (
          text: string,
          isRoot: boolean,
          fontSize?: string,
          bold?: boolean,
          fontFamily?: string,
          italic?: boolean
        ) => number;
      };
      const all = [{ text: rootText, bold: true, italic: false, isRoot: true, isUnlisted: false }]
        .concat(
          samples.map((s) => ({
            text: s.text,
            bold: s.meta.includes('"bold"'),
            italic: s.meta.includes('"italic"'),
            isRoot: false,
            isUnlisted: false,
          }))
        )
        .concat(unlisted.map((text) => ({ text, bold: false, italic: false, isRoot: false, isUnlisted: true })));
      return all.map((s) => {
        const el = [...document.querySelectorAll('[data-node-text]')].find((e) => e.textContent === s.text)!;
        const range = document.createRange();
        range.selectNodeContents(el);
        const actual = range.getBoundingClientRect().width;
        const estimated = calculateTextVisualWidth(s.text, s.isRoot, 'base', s.bold, fontFamily, s.italic);
        return {
          text: s.text,
          isUnlisted: s.isUnlisted,
          chars: [...s.text].length,
          actual: Math.round(actual * 10) / 10,
          estimated: Math.round(estimated * 10) / 10,
        };
      });
    },
    { fontFamily, rootText: ROOT_TEXT, samples: SAMPLES, unlisted: UNLISTED_SAMPLES }
  );
}

/**
 * 見積もりが、実際の幅を下回らず（はみ出さない）、上回る分も 6% 以内であること。
 * 文字の描かれ方は 2 通りあり、どちらでも成り立つ必要がある（playwright.config.ts の font-hinting-none / font-hinting-full で流す）。
 * ・サブピクセル配置：字送りが小数のまま（`--font-render-hinting=none`）
 * ・ヒンティング：字送りが 1 文字ごとに整数 px へ丸められる（`--font-render-hinting=full`。CI の Chromium、Linux など）。
 *   丸めで広がる分、実際の幅は数 px 大きくなる（#198 の CI で見積もりを 5〜6px 上回った）
 * 見積もりは 1 文字ごとに「丸めなし」と「丸めあり」の大きいほうを取るので、サブピクセルでは平均 0.1px/字ほど大きめになる。
 * 字幅の表はカーニング（AV・Wa などの字間の詰め）も含まないので、詰まる字が並ぶと、さらに少し大きくなる
 */
function expectCloseEstimate(m: Awaited<ReturnType<typeof measureWidths>>[number]): void {
  const message = `${m.text}: 実際 ${m.actual}px / 見積もり ${m.estimated}px`;
  // どの文字列も、見積もりが実際の幅を下回らない（箱からはみ出さない）
  expect(m.actual, message).toBeLessThanOrEqual(m.estimated + 1);
  if (m.isUnlisted) {
    // 同梱フォントにない文字は OS のフォントで描かれ、幅が環境で変わる。全角（14px）で数えたときよりは、はっきり小さいこと
    expect(m.estimated, message).toBeLessThan(m.chars * 14 * 0.9);
  } else {
    expect(m.estimated - m.actual, message).toBeLessThanOrEqual(m.actual * 0.06);
  }
}

for (const [fontFamily, latinFamily] of [
  ['sans', 'Mindflow Sans'],
  ['serif', 'Mindflow Serif'],
  ['mono', 'Mindflow Mono'],
] as const) {
  test(`${fontFamily}: 欧文は同梱フォントで描かれ、見積もった幅が実際の幅を下回らず、6% 以内`, async ({ page }) => {
    const errors = collectPageErrors(page);
    await openWithFont(page, fontFamily);

    // document.fonts.check は、該当するフォントがないときも true を返すので、登録した FontFace の状態を見る
    const loaded = await page.evaluate(
      (family) =>
        [...document.fonts].filter((f) => f.family.replace(/"/g, '') === family && f.status === 'loaded').map((f) => f.weight),
      latinFamily
    );
    expect(new Set(loaded)).toEqual(new Set(['500', '700']));

    // 使わない書体の同梱フォントは、読み込まれない（登録だけして、ブラウザが描くときに読み込む）
    const otherLoaded = await page.evaluate(
      (family) =>
        [...document.fonts]
          .filter((f) => f.family.replace(/"/g, '').startsWith('Mindflow ') && f.family.replace(/"/g, '') !== family)
          .filter((f) => f.status !== 'unloaded')
          .map((f) => `${f.family} ${f.weight} ${f.style} ${f.status}`),
      latinFamily
    );
    expect(otherLoaded).toEqual([]);

    for (const m of await measureWidths(page, fontFamily)) expectCloseEstimate(m);
    expect(errors).toEqual([]);
  });
}

test('なくした書体（手書き風）のファイルは、ゴシックで表示され、設定でもゴシックが選ばれている', async ({ page }) => {
  const errors = collectPageErrors(page);
  await openWithFont(page, 'handwriting');

  const family = await nodes(page)
    .first()
    .evaluate((el) => getComputedStyle(el).fontFamily);
  expect(family.startsWith('"Mindflow Sans"')).toBe(true);

  await page.locator('#btn-settings-picker').click();
  const fontRows = page.locator('button[aria-pressed]').filter({ hasText: /^(ゴシック|明朝体|等幅)/ });
  await expect(fontRows).toHaveCount(3);
  await expect(fontRows.filter({ hasText: /^ゴシック/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('丸ゴシック')).toHaveCount(0);
  await page.locator('#btn-close-settings').click();

  for (const m of await measureWidths(page, 'handwriting')) expectCloseEstimate(m);
  expect(errors).toEqual([]);
});
