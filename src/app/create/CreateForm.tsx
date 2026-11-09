"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loading } from "@/components/Loading";
import { postJob } from "@/components/ndjson";
import type { AvatarStyle, Lang } from "@/lib/types";

async function shrink(file: File, max = 1080): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.86));
}

type Inviter = { id: string; name: string; handle: string; portrait?: string; archetype: string } | null;

export function CreateForm({ inviter, wildcard }: { inviter: Inviter; wildcard?: string }) {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [lang, setLang] = useState<Lang>("en");
  const [files, setFiles] = useState<File[]>([]);
  const [upload, setUpload] = useState(false);
  const [identity, setIdentity] = useState<"real" | "avatar">("real");
  const [style, setStyle] = useState<AvatarStyle>("illustration");
  const [stage, setStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const add = (list: FileList | null) => {
    if (!list) return;
    setFiles((f) => [...f, ...Array.from(list).filter((x) => x.type.startsWith("image/"))].slice(0, 9));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      setStage(upload ? "Packing your posts" : `Looking up @${handle}`);
      const form = new FormData();
      form.set("handle", handle);
      if (name) form.set("name", name);
      if (bio) form.set("bio", bio);
      form.set("lang", lang);
      form.set("identity", identity);
      form.set("style", style);
      if (upload) {
        const shrunk = await Promise.all(files.map((f) => shrink(f)));
        shrunk.forEach((b, i) => form.append("photos", new File([b], `post-${i}.jpg`, { type: "image/jpeg" })));
      }
      const id = await postJob("/api/doubles", form, setStage);
      if (inviter) {
        setStage("Booking your crossover episode");
        const cast = [inviter.id, id, ...(wildcard ? [wildcard] : [])];
        const ep = await postJob("/api/episodes", JSON.stringify({ cast, lang }), setStage, true);
        router.push(`/e/${ep}`);
      } else {
        // real-face Doubles go straight to the selfie check (skippable); avatars are done
        router.push(identity === "real" ? `/d/${id}/verify` : `/d/${id}`);
      }
    } catch (err) {
      setStage(null);
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const ready = handle.trim() && (!upload || files.length >= 3);

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-xl px-5 py-10 space-y-8">
      {stage && <Loading stage={stage} sub="This takes about a minute. Your first story is being written." />}

      {inviter ? (
        <div className="relative overflow-hidden rounded-2xl border border-hot/40 bg-hot/10 p-5 flex gap-4 items-center">
          {inviter.portrait && <img src={inviter.portrait} alt="" className="h-20 w-14 rounded-lg object-cover" />}
          <div>
            <p className="font-display uppercase tracking-widest text-hot text-xs">Crossover invite</p>
            <p className="font-serif text-2xl leading-tight">
              <span className="italic">{inviter.name}</span>&apos;s Double ({inviter.archetype}) wants you in their next story.
            </p>
            <p className="text-mute text-sm mt-1">Cast your Double and the episode starts right away.</p>
          </div>
        </div>
      ) : (
        <div>
          <p className="font-display uppercase tracking-[0.3em] text-hot text-xs">Step 1 · Casting call</p>
          <h1 className="font-serif text-5xl leading-none mt-2">
            Show us your <span className="italic">feed</span>.
          </h1>
          <p className="text-mute mt-3">Drop your @handle. We read your latest public posts and cast your Double from them.</p>
        </div>
      )}

      <label className="block">
        <span className="text-xs uppercase tracking-widest text-mute">Instagram</span>
        <div className="mt-1 flex items-center rounded-2xl bg-white/5 border border-white/15 focus-within:border-paper/70">
          <span className="pl-5 text-2xl text-mute">@</span>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value.replace(/^@/, "").trim())}
            placeholder="yourhandle"
            className="w-full bg-transparent px-2 py-4 text-2xl outline-none"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
      </label>

      <label className="block">
        <span className="text-xs uppercase tracking-widest text-mute">Name on the show (optional)</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="defaults to your Instagram name"
          className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 outline-none focus:border-paper/60"
        />
      </label>

      {!upload ? (
        <button type="button" onClick={() => setUpload(true)} className="text-sm text-mute underline underline-offset-4 hover:text-paper">
          Private account? Upload photos instead
        </button>
      ) : (
      <div>
        <span className="text-xs uppercase tracking-widest text-mute">Your posts ({files.length}/9)</span>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {files.map((f, i) => (
            <div key={i} className="relative aspect-[4/5] overflow-hidden rounded-lg bg-white/5">
              <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded bg-hot px-1.5 py-0.5 text-[10px] font-bold uppercase">Cast photo</span>
              )}
              <button
                type="button"
                onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))}
                className="absolute right-1.5 top-1.5 h-6 w-6 rounded-full bg-black/70 text-xs"
                aria-label="Remove"
              >
                ✕
              </button>
            </div>
          ))}
          {files.length < 9 && (
            <label className="flex aspect-[4/5] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-white/25 text-mute hover:border-paper/60 hover:text-paper">
              <span className="text-3xl leading-none">+</span>
              <span className="mt-1 text-xs">Add posts</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => add(e.target.files)} />
            </label>
          )}
        </div>
      </div>

      )}

      {upload && (
      <label className="block">
        <span className="text-xs uppercase tracking-widest text-mute">Bio or a few captions (optional)</span>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={2}
          placeholder="paste your bio or favourite captions"
          className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 outline-none focus:border-paper/60"
        />
      </label>
      )}

      <div>
        <span className="text-xs uppercase tracking-widest text-mute">How should your Double appear?</span>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setIdentity("real")}
            className={`rounded-2xl border p-4 text-left transition ${identity === "real" ? "border-paper bg-white/[0.06]" : "border-white/15 text-mute"}`}
          >
            <span className="flex items-center gap-2 font-display uppercase text-lg text-paper">
              Real me <span className="rounded-full bg-[#4aa3ff] px-2 py-0.5 font-sans text-[9px] font-bold tracking-wider text-ink">VERIFIED</span>
            </span>
            <span className="mt-1 block text-xs leading-relaxed">Your real posts and reels. A 5-second selfie adds the blue check.</span>
          </button>
          <button
            type="button"
            onClick={() => setIdentity("avatar")}
            className={`rounded-2xl border p-4 text-left transition ${identity === "avatar" ? "border-gold bg-gold/10" : "border-white/15 text-mute"}`}
          >
            <span className="flex items-center gap-2 font-display uppercase text-lg text-paper">
              Avatar <span className="rounded-full border border-gold px-2 py-0.5 font-sans text-[9px] font-bold tracking-wider text-gold">NO FACE</span>
            </span>
            <span className="mt-1 block text-xs leading-relaxed">Your style, not your face. We draw a character from your outfits and colors.</span>
          </button>
        </div>
        {identity === "avatar" && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-mute">Style</span>
            {(["illustration", "3d"] as const).map((st) => (
              <button
                type="button"
                key={st}
                onClick={() => setStyle(st)}
                className={`rounded-full px-4 py-1.5 text-sm border ${style === st ? "bg-paper text-ink border-paper" : "border-white/20 text-mute"}`}
              >
                {st === "illustration" ? "Illustration" : "3D"}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs uppercase tracking-widest text-mute">Show language</span>
        {(["en", "ko"] as const).map((l) => (
          <button
            type="button"
            key={l}
            onClick={() => setLang(l)}
            className={`rounded-full px-4 py-1.5 text-sm border ${lang === l ? "bg-paper text-ink border-paper" : "border-white/20 text-mute"}`}
          >
            {l === "en" ? "English" : "한국어"}
          </button>
        ))}
      </div>

      {error && <p className="rounded-xl bg-hot/15 border border-hot/40 px-4 py-3 text-sm">{error}</p>}

      <button
        disabled={!ready}
        className="w-full rounded-full bg-paper py-4 font-display uppercase tracking-widest text-ink text-lg disabled:opacity-30"
      >
        {inviter ? "Join the story" : upload ? "Cast my Double" : "Pull my posts"}
      </button>
      <p className="text-center text-xs text-mute">
        We only read public posts. Your Double is a fictional character inspired by them. Nothing is posted anywhere.
      </p>
    </form>
  );
}
