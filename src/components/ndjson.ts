"use client";

import type { Progress } from "@/lib/types";

/** POST to a streaming route and surface progress stages; resolves with the created id. */
export async function postJob(url: string, body: BodyInit, onStage: (detail: string) => void, json = false) {
  const res = await fetch(url, {
    method: "POST",
    body,
    headers: json ? { "Content-Type": "application/json" } : undefined,
  });
  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Request failed (${res.status})`);
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      const p = JSON.parse(line) as Progress;
      if (p.type === "stage") onStage(p.detail ?? p.stage);
      if (p.type === "error") throw new Error(p.message);
      if (p.type === "done") return p.id;
    }
  }
  throw new Error("Stream ended without a result");
}
