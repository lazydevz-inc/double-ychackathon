import Link from "next/link";
import house from "@/data/house.json";
import { visuals } from "@/lib/identity";
import { loadDouble } from "@/lib/store";
import { CreateForm } from "./CreateForm";

export default async function CreatePage({ searchParams }: { searchParams: Promise<{ with?: string }> }) {
  const { with: withId } = await searchParams;
  const inviter = withId ? await loadDouble(withId) : null;
  // a house wildcard joins every crossover so there is always a third party to scheme with
  const wildcard = (house as string[]).find((h) => h !== inviter?.id);
  return (
    <main className="min-h-dvh">
      <header className="px-5 pt-6">
        <Link href="/" className="font-display text-2xl tracking-tight">
          DOUBLE<span className="text-hot">.</span>
        </Link>
      </header>
      <CreateForm
        inviter={
          inviter
            ? { id: inviter.id, name: inviter.name, handle: inviter.handle, portrait: visuals(inviter).hero, archetype: inviter.persona.archetype }
            : null
        }
        wildcard={inviter ? wildcard : undefined}
      />
    </main>
  );
}
