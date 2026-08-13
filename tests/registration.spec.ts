import { test, expect } from '@playwright/test';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

test.beforeEach(() => {
  try {
    rmSync(join(process.cwd(), 'data', 'necesito-test.db'), { force: true });
  } catch (e) {}
});

test('User registration flow', async ({ page }) => {
  await page.goto('/');
  
  await page.fill('#volunteerAlias', 'Test Volunteer');
  await page.fill('#volunteerPhone', '3001234567');
  await page.click('#btnSaveProfile');
  
  await expect(page.locator('#view-home')).toBeVisible();
  await expect(page.locator('#btnNewReport')).toBeVisible();
});
