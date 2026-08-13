import { test, expect } from '@playwright/test';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

test.beforeEach(async ({ request }) => {
  try {
    rmSync(join(process.cwd(), 'data', 'necesito-test.db'), { force: true });
  } catch (e) {}
  
  // Seed a report via API
  const uniqueId = `test-report-coord-${Date.now()}`;
  await request.post('/api/reports/sync', {
    data: {
      reports: [
        {
          local_id: uniqueId,
          volunteer_id: 'test-vol-2',
          volunteer_name: 'Coord Vol',
          needs: ['food'],
          priority: 'urgent',
          description: 'Coordination test',
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

test('Coordination panel', async ({ page }) => {
  await page.goto('/coordinar');
  
  // Verify list loads
  await expect(page.locator('text=Coordination test').first()).toBeVisible();
  
  // Click status button
  const card = page.locator('.pending-item').first();
  await card.locator('button[data-action="in_progress"]').click();
  
  // Verify color changes (card gets status-in_progress class)
  await expect(card).toHaveClass(/status-in_progress/);
});
