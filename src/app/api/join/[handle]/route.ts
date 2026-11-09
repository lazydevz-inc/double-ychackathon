import { loadDouble, loadJoin } from "@/lib/store";

export async function GET(_: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const [status, double] = await Promise.all([loadJoin(handle), loadDouble(handle)]);
  return Response.json({ status, double }, { headers: { "Cache-Control": "no-store" } });
}
