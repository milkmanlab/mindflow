import { defineConfig, devices } from '@playwright/test';

// E2E は、ブラウザ単体モード（npm run dev）の画面を Chromium で操作する。
// 状態（localStorage・IME）を共有しないよう、並列数は 1。失敗は隠さない（retries 0）
const PORT = 5199;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    // 画面を日本語にそろえる（ブラウザ単体モードは navigator.language で言語を決める）
    locale: 'ja-JP',
    viewport: { width: 1280, height: 800 },
    trace: 'off',
    // Playwright の版が要求する Chromium が入っていない環境（ブラウザを先に入れてあるクラウドのセッションなど）では、
    // E2E_CHROMIUM_PATH に、使える Chromium の実行ファイルを指定する。未指定なら、Playwright が入れたブラウザを使う
    launchOptions: { executablePath: process.env.E2E_CHROMIUM_PATH || undefined },
  },
  projects: [
    { name: 'chromium', testIgnore: '**/font.e2e.ts', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    // 文字幅の見積もりは、字送りの描き方で実際の幅が数 px 変わる（#198 の CI で、手元と CI の差から見つかった）。
    // font.e2e.ts は、描き方を明示した次の 2 つで流す。どちらも headless shell で、`--font-render-hinting` が効く。
    // ブラウザを先に入れてある環境では、E2E_HEADLESS_SHELL_PATH に headless shell の実行ファイルを指定する
    // （フル版の Chrome は、このフラグを無視する）
    ...(['none', 'full'] as const).map((hinting) => ({
      // none：字送りが小数のまま（サブピクセル配置）。full：1 文字ごとに整数 px へ丸められる（Linux など。CI の描き方）
      name: `font-hinting-${hinting}`,
      testMatch: '**/font.e2e.ts',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        launchOptions: {
          executablePath: process.env.E2E_HEADLESS_SHELL_PATH || undefined,
          args: [`--font-render-hinting=${hinting}`],
        },
      },
    })),
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
