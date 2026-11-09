// One-off: rewrite the seeded world in natural English (global product), add a short title per moment.
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { list, put, del } from '@vercel/blob';
const rev = (t) => String(9_999_999_999_999 - t).padStart(13, '0');
const json = (p, d) => put(p, JSON.stringify(d), { access: 'public', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true });
const load = async (prefix) => Promise.all((await list({ prefix, limit: 1000 })).blobs.map(async (b) => ({ b, d: await (await fetch(b.url)).json() })));
const posts = await load('world/posts/');
const stories = await load('world/stories/');
const doubles = await load('world/doubles/');

const schema = z.object({
  posts: z.array(z.object({ id: z.string(), title: z.string().describe('2-5 plain words saying what happened, e.g. "5K, then the bench". No nicknames, no hype.'), place: z.string().describe('short English place, e.g. "Banpo Hangang Park"'), caption: z.string(), comments: z.array(z.object({ author: z.string(), text: z.string() })) })),
  stories: z.array(z.object({ id: z.string(), frames: z.array(z.object({ overlay: z.string().describe('max 28 chars'), sticker: z.string().describe('max 22 chars') })) })),
  names: z.array(z.object({ handle: z.string(), name: z.string().describe('romanized display name'), bio: z.string().describe('max 50 chars, plain') })),
});
const { output } = await generateText({
  model: 'anthropic/claude-opus-5.5',
  system: `Rewrite social posts from a global social app into natural, casual English as real people would post them. Keep each person's voice, emoji and the specific details (places, foods, numbers, inside jokes). Korean words that carry flavor may stay once in a while in parentheses-free form (e.g. "tofu after the hike" not "하산푸드"), but the text must read as English. Keep it understated: no hype, no nicknames, at most one hashtag. Keep the same number of comments and the same comment authors in the same order. Romanize Korean names (이상엽 -> Sang Rhee, 권준희 -> Junhee Kwon, 이유리 -> Yuri Lee, 시연 -> Siyeon, 서진 -> Seojin).`,
  output: Output.object({ schema }),
  prompt: JSON.stringify({
    posts: posts.map(({ d }) => ({ id: d.id, author: d.author, with: d.with, place: d.place, caption: d.caption, comments: d.comments })),
    stories: stories.map(({ d }) => ({ id: d.id, author: d.author, frames: d.frames.map((f) => ({ overlay: f.overlay, sticker: f.sticker })) })),
    people: doubles.map(({ d }) => ({ handle: d.handle, name: d.name, bio: d.bio })),
  }),
});
const P = new Map(output.posts.map((p) => [p.id, p]));
for (const { b, d } of posts) {
  const e = P.get(d.id); if (!e) { console.log('missing', d.id); continue; }
  const n = { ...d, title: e.title, place: e.place, caption: e.caption, comments: e.comments, createdAt: d.createdAt + 1 };
  await json(`world/posts/${rev(n.createdAt)}-${n.id}.json`, n); await del(b.url);
  console.log(`${n.id} | ${n.title} | ${n.place}\n   ${n.caption}\n   ${n.comments.map((c) => `${c.author}: ${c.text}`).join('\n   ')}`);
}
const S = new Map(output.stories.map((s) => [s.id, s]));
for (const { b, d } of stories) {
  const e = S.get(d.id); if (!e) continue;
  const n = { ...d, frames: d.frames.map((f, i) => ({ ...f, overlay: e.frames[i]?.overlay ?? f.overlay, sticker: e.frames[i]?.sticker ?? f.sticker })), createdAt: d.createdAt + 1 };
  await json(`world/stories/${rev(n.createdAt)}-${n.id}.json`, n); await del(b.url);
  console.log('story', n.author, n.frames.map((f) => `${f.overlay} / ${f.sticker}`).join(' | '));
}
const N = new Map(output.names.map((x) => [x.handle, x]));
const t = Date.now();
for (const { d } of doubles) {
  const e = N.get(d.handle); if (!e) continue;
  await json(`world/doubles/${d.handle}/doc-${t}.json`, { ...d, name: e.name, bio: e.bio, lang: 'en' });
  console.log('double', d.handle, e.name, '|', e.bio);
}
