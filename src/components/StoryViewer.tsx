"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Item } from "@/lib/stories";

type Person = { handle: string; name: string; pfp?: string };

export function StoryViewer({ owner, items, people, next, me, start = 0, ages }: { owner: Person; items: Item[]; people: Record<string, Person>; next: string; me?: string; start?: number; ages: string[] }) {
  const router = useRouter();
  const [i, setI] = useState(start);
  const [paused, setPaused] = useState(false);
  const [reply, setReply] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const it = items[i];
  const ms = it.kind === "moment" ? 7000 : 5000;
  const go = (d: number) => {
    const n = i + d;
    if (n < 0) return;
    setSent(null);
    if (n >= items.length) router.push(next);
    else setI(n);
  };
  const goRef = useRef(go);
  useEffect(() => {
    goRef.current = go;
  });
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => goRef.current(1), ms);
    return () => clearTimeout(t);
  }, [i, paused, ms]);

  const who = (h?: string) => (h ? (h === me ? "you" : (people[h]?.name.split(" ")[0] ?? h)) : "");
  const other = it.kind === "moment" ? (it.author === owner.handle ? it.with : it.author) : undefined;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim() || !it.postId || busy) return;
    setBusy(true);
    const res = await fetch(`/api/posts/${it.postId}/comment`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nudge: reply }) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    setPaused(false);
    setReply("");
    setSent(res.ok ? json.comment.text : (json.error ?? "Try again"));
  }

  return (
    <div className="grain relative h-dvh w-full overflow-hidden bg-black sm:mx-auto sm:max-w-[440px]">
      {/* blurred fill, like a post shared to a story */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img key={`bg${it.id}`} src={it.image} alt="" className="absolute inset-0 h-full w-full scale-125 object-cover blur-2xl brightness-50" />
      {it.kind === "frame" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={it.id} src={it.image} alt="" className="kenburns absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div key={it.id} className="rise absolute inset-x-0 top-[13%] aspect-[4/5] overflow-hidden">
          {it.video ? (
            <video src={it.video} poster={it.image} autoPlay muted loop playsInline className="h-full w-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={it.image} alt="" className="kenburns h-full w-full object-cover" />
          )}
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0)_14%,rgba(0,0,0,0)_62%,rgba(0,0,0,0.8)_100%)]" />

      <div className="absolute inset-x-2.5 top-2.5 z-10 flex flex-col gap-2.5">
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
          {items.map((_, k) => (
            <div key={k} className="h-[3px] overflow-hidden rounded bg-white/35">
              {k < i && <div className="h-full w-full bg-white" />}
              {k === i && <div key={`f${i}${paused}`} className="fill h-full bg-white" style={{ animationDuration: `${ms}ms`, animationPlayState: paused ? "paused" : "running" }} />}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {owner.pfp && <img src={owner.pfp} alt="" className="h-[32px] w-[32px] rounded-full border-[1.5px] border-white object-cover" />}
          <div className="leading-tight">
            <div className="text-[13px] font-bold">{owner.handle === me ? "Your Double" : owner.handle} <span className="font-normal text-white/70">{ages[i]}</span></div>
            {other && <div className="text-[11.5px] text-white/80">with {who(other)}{it.place ? ` · ${it.place}` : ""}</div>}
          </div>
          <button onClick={() => router.push("/feed")} aria-label="Close" className="ml-auto p-1">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      </div>

      {it.kind === "moment" ? (
        <div key={`t${it.id}`} className="rise absolute inset-x-5 bottom-[92px] z-10">
          {it.title && <div className="font-display text-[38px] uppercase leading-[0.92]">{it.title}</div>}
          <p className="mt-2 line-clamp-3 font-serif text-[19px] italic leading-[1.18] text-white/95">“{it.caption}” <span className="not-italic text-[12px] text-white/70">— {who(it.author)}</span></p>
        </div>
      ) : (
        <div key={`o${it.id}`} className="rise absolute inset-x-5 bottom-32 z-10 flex flex-col items-start gap-2.5">
          <span className="-rotate-2 rounded-lg bg-paper px-3 py-1.5 font-display text-[30px] uppercase leading-none text-ink">{it.overlay}</span>
          {it.sticker && <span className="rotate-[4deg] rounded-full bg-hot px-3.5 py-1.5 text-[14px] font-bold text-white">{it.sticker}</span>}
        </div>
      )}

      <button aria-label="Previous" onClick={() => go(-1)} className="absolute inset-y-[12%] left-0 z-[6] w-1/3" />
      <button aria-label="Next" onClick={() => go(1)} className="absolute inset-y-[12%] right-0 z-[6] w-2/3" />

      {sent && (
        <div className="rise absolute inset-x-4 bottom-[76px] z-20 rounded-2xl bg-black/70 p-3 text-[13px] leading-snug backdrop-blur">
          <span className="text-[10.5px] font-bold tracking-[0.18em] text-hot">YOUR DOUBLE REPLIED</span>
          <div className="mt-1">{sent}</div>
        </div>
      )}
      <form onSubmit={send} className="absolute inset-x-3 bottom-5 z-20 flex items-center gap-2">
        <input
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onFocus={() => setPaused(true)}
          onBlur={() => !reply && setPaused(false)}
          disabled={!me || it.kind !== "moment"}
          placeholder={me ? (it.kind === "moment" ? `Tell your Double what to reply…` : `Reply to ${owner.handle}…`) : "Create your Double to reply"}
          className="h-[44px] min-w-0 flex-1 rounded-full border border-white/60 bg-transparent px-4 text-[13.5px] text-white outline-none placeholder:text-white/75"
        />
        {reply && <button disabled={busy} className="font-display text-[15px] tracking-[0.08em] text-hot">{busy ? "…" : "SEND"}</button>}
      </form>
    </div>
  );
}
