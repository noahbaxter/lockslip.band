const { test, expect } = require('@playwright/test');

// Three layouts, by how much room there is: details beside the image, details
// under it with the arrows either side, and the phone viewer where the image is
// the whole screen and a tap brings the details up over it.

const WIDE = { width: 1600, height: 1000 };
const NARROW = { width: 820, height: 900 };
const PHONE = { width: 390, height: 844 };

// Opened directly rather than by clicking a poster on the wall: the wall scrolls
// and reflows under the click, which made these fail for reasons that have
// nothing to do with the modal. That a poster opens the modal it belongs to is
// pinned in past-shows-nav.spec.js.
// Index 1 by default, not 0: at either end of the set the arrow for that
// direction correctly hides itself, and a hidden arrow has no box to measure.
async function openPoster(page, index = 1) {
  await page.goto('/shows');
  // Bare identifier, not window.posterModal: it is a top level const, which is a
  // global binding but not a property of window.
  await page.waitForFunction(() => typeof posterModal !== 'undefined' && posterModal.data.length > 0);
  await page.evaluate(i => posterModal.open(i), index);
  await settled(page);
}

// Every measurement here is geometry, and geometry is meaningless until the
// picture has decoded and been laid out. Waiting on a clock instead raced the
// load whenever the machine was busy.
async function settled(page) {
  await page.waitForFunction(() => {
    const img = document.querySelector('.modal-image');
    return img && img.complete && img.naturalWidth > 0 && img.getBoundingClientRect().width > 0;
  }, null, { timeout: 10000 });
}

const boxOf = (page, sel) => page.locator(sel).evaluate(e => {
  const b = e.getBoundingClientRect();
  return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, w: b.width, h: b.height };
});

// Nothing may sit on top of anything else. The controls are pinned to the window
// and the content is sized to what is left, so this is the assertion that keeps
// the two in step at any width.
const overlaps = (a, b) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

for (const width of [1600, 1400, 1200, 1024, 900, 820]) {
  test(`no control overlaps the picture or the details at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openPoster(page);

    const boxes = {};
    for (const sel of ['.modal-image', '.modal-info', '.modal-nav.prev', '.modal-nav.next', '.modal-close']) {
      boxes[sel] = await boxOf(page, sel);
    }

    for (const control of ['.modal-nav.prev', '.modal-nav.next', '.modal-close']) {
      for (const held of ['.modal-image', '.modal-info']) {
        expect(overlaps(boxes[control], boxes[held]),
          `${control} overlaps ${held} at ${width}px`).toBe(false);
      }
    }
    expect(overlaps(boxes['.modal-image'], boxes['.modal-info']),
      `image overlaps details at ${width}px`).toBe(false);
  });
}

// The bill on a fest runs to forty bands and a club show to three. The panel is
// the same box either way, and the arrows do not shuffle sideways to make room
// for whatever the current show happens to say.
for (const [label, viewport] of [['wide', WIDE], ['narrow', NARROW]]) {
  test(`the panel and arrows hold their place between shows (${label})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openPoster(page);

    const shot = async () => ({
      info: await boxOf(page, '.modal-info'),
      prev: await boxOf(page, '.modal-nav.prev'),
      lines: await page.locator('.modal-info').evaluate(e => e.textContent.trim().length),
    });

    // By index rather than by clicking through: the set runs out, and an arrow
    // that has correctly hidden itself at the end is not what this is testing.
    const show = async i => { await page.evaluate(n => posterModal.open(n), i); await settled(page); };
    const count = await page.evaluate(() => posterModal.data.length);

    await show(1);
    const first = await shot();
    let shortest = first.lines;
    let longest = first.lines;

    for (let i = 2; i < count; i++) {
      await show(i);
      const now = await shot();
      shortest = Math.min(shortest, now.lines);
      longest = Math.max(longest, now.lines);
      expect(now.info.w, `panel width moved on item ${i}`).toBeCloseTo(first.info.w, 0);
      expect(now.prev.left, `prev arrow moved on item ${i}`).toBeCloseTo(first.prev.left, 0);
    }

    // Worth knowing the set really does range from a three band club show to a
    // fest bill, or the assertions above prove nothing.
    expect(longest).toBeGreaterThan(shortest * 2);
    // And nothing ran off the side of the window.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test.describe('wide', () => {
  test.use({ viewport: WIDE });

  test('details sit beside the image, arrows at the window edges', async ({ page }) => {
    await openPoster(page);

    const image = await boxOf(page, '.modal-image');
    const info = await boxOf(page, '.modal-info');
    expect(info.left).toBeGreaterThanOrEqual(image.right);

    const prev = await boxOf(page, '.modal-nav.prev');
    const next = await boxOf(page, '.modal-nav.next');
    expect(prev.left).toBeLessThan(image.left);
    expect(next.right).toBeGreaterThan(info.right);
  });

  test('the image is never blown up past its own size', async ({ page }) => {
    await openPoster(page);

    const { natural, rendered } = await page.locator('.modal-image').evaluate(img => ({
      natural: img.naturalWidth,
      rendered: img.getBoundingClientRect().width,
    }));
    expect(rendered).toBeLessThanOrEqual(natural);
  });
});

