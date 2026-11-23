// README 用のデモ GIF を作る。ブラウザ単体モード（Vite の開発サーバー）を Chromium で操作し、
// 画面を連続でスクショして、ffmpeg で GIF にまとめる。
//
//   npm run demo:gif                                  # 4 本（grow・themes × en・ja）を docs/images/ に作る
//   npm run demo:gif -- --only grow --lang en         # 絞り込み
//   npm run demo:gif -- --out-dir /tmp/demo           # 出力先を変える（確認用）
//
// 必要なもの: ffmpeg（PATH に）と、Playwright の Chromium。
// ブラウザを先に入れてある環境では、E2E_CHROMIUM_PATH に実行ファイルを指定する（npm run e2e と同じ）。
//
// 動画録画（recordVideo）は使わない。環境によってファイルが出ないことがあり、
// スクショを並べる方式のほうが、フレームの時刻を自分で決められて確実だった。
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = 5198; // e2e（5199）と重ならないようにする
const BASE_URL = `http://localhost:${PORT}/`;
const STORAGE_KEY = 'mindflow_current_doc_md_v1'; // ブラウザ単体モードの保存先（e2e/helpers.ts と同じ）
const SIZE = { width: 960, height: 600 };
const GIF_FPS = 15;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- 引数 ----
function parseArgs(argv) {
  const opts = { only: ['grow', 'themes'], langs: ['en', 'ja'], outDir: join(ROOT, 'docs', 'images') };
  for (let i = 0; i < argv.length; i += 1) {
    const [key, value] = [argv[i], argv[i + 1]];
    if (key === '--only') opts.only = [value];
    else if (key === '--lang') opts.langs = [value];
    else if (key === '--out-dir') opts.outDir = resolve(value);
    else throw new Error(`知らない引数: ${key}`);
    i += 1;
  }
  for (const s of opts.only) if (!['grow', 'themes'].includes(s)) throw new Error(`--only は grow か themes: ${s}`);
  for (const l of opts.langs) if (!['en', 'ja'].includes(l)) throw new Error(`--lang は en か ja: ${l}`);
  return opts;
}

function assertFfmpeg() {
  const r = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  if (r.error || r.status !== 0) throw new Error('ffmpeg が見つかりません。インストールして PATH に通してください');
}

// ---- 開発サーバー ----
async function startDevServer() {
  // npx は Vite を子プロセスとして起動するので、まとめて止められるよう、独立したプロセスグループにする
  const child = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore', detached: true });
  for (let i = 0; i < 120; i += 1) {
    try {
      if ((await fetch(BASE_URL)).ok) return child;
    } catch {
      // まだ起動していない
    }
    await sleep(500);
  }
  stopDevServer(child);
  throw new Error('開発サーバーが起動しませんでした');
}

function stopDevServer(child) {
  try {
    process.kill(-child.pid);
  } catch {
    child.kill();
  }
}

// ---- 画面の文言と、初期のマップ（言語ごと） ----
const TEXT = {
  en: {
    root: 'Weekend trip',
    eat: 'Eat',
    see: 'See',
    prepare: 'Prepare',
    kids: ['Seafood bowl', 'Coffee house'],
    themes: { natural: 'Natural', ocean: 'Ocean', dark: 'Dark', mono: 'Monochrome' },
    full: [
      '# Weekend trip',
      '  - Eat',
      '    - Harbor market',
      '    - Old coffee house',
      '  - See',
      '    - Castle ruins',
      '    - Art museum',
      '  - Prepare',
      '    - Train tickets',
      '    - Book a room',
    ],
  },
  ja: {
    root: '週末の旅行',
    eat: '食べる',
    see: '見る',
    prepare: '準備',
    kids: ['海鮮丼', '喫茶店'],
    themes: { natural: 'ナチュラル', ocean: 'オーシャン', dark: 'ダーク', mono: 'モノクロ' },
    full: [
      '# 週末の旅行',
      '  - 食べる',
      '    - 市場の海鮮丼',
      '    - 老舗の喫茶店',
      '  - 見る',
      '    - 城跡',
      '    - 美術館',
      '  - 準備',
      '    - 切符',
      '    - 宿の予約',
    ],
  },
};

// ---- 撮影 ----
/** 画面を連続でスクショして溜める。止めるまで、できるだけ速く撮り続ける */
function createRecorder(page) {
  const frames = [];
  let running = false;
  let loop = Promise.resolve();
  return {
    start() {
      running = true;
      loop = (async () => {
        while (running) {
          const t = Date.now();
          frames.push({ t, buf: await page.screenshot({ type: 'jpeg', quality: 88 }) });
        }
      })();
    },
    async stop() {
      running = false;
      await loop;
      return frames;
    },
  };
}

