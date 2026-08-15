import { test, expect } from '@playwright/test';

test('API health check returns 200 OK', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.ok()).toBeTruthy();
  const json = await response.json();
  expect(json.ok).toBe(true);
});
