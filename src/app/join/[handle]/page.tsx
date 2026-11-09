import { JoinProgress } from "./JoinProgress";

export default async function Joining({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return <JoinProgress handle={handle} />;
}
