import { test, expect } from '@playwright/test';

const TOKEN = 'N4IglgJiBcIOYEMC2BTA+gRgOwA4BsADACwDMhATDlgWuUXiADTzIoCSUsGORNJADkxaoAcqxghuvNAIAEefrICCAVzgBaAg2b8ANggCeKAE4BnGAG0QS3SgAeCAHYQTsgMIJjSMAGMAFggoukIACiiOQQD2-CiyANLhpmCOcAAukY6h4VExsgASnsbJaRlCAMooAEYIpqlgTvmFxemZzBXVtfWO8YnNpW1VNXUNHl6+AUEgALrMPsYoCKkoEEqpEuQE5HiaOJp4ACoYAJzQGCTQ5OQAdFQEAFpCAG4mSaUXzLWLKDCgCD51zzckSQ-CcYBQ5mgFlAjnEsAAQggVOpZCpnLJ4ShUkUqqYfBCgro8QEAGapWQkgA-xlktQAJxA6sTYmVsQgAPvhap+CLdZKyADq4NaIFMfkixlSYlQEnh8IA4kIfJFdBKJABiEn4o4EEhCUHGABqCF0Km+0AIAF9GDC4SAACLIfhk4zIADuhnirpUplMsgAZO5gfwrkIxRKpXb7ft4v63EqVWrYOqAKwIAgENP6zzG03mq0zEB6QwmJS+rGQ4DWkDKkFOAwAeQASpCLIWfCafCp9OljKyvj8QHLFdBQGzkq3QJAYBgPul+K2SARGEvGLw18v11uCIXKhkfazoq2ptap5xsPhiGQCFgjuQjldsBgiHOj5ZV0vd-vTIeF5YTza4DnrghCkIQt4pimVwbBg5Cvn+UIfjuzB7o4B7zsep5ATOIFXuBRxYEQ0EpjgKbwYuy6fih36-phhZgKYBS6CSISGDAJImqYKCWtWEA1H4e6eBA-ZLIOEqVkOCpicYGDrBgBBCBK5AwEQ64gBKerQKpVrMNGsbxqO6kyesS6KcYmkgCAPEfAE8y5maEnDjAOA6UW+hGMYZZcakEk2PYTguDSozeP4gTBIZYqeBCg5ORcy4OjGcRxjAS7Vh2YoSFgKYKdWYQRKquQJI4SQpC0g6RfMjlSXFumJcl0CEGl-ESGQ5Cybl2QFbEBTGEUpVvKAFXRYZsWELV+kwK56V+BIeA4G1VkDB0wzdD1fUlJkEW2cNoCxfFelJQZ8lNRlsBYHgeB6tW7RDF0PTFX0m2DdtVUjvtdUGVNzWwHNWBXUtt0jJ4IUTOFz1Ra9k3jYdk0nTNsBHIjWBWTx1b2PwEbLKs6ybNsBC7FohwnGc0BLlcBFHA8lpAA';

test('import and resume game from lz-string token', async ({ page }) => {
  // Navigate to resume page
  await page.goto('http://localhost:5173/18komputer/resume');
  
  // Click the "Import Game" button to open the modal
  await page.getByRole('button', { name: '📥 Import Game' }).click();

  // Wait for the modal to appear
  await expect(page.getByRole('heading', { name: 'Import Game Token' })).toBeVisible();

  // Paste the token into the textarea
  const textarea = page.locator('textarea[placeholder="Paste token here..."]');
  await textarea.fill(TOKEN);

  // Click the Import button inside the modal
  const importBtn = page.getByRole('button', { name: 'Import', exact: true });
  await importBtn.click();

  // Wait for the modal to close and the imported game to appear in the list
  await expect(page.getByText('1840_3p 6p Aug-06').first()).toBeVisible({ timeout: 5000 });
  
  // Click the imported game to resume it
  await page.getByText('1840_3p 6p Aug-06').first().click();

  // Wait for the dashboard to load by checking for the Data Grids tab
  await expect(page.getByRole('tab', { name: 'Data Grids' })).toBeVisible({ timeout: 10000 });
});
