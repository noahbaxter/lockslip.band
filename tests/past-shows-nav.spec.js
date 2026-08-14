const { test, expect } = require('@playwright/test');

// Past-shows poster wall: hover and auto-scroll behaviour, where the bugs are
// sub-pixel or only reachable by the cursor. Layout and arrow placement are
// obvious on sight and deliberately not covered.

async function ready(page) {
  await page.goto('/');
  await page.waitForSelector('.poster-grid-item');
  await page.waitForLoadState('networkidle');
}

const offset = (page) => page.evaluate(() => ShowsScrollNav.offset());

// Auto-scrolls that actually fire; wrapping settle() would also count the ones
// that early-return on the mid-scroll guard.
const watchAutoScrolls = (page) => page.evaluate(() => {
  window.__auto = 0;
  const orig = window.scrollTo.bind(window);
  window.scrollTo = (...a) => { if (a[0] && a[0].behavior === 'smooth') window.__auto++; return orig(...a); };
});
const autoScrolls = (page) => page.evaluate(() => window.__auto);
const resetAutoScrolls = (page) => page.evaluate(() => { window.__auto = 0; });

// A hovered poster's box is inflated by the popout; measure an un-hovered
// neighbour in the same row instead.
const rowBox = (page, i) => page.evaluate((n) => {
  const items = [...document.querySelectorAll('.poster-grid-item')];
  const t = items[n].getBoundingClientRect();
  const sib = items.find((e, j) => j !== n && Math.abs(e.getBoundingClientRect().top - t.top) < 20);
  const r = (sib || items[n]).getBoundingClientRect();
  return { top: r.top, bottom: r.bottom, line: ShowsScrollNav.offset(), vh: window.innerHeight };
}, i);

const park = (page, i, fromLine) => page.evaluate(({ n, d }) => {
  const el = document.querySelectorAll('.poster-grid-item')[n];
  window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - ShowsScrollNav.offset() + d);
}, { n: i, d: fromLine });

test('the grid is one unbroken mosaic', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await ready(page);

  const rows = await page.$$eval('.poster-grid-item', els => {
    const byTop = {};
    els.forEach(e => {
      const t = Math.round(e.getBoundingClientRect().top);
      byTop[t] = (byTop[t] || 0) + 1;
    });
    return Object.keys(byTop).sort((a, b) => a - b).map(k => byTop[k]);
  });
  console.log('posters per row:', JSON.stringify(rows));
  expect(rows.slice(0, -1).filter(r => r !== rows[0]),
    `only the final row may be short, got ${JSON.stringify(rows)}`).toEqual([]);

  const kids = await page.$$eval('.poster-grid > *', els => [...new Set(els.map(e => e.className))]);
  expect(kids).toEqual(['poster-grid-item past-show']);
});

test('the year readout follows the posters under the label', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await ready(page);

  const label = page.locator('.poster-year-label');
  const off = await offset(page);
  const seen = [];

  for (const year of ['2026', '2025', '2024']) {
    await page.evaluate(([y, o]) => {
      const el = [...document.querySelectorAll('.poster-grid-item')].find(e => e.dataset.year === y);
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - o + 10);
    }, [year, off]);
    await page.waitForTimeout(300);
    seen.push(await label.innerText());
  }
  console.log('readout while scrolling into each year:', JSON.stringify(seen));
  expect(seen).toEqual(['2026', '2025', '2024']);
});

// Grid is newest-first, the modal indexes the original order, and that order
// includes upcoming shows.
test('a poster opens the modal it belongs to', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await ready(page);

  const first = page.locator('.poster-grid-item').first();
  await first.hover();
  await page.waitForTimeout(300);
  const readout = await page.locator('.poster-year-detail').innerText();
  await first.click();
  await page.waitForTimeout(500);

  const date = await page.locator('.modal-date').innerText();
  const location = await page.locator('.modal-location').innerText();
  console.log('year rule readout:', readout, '|| modal:', date, '/', location);
  expect(readout.toUpperCase()).toContain(location.toUpperCase());
});

test('the sticky chrome swallows hovers instead of passing them through', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await ready(page);
  await page.evaluate(() => document.querySelector('.poster-grid-wrap').scrollIntoView());
  await page.evaluate(() => window.scrollBy(0, 1000));
  await page.waitForTimeout(400);

  const leaks = await page.evaluate(() => {
    const line = ShowsScrollNav.offset();
    const found = [];
    for (let x = 70; x < 1270; x += 60) {
      for (const y of [4, line * 0.25, line * 0.5, line * 0.75, line - 4]) {
        const el = document.elementFromPoint(x, y);
        if (el && el.closest('.poster-grid-item')) found.push([x, Math.round(y)]);
      }
    }
    return found;
  });
  console.log('hoverable poster pixels above the line:', JSON.stringify(leaks));
  expect(leaks).toEqual([]);
});

