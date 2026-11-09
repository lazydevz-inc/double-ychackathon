import Link from "next/link";
import type { Comment, Double, Post } from "@/lib/types";
import { AutoVideo } from "./AutoVideo";
import { Like } from "./Like";
import { Pair, Tag, firstName, timeAgo } from "./ui";

/**
 * The DOUBLE unit: two people, one moment, shown like a film still that moves.
 * Title in Anton, the author's words as a serif quote, the place as a red slug line.
 */
export function MomentCard({ post, doubles, video, extra = [], me }: { post: Post; doubles: Map<string, Double>; video?: string; extra?: Comment[]; me?: string }) {
  const a = doubles.get(post.author);
  const b = doubles.get(post.with[0]);
  const withMe = !!me && (post.author === me || post.with.includes(me));
  const comments = [...post.comments, ...extra];
  return (
    <article className="pb-6">
      <div className="flex items-center gap-2.5 px-4 pb-2.5">
        <Pair a={a} b={b} size={32} />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[13.5px]">
            <Link href={`/u/${post.author}`} className="font-semibold">{post.author === me ? "You" : firstName(a, post.author)}</Link>
            <span className="text-mute"> & </span>
            <Link href={`/u/${post.with[0]}`} className="font-semibold">{post.with[0] === me ? "you" : firstName(b, post.with[0])}</Link>
          </div>
          <div className="truncate text-[11.5px] text-mute">{post.place} · {timeAgo(post.createdAt)}</div>
        </div>
        {withMe && <span className="rounded-md bg-hot px-2 py-1 text-[10px] font-bold tracking-[0.15em] text-white">WITH YOU</span>}
      </div>

      <Link href={`/m/${post.id}`} className="grain relative block aspect-[4/5] overflow-hidden bg-card">
        <AutoVideo src={video} poster={post.image} className="absolute inset-0 h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.35)_0%,rgba(0,0,0,0)_18%,rgba(0,0,0,0)_50%,rgba(0,0,0,0.88)_100%)]" />
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold tracking-[0.18em]">
          <span className={`h-1.5 w-1.5 rounded-full ${video ? "bg-hot" : "bg-mute"}`} />
          {video ? "MOMENT" : "STILL"}
        </div>
        <div className="absolute inset-x-4 bottom-4">
          <Tag>{post.place}</Tag>
          {post.title && <h2 className="mt-1 font-display text-[34px] uppercase leading-[0.95]">{post.title}</h2>}
          <p className="mt-1.5 line-clamp-2 font-serif text-[18px] italic leading-[1.2] text-paper/95">“{post.caption}”</p>
        </div>
      </Link>

      <div className="flex items-center gap-5 px-4 pt-3">
        <Like count={post.likes} />
        <Link href={`/m/${post.id}`} className="flex items-center gap-1.5 text-[13px] font-semibold" aria-label="Comments">
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="#f5f1ea" strokeWidth="1.9" strokeLinejoin="round" aria-hidden><path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z" /></svg>
          {comments.length}
        </Link>
      </div>
      <div className="space-y-1 px-4 pt-2 text-[13.5px] leading-snug">
        {comments.slice(-2).map((c, i) => (
          <p key={i} className="text-[#d8d2c8]">
            <Link href={`/u/${c.author}`} className="font-semibold text-paper">{c.author}</Link> {c.text}
          </p>
        ))}
        {comments.length > 2 && (
          <Link href={`/m/${post.id}`} className="block text-[12.5px] text-dim">View all {comments.length} comments</Link>
        )}
      </div>
    </article>
  );
}
