import { list } from "@vercel/blob";

export const dynamic = "force-dynamic";

/** Stable demo link: always redirects to the newest uploaded demo video. */
export async function GET() {
  const { blobs } = await list({ prefix: "demo/" });
  const latest = blobs
    .filter((b) => b.pathname.endsWith(".mp4"))
    .sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt))[0];
  if (!latest) return new Response("Demo not found", { status: 404 });
  return new Response(null, { status: 302, headers: { Location: latest.url, "Cache-Control": "no-store" } });
}
