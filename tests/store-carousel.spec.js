const { test, expect } = require('@playwright/test');

// The store row steps sideways three cards at a time on a desktop and one on a
// phone. The arrows used to sit on top of the outer cards; now they live under
// the row with a dot per item, and only step out beside the cards where the page
// margin is wide enough to hold them.

async function store(page, width, height = 1000) {
  await page.setViewportSize({ width, height });
  await page.goto('/store');
  await page.waitForSelector('.merch-dot');
  await page.waitForTimeout(300);
}

const rect = (page, sel) => page.locator(sel).evaluate(e => {
  const r = e.getBoundingClientRect();
  return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
});

const lit = page => page.locator('.merch-dot').evaluateAll(
  ds => ds.map(d => d.classList.contains('is-showing') ? 'O' : '.').join(''));

test('a dot per item, lit for the ones on screen', async ({ page }) => {
  await store(page, 1300);

  const items = await page.locator('.merch-item').count();
  expect(await page.locator('.merch-dot').count()).toBe(items);

  // Three across on a desktop, and the lit run slides as you page.
  expect(await lit(page)).toMatch(/^OOO\.+$/);
  await page.locator('.collection-nav.next').click();
  await page.waitForTimeout(500);
  expect(await lit(page)).toMatch(/^\.OOO\.+$/);
});

test('one lit dot on a phone', async ({ page }) => {
  await store(page, 390, 844);
  expect(await lit(page)).toMatch(/^O\.+$/);
});

test('the arrows sit under the row rather than over the cards', async ({ page }) => {
  await store(page, 1300);

  const track = await rect(page, '.merch-carousel-container');
  for (const arrow of ['.collection-nav.prev', '.collection-nav.next']) {
    expect((await rect(page, arrow)).top).toBeGreaterThanOrEqual(track.bottom);
  }
});

test('the arrows step out beside the cards once there is margin for them', async ({ page }) => {
  await store(page, 1600);

  const track = await rect(page, '.merch-carousel-container');
  const prev = await rect(page, '.collection-nav.prev');
  const next = await rect(page, '.collection-nav.next');

  expect(prev.right).toBeLessThanOrEqual(track.left);
  expect(next.left).toBeGreaterThanOrEqual(track.right);
  // Beside the cards, not below them.
  expect(prev.top).toBeLessThan(track.bottom);
});

test('no arrow covers a card anyone can see', async ({ page }) => {
  for (const width of [1600, 1300, 1000, 390]) {
    await store(page, width, width < 700 ? 844 : 1000);

    const clash = await page.evaluate(() => {
      const track = document.querySelector('.merch-carousel-container').getBoundingClientRect();
      // Clipped to the container: the track runs past it and overflow hides the
      // rest, so an off-screen card is not something an arrow can cover.
      const cards = [...document.querySelectorAll('.merch-item')]
        .map(c => c.getBoundingClientRect())
        .map(c => ({ left: Math.max(c.left, track.left), right: Math.min(c.right, track.right), top: c.top, bottom: c.bottom }))
        .filter(c => c.right > c.left);

      return [...document.querySelectorAll('.collection-nav')].some(nav => {
        const r = nav.getBoundingClientRect();
        return cards.some(c => r.left < c.right && c.left < r.right && r.top < c.bottom && c.top < r.bottom);
      });
    });
    expect(clash, `an arrow covers a visible card at ${width}px`).toBe(false);
  }
});
