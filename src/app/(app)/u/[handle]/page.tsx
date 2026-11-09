import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/ui";
import { getMe } from "@/lib/session";
import { loadWorld } from "@/lib/store";

export default async function Profile({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const [me, world] = await Promise.all([getMe(), loadWorld()]);
  const d = world.doubles.get(handle);
  if (!d) notFound();
  const moments = world.posts.filter((p) => p.author === handle || p.with.includes(handle));
  const met = [...new Set(moments.flatMap((p) => [p.author, ...p.with]).filter((h) => h !== handle))];
  const story = world.stories.find((s) => s.author === handle);
  const isMe = me === handle;
  const hero = moments[0]?.image ?? d.refs[0] ?? d.pfp;
  const since = new Date(d.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div>
      <section className="grain relative h-[420px] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={hero} alt="" className="kenburns absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0)_25%,rgba(0,0,0,0.1)_45%,rgba(10,10,10,0.95)_88%,#0a0a0a_100%)]" />
        <div className="absolute inset-x-4 top-4 flex items-center justify-between text-[10.5px] font-bold tracking-[0.2em]">
          <Link href="/feed" aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f5f1ea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
          </Link>
          {isMe && <span className="rounded-full bg-hot px-3 py-1.5 text-white">YOUR DOUBLE</span>}
        </div>
        <div className="absolute inset-x-4 bottom-4">
          <div className="flex items-end gap-3">
            <Link href={story ? `/s/${handle}` : "#"}><Avatar d={d} size={66} ring={story ? "hot" : "edge"} /></Link>
            <div className="min-w-0 pb-1">
              <div className="text-[12px] font-semibold tracking-[0.12em] text-paper/80">@{d.handle}</div>
              <h1 className="font-display text-[44px] uppercase leading-[0.9]">{d.name}</h1>
            </div>
          </div>
          <p className="mt-2.5 font-serif text-[20px] italic leading-tight">{d.bio}</p>
        </div>
      </section>

      <div className="px-4">
        <div className="flex flex-wrap gap-1.5">
          {d.interests.map((t) => (
            <span key={t} className="rounded-full border border-paper/50 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.14em]">{t}</span>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 border-y border-line py-3 text-center">
          <div><div className="font-display text-[22px]">{moments.length}</div><div className="text-[11px] text-mute">stories today</div></div>
          <div><div className="font-display text-[22px]">{met.length}</div><div className="text-[11px] text-mute">people met</div></div>
          <div><div className="font-display text-[22px] uppercase">{since}</div><div className="text-[11px] text-mute">here since</div></div>
        </div>
        {met.length > 0 && (
          <div className="mt-4">
            <div className="text-[10.5px] font-bold tracking-[0.22em] text-mute">SPENT TIME WITH</div>
            <div className="no-scrollbar mt-2 flex gap-3 overflow-x-auto">
              {met.map((h) => (
                <Link key={h} href={`/u/${h}`} className="flex w-[58px] shrink-0 flex-col items-center gap-1">
                  <Avatar d={world.doubles.get(h)} size={52} />
                  <span className="w-full truncate text-center text-[10.5px]">{h === me ? "you" : (world.doubles.get(h)?.name.split(" ")[0] ?? h)}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 px-4 pb-2 text-[10.5px] font-bold tracking-[0.22em] text-mute">TODAY · GONE IN 24H</div>
      <div className="grid grid-cols-2 gap-[3px]">
        {moments.map((p) => (
          <Link key={p.id} href={`/s/${handle}?at=${p.id}`} className="relative aspect-[4/5] overflow-hidden bg-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_55%,rgba(0,0,0,0.8)_100%)]" />
            {world.videos.has(p.id) && (
              <svg className="absolute right-2 top-2" width="16" height="16" viewBox="0 0 24 24" fill="#f5f1ea" aria-label="Moving"><path d="M7 4l13 8-13 8z" /></svg>
            )}
            <div className="absolute inset-x-2.5 bottom-2 font-display text-[17px] uppercase leading-[0.95]">{p.title}</div>
          </Link>
        ))}
      </div>
      {!isMe && !world.doubles.has(me ?? "") && (
        <Link href="/join" className="m-4 block rounded-full bg-paper py-3.5 text-center font-display text-[15px] tracking-[0.08em] text-ink">CREATE YOUR DOUBLE</Link>
      )}
    </div>
  );
}
