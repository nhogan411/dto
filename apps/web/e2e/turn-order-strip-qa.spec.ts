import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

test.describe('TurnOrderStrip Visual QA - Task F3', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to game 1
    await loginAs(page, 'nhogan411@gmail.com', 'Passw0rd');
    await page.goto('/games/1');
    await page.waitForTimeout(1000); // Let game state load
  });

  test('Scenario 1: Strip renders with all 4 slots', async ({ page }) => {
    const strip = page.locator('[data-testid="turn-order-strip"]');
    await expect(strip).toBeVisible();

    // Assert all 4 slots exist
    for (let i = 1; i <= 4; i++) {
      const slot = page.locator(`[data-testid="turn-slot-${i}"]`);
      await expect(slot).toBeVisible();
    }
  });

  test('Scenario 2: Active slot highlight', async ({ page }) => {
    const activeMarker = page.locator('[data-testid="turn-slot-active"]');
    await expect(activeMarker).toBeAttached();

    const slot1Button = page.locator('[data-testid="turn-slot-1"]');
    const classes = await slot1Button.getAttribute('class');
    expect(classes).toContain('border-yellow-400');
  });

  test('Scenario 3: Team color HP bars', async ({ page }) => {
    const slot1 = page.locator('[data-testid="turn-slot-1"]');
    const blueBar1 = slot1.locator('.bg-blue-500').first();
    await expect(blueBar1).toBeVisible();

    const slot3 = page.locator('[data-testid="turn-slot-3"]');
    const redBar = slot3.locator('.bg-red-500').first();
    await expect(redBar).toBeVisible();
  });

  test('Scenario 4: Dead character styling', async ({ page }) => {
    const slot4Button = page.locator('[data-testid="turn-slot-4"]');
    
    // Should have opacity-50 and grayscale
    const classes = await slot4Button.getAttribute('class');
    expect(classes).toContain('opacity-50');
    expect(classes).toContain('grayscale');

    // Should have dead marker
    const deadMarker = page.locator('[data-testid="turn-slot-dead"]');
    await expect(deadMarker).toBeAttached();
  });

  test('Scenario 5: Shield icon on defending character', async ({ page }) => {
    // Thorin (slot 1) is defending, should show shield
    const slot1 = page.locator('[data-testid="turn-slot-1"]');
    const shieldText = await slot1.textContent();
    expect(shieldText).toContain('🛡️');
  });

  test('Scenario 6: Old indicator gone', async ({ page }) => {
    // Should NOT find "Your Turn" or "Opponent's Turn" text
    const yourTurn = page.getByText('Your Turn');
    const opponentTurn = page.getByText("Opponent's Turn");
    
    await expect(yourTurn).not.toBeVisible();
    await expect(opponentTurn).not.toBeVisible();
  });

  test('Scenario 7: CharacterInfo defaults to active character', async ({ page }) => {
    await page.waitForTimeout(500);
    
    const characterInfo = page.locator('div.p-4.border-2.rounded-lg.mb-4.bg-neutral-800').first();
    await expect(characterInfo).toBeVisible();
    
    const content = await characterInfo.textContent();
    expect(content).toMatch(/Thorin|Challenger/i);
  });

  test('Scenario 8-10: Click interactions update CharacterInfo', async ({ page }) => {
    await page.waitForTimeout(500);

    const characterInfo = page.locator('div.p-4.border-2.rounded-lg.mb-4.bg-neutral-800').first();
    let content = await characterInfo.textContent();
    expect(content).toMatch(/Thorin|Challenger/i);

    await page.evaluate(() => {
      const el = document.querySelector('[data-testid="turn-slot-2"]');
      if (!el) throw new Error('Slot 2 not found');
      const propKey = Object.keys(el).find(k => k.startsWith('__reactProps'));
      if (!propKey) throw new Error('React props not found');
      const onClick = (el as any)[propKey]?.onClick;
      if (!onClick) throw new Error('onClick handler not found');
      onClick({});
    });

    await page.waitForTimeout(300);
    content = await characterInfo.textContent();
    expect(content).toMatch(/Elara|75.*80/i);

    await page.screenshot({ 
      path: '.sisyphus/evidence/task-5-click-updates-info.png',
      fullPage: false 
    });

    await page.evaluate(() => {
      const el = document.querySelector('[data-testid="turn-slot-3"]');
      if (!el) throw new Error('Slot 3 not found');
      const propKey = Object.keys(el).find(k => k.startsWith('__reactProps'));
      if (!propKey) throw new Error('React props not found');
      const onClick = (el as any)[propKey]?.onClick;
      if (!onClick) throw new Error('onClick handler not found');
      onClick({});
    });

    await page.waitForTimeout(300);
    content = await characterInfo.textContent();
    expect(content).toMatch(/Shadow|Challenged/i);

    const closeButton = characterInfo.locator('button').filter({ hasText: '✕' });
    
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const closeBtn = buttons.find(btn => btn.textContent?.includes('✕'));
      if (!closeBtn) throw new Error('Close button not found');
      const propKey = Object.keys(closeBtn).find(k => k.startsWith('__reactProps'));
      if (!propKey) throw new Error('React props not found on close button');
      const onClick = (closeBtn as any)[propKey]?.onClick;
      if (!onClick) throw new Error('onClick handler not found on close button');
      onClick({});
    });

    await page.waitForTimeout(300);
    content = await characterInfo.textContent();
    expect(content).toMatch(/Thorin|Challenger/i);
  });

  test('FULL QA: All scenarios in sequence', async ({ page }) => {
    let passCount = 0;
    const failures: string[] = [];

    try {
      // Scenario 1: Strip renders
      const strip = page.locator('[data-testid="turn-order-strip"]');
      await expect(strip).toBeVisible();
      for (let i = 1; i <= 4; i++) {
        await expect(page.locator(`[data-testid="turn-slot-${i}"]`)).toBeVisible();
      }
      passCount++;
      console.log('✅ Scenario 1: Strip renders with all 4 slots');
    } catch (e) {
      failures.push('Scenario 1: Strip rendering failed');
    }

    try {
      await expect(page.locator('[data-testid="turn-slot-active"]')).toBeAttached();
      const slot1Classes = await page.locator('[data-testid="turn-slot-1"]').getAttribute('class');
      expect(slot1Classes).toContain('border-yellow-400');
      passCount++;
      console.log('✅ Scenario 2: Active slot highlight');
    } catch (e) {
      failures.push('Scenario 2: Active slot highlight failed');
    }

    try {
      await expect(page.locator('[data-testid="turn-slot-1"] .bg-blue-500').first()).toBeVisible();
      await expect(page.locator('[data-testid="turn-slot-3"] .bg-red-500').first()).toBeVisible();
      passCount++;
      console.log('✅ Scenario 3: Team color HP bars');
    } catch (e) {
      failures.push('Scenario 3: HP bar colors failed');
    }

    try {
      // Scenario 4: Dead styling
      const slot4Classes = await page.locator('[data-testid="turn-slot-4"]').getAttribute('class');
      expect(slot4Classes).toContain('opacity-50');
      expect(slot4Classes).toContain('grayscale');
      await expect(page.locator('[data-testid="turn-slot-dead"]')).toBeAttached();
      passCount++;
      console.log('✅ Scenario 4: Dead character styling');
    } catch (e) {
      failures.push('Scenario 4: Dead character styling failed');
    }

    try {
      // Scenario 5: Shield icon
      const slot1Text = await page.locator('[data-testid="turn-slot-1"]').textContent();
      expect(slot1Text).toContain('🛡️');
      passCount++;
      console.log('✅ Scenario 5: Shield icon on defending character');
    } catch (e) {
      failures.push('Scenario 5: Shield icon failed');
    }

    try {
      // Scenario 6: Old indicator gone
      await expect(page.getByText('Your Turn')).not.toBeVisible();
      await expect(page.getByText("Opponent's Turn")).not.toBeVisible();
      passCount++;
      console.log('✅ Scenario 6: Old indicator gone');
    } catch (e) {
      failures.push('Scenario 6: Old indicator check failed');
    }

    try {
      await page.waitForTimeout(500);
      const characterInfo = page.locator('div.p-4.border-2.rounded-lg.mb-4.bg-neutral-800').first();
      await expect(characterInfo).toBeVisible();
      let content = await characterInfo.textContent();
      expect(content).toMatch(/Thorin|Challenger/i);
      passCount++;
      console.log('✅ Scenario 7: CharacterInfo defaults to active character');
    } catch (e) {
      failures.push('Scenario 7: CharacterInfo default failed');
    }

    try {
      await page.evaluate(() => {
        const el = document.querySelector('[data-testid="turn-slot-2"]');
        const propKey = Object.keys(el!).find(k => k.startsWith('__reactProps'));
        const onClick = (el as any)[propKey!]?.onClick;
        onClick({});
      });
      await page.waitForTimeout(300);
      const characterInfo = page.locator('div.p-4.border-2.rounded-lg.mb-4.bg-neutral-800').first();
      let content = await characterInfo.textContent();
      expect(content).toMatch(/Elara|75.*80/i);
      passCount++;
      console.log('✅ Scenario 8: Click slot 2 updates CharacterInfo');
    } catch (e) {
      failures.push('Scenario 8: Click slot 2 failed');
    }

    try {
      await page.evaluate(() => {
        const el = document.querySelector('[data-testid="turn-slot-3"]');
        const propKey = Object.keys(el!).find(k => k.startsWith('__reactProps'));
        const onClick = (el as any)[propKey!]?.onClick;
        onClick({});
      });
      await page.waitForTimeout(300);
      const characterInfo = page.locator('div.p-4.border-2.rounded-lg.mb-4.bg-neutral-800').first();
      let content = await characterInfo.textContent();
      expect(content).toMatch(/Shadow|Challenged/i);
      passCount++;
      console.log('✅ Scenario 9: Click slot 3 shows opponent');
    } catch (e) {
      failures.push('Scenario 9: Click slot 3 failed');
    }

    try {
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const closeBtn = buttons.find(btn => btn.textContent?.includes('✕'));
        const propKey = Object.keys(closeBtn!).find(k => k.startsWith('__reactProps'));
        const onClick = (closeBtn as any)[propKey!]?.onClick;
        onClick({});
      });
      await page.waitForTimeout(300);
      const characterInfo = page.locator('div.p-4.border-2.rounded-lg.mb-4.bg-neutral-800').first();
      let content = await characterInfo.textContent();
      expect(content).toMatch(/Thorin|Challenger/i);
      passCount++;
      console.log('✅ Scenario 10: X button reverts to active character');
    } catch (e) {
      failures.push('Scenario 10: X button revert failed');
    }

    // Take final screenshot
    await page.screenshot({ 
      path: '.sisyphus/evidence/task-5-click-updates-info.png',
      fullPage: false 
    });

    // Final verdict
    if (passCount === 10) {
      console.log('\n🎉 Scenarios [10/10 pass] | VERDICT: APPROVE');
    } else {
      console.log(`\n⚠️  Scenarios [${passCount}/10 pass] | VERDICT: REJECT`);
      console.log('Failures:', failures);
      throw new Error(`Only ${passCount}/10 scenarios passed`);
    }
  });
});
