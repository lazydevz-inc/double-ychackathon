// Moves items older than `hours` back inside the last day (demo world: stories live for 24h).
import { list, put, del } from '@vercel/blob';
const rev = (t) => String(9_999_999_999_999 - t).padStart(13, '0');
const hours = Number(process.argv[2] ?? 20);
const now = Date.now();
for (const kind of ['posts', 'stories']) {
  const blobs = (await list({ prefix: `world/${kind}/`, limit: 1000 })).blobs;
  const docs = await Promise.all(blobs.map(async (b) => ({ b, d: await (await fetch(b.url)).json() })));
  const old = docs.filter(({ d }) => now - d.createdAt > hours * 36e5).sort((a, b) => a.d.createdAt - b.d.createdAt);
  for (const [i, { b, d }] of old.entries()) {
    const n = { ...d, createdAt: now - (hours - 2) * 36e5 + i * 50 * 6e4 };
    await put(`world/${kind}/${rev(n.createdAt)}-${n.id}.json`, JSON.stringify(n), { access: 'public', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true });
    await del(b.url);
    console.log(kind, d.id, d.author, ((now - n.createdAt) / 36e5).toFixed(1) + 'h ago');
  }
}
