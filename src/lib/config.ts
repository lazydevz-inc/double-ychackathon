// Model IDs (Vercel AI Gateway). Override per environment without code changes.
// Persona + day writing decide the feel of the feed -> strongest model.
export const WRITER_MODEL = process.env.DOUBLE_WRITER_MODEL ?? "anthropic/claude-opus-5.5";
// Short rewrites (a comment in your Double's voice) -> fast model.
export const FAST_MODEL = process.env.DOUBLE_FAST_MODEL ?? "anthropic/claude-sonnet-5.5";
// Real-likeness scenes: two face references per person. Beat gemini-3-pro-image and
// gemini-3.1-flash-image on likeness and hands in a side-by-side test.
export const IMAGE_MODEL = process.env.DOUBLE_IMAGE_MODEL ?? "openai/gpt-image-2";
// Picked from a 15-clip bench on real photos (best face identity in close-ups, correct hands).
export const VIDEO_MODEL = process.env.DOUBLE_VIDEO_MODEL ?? "alibaba/wan-v3.0-video";
// Used when the primary refuses a photo (its real-face filter trips on some images).
export const VIDEO_FALLBACK = process.env.DOUBLE_VIDEO_FALLBACK ?? "klingai/kling-v3.0-i2v";

export const MAX_PHOTOS = 9;
