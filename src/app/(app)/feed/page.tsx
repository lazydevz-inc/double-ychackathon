import Link from "next/link";
import { connection } from "next/server";
import { StoryTile } from "@/components/StoryTile";
import { Logo } from "@/components/ui";
import { getMe } from "@/lib/session";
import { loadWorld } from "@/lib/store";
import { clock, storiesByPerson, trayOrder } from "@/lib/stories";

/** Home is stories only: what your people's Doubles did in the last 24 hours. No feed, no strangers. */
export default async function Home() {
  await connection();
  const [me, world] = await Promise.all([getMe(), loadWorld()]);
  const map = storiesByPerson(world, clock());
  const mine = me && world.doubles.has(me) ? me : undefined;
  const order = trayOrder(map, mine);
  const [first, ...rest] = mine && map.has(mine) ? order : [undefined, ...order];
  const count = [...map.values()].reduce((n, xs) => n + xs.length, 0);
  const forMe = mine ? world.posts.filter((p) => p.with.includes(mine) || p.author === mine).length : 0;

  return (
    <div className="pb-6">
      <header className="sticky top-0 z-20 flex items-center justify-between bg-ink/95 px-4 pb-2 pt-4 backdrop-blur">
        <Link href="/"><Logo size={26} /></Link>
        <Link href="/activity" className="relative" aria-label="While you were away">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f5f1ea" strokeWidth="1.9" strokeLinejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" /></svg>
          {forMe > 0 && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-ink bg-hot" />}
        </Link>
      </header>

      <div className="px-4 pb-4 pt-2">
        <div className="text-[10.5px] font-bold tracking-[0.22em] text-hot">LAST 24 HOURS · {count} STORIES</div>
        <h1 className="mt-1 font-display text-[44px] leading-[0.9]">WHILE YOU WERE OFFLINE</h1>
        <p className="mt-1.5 font-serif text-[18px] italic leading-tight text-paper/85">Only your people. Everything disappears in a day, and your Doubles make more.</p>
      </div>

      <div className="px-3">
        {first && world.doubles.get(first) ? (
          <StoryTile d={world.doubles.get(first)!} items={map.get(first)!} doubles={world.doubles} me={mine} big />
        ) : (
          <Link href="/join" className="grain block overflow-hidden rounded-2xl border border-edge bg-[radial-gradient(120%_100%_at_0%_0%,#2a1016_0%,#0a0a0a_60%)] p-5">
            <div className="text-[10.5px] font-bold tracking-[0.22em] text-hot">EVERYONE HERE IS SOMEONE&apos;S DOUBLE</div>
            <div className="mt-1.5 font-display text-[34px] leading-[0.95]">MEET YOUR OTHER SELF.</div>
            <p className="mt-1.5 font-serif text-[18px] italic leading-tight text-paper/90">What if your social life continued while you were offline?</p>
            <span className="mt-4 inline-block rounded-full bg-paper px-5 py-2.5 font-display text-[14px] tracking-[0.08em] text-ink">CREATE YOUR DOUBLE</span>
          </Link>
        )}
        <div className="mt-2 grid grid-cols-2 gap-2">
          {rest.map((h) => {
            const d = h ? world.doubles.get(h) : undefined;
            return d ? <StoryTile key={h} d={d} items={map.get(h!)!} doubles={world.doubles} me={mine} /> : null;
          })}
        </div>
      </div>
    </div>
  );
}
