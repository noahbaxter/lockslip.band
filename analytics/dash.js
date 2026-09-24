// The stats page. Reads what worker.js writes.

import { fillDays, bars, meter } from './chart.js';

// Section colours: public site, press link.
const PUBLIC = '#e01b24';
const PRESS = '#a06ef0';

// Opening the page once with ?key= stores it here, so a bare
// stats.lockslip.band works after that.
const COOKIE = 'k';
const YEAR = 365 * 86400;

const esc = s => String(s ?? '').replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Constant time, so the key can't be guessed by timing.
function keyOk(given, expected) {
    if (!expected || typeof given !== 'string' || given.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
    return diff === 0;
}

function cookieKey(request) {
    const m = (request.headers.get('Cookie') || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : null;
}

const PT = { timeZone: 'America/Los_Angeles' };
const when = ts => ts ? new Date(ts * 1000).toLocaleString('en-US', {
    ...PT, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
}) : '';

function ago(seconds) {
    if (seconds < 60) return `${Math.floor(seconds)}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

const clock = secs => {
    const m = Math.floor(secs / 60);
    if (m < 60) return `${m}m`;
    return `${Math.floor(m / 60)}h ${m % 60}m`;
};

function device(ua) {
    if (!ua) return '';
    const s = String(ua);
    const app = /Instagram/.test(s) ? ' in Instagram'
        : /FBAN|FBAV/.test(s) ? ' in Facebook'
        : /Twitter/.test(s) ? ' in Twitter' : '';
    const os = /iPhone/.test(s) ? 'iPhone'
        : /iPad/.test(s) ? 'iPad'
        : /Android/.test(s) ? 'Android'
        : /Mac OS X/.test(s) ? 'Mac'
        : /Windows/.test(s) ? 'Windows'
        : /Linux/.test(s) ? 'Linux' : 'unknown';
    return os + app;
}

const place = r => [r.city, r.region, r.country].filter(x => x && x !== '??').join(', ');

// Heading, one-line note, table. Rows come in already escaped. Past `cap` rows
// the table is clipped behind a CSS checkbox toggle.
const block = (title, meaning, head, rows, empty, cap = 0) => {
    const clipped = cap && rows.length > cap;
    const table = `<div class="scroll"><table>
    <tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr>
    ${rows.join('')}
  </table></div>`;
    const id = 'more-' + title.toLowerCase().replace(/[^a-z]+/g, '-');
    // +2 skips the header row.
    return `
<section>
  <h2>${esc(title)}</h2>
  ${meaning ? `<p class="says">${esc(meaning)}</p>` : ''}
  ${!rows.length ? `<p class="none">${esc(empty)}</p>`
    : !clipped ? table
    : `<style>#${id}:not(:checked) + .clip tr:nth-child(n+${cap + 2}) { display:none }</style>
       <input type="checkbox" class="more" id="${id}">
       <div class="clip">${table}</div>
       <label class="more" for="${id}">
         <span class="show">show all ${rows.length}</span>
         <span class="hide">show fewer</span>
       </label>`}
</section>`;
};

const all = r => r.results || [];

export async function dashboard(request, env) {
    const url = new URL(request.url);
    const fromQuery = url.searchParams.get('key');
    if (!keyOk(fromQuery ?? cookieKey(request), env.DASHBOARD_KEY)) {
        return new Response('Forbidden', { status: 403 });
    }

    // Store the key and bounce to a clean URL, so what's in the address bar
    // (and history) is just stats.lockslip.band.
    if (fromQuery !== null) {
        url.searchParams.delete('key');
        url.pathname = '/';
        return new Response(null, {
            status: 303,
            headers: {
                Location: url.pathname + url.search,
                'Set-Cookie': `${COOKIE}=${encodeURIComponent(fromQuery)}; Max-Age=${YEAR}; Path=/; HttpOnly; Secure; SameSite=Lax`,
            },
        });
    }

    const now = Math.floor(Date.now() / 1000);
    // Number(null) is 0, which means all time, so absent has to be checked first.
    const asked = url.searchParams.get('d');
    const days = asked !== null && [1, 7, 30, 0].includes(Number(asked)) ? Number(asked) : 7;
    const since = days ? new Date((now - days * 86400) * 1000).toISOString().slice(0, 10) : '0000-00-00';
    const windowLabel = days ? `last ${days} day${days > 1 ? 's' : ''}` : 'all time';

    // The client beats every 15s.
    const LIVE = now - 180;
    const ONSITE = now - 300;

    const q = (sql, ...binds) => env.DB.prepare(sql).bind(...binds).all();

    const [nowPlaying, onSite, pressRecent, pressOpens, pressPlays, pressWho,
        totals, sources, places, tracks, repeats,
        dailyVisitors, dailyMinutes, dailyPressOpens] = await Promise.all([
        q(`SELECT l.name, l.num, l.ref, l.last_seen, l.seconds, v.city, v.region, v.country
           FROM listens l LEFT JOIN visits v ON v.day = l.day AND v.visitor = l.visitor
           WHERE l.last_seen > ? ORDER BY l.last_seen DESC`, LIVE),
        q(`SELECT COUNT(*) AS n FROM visits WHERE last_seen > ?`, ONSITE),
        q(`SELECT ref, COUNT(*) AS opens, MAX(ts) AS last FROM press_visits
           WHERE ts > ? GROUP BY ref ORDER BY last DESC`, now - 3600),

        q(`SELECT ref, COUNT(*) AS opens, MIN(ts) AS first, MAX(ts) AS last
           FROM press_visits GROUP BY ref`),
        q(`SELECT ref, COUNT(DISTINCT num) AS tracks, SUM(starts) AS plays,
                  SUM(seconds) AS secs, MAX(last_seen) AS last
           FROM listens WHERE ref <> '' GROUP BY ref`),
        q(`SELECT p.ref, p.city, p.region, p.country, p.ua FROM press_visits p
           JOIN (SELECT ref, MAX(ts) AS ts FROM press_visits GROUP BY ref) m
             ON m.ref = p.ref AND m.ts = p.ts GROUP BY p.ref`),

        q(`SELECT COUNT(DISTINCT visitor) AS visitors, SUM(hits) AS loads FROM visits WHERE day >= ?`, since),
        q(`SELECT COALESCE(source, 'direct') AS source, COUNT(DISTINCT visitor) AS visitors
           FROM visits WHERE day >= ? GROUP BY source ORDER BY visitors DESC LIMIT 12`, since),
        q(`SELECT country, city, COUNT(DISTINCT visitor) AS visitors, SUM(hits) AS loads
           FROM visits WHERE day >= ? GROUP BY country, city ORDER BY visitors DESC LIMIT 25`, since),
        q(`SELECT num, name, COUNT(DISTINCT visitor) AS listeners, SUM(starts) AS plays,
                  SUM(seconds) AS secs, MAX(dur) AS dur
           FROM listens WHERE ref = '' AND day >= ? GROUP BY num ORDER BY num`, since),
        q(`SELECT COUNT(*) AS n FROM (
             SELECT visitor FROM visits WHERE day >= ? GROUP BY visitor HAVING COUNT(DISTINCT day) > 1
           )`, since),

        // Per day, for the charts. fillDays() adds the empty days.
        q(`SELECT day, COUNT(DISTINCT visitor) AS value FROM visits
           WHERE day >= ? GROUP BY day ORDER BY day`, since),
        q(`SELECT day, SUM(seconds) / 60 AS value FROM listens
           WHERE ref = '' AND day >= ? GROUP BY day ORDER BY day`, since),
        q(`SELECT date(ts, 'unixepoch') AS day, COUNT(*) AS value FROM press_visits
           WHERE date(ts, 'unixepoch') >= ? GROUP BY day ORDER BY day`, since),
    ]);

    // --- right now -----------------------------------------------------------

    const live = all(nowPlaying).map(r => `<tr>
        <td class="hot">${esc(r.name || `track ${r.num}`)}</td>
        <td>${esc(place(r)) || '<span class="dim">unknown</span>'}</td>
        <td>${r.ref ? `<span class="press">press: ${esc(r.ref)}</span>` : 'site'}</td>
        <td class="dim">${esc(ago(now - r.last_seen))}</td>
    </tr>`);

    const onSiteN = all(onSite)[0]?.n || 0;
    const recentPress = all(pressRecent)
        .map(r => `${esc(r.ref)} ×${r.opens}`).join(', ');

    // --- press ---------------------------------------------------------------

    const playsBy = new Map(all(pressPlays).map(r => [r.ref, r]));
    // Press plays weren't recorded at first. Opens older than the first recorded
    // play are "not measured", not "never played".
    const trackingFrom = Math.min(...all(pressPlays).map(r => r.last), Infinity);
    const whoBy = new Map(all(pressWho).map(r => [r.ref, r]));
    const pressRows = all(pressOpens)
        .sort((a, b) => b.last - a.last)
        .map(r => {
            const p = playsBy.get(r.ref);
            const w = whoBy.get(r.ref) || {};
            const listened = p
                ? `<span class="hot">${p.tracks} track${p.tracks > 1 ? 's' : ''}, ${clock(p.secs)}</span>`
                : r.last >= trackingFrom ? '<span class="dim">never pressed play</span>'
                : '<span class="dim">not measured</span>';
            return `<tr>
                <td class="who nowrap">${esc(r.ref)}</td>
                <td>${r.opens}</td>
                <td class="nowrap">${listened}</td>
                <td class="dim nowrap">${esc(when(r.last))}</td>
                <td class="nowrap">${esc(place(w))}</td>
                <td class="dim nowrap">${esc(device(w.ua))}</td>
            </tr>`;
        });

    // --- public site ---------------------------------------------------------

    const t = all(totals)[0] || {};
    const returning = all(repeats)[0]?.n || 0;
    const visitors = t.visitors || 0;
    const fresh = Math.max(0, visitors - returning);

    const sourceRows = all(sources).map(r => `<tr>
        <td>${esc(r.source)}</td><td>${r.visitors}</td>
    </tr>`);

    const placeRows = all(places).map(r => `<tr>
        <td>${esc(place(r)) || '<span class="dim">unknown</span>'}</td>
        <td>${r.visitors}</td><td class="dim">${r.loads}</td>
    </tr>`);

    const trackRows = all(tracks).map(r => {
        // Average listen against track length. Older clients don't send a length.
        const avg = r.listeners ? r.secs / r.listeners : 0;
        const pct = r.dur ? Math.min(100, Math.round((avg / r.dur) * 100)) : null;
        const bar = meter(pct, PUBLIC);
        return `<tr>
            <td class="dim">${r.num}</td>
            <td>${esc(r.name || '')}</td>
            <td>${r.listeners}</td>
            <td>${r.plays}</td>
            <td>${esc(clock(r.secs))}</td>
            <td>${bar}</td>
        </tr>`;
    });

    // "All time" charts the last 30 days.
    const today = new Date().toISOString().slice(0, 10);
    const span = days || 30;
    const visitorSeries = fillDays(all(dailyVisitors), span, today);
    const minuteSeries = fillDays(all(dailyMinutes), span, today);
    const pressSeries = fillDays(all(dailyPressOpens), span, today);

    const measurable = all(pressOpens).filter(r => r.last >= trackingFrom);
    const played = measurable.filter(r => playsBy.has(r.ref)).length;

    const tabs = [1, 7, 30, 0].map(d => {
        const label = d ? `${d}d` : 'all';
        return d === days ? `<b>${label}</b>` : `<a href="?d=${d}">${label}</a>`;
    }).join(' · ');

    const html = `<!doctype html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lockslip stats</title>
<style>
:root { --red:#e01b24; --dim:#666; }
body { background:#000; color:#eee; font:14px/1.5 ui-monospace,Menlo,monospace; margin:0; padding:1.5rem 1rem 4rem; }
h1 { font-size:1rem; letter-spacing:.2em; margin:0 0 .25rem; }
h2 { font-size:.9rem; color:var(--red); letter-spacing:.15em; margin:2.5rem 0 .2rem; text-transform:uppercase; }
.says { color:var(--dim); margin:0 0 .75rem; font-size:.8rem; }
.none { color:var(--dim); font-size:.8rem; margin:0; }
table { border-collapse:collapse; width:100%; }
th { text-align:left; color:var(--dim); font-weight:normal; font-size:.7rem;
     text-transform:uppercase; letter-spacing:.1em; border-bottom:1px solid #222; padding:.3rem .5rem .3rem 0; }
td { padding:.35rem .5rem .35rem 0; border-bottom:1px solid #111; vertical-align:top; }
td.nowrap, th { white-space:nowrap; }
.dim { color:var(--dim); }
.hot { color:var(--red); }
.who { color:#fff; font-weight:bold; }
.press { color:#c8a2ff; }
.big { font-size:1.6rem; color:#fff; }
.tabs { color:var(--dim); font-size:.8rem; margin:.5rem 0 0; }
.tabs a { color:var(--red); text-decoration:none; }
.lede { border-left:2px solid var(--red); padding-left:.75rem; margin:1rem 0 0; }

/* Wide tables scroll in their own box instead of pushing the page sideways. */
.scroll { overflow-x:auto; }
input.more { position:absolute; opacity:0; pointer-events:none; }
label.more { display:inline-block; margin-top:.6rem; padding:.3rem .6rem; cursor:pointer;
    color:var(--red); border:1px solid #222; font-size:.75rem; letter-spacing:.1em; text-transform:uppercase; }
label.more:hover { border-color:var(--red); }

/* ---- sections ------------------------------------------------------------- */
.band { border-left:2px solid var(--edge); padding:0 0 .5rem 1.25rem; margin:3rem 0 0; }
.band-public { --edge:#e01b24; }
.band-press { --edge:#a06ef0; }
.band-title { font-size:1.1rem; color:var(--edge); margin:0; letter-spacing:.12em; }
.band section h2 { color:var(--edge); }
.band .says { margin-top:.2rem; }
.reading { color:#ddd; font-size:.85rem; margin:1rem 0 0; }

/* ---- charts --------------------------------------------------------------- */
.figures { display:grid; grid-template-columns:repeat(auto-fit,minmax(17rem,1fr)); gap:1.5rem; margin-top:1.25rem; }
.chart { margin:0; }
.chart figcaption { display:flex; justify-content:space-between; align-items:baseline; gap:1rem;
    font-size:.7rem; text-transform:uppercase; letter-spacing:.1em; margin-bottom:.5rem; }
.chart-label { color:#ddd; }
.chart-total { color:#fff; }
.chart svg { width:100%; height:5.5rem; display:block; }
.bar-hit { fill:transparent; }
.bar:hover .bar-hit { fill:rgba(255,255,255,.06); }
.bar-fill { transition:opacity .1s; }
.bar:hover .bar-fill { opacity:.75; }
.chart-axis { display:flex; justify-content:space-between; color:var(--dim); font-size:.65rem; margin-top:.35rem; }
.score { align-self:center; }
.score .big { margin:0; }

.meter { display:inline-block; width:5rem; height:.5rem; background:#222; vertical-align:middle; }
.meter > span { display:block; height:100%; }

label.more .hide, input.more:checked + .clip + label.more .show { display:none; }
input.more:checked + .clip + label.more .hide { display:inline; }
</style></head><body>

<header class="top">
  <h1>LOCKSLIP</h1>
  <p class="tabs">window ${tabs}</p>
</header>
<p class="says">${esc(windowLabel)}, Pacific time. Press table is all time.</p>

<div class="lede">
  <p class="big">${live.length} listening &middot; ${onSiteN} on the site</p>
  <p class="says">Audio in the last 3 min, page loads in the last 5.${recentPress ? ` Press link opened in the last hour: ${esc(recentPress)}.` : ''}</p>
</div>

${block('Playing now', '',
    ['track', 'where', 'from', 'last beat'], live, 'Nothing playing.')}

<div class="band band-public">
  <h2 class="band-title">Public site</h2>

  <div class="figures">
    ${bars(visitorSeries, { hue: PUBLIC, label: 'People per day' })}
    ${bars(minuteSeries, { hue: PUBLIC, label: 'Minutes listened per day', unit: 'm' })}
  </div>

  <p class="reading">${visitors} visitor${visitors === 1 ? '' : 's'}: ${returning} returning, ${fresh} once. Ids reset every 30 days.</p>

${block('Sources', 'Direct includes Instagram and iMessage, which strip the referrer.',
    ['source', 'visitors'], sourceRows, 'No visits.')}

${block('Places', '',
    ['place', 'visitors', 'loads'], placeRows, 'No visits.', 10)}

${block('Tracks', 'Finished is the average share of the track listened to.',
    ['#', 'track', 'listeners', 'plays', 'total', 'finished'], trackRows, 'No plays.')}
</div>

<div class="band band-press">
  <h2 class="band-title">Press link</h2>

  <div class="figures">
    ${bars(pressSeries, { hue: PRESS, label: 'Opens per day' })}
    <div class="score">
      <p class="big">${played} <span class="dim">of ${measurable.length}</span></p>
      <p class="says">refs pressed play</p>
    </div>
  </div>

${block('Refs', '"Not measured" means opened before plays were tracked.',
    ['ref', 'opens', 'listened', 'last open', 'where', 'device'], pressRows, 'No opens.', 10)}
</div>

<script>
// Reload every minute, unless a table is expanded, the tab is hidden, or you've scrolled.
setInterval(() => {
    if (document.hidden) return;
    if (document.querySelector('input.more:checked')) return;
    if (window.scrollY > 40) return;
    location.reload();
}, 60000);
</script>

</body></html>`;

    return new Response(html, {
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Robots-Tag': 'noindex, nofollow',
        },
    });
}
