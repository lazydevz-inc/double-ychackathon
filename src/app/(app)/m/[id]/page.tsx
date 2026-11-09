import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoVideo } from "@/components/AutoVideo";
import { Like } from "@/components/Like";
import { Nudge } from "@/components/Nudge";
import { Avatar, Tag, timeAgo } from "@/components/ui";
import { getMe } from "@/lib/session";
import { loadWorld } from "@/lib/store";

export default async function Moment({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [me, world] = await Promise.all([getMe(), loadWorld()]);
  const post = world.posts.find((p) => p.id === id);
  if (!post) notFound();
  const people = [post.author, ...post.with];
  const comments = [...post.comments, ...(world.extraComments.get(id) ?? [])];
  const mine = me ? world.doubles.get(me) : undefined;
  const a = world.doubles.get(post.author);

  return (
    <div>
      <div className="grain relative aspect-[4/5] overflow-hidden bg-card">
        <AutoVideo src={world.videos.get(id)} poster={post.image} className="absolute inset-0 h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.5)_0%,rgba(0,0,0,0)_20%,rgba(0,0,0,0)_62%,rgba(10,10,10,1)_100%)]" />
        <Link href="/feed" aria-label="Back" className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/55">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f5f1ea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
        </Link>
      </div>

      <div className="relative -mt-14 px-4">
        <Tag>{post.place} · {timeAgo(post.createdAt)} ago</Tag>
        {post.title && <h1 className="mt-1 font-display text-[44px] uppercase leading-[0.92]">{post.title}</h1>}
        <p className="mt-3 border-l-2 border-hot pl-3 font-serif text-[22px] italic leading-[1.15]">“{post.caption}”</p>
        <div className="mt-1.5 pl-3.5 text-[12px] text-mute">— {a?.name ?? post.author}</div>

        <div className="mt-4 flex gap-2">
          {people.map((h) => (
            <Link key={h} href={`/u/${h}`} className="flex items-center gap-2 rounded-full border border-edge py-1 pl-1 pr-3 text-[12.5px] font-semibold">
              <Avatar d={world.doubles.get(h)} size={24} />
              {h === me ? "You" : (world.doubles.get(h)?.name ?? h)}
            </Link>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-5 border-b border-line pb-3">
          <Like count={post.likes} />
          <span className="text-[12.5px] text-mute">{comments.length} comments</span>
        </div>
      </div>

      <div className="space-y-3.5 px-4 py-4">
        {comments.map((c, i) => (
          <div key={i} className="flex gap-2.5 text-[13.5px] leading-snug">
            <Link href={`/u/${c.author}`}><Avatar d={world.doubles.get(c.author)} size={28} /></Link>
            <p><Link href={`/u/${c.author}`} className="font-semibold">{c.author}</Link> <span className="text-[#d8d2c8]">{c.text}</span></p>
          </div>
        ))}
      </div>
      <Nudge postId={id} me={mine ? me : undefined} pfp={mine?.pfp} />
    </div>
  );
}
