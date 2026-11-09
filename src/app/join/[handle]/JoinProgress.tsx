"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Double, JoinStatus, JoinStep } from "@/lib/types";

const STEPS: { key: JoinStep; title: string; sub: string }[] = [
  { key: "reading", title: "READING YOUR POSTS", sub: "Your last nine posts and how you write" },
  { key: "persona", title: "MEETING YOUR DOUBLE", sub: "Who you are on an ordinary day" },
  { key: "moments", title: "FINDING YOUR PEOPLE", sub: "Who here shares your days" },
  { key: "photos", title: "LIVING THE FIRST DAY", sub: "Two moments, with your real face" },
];
const ORDER: JoinStep[] = ["queued", "reading", "persona", "moments", "photos", "done"];

export function JoinProgress({ handle }: { handle: string }) {
  const [status, setStatus] = useState<JoinStatus | null>(null);
  const [double, setDouble] = useState<Double | null>(null);
  const [t0] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const res = await fetch(`/api/join/${handle}`, { cache: "no-store" }).catch(() => null);
      const json = res?.ok ? await res.json() : null;
      if (!alive || !json) return;
      setStatus(json.status);
      setDouble(json.double);
    };
    tick();
    const a = setInterval(tick, 2500);
    const b = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      alive = false;
      clearInterval(a);
      clearInterval(b);
    };
  }, [handle]);

  const at = ORDER.indexOf(status?.step ?? "queued");
  const done = status?.step === "done";
  const failed = status?.step === "error";
  const hero = double?.refs[0] ?? double?.pfp;

  return (
    <div className="grain relative min-h-dvh overflow-hidden bg-ink">
      {hero && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={hero} alt="" className={`absolute inset-0 h-full w-full object-cover transition-all duration-1000 ${done ? "brightness-75" : "scale-110 blur-xl brightness-[0.35]"}`} />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0)_30%,rgba(10,10,10,0.92)_70%,#0a0a0a_100%)]" />
      <div className="relative mx-auto flex min-h-dvh max-w-[440px] flex-col px-6 pb-10 pt-6">
        <div className="flex items-center justify-between text-[10.5px] font-bold tracking-[0.22em]">
          <span className="font-display text-[14px] tracking-[0.05em]">DOUBLE<span className="text-hot">.</span></span>
          <span className="text-paper/70">@{handle.toUpperCase()}</span>
        </div>

        {!done && !failed && (
          <div className="mt-auto">
            <div className="font-serif text-[30px] italic leading-tight">{double ? `${double.name.split(" ")[0]}'s Double is moving in…` : "Your Double is moving in…"}</div>
            <div className="mt-1 text-[11px] font-semibold tracking-[0.2em] text-paper/60">{Math.round((now - t0) / 1000)}s · USUALLY ABOUT TWO MINUTES</div>
            <ol className="mt-6 space-y-4">
              {STEPS.map((s, i) => {
                const state = at > i + 1 ? "done" : at === i + 1 ? "now" : "next";
                return (
                  <li key={s.key} className={`flex items-start gap-3 transition-opacity ${state === "next" ? "opacity-35" : ""}`}>
                    <span className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${state === "done" ? "border-hot bg-hot" : state === "now" ? "animate-pulse border-hot" : "border-edge"}`}>
                      {state === "done" && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>}
                    </span>
                    <div>
                      <div className="font-display text-[24px] leading-none">{s.title}</div>
                      <div className="mt-1 text-[13px] text-paper/70">{s.key === "persona" && double ? double.bio : s.sub}</div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {done && double && (
          <div className="rise mt-auto">
            <div className="text-[10.5px] font-bold tracking-[0.22em] text-hot">YOUR DOUBLE JUST MOVED IN</div>
            <h1 className="mt-2 font-display text-[64px] uppercase leading-[0.88]">{double.name}</h1>
            <p className="mt-2 font-serif text-[22px] italic leading-tight">{double.bio}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {double.interests.map((t) => (
                <span key={t} className="rounded-full border border-paper/60 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.14em]">{t}</span>
              ))}
            </div>
            <p className="mt-4 border-l-2 border-hot pl-3 text-[14px] leading-relaxed text-paper/90">{double.lifeInWorld}</p>
            <Link href="/activity" className="mt-6 block h-[56px] rounded-full bg-paper text-center font-display text-[17px] leading-[56px] tracking-[0.08em] text-ink">SEE WHAT HAPPENED</Link>
          </div>
        )}

        {failed && (
          <div className="mt-auto">
            <h1 className="font-display text-[44px] leading-[0.9]">THAT DIDN&apos;T WORK.</h1>
            <p className="mt-2 font-serif text-[20px] italic">{status?.message}</p>
            <Link href="/join" className="mt-6 block h-[52px] rounded-full bg-hot text-center font-display text-[16px] leading-[52px] tracking-[0.08em] text-white">TRY ANOTHER HANDLE</Link>
          </div>
        )}
      </div>
    </div>
  );
}
