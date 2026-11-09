"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loading } from "@/components/Loading";
import { postJob } from "@/components/ndjson";
import type { Lang } from "@/lib/types";

export function DoubleActions({ id, name, housemates, lang, canVerify }: { id: string; name: string; housemates: string[]; lang: Lang; canVerify?: boolean }) {
  const router = useRouter();
  const [stage, setStage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function invite() {
    const url = `${location.origin}/create?with=${id}`;
    const text = `${name}'s Double wants you in their next story. Cast yours and see what happens.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "DOUBLE", text, url });
        return;
      } catch {
        /* fall back to copy */
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function enterHouse() {
    setError(null);
    try {
      setStage("Writing your first story");
      const ep = await postJob("/api/episodes", JSON.stringify({ cast: [id, ...housemates], lang }), setStage, true);
      router.push(`/e/${ep}`);
    } catch (e) {
      setStage(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="space-y-3">
      {stage && <Loading stage={stage} sub="Directing, casting moves, cutting the episode…" />}
      {canVerify && (
        <a href={`/d/${id}/verify`} className="flex items-center justify-between rounded-2xl border border-[#4aa3ff]/50 bg-[#4aa3ff]/10 px-5 py-4">
          <span>
            <span className="block font-display uppercase tracking-widest text-[#4aa3ff]">Get the blue check</span>
            <span className="block text-xs text-mute mt-0.5">5-second selfie. Unlocks AI video of your real face.</span>
          </span>
          <span className="text-[#4aa3ff]">→</span>
        </a>
      )}
      <a
        href={`/api/card/${id}`}
        download={`double-${id}.png`}
        className="block w-full rounded-full bg-paper py-4 text-center font-display uppercase tracking-widest text-ink"
      >
        Save for my Story
      </a>
      <button onClick={invite} className="w-full rounded-full bg-hot py-4 font-display uppercase tracking-widest text-white">
        {copied ? "Invite link copied" : "Bring a friend into your story"}
      </button>
      {housemates.length >= 1 && (
        <button onClick={enterHouse} className="w-full rounded-full border border-white/25 py-4 font-display uppercase tracking-widest">
          Start my first story
        </button>
      )}
      {error && <p className="rounded-xl bg-hot/15 border border-hot/40 px-4 py-3 text-sm">{error}</p>}
    </div>
  );
}
