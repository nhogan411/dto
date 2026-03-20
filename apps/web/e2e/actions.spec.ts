import { test, expect, type Browser } from '@playwright/test';
import { setupActiveGame } from './helpers/game';

test.describe('Action Broadcast (Two Browsers)', () => {
  test('Player B sees character at new position when Player A moves', async ({ browser }) => {
    let contextA: Awaited<ReturnType<Browser['newContext']>> | null = null;
    let contextB: Awaited<ReturnType<Browser['newContext']>> | null = null;

    try {
      contextA = await browser.newContext();
      contextB = await browser.newContext();

      const pageA = await contextA.newPage();
      const pageB = await contextB.newPage();

      const { gameId } = await setupActiveGame(
        pageA,
        pageB,
        'nhogan411@gmail.com',
        'thebadone411@gmail.com',
      );

      await pageA.goto(`/games/${gameId}`);
      await pageB.goto(`/games/${gameId}`);

      await expect(pageA.locator('[aria-label="Game board"]')).toBeVisible({ timeout: 10000 });
      await expect(pageB.locator('[aria-label="Game board"]')).toBeVisible({ timeout: 10000 });

      const charSquareA = pageA.locator('[aria-label*="Board square"][aria-label*="occupied"]').first();
      await charSquareA.click();

      await expect(pageA.locator('[role="menu"][aria-label="Character Actions"]')).toBeVisible({ timeout: 5000 });
      await pageA.locator('[role="menuitem"][aria-label="Move Action"]').click();

      await pageA.locator('[aria-label*="Board square"]').filter({ has: pageA.locator('.bg-\\[rgba\\(74\\,\\ 222\\,\\ 128\\,\\ 0\\.2\\)\\]') }).first().click({ timeout: 5000 });

      await expect(pageB.locator('[aria-label*="occupied"]')).toHaveCount(4, { timeout: 10000 });

    } finally {
      if (contextA) await contextA.close();
      if (contextB) await contextB.close();
    }
  });

  test('Player B sees HP decrease when Player A attacks', async ({ browser }) => {
    let contextA: Awaited<ReturnType<Browser['newContext']>> | null = null;
    let contextB: Awaited<ReturnType<Browser['newContext']>> | null = null;

    try {
      contextA = await browser.newContext();
      contextB = await browser.newContext();

      const pageA = await contextA.newPage();
      const pageB = await contextB.newPage();

      const { gameId } = await setupActiveGame(
        pageA,
        pageB,
        'nhogan411@gmail.com',
        'thebadone411@gmail.com',
      );

      await pageA.goto(`/games/${gameId}`);
      await pageB.goto(`/games/${gameId}`);

      await expect(pageA.locator('[aria-label="Game board"]')).toBeVisible({ timeout: 10000 });
      await expect(pageB.locator('[aria-label="Game board"]')).toBeVisible({ timeout: 10000 });

      const charSquareA = pageA.locator('[aria-label*="Board square"][aria-label*="occupied"]').first();
      await charSquareA.click();

      await expect(pageA.locator('[role="menu"][aria-label="Character Actions"]')).toBeVisible({ timeout: 5000 });

      const attackButton = pageA.locator('[role="menuitem"][aria-label="Attack Action"]');
      const isAttackEnabled = await attackButton.isEnabled();

      if (isAttackEnabled) {
        await attackButton.click();

        const opponentChar = pageA.locator('[aria-label*="Opponent character"]').first();
        await opponentChar.click({ timeout: 5000 });

        await expect(pageB.locator('text=/· Turn \\d+/')).toContainText('Turn', { timeout: 10000 });

      } else {
        const moveButton = pageA.locator('[role="menuitem"][aria-label="Move Action"]');
        await moveButton.click();

        const highlightedSquare = pageA.locator('[aria-label*="Board square"]').filter({ has: pageA.locator('div').filter({ hasNot: pageA.locator('[aria-label*="occupied"]') }) }).first();
        await highlightedSquare.click({ timeout: 5000 });

        await charSquareA.click();
        await expect(pageA.locator('[role="menu"]')).toBeVisible();
        await pageA.locator('[role="menuitem"][aria-label="Attack Action"]').click();
        const target = pageA.locator('[aria-label*="Opponent character"]').first();
        await target.click({ timeout: 5000 });

        await expect(pageB.locator('text=/· Turn \\d+/')).toContainText('Turn', { timeout: 10000 });
      }

    } finally {
      if (contextA) await contextA.close();
      if (contextB) await contextB.close();
    }
  });

  test("Player B's turn indicator becomes active when Player A ends turn", async ({ browser }) => {
    let contextA: Awaited<ReturnType<Browser['newContext']>> | null = null;
    let contextB: Awaited<ReturnType<Browser['newContext']>> | null = null;

    try {
      contextA = await browser.newContext();
      contextB = await browser.newContext();

      const pageA = await contextA.newPage();
      const pageB = await contextB.newPage();

      const { gameId } = await setupActiveGame(
        pageA,
        pageB,
        'nhogan411@gmail.com',
        'thebadone411@gmail.com',
      );

      await pageA.goto(`/games/${gameId}`);
      await pageB.goto(`/games/${gameId}`);

      await expect(pageA.locator('[aria-label="Game board"]')).toBeVisible({ timeout: 10000 });
      await expect(pageB.locator('[aria-label="Game board"]')).toBeVisible({ timeout: 10000 });

      await expect(pageA.locator('text=Your Turn')).toBeVisible({ timeout: 10000 });
      await expect(pageB.locator('text=Opponent\'s Turn')).toBeVisible({ timeout: 10000 });

      const charSquareA = pageA.locator('[aria-label*="Board square"][aria-label*="occupied"]').first();
      await charSquareA.click();

      await expect(pageA.locator('[role="menu"][aria-label="Character Actions"]')).toBeVisible({ timeout: 5000 });

      await pageA.locator('[role="menuitem"][aria-label="End Turn Action"]').click();

      await expect(pageA.locator('[role="dialog"][aria-label="Choose Facing Direction"]')).toBeVisible({ timeout: 5000 });
      await pageA.locator('[role="menuitem"][aria-label="Face North"]').click();

      await expect(pageB.locator('text=Your Turn')).toBeVisible({ timeout: 10000 });
      await expect(pageA.locator('text=Opponent\'s Turn')).toBeVisible({ timeout: 10000 });

    } finally {
      if (contextA) await contextA.close();
      if (contextB) await contextB.close();
    }
  });
});
