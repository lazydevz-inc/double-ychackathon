// Uploads compressed 9:16 hero loops and saves a new doc version of each house Double with them as clips[0].
// Usage: node --env-file=.env.local scripts/set-hero-clips.mjs <dir>
import { list, put } from '@vercel/blob';
import { readFileSync } from 'node:fs';
const dir = process.argv[2];
const map = { GuXvsdmOok: 'jennie', '4Qj_Tai_ik': 'lisa', mF82eGMzwO: 'karina' };
for (const [id, name] of Object.entries(map)) {
  const { blobs } = await list({ prefix: `doubles/${id}/doc-` });
  const latest = blobs.reduce((a, b) => (a.pathname > b.pathname ? a : b));
  const d = await (await fetch(latest.url)).json();
  const clip = await put(`doubles/${id}/hero-loop.mp4`, readFileSync(`${dir}/hero-${name}.mp4`), { access: 'public', contentType: 'video/mp4', addRandomSuffix: true });
  const next = { ...d, clips: [clip.url] };
  await put(`doubles/${id}/doc-${Date.now()}.json`, JSON.stringify(next), { access: 'public', contentType: 'application/json', addRandomSuffix: false });
  console.log(name, clip.url);
}
