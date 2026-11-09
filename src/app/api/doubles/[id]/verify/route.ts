import { generateText, Output } from "ai";
import { z } from "zod";
import { VERIFY_MODELS } from "@/lib/config";
import { isAvatar } from "@/lib/identity";
import { fetchBytes, loadDouble, saveDouble } from "@/lib/store";

export const maxDuration = 60;

const schema = z.object({
  samePerson: z.boolean(),
  live: z.boolean(),
  confidence: z.number().describe("0-1 confidence that the selfies show the account's person"),
  note: z.string().describe("One short sentence for the user, no names"),
});

const SYSTEM = `You are an account-ownership check for a social app. The account owner took live selfie frames to prove the account's photos are of them.
Compare the face in the SELFIE frames with the face in the ACCOUNT photos. Do not identify or name anyone; only judge (1) whether the selfies show the same individual as the account photos and (2) whether the selfies look like live captures of one person from slightly different head angles, not photos of a screen or the same picture repeated.`;

/**
 * Selfie check (hackathon PoC, not a certified biometric system). Frames are judged in memory and
 * never stored. Passes only if both models agree the selfies are live and show the account's person.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { frames } = (await req.json()) as { frames?: string[] };
  if (!frames || frames.length < 3) return Response.json({ error: "Need 3 selfie frames" }, { status: 400 });
  const d = await loadDouble(id);
  if (!d) return Response.json({ error: "not found" }, { status: 404 });
  if (isAvatar(d)) return Response.json({ error: "Avatar Doubles don't use a face" }, { status: 400 });

  const heroIdx = d.persona.hero ?? 0;
  const faceIdx = [heroIdx, ...d.persona.receipts.map((r) => r.photo)].filter((v, i, a) => a.indexOf(v) === i).slice(0, 3);
  const account = await Promise.all(faceIdx.map(async (i) => ({ type: "file" as const, data: await fetchBytes(d.photos[i]), mediaType: "image/jpeg" })));
  const selfies = frames.slice(0, 3).map((f) => ({ type: "file" as const, data: f.replace(/^data:image\/\w+;base64,/, ""), mediaType: "image/jpeg" }));

  const verdicts = await Promise.all(
    VERIFY_MODELS.map(async (model) => {
      try {
        const { output } = await generateText({
          model,
          system: SYSTEM,
          output: Output.object({ schema }),
          messages: [{ role: "user", content: [{ type: "text", text: "ACCOUNT photos:" }, ...account, { type: "text", text: "SELFIE frames (front, left, right):" }, ...selfies] }],
        });
        return output;
      } catch (e) {
        console.error("verify model failed", model, e);
        return null;
      }
    }),
  );
  const ok = verdicts.every((v) => v && v.samePerson && v.live);
  const confidence = verdicts.reduce((a, v) => a + (v?.confidence ?? 0), 0) / verdicts.length;
  const verified = ok && confidence >= 0.7;
  if (verified) await saveDouble({ ...d, identity: "real", faceVerified: { at: Date.now(), confidence } });
  const note = verified
    ? "Verified. Your Double now carries the blue check."
    : (verdicts.find((v) => v && !(v.samePerson && v.live))?.note ?? "We couldn't confirm it's you. Try again in good light, facing the camera.");
  return Response.json({ verified, confidence: Number(confidence.toFixed(2)), note });
}
