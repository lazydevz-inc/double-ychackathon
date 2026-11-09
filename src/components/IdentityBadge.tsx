import type { Badge } from "@/lib/identity";

/** Identity badge shown next to a Double's name everywhere (design I4). */
export function IdentityBadge({ badge, size = "sm" }: { badge: Badge; size?: "sm" | "xs" }) {
  if (!badge) return null;
  const cls = size === "xs" ? "text-[9px] px-1.5 py-[1px]" : "text-[10px] px-2 py-0.5";
  return badge === "verified" ? (
    <span className={`inline-flex items-center gap-1 rounded-full bg-[#4aa3ff] font-bold uppercase tracking-wider text-ink align-middle ${cls}`} title="Real face, verified by the owner">
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12l5 5L20 7" />
      </svg>
      Verified
    </span>
  ) : (
    <span className={`inline-flex items-center rounded-full border border-gold font-bold uppercase tracking-wider text-gold align-middle ${cls}`} title="Avatar: no real face is used">
      Avatar
    </span>
  );
}
