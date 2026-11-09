import Link from "next/link";
import { notFound } from "next/navigation";
import house from "@/data/house.json";
import { CastCard } from "@/components/CastCard";
import { IdentityBadge } from "@/components/IdentityBadge";
import { badgeOf, isAvatar, isVerified } from "@/lib/identity";
import { loadDouble } from "@/lib/store";
import { DoubleActions } from "./DoubleActions";

export default async function DoublePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await loadDouble(id);
  if (!d) notFound();
  const p = d.persona;
  const housemates = (house as string[]).filter((h) => h !== d.id).slice(0, 2);

  return (
    <main className="min-h-dvh lg:flex lg:items-start lg:justify-center lg:gap-14 lg:py-6">
      <div className="lg:sticky lg:top-6 flex justify-center">
        <CastCard d={d} />
      </div>

      <section className="mx-auto lg:mx-0 w-full max-w-xl px-5 py-10 lg:py-4 space-y-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="font-display text-2xl tracking-tight">
            DOUBLE<span className="text-hot">.</span>
          </Link>
          <span className="flex items-center gap-2 text-sm text-mute">
            @{d.handle} <IdentityBadge badge={badgeOf(d)} />
          </span>
        </div>

        <div>
          <p className="font-display uppercase tracking-[0.3em] text-hot text-xs">The roast</p>
          <p className="font-serif text-4xl leading-tight mt-2">&ldquo;{p.roast}&rdquo;</p>
        </div>

        <div>
          <p className="font-display uppercase tracking-[0.3em] text-hot text-xs">The receipts</p>
          <p className="text-mute text-sm mt-1">How the casting director read @{d.handle}</p>
          <div className="mt-4 space-y-3">
            {p.receipts.map((r, i) => (
              <div key={i} className="flex gap-4 items-center rounded-2xl bg-white/[0.04] border border-white/10 p-3">
                {isAvatar(d) ? (
                  <span className="flex h-20 w-16 shrink-0 items-center justify-center rounded-lg border border-white/15 text-[10px] uppercase tracking-widest text-mute">post {r.photo + 1}</span>
                ) : (
                  <img src={d.photos[r.photo]} alt="" className="h-20 w-16 shrink-0 rounded-lg object-cover" />
                )}
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-mute">Exhibit {String.fromCharCode(65 + i)} · post {r.photo + 1}</p>
                  <p className="mt-1 leading-snug">{r.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4">
            <p className="text-[10px] uppercase tracking-[0.25em] text-mute">Wants</p>
            <p className="mt-1">{p.desire}</p>
          </div>
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4">
            <p className="text-[10px] uppercase tracking-[0.25em] text-mute">Fatal flaw</p>
            <p className="mt-1">{p.flaw}</p>
          </div>
          <div className="col-span-2 rounded-2xl bg-white/[0.04] border border-white/10 p-4">
            <p className="text-[10px] uppercase tracking-[0.25em] text-hot">Confessional</p>
            <p className="mt-1 font-serif italic text-xl">&ldquo;{p.confessional}&rdquo;</p>
          </div>
        </div>

        <DoubleActions id={d.id} name={d.name} housemates={housemates} lang={d.lang} canVerify={!isAvatar(d) && !isVerified(d) && !d.house} />
      </section>
    </main>
  );
}
