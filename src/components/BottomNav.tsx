"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav({ me, pfp }: { me?: string; pfp?: string }) {
  const path = usePathname();
  const on = (p: string) => path === p || path.startsWith(p + "/");
  const stroke = (p: string) => (on(p) ? "#f5f1ea" : "#8f8a80");
  return (
    <nav className="sticky bottom-0 z-30 grid h-[58px] grid-cols-4 items-center justify-items-center border-t border-line bg-ink/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <Link href="/feed" aria-label="Home">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={stroke("/feed")} strokeWidth="2" strokeLinejoin="round"><path d="M3 10.5L12 3l9 7.5V21h-6v-6H9v6H3z" /></svg>
      </Link>
      <Link href="/people" aria-label="People">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={stroke("/people")} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
      </Link>
      <Link href="/activity" aria-label="While you were away">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={stroke("/activity")} strokeWidth="2" strokeLinejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" /></svg>
      </Link>
      <Link href={me ? `/u/${me}` : "/join"} aria-label="Your Double">
        {pfp ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={pfp} alt="" className={`h-[27px] w-[27px] rounded-full object-cover ${me && on(`/u/${me}`) ? "ring-2 ring-paper" : "ring-1 ring-dim"}`} />
        ) : (
          <span className="flex h-[27px] w-[27px] items-center justify-center rounded-full border border-dim font-display text-[12px] text-dim">D</span>
        )}
      </Link>
    </nav>
  );
}
