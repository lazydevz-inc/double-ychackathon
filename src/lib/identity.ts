import type { Double } from "./types";

/*
 * Identity rules (see design I1–I4):
 * - Real face is shown for real-mode Doubles; the Verified badge only after the owner's selfie check.
 * - Avatar mode never exposes the real photos or reels anywhere public.
 * - AI video only animates verified faces or avatars. The hackathon house cast is a demo exception.
 */
export const isAvatar = (d: Double) => d.identity === "avatar" && !!d.avatar?.images.length;
export const isVerified = (d: Double) => !isAvatar(d) && !!d.faceVerified;
export const canAnimate = (d: Double) => isAvatar(d) || isVerified(d) || !!d.house;

export type Badge = "verified" | "avatar" | null;
export const badgeOf = (d: Double): Badge => (isAvatar(d) ? "avatar" : isVerified(d) ? "verified" : null);

/** Everything a viewer is allowed to see of this Double. */
export function visuals(d: Double) {
  if (isAvatar(d)) return { hero: d.avatar!.images[0], photos: d.avatar!.images, clips: [] as string[] };
  const hero = d.portrait ?? d.photos[d.persona.hero ?? 0] ?? d.photos[0];
  return { hero, photos: d.photos, clips: d.clips ?? [] };
}
