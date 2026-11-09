"use client";

import { motion } from "motion/react";
import { IdentityBadge } from "@/components/IdentityBadge";
import { badgeOf, isAvatar, visuals } from "@/lib/identity";
import type { Double } from "@/lib/types";

/** 9:16 "cast reveal" story card. Designed to be screenshotted / shared to Stories. */
export function CastCard({ d }: { d: Double }) {
  const p = d.persona;
  const accent = p.palette[1] ?? "#ff2d55";
  const v = visuals(d);
  const hero = v.hero;
  const avatar = isAvatar(d);
  const followers =
    d.followers && d.followers > 0
      ? new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(d.followers)
      : null;
  return (
    <div className="frame-916 relative overflow-hidden bg-black grain sm:rounded-[28px] shadow-2xl">
      <img src={hero} alt="" className={`kenburns absolute inset-0 h-full w-full object-cover ${avatar ? "object-top" : ""}`} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/0 to-black/95" />
      <div className="absolute inset-0 mix-blend-color opacity-10" style={{ background: accent }} />

      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5 text-[11px] uppercase tracking-[0.25em]">
        <span className="font-display">
          DOUBLE<span className="text-hot">.</span> Originals
        </span>
        <motion.span
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-full bg-hot px-3 py-1 font-bold text-white"
        >
          Cast reveal
        </motion.span>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-6 pb-7 text-shadow">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-[11px] uppercase tracking-[0.3em] text-paper/80"
        >
          Inspired by @{d.handle}&apos;s feed <IdentityBadge badge={badgeOf(d)} size="xs" />
          {followers && <span className="text-paper/60"> · {followers} followers</span>}
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, type: "spring", stiffness: 120, damping: 16 }}
          className="font-display uppercase leading-[0.88] text-[clamp(44px,11vh,92px)] mt-2"
        >
          {p.archetype}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="font-serif italic text-2xl leading-snug mt-3"
        >
          {p.tagline}
        </motion.p>
        <motion.div
          initial="h"
          animate="s"
          transition={{ delayChildren: 1.9, staggerChildren: 0.12 }}
          className="flex flex-wrap gap-2 mt-4"
        >
          {p.traits.map((t) => (
            <motion.span
              key={t}
              variants={{ h: { opacity: 0, scale: 0.8 }, s: { opacity: 1, scale: 1 } }}
              className="rounded-full border border-paper/60 bg-black/30 px-3 py-1 text-xs uppercase tracking-widest backdrop-blur"
            >
              {t}
            </motion.span>
          ))}
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.5 }}
          className="mt-5 border-l-2 border-hot pl-3 text-sm leading-relaxed text-paper/90"
        >
          &ldquo;{p.showIntro}&rdquo;
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3 }}
          className="mt-5 flex items-end justify-between"
        >
          <div className="flex -space-x-3">
            {v.photos.slice(0, 4).map((src, i) => (
              <img key={i} src={src} alt="" className="h-12 w-10 rounded-md border-2 border-black object-cover" style={{ rotate: `${(i - 1.5) * 5}deg` }} />
            ))}
          </div>
          <span className="text-[10px] uppercase tracking-[0.25em] text-paper/60">{avatar ? "Avatar Double" : "Fictional Double"} · double.show</span>
        </motion.div>
      </div>
    </div>
  );
}
