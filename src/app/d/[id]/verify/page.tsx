import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAvatar, isVerified, visuals } from "@/lib/identity";
import { loadDouble } from "@/lib/store";
import { VerifyCamera } from "./VerifyCamera";

export default async function VerifyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await loadDouble(id);
  if (!d) notFound();
  if (isAvatar(d) || isVerified(d)) redirect(`/d/${id}`);
  return (
    <main className="min-h-dvh flex flex-col">
      <header className="px-5 pt-6 flex items-center justify-between">
        <Link href="/" className="font-display text-2xl tracking-tight">
          DOUBLE<span className="text-hot">.</span>
        </Link>
        <Link href={`/d/${id}`} className="text-sm text-mute hover:text-paper">
          Skip for now
        </Link>
      </header>
      <VerifyCamera id={d.id} name={d.name} handle={d.handle} hero={visuals(d).hero} />
    </main>
  );
}
