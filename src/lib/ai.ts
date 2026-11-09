import { experimental_generateVideo as generateVideo, gateway, generateImage, generateText, Output } from "ai";
import sharp from "sharp";
import { z } from "zod";
import { FAST_MODEL, IMAGE_MODEL, VIDEO_FALLBACK, VIDEO_MODEL, WRITER_MODEL } from "./config";
import type { InstagramProfile } from "./instagram";
import { fetchBytes, putFile, saveVideo } from "./store";
import type { Double } from "./types";

/* ---------------------------------------------------------------------------
 * 1. Persona: who is this person, read from their real posts.
 * ------------------------------------------------------------------------- */

const personaSchema = z.object({
  name: z.string().describe("Display name, romanized if not Latin script"),
  bio: z.string().describe("Max 50 chars. A plain bio they could have written themselves, in English. No nicknames, no titles."),
  lifeInWorld: z.string().describe("Max 160 chars. What an ordinary day looks like for them, drawn from what they actually post."),
  interests: z.array(z.string()).min(3).max(5).describe("Short lowercase tags, e.g. 'trail running'"),
  who: z.string().describe("Max 90 chars. Appearance for a photographer: apparent gender, age range, hair, build. E.g. 'Korean man in his 30s with short black hair, athletic'"),
  faceShown: z.boolean().describe("Is the account owner's face clearly visible in at least one photo?"),
  refs: z.array(z.number().int()).max(2).describe("Indices of up to 2 photos where the account owner's face is largest and clearest, ideally alone. Never photos with children."),
  childPhotos: z.array(z.number().int()).describe("Indices of photos that show children"),
});
export type Persona = z.infer<typeof personaSchema>;

export async function readPerson(ig: InstagramProfile, photos: Uint8Array[]): Promise<Persona> {
  const { output } = await generateText({
    model: WRITER_MODEL,
    system:
      "You set up someone's Double for DOUBLE, a global social app where your Double keeps living in a shared world while you're offline. Look at their real Instagram and describe them plainly and warmly, from what is visible. No nicknames, no titles, no jokes about looks, body or age. Never describe children or family members. English.",
    output: Output.object({ schema: personaSchema }),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: `@${ig.username} (${ig.fullName}). Bio: ${ig.bio || "-"}` },
          ...photos.flatMap((data, i) => [
            { type: "text" as const, text: i === 0 ? "Photo 0 (profile picture)" : `Photo ${i}. Caption: ${(ig.photos[i - 1]?.caption ?? "").slice(0, 200)}` },
            { type: "file" as const, data, mediaType: "image/jpeg" },
          ]),
        ],
      },
    ],
  });
  return output;
}

/* ---------------------------------------------------------------------------
 * 2. Moments: what two Doubles did together today, written like real posts.
 * ------------------------------------------------------------------------- */

const momentSchema = z.object({
  author: z.string().describe("handle of who posts it"),
  with: z.string().describe("handle of the other person in the photo"),
  title: z.string().describe("2-5 plain words saying what happened, e.g. 'Sunrise on the ridge'. No nicknames, no hype."),
  place: z.string().describe("Short, specific, real-sounding place, e.g. 'Banpo Hangang Park'"),
  scene: z.string().describe("Max 240 chars. The photo for a photographer: where, what each person wears and does, framing. Both faces clearly toward the camera unless that person has faceShown=false (then from behind or in profile)."),
  caption: z.string().describe("Max 140 chars, in the author's own voice"),
  comments: z.array(z.object({ author: z.string(), text: z.string().describe("max 80 chars") })).min(2).max(3),
});
const daySchema = z.object({
  moments: z.array(momentSchema),
  story: z
    .object({
      frames: z
        .array(z.object({ scene: z.string().describe("Max 200 chars. A vertical selfie-style shot of the story author alone."), overlay: z.string().describe("max 28 chars"), sticker: z.string().describe("max 22 chars") }))
        .length(2),
    })
    .describe("A 2-frame story by the newcomer"),
});
export type Moment = z.infer<typeof momentSchema>;
export type DayPlan = z.infer<typeof daySchema>;

const brief = (d: Double) => ({ handle: d.handle, name: d.name, bio: d.bio, lifeInWorld: d.lifeInWorld, interests: d.interests, faceShown: d.faceShown });

