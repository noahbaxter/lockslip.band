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

// A beacon's response is discarded, but a browser still needs the header to
// avoid logging a CORS error on the page.
const cors = origin => ({
    'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
});

// The window the id is good for. Same number for MEMORY_DAYS in a row, then it
// moves and every id moves with it.
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

const clean = (v, max) => typeof v === 'string' ? v.slice(0, max) : null;

export default {
    async fetch(request, env) {
        const origin = request.headers.get('Origin') || '';

        if (request.method === 'OPTIONS') return new Response(null, { headers: cors(origin) });
        if (request.method !== 'POST') return new Response('POST only', { status: 405 });
        if (origin && !ORIGINS.includes(origin)) return new Response('no', { status: 403 });

        let body;
        try {
            body = JSON.parse((await request.text()).slice(0, 1024));
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
                const release = clean(body.r, 64);
                const track = clean(body.k, 128);
                if (!release || !track) return new Response('bad event', { status: 400, headers: cors(origin) });

                // Clamped: a beacon claiming an hour of listening is a broken
                // client or someone poking at the endpoint.
                const seconds = Math.max(0, Math.min(60, Number(body.s) || 0));
                const starts = body.st ? 1 : 0;

                await env.DB.prepare(`
                    INSERT INTO listens (day, visitor, country, release, track, starts, seconds)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT (day, visitor, release, track) DO UPDATE SET
                        starts = starts + excluded.starts,
                        seconds = seconds + excluded.seconds
                `).bind(day, visitor, country, release, track, starts, seconds).run();
            }
        } catch (err) {
            // Never let stats break the page: the client ignores the response
            // anyway, and a failed write is not worth an error in anyone's console.
            console.error(err);
        }

        return new Response(null, { status: 204, headers: cors(origin) });
    },
};
