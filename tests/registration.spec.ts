import { test, expect } from '@playwright/test';

test('User registration flow', async ({ page }) => {
  await page.goto('/');
  
  await page.fill('#volunteerAlias', 'Test Volunteer');
  await page.fill('#volunteerPhone', '3001234567');
  await page.click('#btnSaveProfile');
  
  await expect(page.locator('#view-home')).toBeVisible();
  await expect(page.locator('#btnNewReport')).toBeVisible();
});
