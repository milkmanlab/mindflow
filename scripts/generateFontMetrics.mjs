// 同梱フォントの字幅の表を src/utils/fontMetrics.generated.json に書き出す（npm run fonts:metrics）。
// Fontsource の版を上げたら実行して、生成物をコミットする。
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFontMetrics } from './fontMetricsCore.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(rootDir, 'src', 'utils', 'fontMetrics.generated.json');
writeFileSync(out, `${JSON.stringify(buildFontMetrics(rootDir))}\n`);
console.log(`wrote ${path.relative(rootDir, out)}`);
