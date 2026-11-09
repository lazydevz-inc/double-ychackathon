"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function JoinForm() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const h = handle.replace(/^@/, "").trim().toLowerCase();
    if (!h) return;
    setBusy(true);
    setErr("");
    const res = await fetch("/api/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ handle: h }) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      return setErr(json.error ?? "Something went wrong");
    }
    router.push(json.exists ? "/feed" : `/join/${json.handle}`);
  }
  return (
    <form onSubmit={submit} className="mt-6 space-y-3">
      <label className="flex h-[56px] items-center rounded-full border border-edge bg-card/80 px-5 focus-within:border-paper/70">
        <span className="font-display text-[20px] text-mute">@</span>
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="your instagram"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="ml-1 h-full min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-dim"
        />
      </label>
      <button disabled={busy || !handle.trim()} className="h-[56px] w-full rounded-full bg-hot font-display text-[17px] tracking-[0.08em] text-white disabled:opacity-50">
        {busy ? "ONE SECOND…" : "CREATE MY DOUBLE"}
      </button>
      {err && <p className="text-[13px] text-hot">{err}</p>}
    </form>
  );
}
