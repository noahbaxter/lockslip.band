const { test, expect } = require('@playwright/test');

// Across every width where the inline nav is shown (769px and up), the three
// header regions must never overlap: [nav links] [centered logo] [icons].
// We measure the rightmost actual link and the leftmost actual icon (not the
// stretched containers) so text/content overflow can't sneak past the check.

async function gotoReady(page) {
  await page.goto('/');
  await page.waitForSelector('.logo img');
  await page.waitForLoadState('networkidle');
}

function sweepWidths() {
  const ws = [];
  for (let w = 1440; w >= 780; w -= 20) ws.push(w);
  return ws;
}

test('inline header never overlaps across the width sweep', async ({ page }) => {
  await gotoReady(page);
  const failures = [];

  for (const width of sweepWidths()) {
    await page.setViewportSize({ width, height: 200 });
    await page.waitForTimeout(30); // let layout settle

    const m = await page.evaluate(() => {
      const visRect = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || r.width === 0) return null;
        return r;
      };
      const links = [...document.querySelectorAll('.nav-links a')].map(visRect).filter(Boolean);
      const icons = [...(document.querySelector('#streaming-icons')?.children || [])].map(visRect).filter(Boolean);
      const logo = visRect(document.querySelector('.logo img'));
      return {
        linksRight: links.length ? Math.max(...links.map((r) => r.right)) : null,
        iconsLeft: icons.length ? Math.min(...icons.map((r) => r.left)) : null,
        logoLeft: logo ? logo.left : null,
        logoRight: logo ? logo.right : null,
      };
    });

    if (m.linksRight != null && m.logoLeft != null && m.linksRight > m.logoLeft + 1) {
      failures.push(`${width}px: links overlap logo (links.right=${m.linksRight.toFixed(0)} > logo.left=${m.logoLeft.toFixed(0)})`);
    }
    if (m.iconsLeft != null && m.logoRight != null && m.iconsLeft < m.logoRight - 1) {
      failures.push(`${width}px: icons overlap logo (icons.left=${m.iconsLeft.toFixed(0)} < logo.right=${m.logoRight.toFixed(0)})`);
    }
    if (m.iconsLeft != null && m.linksRight != null && m.iconsLeft < m.linksRight) {
      failures.push(`${width}px: links overlap icons directly`);
    }
  }

  expect(failures, '\n' + failures.join('\n')).toEqual([]);
});
