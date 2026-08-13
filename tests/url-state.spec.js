const { test, expect } = require('@playwright/test');

// /music, /music/<record>, and #zen on top of either. See js/url-state.js for
// why the place is a path. These assert the round trip in both directions: a
// click writes a URL, and that URL rebuilds the same view on a cold load.

// No networkidle: a zen URL starts cueing audio, so the network never goes
// quiet. The URL is applied on a timer once the players exist, which is what
// the wait is actually for.
async function ready(page, url = '/') {
  await page.goto(url);
  await page.waitForSelector('.release-tab');
  await page.waitForTimeout(400);
}

const at = page => page.evaluate(() => location.pathname + location.hash);
const openTab = page => page.locator('.release-tab.is-active');
const inZen = page => page.evaluate(() => !document.querySelector('.np-zen').hidden);

test('a section click writes the section and the record open in it', async ({ page }) => {
  await ready(page);

  await page.click('.nav-links a[href="/shows"]');
  expect(await at(page)).toBe('/shows');

  await page.click('.nav-links a[href="/music"]');
  expect(await at(page)).toBe('/music/the-conversation');
});

test('a record click refines the URL without stacking history', async ({ page }) => {
  await ready(page);
  await page.click('.nav-links a[href="/shows"]');
  await page.click('.nav-links a[href="/music"]');

  await page.click('.release-tab[data-target="ep-2024"]');
  expect(await at(page)).toBe('/music/ep-2024');

  // Back leaves the section, not the tab flip.
  await page.goBack();
  expect(await at(page)).toBe('/shows');
});

test('a section URL survives a refresh', async ({ page }) => {
  await ready(page, '/store');
  const y = await page.evaluate(() => window.scrollY);
  expect(y).toBeGreaterThan(1000);

  await page.reload();
  await page.waitForSelector('.release-tab');
  await page.waitForTimeout(400);
  expect(await at(page)).toBe('/store');
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);
});

for (const id of ['ep-2024', 'the-conversation']) {
  test(`/music/${id} opens that record on a cold load`, async ({ page }) => {
    await ready(page, `/music/${id}`);
    await expect(openTab(page)).toHaveAttribute('data-target', id);
  });
}

test('the URL wins over the remembered record', async ({ page }) => {
  await ready(page);
  await page.click('.release-tab[data-target="ep-2024"]');

  await ready(page, '/music/the-conversation');
  await expect(openTab(page)).toHaveAttribute('data-target', 'the-conversation');
});

test.describe('zen', () => {
  // The EP, not the newest record: audio for anything unreleased comes from the
  // private octopus submodule, so a test that plays it only passes on a machine
  // that has those files.
  test('opening writes the record, closing backs out of it', async ({ page }) => {
    await ready(page, '/music/ep-2024');
    await page.click('.release-item:not([hidden]) .ap-transport button:nth-child(2)');
    await page.waitForTimeout(500);

    await page.click('.np-open');
    await page.waitForTimeout(300);
    expect(await at(page)).toBe('/music/ep-2024#zen');
    expect(await inZen(page)).toBe(true);

    await page.click('.np-zen-close');
    await page.waitForTimeout(300);
    expect(await at(page)).not.toContain('zen');
    expect(await inZen(page)).toBe(false);

    // The entry is still there, so forward returns to it.
    await page.goForward();
    await page.waitForTimeout(300);
    expect(await inZen(page)).toBe(true);
  });

  // Whether it then plays is the browser's call, not ours: a real one refuses
  // audio nobody asked for and leaves it paused, while the test browser has that
  // policy disabled. So this asserts the cue, which is the part we control.
  test('a record with zen after it opens cold, cued to that record', async ({ page }) => {
    await ready(page, '/music/ep-2024#zen');
    await page.waitForTimeout(500);

    expect(await inZen(page)).toBe(true);
    await expect(openTab(page)).toHaveAttribute('data-target', 'ep-2024');
    expect(await page.evaluate(() => AudioPlayer.owner.id)).toBe('ep-2024');
    expect(await page.evaluate(() => AudioPlayer.owner.stopped)).toBe(false);
    expect(await page.evaluate(() =>
      AudioPlayer.el.src.startsWith(AudioPlayer.owner.baseUrl))).toBe(true);
  });

  test('a record that no longer exists lands on one that plays and says so', async ({ page }) => {
    await ready(page, '/music/deleted-record#zen');
    await page.waitForTimeout(500);

    expect(await inZen(page)).toBe(true);
    expect(await at(page)).toMatch(/#zen$/);
    expect(await at(page)).not.toContain('deleted-record');
  });

  // Everything shared before these were paths still has to land in the right
  // place, and end up saying the current thing.
  for (const [legacy, expected] of [
    ['/#music/ep-2024', '/music/ep-2024'],
    ['/#music/ep-2024/zen', '/music/ep-2024#zen'],
    ['/#shows', '/shows'],
  ]) {
    test(`the old ${legacy} still works`, async ({ page }) => {
      await ready(page, legacy);
      await page.waitForTimeout(400);
      expect(await at(page)).toBe(expected);
    });
  }
});

test('picking another record inside zen moves the URL, the tab and the accent', async ({ page }) => {
  await ready(page, '/music/the-conversation#zen');
  await page.waitForTimeout(500);

  await page.click('.np-zen-queue');
  await page.waitForTimeout(300);
  const tabs = page.locator('.np-picker-release');
  await tabs.filter({ hasText: /EP/i }).click();
  await page.waitForTimeout(200);
  await page.locator('.np-picker-track').nth(1).click();
  await page.waitForTimeout(500);

  expect(await at(page)).toBe('/music/ep-2024#zen');
  await expect(openTab(page)).toHaveAttribute('data-target', 'ep-2024');
  expect(await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim())).toBe('#ff0000');
});

test('sections are read off the page, not a list', async ({ page }) => {
  await ready(page);

  const ids = await page.evaluate(() =>
    [...document.querySelectorAll('main section[id]')].map(s => s.id));
  expect(ids.length).toBeGreaterThan(3);

  for (const id of ids) {
    expect(await page.evaluate(i => UrlState.isSection(i), id)).toBe(true);
  }
  expect(await page.evaluate(() => UrlState.isSection('not-a-section'))).toBe(false);
});
