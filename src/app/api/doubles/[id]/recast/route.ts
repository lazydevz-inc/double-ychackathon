import { castPersona } from "@/lib/persona";
import { loadDouble, saveDouble } from "@/lib/store";
import { streamJob } from "@/lib/stream";

export const maxDuration = 300;

/** Re-run casting on an existing Double's photos (after prompt/model upgrades). Dev-only. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV === "production" && req.headers.get("x-admin") !== process.env.DOUBLE_ADMIN_KEY) {
    return new Response("forbidden", { status: 403 });
  }
  const { id } = await params;
  const { bio } = (await req.json().catch(() => ({}))) as { bio?: string };
  return streamJob(async (emit) => {
    const d = await loadDouble(id);
    if (!d) throw new Error("not found");
    emit({ type: "stage", stage: "persona" });
    const persona = await castPersona({ handle: d.handle, name: d.name, bio, lang: d.lang, photos: d.photos, captions: d.captions });
    await saveDouble({ ...d, persona, portrait: d.photos[persona.hero] });
    return id;
  });
}
