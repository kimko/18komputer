import { test, expect } from '@playwright/test';
import { fakeSheet, unreachableSheet } from './fakeSheet.js';

const APP_URL = process.env.TEST_ENV === 'local'
  ? 'http://localhost:5173/18komputer/'
  : process.env.TEST_ENV === 'ci'
  ? 'http://localhost:4173/18komputer/'
  : 'https://kimko.github.io/18komputer/';

const PLAYERS = ['Alice Kensington', 'Bob Harrington'];

async function startGame(page) {
  await page.goto(APP_URL);
  await page.getByRole('button', { name: 'New Game' }).click();
  await page.getByPlaceholder('Search titles...').fill('1830');
  await page.getByRole('button', { name: /^1830:/ }).first().click();

  for (const name of PLAYERS) {
    await page.getByPlaceholder('New player name...').fill(name);
    await page.getByRole('button', { name: '+ Add' }).click();
  }

  await page.getByRole('button', { name: 'Start Game' }).click();
  await page.getByRole('button', { name: 'Results', exact: true }).click();
  await expect(page.getByRole('button', { name: '📤 Share' })).toBeVisible();
}

async function share(page) {
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: '📤 Share' }).click();
  await expect(page.getByText('Link copied!')).toBeVisible({ timeout: 20000 });
  return page.evaluate(() => window.__clipboardText);
}

const captureClipboard = (page) => page.addInitScript(() => {
  window.__clipboardText = '';
  navigator.clipboard.writeText = (text) => {
    window.__clipboardText = text;
    return Promise.resolve();
  };
});

test('a shared link opens the game on a device that has never seen it', async ({ browser }) => {
  test.setTimeout(90000);
  const rows = new Map();

  const sender = await browser.newContext();
  const senderPage = await sender.newPage();
  await captureClipboard(senderPage);
  await fakeSheet(senderPage, rows);

  await startGame(senderPage);
  const link = await share(senderPage);
  expect(link).toContain('#remote=');
  expect(link).not.toContain('#import=');
  expect(rows.size).toBe(1);

  const receiver = await browser.newContext();
  const receiverPage = await receiver.newPage();
  await fakeSheet(receiverPage, rows);

  await receiverPage.goto(link);

  await expect(receiverPage).toHaveURL(/.*\/dashboard/, { timeout: 20000 });
  await expect(receiverPage.getByText(PLAYERS[0], { exact: true })).toBeVisible();
  await expect(receiverPage.getByText(PLAYERS[1], { exact: true })).toBeVisible();

  await sender.close();
  await receiver.close();
});

test('sharing a game nobody has touched does not write to the sheet again', async ({ page }) => {
  test.setTimeout(90000);
  const rows = await fakeSheet(page);
  await captureClipboard(page);

  await startGame(page);
  const first = await share(page);
  expect(rows.writes).toBe(1);

  const second = await share(page);

  expect(second).toBe(first);
  expect(rows.writes).toBe(1);
  expect(rows.size).toBe(1);
});

test('changing a number makes the next share write again, to the same row', async ({ page }) => {
  test.setTimeout(90000);
  const rows = await fakeSheet(page);
  await captureClipboard(page);

  await startGame(page);
  await share(page);
  expect(rows.writes).toBe(1);

  await page.getByTestId('cash-btn').first().click();
  await expect(page.getByText(/Set cash for/)).toBeVisible();
  for (const digit of '750') {
    await page.getByRole('button', { name: digit, exact: true }).click();
  }
  await page.getByRole('button', { name: 'OK', exact: true }).click();

  await share(page);

  expect(rows.writes).toBe(2);
  expect(rows.size).toBe(1);
});

test('share says why it failed and copies nothing when the sheet is unreachable', async ({ page }) => {
  test.setTimeout(90000);
  await captureClipboard(page);
  await startGame(page);
  await unreachableSheet(page);

  await page.waitForTimeout(600);
  await page.getByRole('button', { name: '📤 Share' }).click();

  // Until the deployment URL is pasted into sheetConfig.js, a dead endpoint reads as "not set up".
  await expect(page.getByRole('alert'))
    .toContainText(/Could not reach the sheet|not set up yet/, { timeout: 20000 });
  expect(await page.evaluate(() => window.__clipboardText)).toBe('');
});

test('a link for a game the sheet does not have explains itself', async ({ page }) => {
  test.setTimeout(60000);
  await fakeSheet(page);

  await page.goto(`${APP_URL}resume#remote=game_1_2`);

  await expect(page.getByText('That game is not in the sheet.')).toBeVisible({ timeout: 20000 });
});
