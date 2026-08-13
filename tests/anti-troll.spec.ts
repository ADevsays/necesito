import { test, expect } from '@playwright/test';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

test.beforeEach(async ({ request }) => {
  try {
    rmSync(join(process.cwd(), 'data', 'necesito-test.db'), { force: true });
  } catch (e) {}
  
  // Seed a report via API
  const uniqueId = `test-report-troll-${Date.now()}`;
  await request.post('/api/reports/sync', {
    data: {
      reports: [
        {
          local_id: uniqueId,
          volunteer_id: 'test-vol-3',
          volunteer_name: 'Troll Vol',
          needs: ['other'],
          priority: 'needed',
          description: 'Spam report',
          location: {
            lat: 4.6097,
            lng: -74.0817
          },
          status: 'new'
        }
      ]
    }
  });
});

test('Anti-Troll panel - Flagging 3 times hides report', async ({ page, request }) => {
  await page.goto('/coordinar');
  
  // Verify list loads
  await expect(page.locator('text=Spam report').first()).toBeVisible();
  
  // Get report ID from the DOM
  const card = page.locator('.pending-item').first();
  const reportId = await card.getAttribute('data-report-id');
  
  // Mock localStorage for the UI click (1st vote)
  await page.evaluate(() => localStorage.setItem('volunteerId', 'user_1'));
  
  // Overwrite confirm dialog to always accept
  page.on('dialog', dialog => dialog.accept());
  
  // 1st vote via UI
  const flagBtn = card.locator('button[data-action="flag"]');
  await flagBtn.click();
  
  // Wait for UI to update text to "⚠ 1 reportes"
  await expect(flagBtn).toContainText('1 reportes');
  
  // 2nd vote via API
  const res2 = await request.post(`/api/reports/${reportId}/flag`, {
    data: { flagged_by: 'user_2', reason: 'falso' }
  });
  expect(res2.ok()).toBeTruthy();
  
  // 3rd vote via API (should hide the report)
  const res3 = await request.post(`/api/reports/${reportId}/flag`, {
    data: { flagged_by: 'user_3', reason: 'spam' }
  });
  expect(res3.ok()).toBeTruthy();
  
  // Verify API returns 3 flags and status flagged
  const data3 = await res3.json();
  expect(data3.flagCount).toBe(3);
  expect(data3.report.status).toBe('flagged');
  
  // Reload page and verify it's hidden from the default list
  await page.reload();
  await expect(page.locator('text=Spam report').first()).not.toBeVisible();
});
