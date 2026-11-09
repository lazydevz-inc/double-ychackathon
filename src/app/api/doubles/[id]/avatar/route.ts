import { makeAvatar } from "@/lib/avatar";
import { loadDouble, saveDouble } from "@/lib/store";
import { streamJob } from "@/lib/stream";
import type { AvatarStyle } from "@/lib/types";

export const maxDuration = 300;

/** Switch an existing Double to avatar mode (or redraw it in another style). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { style } = (await req.json().catch(() => ({}))) as { style?: AvatarStyle };
  return streamJob(async (emit) => {
    const d = await loadDouble(id);
    if (!d) throw new Error("not found");
    emit({ type: "stage", stage: "avatar", detail: "Drawing your avatar (your face is never used)" });
    const s: AvatarStyle = style === "3d" ? "3d" : "illustration";
    const images = await makeAvatar(d.id, d.persona, s);
    await saveDouble({ ...d, identity: "avatar", avatar: { style: s, images }, faceVerified: undefined });
    return id;
  });
}
