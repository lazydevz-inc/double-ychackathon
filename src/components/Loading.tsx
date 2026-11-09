"use client";

import { motion, AnimatePresence } from "motion/react";

export function Loading({ stage, sub }: { stage: string; sub?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink/95 backdrop-blur-sm">
      <div className="absolute top-8 overflow-hidden w-full opacity-30">
        <div className="marquee flex whitespace-nowrap font-display text-6xl uppercase tracking-tight text-hot">
          {Array.from({ length: 2 }).map((_, k) => (
            <span key={k} className="pr-8">
              Now casting · Now casting · Now casting · Now casting · Now casting · Now casting ·
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3 mb-6">
        <span className="h-3 w-3 rounded-full bg-hot animate-pulse" />
        <span className="font-display uppercase tracking-[0.3em] text-sm">Rec</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={stage}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="font-serif italic text-4xl md:text-5xl text-center px-8 max-w-2xl"
        >
          {stage}…
        </motion.p>
      </AnimatePresence>
      {sub && <p className="mt-6 text-mute text-sm">{sub}</p>}
    </div>
  );
}
