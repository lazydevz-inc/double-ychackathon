"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loading } from "@/components/Loading";
import { postJob } from "@/components/ndjson";
import { IdentityBadge } from "@/components/IdentityBadge";
import type { Badge } from "@/lib/identity";
import type { Episode, Scene } from "@/lib/types";

export type CastLite = { id: string; name: string; handle: string; archetype: string; portrait: string; photos: string[]; clips?: string[]; badge?: Badge };

const COLORS = ["#ff2d55", "#e8c27a", "#5ac8fa", "#a78bfa", "#34d399"];

export function EpisodePlayer({ ep, cast }: { ep: Episode; cast: CastLite[] }) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const holdRef = useRef<number | null>(null);
  const [cine, setCine] = useState<Record<string, string>>({});
  const scene = ep.scenes[i];

  // AI cinematic clips render in the background; swap them in as they land.
  useEffect(() => {
    let alive = true;
    let timer: number | undefined;
    const poll = async (n: number) => {
      const res = await fetch(`/api/episodes/${ep.id}/cinematic`).then((r) => r.json()).catch(() => null);
      if (!alive || !res) return;
      setCine(res.clips ?? {});
      // the server decides: first viewer renders, a stale claim fills missing shots, otherwise no-op
      if (n === 0) fetch(`/api/episodes/${ep.id}/cinematic`, { method: "POST" }).catch(() => {});
      if (n < 40) timer = window.setTimeout(() => poll(n + 1), 6000);
    };
    poll(0);
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [ep.id]);
  const cineFor = (sceneIndex: number, doubleId?: string) => (doubleId ? cine[`${sceneIndex}-${doubleId}`] : undefined);
  const last = i === ep.scenes.length - 1;

  const byId = useCallback((id: string) => cast.find((c) => c.id === id), [cast]);
  const color = (id: string) => COLORS[Math.max(0, cast.findIndex((c) => c.id === id)) % COLORS.length];

  useEffect(() => {
    if (paused || last) return;
    let raf = 0;
    let prev = performance.now();
    const tick = (t: number) => {
      setElapsed((e) => {
        const n = e + (t - prev);
        if (n >= scene.durationMs) {
          setI((x) => Math.min(x + 1, ep.scenes.length - 1));
          return 0;
        }
        return n;
      });
      prev = t;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, last, scene.durationMs, ep.scenes.length]);

  const go = (d: number) => {
    setI((x) => Math.max(0, Math.min(ep.scenes.length - 1, x + d)));
    setElapsed(0);
  };

  /** real reel to use as background for the cold open, if any cast member has one */
  function clipFor(s: Scene) {
    if (s.kind !== "hook") return undefined;
    const pool = [...s.focus.map(byId), ...cast].filter((c): c is CastLite => !!c?.clips?.length);
    return pool[0]?.clips?.[0];
  }

  function bg(s: Scene) {
    const f = s.focus[0];
    if ((s.kind === "confessional" || s.kind === "twist") && f && ep.stills?.[f]) return ep.stills[f];
    if (s.photo) {
      const d = byId(s.photo.double);
      if (d?.photos[s.photo.index]) return d.photos[s.photo.index];
    }
    if (f && byId(f)) return byId(f)!.portrait;
    return cast[0].portrait;
  }

  async function choose(optionId: string) {
    setError(null);
    try {
      setStage("Rolling cameras on the next episode");
      const id = await postJob("/api/episodes", JSON.stringify({ parentId: ep.id, optionId }), setStage, true);
      router.push(`/e/${id}`);
    } catch (e) {
      setStage(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const chooser = byId(ep.cliffhanger.doubleId);

  return (
    <div
      className="frame-916 relative select-none overflow-hidden bg-black grain sm:rounded-[28px] shadow-2xl"
      onPointerDown={() => {
        holdRef.current = window.setTimeout(() => setPaused(true), 180);
      }}
      onPointerUp={(e) => {
        if (holdRef.current) clearTimeout(holdRef.current);
        if (paused) return setPaused(false);
        if ((e.target as HTMLElement).closest("button,a")) return;
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        go(e.clientX - r.left < r.width * 0.3 ? -1 : 1);
      }}
    >
      {stage && <Loading stage={stage} sub={chooser ? `${chooser.name}'s owner made the call.` : undefined} />}

      <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="absolute inset-0">
          {scene.kind === "cast" ? (
            <CastStrip ids={ep.cast} byId={byId} />
          ) : scene.kind === "twist" && scene.focus.length >= 2 ? (
            <div className="absolute inset-0 grid grid-cols-2">
              {scene.focus.slice(0, 2).map((f) =>
                cineFor(i, f) ? (
                  <video key={f} src={cineFor(i, f)} muted autoPlay loop playsInline className="h-full w-full object-cover" />
                ) : (
                  <img key={f} src={ep.stills?.[f] || byId(f)?.portrait} alt="" className="kenburns h-full w-full object-cover" />
                ),
              )}
            </div>
          ) : cineFor(i, scene.focus[0]) ? (
            <video src={cineFor(i, scene.focus[0])} muted autoPlay loop playsInline className="absolute inset-0 h-full w-full object-cover" />
          ) : clipFor(scene) ? (
            <video src={clipFor(scene)} muted autoPlay loop playsInline className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <img src={bg(scene)} alt="" className={`kenburns absolute inset-0 h-full w-full object-cover ${scene.kind === "cliffhanger" ? "blur-md scale-110 opacity-60" : ""}`} />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/5 to-black/90" />
          {scene.kind === "twist" && (
            <motion.div initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.6 }} className="absolute inset-0 bg-white" />
          )}
          <SceneText scene={scene} ep={ep} byId={byId} color={color} chooserName={chooser?.name} onChoose={choose} />
      </motion.div>

      {/* chrome */}
      <div className="absolute inset-x-0 top-0 z-20 p-3 space-y-2">
        <div className="flex gap-1">
          {ep.scenes.map((s, k) => (
            <div key={k} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full bg-white"
                style={{ width: k < i ? "100%" : k === i ? `${last ? 100 : Math.min(100, (elapsed / s.durationMs) * 100)}%` : "0%" }}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.25em]">
          <span className="font-display">
            DOUBLE<span className="text-hot">.</span> {ep.showTitle}
          </span>
          <span className="text-paper/70">
            S1 · E{ep.number} {paused && "· paused"}
          </span>
        </div>
      </div>
      {error && <p className="absolute inset-x-4 bottom-4 z-30 rounded-xl bg-hot/80 px-4 py-3 text-sm">{error}</p>}
    </div>
  );
}

function CastStrip({ ids, byId }: { ids: string[]; byId: (id: string) => CastLite | undefined }) {
  return (
    <div className="absolute inset-0 flex">
      {ids.map((id, k) => {
        const c = byId(id);
        if (!c) return null;
        return (
          <motion.div
            key={id}
            initial={{ y: k % 2 ? "-100%" : "100%" }}
            animate={{ y: 0 }}
            transition={{ delay: k * 0.25, type: "spring", damping: 20 }}
            className="relative h-full flex-1 overflow-hidden border-r border-black last:border-0"
          >
            <img src={c.portrait} alt="" className="kenburns h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-2 pt-16">
              <p className="font-display uppercase text-lg leading-none">{c.name}</p>
              {c.badge && <div className="mt-1"><IdentityBadge badge={c.badge} size="xs" /></div>}
              <p className="mt-1 text-[9px] uppercase tracking-widest text-gold leading-tight">{c.archetype}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function SceneText({
  scene,
  ep,
  byId,
  color,
  chooserName,
  onChoose,
}: {
  scene: Scene;
  ep: Episode;
  byId: (id: string) => CastLite | undefined;
  color: (id: string) => string;
  chooserName?: string;
  onChoose: (id: string) => void;
}) {
  const lineDelay = (k: number) => 0.6 + k * 0.9;

  if (scene.kind === "hook") {
    return (
      <div className="absolute inset-0 z-10 flex flex-col justify-center p-7 text-shadow">
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs uppercase tracking-[0.35em] text-hot font-bold">
          {ep.number > 1 ? "Previously on DOUBLE" : "Tonight on DOUBLE"}
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, scale: 1.3 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, type: "spring", damping: 14 }}
          className="font-display uppercase leading-[0.9] text-6xl mt-3"
        >
          {scene.title}
        </motion.h2>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="font-serif italic text-2xl mt-4">
          {scene.caption}
        </motion.p>
      </div>
    );
  }

  if (scene.kind === "cliffhanger") {
    return (
      <div className="absolute inset-0 z-10 flex flex-col justify-end p-6 pb-8">
        <p className="text-xs uppercase tracking-[0.35em] text-hot font-bold">Next time on DOUBLE</p>
        <h2 className="font-display uppercase text-4xl leading-[0.95] mt-2 text-shadow">{scene.title}</h2>
        <p className="font-serif italic text-xl mt-2 text-shadow">{scene.caption}</p>
        <div className="mt-6 rounded-2xl bg-black/60 border border-white/15 p-4 backdrop-blur">
          <p className="text-[10px] uppercase tracking-[0.25em] text-gold">{chooserName ? `${chooserName}'s owner decides` : "You decide"}</p>
          <p className="font-serif text-2xl leading-tight mt-1">{ep.cliffhanger.question}</p>
          <div className="mt-4 space-y-2">
            {ep.cliffhanger.options.map((o) => (
              <button
                key={o.id}
                onClick={() => onChoose(o.id)}
                className="group w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-left hover:bg-paper hover:text-ink transition"
              >
                <span className="font-display uppercase tracking-wider">{o.label}</span>
                <span className="block text-xs text-paper/60 group-hover:text-ink/70 mt-0.5">
                  {o.teaser} · vs {byId(o.targetId)?.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (scene.kind === "confessional") {
    const who = byId(scene.focus[0]);
    return (
      <div className="absolute inset-0 z-10 flex flex-col justify-end p-6 pb-10 text-shadow">
        <motion.div initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex items-stretch">
          <span className="bg-hot px-2 py-1 text-[10px] font-bold uppercase tracking-[0.25em]">Confessional</span>
          {who && <span className="bg-paper px-2 py-1 text-ink text-[10px] font-bold uppercase tracking-[0.2em]">{who.name} · {who.archetype}</span>}
          {who?.badge && <span className="ml-1 self-center"><IdentityBadge badge={who.badge} size="xs" /></span>}
        </motion.div>
        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="font-serif italic text-3xl leading-tight mt-4">
          &ldquo;{scene.lines[0]?.text ?? scene.caption}&rdquo;
        </motion.p>
        {scene.lines.slice(1).map((l, k) => (
          <motion.p key={k} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: lineDelay(k + 1) }} className="font-serif italic text-xl mt-2 text-paper/85">
            &ldquo;{l.text}&rdquo;
          </motion.p>
        ))}
        {scene.lines.length > 0 && <p className="mt-4 text-sm text-paper/70">{scene.caption}</p>}
      </div>
    );
  }

  if (scene.kind === "twist") {
    return (
      <div className="absolute inset-0 z-10 flex flex-col justify-end p-6 pb-10 text-shadow">
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-xs uppercase tracking-[0.35em] text-hot font-bold">
          Plot twist
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, scale: 1.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, type: "spring", damping: 12 }}
          className="font-display uppercase text-5xl leading-[0.9] mt-2"
        >
          {scene.title}
        </motion.h2>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="font-serif italic text-2xl mt-3">
          {scene.caption}
        </motion.p>
        <Lines scene={scene} byId={byId} color={color} start={1.8} />
      </div>
    );
  }

  if (scene.kind === "cast") {
    return (
      <div className="absolute inset-x-0 top-0 z-10 p-6 pt-16 text-shadow">
        <p className="inline-block bg-black/70 px-2 py-1 text-[10px] uppercase tracking-[0.25em] text-gold">Meet the cast</p>
        <h2 className="font-display uppercase text-4xl leading-[0.95] mt-2">{scene.title}</h2>
        <p className="font-serif italic text-lg mt-2 max-w-[85%]">{scene.caption}</p>
      </div>
    );
  }

  // encounter
  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-between p-6 pt-16 pb-10 text-shadow">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="inline-block bg-black/70 px-2 py-1 text-[10px] uppercase tracking-[0.25em] text-gold">Tonight</p>
        <h2 className="font-display uppercase text-4xl leading-[0.95] mt-2">{scene.title}</h2>
      </motion.div>
      <div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="font-serif italic text-xl">
          {scene.caption}
        </motion.p>
        <Lines scene={scene} byId={byId} color={color} start={0.8} />
      </div>
    </div>
  );
}

function Lines({ scene, byId, color, start }: { scene: Scene; byId: (id: string) => CastLite | undefined; color: (id: string) => string; start: number }) {
  return (
    <div className="mt-3 space-y-2">
      {scene.lines.map((l, k) => (
        <motion.p
          key={k}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: start + k * 0.9 }}
          className="rounded-lg bg-black/55 px-3 py-2 text-[15px] leading-snug backdrop-blur-sm"
        >
          <span className="font-bold uppercase text-xs tracking-wider mr-2" style={{ color: color(l.speaker) }}>
            {byId(l.speaker)?.name}
          </span>
          {l.text}
        </motion.p>
      ))}
    </div>
  );
}
