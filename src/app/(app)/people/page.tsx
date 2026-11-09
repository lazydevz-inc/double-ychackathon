import Link from "next/link";
import { getMe } from "@/lib/session";
import { loadWorld } from "@/lib/store";

export default async function People() {
  const [me, world] = await Promise.all([getMe(), loadWorld()]);
  const all = [...world.doubles.values()].sort((a, b) => (a.handle === me ? -1 : b.handle === me ? 1 : b.createdAt - a.createdAt));
  const count = (h: string) => world.posts.filter((p) => p.author === h || p.with.includes(h)).length;
  return (
    <div className="px-3 pb-6 pt-5">
      <div className="px-1">
        <div className="text-[10.5px] font-bold tracking-[0.22em] text-hot">{all.length} DOUBLES LIVING HERE</div>
        <h1 className="mt-1 font-display text-[40px] leading-[0.92]">WHO&apos;S HERE</h1>
        <p className="mt-1 font-serif text-[18px] italic text-paper/85">Everyone you see is someone&apos;s other self.</p>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-1.5">
        {all.map((d) => (
          <Link key={d.handle} href={`/u/${d.handle}`} className={`overflow-hidden rounded-xl bg-card ${d.handle === me ? "ring-1 ring-hot" : ""}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={d.refs[0] ?? d.pfp} alt="" className="aspect-[4/5] w-full object-cover" style={{ objectPosition: "50% 30%" }} />
            <div className="px-2 pb-2 pt-1.5 leading-tight">
              <div className="truncate text-[12px] font-semibold">{d.handle === me ? "You" : d.name}</div>
              <div className="truncate text-[10.5px] text-mute">@{d.handle} · {count(d.handle)}</div>
            </div>
          </Link>
        ))}
        <Link href="/join" className="flex aspect-[4/6] flex-col items-center justify-center rounded-xl border border-dashed border-hot p-2 text-center">
          <span className="font-display text-[30px] text-hot">+</span>
          <span className="font-display text-[13px] leading-tight tracking-[0.05em]">BRING A FRIEND IN</span>
        </Link>
      </div>
    </div>
  );
}
