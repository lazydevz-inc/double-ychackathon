import { list, put } from "@vercel/blob";
import { customAlphabet } from "nanoid";
import type { Comment, Double, JoinStatus, Post, Story, World } from "./types";

/*
 * Everything lives in Vercel Blob as small JSON documents.
 * Public blobs are CDN-cached, so documents are never overwritten: posts and stories are
 * write-once, and a Double or a join status gets a new timestamped doc on every save
 * (the newest one wins). Pathnames start with a reversed timestamp so lists come back newest first.
 */

export const newId = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 10);
const rev = (t: number) => String(9_999_999_999_999 - t).padStart(13, "0");
export const HANDLE = /^[a-z0-9._]{1,30}$/;

async function putJson(pathname: string, data: unknown) {
  await put(pathname, JSON.stringify(data), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

async function fetchJson<T>(url: string): Promise<T | null> {
  // Every doc path is immutable, so the CDN copy is always right.
  const res = await fetch(url, { cache: "force-cache" });
  return res.ok ? ((await res.json()) as T) : null;
}

async function listAll(prefix: string) {
  const out: { pathname: string; url: string }[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    out.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return out;
}

/** newest doc per key, where the key is the path segment right after the prefix */
function newestPerKey(blobs: { pathname: string; url: string }[], prefix: string) {
  const best = new Map<string, { pathname: string; url: string }>();
  for (const b of blobs) {
    const key = b.pathname.slice(prefix.length).split("/")[0];
    const cur = best.get(key);
    if (!cur || b.pathname > cur.pathname) best.set(key, b);
  }
  return best;
}

export async function putFile(pathname: string, body: Uint8Array | Buffer, contentType: string) {
  const blob = await put(pathname, body as unknown as Blob, { access: "public", contentType, addRandomSuffix: true });
  return blob.url;
}

export async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url.slice(0, 80)} -> ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

// --- Doubles ---------------------------------------------------------------
export const saveDouble = (d: Double) => putJson(`world/doubles/${d.handle}/doc-${Date.now()}.json`, d);

export async function loadDouble(handle: string) {
  if (!HANDLE.test(handle)) return null;
  const blobs = await listAll(`world/doubles/${handle}/`);
  if (!blobs.length) return null;
  const latest = blobs.reduce((a, b) => (a.pathname > b.pathname ? a : b));
  return fetchJson<Double>(latest.url);
}

// --- Posts / stories / videos / comments ------------------------------------
export const savePost = (p: Post) => putJson(`world/posts/${rev(p.createdAt)}-${p.id}.json`, p);
export const saveStory = (s: Story) => putJson(`world/stories/${rev(s.createdAt)}-${s.id}.json`, s);
export const saveVideo = (postId: string, mp4: Uint8Array) =>
  putFile(`world/videos/${postId}/clip.mp4`, mp4, "video/mp4");
export const saveComment = (postId: string, c: Comment) =>
  putJson(`world/comments/${postId}/${Date.now()}-${newId()}.json`, c);

// --- Join progress -----------------------------------------------------------
export const saveJoin = (s: JoinStatus) => putJson(`world/jobs/${s.handle}/${Date.now()}.json`, s);
export async function loadJoin(handle: string) {
  if (!HANDLE.test(handle)) return null;
  const blobs = await listAll(`world/jobs/${handle}/`);
  if (!blobs.length) return null;
  const latest = blobs.reduce((a, b) => (a.pathname > b.pathname ? a : b));
  return fetchJson<JoinStatus>(latest.url);
}

// --- The whole world, for rendering ------------------------------------------
export async function loadWorld(): Promise<World> {
  const [d, p, s, v, c] = await Promise.all([
    listAll("world/doubles/"),
    listAll("world/posts/"),
    listAll("world/stories/"),
    listAll("world/videos/"),
    listAll("world/comments/"),
  ]);
  const [doubles, posts, stories, comments] = await Promise.all([
    Promise.all([...newestPerKey(d, "world/doubles/").values()].map((b) => fetchJson<Double>(b.url))),
    Promise.all(p.map((b) => fetchJson<Post>(b.url))),
    Promise.all(s.map((b) => fetchJson<Story>(b.url))),
    Promise.all(c.map(async (b) => ({ postId: b.pathname.split("/")[2], c: await fetchJson<Comment>(b.url) }))),
  ]);
  const videos = new Map<string, string>();
  for (const b of v) videos.set(b.pathname.split("/")[2], b.url);
  const extraComments = new Map<string, Comment[]>();
  for (const { postId, c: cm } of comments.sort((a, b) => (a.c?.at ?? 0) - (b.c?.at ?? 0))) {
    if (!cm) continue;
    extraComments.set(postId, [...(extraComments.get(postId) ?? []), cm]);
  }
  const byNewest = <T extends { createdAt: number }>(xs: (T | null)[]) =>
    xs.filter((x): x is T => !!x).sort((a, b) => b.createdAt - a.createdAt);
  return {
    doubles: new Map(doubles.filter((x): x is Double => !!x).map((x) => [x.handle, x])),
    posts: byNewest(posts),
    stories: byNewest(stories),
    videos,
    extraComments,
  };
}
