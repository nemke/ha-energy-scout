import { test, expect } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';

test.beforeEach(async ({ page }) => {
  const auth = JSON.parse(
    await readFile(
      process.env.SCOUT_PREVIEW_AUTH || '/tmp/energy-scout-preview-auth.json',
      'utf8',
    ),
  );
  await page.addInitScript(
    (tokens) =>
      localStorage.setItem(
        'hassTokens',
        JSON.stringify({ ...tokens, expires: Date.now() + 1800000 }),
      ),
    auth,
  );
  await page.goto('/energy-scout');
  await expect(
    page.getByRole('heading', { name: 'Your energy devices' }),
  ).toBeVisible({ timeout: 30000 });
  const confirmation = page.getByText('Confirm new HTTP server configuration', {
    exact: true,
  });
  if (await confirmation.isVisible())
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Select recommended', exact: true }),
  ).toBeEnabled();
  await page.locator('energy-scout-panel').evaluate((element) =>
    element.hass.callWS({
      type: 'energy/save_prefs',
      device_consumption: [],
    }),
  );
  await page.getByRole('button', { name: 'Rescan', exact: true }).click();
  await expect(
    page.locator('energy-scout-panel header .secondary'),
  ).toContainText('35 recommended · 0 already tracked');
  await expect(
    page.getByRole('button', { name: 'Select recommended', exact: true }),
  ).toBeEnabled();
});

const panel = (page) => page.locator('energy-scout-panel');
const table = (page) => panel(page).locator('ha-data-table');
const count = (page) => table(page).evaluate((element) => element.data.length);
const selected = (page) => panel(page).locator('.toolbar span[aria-live]');

test('uses actual HA controls, lists devices, and captures desktop preview', async ({
  page,
}) => {
  expect(await count(page)).toBe(37);
  expect(
    await page.evaluate(
      () =>
        !!customElements.get('ha-data-table') &&
        !!customElements.get('ha-form'),
    ),
  ).toBe(true);
  await expect(panel(page).locator('.filters > ha-form')).toHaveCount(1);
  await mkdir('docs/previews/panel', { recursive: true });
  await page.screenshot({
    path: 'docs/previews/panel/desktop.png',
    fullPage: true,
  });
});

