import { generateImage, generateText, gateway } from "ai";
import { AVATAR_MODEL, TEXT_MODEL } from "./config";
import { putImage } from "./store";
import type { AvatarStyle, Persona } from "./types";

/*
 * Avatar mode: the character is drawn from a TEXT description of the feed's style (outfits,
 * colors, vibe) — the real photos are never sent to the image model, so the face can't leak.
 * One base image, then two variants that use the base as reference for consistency.
 */
const STYLE: Record<AvatarStyle, string> = {
  illustration:
    "Editorial gouache and marker fashion illustration on warm off-white paper, confident ink linework, flat color blocks, elongated fashion-sketch proportions, anatomically correct hands with five fingers. Clearly an illustration, not a photo. No text, no signature, no watermark.",
  "3d": "Stylized 3D designer-toy character: slightly larger head, smooth matte skin, glossy hair, crisp fabric materials, soft studio key light, deep charcoal seamless background, fashion-editorial color grade. Clearly a stylized avatar, not a photo. No text.",
};

export async function makeAvatar(id: string, persona: Persona, style: AvatarStyle): Promise<string[]> {
  // The feed description can list several looks ("alternates blue streetwear and all-black"); image
  // models then draw a lookbook with two people. Collapse it to one person, one outfit first.
  const { text: outfit } = await generateText({
    model: TEXT_MODEL,
    prompt: `Rewrite this style description as ONE sentence describing ONE person wearing ONE specific outfit (hair, outfit pieces, colors, accessories, expression). Pick the most characteristic look if several are mentioned. No face details beyond hair and expression, no names.\n\nDescription: ${persona.look}\nPalette: ${persona.palette.join(", ")}`,
  });
  const who = `${outfit.trim()} Personality: ${persona.traits.join(", ")}. Give the character an original face that does not resemble any real person.`;
  const model = gateway.imageModel(AVATAR_MODEL);
  const base = await generateImage({
    model,
    prompt: `A single full-body figure, alone and centered, standing pose that shows this personality. ${who} Only one person in the image: no lineup, no turnaround, no second outfit, no reflections. ${STYLE[style]}`,
    size: "1024x1536",
  });
  const ref = base.image.uint8Array;
  const variants = await Promise.allSettled([
    generateImage({ model, prompt: { images: [ref], text: `Same character, same face, same outfit. Head-and-shoulders confessional close-up, looking straight at the viewer with a knowing smile, plain dark booth background. ${STYLE[style]}` }, size: "1024x1536" }),
    generateImage({ model, prompt: { images: [ref], text: `Same character, same face, same outfit. Waist-up reaction shot, surprised wide eyes, one hand near the mouth. ${STYLE[style]}` }, size: "1024x1536" }),
  ]);
  const imgs = [base.image, ...variants.flatMap((v) => (v.status === "fulfilled" ? [v.value.image] : []))];
  return Promise.all(imgs.map((im, i) => putImage(`doubles/${id}/avatar-${i}.png`, im.uint8Array, im.mediaType ?? "image/png")));
}
