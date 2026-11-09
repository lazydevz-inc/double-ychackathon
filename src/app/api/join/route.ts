import { after } from "next/server";
import { cookies } from "next/headers";
import { runJoin } from "@/lib/join";
import { HANDLE, loadDouble, loadJoin, saveJoin } from "@/lib/store";

export const maxDuration = 800;

export async function POST(req: Request) {
  const { handle: raw } = (await req.json().catch(() => ({}))) as { handle?: string };
  const handle = (raw ?? "").replace(/^@/, "").trim().toLowerCase();
  if (!HANDLE.test(handle)) return Response.json({ error: "That doesn't look like an Instagram handle" }, { status: 400 });

  (await cookies()).set("me", handle, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  if (await loadDouble(handle)) return Response.json({ handle, exists: true });

  const status = await loadJoin(handle);
  const running = status && status.step !== "error" && status.step !== "done" && Date.now() - status.at < 6 * 60_000;
  if (!running) {
    await saveJoin({ handle, step: "queued", at: Date.now() });
    after(() => runJoin(handle));
  }
  return Response.json({ handle });
}
