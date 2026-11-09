import type { World } from "./types";

/** Stories live for a day. The world keeps making new ones, so nothing piles up. */
export const DAY = 24 * 3600 * 1000;
export const clock = () => Date.now();

export type Item = {
  id: string;
  kind: "moment" | "frame";
  at: number;
  author: string;
  image: string;
  video?: string;
  title?: string;
  caption?: string;
  place?: string;
  with?: string;
  overlay?: string;
  sticker?: string;
  postId?: string;
};

/** Everyone's last-24h story, oldest item first. A moment shows up in both people's stories. */
export function storiesByPerson(world: World, now: number) {
  const all: { owner: string; item: Item }[] = [];
  for (const p of world.posts) {
    const item: Item = { id: p.id, kind: "moment", at: p.createdAt, author: p.author, image: p.image, video: world.videos.get(p.id), title: p.title, caption: p.caption, place: p.place, with: p.with[0], postId: p.id };
    for (const owner of [p.author, ...p.with]) all.push({ owner, item });
  }
  for (const s of world.stories) {
    s.frames.forEach((f, i) => all.push({ owner: s.author, item: { id: `${s.id}-${i}`, kind: "frame", at: s.createdAt + i, author: s.author, image: f.image, overlay: f.overlay, sticker: f.sticker } }));
  }
  const fresh = all.filter((x) => now - x.item.at < DAY);
  // a quiet day should never look empty: fall back to the latest items
  const use = fresh.length >= 8 ? fresh : all;
  const map = new Map<string, Item[]>();
  for (const { owner, item } of use) {
    if (!world.doubles.has(owner)) continue;
    map.set(owner, [...(map.get(owner) ?? []), item]);
  }
  for (const items of map.values()) items.sort((a, b) => a.at - b.at);
  return map;
}

/** Tray order: you first, then whoever posted most recently. */
export function trayOrder(map: Map<string, Item[]>, me?: string) {
  return [...map.entries()]
    .sort(([a, x], [b, y]) => (a === me ? -1 : b === me ? 1 : y[y.length - 1].at - x[x.length - 1].at))
    .map(([h]) => h);
}
