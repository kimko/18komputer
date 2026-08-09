import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_URL = process.env.TEST_ENV === 'local'
  ? 'http://localhost:5173/18komputer/'
  : process.env.TEST_ENV === 'ci'
  ? 'http://localhost:4173/18komputer/'
  : 'https://kimko.github.io/18komputer/';

test('import and resume historical game', async ({ page }) => {
  await page.goto(`${APP_URL}resume`);
  
  // Wait for the import button to be ready
  const importInput = page.locator('input[title="Import Legacy JSON"]');
  console.log(await page.content());
  await importInput.waitFor({ state: 'attached', timeout: 5000 });
  
  // Upload the JSON file
  const filePath = path.join(__dirname, 'fixtures', 'historical-games-import.json');
  await importInput.setInputFiles(filePath);

  // Wait for the imported games to appear in the list.
  await expect(page.getByText('1862 hot in the basement').first()).toBeVisible();
  
  // Click the first imported game to resume it
  await page.getByText('1862 hot in the basement').first().click();

  // Wait for the dashboard to load (it should show 'Data Grids' or 'Dashboard' heading)
  await expect(page.getByRole('tab', { name: 'Data Grids' })).toBeVisible({ timeout: 10000 });
});
