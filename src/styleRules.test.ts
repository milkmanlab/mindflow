import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// UI のスタイルの決まりが、新しいコードで元に戻らないことを確かめる。
// 決まりの意味は docs/development-guidelines.md の「3. スタイリング規約」を参照

const SRC_DIR = fileURLToPath(new URL('.', import.meta.url));

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return collectSourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

const SOURCES = collectSourceFiles(SRC_DIR).map((path) => ({
  name: relative(SRC_DIR, path).replace(/\\/g, '/'),
  lines: readFileSync(path, 'utf-8').split(/\r?\n/),
}));

interface Rule {
  description: string;
  pattern: RegExp;
  /** この規則の対象外にするファイル（src からの相対パス） */
  exclude?: string[];
  /** コメントだけの行は見ない（画面に出る文言だけを対象にする規則用） */
  skipComments?: boolean;
}

// ノードの中（テーマの node・root の色で決まる部分）と、画像・色の見本の上に載るもの。UI の灰色の対象外
const UI_GRAY_EXCLUDE = [
  'utils/themes.ts',
  'components/NodeTextContent.tsx',
  'components/NodeInfoBadges.tsx',
  'components/NodeImage.tsx',
  'components/NodeActionButtons.tsx',
];

const RULES: Rule[] = [
  { description: 'すりガラス（backdrop-blur）は使わない', pattern: /backdrop-blur/ },
  {
    description: 'グラデーションは使わない',
    pattern: /bg-gradient-/,
  },
  {
    description: '青・藍・紫を直接書かない。状態色は accent を使う（テーマの定義だけ除く）',
    pattern: /\b(?:blue|indigo|violet|purple)-\d{2,3}\b/,
    exclude: ['utils/themes.ts'],
  },
  { description: '影は shadow-float だけを使う', pattern: /\bshadow-(?!float\b)/ },
  {
    description: '角丸は rounded-control / rounded-panel / rounded-full を使う（ノードの形は nodeStyle.ts だけ）',
    pattern: /\brounded-(?:sm|md|lg|xl|2xl|3xl)\b|(?<= )rounded(?=[ "'`])/,
    exclude: ['utils/nodeStyle.ts'],
  },
  { description: '9px・10px の文字は使わない', pattern: /text-\[(?:9|10)px\]/ },
  { description: '小見出しに uppercase や字間（tracking-*）を付けない', pattern: /\buppercase\b|\btracking-[a-z]+/ },
  {
    description: '緑・琥珀・黄を直接書かない。完了の色は theme.done（text-done / bg-done）を使う（テーマの定義だけ除く）',
    pattern: /\b(?:emerald|green|amber|yellow|lime)-\d{2,3}\b/,
    exclude: ['utils/themes.ts'],
  },
  {
    description:
      'UI の文字は見出し・本文・補助の 3 役（text-ui-heading / text-ui-body / text-ui-caption）で書く。ノードの中の文字と太字ボタンだけ除く',
    pattern: /\btext-(?:xs|sm|base|lg|xl|\[\d+px\])|\bfont-(?:medium|semibold|bold|normal)\b/,
    exclude: [
      'components/MindNodeComponent.tsx',
      'components/NodeTextContent.tsx',
      'components/NodeInfoBadges.tsx',
      'components/NodeActionButtons.tsx',
      'components/NodeDropIndicator.tsx',
      'components/NodeTextPanel.tsx',
      'components/PropertiesBarParts.tsx',
      // ノードの文字と、その大きさの見積もり・書き出し
      'utils/nodeStyle.ts',
      'utils/nodeFontSizes.ts',
      'utils/nodeDimensions.ts',
      'utils/exportUtils.ts',
    ],
  },
  {
    description:
      'UI の灰色を直接書かない。面は surface・surface-*、枠は line・line-*、文字は ink・ink-muted・ink-strong を使い、灰色のために dark: を付けない（テーマの定義とノードの中だけ除く）',
    pattern: /\b(?:slate|gray|zinc|neutral|stone)-\d{2,3}\b|\bdark:(?:[a-z-]+:)*(?:bg|text|border|ring|divide)-(?:slate|white|black)\b/,
    exclude: UI_GRAY_EXCLUDE,
  },
  {
    description: '面・枠・文字に白・黒を直接書かない（bg-black/50 のような覆いは除く）',
    pattern: /\b(?:bg|text|border|ring|divide)-(?:white|black)\b(?!\/)/,
    exclude: UI_GRAY_EXCLUDE,
  },
  {
    description: '画面の言葉をそろえる。「ノードの色」「進捗」「形」。外す操作は「解除」、キーは Ctrl/Cmd+、矢印は文字で書かない、項目名にコロンを付けない',
    // 項目名の末尾のコロンは、ASCII でない文字の直後の「:」で見つける
    pattern:
      // eslint-disable-next-line no-control-regex
      /アクセントカラー|タスク進捗度|ノード形状|をクリア|をリセット|(?<!ノード|関連線|選択したノード)を削除|← 左|右 →|(?<![/\w])Ctrl\+(?!\/)|(?<![/\w])Cmd\+|[^\x00-\x7F]:<\/span>/,
    skipComments: true,
  },
  { description: 'font-black は使わない', pattern: /\bfont-black\b/ },
  { description: 'transition-all は使わない。変わるものだけを対象にする', pattern: /\btransition-all\b/ },
  {
    description: '動きは回転（animate-spin）だけ。開閉や点滅の動きは付けない',
    pattern: /\banimate-(?!spin\b)|\bfade-in\b|\bzoom-in-|\bslide-in-from-/,
  },
  { description: 'hover や押下で大きさを変えない', pattern: /\b(?:hover|active|group-hover):scale-/ },
  {
    description: 'クラス名の空白を抜かさない（w-52bg-white や transition-colors${...} のようにくっつけない）',
    pattern: /-\d+(?:\.\d+)?(?:bg|text|border|ring|rounded|shadow|font|flex|gap|dark:|hover:|[wh]|p[xytblr]?|m[xytblr]?)-|(?:transition(?:-[a-z]+)?|(?:bg|text|border|rounded)-[a-z0-9-]+)[$][{]/,
  },
  {
    description: '飾りの文言（「(推奨)」、【】、絵文字、英語の併記）を書かない',
    pattern: /[(（]推奨[)）]|[【】]|\p{Extended_Pictographic}|Type-to-Edit|Fit View|\((?:Smooth|Direct|Sans-Serif|Serif|Rounded|Monospace|Casual)\)/u,
  },
];

describe('UI のスタイルの決まり', () => {
  for (const rule of RULES) {
    it(rule.description, () => {
      const violations: string[] = [];
      for (const source of SOURCES) {
        if (rule.exclude?.includes(source.name)) continue;
        source.lines.forEach((line, index) => {
          if (rule.skipComments && /^\s*(?:\/\/|\/\*|\*|\{\/\*)/.test(line)) return;
          if (rule.pattern.test(line)) violations.push(`${source.name}:${index + 1}  ${line.trim().slice(0, 100)}`);
        });
      }
      expect(violations).toEqual([]);
    });
  }
});