// Past a point a wider window buys nothing: the picture cannot grow any further
// and the extra width is empty space between it and the details. So the whole
// thing stops growing and sits in the middle, with the arrows beside it rather
// than out at the edges of a very wide screen.
test('the modal stops growing and stays centred on a wide screen', async ({ page }) => {
  const seen = [];
  for (const width of [2560, 2000, 1600, 1280, 1024]) {
    await page.setViewportSize({ width, height: 1000 });
    await openPoster(page);

    const { block, centre, gaps } = await page.evaluate(() => {
      const r = s => document.querySelector(s).getBoundingClientRect();
      const c = r('.modal-content'), prev = r('.modal-nav.prev'), next = r('.modal-nav.next');
      return {
        block: Math.round(c.width),
        centre: Math.round(c.left + c.width / 2) - Math.round(window.innerWidth / 2),
        gaps: [Math.round(c.left - prev.right), Math.round(next.left - c.right)],
      };
    });

    expect(Math.abs(centre), `not centred at ${width}px`).toBeLessThanOrEqual(1);
    // The same gap on both sides, at every width.
    expect(gaps[0], `arrow gap differs at ${width}px`).toBe(gaps[1]);
    seen.push({ width, block });
  }

  // It caps: the widest windows all land on the same block width.
  expect(seen[0].block).toBe(seen[1].block);
  expect(seen[1].block).toBe(seen[2].block);
  // And it does still shrink once the window is the tighter constraint.
  expect(seen[4].block).toBeLessThan(seen[0].block);
});

// The controls are a frame around the content: an arrow down each side and the
// close at the top right corner of it, rather than three things parked in the
// corners of the window.
test('the close holds one place, set by the tallest item in the group', async ({ page }) => {
  await page.setViewportSize(WIDE);
  await openPoster(page);

  const tops = new Set();
  const gaps = [];
  for (const item of [1, 5, 12, 20, 33, 40]) {
    await page.evaluate(n => posterModal.open(n), item);
    await settled(page);

    const shot = await page.evaluate(() => {
      const r = s => document.querySelector(s).getBoundingClientRect();
      const close = r('.modal-close'), next = r('.modal-nav.next'), img = r('.modal-image');
      return {
        top: Math.round(close.top),
        right: Math.round(close.right),
        arrowRight: Math.round(next.right),
        gap: Math.round(img.top - close.bottom),
      };
    });

    // The top right corner of the frame: in line with the arrow down that side.
    expect(shot.right, `close is off the frame on item ${item}`).toBe(shot.arrowRight);
    tops.add(shot.top);
    gaps.push(shot.gap);
  }

  // Placed for the group, so paging through does not move it.
  expect([...tops], 'the close moved between items').toHaveLength(1);
  // High enough for the tallest picture in the set, and no higher: that one
  // clears it by exactly the frame's own gap.
  expect(Math.min(...gaps)).toBe(32);
});

test('the press download lives in the details, not over the photo', async ({ page }) => {
  await page.setViewportSize(WIDE);
  await page.goto('/press/');
  await page.locator('.photo-card').first().click({ force: true });
  await settled(page);

  const download = page.locator('.modal-download');
  await expect(download).toHaveCount(1);

  const inside = await page.evaluate(() => {
    const d = document.querySelector('.modal-download').getBoundingClientRect();
    const i = document.querySelector('.modal-info').getBoundingClientRect();
    return d.left >= i.left && d.right <= i.right && d.top >= i.top;
  });
  expect(inside).toBe(true);
});

