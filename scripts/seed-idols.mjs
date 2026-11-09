// Seeds the house cast from real Instagram accounts via the app's own pipeline.
// Usage: node scripts/seed-idols.mjs [baseUrl]
import { writeFileSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const HANDLES = ['jennierubyjane', 'lalalalisa_m', 'katarinabluu'];

const ids = [];
for (const handle of HANDLES) {
  const t0 = Date.now();
  const form = new FormData();
  form.set('handle', handle);
  form.set('lang', 'en');
  form.set('house', '1');
  const res = await fetch(`${BASE}/api/doubles`, { method: 'POST', body: form });
  const text = await res.text();
  const lines = text.trim().split('\n').map((l) => { try { return JSON.parse(l); } catch { return { raw: l }; } });
  const done = lines.find((l) => l.type === 'done');
  const err = lines.find((l) => l.type === 'error');
  console.log(handle, lines.map((l) => l.stage ?? l.type).join(' > '), done?.id ?? err?.message ?? JSON.stringify(lines.at(-1)), `${Date.now() - t0}ms`);
  if (done) ids.push(done.id);
}
if (ids.length) writeFileSync(new URL('../src/data/house.json', import.meta.url), JSON.stringify(ids, null, 2) + '\n');
console.log('house ids', ids);
