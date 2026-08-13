import { test, expect } from '@playwright/test';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

test.beforeEach(() => {
  try {
    rmSync(join(process.cwd(), 'data', 'necesito-test.db'), { force: true });
  } catch (e) {}
});

test('Report creation flow', async ({ page }) => {
  await page.goto('/');
  
  // Register first
  await page.fill('#volunteerAlias', 'Test Volunteer');
  await page.fill('#volunteerPhone', '3001234567');
  await page.click('#btnSaveProfile');
  await expect(page.locator('#view-home')).toBeVisible();
  
  // Click new report
  await page.click('#btnNewReport');
  await expect(page.locator('#view-capture')).toBeVisible();
  
  // Select needs
  await page.click('button[data-need="water"]');
  await page.click('button[data-need="food"]');
  
  // Select priority
  await page.click('button[data-priority="urgent"]');
  
  // Fill description
  await page.fill('#descriptionInput', 'Need food and water asap');
  
  // Submit report
  await page.click('#btnSaveReport');
  
  // Verify alert or view change (we just wait for home to be visible again)
  page.on('dialog', dialog => dialog.accept());
  await expect(page.locator('#view-home')).toBeVisible();
});