test('35 devices can be selected and reviewed together without writing', async ({
  page,
}) => {
  await page
    .getByRole('button', { name: 'Select recommended', exact: true })
    .click();
  await expect(selected(page)).toHaveText('35 selected');
  await page
    .getByRole('button', { name: 'Review additions', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Review 35 additions' }),
  ).toBeVisible();
  expect(await count(page)).toBe(35);
  await expect(
    page.getByRole('button', { name: 'Add 35 devices', exact: true }),
  ).toBeEnabled();
  await page.screenshot({
    path: 'docs/previews/panel/review.png',
    fullPage: true,
  });
  await page
    .getByRole('button', { name: 'Back to devices', exact: true })
    .click();
  await expect(selected(page)).toHaveText('35 selected');
  const result = await panel(page).evaluate((element) =>
    element.hass.callWS({ type: 'energy_scout/list' }),
  );
  expect(result.devices).toHaveLength(0);
});

test('search and room filters restrict bulk selection and clear old selections', async ({
  page,
}) => {
  await page
    .getByRole('button', { name: 'Select recommended', exact: true })
    .click();
  await panel(page).locator('ha-input-search input').fill('appliance 35');
  await expect.poll(() => count(page)).toBe(1);
  await expect(selected(page)).toHaveText('0 selected');
  await page
    .getByRole('button', { name: 'Select recommended', exact: true })
    .click();
  await expect(selected(page)).toHaveText('1 selected');
  await panel(page).locator('ha-input-search input').fill('');
  await panel(page)
    .locator('.filters > ha-form')
    .evaluate((element) =>
      element.dispatchEvent(
        new CustomEvent('value-changed', {
          detail: { value: { status: 'recommended', area: 'Kitchen' } },
          bubbles: true,
          composed: true,
        }),
      ),
    );
  await expect.poll(() => count(page)).toBe(8);
  await expect(selected(page)).toHaveText('0 selected');
});

test('edited mappings survive HA updates and rescans', async ({ page }) => {
  await table(page)
    .getByRole('button', { name: 'Edit', exact: true })
    .first()
    .click();
  const input = panel(page)
    .locator('.editor')
    .getByRole('textbox', { name: /Display name/ });
  await input.fill('Kitchen freezer');
  await panel(page).evaluate((element) => {
    element.hass = { ...element.hass };
  });
  await expect(input).toHaveValue('Kitchen freezer');
  await page.getByRole('button', { name: 'Rescan', exact: true }).click();
  await expect(input).toHaveValue('Kitchen freezer');
  await panel(page)
    .locator('.editor')
    .getByRole('button', { name: 'Done', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Select recommended', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Review additions', exact: true })
    .click();
  await expect(
    table(page).getByText('Kitchen freezer', { exact: true }),
  ).toBeVisible();
});

test('duplicate review errors preserve selection and make no partial additions', async ({
  page,
}) => {
  await page
    .getByRole('button', { name: 'Select all ready', exact: true })
    .click();
  await expect(selected(page)).toHaveText('36 selected');
  await page
    .getByRole('button', { name: 'Review additions', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Add 36 devices', exact: true })
    .click();
  await expect(
    panel(page).locator('ha-alert[alert-type="error"]'),
  ).toContainText('same channel');
  await expect(
    page.getByRole('heading', { name: 'Review 36 additions' }),
  ).toBeVisible();
  const result = await panel(page).evaluate((element) =>
    element.hass.callWS({ type: 'energy_scout/list' }),
  );
  expect(result.devices).toHaveLength(0);
});

test('phone layout keeps native editing and review controls usable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole('button', { name: 'Select recommended', exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => table(page).evaluate((element) => element.narrow))
    .toBe(true);
  await expect(
    table(page).getByRole('columnheader', { name: 'Room', exact: true }),
  ).toHaveCount(0);
  await expect(
    table(page).getByRole('button', { name: 'Edit', exact: true }).first(),
  ).toBeInViewport();
  await page
    .getByRole('button', { name: 'Select recommended', exact: true })
    .click();
  await expect(selected(page)).toHaveText('35 selected');
  await page.screenshot({
    path: 'docs/previews/panel/phone.png',
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test('one confirmation adds 35 devices and tracked entries stay visible', async ({
  page,
}) => {
  await page
    .getByRole('button', { name: 'Select recommended', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Review additions', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Add 35 devices', exact: true })
    .click();
  await expect(
    panel(page).locator('ha-alert[alert-type="success"]'),
  ).toContainText('Added 35 devices');
  await expect(
    page.getByRole('heading', { name: 'Your energy devices' }),
  ).toBeVisible();
  const result = await panel(page).evaluate((element) =>
    element.hass.callWS({ type: 'energy_scout/list' }),
  );
  expect(result.devices).toHaveLength(35);
  await expect
    .poll(() =>
      table(page).evaluate(
        (element) =>
          element.data.filter((row) => row.item.status === 'tracked').length,
      ),
    )
    .toBe(35);
});

test('owned additions can be reviewed and removed as a batch', async ({
  page,
}) => {
  await page
    .getByRole('button', { name: 'Select recommended', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Review additions', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Add 35 devices', exact: true })
    .click();
  await expect(
    panel(page).locator('ha-alert[alert-type="success"]'),
  ).toContainText('Added 35 devices');
  await expect(
    table(page).getByText('Already tracked', { exact: true }).first(),
  ).toBeVisible();
  await table(page).evaluate((element) =>
    element.selectAll((row) => row.item.status === 'tracked'),
  );
  await expect(selected(page)).toHaveText('35 selected');
  await page
    .getByRole('button', { name: 'Review removal', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Remove 35 entries' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Remove entries', exact: true })
    .click();
  await expect(
    panel(page).locator('ha-alert[alert-type="success"]'),
  ).toContainText('Removed 35 devices');
});
