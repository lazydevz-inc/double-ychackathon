"use client";

import { useState } from "react";

export function ShareEpisode() {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: "DOUBLE", text: "You're in this episode. Decide what happens next.", url });
        return;
      } catch {
        /* fall back to copy */
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={share} className="w-full rounded-full bg-hot py-4 font-display uppercase tracking-widest text-white">
      {copied ? "Link copied" : "Send this episode to the cast"}
    </button>
  );
}
