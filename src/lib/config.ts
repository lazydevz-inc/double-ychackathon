// Model IDs (Vercel AI Gateway). Override per environment without code changes.
// Persona = one call that decides the first impression -> strongest model.
// Story engine = several calls per episode -> fast model.
// No image-generation model: every visual is a real post (or a video made from one).
export const TEXT_MODEL = process.env.DOUBLE_TEXT_MODEL ?? "anthropic/claude-sonnet-5.5";
export const PERSONA_MODEL = process.env.DOUBLE_PERSONA_MODEL ?? "anthropic/claude-opus-5.5";
// Picked from a 15-clip bench on real posts (best face identity in close-ups, correct hands).
// Fast fallback with good continuity: "minimax/minimax-h3-max" (~20s vs ~2min).
export const VIDEO_MODEL = process.env.DOUBLE_VIDEO_MODEL ?? "alibaba/wan-v3.0-video";
// Used when the primary refuses a photo (Wan's real-face filter trips on some posts). #2 in the bench.
export const VIDEO_FALLBACK = process.env.DOUBLE_VIDEO_FALLBACK ?? "klingai/kling-v3.0-i2v";

export const MAX_PHOTOS = 9;

// Avatar mode (no real face): picked from a 4-way style test; gpt-image-2 drew the cleanest hands.
export const AVATAR_MODEL = process.env.DOUBLE_AVATAR_MODEL ?? "openai/gpt-image-2";
// Selfie check: both must agree the selfies are live and show the account's person.
export const VERIFY_MODELS = ["google/gemini-3.5-flash", "openai/gpt-5.5"] as const;

/** Keep reasoning short: these are creative calls where latency matters more than deliberation. */
export const FAST = {
  openai: { reasoningEffort: "low" },
  google: { thinkingConfig: { thinkingLevel: "low" } },
} as const;