test('a popout stays behind the chrome unless the poster is clear of the line', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await ready(page);
  const off = await offset(page);

  await page.evaluate(() => { ShowsScrollNav.settle = () => {}; });   // hold it clipped
  await park(page, 12, 90);
  await page.waitForTimeout(300);
  const b = await page.locator('.poster-grid-item').nth(12).boundingBox();
  await page.mouse.move(10, 10);
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(500);

  const r = await page.evaluate(() => {
    const el = document.querySelectorAll('.poster-grid-item')[12];
    return {
      z: Number(getComputedStyle(el).zIndex),
      ruleZ: Number(getComputedStyle(document.querySelector('.poster-year-indicator')).zIndex),
      canOverlap: el.classList.contains('can-overlap'),
      transform: getComputedStyle(el).transform,
    };
  });
  console.log(`clipped poster: z ${r.z} vs rule ${r.ruleZ}, can-overlap ${r.canOverlap}`);
  expect(r.transform, 'should still pop out').not.toBe('none');
  expect(r.canOverlap, 'a clipped poster must not be allowed over the chrome').toBe(false);
  expect(r.z, 'clipped popout punched through the rule').toBeLessThan(r.ruleZ);

  // Those z-indexes only compare within one stacking context.
  const ctx = await page.evaluate(() => {
    const isCtx = (el) => getComputedStyle(el).zIndex !== 'auto' && getComputedStyle(el).position !== 'static';
    let el = document.querySelector('.poster-grid-item').parentElement;
    const chain = [];
    while (el && el !== document.documentElement) {
      if (isCtx(el)) chain.push({ id: el.id || el.tagName, z: Number(getComputedStyle(el).zIndex) });
      el = el.parentElement;
    }
    return { chain, headerZ: Number(getComputedStyle(document.querySelector('header')).zIndex) };
  });
  console.log('stacking contexts above the poster:', JSON.stringify(ctx));
  expect(ctx.chain.map(c => c.id), 'one shared context for the whole wall').toEqual(['shows']);
  expect(ctx.headerZ).toBeGreaterThan(ctx.chain[0].z);
});

