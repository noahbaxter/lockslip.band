// Inline SVG charts for the dashboard. One series per chart, coloured by section.

const esc = s => String(s ?? '').replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Every day in the window, zero-filled so empty days still get a slot.
export function fillDays(rows, days, today) {
    const byDay = new Map(rows.map(r => [r.day, r]));
    const out = [];
    const end = new Date(today + 'T00:00:00Z');

    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(end);
        d.setUTCDate(d.getUTCDate() - i);
        const key = d.toISOString().slice(0, 10);
        out.push({ day: key, value: Number(byDay.get(key)?.value || 0) });
    }
    return out;
}

// One bar per day.
export function bars(data, { hue, label, unit = '' }) {
    if (!data.length) return '';

    const peak = Math.max(...data.map(d => d.value), 1);
    const nothing = data.every(d => d.value === 0);
    const w = 100 / data.length;
    const total = data.reduce((sum, d) => sum + d.value, 0);

    const marks = data.map((d, i) => {
        const h = (d.value / peak) * 82;
        const x = i * w;
        const day = new Date(d.day + 'T00:00:00Z').toLocaleDateString('en-US',
            { timeZone: 'UTC', month: 'short', day: 'numeric' });
        // Full-height transparent rect so the whole column is hoverable.
        return `<g class="bar">
            <title>${esc(day)}: ${d.value}${esc(unit)}</title>
            <rect class="bar-hit" x="${x}" y="0" width="${w}" height="100"></rect>
            ${d.value ? `<rect class="bar-fill" x="${x + 0.6}" y="${100 - h}" width="${Math.max(w - 1.2, 0.6)}" height="${h}" rx="1.2" fill="${hue}"></rect>` : ''}
        </g>`;
    }).join('');

    const first = data[0], last = data[data.length - 1];
    const fmt = d => new Date(d.day + 'T00:00:00Z').toLocaleDateString('en-US',
        { timeZone: 'UTC', month: 'short', day: 'numeric' });

    return `
    <figure class="chart">
        <figcaption>
            <span class="chart-label">${esc(label)}</span>
            <span class="chart-total">${total}${esc(unit)} <span class="dim">over ${data.length} days</span></span>
        </figcaption>
        ${nothing
            ? `<p class="none">Nothing yet.</p>`
            : `<svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img"
                    aria-label="${esc(label)}, ${total}${esc(unit)} over ${data.length} days">${marks}</svg>`}
        <div class="chart-axis"><span>${esc(fmt(first))}</span><span>peak ${peak}${esc(unit)}</span><span>${esc(fmt(last))}</span></div>
    </figure>`;
}

export function meter(pct, hue) {
    if (pct === null) return '<span class="dim">no length recorded</span>';
    return `<span class="meter"><span style="width:${Math.min(100, pct)}%;background:${hue}"></span></span> ${pct}%`;
}
