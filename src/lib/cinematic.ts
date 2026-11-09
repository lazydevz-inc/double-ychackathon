import { experimental_generateVideo as generateVideo, gateway } from "ai";
import { list, put } from "@vercel/blob";
import { VIDEO_FALLBACK, VIDEO_MODEL } from "./config";
import { canAnimate, isAvatar, visuals } from "./identity";
import { fetchBytes } from "./store";
import type { Double, Episode } from "./types";

/*
 * AI cinematic layer: animate a REAL post into a 5s clip for the dramatic beats.
 * Motion stays subtle (identity + anatomy are the quality bar) and the video keeps
 * the source photo's aspect ratio so the model never invents off-frame body parts;
 * the 9:16 player crops with object-cover.
 */

const KEEP = "Keep the face, hair, hands, outfit and every object exactly as in the photo; do not add or remove anything; no text, no captions, no logos.";
const MOTION = {
  confessional: `Confessional interview shot. The person looks straight into the lens and gives a small knowing smile, one natural blink, a few hair strands move slightly. Locked-off static camera, photoreal. ${KEEP}`,
  twist: `Reality-TV reaction shot. Locked-off static camera, no zoom. The person's eyes widen slightly in surprise, a small head tilt, one blink, subtle breathing. Photoreal. ${KEEP}`,
} as const;

export type Shot = { key: string; photo: string; kind: keyof typeof MOTION; avatar: boolean };

/** Which beats get a cinematic clip: confessionals + both sides of the twist. Max 3 (~$1 each at 1080p). */
export function planShots(ep: Episode, cast: Double[]): Shot[] {
  const byId = new Map(cast.map((d) => [d.id, d]));
  // avatars: close-up (index 1) for confessionals, reaction (index 2) for twists
  const pick = (d: Double, kind: Shot["kind"]) =>
    isAvatar(d) ? (visuals(d).photos[kind === "confessional" ? 1 : 2] ?? visuals(d).hero) : visuals(d).hero;
  const shots: Shot[] = [];
  // Only the hero photo (face large and clearly visible) is animated: in the bench, identity
  // drifted whenever the model had to invent a face that was small in the source.
  ep.scenes.forEach((s, i) => {
    if (s.kind === "confessional" && s.focus[0] && byId.has(s.focus[0])) {
      const d = byId.get(s.focus[0])!;
      if (canAnimate(d)) shots.push({ key: `${i}-${d.id}`, photo: pick(d, "confessional"), kind: "confessional", avatar: isAvatar(d) });
    }
    if (s.kind === "twist") {
      for (const f of s.focus.slice(0, 2)) {
        const d = byId.get(f);
        if (d && canAnimate(d)) shots.push({ key: `${i}-${d.id}`, photo: pick(d, "twist"), kind: "twist", avatar: isAvatar(d) });
      }
    }
  });
  return shots.slice(0, 3);
}

async function renderShot(epId: string, shot: Shot) {
  const image = await fetchBytes(shot.photo);
  let lastError: unknown;
  for (const modelId of [VIDEO_MODEL, VIDEO_FALLBACK]) {
    try {
      const { video } = await generateVideo({
        model: gateway.videoModel(modelId),
        prompt: { image, text: shot.avatar ? MOTION[shot.kind].replace(/photoreal\./i, "Keep the exact illustration style, line work and colors; it stays a drawing.") : MOTION[shot.kind] },
        duration: 5,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(240_000),
      });
      await put(`episodes/${epId}/cine/${shot.key}.mp4`, video.uint8Array as unknown as Blob, {
        access: "public",
        contentType: "video/mp4",
        addRandomSuffix: true,
      });
      console.log(`[cinematic] ${epId} ${shot.key} ok via ${modelId}`);
      return;
    } catch (e) {
      lastError = e;
      console.error(`[cinematic] ${epId} ${shot.key} failed via ${modelId}:`, e instanceof Error ? e.message.slice(0, 160) : e);
    }
  }
  throw lastError;
}

/** Claims the episode so concurrent viewers don't render twice. A stale claim (>5 min) can be retaken to fill missing shots. */
export async function claim(epId: string) {
  const path = `episodes/${epId}/cine/lock`;
  try {
    await put(path, String(Date.now()), { access: "public", addRandomSuffix: false });
    return true;
  } catch {
    const { blobs } = await list({ prefix: path });
    const age = blobs[0] ? Date.now() - new Date(blobs[0].uploadedAt).getTime() : Infinity;
    if (age < 5 * 60_000) return false;
    await put(path, String(Date.now()), { access: "public", addRandomSuffix: false, allowOverwrite: true });
    return true;
  }
}

export async function renderCinematics(ep: Episode, cast: Double[]) {
  const done = (await listCinematics(ep.id)).clips;
  const shots = planShots(ep, cast).filter((s) => !done[s.key]);
  console.log(`[cinematic] ${ep.id}: ${shots.length} shots via ${VIDEO_MODEL}`);
  const results = await Promise.allSettled(shots.map((s) => renderShot(ep.id, s)));
  results.forEach((r, k) => r.status === "rejected" && console.error("cinematic failed", shots[k].key, r.reason));
  return results.filter((r) => r.status === "fulfilled").length;
}

/** { "<sceneIndex>-<doubleId>": url } */
export async function listCinematics(epId: string) {
  const { blobs } = await list({ prefix: `episodes/${epId}/cine/` });
  const out: Record<string, string> = {};
  let locked = false;
  for (const b of blobs) {
    const name = b.pathname.split("/").pop()!;
    if (name === "lock") locked = true;
    const m = name.match(/^(\d+-[\w-]+?)-[A-Za-z0-9]{30}\.mp4$/);
    if (m) out[m[1]] = b.url;
  }
  return { clips: out, started: locked };
}
