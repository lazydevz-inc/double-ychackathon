import type { Progress } from "./types";

/** Run a long job and stream NDJSON progress lines to the client. */
export function streamJob(job: (emit: (p: Progress) => void) => Promise<string>) {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      const emit = (p: Progress) => controller.enqueue(encoder.encode(JSON.stringify(p) + "\n"));
      try {
        const id = await job(emit);
        emit({ type: "done", id });
      } catch (e) {
        console.error(e);
        emit({ type: "error", message: e instanceof Error ? e.message : String(e) });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(body, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });
}
