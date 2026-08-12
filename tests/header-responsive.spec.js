const { test, expect } = require('@playwright/test');

// The inline nav (links + icons) stays visible and shrinks down to 768px; at
// <=768 it folds into the hamburger overlay. See the legend in variables.css.

async function gotoReady(page) {
  await page.goto('/');
  await page.waitForSelector('.logo');
  await page.waitForLoadState('networkidle');
}

for (const width of [1366, 1100, 900, 800]) {
  test(`inline nav visible at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await gotoReady(page);

    await expect(page.locator('.nav-links')).toBeVisible();
    await expect(page.locator('#streaming-icons')).toBeVisible();
    await expect(page.locator('.mobile-menu-toggle')).toBeHidden();
  });
}

for (const vp of [
  { label: 'phone', width: 600 },
  { label: 'small-phone', width: 400 },
]) {
  test(`folds to hamburger at ${vp.label} (${vp.width}px)`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: 800 });
    await gotoReady(page);

    await expect(page.locator('.nav-links')).toBeHidden();
    await expect(page.locator('#streaming-icons')).toBeHidden();
    await expect(page.locator('.mobile-menu-toggle')).toBeVisible();
  });
}

test('icon row drops to the curated subset once shrunk (1100px)', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await gotoReady(page);

  // Kept: bandcamp, spotify, youtube, instagram
  for (const cls of ['bandcamp', 'spotify', 'youtube']) {
    await expect(page.locator(`#streaming-icons .streaming-icon.${cls}`)).toBeVisible();
  }
  await expect(page.locator('#streaming-icons .social-icon.instagram')).toBeVisible();

  // Dropped: apple, non-instagram socials, and the group separator
  await expect(page.locator('#streaming-icons .streaming-icon.apple')).toBeHidden();
  await expect(page.locator('#streaming-icons .social-icon.facebook')).toBeHidden();
  await expect(page.locator('#streaming-icons .social-icon.tiktok')).toBeHidden();
  await expect(page.locator('#streaming-icons .icon-separator')).toBeHidden();
});

test('full icon set with separator above 1200px', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 800 });
  await gotoReady(page);

  await expect(page.locator('#streaming-icons .streaming-icon.apple')).toBeVisible();
  await expect(page.locator('#streaming-icons .social-icon.facebook')).toBeVisible();
  await expect(page.locator('#streaming-icons .icon-separator')).toBeVisible();
});

test('hamburger opens the overlay below the breakpoint', async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 800 });
  await gotoReady(page);

  await expect(page.locator('.mobile-menu')).toBeHidden();
  await page.locator('.mobile-menu-toggle').click();

  await expect(page.locator('.mobile-menu')).toBeVisible();
  await expect(page.locator('.mobile-nav-links a', { hasText: 'Music' })).toBeVisible();
});
