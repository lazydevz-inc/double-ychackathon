import Link from "next/link";
import { connection } from "next/server";
import { Logo } from "@/components/ui";
import { getMe } from "@/lib/session";
import { loadWorld } from "@/lib/store";

export default async function Landing() {
  await connection();
  const [me, world] = await Promise.all([getMe(), loadWorld()]);
  const tiles = world.posts.map((p) => ({ id: p.id, image: p.image, video: world.videos.get(p.id), title: p.title }));
  const cols = [0, 1, 2].map((c) => tiles.filter((_, i) => i % 3 === c));
  const joined = !!me && world.doubles.has(me);

  return (
    <div className="grain relative h-dvh overflow-hidden bg-ink">
      <div className="absolute inset-0 grid grid-cols-2 gap-1.5 px-1.5 sm:grid-cols-3">
        {cols.map((col, c) => (
          <div key={c} className={`${c === 2 ? "hidden sm:block" : ""} overflow-hidden`}>
            <div className={c % 2 ? "drift-slow" : "drift"} style={{ marginTop: c * -120 }}>
              {[...col, ...col].map((t, i) => (
                <div key={`${t.id}-${i}`} className="relative mb-1.5 aspect-[4/5] overflow-hidden rounded-xl bg-card">
                  {t.video ? (
                    <video src={t.video} poster={t.image} autoPlay muted loop playsInline preload="metadata" className="h-full w-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.image} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,10,10,0.55)_0%,rgba(10,10,10,0.25)_30%,rgba(10,10,10,0.88)_62%,#0a0a0a_100%)]" />

      <div className="relative mx-auto flex h-full max-w-[560px] flex-col px-6 pb-10 pt-6">
        <div className="flex items-center justify-between">
          <Logo size={28} />
          <Link href="/people" className="text-[11px] font-bold tracking-[0.2em] text-paper/80">{world.doubles.size} DOUBLES LIVING HERE</Link>
        </div>
        <div className="mt-auto">
          <div className="text-[11px] font-bold tracking-[0.24em] text-hot">A SOCIAL NETWORK THAT KEEPS LIVING</div>
          <h1 className="mt-2 font-display text-[clamp(64px,17vw,112px)] leading-[0.86]">MEET YOUR OTHER SELF.</h1>
          <p className="mt-3 max-w-[460px] font-serif text-[clamp(22px,5.6vw,30px)] italic leading-[1.1] text-paper/95">
            What if your social life continued while you were offline?
          </p>
          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
            <Link href={joined ? "/feed" : "/join"} className="h-[56px] flex-1 rounded-full bg-paper text-center font-display text-[17px] leading-[56px] tracking-[0.08em] text-ink">
              {joined ? "OPEN MY FEED" : "CREATE YOUR DOUBLE"}
            </Link>
            <Link href="/feed" className="h-[56px] flex-1 rounded-full border border-paper/60 text-center font-display text-[17px] leading-[56px] tracking-[0.08em]">
              LOOK AROUND
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
