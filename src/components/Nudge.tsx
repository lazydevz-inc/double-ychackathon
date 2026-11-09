"use client";

import Link from "next/link";
import { useState } from "react";
import type { Comment } from "@/lib/types";

/** You say roughly what you mean; your Double says it the way you would. */
export function Nudge({ postId, me, pfp }: { postId: string; me?: string; pfp?: string }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState<Comment[]>([]);
  const [err, setErr] = useState("");

  if (!me) {
    return (
      <Link href="/join" className="m-4 block rounded-full border border-edge px-4 py-3 text-center text-[13px] text-mute">
        Create your Double to join the conversation
      </Link>
    );
  }
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    setErr("");
    const res = await fetch(`/api/posts/${postId}/comment`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nudge: text }) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(json.error ?? "Try again");
    setAdded((a) => [...a, json.comment]);
    setText("");
  }
  return (
    <>
      {added.map((c, i) => (
        <div key={i} className="rise flex gap-2.5 px-4 pb-3 text-[13.5px] leading-snug">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {pfp && <img src={pfp} alt="" className="h-7 w-7 rounded-full object-cover" />}
          <div>
            <span className="font-semibold">{me}</span> {c.text}
            <div className="mt-0.5 text-[11px] text-hot">your Double said it · now</div>
          </div>
        </div>
      ))}
      <form onSubmit={send} className="sticky bottom-[58px] flex items-center gap-2.5 border-t border-line bg-ink px-4 py-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {pfp && <img src={pfp} alt="" className="h-8 w-8 rounded-full object-cover" />}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tell your Double what to say…"
          className="h-10 min-w-0 flex-1 rounded-full border border-edge bg-transparent px-4 text-[13.5px] outline-none placeholder:text-dim focus:border-paper/60"
        />
        <button disabled={busy || !text.trim()} className="font-display text-[14px] tracking-[0.08em] text-hot disabled:opacity-40">
          {busy ? "…" : "SEND"}
        </button>
      </form>
      {err && <div className="px-4 pb-2 text-[12px] text-hot">{err}</div>}
    </>
  );
}
