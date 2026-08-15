const { test, expect } = require('@playwright/test');

// A single missing content file used to reject the whole load, and the catch
// replaced document.body with the words ERROR LOADING CONTENT. Google indexed
// the site as that. Everything that did load must survive one that did not.

const SECTIONS = ['#news', '#music', '#shows', '#store'];

const filled = page => page.evaluate(sels =>
  sels.filter(s => (document.querySelector(s)?.textContent || '').trim().length > 0), SECTIONS);

test('a missing content file does not take the page with it', async ({ page }) => {
  // The shop is the one being knocked out; every other section should render.
  await page.route('**/content/merchandise.json', route => route.fulfill({ status: 404, body: 'gone' }));

  await page.goto('/');
  await page.waitForSelector('.release-item, .news-featured');
  await page.waitForTimeout(600);

  const body = await page.locator('body').innerText();
  expect(body).not.toContain('ERROR LOADING CONTENT');

  // The sections whose files loaded are all still there.
  expect(await filled(page)).toEqual(expect.arrayContaining(['#news', '#music', '#shows']));
});

test('every section renders when nothing is missing', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.release-item');
  await page.waitForTimeout(600);

  expect(await filled(page)).toEqual(SECTIONS);
});

test('the page carries a description and a preview image for crawlers', async ({ page }) => {
  await page.goto('/');

  const head = await page.evaluate(() => ({
    description: document.querySelector('meta[name="description"]')?.content,
    ogTitle: document.querySelector('meta[property="og:title"]')?.content,
    ogImage: document.querySelector('meta[property="og:image"]')?.content,
  }));

  expect(head.description).toBeTruthy();
  expect(head.ogTitle).toBeTruthy();
  expect(head.ogImage).toMatch(/^https:\/\//);
});
