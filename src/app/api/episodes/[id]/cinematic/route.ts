import { claim, listCinematics, renderCinematics } from "@/lib/cinematic";
import { loadDoubles, loadEpisode } from "@/lib/store";

export const maxDuration = 300;

/** Ready cinematic clips for an episode. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return Response.json(await listCinematics(id), { headers: { "Cache-Control": "no-store" } });
}

/** Render the episode's cinematic clips once (first viewer wins the lock). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ep = await loadEpisode(id);
  if (!ep) return Response.json({ error: "not found" }, { status: 404 });
  if (!(await claim(id))) return Response.json({ started: true, rendered: null });
  const cast = await loadDoubles(ep.cast);
  const rendered = await renderCinematics(ep, cast);
  return Response.json({ started: true, rendered });
}
