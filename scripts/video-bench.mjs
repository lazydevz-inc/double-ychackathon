// Image-to-video bench through Vercel AI Gateway.
// Usage: node --env-file=.env.local scripts/video-bench.mjs <inDir> <outDir> <image> <promptKey> <model...>
import { experimental_generateVideo as generateVideo, gateway } from 'ai';
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';

const [inDir, outDir, imageName, promptKey, ...models] = process.argv.slice(2);
const PROMPTS = {
  P1: 'She slowly turns her head from facing the camera to a three-quarter profile on her left, then back to the lens with a soft smile; one natural blink; loose hair strands move in a light breeze; locked-off static camera; photoreal skin texture; no text, no captions.',
  P2: 'She raises her right hand to tuck hair behind her right ear, then lowers it to rest on her hip, fingers clearly visible; slow camera push-in from medium shot to medium close-up; fabric moves naturally; no text.',
  P3: 'Handheld reality-TV shot: the camera slowly orbits about 30 degrees to the right as she shifts her weight and turns slightly toward camera, arms moving naturally; background stays consistent; no on-screen text, no logos.',
};
const image = readFileSync(`${inDir}/${imageName}.jpg`);
await Promise.all(models.map(async (id) => {
  const t0 = Date.now();
  const tag = `${imageName}-${promptKey}-${id.replace(/\W+/g, '_')}`;
  const attempt = async (opts) => generateVideo({ model: gateway.videoModel(id), prompt: { image, text: PROMPTS[promptKey] }, duration: 5, abortSignal: AbortSignal.timeout(600_000), ...opts });
  let res, err;
  try { res = await attempt({ aspectRatio: '9:16' }); }
  catch (e) {
    if (/aspect|ratio|adaptive/i.test(e.message ?? '')) { try { res = await attempt({ aspectRatio: 'adaptive' }); } catch (e2) { err = e2; } }
    else err = e;
  }
  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  if (res) {
    writeFileSync(`${outDir}/${tag}.mp4`, res.video.uint8Array);
    const line = { tag, model: id, ok: true, secs, warnings: res.warnings?.map((w) => w.message ?? w.type), meta: JSON.stringify(res.providerMetadata ?? {}).slice(0, 300) };
    console.log(JSON.stringify(line)); appendFileSync(`${outDir}/results.jsonl`, JSON.stringify(line) + '\n');
  } else {
    const msg = (err?.message ?? String(err)).slice(0, 220);
    const line = { tag, model: id, ok: false, secs, error: msg };
    console.log(JSON.stringify(line)); appendFileSync(`${outDir}/results.jsonl`, JSON.stringify(line) + '\n');
  }
}));
