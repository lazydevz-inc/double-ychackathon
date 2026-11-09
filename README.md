# DOUBLE

> Meet your other self. *What if your social life continued while you were offline?*

DOUBLE turns your real Instagram into an AI **Double** that lives in an AI world with the Doubles of the people you follow. What happens there shows up as normal-looking feed posts, stories and notifications. You don't post anything; you come back and see what happened.

Investor line: *Instagram is where you show your life. DOUBLE is where your other life unfolds.* — *AI does the living. Humans keep the dopamine.*

## Links

| What | Where |
| --- | --- |
| Live app | https://double-ychackathon.vercel.app |
| Design canvas (UI 시안) | https://claude.ai/artifact/6e3FoywbRuFYt2e2AJCLJp (private: share from the page's Share menu) |
| Video model bench | https://claude.ai/artifact/JmP4e5UZawjHh6eqPf7suk (private) |
| Vercel project | `lazydevz/double-ychackathon` |

## Run locally

```bash
pnpm install
vercel link --scope lazydevz --project double-ychackathon
vercel env pull .env.local   # Blob token + Vercel OIDC for AI Gateway
pnpm dev
```

Add `ROCKETAPI_KEY=...` to `.env.local` yourself (Instagram data, paid plan). Never commit `.env*`.

## How it works

1. **Instagram** (`src/lib/instagram.ts`): RocketAPI, 2 calls per handle → recent posts, captions, reels. Copied to Vercel Blob because IG CDN links expire.
2. **Persona** (`src/lib/persona.ts`): Claude Opus reads the posts and finds the pattern people never noticed (archetype, roast, receipts that point at real posts).
3. **Story engine** (`src/lib/engine.ts`): Director picks one scenario from a catalog that fits the real posts (road trip, pop-up, film shoot, blind date, whodunit…) → each Double picks a move → deterministic engine updates state → editor cuts scenes. The LLM never mutates state directly.
4. **Visuals**: real posts and reels only for real-face Doubles; AI video (`src/lib/cinematic.ts`, Wan 3.0 with Kling 3.0 fallback) only animates a large-face hero photo with a locked camera. Picked from a 15-clip bench.
5. **Identity** (`src/lib/identity.ts`, work in progress): real face with a selfie check → Verified badge, or Avatar (drawn from a text description of the feed's style; the face is never sent to the image model).

Storage is Vercel Blob only: Doubles are versioned docs (`doubles/{id}/doc-{ts}.json`, newest wins) because public blobs are CDN-cached for a long time; episodes are write-once.

## Models (Vercel AI Gateway, team lazydevz)

| Job | Model |
| --- | --- |
| Persona | `anthropic/claude-opus-5.5` |
| Story engine | `anthropic/claude-sonnet-5.5` |
| AI video | `alibaba/wan-v3.0-video` → fallback `klingai/kling-v3.0-i2v` |
| Avatar images | `openai/gpt-image-2` |
| Selfie check | `google/gemini-3.5-flash` + `openai/gpt-5.5` (both must agree) |

All overridable with `DOUBLE_*_MODEL` env vars (`src/lib/config.ts`).

## Hackathon caveats

- The house cast uses real idols' public posts for the demo only. Launch requires the person's own verification or a license.
- The selfie check is a PoC, not a certified identity system.
