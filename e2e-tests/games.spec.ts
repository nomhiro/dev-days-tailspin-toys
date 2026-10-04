import { test, expect, type Response } from '@playwright/test';

test.describe('Game Listing and Navigation', () => {
  test('searches game titles case-insensitively and combines with category filters', async ({ page }) => {
    await page.goto('/');
    const firstGame = page.getByTestId('game-card').first();
    const title = await firstGame.getAttribute('data-game-title');
    const categoryId = await firstGame.getAttribute('data-game-category-id');
    if (!title || !categoryId) {
      throw new Error('Expected the first catalog game to have a title and category.');
    }

    const titleSearch = page.getByRole('searchbox', { name: 'Search by game title' });
    await expect(titleSearch).toHaveAttribute('data-testid', 'game-title-search');
    await titleSearch.focus();
    await titleSearch.pressSequentially(title.toLowerCase());
    await titleSearch.press('Enter');
    await expect(titleSearch).toBeFocused();
    await expect(page).toHaveURL('/');

    const visibleCards = page.locator('[data-testid="game-card"]:not([hidden])');
    await expect(visibleCards).not.toHaveCount(0);
    const visibleTitles = await visibleCards.evaluateAll((cards) =>
      cards.map((card) => card.getAttribute('data-game-title') ?? ''),
    );
    expect(visibleTitles.every((visibleTitle) => visibleTitle.toLowerCase().includes(title.toLowerCase())))
      .toBe(true);

    await page.locator(`input[name="categoryIds"][value="${categoryId}"]`).check();
    const visibleCategoryIds = await visibleCards.evaluateAll((cards) =>
      cards.map((card) => card.getAttribute('data-game-category-id')),
    );
    expect(visibleCategoryIds.every((visibleCategoryId) => visibleCategoryId === categoryId)).toBe(true);
    await expect(visibleCards).not.toHaveCount(0);
    await expect(page.getByTestId('filter-results-status')).toContainText('Showing');
  });

  test('shows a no-results message and clears the title search', async ({ page }) => {
    await page.goto('/');
    const titleSearch = page.getByRole('searchbox', { name: 'Search by game title' });
    const gameCards = page.getByTestId('game-card');

    await titleSearch.fill('no-game-title-can-match-this');

    await expect(page.getByTestId('game-search-empty-state')).toBeVisible();
    await expect(page.getByTestId('filter-results-status')).toHaveText(
      'No games match your search and selected filters.',
    );
    await expect(page.locator('[data-testid="game-card"]:not([hidden])')).toHaveCount(0);

    await page.getByTestId('clear-game-filters').click();

    await expect(titleSearch).toHaveValue('');
    await expect(page.getByTestId('game-search-empty-state')).toBeHidden();
    await expect(page.locator('[data-testid="game-card"]:not([hidden])')).toHaveCount(
      await gameCards.count(),
    );
  });

  test('filters games by multiple categories and publisher together', async ({ page }) => {
    await page.goto('/');
    const gameCards = page.getByTestId('game-card');
    const visibleCards = page.locator('[data-testid="game-card"]:not([hidden])');

    const categoryIds = await gameCards.evaluateAll((cards) =>
      [...new Set(
        cards
          .map((card) => card.getAttribute('data-game-category-id'))
          .filter((id): id is string => id !== null && id !== ''),
      )],
    );
    expect(categoryIds.length).toBeGreaterThanOrEqual(2);
    const [firstCategoryId, secondCategoryId] = categoryIds;
    if (!firstCategoryId || !secondCategoryId) {
      throw new Error('Expected at least two categories in the game catalog.');
    }

    await test.step('Select two categories and verify either category is included', async () => {
      await page.locator(`input[name="categoryIds"][value="${firstCategoryId}"]`).check();
      await page.locator(`input[name="categoryIds"][value="${secondCategoryId}"]`).check();

      const expectedCount =
        await page.locator(`[data-game-category-id="${firstCategoryId}"]`).count() +
        await page.locator(`[data-game-category-id="${secondCategoryId}"]`).count();
      await expect(visibleCards).toHaveCount(expectedCount);
    });

    await test.step('Narrow the categories by a publisher', async () => {
      await page.locator(`input[name="categoryIds"][value="${secondCategoryId}"]`).uncheck();
      const categoryCard = page.locator(`[data-game-category-id="${firstCategoryId}"]`).first();
      const publisherId = await categoryCard.getAttribute('data-game-publisher-id');
      if (!publisherId) {
        throw new Error('Expected each catalog game to have a publisher.');
      }

      await page.getByTestId('publisher-filter').selectOption(publisherId);
      const expectedCount = await page.locator(
        `[data-game-category-id="${firstCategoryId}"][data-game-publisher-id="${publisherId}"]`,
      ).count();
      await expect(visibleCards).toHaveCount(expectedCount);
      await expect(page.getByTestId('filter-results-status')).toContainText(
        `Showing ${expectedCount} of`,
      );
    });
  });

  test('filters games by publisher', async ({ page }) => {
    await page.goto('/');
    const gameCards = page.getByTestId('game-card');
    const publisherId = await gameCards.first().getAttribute('data-game-publisher-id');
    if (!publisherId) {
      throw new Error('Expected the first catalog game to have a publisher.');
    }

    await page.getByTestId('publisher-filter').selectOption(publisherId);

    const expectedCount = await page.locator(`[data-game-publisher-id="${publisherId}"]`).count();
    await expect(page.locator('[data-testid="game-card"]:not([hidden])')).toHaveCount(expectedCount);
  });

  test('clears selected game filters', async ({ page }) => {
    await page.goto('/');
    const gameCards = page.getByTestId('game-card');
    const categoryFilter = page.locator('input[name="categoryIds"]').first();

    await categoryFilter.check();
    await page.getByTestId('publisher-filter').selectOption({ index: 1 });
    await page.getByTestId('game-title-search').fill('game');
    await page.getByTestId('clear-game-filters').click();

    await expect(categoryFilter).not.toBeChecked();
    await expect(page.getByTestId('publisher-filter')).toHaveValue('');
    await expect(page.getByTestId('game-title-search')).toHaveValue('');
    await expect(page.locator('[data-testid="game-card"]:not([hidden])')).toHaveCount(
      await gameCards.count(),
    );
  });

  test('should display games with titles on index page', async ({ page }) => {
    await test.step('Navigate to homepage', async () => {
      await page.goto('/');
    });

    await test.step('Verify games grid is visible', async () => {
      const gamesGrid = page.getByTestId('games-grid');
      await expect(gamesGrid).toBeVisible();
    });

    await test.step('Verify game cards are displayed', async () => {
      const gameCards = page.getByTestId('game-card');
      await expect(gameCards.first()).toBeVisible();
      expect(await gameCards.count()).toBeGreaterThan(0);
    });

    await test.step('Verify game cards have titles with content', async () => {
      const gameCards = page.getByTestId('game-card');
      await expect(gameCards.first().getByTestId('game-title')).toBeVisible();
      await expect(gameCards.first().getByTestId('game-title')).not.toBeEmpty();
    });
  });

  test('should display a star rating on each game card', async ({ page }) => {
    await page.goto('/');

    const gameCards = page.getByTestId('game-card');
    await expect(gameCards.first().getByTestId('game-rating')).toBeVisible();
    await expect(gameCards.first().getByTestId('game-rating')).not.toBeEmpty();
    await expect(gameCards).toHaveCount(await gameCards.getByTestId('game-rating').count());
  });

  test('should navigate to correct game details page when clicking on a game', async ({ page }) => {
    let gameId: string | null;
    let gameTitle: string | null;

    await test.step('Navigate to homepage and wait for games to load', async () => {
      await page.goto('/');
      const gamesGrid = page.getByTestId('games-grid');
      await expect(gamesGrid).toBeVisible();
    });

    await test.step('Get first game information and click it', async () => {
      const firstGameCard = page.getByTestId('game-card').first();
      gameId = await firstGameCard.getAttribute('data-game-id');
      gameTitle = await firstGameCard.getAttribute('data-game-title');
      await firstGameCard.click();
    });

    await test.step('Verify navigation to game details page', async () => {
      await expect(page).toHaveURL(`/game/${gameId}`);
      await expect(page.getByTestId('game-details')).toBeVisible();
    });

    await test.step('Verify game title matches clicked game', async () => {
      if (gameTitle) {
        await expect(page.getByTestId('game-details-title')).toHaveText(gameTitle);
      }
    });
  });

  test('should display game details with all required information', async ({ page }) => {
    await test.step('Navigate to specific game details page', async () => {
      await page.goto('/game/1');
      await expect(page.getByTestId('game-details')).toBeVisible();
    });

    await test.step('Verify game title is displayed', async () => {
      const gameTitle = page.getByTestId('game-details-title');
      await expect(gameTitle).toBeVisible();
      await expect(gameTitle).not.toBeEmpty();
    });

    await test.step('Verify game description is displayed', async () => {
      const gameDescription = page.getByTestId('game-details-description');
      await expect(gameDescription).toBeVisible();
      await expect(gameDescription).not.toBeEmpty();
    });

    await test.step('Verify publisher or category information is present', async () => {
      const publisherExists = await page.getByTestId('game-details-publisher').isVisible();
      const categoryExists = await page.getByTestId('game-details-category').isVisible();
      expect(publisherExists || categoryExists).toBeTruthy();

      if (publisherExists) {
        await expect(page.getByTestId('game-details-publisher')).not.toBeEmpty();
      }

      if (categoryExists) {
        await expect(page.getByTestId('game-details-category')).not.toBeEmpty();
      }
    });
  });

  test('should display a button to back the game', async ({ page }) => {
    await test.step('Navigate to game details page', async () => {
      await page.goto('/game/1');
      await expect(page.getByTestId('game-details')).toBeVisible();
    });

    await test.step('Verify back game button is visible and enabled', async () => {
      const backButton = page.getByTestId('back-game-button');
      await expect(backButton).toBeVisible();
      await expect(backButton).toContainText('Support This Game');
      await expect(backButton).toBeEnabled();
    });
  });

  test('should be able to navigate back to home from game details', async ({ page }) => {
    await test.step('Navigate to game details page', async () => {
      await page.goto('/game/1');
      await expect(page.getByTestId('game-details')).toBeVisible();
    });

    await test.step('Click back to all games link', async () => {
      const backLink = page.getByRole('link', { name: /back to all games/i });
      await expect(backLink).toBeVisible();
      await backLink.click();
    });

    await test.step('Verify navigation back to homepage', async () => {
      await expect(page).toHaveURL('/');
      await expect(page.getByTestId('games-grid')).toBeVisible();
    });
  });

  test('should return a 404 page for a non-existent game', async ({ page }) => {
    let response: Response | null;

    await test.step('Navigate to non-existent game', async () => {
      response = await page.goto('/game/99999');
    });

    await test.step('Verify a branded 404 page is served', async () => {
      expect(response?.status()).toBe(404);
      await expect(page).toHaveTitle(/Page Not Found - Tailspin Toys/);
      await expect(page.getByTestId('not-found')).toBeVisible();
      await expect(page.getByTestId('not-found-heading')).not.toBeEmpty();
      await expect(page.getByTestId('not-found-home-link')).toBeVisible();
    });
  });
});
