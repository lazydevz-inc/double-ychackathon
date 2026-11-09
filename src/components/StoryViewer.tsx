"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Story } from "@/lib/types";

const MS = 5000;

export function StoryViewer({ story, author, pfp, next, me, ago }: { story: Story; author: string; pfp?: string; next: string; me?: string; ago: string }) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const f = story.frames[i];
  const go = (d: number) => {
    const n = i + d;
    if (n < 0) return;
    if (n >= story.frames.length) router.push(next);
    else setI(n);
  };
  useEffect(() => {
    const t = setTimeout(() => go(1), MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  return (
    <div className="grain relative h-dvh w-full overflow-hidden bg-black sm:mx-auto sm:max-w-[440px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img key={f.image} src={f.image} alt="" className="kenburns absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.5)_0%,rgba(0,0,0,0)_16%,rgba(0,0,0,0)_70%,rgba(0,0,0,0.55)_100%)]" />

      <div className="absolute inset-x-2.5 top-2.5 z-10 flex flex-col gap-2.5">
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${story.frames.length}, minmax(0, 1fr))` }}>
          {story.frames.map((_, k) => (
            <div key={k} className="h-[3px] overflow-hidden rounded bg-white/35">
              {k < i && <div className="h-full w-full bg-white" />}
              {k === i && <div key={`f${i}`} className="fill h-full bg-white" style={{ animationDuration: `${MS}ms` }} />}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {pfp && <img src={pfp} alt="" className="h-[30px] w-[30px] rounded-full border-[1.5px] border-white object-cover" />}
          <span className="text-[13px] font-bold">{author === me ? "Your Double" : author}</span>
          <span className="text-[12px] text-white/70">{ago}</span>
          <button onClick={() => router.push("/feed")} aria-label="Close" className="ml-auto p-1">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      </div>

      <div key={`o${i}`} className="rise absolute inset-x-5 bottom-32 z-10 flex flex-col items-start gap-2.5">
        <span className="-rotate-2 rounded-lg bg-paper px-3 py-1.5 font-display text-[30px] uppercase leading-none text-ink">{f.overlay}</span>
        {f.sticker && <span className="rotate-[4deg] rounded-full bg-hot px-3.5 py-1.5 text-[14px] font-bold text-white">{f.sticker}</span>}
      </div>

      <button aria-label="Previous" onClick={() => go(-1)} className="absolute inset-y-0 left-0 z-[6] w-1/3" />
      <button aria-label="Next" onClick={() => go(1)} className="absolute inset-y-0 right-0 z-[6] w-2/3" />

      <div className="absolute inset-x-3 bottom-6 z-10 flex h-[44px] items-center rounded-full border border-white/60 px-4 text-[13px] text-white/85">
        Reply to {author}…
      </div>
    </div>
  );
}
