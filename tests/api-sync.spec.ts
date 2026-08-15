import { test, expect } from '@playwright/test';

test('API sync reports', async ({ request }) => {
  const uniqueId = `test-local-${Date.now()}`;
  const syncPayload = {
    reports: [
      {
        local_id: uniqueId,
        volunteer_id: 'test-vol-1',
        volunteer_name: 'Test Vol',
        needs: ['water'],
        priority: 'urgent',
        description: 'Test sync',
        location: {
          lat: 4.6097,
          lng: -74.0817
        },
        status: 'new'
      }
    ]
  };

  // Sync
  const syncRes = await request.post('/api/reports/sync', { data: syncPayload });
  expect(syncRes.ok()).toBeTruthy();
  const syncData = await syncRes.json();
  expect(syncData.synced.length).toBeGreaterThan(0);

  // Get reports
  const getRes = await request.get('/api/reports');
  const reportsData = await getRes.json();
  const reports = reportsData.reports;
  const createdReport = reports.find((r: any) => r.local_id === uniqueId);
  expect(createdReport).toBeDefined();

  // Patch status
  const patchRes = await request.patch(`/api/reports/${createdReport.id}/status`, {
    data: { status: 'in_progress' }
  });
  expect(patchRes.ok()).toBeTruthy();

  // Get history
  const historyRes = await request.get(`/api/reports/${createdReport.id}/history`);
  const historyData = await historyRes.json();
  expect(historyData.history.length).toBeGreaterThan(0);
});
