import { get, list, put } from "@vercel/blob";
import type { Double, Episode } from "./types";

// Public blobs are CDN-cached for a long time, so documents are never overwritten:
// episodes are write-once, and a Double gets a new versioned doc on every save.

async function putJson(pathname: string, data: unknown) {
  await put(pathname, JSON.stringify(data), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
}

async function getJson<T>(pathname: string): Promise<T | null> {
  const res = await get(pathname, { access: "public" });
  if (!res || res.statusCode !== 200) return null;
  return (await new Response(res.stream).json()) as T;
}

export async function putImage(
  pathname: string,
  body: Uint8Array | Blob | ArrayBuffer,
  contentType: string,
): Promise<string> {
  const blob = await put(pathname, body as Blob, {
    access: "public",
    contentType,
    addRandomSuffix: true,
  });
  return blob.url;
}

export const saveDouble = (d: Double) => putJson(`doubles/${d.id}/doc-${Date.now()}.json`, d);

export async function loadDouble(id: string): Promise<Double | null> {
  if (!/^[\w-]+$/.test(id)) return null;
  const { blobs } = await list({ prefix: `doubles/${id}/doc-` });
  if (!blobs.length) return getJson<Double>(`doubles/${id}.json`); // legacy path
  const latest = blobs.reduce((a, b) => (a.pathname > b.pathname ? a : b));
  return getJson<Double>(latest.pathname);
}
export const saveEpisode = (e: Episode) => putJson(`episodes/${e.id}.json`, e);
export const loadEpisode = (id: string) => (/^[\w-]+$/.test(id) ? getJson<Episode>(`episodes/${id}.json`) : Promise.resolve(null));

export async function loadDoubles(ids: string[]) {
  const all = await Promise.all(ids.map(loadDouble));
  return all.filter((d): d is Double => d !== null);
}

export async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}
