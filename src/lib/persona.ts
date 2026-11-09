import { generateText, Output } from "ai";
import { z } from "zod";
import { FAST, PERSONA_MODEL } from "./config";
import type { Lang, Persona } from "./types";

const personaSchema = z.object({
  archetype: z
    .string()
    .describe('Reality-show cast archetype in caps, 2-4 words, starting with "THE", e.g. "THE UNTOUCHABLE ICON"'),
  tagline: z.string().describe("One punchy line under the archetype, max 90 chars"),
  traits: z.array(z.string()).length(3).describe("Three 1-2 word trait tags"),
  showIntro: z
    .string()
    .describe("Narrator line introducing them in the cold open of their first episode, max 140 chars, in quotes-ready form"),
  roast: z
    .string()
    .describe("The affectionate roast line people screenshot. Exaggerated self-image, never mean about body/looks. Max 80 chars"),
  receipts: z
    .array(
      z.object({
        photo: z.number().int().describe("0-based index of the photo this receipt is about"),
        note: z.string().describe("Concrete evidence from that post + punchline verdict, max 100 chars. No 'Exhibit' prefix."),
      }),
    )
    .min(3)
    .max(4),
  desire: z.string().describe("What their Double wants most in the stories it lives, max 80 chars"),
  flaw: z.string().describe("A fictional, playful flaw that will cause drama, max 80 chars"),
  voice: z.string().describe("How the Double talks: speech quirks, max 100 chars"),
  confessional: z.string().describe("Their first confessional-booth quote, in their voice, max 120 chars"),
  palette: z.array(z.string()).min(2).max(3).describe("2-3 hex colors that dominate the feed, like #1a1a1a"),
  look: z.string().describe("Neutral visual description of the person (hair, styling, vibe), max 140 chars. No names."),
  hero: z
    .number()
    .int()
    .describe(
      "0-based index of their cast photo, which will also be animated into video: the photo where the person's FACE IS LARGEST in the frame (close-up or half-body beats full-body), alone or clearly dominant, face unobstructed and in focus, looking roughly toward the camera, flattering. Never a full-body long shot if a closer one exists; never a product shot, text graphic or group photo.",
    ),
});

const SYSTEM = `You are the casting director of DOUBLE, a social app where people's AI Doubles (built from their real Instagram) live out short stories with the people they follow.
You receive someone's Instagram posts. Cast them as a reality-show character inspired by their SOCIAL PERSONA.

Rules:
- Ground everything in what is actually visible in the posts and what the captions say (styling, settings, poses, brands, collaborators, recurring patterns). Point at specific posts in receipts.
- If this is a public figure, still only use what is in these posts; never reference rumors, private life or anything outside the feed.
- Exaggerate the persona for comedy and drama, like a reality-show edit. The first reaction should be "lol how did it know".
- Affectionate, never cruel. No jokes about body, weight, race, age or attractiveness. No real-life claims (job, relationships, wealth) that the posts don't show.
- This is a fictional character "inspired by" the feed, not a factual profile.
- Archetype must feel like a show lower-third: iconic, specific, quotable. Avoid generic words like "explorer", "adventurer", "foodie".
- Do NOT paraphrase their bio. Find the pattern they didn't notice about themselves (same pose in every photo, always mid-sentence, the bag that appears in 3 posts, never smiling, always the same angle). That is what makes people share it.
- Receipts are courtroom exhibits with a punchline: name the concrete visual evidence, then the verdict. Each receipt points at a different post.
- The roast is one line a best friend would comment under the post. Specific beats clever.
- showIntro is how a reality-show narrator introduces them in the cold open; don't repeat the archetype words.`;

export async function castPersona(input: {
  handle: string;
  name: string;
  bio?: string;
  lang: Lang;
  photos: string[];
  captions?: string[];
}): Promise<Persona> {
  const langLine =
    input.lang === "ko"
      ? "Write all text fields in natural, witty Korean (Korean internet tone, 반말 OK), except archetype which stays in English caps."
      : "Write all text fields in English.";
  const { output } = await generateText({
    model: PERSONA_MODEL,
    system: SYSTEM,
    output: Output.object({ schema: personaSchema }),
    providerOptions: FAST,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Instagram: @${input.handle} (${input.name})${input.bio ? `\nBio / captions they shared: ${input.bio}` : ""}\n${input.photos.length} posts follow, numbered from 0.\n${langLine}`,
          },
          ...input.photos.flatMap((url, i) => [
            {
              type: "text" as const,
              text: `Post ${i}:${input.captions?.[i] ? ` caption: "${input.captions[i].slice(0, 220)}"` : ""}`,
            },
            { type: "file" as const, data: new URL(url), mediaType: "image" },
          ]),
        ],
      },
    ],
  });
  output.receipts = output.receipts.filter((r) => r.photo >= 0 && r.photo < input.photos.length);
  output.hero = Number.isInteger(output.hero) && output.hero >= 0 && output.hero < input.photos.length ? output.hero : 0;
  return output;
}
