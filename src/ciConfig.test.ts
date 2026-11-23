import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// CI の E2E は Playwright 公式イメージの中で動く。イメージの中のブラウザは、同じ版の Playwright にしか合わない。
// Dependabot が @playwright/test の版を上げても、ci.yml のイメージのタグは自動では上がらないので、ずれたらここで落とす

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const read = (path: string) => readFileSync(`${ROOT}${path}`, 'utf-8');

describe('CI の設定', () => {
  it('E2E のコンテナイメージのタグが、package.json の @playwright/test の版と同じであること', () => {
    const pkg = JSON.parse(read('package.json')) as { devDependencies: Record<string, string> };
    const version = pkg.devDependencies['@playwright/test'];
    expect(version, '@playwright/test は版を固定する（^ や ~ を付けない）').toMatch(/^\d+\.\d+\.\d+$/);

    const tag = read('.github/workflows/ci.yml').match(/image:\s*mcr\.microsoft\.com\/playwright:v(\d+\.\d+\.\d+)-/);
    expect(tag, 'ci.yml に Playwright のイメージが見つからない').not.toBeNull();
    expect(tag![1], `ci.yml のイメージのタグを v${version}-noble に直す`).toBe(version);
  });
});
