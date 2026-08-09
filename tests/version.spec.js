import { test, expect } from '@playwright/test';

const APP_URL = process.env.TEST_ENV === 'local' 
  ? 'http://localhost:5173/18komputer/' 
  : process.env.TEST_ENV === 'ci'
  ? 'http://localhost:4173/18komputer/'
  : 'https://kimko.github.io/18komputer/';

test('Application displays a valid version number and does not show vunknown', { tag: '@smoke' }, async ({ page }) => {
  await page.goto(APP_URL);
  
  // Wait for the main menu to load
  await expect(page.getByRole('button', { name: /NEW GAME/i })).toBeVisible();

  // Ensure it doesn't say "vunknown"
  const unknownLocator = page.locator('text="vunknown"');
  await expect(unknownLocator).toHaveCount(0);
  
  // Find the version text matching the semantic version pattern (e.g., v1.0.0 or v1.0.0-hash)
  const versionTextLocator = page.locator('text=/^v\\d+\\.\\d+\\.\\d+/');
  await expect(versionTextLocator).toBeVisible();
});
