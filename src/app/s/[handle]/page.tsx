import { notFound } from "next/navigation";
import { StoryViewer } from "@/components/StoryViewer";
import { timeAgo } from "@/components/ui";
import { getMe } from "@/lib/session";
import { loadWorld } from "@/lib/store";

export default async function StoryPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const [me, world] = await Promise.all([getMe(), loadWorld()]);
  const story = world.stories.find((s) => s.author === handle);
  if (!story) notFound();
  const authors = [...new Set(world.stories.map((s) => s.author))];
  const after = authors[authors.indexOf(handle) + 1];
  return (
    <div className="bg-[#050505]">
      <StoryViewer story={story} author={handle} pfp={world.doubles.get(handle)?.pfp} next={after ? `/s/${after}` : "/feed"} me={me} ago={timeAgo(story.createdAt)} />
    </div>
  );
}
