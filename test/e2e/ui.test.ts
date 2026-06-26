import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { chromium, type Browser, type Page } from 'playwright';
import { startServer } from '../../src/server.ts';

describe('UI', () => {
  let dbPath: string;
  let server: Awaited<ReturnType<typeof startServer>>['server'];
  let client: Awaited<ReturnType<typeof startServer>>['client'];
  let port: number;
  let baseUrl: string;
  let browser: Browser | undefined;
  let page: Page | undefined;

  before(async () => {
    dbPath = path.join(os.tmpdir(), `habit-tracker-ui-${randomUUID()}.db`);
    ({ server, client, port } = await startServer({ dbPath, port: 0 }));
    baseUrl = `http://127.0.0.1:${port}`;

    try {
      browser = await chromium.launch();
      page = await browser.newPage();
    } catch (err) {
      throw new Error(
        'Playwright browser not found. Run: npx playwright install chromium',
        { cause: err },
      );
    }
  });

  after(async () => {
    await browser?.close();
    server?.close();
    client?.close();
    if (dbPath && fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  beforeEach(async () => {
    assert.ok(page, 'page not initialized');

    const habits = (await fetch(`${baseUrl}/api/habits`).then((r) => r.json())) as {
      id: number;
    }[];
    for (const habit of habits) {
      await fetch(`${baseUrl}/api/habits/${habit.id}`, { method: 'DELETE' });
    }
    await page.goto(baseUrl);
  });

  it('adds a habit from the form', async () => {
    await page!.getByPlaceholder('New habit...').fill('Exercise');
    await page!.getByRole('button', { name: 'Add' }).click();

    const habit = page!.locator('#habit-list li', { hasText: 'Exercise' });
    await habit.waitFor();
    assert.ok(await habit.isVisible());
  });

  it('toggles today completion for a habit', async () => {
    await page!.getByPlaceholder('New habit...').fill('Read');
    await page!.getByRole('button', { name: 'Add' }).click();
    await page!.locator('#habit-list li', { hasText: 'Read' }).waitFor();

    const checkbox = page!.locator('#habit-list input[type="checkbox"]');
    assert.equal(await checkbox.isChecked(), false);

    await checkbox.check();
    await page!.getByText('1 day streak').waitFor();

    assert.equal(await checkbox.isChecked(), true);
  });

  it('deletes a habit', async () => {
    await page!.getByPlaceholder('New habit...').fill('Meditate');
    await page!.getByRole('button', { name: 'Add' }).click();
    await page!.locator('#habit-list li', { hasText: 'Meditate' }).waitFor();

    await page!.getByRole('button', { name: 'Delete' }).click();
    await page!.getByText('No habits yet. Add one above.').waitFor();

    assert.equal(await page!.locator('#habit-list li').count(), 0);
  });
});
