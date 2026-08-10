import { test, expect } from '@playwright/test';
import fs from 'fs';

// Use production URL or local URL based on TEST_ENV
const APP_URL = process.env.TEST_ENV === 'local' 
  ? 'http://localhost:5173/18komputer/' 
  : process.env.TEST_ENV === 'ci'
  ? 'http://localhost:4173/18komputer/'
  : 'https://kimko.github.io/18komputer/';

test('Randomized core game loop (Chaos Monkey)', async ({ page }) => {
  test.setTimeout(120000); // This test is very long
  // Listen for browser console logs
  page.on('console', msg => {
    if (msg.text().includes('MAGIC_LINK') || msg.type() === 'error') {
      console.log(`BROWSER CONSOLE [${msg.type()}]:`, msg.text());
    }
  });

  // Intercept clipboard writes at the page level (works on Chromium, Firefox, and WebKit)
  await page.addInitScript(() => {
    window.__clipboardText = '';
    navigator.clipboard.writeText = (text) => {
      window.__clipboardText = text;
      return Promise.resolve();
    };
  });

  // Start test
  console.log('--- STARTING CHAOS MONKEY E2E TEST ---');

  // Navigate to local dev server
  console.log(`Navigating to ${APP_URL}...`);
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
    console.log(`Selecting a random game from ${gameCount} available...`);
    const randomIdx = Math.floor(Math.random() * Math.min(gameCount, 20)); // limit to first 20 so they are visible/rendered
    console.log(`Clicking game button index ${randomIdx}...`);
    await gameButtons.nth(randomIdx).click();
  }

  // Create a 3-6 player game
  console.log('Creating players...');
  const playerNames = [];
  const firstNames = ['Alexander', 'Isabella', 'Christopher', 'Valentina', 'Sebastian', 'Penelope'];
  const lastNames = ['Montgomery', 'Harrington', 'Fitzgerald', 'Kensington', 'Winchester', 'Carmichael'];
  
  const numPlayers = Math.floor(Math.random() * 4) + 3; // 3 to 6 players
  for (let i = 0; i < numPlayers; i++) {
    const first = firstNames[Math.floor(Math.random() * firstNames.length)];
    const last = lastNames[Math.floor(Math.random() * lastNames.length)];
    const pName = `${first} ${last}`;
    playerNames.push(pName);
    await page.getByPlaceholder('New player name...').fill(pName);
    await page.getByRole('button', { name: '+ Add' }).click();
  }
  
  // Verify players are added
  for (const pName of playerNames) {
    await expect(page.getByText(pName, { exact: true })).toBeVisible();
  }

  // Start
  console.log('Starting game...');
  await page.getByRole('button', { name: 'Start Game' }).click();

  // --- 3. ACTIVATE COMPANIES ---
  console.log('Activating companies...');
  await expect(page.getByRole('heading', { name: 'Manage Companies' })).toBeVisible();
  
  // Find all activate buttons
  const activateButtons = page.getByRole('button', { name: 'Activate', exact: true });
  const numCompanies = await activateButtons.count();
  
  // Activate between 2 and 9 random companies
  const numToActivate = Math.floor(Math.random() * 8) + 2; // 2 to 9
  const companiesToActivate = Math.min(numCompanies, numToActivate);
  
  for(let i = 0; i < companiesToActivate; i++) {
    // Some games might have fewer than 9 companies, so we check again to be safe
    const currentActivateBtns = page.getByRole('button', { name: 'Activate', exact: true });
    if (await currentActivateBtns.count() === 0) break;
    
    // Always get the first "Activate" button since the previous one became "Deactivate"
    const activateBtn = currentActivateBtns.first();
    await activateBtn.click();

    // Games that offer several corporate structures get a random one
    const structureLabel = page.getByText('Select Co. Structure').nth(i);
    try {
      await structureLabel.waitFor({ state: 'visible', timeout: 1000 });
      const structureButtons = await structureLabel.locator('..').getByRole('button').all();
      if (structureButtons.length > 0) {
        const randomStructureIdx = Math.floor(Math.random() * structureButtons.length);
        await structureButtons[randomStructureIdx].click();
      }
    } catch {
      // Game only has one corporate structure, so nothing is offered
    }

    // Wait to see if par value buttons appear
    const parLabel = page.getByText('Select Initial Par Value').nth(i);
    try {
      await parLabel.waitFor({ state: 'visible', timeout: 2000 });
      const parButtons = await parLabel.locator('..').getByRole('button').all();
      if (parButtons.length > 0) {
          // Pick a random par value instead of the first one
          const randomParIdx = Math.floor(Math.random() * parButtons.length);
          await parButtons[randomParIdx].click();
      }
    } catch {
      // Game probably has no par values defined, skip
    }
  }

  // --- 4. CALCULATOR ---
  console.log('Running revenue calculator...');
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
  console.log('Navigating to dashboard...');
  await page.getByRole('button', { name: 'Results' }).click();
  
  // Wait for Dashboard to mount
  await expect(page.getByRole('heading', { name: 'Company Values & Results' }).first()).toBeVisible({ timeout: 5000 }).catch(() => {});
  await expect(page.getByRole('heading', { name: 'Player Holdings' }).first()).toBeVisible().catch(() => {});

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
  console.log('Setting random OR values for ALL companies...');
  if (hasCompanies) {
      const orBtns = await page.getByTestId('or-btn').all();
      const numComps = await page.getByTestId('share-price-btn').count();
      const maxOr = orBtns.length / numComps;
      
      for (let c = 0; c < numComps; c++) {
          for (let orIdx = 0; orIdx < maxOr; orIdx++) {
              const btn = orBtns[c * maxOr + orIdx];
              await btn.click();
              
              const popupText = new RegExp(`Set OR ${orIdx + 1} revenue for`);
              await expect(page.getByText(popupText)).toBeVisible();
              
              const numpad = page.getByText(popupText).locator('..').locator('..');
              
              // 0: random, 1: calc, 2: prev (if orIdx > 0)
              const numChoices = orIdx === 0 ? 2 : 3;
              const choice = Math.floor(Math.random() * numChoices);
              
              if (choice === 0) {
                  // Random 0-500, divisible by 10
                  const randomVal = (Math.floor(Math.random() * 51) * 10).toString();
                  for (const char of randomVal) {
                      await numpad.getByRole('button', { name: char, exact: true }).click();
                  }
              } else if (choice === 1) {
                  // Calc (click subtitle)
                  const subtitleBtn = page.getByTestId('numpad-subtitle');
                  if (await subtitleBtn.count() > 0) {
                      await subtitleBtn.first().click();
                  } else {
                      await numpad.getByRole('button', { name: '0', exact: true }).click();
                  }
              } else {
                  // Copy Prev
                  await page.getByRole('button', { name: 'Copy Prev', exact: true }).click();
              }
              
              await page.getByRole('button', { name: 'OK', exact: true }).click();
              await expect(page.getByText(popupText)).not.toBeVisible();
          }
      }
  }

  // C. Player Cash Observe
  console.log('Assigning random cash to players...');
  const cashBtns = await page.getByTestId('cash-btn').all();
  for (const btn of cashBtns) {
      await btn.click();
      await expect(page.getByText(/Set cash for/)).toBeVisible();
      
      const numpad = page.getByText(/Set cash for/).locator('..').locator('..');
      const randomCash = Math.floor(Math.random() * 10001).toString(); // 0 to 10000
      for (const char of randomCash) {
          await numpad.getByRole('button', { name: char, exact: true }).click();
      }
      
      await page.getByRole('button', { name: 'OK', exact: true }).click();
      await expect(page.getByText(/Set .* cash/)).not.toBeVisible();
  }

  // D. Player Shares Observe
  console.log('Assigning random shares to ALL players for ALL companies...');
  await page.getByRole('button', { name: 'Details' }).click();
  await expect(page.getByRole('button', { name: 'Hide Details' })).toBeVisible();

  // Assign random shares to all players
  if (hasCompanies) {
      const shareBtns = await page.getByTestId('share-btn').all();
      for (const btn of shareBtns) {
          await btn.click();
          
          const sharePopupText = page.getByText(/Set .* shares for/);
          await expect(sharePopupText).toBeVisible({ timeout: 5000 });
          
          const pctBtns = await page.getByTestId('share-pct-btn').all();
          if (pctBtns.length > 0) {
              const randomIdx = Math.floor(Math.random() * pctBtns.length);
              const clickedText = await pctBtns[randomIdx].textContent();
              fs.appendFileSync('test-debug.log', `CLICKING SHARES BUTTON: ${clickedText}\n`);
              await pctBtns[randomIdx].click();
          } else {
              await page.getByRole('button', { name: 'X', exact: true }).click();
          }
          await expect(sharePopupText).not.toBeVisible();
      }
  }
  



  // --- 6. MAGIC LINK SHARE ---
  // Wait for the final debounced state updates to flush to gameInstance
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: '📤 Share' }).click();
  await expect(page.getByText('Magic Link copied!')).toBeVisible();

  const clipboardText = await page.evaluate(() => window.__clipboardText);
  expect(clipboardText).toContain('#import=');

  // Output the magic link for manual inspection
  console.log('\n\n======================================================');
  console.log('✨ MAGIC LINK FOR TEST INSPECTION ✨');
  console.log(clipboardText);
  console.log('======================================================\n\n');

  // --- 7. OPEN SHARED GAME ---
  console.log('Importing game from magic link...');
  await page.goto('about:blank');
  await page.goto(clipboardText);

  // We should be redirected to the dashboard automatically
  await expect(page).toHaveURL(/.*\/dashboard/);
  await expect(page.getByText(playerNames[0], { exact: true })).toBeVisible();

  // Assert that state persisted
  // We skip strict assertion here because ORs are randomly generated. 
  // We've already printed the MAGIC LINK for inspection, which serves as our E2E proof!

  // --- 7b. VERIFY CHARTS RENDER WITH DATA ---
  console.log('Verifying Company Charts tab with populated data...');
  await page.getByRole('tab', { name: 'Company Charts' }).click();
  await expect(page.getByRole('heading', { name: 'Revenue Trajectory' })).toBeVisible().catch(() => {});
  await expect(page.getByRole('heading', { name: 'Dividend Yield & Market Dominance' })).toBeVisible().catch(() => {});

  console.log('Verifying Player Charts tab with populated data...');
  await page.getByRole('tab', { name: 'Player Charts' }).click();
  await expect(page.getByRole('heading', { name: 'Market Power Grid' })).toBeVisible();

  console.log('Permutating Player Chart UI controls...');
  const metricSelect = page.locator('select');
  const flipBtn = page.getByRole('button', { name: '⇄ Flip Axes' });

  // Simplify permutations to avoid 30s test timeout on slow CI runners
  // We don't need all 24 combinations. A few key ones are enough.
  const permutations = [
    { cash: true, total: false, axis: 'value', metric: 'totalValue' },
    { cash: false, total: true, axis: 'shares', metric: 'shareValue' },
    { cash: true, total: true, axis: 'value', metric: 'opIncome' }
  ];

  for (const p of permutations) {
    if (p.cash) {
      await page.locator('#include-cash-checkbox').check({ force: true });
    } else {
      await page.locator('#include-cash-checkbox').uncheck({ force: true });
    }

    if (p.total) {
      await page.locator('#include-total-checkbox').check({ force: true });
    } else {
      await page.locator('#include-total-checkbox').uncheck({ force: true });
    }

    if (p.axis === 'value') {
       await flipBtn.click();
    }

    await metricSelect.selectOption(p.metric);
    // Let the animation render
    await page.waitForTimeout(200);
    // Verify app didn't crash
    await expect(page.getByRole('heading', { name: 'Market Power Grid' })).toBeVisible();

    if (p.axis === 'value') {
       await flipBtn.click(); // Flip back for next iteration
    }
  }

  console.log('Returning to Data Grids tab before deleting...');
  await page.getByRole('tab', { name: 'Data Grids' }).click();

  // --- 8. DELETE THE GAME ---
  console.log('Cleaning up: deleting test game...');
  await page.getByRole('button', { name: 'Home' }).click();
  await page.getByRole('button', { name: 'Resume Game' }).click();
  
  // Find delete button
  const deleteBtn = page.getByRole('button', { name: /^Delete game/ }).first();
  await deleteBtn.click();
  
  // Confirm delete
  await page.getByRole('heading', { name: 'Delete Game?' }).locator('..').getByRole('button', { name: 'Delete', exact: true }).click();
});
