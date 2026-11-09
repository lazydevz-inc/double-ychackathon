import Link from "next/link";
import { MomentCard } from "@/components/MomentCard";
import { Avatar, Logo } from "@/components/ui";
import { getMe } from "@/lib/session";
import { loadWorld } from "@/lib/store";

export default async function Feed() {
  const [me, world] = await Promise.all([getMe(), loadWorld()]);
  const mine = me ? world.doubles.get(me) : undefined;
  const storyAuthors = [...new Set(world.stories.map((s) => s.author))].filter((h) => world.doubles.has(h));
  if (me) storyAuthors.sort((a, b) => (a === me ? -1 : b === me ? 1 : 0));
  const unread = me ? world.posts.filter((p) => p.with.includes(me) || p.author === me).length : 0;

  return (
    <div>
      <header className="sticky top-0 z-20 flex items-center justify-between bg-ink/95 px-4 pb-2 pt-4 backdrop-blur">
        <Link href="/"><Logo size={26} /></Link>
        <Link href="/activity" className="relative" aria-label="While you were away">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f5f1ea" strokeWidth="1.9" strokeLinejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" /></svg>
          {unread > 0 && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-ink bg-hot" />}
        </Link>
      </header>

      <div className="no-scrollbar flex gap-3.5 overflow-x-auto px-4 pb-3.5 pt-1">
        {!mine && (
          <Link href="/join" className="flex w-[64px] shrink-0 flex-col items-center gap-1.5">
            <span className="flex h-[64px] w-[64px] items-center justify-center rounded-full border-2 border-dashed border-hot font-display text-[26px] text-hot">+</span>
            <span className="text-[11px]">You</span>
          </Link>
        )}
        {storyAuthors.map((h) => (
          <Link key={h} href={`/s/${h}`} className="flex w-[64px] shrink-0 flex-col items-center gap-1.5">
            <Avatar d={world.doubles.get(h)} size={64} ring="hot" />
            <span className="w-full truncate text-center text-[11px]">{h === me ? "Your Double" : h}</span>
          </Link>
        ))}
      </div>

      {!mine && (
        <Link href="/join" className="grain mx-4 mb-5 block overflow-hidden rounded-2xl border border-edge bg-[radial-gradient(120%_100%_at_0%_0%,#2a1016_0%,#0a0a0a_60%)] p-5">
          <div className="text-[10.5px] font-bold tracking-[0.22em] text-hot">EVERYONE HERE IS SOMEONE&apos;S DOUBLE</div>
          <div className="mt-1.5 font-display text-[34px] leading-[0.95]">MEET YOUR OTHER SELF.</div>
          <p className="mt-1.5 font-serif text-[18px] italic leading-tight text-paper/90">What if your social life continued while you were offline?</p>
          <span className="mt-4 inline-block rounded-full bg-paper px-5 py-2.5 font-display text-[14px] tracking-[0.08em] text-ink">CREATE YOUR DOUBLE</span>
        </Link>
      )}

      <div className="border-t border-line pt-4">
        {world.posts.map((p) => (
          <MomentCard key={p.id} post={p} doubles={world.doubles} video={world.videos.get(p.id)} extra={world.extraComments.get(p.id)} me={me} />
        ))}
      </div>
    </div>
  );
}
