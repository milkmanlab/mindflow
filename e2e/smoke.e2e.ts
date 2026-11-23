import { test, expect } from '@playwright/test';
import { INITIAL_TEXTS, nodeTexts, openApp } from './helpers';

test('起動すると、初期のマップが表示される', async ({ page }) => {
  await openApp(page);
  expect(await nodeTexts(page)).toEqual(INITIAL_TEXTS);
});