// Scrolling drags posters under a still cursor and fires pointer events for
// each one; acting on those scrolls against the user.
for (const c of [
  { name: 'cursor low, wheeling up', y: 840, dy: -120 },
  { name: 'cursor high, wheeling down', y: 260, dy: 120 },
  { name: 'cursor low, wheeling down', y: 840, dy: 120 },
  { name: 'cursor high, wheeling up', y: 260, dy: -120 },
]) {
  test(`scrolling past a still cursor never auto-scrolls: ${c.name}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await ready(page);
    await watchAutoScrolls(page);

    await page.evaluate(() => document.querySelector('.poster-grid-wrap').scrollIntoView());
    await page.evaluate(() => window.scrollBy(0, 1400));
    await page.waitForTimeout(250);
    await page.mouse.move(640, c.y);
    await page.waitForTimeout(250);
    await resetAutoScrolls(page);

    const before = await page.evaluate(() => window.scrollY);
    for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, c.dy); await page.waitForTimeout(50); }
    await page.waitForTimeout(500);
    const after = await page.evaluate(() => window.scrollY);

    console.log(`${c.name}: scrollY ${before} -> ${after} (${after - before}), auto-scrolls ${await autoScrolls(page)}`);
    expect(await autoScrolls(page), 'a stationary cursor triggered an auto-scroll').toBe(0);
    expect(Math.sign(after - before), 'the page scrolled the wrong way').toBe(Math.sign(c.dy));
  });
}

test('scrolling and moving the mouse at once does not fight the scroll', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await ready(page);
  await watchAutoScrolls(page);
  await page.evaluate(() => document.querySelector('.poster-grid-wrap').scrollIntoView());
  await page.evaluate(() => window.scrollBy(0, 1400));
  await page.waitForTimeout(300);
  await resetAutoScrolls(page);

  const before = await page.evaluate(() => window.scrollY);
  for (let i = 0; i < 10; i++) {
    await page.mouse.wheel(0, -110);
    await page.mouse.move(600 + (i % 5) * 14, 500 + (i % 3) * 22);
    await page.waitForTimeout(40);
  }
  const midway = await page.evaluate(() => window.scrollY);
  const during = await autoScrolls(page);
  await page.waitForTimeout(1000);
  const after = await page.evaluate(() => window.scrollY);

  console.log(`wheel + move: scrollY ${before} -> ${midway} (during) -> ${after} (quiesced), auto-scrolls during ${during}`);
  expect(during, 'auto-scrolled while the user was still scrolling').toBe(0);
  expect(midway, 'user scroll went the wrong way').toBeLessThan(before - 700);
  expect(after, 'yanked after the scroll stopped').toBe(midway);
});

test('a user scroll cancels an in-flight auto-scroll', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await ready(page);

  await park(page, 12, 90);
  await page.waitForTimeout(300);
  const b = await page.locator('.poster-grid-item').nth(12).boundingBox();
  await page.mouse.move(10, 10);
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);

  await page.waitForTimeout(50);
  const during = await page.evaluate(() => window.scrollY);
  for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 150); await page.waitForTimeout(40); }
  await page.waitForTimeout(900);
  const after = await page.evaluate(() => window.scrollY);

  console.log(`interrupted: scrollY ${during} -> ${after} after wheeling down`);
  expect(after, 'the auto-scroll fought the wheel and dragged us back').toBeGreaterThan(during);
});

// The positive case the suppression above must not swallow.
test('a deliberate hover onto a clipped poster still settles it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await ready(page);
  await watchAutoScrolls(page);
  const off = await offset(page);

  await park(page, 12, 70);
  await page.waitForTimeout(300);
  await resetAutoScrolls(page);

  const b = await page.locator('.poster-grid-item').nth(12).boundingBox();
  await page.mouse.move(10, 10);
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(900);

  const row = await rowBox(page, 12);
  console.log(`deliberate hover: ${await autoScrolls(page)} auto-scroll, row landed at ${row.top.toFixed(1)} (line ${off.toFixed(1)})`);
  expect(await autoScrolls(page), 'a real hover must still settle').toBe(1);
  expect(Math.abs(row.top - off), 'row should land flush at the line').toBeLessThan(1.5);
});

// mouseover fires only on entering, so this would stay stuck until you left
// and came back.
test('an already-hovered poster recovers on move, without leaving and re-entering', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await ready(page);
  await watchAutoScrolls(page);
  const off = await offset(page);

  await park(page, 12, -120);
  await page.waitForTimeout(300);
  let b = await page.locator('.poster-grid-item').nth(12).boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(300);

  await resetAutoScrolls(page);
  for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, 80); await page.waitForTimeout(60); }
  await page.waitForTimeout(400);
  const clipped = await rowBox(page, 12);
  console.log(`scrolled under the line: row top ${clipped.top.toFixed(1)} (line ${off.toFixed(1)}), auto-scrolls ${await autoScrolls(page)}`);
  expect(clipped.top, 'setup: should now be clipped').toBeLessThan(off);
  expect(await autoScrolls(page), 'scrolling alone must not settle').toBe(0);

  b = await page.locator('.poster-grid-item').nth(12).boundingBox();
  await page.mouse.move(b.x + b.width / 2 + 6, Math.max(b.y + b.height / 2, off + 30));
  await page.waitForTimeout(900);
  const fixed = await rowBox(page, 12);
  console.log(`moved within the same poster: row top ${fixed.top.toFixed(1)}`);
  expect(Math.abs(fixed.top - off), 'moving inside the hovered poster did not fix it').toBeLessThan(1.5);
});

// Already hovered when it gets clipped, so it carries the popout transform.
// Settling has to aim at where it really sits, and round toward burying the
// neighbour: a sub-pixel the wrong way leaves a strip of it hoverable.
for (const edge of ['top', 'bottom']) {
  test(`settling an already-hovered poster clipped at the ${edge} leaves no sliver`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await ready(page);
    const off = await offset(page);

    await page.evaluate(({ o, edge }) => {
      const el = document.querySelectorAll('.poster-grid-item')[12];
      const h = el.getBoundingClientRect().height;
      const want = edge === 'top' ? o + 40 : window.innerHeight - h - 40;
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - want);
    }, { o: off, edge });
    await page.waitForTimeout(300);
    let b = await page.locator('.poster-grid-item').nth(12).boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.waitForTimeout(400);

    const lifted = await page.evaluate(() => getComputedStyle(document.querySelectorAll('.poster-grid-item')[12]).transform);
    expect(lifted, 'setup: should be popped out before we clip it').not.toBe('none');

    for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, edge === 'top' ? 90 : -90); await page.waitForTimeout(50); }
    await page.waitForTimeout(400);
    b = await page.locator('.poster-grid-item').nth(12).boundingBox();
    await page.mouse.move(b.x + b.width / 2 + 5, Math.min(Math.max(b.y + b.height / 2, off + 30), 870));
    await page.waitForTimeout(1000);

    const r = await page.evaluate(() => {
      const items = [...document.querySelectorAll('.poster-grid-item')];
      const t = items[12].getBoundingClientRect();
      const sib = items.find((e, i) => i !== 12 && Math.abs(e.getBoundingClientRect().top - t.top) < 20);
      const row = (sib || items[12]).getBoundingClientRect();
      const rects = items.map(e => e.getBoundingClientRect());
      return {
        rowTop: row.top, rowBottom: row.bottom,
        aboveBottom: (rects.filter(x => x.top < row.top - 20).pop() || {}).bottom ?? null,
        belowTop: (rects.find(x => x.top > row.top + 20) || {}).top ?? null,
        line: ShowsScrollNav.offset(), vh: window.innerHeight,
      };
    });
    console.log(`${edge}: row ${r.rowTop.toFixed(1)}..${r.rowBottom.toFixed(1)} | line ${r.line.toFixed(1)} | above ends ${r.aboveBottom?.toFixed(1)} | below starts ${r.belowTop?.toFixed(1)}`);

    expect(r.rowTop).toBeGreaterThanOrEqual(r.line - 1);
    expect(r.rowBottom).toBeLessThanOrEqual(r.vh + 1);
    // only the clipped side is constrained
    if (edge === 'top') {
      expect(r.aboveBottom, 'strip of the row above is showing below the line').toBeLessThanOrEqual(r.line + 0.5);
    } else {
      expect(r.belowTop, 'strip of the row below is showing above the window edge').toBeGreaterThanOrEqual(r.vh - 0.01);
    }

    const leaks = await page.evaluate(({ edge }) => {
      const items = [...document.querySelectorAll('.poster-grid-item')];
      const t = items[12].getBoundingClientRect();
      const sib = items.find((e, i) => i !== 12 && Math.abs(e.getBoundingClientRect().top - t.top) < 20);
      const row = (sib || items[12]).getBoundingClientRect();
      const line = ShowsScrollNav.offset();
      const ys = edge === 'top'
        ? [line + 0.5, line + 1, line + 2]
        : [window.innerHeight - 0.5, window.innerHeight - 1, window.innerHeight - 2];
      const found = [];
      for (let x = 130; x < 1220; x += 60) {
        for (const y of ys) {
          const el = document.elementFromPoint(x, y);
          const item = el && el.closest && el.closest('.poster-grid-item');
          if (!item) continue;
          const r = item.getBoundingClientRect();
          if (edge === 'top' ? r.top < row.top - 20 : r.top > row.top + 20) found.push([x, Math.round(y)]);
        }
      }
      return found;
    }, { edge });
    console.log(`${edge}: neighbour pixels reachable on the clipped edge: ${JSON.stringify(leaks)}`);
    expect(leaks).toEqual([]);
  });
}

// mousemove stops firing once the cursor leaves the window, so the readout has
// to be cleared some other way or it stays stuck on the last poster.
test('the year rule readout collapses when nothing is hovered', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await ready(page);
  await page.evaluate(() => document.querySelector('.poster-grid-wrap').scrollIntoView());
  await page.evaluate(() => window.scrollBy(0, 700));
  await page.waitForTimeout(400);

  const state = () => page.evaluate(() => {
    const d = document.querySelector('.poster-year-detail');
    return {
      ruleW: Math.round(document.querySelector('.poster-year-rule').getBoundingClientRect().width),
      detailW: Math.round(d.getBoundingClientRect().width),
      shown: d.classList.contains('is-shown'),
    };
  });

  const idle = await state();
  console.log('idle:     ', JSON.stringify(idle));
  expect(idle.shown).toBe(false);

  const i = await page.evaluate(() => {
    const line = ShowsScrollNav.offset();
    return [...document.querySelectorAll('.poster-grid-item')]
      .findIndex(e => { const r = e.getBoundingClientRect(); return r.top > line + 4 && r.bottom < window.innerHeight - 4; });
  });
  const b = await page.locator('.poster-grid-item').nth(i).boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(500);
  const hovered = await state();
  console.log('hovered:  ', JSON.stringify(hovered));
  expect(hovered.shown).toBe(true);
  expect(hovered.ruleW, 'rule should give way to the readout').toBeLessThan(idle.ruleW - 100);

  // the year label follows the hovered poster, so it can't disagree with the
  // date beside it on a row that straddles a year boundary
  const paired = await page.evaluate(() => ({
    label: document.querySelector('.poster-year-label').textContent,
    posterYear: document.querySelector('.poster-grid-item:hover')?.dataset.year,
  }));
  console.log('label vs hovered poster:', JSON.stringify(paired));
  expect(paired.label).toBe(paired.posterYear);

  await page.evaluate(() => document.dispatchEvent(new MouseEvent('mouseleave')));
  await page.waitForTimeout(500);
  const after = await state();
  console.log('cursor gone:', JSON.stringify(after));
  expect(after.shown, 'readout stuck after the cursor left the window').toBe(false);
  expect(after.detailW).toBe(0);
  expect(after.ruleW, 'rule did not go back to full width').toBe(idle.ruleW);
});
