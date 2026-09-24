import { dashboard } from './dash.js';

// Listen stats for lockslip.band. Writes here, reads in dash.js.
//
// The IP is never stored: it's hashed with the UA and a salted window, and 16
// hex chars of that are kept.
//
// Days one visitor keeps the same id. 0 never rotates.
const MEMORY_DAYS = 30;

const ORIGINS = ['https://lockslip.band', 'https://www.lockslip.band'];

// These end up in primary keys, so they're bounded to stop the table being
// filled from outside. Track names are stored as labels only.
const RELEASE_RE = /^[a-z0-9][a-z0-9-]{0,31}$/;
const REF_RE = /^[A-Za-z0-9._-]{1,32}$/;
const MAX_BODY = 1024;

const cors = origin => ({
    'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
});

function window_(now) {
    if (!MEMORY_DAYS) return 'fixed';
    return String(Math.floor(now / (MEMORY_DAYS * 86400)));
}

async function visitorId(request, env, now) {
    const ip = request.headers.get('CF-Connecting-IP') || '';
    const ua = request.headers.get('User-Agent') || '';
    const bytes = new TextEncoder().encode(`${env.SALT}:${window_(now)}:${ip}:${ua}`);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].slice(0, 8)
        .map(b => b.toString(16).padStart(2, '0')).join('');
}

// Kept for reading, never for keying, so a strange one cannot make a new row.
const label = v => typeof v === 'string'
    ? [...v].filter(c => c >= ' ').join('').slice(0, 128)
    : null;

export default {
    async fetch(request, env) {
        const origin = request.headers.get('Origin') || '';

        if (request.method === 'OPTIONS') return new Response(null, { headers: cors(origin) });

        // /dash is the old address, kept so existing bookmarks work.
        const path = new URL(request.url).pathname;
        if (request.method === 'GET' && (path === '/' || path === '/dash')) {
            return dashboard(request, env);
        }

        if (request.method !== 'POST') return new Response('POST only', { status: 405 });

        // Without a salt every stored id is reversible to its IP.
        if (!env.SALT) return new Response('no salt', { status: 503 });

        // Required, not just checked when present: a real beacon is cross-origin
        // and always sends one. Forgeable, hence the rate limit in README.md.
        if (!ORIGINS.includes(origin)) return new Response('no', { status: 403 });

        if (Number(request.headers.get('Content-Length')) > MAX_BODY) {
            return new Response('too big', { status: 413, headers: cors(origin) });
        }

        let body;
        try {
            body = JSON.parse((await request.text()).slice(0, MAX_BODY));
        } catch {
            return new Response('bad json', { status: 400, headers: cors(origin) });
        }

        const now = Math.floor(Date.now() / 1000);
        const day = new Date().toISOString().slice(0, 10);
        const visitor = await visitorId(request, env, now);
        const country = request.cf?.country ?? null;
        const region = request.cf?.region ?? null;
        const city = request.cf?.city ?? null;

        // Empty for the public site, the ?ref= for the press page.
        const ref = typeof body.p === 'string' && REF_RE.test(body.p) ? body.p : '';

        try {
            if (body.t === 'v') {
                // Referrer host only, not the full URL.
                const source = typeof body.s === 'string' && body.s.length <= 64
                    ? body.s.replace(/[^A-Za-z0-9.:-]/g, '').slice(0, 64) || null
                    : null;

                await env.DB.prepare(`
                    INSERT INTO visits (day, visitor, country, region, city, source, hits, first_seen, last_seen)
                    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
                    ON CONFLICT (day, visitor) DO UPDATE SET
                        hits = hits + 1, last_seen = excluded.last_seen
                `).bind(day, visitor, country, region, city, source, now, now).run();

            } else if (body.t === 'p') {
                // One row per open, not per day, so repeat opens show up.
                if (!ref) return new Response('bad ref', { status: 400, headers: cors(origin) });
                await env.DB.prepare(`
                    INSERT INTO press_visits (ts, ref, visitor, country, region, city, ua)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).bind(now, ref, visitor, country, region, city,
                    label(request.headers.get('User-Agent'))).run();

            } else if (body.t === 'l') {
                const release = typeof body.r === 'string' && RELEASE_RE.test(body.r) ? body.r : null;
                const num = Number.isInteger(body.n) && body.n > 0 && body.n <= 99 ? body.n : null;
                if (!release || !num) return new Response('bad event', { status: 400, headers: cors(origin) });

                // Clamped to one beat's worth.
                const seconds = Math.max(0, Math.min(60, Number(body.s) || 0));
                const starts = body.st ? 1 : 0;
                // Track length. Null from older clients.
                const dur = Number.isFinite(Number(body.d)) && Number(body.d) > 0
                    ? Math.min(3600, Math.round(Number(body.d))) : null;

                await env.DB.prepare(`
                    INSERT INTO listens (day, visitor, ref, country, release, num, name, dur, starts, seconds, last_seen)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT (day, visitor, ref, release, num) DO UPDATE SET
                        starts = starts + excluded.starts,
                        seconds = seconds + excluded.seconds,
                        name = excluded.name,
                        dur = COALESCE(excluded.dur, dur),
                        last_seen = excluded.last_seen
                `).bind(day, visitor, ref, country, release, num, label(body.k), dur, starts, seconds, now).run();
            }
        } catch (err) {
            // The client ignores the response, so a failed write stays quiet.
            console.error(err.message);
        }

        return new Response(null, { status: 204, headers: cors(origin) });
    },
};
