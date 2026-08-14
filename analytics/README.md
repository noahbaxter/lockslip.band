# Listen stats

A Cloudflare Worker and a D1 database. The site beacons what is playing; the
worker counts it against a visitor id it derives and forgets. No cookies, no
localStorage, no third party, and the IP is never stored.

## Deploy

```bash
cd analytics
npx wrangler d1 create lockslip-stats          # paste the id into wrangler.toml
npx wrangler d1 execute lockslip-stats --remote --file=schema.sql
npx wrangler secret put SALT                   # a long random string, once
npx wrangler deploy
```

Then add a route in the dashboard (Workers & Pages → lockslip-stats → Settings →
Domains & Routes) for `stats.lockslip.band`, which is what `js/analytics.js`
posts to. Until that route exists the client is a silent no-op.

**Add a rate limit rule** while you are in there: Security → WAF → Rate limiting,
on `stats.lockslip.band`, something like 60 requests per minute per IP. The
worker checks the `Origin` header, but only a browser is obliged to send a
truthful one, so a script can forge it. The rate limit is the actual ceiling on
how much junk anyone can write.

## Reading it

There is no dashboard app. Cloudflare's own D1 console is the dashboard:
**Workers & Pages → D1 → lockslip-stats → Console**, and paste SQL. Or from here:

```bash
npx wrangler d1 execute lockslip-stats --remote --command "SELECT ..."
```

Most listened tracks this week:

```sql
SELECT release, num, name,
       SUM(starts) AS plays,
       SUM(seconds) / 60 AS minutes
FROM listens
WHERE day >= date('now', '-7 days')
GROUP BY release, num
ORDER BY minutes DESC;
```

Where people are:

```sql
SELECT country, city, COUNT(*) AS visitors, SUM(hits) AS page_loads
FROM visits
WHERE day >= date('now', '-30 days')
GROUP BY country, city
ORDER BY visitors DESC;
```

How far into the record people get, which is the interesting one:

```sql
SELECT num, name, COUNT(*) AS listeners, AVG(seconds) AS avg_seconds
FROM listens
WHERE release = 'the-conversation'
GROUP BY num
ORDER BY num;
```

## The privacy design

`MEMORY_DAYS` in `worker.js` is the whole thing. It is how long one person keeps
one id:

| value | what you can ask | where that puts you |
|-------|------------------|---------------------|
| `1` (current) | how many, from where, what, how long | no identifier is stored on anyone's device and nobody can be followed past midnight |
| `30` | the above, plus returning visitors within a month | defensible, but a month-long pseudonym is more clearly personal data |
| `0` | a lasting profile per person | profiling; wants a consent banner and a privacy policy |

The salt is the only thing standing between a stored id and the IP that made it:
IPv4 is small enough to brute force in minutes by anyone holding it. Keep it in
`wrangler secret`, never in the repo, and rotate it if it ever leaks.

The footer says what is collected. If `MEMORY_DAYS` changes, that line has to.
