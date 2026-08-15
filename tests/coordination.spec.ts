import { test, expect } from '@playwright/test';

test.beforeEach(async ({ request }) => {
  const emergencyId = `test-emergency-${Date.now()}`;
  const donationId = `test-donation-${Date.now()}`;
  
  await request.post('/api/reports/sync', {
    data: {
      reports: [
        {
          local_id: emergencyId,
          volunteer_id: 'test-vol-emergency',
          volunteer_name: 'Rescuer Carlos',
          needs: ['rescue', 'medical'],
          priority: 'critical',
          people_count: 3,
          description: 'Emergency trapped victims test',
          location: {
            lat: 4.6097,
            lng: -74.0817,
            description: 'Barrio Central'
          },
          status: 'new',
          source: 'offline'
        },
        {
          local_id: donationId,
          volunteer_id: 'test-vol-donor',
          volunteer_name: 'Donor Maria',
          needs: ['hygiene', 'clothes'],
          priority: 'necessary',
          description: '5 cajas de ropa termica y kits de aseo',
          location: {
            lat: 4.6200,
            lng: -74.0900,
            description: 'Centro de Acopio'
          },
          status: 'new',
          source: 'donation'
        }
      ]
    }
  });
});

test('Coordination panel visual distinction and type filtering', async ({ page }) => {
  await page.goto('/coordinar');
  
  // Verify emergency card exists with proper styling
  const emergencyCard = page.locator('.pending-item:not(.donation-item)', { hasText: 'Emergency trapped victims test' }).first();
  await expect(emergencyCard).toBeVisible();
  await expect(emergencyCard.locator('.emergency-badge-header')).toBeVisible();

  // Verify donation card exists with distinct donation styling
  const donationCard = page.locator('.pending-item.donation-item', { hasText: '5 cajas de ropa termica' }).first();
  await expect(donationCard).toBeVisible();
  await expect(donationCard.locator('.donation-badge-header')).toHaveText('🎁 DONACIÓN DE INSUMOS');
  await expect(donationCard.locator('.supply-tag', { hasText: 'ASEO' })).toBeVisible();
  await expect(donationCard.locator('.supply-tag', { hasText: 'ROPA' })).toBeVisible();

  // Test Type Tab Filters
  // 1. Filter only Emergencies
  await page.click('button[data-type-filter="emergency"]');
  await expect(emergencyCard).toBeVisible();
  await expect(donationCard).not.toBeVisible();

  // 2. Filter only Donations
  await page.click('button[data-type-filter="donation"]');
  await expect(emergencyCard).not.toBeVisible();
  await expect(donationCard).toBeVisible();

  // Test status update on donation card ("Recibido")
  await donationCard.locator('button[data-action="resolved"]').click();
  await expect(donationCard).toHaveClass(/status-resolved/);

  // 3. Filter All
  await page.click('button[data-type-filter="all"]');
  await expect(emergencyCard).toBeVisible();

  // Test Map View Toggle
  await page.click('#btnToggleMap');
  await expect(page.locator('#mapContainer')).toBeVisible();
  await expect(page.locator('.leaflet-marker-icon', { hasText: '🎁' }).first()).toBeVisible();
});

