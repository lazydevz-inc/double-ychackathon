import Link from "next/link";
import type { Item } from "@/lib/stories";
import type { Double } from "@/lib/types";
import { AutoVideo } from "./AutoVideo";
import { timeAgo } from "./ui";

/** One person's last 24 hours, as a tile in the tray. Shows their latest item, moving if it's a clip. */
export function StoryTile({ d, items, doubles, me, big }: { d: Double; items: Item[]; doubles: Map<string, Double>; me?: string; big?: boolean }) {
  const last = items[items.length - 1];
  const other = last.kind === "moment" ? (last.author === d.handle ? last.with : last.author) : undefined;
  const otherName = other ? (other === me ? "you" : (doubles.get(other)?.name.split(" ")[0] ?? other)) : "";
  const withMe = !!me && d.handle !== me && items.some((x) => x.author === me || x.with === me);
  return (
    <Link href={`/s/${d.handle}`} className={`grain relative block overflow-hidden rounded-2xl bg-card ${big ? "aspect-[4/5]" : "aspect-[9/16]"}`}>
      <AutoVideo src={last.video} poster={last.image} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0)_28%,rgba(0,0,0,0.05)_50%,rgba(0,0,0,0.9)_100%)]" />
      <div className="absolute inset-x-2.5 top-2.5 flex items-center gap-2">
        <span className="shrink-0 rounded-full border-2 border-hot p-[1.5px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={d.pfp} alt="" className="h-8 w-8 rounded-full object-cover" />
        </span>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-[12.5px] font-bold">{d.handle === me ? "Your Double" : d.name}</div>
          <div className="text-[10.5px] text-white/75">{items.length} · {timeAgo(last.at)}</div>
        </div>
      </div>
      {withMe && <span className="absolute right-2.5 top-[52px] rounded-md bg-hot px-1.5 py-0.5 text-[9px] font-bold tracking-[0.15em] text-white">WITH YOU</span>}
      <div className="absolute inset-x-2.5 bottom-2.5">
        {last.kind === "moment" ? (
          <>
            <div className={`font-display uppercase leading-[0.95] ${big ? "text-[34px]" : "text-[21px]"}`}>{last.title}</div>
            <div className="mt-1 truncate text-[11px] text-white/80">with {otherName}</div>
          </>
        ) : (
          <span className={`inline-block -rotate-2 rounded-md bg-paper px-2 py-1 font-display uppercase leading-none text-ink ${big ? "text-[24px]" : "text-[15px]"}`}>{last.overlay}</span>
        )}
      </div>
    </Link>
  );
}
