import { BottomNav } from "@/components/BottomNav";
import { getMe } from "@/lib/session";
import { loadDouble } from "@/lib/store";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  const d = me ? await loadDouble(me) : null;
  return (
    <div className="min-h-dvh bg-[#050505]">
      <div className="relative mx-auto flex min-h-dvh max-w-[440px] flex-col border-x border-line bg-ink">
        <main className="flex-1">{children}</main>
        <BottomNav me={d ? me : undefined} pfp={d?.pfp} />
      </div>
    </div>
  );
}
