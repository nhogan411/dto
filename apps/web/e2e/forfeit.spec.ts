import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';
import { setupActiveGame } from './helpers/game';

test.describe('Forfeit — two-browser', () => {
  test('Player B sees game-over modal when Player A forfeits', async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      await loginAs(pageA, 'nhogan411@gmail.com', 'Passw0rd');
      await loginAs(pageB, 'thebadone411@gmail.com', 'Passw0rd');

      const { gameId } = await setupActiveGame(
        pageA,
        pageB,
        'nhogan411@gmail.com',
        'thebadone411@gmail.com',
      );

      await pageA.goto(`/games/${gameId}`);
      await pageB.goto(`/games/${gameId}`);

      await expect(pageA.locator('h1')).toContainText(`Game #${gameId}`, { timeout: 10000 });
      await expect(pageB.locator('h1')).toContainText(`Game #${gameId}`, { timeout: 10000 });

      await pageA.click('[aria-label="Forfeit game"]');
      await expect(pageA.locator('[role="dialog"][aria-label="Confirm Forfeit"]')).toBeVisible({
        timeout: 5000,
      });

      await pageA.click('[aria-label="Confirm Forfeit"] button:has-text("Forfeit")');

      await expect(
        pageA.locator('[role="dialog"][aria-label="Confirm Forfeit"]'),
      ).not.toBeVisible({ timeout: 5000 });
      await expect(pageA.locator('[role="dialog"][aria-label="Game Over"]')).toBeVisible({
        timeout: 5000,
      });

      await expect(pageB.locator('[role="dialog"][aria-label="Game Over"]')).toBeVisible({
        timeout: 10000,
      });
      await expect(pageB.locator('[role="dialog"][aria-label="Game Over"]')).toContainText(
        'won',
      );
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});