/** 白紙のマップ（ルートだけ）から、Tab と Enter で枝を伸ばす */
async function playGrow(page, t) {
  const type = (text) => page.keyboard.type(text, { delay: 90 });
  const node = (text) =>
    page
      .locator('#mind-canvas-world [id^="node-"]:not(#node-properties-bar)')
      .filter({ hasText: new RegExp(`^\\s*${text}\\s*$`) });
  const deselect = async () => {
    await page.mouse.click(70, 540); // 空白をクリックして選択を外す（プロパティバーが次のクリックを遮らないように）
    await sleep(500);
  };

  await node(t.root).click();
  await sleep(700);
  await page.keyboard.press('Tab');
  await type(t.eat);
  await page.keyboard.press('Enter');
  await type(t.see);
  await page.keyboard.press('Enter');
  await type(t.prepare);
  // Escape だけだと、打った文字ごと取り消される。Enter で確定してから、空の下書きを Escape で捨てる
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await sleep(700);
  // 全体を画面に合わせる。文字キー（F）はノードへの入力になってしまうので、Ctrl+0 を使う
  await page.keyboard.press('Control+0');
  await sleep(1100);

  await deselect();
  await node(t.eat).click();
  await sleep(500);
  await page.keyboard.press('Tab');
  await type(t.kids[0]);
  await page.keyboard.press('Enter');
  await type(t.kids[1]);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await sleep(600);
  await page.keyboard.press('Control+0');
  await sleep(900);
  await page.mouse.click(70, 540); // 最後は選択を外して、きれいな形で止める
  await sleep(2200);
}

/** 同じマップで、テーマを順に切り替える。パネルは閉じて、マップ全体をしっかり映す */
async function playThemes(page, t) {
  const switchTheme = async (label) => {
    await page.locator('#btn-settings-picker').click();
    await sleep(500);
    await page.getByText(label, { exact: true }).first().click();
    await sleep(500);
    await page.keyboard.press('Escape'); // パネルを閉じる
    await sleep(1700);
  };
  await sleep(1200);
  // 最後に最初のテーマへ戻すので、ループしても継ぎ目が目立たない
  for (const label of [t.themes.ocean, t.themes.dark, t.themes.mono, t.themes.natural]) await switchTheme(label);
  await sleep(600);
}

async function record(browser, scenario, lang) {
  const t = TEXT[lang];
  const context = await browser.newContext({ locale: lang === 'ja' ? 'ja-JP' : 'en-US', viewport: SIZE });
  const page = await context.newPage();
  const markdown = scenario === 'grow' ? `# ${t.root}\n` : `${t.full.join('\n')}\n`;
  await page.addInitScript(([key, md]) => localStorage.setItem(key, md), [STORAGE_KEY, markdown]);
  await page.goto(BASE_URL);
  await page.locator('#mind-canvas-world [id^="node-"]:not(#node-properties-bar)').first().waitFor();

  if (scenario === 'themes') {
    await page.mouse.click(70, 540); // ルートの選択を外す
    await sleep(400);
    await page.keyboard.press('Control+0'); // 全体を画面に合わせる
    await sleep(900);
  }
  await sleep(300);

  const recorder = createRecorder(page);
  recorder.start();
  await sleep(900);
  await (scenario === 'grow' ? playGrow(page, t) : playThemes(page, t));
  const frames = await recorder.stop();
  await context.close();
  return frames;
}

/** 溜めたフレームを、時刻どおりの長さで並べて GIF にする（パレットは全体から作る） */
function buildGif(frames, outFile) {
  const dir = mkdtempSync(join(tmpdir(), 'mindflow-demo-'));
  try {
    const lines = [];
    frames.forEach((f, i) => {
      const name = `f${String(i).padStart(4, '0')}.jpg`;
      writeFileSync(join(dir, name), f.buf);
      const seconds = i + 1 < frames.length ? (frames[i + 1].t - f.t) / 1000 : 0.8;
      lines.push(`file '${name}'`, `duration ${seconds.toFixed(3)}`);
    });
    lines.push(`file 'f${String(frames.length - 1).padStart(4, '0')}.jpg'`); // 最後の duration を効かせるため、もう一度書く
    writeFileSync(join(dir, 'list.txt'), `${lines.join('\n')}\n`);

    const filter =
      `fps=${GIF_FPS},scale=${SIZE.width}:-1:flags=lanczos,split[a][b];` +
      '[a]palettegen=stats_mode=diff:max_colors=128[p];' +
      '[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle';
    const r = spawnSync(
      'ffmpeg',
      ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', join(dir, 'list.txt'), '-vf', filter, '-loop', '0', outFile],
      { stdio: 'inherit' }
    );
    if (r.status !== 0) throw new Error('ffmpeg が失敗しました');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  assertFfmpeg();
  mkdirSync(opts.outDir, { recursive: true });

  const server = await startDevServer();
  const browser = await chromium.launch({ executablePath: process.env.E2E_CHROMIUM_PATH || undefined });
  try {
    for (const scenario of opts.only) {
      for (const lang of opts.langs) {
        const frames = await record(browser, scenario, lang);
        const out = join(opts.outDir, `demo-${scenario}.${lang}.gif`);
        buildGif(frames, out);
        const seconds = ((frames.at(-1).t - frames[0].t) / 1000).toFixed(1);
        console.log(`${out}  (${frames.length} フレーム, ${seconds} 秒)`);
      }
    }
  } finally {
    await browser.close();
    stopDevServer(server);
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
