import { generateText, generateImage, gateway, Output } from 'ai';
import { z } from 'zod';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const DIR = process.argv[2];
const PEOPLE = [
  { handle: 'zuck', exclude: [0] },
  { handle: 'sang_rhee', exclude: [0, 1] },
  { handle: 'rubychoux', exclude: [] },
  { handle: 'thisisbillgates', exclude: [] },
];
const persona = z.object({
  knownAs: z.string().describe('What this Double is known as in the world, caps, 2-5 words, e.g. "THE BRISKET PHILOSOPHER"'),
  worldBio: z.string().describe('The Double\'s bio on its in-world profile, max 90 chars, witty'),
  traits: z.array(z.string()).length(3),
  lifeInWorld: z.string().describe('What this Double does most days in the AI world, inspired by the real feed, max 160 chars'),
  quirk: z.string().describe('A recurring habit others in the world tease them about, max 100 chars'),
  receipts: z.array(z.object({ post: z.number().int(), note: z.string().describe('Pattern noticed in that real post + punchline, max 100 chars') })).min(2).max(3),
  look: z.string().describe('ONE outfit for their avatar: hair, clothing pieces, colors, one accessory. No facial features beyond hair. Max 140 chars'),
});
const STYLE3D = 'Stylized 3D character in a premium life-simulation game world: slightly stylized proportions, soft clay-like skin, crisp fabric, cinematic warm lighting, rich miniature-world detail, shallow depth of field. Clearly a game character, not a photo of a real person. No text, no logos, no watermark.';

const imgPart = (p) => ({ type: 'file', data: readFileSync(p), mediaType: 'image/jpeg' });
async function makePersona(p) {
  const meta = JSON.parse(readFileSync(`${DIR}/ig/${p.handle}.json`, 'utf8'));
  const idx = [...Array(9).keys()].filter((i) => !p.exclude.includes(i) && existsSync(`${DIR}/ig/${p.handle}-${i}.jpg`));
  const { output } = await generateText({
    model: 'anthropic/claude-opus-5.5',
    system: `You create someone's AI Double for DOUBLE: an AI world where everyone's Double lives a parallel life, and what happens there shows up as normal-looking social posts and stories. Build the Double from what is visible in their real posts and captions: exaggerate patterns playfully (affectionate, never cruel; no jokes about body/age/race). Never reference children or family members, even if they appear. No real-life claims beyond the posts. Write in English.`,
    output: Output.object({ schema: persona }),
    messages: [{ role: 'user', content: [{ type: 'text', text: `@${p.handle} (${meta.name}). Bio: ${meta.bio}` }, ...idx.flatMap((i) => [{ type: 'text', text: `Post ${i} caption: ${(meta.posts[i]?.caption ?? '').slice(0, 200)}` }, imgPart(`${DIR}/ig/${p.handle}-${i}.jpg`)])] }],
  });
  return { handle: p.handle, name: meta.name, followers: meta.followers, used: idx, ...output };
}

const t0 = Date.now();
const personas = await Promise.all(PEOPLE.map(makePersona));
writeFileSync(`${DIR}/personas.json`, JSON.stringify(personas, null, 1));
console.log('personas', ((Date.now() - t0) / 1000).toFixed(0), 's', personas.map((x) => `${x.handle}: ${x.knownAs}`).join(' | '));

// avatars (text-only, no face reference)
const avatars = {};
await Promise.all(personas.map(async (x) => {
  const t = Date.now();
  const { image } = await generateImage({ model: gateway.imageModel('openai/gpt-image-2'), prompt: `A single full-body character, alone and centered, relaxed standing pose: ${x.look}. Personality: ${x.traits.join(', ')}. Give the character an original face that does not resemble any real person. Plain soft studio backdrop. ${STYLE3D}`, size: '1024x1536' });
  writeFileSync(`${DIR}/avatar-${x.handle}.png`, image.uint8Array); avatars[x.handle] = image.uint8Array;
  console.log('avatar', x.handle, ((Date.now() - t) / 1000).toFixed(0), 's');
}));

// a day in the world
const post = z.object({
  author: z.string().describe('handle'),
  with: z.array(z.string()).describe('other handles in the scene (0-2)'),
  place: z.string().describe('In-world location tag, e.g. "Brisket Hill Night Market"'),
  scene: z.string().describe('What the image shows: who is where doing what, camera framing. Concrete and visual, max 220 chars'),
  caption: z.string().describe('Caption in the author Double\'s voice, max 140 chars'),
  comments: z.array(z.object({ author: z.string(), text: z.string().describe('max 90 chars') })).min(2).max(3),
  inspiredBy: z.string().describe('Which real post(s) sparked this, e.g. "@zuck post 2 (smoking meats) + @rubychoux post 3 (mochi)"'),
});
const day = z.object({
  worldName: z.string().describe('A short name for the AI world, 1-2 words'),
  posts: z.array(post).length(5),
  story: z.object({ author: z.string(), frames: z.array(z.object({ scene: z.string(), overlay: z.string().describe('big story text, max 40 chars'), sticker: z.string().describe('a poll/question/emoji-free sticker text, max 30 chars') })).length(3), inspiredBy: z.string() }),
  notifications: z.array(z.string().describe('Push notification for @sang_rhee about what his Double did or what happened to it, max 90 chars')).length(4),
});
const t1 = Date.now();
const { output: world } = await generateText({
  model: 'anthropic/claude-opus-5.5',
  system: `You write one day in DOUBLE, an AI world where people's Doubles live parallel lives. The day is shown as normal social content: feed posts with comments, one story, and push notifications. It is NOT a reality show: no casting, no contestants, no votes, no eliminations. It is everyday life in a playful world: side projects, food, sports, launches, collabs, mix-ups, small rivalries, sweet moments.
Rules: every post must be sparked by real posts of the people involved (say which). Mix the four Doubles across posts so their worlds collide (at least 3 posts with 2+ people). Each Double sounds like its persona. Never mention children or family members. Keep it light and affectionate; nothing political, nothing about health or money controversies. English.`,
  output: Output.object({ schema: day }),
  prompt: JSON.stringify(personas, null, 1),
});
writeFileSync(`${DIR}/day.json`, JSON.stringify(world, null, 1));
console.log('day', ((Date.now() - t1) / 1000).toFixed(0), 's', world.worldName);

// scene images with avatar references
const scenes = [...world.posts.map((p, i) => ({ key: `post-${i}`, who: [p.author, ...p.with], scene: `${p.scene} Location: ${p.place}.`, size: '1024x1280' })), ...world.story.frames.map((f, i) => ({ key: `story-${i}`, who: [world.story.author], scene: f.scene, size: '1024x1536' }))];
await Promise.all(scenes.map(async (s) => {
  const t = Date.now();
  const refs = s.who.map((h) => avatars[h.replace('@', '')]).filter(Boolean);
  try {
    const { image } = await generateImage({ model: gateway.imageModel('openai/gpt-image-2'), prompt: { images: refs, text: `A candid social-media photo taken inside the AI world. ${s.scene} The characters are exactly the ones in the reference images (same faces, hair and outfits); everyone else in the background is a generic stylized character. ${STYLE3D}` }, size: s.size });
    writeFileSync(`${DIR}/${s.key}.png`, image.uint8Array);
    console.log('scene', s.key, ((Date.now() - t) / 1000).toFixed(0), 's');
  } catch (e) { console.log('scene FAIL', s.key, e.message?.slice(0, 120)); }
}));
console.log('total', ((Date.now() - t0) / 1000).toFixed(0), 's');
