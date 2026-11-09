import Link from "next/link";
import type { Double } from "@/lib/types";

export function timeAgo(t: number) {
  const s = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (s < 60) return "now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

export const firstName = (d?: Double | null, fallback = "") => (d?.name ?? fallback).split(" ")[0] || d?.handle || fallback;

export function Logo({ size = 24 }: { size?: number }) {
  return (
    <span className="font-display leading-none tracking-[0.01em]" style={{ fontSize: size }}>
      DOUBLE<span className="text-hot">.</span>
    </span>
  );
}

export function Avatar({ d, size = 32, ring, className = "" }: { d?: Double | null; size?: number; ring?: "hot" | "edge"; className?: string }) {
  const inner = d?.pfp ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={d.pfp} alt="" className="h-full w-full rounded-full object-cover" style={{ objectPosition: "50% 40%" }} />
  ) : (
    <span className="flex h-full w-full items-center justify-center rounded-full bg-[#2a2724] font-display text-mute">{(d?.handle ?? "?")[0].toUpperCase()}</span>
  );
  if (!ring) return <span className={`inline-block shrink-0 ${className}`} style={{ width: size, height: size }}>{inner}</span>;
  return (
    <span className={`inline-block shrink-0 rounded-full p-[2px] ${ring === "hot" ? "border-2 border-hot" : "border-2 border-edge"} ${className}`} style={{ width: size, height: size }}>
      {inner}
    </span>
  );
}

/** Two faces, overlapped: every moment is two people. */
export function Pair({ a, b, size = 30 }: { a?: Double | null; b?: Double | null; size?: number }) {
  return (
    <span className="flex shrink-0">
      <Avatar d={a} size={size} className="rounded-full border-2 border-ink" />
      <Avatar d={b} size={size} className="-ml-2.5 rounded-full border-2 border-ink" />
    </span>
  );
}

export function Tag({ children, tone = "hot" }: { children: React.ReactNode; tone?: "hot" | "paper" | "mute" }) {
  const c = tone === "hot" ? "text-hot" : tone === "paper" ? "text-paper" : "text-mute";
  return <div className={`text-[10.5px] font-bold uppercase tracking-[0.22em] ${c}`}>{children}</div>;
}

export function Who({ d, handle }: { d?: Double | null; handle: string }) {
  return (
    <Link href={`/u/${handle}`} className="font-semibold hover:underline">
      {d?.name ?? handle}
    </Link>
  );
}
