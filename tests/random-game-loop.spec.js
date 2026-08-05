import { test, expect } from '@playwright/test';

// Use production URL or local URL based on TEST_ENV
const APP_URL = process.env.TEST_ENV === 'local' 
  ? 'http://localhost:5173/18komputer/' 
  : 'https://kimko.github.io/18komputer/';

test('Randomized core game loop (Chaos Monkey)', async ({ page, context }) => {
  // We need clipboard permissions for the share test
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  // --- 1. VISIT MAIN MENU ---
  await page.goto(APP_URL);
  await expect(page).toHaveTitle(/18komputer/i);
  await page.getByRole('button', { name: 'New Game' }).click();

  // --- 2. START A NEW GAME ---
  // Wait for search input to be ready
  const searchInput = page.getByPlaceholder('Search titles...');
  await searchInput.waitFor({ state: 'visible' });

  // Pick a random game button (they mostly start with '18')
  const gameButtons = page.getByRole('button').filter({ hasText: /^18/ });
  const gameCount = await gameButtons.count();
  if (gameCount > 0) {
    const randomIdx = Math.floor(Math.random() * Math.min(gameCount, 20)); // limit to first 20 so they are visible/rendered
    await gameButtons.nth(randomIdx).click();
  }

  const numPlayers = Math.floor(Math.random() * 3) + 2; // Add 2-4 more players
  const playerNames = ['Player 1']; // Default player we know exists
  for (let i = 0; i < numPlayers; i++) {
    const pName = `TestPlayer${i + 1}`;
    playerNames.push(pName);
    await page.getByPlaceholder('Player Name').fill(pName);
    await page.getByRole('button', { name: 'Add Player' }).click();
  }
  
  // Verify players are added
  for (const pName of playerNames) {
    await expect(page.getByText(pName, { exact: true })).toBeVisible();
  }

  // Start
  await page.getByRole('button', { name: 'Start Game' }).click();

  // --- 3. ACTIVATE COMPANIES ---
  await expect(page.getByRole('heading', { name: 'Activate Company' })).toBeVisible();
  
  // Find all activate buttons
  const activateButtons = page.getByRole('button', { name: 'Activate', exact: true });
  const numCompanies = await activateButtons.count();
  
  // Activate up to 3 random companies
  const companiesToActivate = Math.min(numCompanies, 3);
  for(let i = 0; i < companiesToActivate; i++) {
    // Always get the first "Activate" button since the previous one became "Deactivate"
    const activateBtn = page.getByRole('button', { name: 'Activate', exact: true }).first();
    await activateBtn.click();
    
    // Wait to see if par value buttons appear
    const parLabel = page.getByText('Select Initial Par Value').nth(i);
    try {
      await parLabel.waitFor({ state: 'visible', timeout: 2000 });
      const parButton = parLabel.locator('..').getByRole('button').first();
      await parButton.click();
    } catch(e) {
      // Game probably has no par values defined, skip
    }
  }

  // --- 4. CALCULATOR ---
  await page.getByRole('button', { name: /Calc/ }).click();
  await expect(page.getByRole('button', { name: 'Copy' })).toBeVisible();

  // Find active company tabs
  const companyTabs = page.locator('div > button').filter({ hasText: /^[A-Z0-9]+$/ });
  
  // Company 1: Single Train
    if (await companyTabs.count() > 0) {
    await companyTabs.nth(0).click();
    // Click some random revenue center stops (e.g. 10, 20, 30 buttons)
    // They are just buttons with numbers that don't have 'Copy' or 'Clear' text.
    // Easiest is to locate buttons by their numeric name
    const stopButton = page.getByRole('button', { name: '30', exact: true });
    if(await stopButton.count() > 0) {
        for(let i=0; i<3; i++) {
            await stopButton.first().click();
        }
    }
  }

  // Company 2: Multiple Trains
  if (await companyTabs.count() > 1) {
    await companyTabs.nth(1).click();
    // Copy to make 2-5 trains
    const numTrains = Math.floor(Math.random() * 4) + 2;
    for(let i=0; i < numTrains - 1; i++) { 
        await page.getByRole('button', { name: 'Copy' }).first().click();
    }
    // Add stops to the first train
    const stopButton = page.getByRole('button', { name: '40', exact: true });
    if(await stopButton.count() > 0) {
        for(let i=0; i<5; i++) {
            await stopButton.first().click();
        }
    }
  }

  // --- 5. DASHBOARD RESULTS ---
  await page.getByRole('button', { name: 'Results' }).click();
  
  // Wait for Dashboard to mount
  await expect(page.getByRole('heading', { name: 'Company Values & Results' }).first()).toBeVisible({ timeout: 5000 }).catch(() => {});

  const companyValuesHeading = page.getByRole('heading', { name: 'Company Values & Results' });
  const hasCompanies = await companyValuesHeading.count() > 0;
  
  if (hasCompanies) {
      // The grid has headers, then data. We can find the buttons by their actual context.
      // Easiest is to locate the row for the first company. We know the shortName.
      // But we don't have the shortName saved.
      // Let's just find the first button that opens the share price popup by its click handler or position.
      // The `- OR` and `+ OR` buttons are size="xs". The grid buttons are size="md" (default).
      const gridButtons = companyValuesHeading.locator('..').locator('..').locator('button').filter({ hasNotText: 'OR' });
      
      const sharePriceBtn = gridButtons.first();
      if (await sharePriceBtn.count() > 0) {
          await sharePriceBtn.click();
          
          await expect(page.getByText('Set final price for')).toBeVisible();
          
          const popupContent = page.getByText('Set final price for').locator('..').locator('..');
          const priceOptions = popupContent.locator('button').filter({ hasText: /^[0-9]+$/ });
          const numOptions = await priceOptions.count();
          if (numOptions > 0) {
              await priceOptions.nth(Math.floor(Math.random() * numOptions)).click();
          } else {
              await page.getByRole('button', { name: 'X', exact: true }).click();
          }
          
          await expect(page.getByText('Set final price for')).not.toBeVisible();
      }
  }

  // B. Random OR Values
  let or1Btn;
  if (hasCompanies) {
      const gridButtons = companyValuesHeading.locator('..').locator('..').locator('button').filter({ hasNotText: 'OR' });
      // The first button is Share Price. The second button is OR 1.
      if (await gridButtons.count() > 1) {
          or1Btn = gridButtons.nth(1);
          await or1Btn.click();
          await expect(page.getByText('Set OR 1 revenue for')).toBeVisible();
      }
  }
  
  if (or1Btn) {
      const orChoice = Math.floor(Math.random() * 2);
      if (orChoice === 0) {
          // Manual type '150'
          await page.getByRole('button', { name: '1', exact: true }).click();
          await page.getByRole('button', { name: '5', exact: true }).click();
          await page.getByRole('button', { name: '0', exact: true }).click();
      } else {
          // Fetch from calculator by clicking the subtitle (which is the first button in the popup header)
          const popupHeader = page.getByText('Set OR 1 revenue for').locator('..');
          await popupHeader.locator('button').first().click();
      }
      // Click Confirm (OK button)
      await page.getByRole('button', { name: 'OK', exact: true }).click();
  }


  // C. Player Shares and Details Observe
  await page.getByRole('button', { name: 'Details' }).click();
  await expect(page.getByRole('button', { name: 'Hide Details' })).toBeVisible();


  // --- 6. MAGIC LINK SHARE ---
  await page.getByRole('button', { name: '📤 Share' }).click();
  await expect(page.getByText('Magic Link copied!')).toBeVisible();

  const clipboardText = await page.evaluate("navigator.clipboard.readText()");
  expect(clipboardText).toContain('#import=');

  // Output the magic link for manual inspection
  console.log('\n\n======================================================');
  console.log('✨ MAGIC LINK FOR TEST INSPECTION ✨');
  console.log(clipboardText);
  console.log('======================================================\n\n');

  // --- 7. OPEN SHARED GAME ---
  await page.goto('about:blank');
  await page.goto(clipboardText);

  // We should be redirected to the dashboard automatically
  await expect(page).toHaveURL(/.*\/dashboard/);
  await expect(page.getByText(playerNames[0], { exact: true })).toBeVisible();

  // --- 8. DELETE THE GAME ---
  await page.getByRole('button', { name: 'Home' }).click();
  await page.getByRole('button', { name: 'Resume Game' }).click();
  
  // Find delete button
  const deleteBtn = page.getByRole('button', { name: 'Delete' }).first();
  await deleteBtn.click();
  
  // Confirm delete
  await page.getByRole('heading', { name: 'Delete Game?' }).locator('..').getByRole('button', { name: 'Delete' }).click();
});
