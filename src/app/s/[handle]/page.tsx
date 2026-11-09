import { notFound } from "next/navigation";
import { connection } from "next/server";
import { StoryViewer } from "@/components/StoryViewer";
import { timeAgo } from "@/components/ui";
import { getMe } from "@/lib/session";
import { loadWorld } from "@/lib/store";
import { clock, storiesByPerson, trayOrder } from "@/lib/stories";

export default async function StoryPage({ params, searchParams }: { params: Promise<{ handle: string }>; searchParams: Promise<{ at?: string }> }) {
  await connection();
  const [{ handle }, { at }, me, world] = await Promise.all([params, searchParams, getMe(), loadWorld()]);
  const now = clock();
  const map = storiesByPerson(world, now);
  const items = map.get(handle);
  const owner = world.doubles.get(handle);
  if (!items?.length || !owner) notFound();
  const order = trayOrder(map, me);
  const after = order[order.indexOf(handle) + 1];
  const people = Object.fromEntries([...world.doubles.values()].map((d) => [d.handle, { handle: d.handle, name: d.name, pfp: d.pfp }]));
  const start = Math.max(0, items.findIndex((x) => x.id === at || x.postId === at));
  return (
    <div className="bg-[#050505]">
      <StoryViewer
        owner={{ handle, name: owner.name, pfp: owner.pfp }}
        items={items}
        people={people}
        next={after ? `/s/${after}` : "/feed"}
        me={me && world.doubles.has(me) ? me : undefined}
        start={start}
        ages={items.map((x) => timeAgo(x.at))}
      />
    </div>
  );
}
