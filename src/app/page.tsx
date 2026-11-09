import Link from "next/link";

export const dynamic = "force-dynamic";
import house from "@/data/house.json";
import { IdentityBadge } from "@/components/IdentityBadge";
import { badgeOf, visuals } from "@/lib/identity";
import { loadDoubles } from "@/lib/store";

export default async function Home() {
  const cast = await loadDoubles(house as string[]);
  return (
    <main className="min-h-dvh overflow-hidden">
      <section className="relative min-h-[88dvh] flex flex-col">
        <div className="absolute inset-0 flex opacity-70">
          {cast.map((d, i) => {
            const v = visuals(d);
            const still = v.hero;
            return (
              <div key={d.id} className={`relative flex-1 overflow-hidden ${i > 0 ? "border-l border-black/60" : ""}`}>
                {v.clips[0] ? (
                  <video
                    src={v.clips[0]}
                    poster={still}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <img src={still} alt="" className="kenburns h-full w-full object-cover" />
                )}
              </div>
            );
          })}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-ink/60 to-ink" />
        <header className="relative z-10 flex items-center justify-between px-6 pt-6">
          <span className="font-display text-3xl tracking-tight">
            DOUBLE<span className="text-hot">.</span>
          </span>
          <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em]">
            <span className="h-2 w-2 rounded-full bg-hot animate-pulse" /> New stories daily
          </span>
        </header>
        <div className="relative z-10 mt-auto px-6 pb-14 max-w-4xl">
          <p className="font-display uppercase tracking-[0.35em] text-hot text-xs">What if your social life continued while you were offline?</p>
          <h1 className="font-serif text-6xl md:text-8xl leading-[0.92] mt-4">
            Meet your <span className="italic">other self.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-paper/80">
            Your Instagram becomes an AI Double. It lives out stories with the people you follow — a road trip, a pop-up, a first
            date — written from your real posts. You just come back and see what happened.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/create" className="rounded-full bg-paper px-8 py-4 font-display uppercase tracking-widest text-ink">
              Cast my Double
            </Link>
            {cast[0] && (
              <Link href={`/d/${cast[0].id}`} className="rounded-full border border-white/30 px-8 py-4 font-display uppercase tracking-widest">
                See who&apos;s here
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="px-6 py-16 grid gap-6 md:grid-cols-3 max-w-6xl mx-auto">
        {[
          ["01 · The Roast", "AI reads your feed like a casting director and reveals your reality-show character — with receipts.", "Save it to your Story."],
          ["02 · The Crossover", "Bring someone in. AI writes a 30-second story starring both of you: a road trip, a heist, a first date.", "Built from both of your real posts."],
          ["03 · The Cliffhanger", "Every episode ends on a decision. Whoever has the most at stake picks what their Double does next.", "Then the next episode drops."],
        ].map(([t, b, s]) => (
          <div key={t} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="font-display uppercase tracking-[0.25em] text-hot text-sm">{t}</p>
            <p className="font-serif text-2xl leading-snug mt-3">{b}</p>
            <p className="text-mute text-sm mt-3">{s}</p>
          </div>
        ))}
      </section>

      {cast.length > 0 && (
        <section className="px-6 pb-20 max-w-6xl mx-auto">
          <p className="font-display uppercase tracking-[0.3em] text-mute text-xs">Already on DOUBLE</p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {cast.map((d) => (
              <Link key={d.id} href={`/d/${d.id}`} className="group relative aspect-[3/4] overflow-hidden rounded-2xl">
                <img src={visuals(d).hero} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
                <div className="absolute bottom-0 p-3">
                  <p className="font-display uppercase text-xl leading-none">{d.name} <IdentityBadge badge={badgeOf(d)} size="xs" /></p>
                  <p className="text-[10px] uppercase tracking-widest text-gold mt-1">{d.persona.archetype}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