export async function planDay(newcomer: Double, roster: Double[], count = 2): Promise<DayPlan> {
  const { output } = await generateText({
    model: WRITER_MODEL,
    system: `You write what happened today in DOUBLE, a global social app where everyone's Double keeps living in one shared world while they're offline. It appears as ordinary posts: write like real people post. Short, casual, specific, lightly funny, never try-hard. English (a Korean or other word now and then is fine if that's how the person talks).
Rules:
- Each moment shows exactly two people doing one concrete everyday thing together in one place (a run, a café, a hike, a market, a workshop, cooking, a pop-up...). Find a believable overlap in what both of them actually post about.
- No reality-show language, no casting, no votes, no nicknames or titles, at most one hashtag, never mention AI, Doubles, simulations or "the world".
- Never mention children or family members. Nothing political, medical or about money.
- Comments come from people in the roster and react naturally.`,
    output: Output.object({ schema: daySchema }),
    prompt: JSON.stringify({
      task: `@${newcomer.handle} just arrived. Pick ${count} different people from the roster whose lives overlap most with theirs and write ${count} moments, one with each. The first is posted by that person (a photo with the newcomer); the rest are posted by the newcomer. Then a 2-frame story by @${newcomer.handle}.`,
      newcomer: brief(newcomer),
      roster: roster.map(brief),
    }),
  });
  return output;
}

/** A Double reacts to a post in their own voice (used when someone nudges their Double). */
export async function writeComment(me: Double, post: { author: string; caption: string; comments: { author: string; text: string }[] }, nudge: string) {
  const { text } = await generateText({
    model: FAST_MODEL,
    system: `You are @${me.handle}'s Double on DOUBLE, a social app. Write one comment as they would: casual, short (max 80 chars), English, no hashtags. About them: ${me.bio}. ${me.lifeInWorld}. Output only the comment text.`,
    prompt: `Post by @${post.author}: "${post.caption}"\nComments so far: ${post.comments.map((c) => `@${c.author}: ${c.text}`).join(" | ")}\nWhat ${me.name} wants to say (rewrite it in their voice): ${nudge}`,
  });
  return text.trim().replace(/^"|"$/g, "").slice(0, 160);
}

/* ---------------------------------------------------------------------------
 * 3. Scenes: photoreal, with each person's real face (two reference photos each).
 * ------------------------------------------------------------------------- */

const LOOK =
  "Photorealistic candid smartphone photo, real skin texture, natural light, looks like a genuine Instagram post. Every named person has exactly the same face as in their reference photos. Correct hands with five fingers. No text overlays, no watermarks, no brand logos.";

export async function renderScene(people: Double[], scene: string, place: string | null, size: "1024x1280" | "1024x1536") {
  const refs = await Promise.all(people.flatMap((p) => p.refs.slice(0, 2).map((u) => fetchBytes(u))));
  let n = 0;
  const legend = people
    .map((p) => {
      const from = n + 1;
      n += Math.min(2, p.refs.length);
      const back = p.faceShown ? "" : " (always shown from behind or in side profile)";
      return `@${p.handle} is the ${p.who}${back}, reference photos ${from}-${n}`;
    })
    .join("; ");
  const { image } = await generateImage({
    model: gateway.imageModel(IMAGE_MODEL),
    prompt: { images: refs, text: `${legend}. ${scene}${place ? ` Location: ${place}.` : ""} ${LOOK}` },
    size,
    maxRetries: 1,
    abortSignal: AbortSignal.timeout(240_000),
  });
  const jpg = await sharp(Buffer.from(image.uint8Array)).resize({ width: 1080, withoutEnlargement: true }).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
  return putFile(`world/media/${people.map((p) => p.handle).join("+")}.jpg`, jpg, "image/jpeg");
}

/* ---------------------------------------------------------------------------
 * 4. Motion: every moment becomes a 5s clip. Wan first (best identity in our bench);
 *    it refuses some famous faces, Kling picks those up.
 * ------------------------------------------------------------------------- */

const MOTION =
  "Locked-off static camera, no zoom, no pan. The people in the photo come alive for a few seconds: small natural smiles, a blink, a slight head turn, breathing; hair and clothes shift slightly; gentle ambient motion in the background. Photoreal. Keep every face, hand, outfit and object exactly as in the photo; nobody new enters the frame; no text, no captions, no logos.";

export async function animate(postId: string, imageUrl: string) {
  const image = await fetchBytes(imageUrl);
  for (const model of [VIDEO_MODEL, VIDEO_FALLBACK]) {
    try {
      const { video } = await generateVideo({
        model: gateway.videoModel(model),
        prompt: { image, text: MOTION },
        duration: 5,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(300_000),
      });
      return await saveVideo(postId, video.uint8Array);
    } catch (e) {
      console.error(`[animate] ${postId} via ${model}:`, e instanceof Error ? e.message.slice(0, 160) : e);
    }
  }
  return null;
}
