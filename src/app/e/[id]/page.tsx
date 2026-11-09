import Link from "next/link";
import { notFound } from "next/navigation";
import { EpisodePlayer, type CastLite } from "@/components/EpisodePlayer";
import { IdentityBadge } from "@/components/IdentityBadge";
import { SCENARIOS } from "@/lib/engine";
import { badgeOf, visuals } from "@/lib/identity";
import { loadDoubles, loadEpisode } from "@/lib/store";
import { ShareEpisode } from "./ShareEpisode";

export default async function EpisodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ep = await loadEpisode(id);
  if (!ep) notFound();
  const doubles = await loadDoubles(ep.cast);
  const cast: CastLite[] = doubles.map((d) => {
    const v = visuals(d);
    return { id: d.id, name: d.name, handle: d.handle, archetype: d.persona.archetype, portrait: v.hero, photos: v.photos, clips: v.clips, badge: badgeOf(d) };
  });
  const name = (x: string) => cast.find((c) => c.id === x)?.name ?? x;
  const scenario = SCENARIOS.find((x) => x.id === ep.scenario);

  return (
    <main className="min-h-dvh lg:flex lg:items-start lg:justify-center lg:gap-14 lg:py-6">
      <div className="lg:sticky lg:top-6 flex justify-center">
        <EpisodePlayer ep={ep} cast={cast} />
      </div>

      <aside className="mx-auto lg:mx-0 w-full max-w-md px-5 py-10 lg:py-4 space-y-8">
        <Link href="/" className="font-display text-2xl tracking-tight">
          DOUBLE<span className="text-hot">.</span>
        </Link>
        <div>
          <p className="font-display uppercase tracking-[0.3em] text-hot text-xs">
            {scenario ? `${scenario.name} · ` : ""}
            {ep.showTitle} · Episode {ep.number}
          </p>
          <h1 className="font-serif text-4xl leading-tight mt-1">{ep.title}</h1>
          {ep.choice && (
            <p className="mt-2 text-sm text-gold">
              Because {name(ep.choice.doubleId)}&apos;s owner chose &ldquo;{ep.choice.label}&rdquo;
            </p>
          )}
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-mute">Starring</p>
          <div className="mt-3 space-y-2">
            {cast.map((c) => (
              <Link key={c.id} href={`/d/${c.id}`} className="flex items-center gap-3 rounded-2xl bg-white/[0.04] border border-white/10 p-2 pr-4 hover:border-white/30">
                <img src={c.portrait} alt="" className="h-14 w-11 rounded-lg object-cover" />
                <div className="flex-1">
                  <p className="font-display uppercase leading-none">
                    {c.name} <IdentityBadge badge={c.badge ?? null} size="xs" />
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-mute mt-1">{c.archetype}</p>
                </div>
                <span className="text-xs text-mute">@{c.handle}</span>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-mute">Story so far</p>
          <ol className="mt-3 space-y-1.5 text-sm text-paper/80 list-decimal list-inside">
            {ep.state.history.slice(-8).map((h, k) => (
              <li key={k}>{h}</li>
            ))}
          </ol>
        </div>

        <ShareEpisode />
      </aside>
    </main>
  );
}
