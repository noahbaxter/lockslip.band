// Listen stats for lockslip.band.
//
// The IP never lands anywhere. It goes into a hash with the user agent and a
// secret mixed with the current window, and only 16 hex characters of that are
// kept. Cloudflare hands over the location for free, so nothing is looked up
// against anyone else's service.
//
// MEMORY_DAYS is the whole privacy design in one number: it is how long the
// same person keeps the same id, and so how far back "they came back" can be
// seen. 1 means a visitor cannot be followed past midnight, which is the
// setting that keeps this uncontroversial. 30 buys returning visitors within a
// month and is a bigger claim to have to stand behind. 0 never rotates, which
// is a permanent pseudonym for a person: that is profiling, and it wants a
// banner and a privacy policy to match.
const MEMORY_DAYS = 1;

const ORIGINS = ['https://lockslip.band', 'https://www.lockslip.band'];

// Ids, not free text. Every row is keyed by these, so anything that can vary
// without limit is a way to fill the database from outside. A release is a slug
// and a track is its number; the name rides along as a label only.
const RELEASE_RE = /^[a-z0-9][a-z0-9-]{0,31}$/;
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
        if (request.method !== 'POST') return new Response('POST only', { status: 405 });

        // Loudly, rather than hashing against the string "undefined": a guessable
        // salt makes every stored id reversible to the IP that made it, and it
        // would look like it was working.
        if (!env.SALT) return new Response('no salt', { status: 503 });

        // Required, not just checked when present. The endpoint is on another
        // host than the page, so a real beacon always carries one; letting a
        // missing header through waves past everything that is not a browser.
        // A determined script can still forge it, which is what the rate limit
        // rule in README.md is for.
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

        try {
            if (body.t === 'v') {
                await env.DB.prepare(`
                    INSERT INTO visits (day, visitor, country, region, city, hits, first_seen, last_seen)
                    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
                    ON CONFLICT (day, visitor) DO UPDATE SET
                        hits = hits + 1, last_seen = excluded.last_seen
                `).bind(day, visitor, country, region, city, now, now).run();

            } else if (body.t === 'l') {
                const release = typeof body.r === 'string' && RELEASE_RE.test(body.r) ? body.r : null;
                const num = Number.isInteger(body.n) && body.n > 0 && body.n <= 99 ? body.n : null;
                if (!release || !num) return new Response('bad event', { status: 400, headers: cors(origin) });

                // Clamped: a beacon claiming an hour of listening is a broken
                // client or someone poking at the endpoint.
                const seconds = Math.max(0, Math.min(60, Number(body.s) || 0));
                const starts = body.st ? 1 : 0;

                await env.DB.prepare(`
                    INSERT INTO listens (day, visitor, country, release, num, name, starts, seconds)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT (day, visitor, release, num) DO UPDATE SET
                        starts = starts + excluded.starts,
                        seconds = seconds + excluded.seconds,
                        name = excluded.name
                `).bind(day, visitor, country, release, num, label(body.k), starts, seconds).run();
            }
        } catch (err) {
            // Never let stats break the page: the client ignores the response
            // anyway, and a failed write is not worth an error in anyone's console.
            console.error(err.message);
        }

        return new Response(null, { status: 204, headers: cors(origin) });
    },
};
