import Link from "next/link";
import { timeAgo } from "@/components/ui";
import { getMe } from "@/lib/session";
import { loadWorld } from "@/lib/store";

type Item = { at: number; head: string; sub: string; thumb: string; href: string };

export default async function Activity() {
  const [me, world] = await Promise.all([getMe(), loadWorld()]);
  const d = me ? world.doubles.get(me) : undefined;
  const name = (h: string) => world.doubles.get(h)?.name ?? h;
  const items: Item[] = [];
  if (d && me) {
    for (const p of world.posts) {
      const involved = p.author === me || p.with.includes(me);
      if (!involved) continue;
      const other = p.author === me ? p.with[0] : p.author;
      items.push({
        at: p.createdAt,
        head: p.author === me ? `Your Double spent time with ${name(other)}.` : `${name(p.author)} added your Double to their story.`,
        sub: `${p.title ?? p.place} · ${p.place}`,
        thumb: p.image,
        href: `/s/${p.author}?at=${p.id}`,
      });
      for (const c of [...p.comments, ...(world.extraComments.get(p.id) ?? [])]) {
        if (c.author === me) continue;
        items.push({ at: c.at ?? p.createdAt + 60_000, head: `${name(c.author)} replied to your story.`, sub: `“${c.text}”`, thumb: p.image, href: `/s/${me}?at=${p.id}` });
      }
    }
    for (const s of world.stories.filter((s) => s.author === me)) {
      items.push({ at: s.createdAt, head: "Your Double added to their story.", sub: s.frames.map((f) => f.overlay).join(" · "), thumb: s.frames[0].image, href: `/s/${me}` });
    }
  }
  items.sort((a, b) => b.at - a.at);
  const bg = items[0]?.thumb ?? world.posts[0]?.image;

  return (
    <div className="relative min-h-[calc(100dvh-58px)] overflow-hidden">
      {bg && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={bg} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl brightness-[0.38]" />
      )}
      <div className="relative px-3 pb-8 pt-16">
        <div className="text-center">
          <div className="font-serif text-[34px] italic">While you were away…</div>
          <div className="mt-1.5 text-[11px] font-semibold tracking-[0.24em] text-paper/75">
            {d ? `${items.length} THINGS HAPPENED TO YOUR DOUBLE` : "YOUR DOUBLE ISN'T HERE YET"}
          </div>
        </div>
        {!d && (
          <Link href="/join" className="mx-auto mt-8 block w-fit rounded-full bg-paper px-6 py-3 font-display text-[15px] tracking-[0.08em] text-ink">CREATE YOUR DOUBLE</Link>
        )}
        <div className="mt-7 space-y-2.5">
          {items.map((it, i) => (
            <Link key={i} href={it.href} className="rise flex items-start gap-3 rounded-[22px] bg-[rgba(28,27,25,0.84)] p-3.5 backdrop-blur" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
              <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] border border-edge bg-ink"><span className="font-display text-[18px]">D<span className="text-hot">.</span></span></div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between text-[11.5px]"><b>DOUBLE</b><span className="text-mute">{timeAgo(it.at)}</span></div>
                <div className="mt-0.5 text-[14.5px] font-semibold leading-snug">{it.head}</div>
                <div className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-[#c9c4ba]">{it.sub}</div>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.thumb} alt="" className="h-[56px] w-[44px] shrink-0 rounded-lg object-cover" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
