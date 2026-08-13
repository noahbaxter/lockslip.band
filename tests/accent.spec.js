const { test, expect } = require('@playwright/test');

// The site wears the colour of the record open in MUSIC. One accent on :root
// feeds every derived step, so these assert the derived values too: an override
// that only moved --accent-color and left the alphas behind is the bug this
// caught in the first place.

const GREEN = 'rgb(47, 125, 93)';
const RED = 'rgb(255, 0, 0)';

async function ready(page) {
  await page.goto('/');
  await page.waitForSelector('.release-tab');
  await page.waitForLoadState('networkidle');
}

const accent = page => page.evaluate(() =>
  getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim());

// Rendered rather than declared: a token nothing paints with proves nothing.
const painted = page => page.evaluate(() => {
  const tickets = document.querySelector('[class*="ticket"]');
  return {
    rule: getComputedStyle(document.querySelector('header')).borderBottomColor,
    tickets: tickets ? getComputedStyle(tickets).backgroundColor : null,
    label: getComputedStyle(document.querySelector('.section-line-label')).color,
  };
});

test('opens on the newest record and paints with its accent', async ({ page }) => {
  await ready(page);
  expect(await accent(page)).toBe('#2f7d5d');

  const p = await painted(page);
  expect(p.rule).toBe(GREEN);
  expect(p.label).toBe(GREEN);
  if (p.tickets) expect(p.tickets).toBe(GREEN);
});

test('switching record retints the whole page, derived steps included', async ({ page }) => {
  await ready(page);
  await page.click('.release-tab[data-target="ep-2024"]');

  expect(await accent(page)).toBe('#ff0000');
  const p = await painted(page);
  expect(p.rule).toBe(RED);
  expect(p.label).toBe(RED);

  await page.click('.release-tab[data-target="the-conversation"]');
  expect(await accent(page)).toBe('#2f7d5d');
  expect((await painted(page)).rule).toBe(GREEN);
});

test('the record is remembered between visits', async ({ page }) => {
  await ready(page);
  await page.click('.release-tab[data-target="ep-2024"]');

  await page.goto('/');
  await page.waitForSelector('.release-tab');
  await expect(page.locator('.release-tab.is-active')).toHaveAttribute('data-target', 'ep-2024');
  expect(await accent(page)).toBe('#ff0000');
});

test('a remembered record that no longer exists falls back to the newest', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => localStorage.setItem('accent-release', 'deleted-record'));

  await page.goto('/');
  await page.waitForSelector('.release-tab');
  await expect(page.locator('.release-tab.is-active')).toHaveAttribute('data-target', 'the-conversation');
  expect(await accent(page)).toBe('#2f7d5d');
});

test.describe('gray world', () => {
  const sw = '.release-item:not([hidden]) .accent-switch';

  test('hovering previews and leaving drops it', async ({ page }) => {
    await ready(page);
    await page.locator(sw).scrollIntoViewIfNeeded();

    await page.hover(sw);
    expect(await accent(page)).toBe('#757575');
    expect(await page.evaluate(() =>
      getComputedStyle(document.documentElement).filter)).toBe('grayscale(1)');

    await page.mouse.move(10, 400);
    expect(await accent(page)).toBe('#2f7d5d');
  });

  test('clicking holds it after the pointer leaves', async ({ page }) => {
    await ready(page);
    await page.locator(sw).scrollIntoViewIfNeeded();
    await page.click(sw);
    await page.mouse.move(10, 400);

    expect(await accent(page)).toBe('#757575');
    await expect(page.locator(sw)).toHaveAttribute('aria-pressed', 'true');
  });

  test('the word is the only thing that changes when it is clicked off underneath', async ({ page }) => {
    await ready(page);
    await page.locator(sw).scrollIntoViewIfNeeded();
    await page.click(sw);
    const held = await page.evaluate(s => getComputedStyle(document.querySelector(s)).color, sw);

    await page.click(sw);
    // Still hovered, so the page stays grey; the word drops to the lighter shade.
    expect(await accent(page)).toBe('#757575');
    const off = await page.evaluate(s => getComputedStyle(document.querySelector(s)).color, sw);
    expect(off).not.toBe(held);
    await expect(page.locator(sw)).toHaveAttribute('aria-pressed', 'false');
  });

  test('changing record drops it and is never remembered', async ({ page }) => {
    await ready(page);
    await page.locator(sw).scrollIntoViewIfNeeded();
    await page.click(sw);
    await page.mouse.move(10, 400);
    expect(await accent(page)).toBe('#757575');

    await page.click('.release-tab[data-target="ep-2024"]');
    expect(await accent(page)).toBe('#ff0000');

    await page.click('.release-tab[data-target="the-conversation"]');
    expect(await accent(page)).toBe('#2f7d5d');

    await page.goto('/');
    await page.waitForSelector('.release-tab');
    expect(await accent(page)).toBe('#2f7d5d');
  });
});

test('unbranded marks tint with the accent, brands keep their own colour', async ({ page }) => {
  await ready(page);

  const tint = sel => page.evaluate(s => {
    const el = document.querySelector(s);
    if (!el) return null;
    const a = getComputedStyle(el, '::after');
    return { bg: a.backgroundColor, mask: a.maskImage };
  }, sel);

  const bleak = await tint('.news-links .social-icon.bleakhouse');
  expect(bleak.bg).toBe(GREEN);
  expect(bleak.mask).toContain('bleakhouse');

  // A brand has no tint layer at all.
  expect((await tint('.streaming-icon.spotify')).mask).toBe('none');

  await page.click('.release-tab[data-target="ep-2024"]');
  expect((await tint('.news-links .social-icon.bleakhouse')).bg).toBe(RED);
});
