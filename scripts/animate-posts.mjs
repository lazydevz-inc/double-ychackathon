// Turns world posts (stills) into 5s clips. Skips posts that already have a clip.
// usage: node --env-file=.env.local scripts/animate-posts.mjs [postId ...]
import { experimental_generateVideo as generateVideo, gateway } from 'ai';
import { list, put } from '@vercel/blob';

const MODELS = [process.env.DOUBLE_VIDEO_MODEL ?? 'alibaba/wan-v3.0-video', process.env.DOUBLE_VIDEO_FALLBACK ?? 'klingai/kling-v3.0-i2v'];
export const MOTION = 'Locked-off static camera, no zoom, no pan. The people in the photo come alive for a few seconds: small natural smiles, a blink, a slight head turn, breathing; hair and clothes shift slightly; gentle ambient motion in the background. Photoreal. Keep every face, hand, outfit and object exactly as in the photo; nobody new enters the frame; no text, no captions, no logos.';

const only = new Set(process.argv.slice(2));
const posts = (await list({ prefix: 'world/posts/', limit: 1000 })).blobs;
const done = new Set((await list({ prefix: 'world/videos/', limit: 1000 })).blobs.map((b) => b.pathname.split('/')[2]));
const todo = (await Promise.all(posts.map((b) => fetch(b.url).then((r) => r.json())))).filter((p) => !done.has(p.id) && (!only.size || only.has(p.id)));
console.log('animating', todo.length);
await Promise.all(todo.map(async (p) => {
  const image = new Uint8Array(await (await fetch(p.image)).arrayBuffer());
  for (const m of MODELS) {
    const t = Date.now();
    try {
      const { video } = await generateVideo({ model: gateway.videoModel(m), prompt: { image, text: MOTION }, duration: 5, maxRetries: 0, abortSignal: AbortSignal.timeout(300_000) });
      await put(`world/videos/${p.id}/clip.mp4`, Buffer.from(video.uint8Array), { access: 'public', contentType: 'video/mp4', addRandomSuffix: true });
      console.log('OK', p.id, p.author, '+', p.with.join(','), m, ((Date.now() - t) / 1000).toFixed(0) + 's');
      return;
    } catch (e) { console.log('FAIL', p.id, m, e.message?.slice(0, 140)); }
  }
}));
console.log('done');