// A square photo and a tall poster must not shuffle the details up and down the
// screen, nor the arrows beside them.
test('the details slab holds one place whatever shape the picture is', async ({ page }) => {
  await page.setViewportSize(NARROW);
  await openPoster(page);

  const tops = new Set();
  const arrows = new Set();
  const ratios = new Set();
  for (const i of [5, 12, 20, 33, 40]) {
    await page.evaluate(n => posterModal.open(n), i);
    await settled(page);
    tops.add(Math.round((await boxOf(page, '.modal-info')).top));
    arrows.add(Math.round((await boxOf(page, '.modal-nav.prev')).top));
    ratios.add(await page.locator('.modal-image').evaluate(
      img => (img.naturalWidth / img.naturalHeight).toFixed(2)));
  }

  expect([...tops], 'the details moved between items').toHaveLength(1);
  expect([...arrows], 'the arrows moved between items').toHaveLength(1);
  // And the pictures really were different shapes.
  expect([...ratios].length).toBeGreaterThan(1);
});

test.describe('narrow', () => {
  test.use({ viewport: NARROW });

  test('details drop under the image with the arrows either side of them', async ({ page }) => {
    await openPoster(page);

    const image = await boxOf(page, '.modal-image');
    const info = await boxOf(page, '.modal-info');
    expect(info.top).toBeGreaterThanOrEqual(image.bottom);

    const prev = await boxOf(page, '.modal-nav.prev');
    const next = await boxOf(page, '.modal-nav.next');
    expect(prev.right).toBeLessThanOrEqual(info.left);
    expect(next.left).toBeGreaterThanOrEqual(info.right);
    // Beside the details, not still floating over the middle of the picture.
    expect(prev.top).toBeGreaterThan(image.bottom);
  });
});

test.describe('phone', () => {
  test.use({ viewport: PHONE, hasTouch: true });

  // The accent picks out the same field it picks out on a desktop.
  test('the caption is coloured the way it is on a desktop', async ({ page }) => {
    const colours = async () => {
      await openPoster(page);
      return page.evaluate(() => {
        const c = s => { const e = document.querySelector(s); return e ? getComputedStyle(e).color : null; };
        return { date: c('.modal-date'), venue: c('.modal-venue'), location: c('.modal-location') };
      });
    };

    const onPhone = await colours();
    await page.setViewportSize(WIDE);
    const onDesktop = await colours();

    expect(onPhone).toEqual(onDesktop);
  });

  test('the image is the screen and nothing shows behind it', async ({ page }) => {
    await openPoster(page);

    const image = await boxOf(page, '.modal-image');
    expect(image.w).toBe(PHONE.width);
    expect(Math.round(image.h)).toBe(PHONE.height);

    // Opaque, so the page underneath cannot read through.
    const bg = await page.locator('.modal').evaluate(e => getComputedStyle(e).backgroundColor);
    expect(bg).toBe('rgb(0, 0, 0)');
  });

  test('the details are up already and a tap puts them away', async ({ page }) => {
    await openPoster(page);

    // Polled rather than slept on: the panel slides, and a fixed wait races the
    // transition whenever the machine is busy running the rest of the suite.
    // The bottom edge is where it comes to rest; the top passes the moment it
    // starts moving, while the panel is still half off the screen.
    const panelTop = () => boxOf(page, '.modal-info').then(b => b.top);
    const panelBottom = () => boxOf(page, '.modal-info').then(b => Math.round(b.bottom));

    await expect.poll(panelBottom).toBeLessThanOrEqual(PHONE.height);
    expect(await panelTop()).toBeLessThan(PHONE.height);

    await page.locator('.modal-image').click();
    await expect.poll(panelTop).toBeGreaterThanOrEqual(PHONE.height);

    await page.locator('.modal-image').click();
    await expect.poll(panelBottom).toBeLessThanOrEqual(PHONE.height);
  });

  test('the arrows stay reachable over the open details', async ({ page }) => {
    await openPoster(page);
    await expect.poll(() => boxOf(page, '.modal-info').then(b => Math.round(b.bottom)))
      .toBeLessThanOrEqual(PHONE.height);

    // Would throw if the panel were covering them.
    await page.locator('.modal-nav.next').click({ timeout: 2000 });
  });

  test('a tap does not close the viewer, the button does', async ({ page }) => {
    await openPoster(page);

    await page.locator('.modal-image').click();
    await expect(page.locator('#posterModal')).toBeVisible();

    await page.locator('.modal-close').click();
    await expect(page.locator('#posterModal')).toBeHidden();
  });
});
