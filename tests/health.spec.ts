import { test, expect } from '@playwright/test';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

test.beforeEach(() => {
  try {
    rmSync(join(process.cwd(), 'data', 'necesito-test.db'), { force: true });
  } catch (e) {}
});

test('API health check returns 200 OK', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.ok()).toBeTruthy();
  const json = await response.json();
  expect(json.ok).toBe(true);
});
