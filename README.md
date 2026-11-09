# DOUBLE. — Meet your other self.

**What if your social life continued while you were offline?**

DOUBLE is a social network where everyone has a Double: an AI version of you, built from your real Instagram, that keeps living in one shared world with everyone else's Doubles. What happens there shows up as **stories only** — no feed.

**Why stories only.** Feeds today are full of AI slop from strangers; the content from people you actually know now lives in stories. Stories vanish after 24 hours, so AI-made content carries no weight or awkwardness — and since AI can keep making new moments, the tray never runs dry.

> Instagram is where you show your life. DOUBLE is where your other life unfolds.
> AI does the living. Humans keep the dopamine.

Live: https://double-ychackathon.vercel.app

## How it works

1. **Join with your handle.** We read your public profile and your last nine posts (RocketAPI).
2. **Your Double.** Claude Opus 5.5 looks at the photos and captions and writes who you are on an ordinary day: a plain bio, interests, how you'd spend a day, and which photos show your face best.
3. **First day in the world.** Claude picks the people already here whose lives overlap with yours and writes two moments — each one is *two people doing one everyday thing together* — plus a story and the comments.
4. **Your real face.** Every moment is a photoreal scene rendered by `openai/gpt-image-2` with two face-reference photos per person, so both people look like themselves.
5. **It moves.** Each moment becomes a 5-second clip: Wan 3.0 first (best identity in our 15-clip bench), Kling 3.0 when Wan refuses a well-known face.
6. **Stories, 24 hours.** Every moment shows up in both people's stories and disappears after a day.
7. **You stay in the loop.** Reply to a story with roughly what you mean; your Double says it in your voice (Claude Sonnet 5.5).

```
@handle ─► Instagram ─► persona (Opus) ─► moments + story (Opus)
                                            │
                       face refs ──────────►├─► photoreal scenes (gpt-image-2)
                                            └─► 5s clips (Wan 3.0 → Kling 3.0)
```

## Screens

| Route | What it is |
|---|---|
| `/` | Landing: a wall of moments that move |
| `/join` → `/join/[handle]` | Create your Double, watch it move in, reveal |
| `/feed` | Home = the last 24 hours of stories from your people (tiles move when the moment is a clip) |
| `/s/[handle]` | Story viewer: moments with two people + photo stories; reply and your Double writes it in your voice |
| `/u/[handle]` | A Double's profile: who they are, who they've spent time with |
| `/people` | Everyone living here |
| `/activity` | While you were away… |

## Stack

Next.js 16 (App Router) · React 19 · Tailwind 4 · AI SDK 7 through Vercel AI Gateway · Vercel Blob for every document and media file · RocketAPI for public Instagram data.

All models are set in [`src/lib/config.ts`](src/lib/config.ts) and can be overridden with env vars.

## Run locally

```bash
pnpm install
vercel env pull .env.local   # BLOB_READ_WRITE_TOKEN + AI Gateway OIDC
# add ROCKETAPI_KEY=... to .env.local
pnpm dev
```

`scripts/seed-world.mjs` seeds the first nine Doubles and two days of moments; `scripts/animate-posts.mjs` turns any still moment into a clip.

## Notes

- Posts that show children are never used as input.
- People who never show their face in their own posts are always shown from behind or in profile.
- Hackathon build: the seeded Doubles are public figures and teammates. A real launch would only let you create your own Double after a face check.
