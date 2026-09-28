// Days are Pacific, not UTC, or everything after 5pm lands on tomorrow.
// en-CA formats as YYYY-MM-DD, the same shape as the stored keys.
export const ptDay = ms => new Date(ms).toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
