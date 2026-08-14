const { test, expect } = require('@playwright/test');

// A post used to become unreachable the moment a newer one arrived: the older
// ones rendered as a dead date-and-headline line, and the modal was fed from
// the featured item only. These pin the way back.

const featured = page => page.locator('.news-featured h3');
const rows = page => page.locator('.news-index-item');

async function ready(page) {
  await page.goto('/news/');
  await page.waitForSelector('.news-featured');
  await page.waitForTimeout(300);
}

test('the newest post is featured and marked in the list', async ({ page }) => {
  await ready(page);

  await expect(featured(page)).toHaveText('GRAY WORLD FT. KING YOSEF OUT NOW');
  await expect(rows(page).first()).toHaveClass(/is-current/);
});

test('an older post can be brought back', async ({ page }) => {
  await ready(page);

  await rows(page).nth(1).locator('button').click();

  await expect(featured(page)).toHaveText('LOCKSLIP SIGNS TO BLEAKHOUSE');
  await expect(rows(page).nth(1)).toHaveClass(/is-current/);
  await expect(rows(page).first()).not.toHaveClass(/is-current/);
});

// The bug behind the whole thing: the banner feeds the modal, so a stale
// banner means the modal shows the wrong post's images.
test('the modal follows the post on show', async ({ page }) => {
  await ready(page);
  await rows(page).nth(1).locator('button').click();

  await page.locator('.news-banner-image').first().click();

  const shown = page.locator('#newsModal img').first();
  await expect(shown).toHaveAttribute('src', /2026-08-12-bleakhouse/);
});

test('news images carry no download button', async ({ page }) => {
  await ready(page);
  await page.locator('.news-banner-image').first().click();

  await expect(page.locator('#newsModal .photo-modal-download')).toHaveCount(0);
});
