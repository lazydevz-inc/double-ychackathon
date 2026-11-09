import { cookies } from "next/headers";
import { writeComment } from "@/lib/ai";
import { loadDouble, loadWorld, saveComment } from "@/lib/store";

export const maxDuration = 60;

/** You nudge, your Double says it in their own voice. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = (await cookies()).get("me")?.value;
  const { nudge } = (await req.json().catch(() => ({}))) as { nudge?: string };
  if (!me || !nudge?.trim()) return Response.json({ error: "Join first" }, { status: 400 });
  const [double, world] = await Promise.all([loadDouble(me), loadWorld()]);
  const post = world.posts.find((p) => p.id === id);
  if (!double || !post) return Response.json({ error: "Not found" }, { status: 404 });
  const text = await writeComment(double, { ...post, comments: [...post.comments, ...(world.extraComments.get(id) ?? [])] }, nudge.slice(0, 300));
  const comment = { author: me, text, at: Date.now() };
  await saveComment(id, comment);
  return Response.json({ comment });
}
