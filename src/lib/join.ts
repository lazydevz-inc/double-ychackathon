import sharp from "sharp";
import { animate, planDay, readPerson, renderScene } from "./ai";
import { MAX_PHOTOS } from "./config";
import { fetchInstagram } from "./instagram";
import { fetchBytes, loadWorld, newId, putFile, saveDouble, saveJoin, savePost, saveStory } from "./store";
import type { Double, JoinStep, Post, Story } from "./types";

const jpeg = async (bytes: Uint8Array, width: number) =>
  sharp(Buffer.from(bytes)).resize({ width, withoutEnlargement: true }).jpeg({ quality: 84, mozjpeg: true }).toBuffer();

/**
 * Someone joins with their Instagram handle:
 * real posts -> persona -> two moments with people already in the world -> photoreal scenes -> clips.
 * Progress is written as join-status docs the client polls.
 */
export async function runJoin(handle: string) {
  const step = (s: JoinStep, message?: string) => saveJoin({ handle, step: s, message, at: Date.now() });
  try {
    await step("reading");
    const ig = await fetchInstagram(handle, MAX_PHOTOS);
    const got = await Promise.allSettled([ig.pfp, ...ig.photos.map((p) => p.url)].map((u) => (u ? fetchBytes(u) : Promise.reject())));
    const photos = got.map((r) => (r.status === "fulfilled" ? r.value : null));
    const usable = photos.map((b, i) => (b ? i : -1)).filter((i) => i >= 0);
    if (usable.length < 3) throw new Error("Couldn't load enough of your photos");

    await step("persona");
    const persona = await readPerson(ig, usable.map((i) => photos[i]!));
    const pick = (k: number) => photos[usable[k]];
    const kids = new Set(persona.childPhotos);
    const refIdx = persona.refs.filter((k) => !kids.has(k) && pick(k)).slice(0, 2);
    if (!refIdx.length) refIdx.push(0);
    const [pfp, ...refs] = await Promise.all([
      putFile(`world/media/${handle}-pfp.jpg`, await jpeg(pick(0)!, 320), "image/jpeg"),
      ...refIdx.map(async (k) => putFile(`world/media/${handle}-ref.jpg`, await jpeg(pick(k)!, 1080), "image/jpeg")),
    ]);
    const me: Double = {
      handle,
      name: persona.name || ig.fullName,
      bio: persona.bio,
      pfp,
      refs,
      who: persona.who,
      faceShown: persona.faceShown,
      lifeInWorld: persona.lifeInWorld,
      interests: persona.interests,
      lang: "en",
      igFollowers: ig.followers,
      createdAt: Date.now(),
    };
    await saveDouble(me);

    await step("moments");
    const world = await loadWorld();
    const roster = [...world.doubles.values()].filter((d) => d.handle !== handle);
    const plan = await planDay(me, roster, 2);
    const byHandle = new Map(roster.map((d) => [d.handle, d]));

    await step("photos");
    const now = Date.now();
    const posts = await Promise.all(
      plan.moments.slice(0, 2).map(async (m, i): Promise<Post | null> => {
        const other = byHandle.get(m.author === handle ? m.with : m.author) ?? byHandle.get(m.with);
        if (!other) return null;
        try {
          const image = await renderScene([me, other], m.scene, m.place, "1024x1280");
          const author = m.author === other.handle ? other.handle : handle;
          return {
            id: newId(),
            author,
            with: [author === handle ? other.handle : handle],
            title: m.title,
            place: m.place,
            caption: m.caption,
            image,
            comments: m.comments.filter((c) => c.author === handle || byHandle.has(c.author)),
            likes: 40 + Math.floor(Math.random() * 400),
            createdAt: now - i * 60_000,
          };
        } catch (e) {
          console.error("[join] scene failed", e instanceof Error ? e.message.slice(0, 160) : e);
          return null;
        }
      }),
    );
    const frames = await Promise.all(
      plan.story.frames.map(async (f) => {
        try {
          return { image: await renderScene([me], f.scene, null, "1024x1536"), overlay: f.overlay, sticker: f.sticker };
        } catch {
          return null;
        }
      }),
    );
    const made = posts.filter((p): p is Post => !!p);
    await Promise.all(made.map(savePost));
    const storyFrames = frames.filter((f): f is NonNullable<typeof f> => !!f);
    if (storyFrames.length) {
      const story: Story = { id: newId(), author: handle, frames: storyFrames, createdAt: now - 30_000 };
      await saveStory(story);
    }
    if (!made.length) throw new Error("Couldn't create photos this time");
    await step("done");
    // clips arrive a minute later; the feed shows the still until then
    await Promise.all(made.map((p) => animate(p.id, p.image)));
  } catch (e) {
    console.error("[join]", handle, e);
    await step("error", e instanceof Error ? e.message : "Something went wrong");
  }
}
