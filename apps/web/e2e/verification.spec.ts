import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test('Scenario 1: Black body background & Scenario 10: Screenshot', async ({ page }) => {
  await page.goto('http://localhost:4001/login');
  
  // Scenario 10: Screenshot
  await page.screenshot({ path: '../../.sisyphus/evidence/f2-login-page.png' });
  
  // Scenario 1: Body background
  const bgColor = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
  expect(bgColor).toBe('rgb(0, 0, 0)');
  
  // Write result
  fs.writeFileSync('../../.sisyphus/evidence/task-2-body-bg.txt', bgColor);
});
