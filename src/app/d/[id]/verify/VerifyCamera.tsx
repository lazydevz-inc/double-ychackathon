"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Loading } from "@/components/Loading";
import { postJob } from "@/components/ndjson";

const STEPS = ["Look straight at the camera", "Turn slightly to your left", "Now slightly to your right"];

type Phase = "intro" | "camera" | "checking" | "passed" | "failed" | "denied";

export function VerifyCamera({ id, name, handle, hero }: { id: string; name: string; handle: string; hero: string }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [step, setStep] = useState(0);
  const [shots, setShots] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [stage, setStage] = useState<string | null>(null);

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };
  useEffect(() => stop, []);

  function grab() {
    const v = videoRef.current!;
    const side = Math.min(v.videoWidth, v.videoHeight);
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    c.getContext("2d")!.drawImage(v, (v.videoWidth - side) / 2, (v.videoHeight - side) / 2, side, side, 0, 0, 512, 512);
    return c.toDataURL("image/jpeg", 0.85);
  }

  async function start() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 720, height: 720 }, audio: false });
      streamRef.current = s;
      setPhase("camera");
      setShots([]);
      setStep(0);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play();
        }
      });
      const frames: string[] = [];
      for (let k = 0; k < STEPS.length; k++) {
        setStep(k);
        await new Promise((r) => setTimeout(r, k === 0 ? 2200 : 1800));
        frames.push(grab());
        setShots([...frames]);
      }
      stop();
      setPhase("checking");
      const res = await fetch(`/api/doubles/${id}/verify`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ frames }) }).then((r) => r.json());
      setNote(res.note ?? res.error ?? "");
      setPhase(res.verified ? "passed" : "failed");
    } catch (e) {
      stop();
      setNote(e instanceof Error ? e.message : String(e));
      setPhase("denied");
    }
  }

  async function useAvatar() {
    try {
      setStage("Drawing your avatar");
      await postJob(`/api/doubles/${id}/avatar`, JSON.stringify({ style: "illustration" }), setStage, true);
      router.push(`/d/${id}`);
    } catch (e) {
      setStage(null);
      setNote(e instanceof Error ? e.message : String(e));
    }
  }

  const progress = phase === "camera" ? ((step + (shots.length > step ? 1 : 0)) / STEPS.length) * 100 : phase === "checking" || phase === "passed" ? 100 : 0;

  return (
    <section className="mx-auto w-full max-w-md flex-1 px-5 py-8 flex flex-col items-center gap-6">
      {stage && <Loading stage={stage} sub="Your face is never used for an avatar." />}
      <div className="self-stretch">
        <p className="font-display uppercase tracking-[0.3em] text-[#4aa3ff] text-xs">Verify @{handle}</p>
        <h1 className="font-serif text-4xl leading-tight mt-2">
          Prove it&apos;s <span className="italic">really you.</span>
        </h1>
        <p className="text-mute text-sm mt-2">
          We compare three live selfie frames with the face in your posts. Pass, and {name}&apos;s Double gets the blue check and can be
          animated with AI video.
        </p>
      </div>

      <div className="relative h-64 w-64">
        <svg viewBox="0 0 260 260" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="130" cy="130" r="124" fill="none" stroke="#2a2724" strokeWidth="6" />
          <circle cx="130" cy="130" r="124" fill="none" stroke="#4aa3ff" strokeWidth="6" strokeLinecap="round" strokeDasharray="779" strokeDashoffset={779 - (779 * progress) / 100} style={{ transition: "stroke-dashoffset .4s" }} />
        </svg>
        <div className="absolute inset-[14px] overflow-hidden rounded-full bg-white/5">
          {phase === "camera" ? (
            <video ref={videoRef} muted playsInline className="h-full w-full object-cover -scale-x-100" />
          ) : (
            <img src={hero} alt="" className={`h-full w-full object-cover ${phase === "passed" ? "" : "opacity-60"}`} />
          )}
        </div>
        {phase === "passed" && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-[#4aa3ff] px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-ink">Verified</span>
        )}
      </div>

      <p className="font-display uppercase tracking-widest text-sm text-center min-h-5">
        {phase === "camera" ? STEPS[step] : phase === "checking" ? "Checking it's you…" : ""}
      </p>

      {shots.length > 0 && phase !== "passed" && (
        <div className="flex gap-2">
          {shots.map((s, k) => (
            <img key={k} src={s} alt="" className="h-14 w-14 rounded-lg object-cover -scale-x-100" />
          ))}
        </div>
      )}

      {note && phase !== "camera" && <p className={`self-stretch rounded-xl px-4 py-3 text-sm ${phase === "passed" ? "bg-[#4aa3ff]/15 border border-[#4aa3ff]/40" : "bg-hot/15 border border-hot/40"}`}>{note}</p>}

      <div className="self-stretch mt-auto space-y-3">
        {(phase === "intro" || phase === "failed" || phase === "denied") && (
          <button onClick={start} className="w-full rounded-full bg-paper py-4 font-display uppercase tracking-widest text-ink">
            {phase === "intro" ? "Start selfie check" : "Try again"}
          </button>
        )}
        {phase === "passed" && (
          <Link href={`/d/${id}`} className="block w-full rounded-full bg-[#4aa3ff] py-4 text-center font-display uppercase tracking-widest text-ink">
            See my verified Double
          </Link>
        )}
        {(phase === "failed" || phase === "denied") && (
          <button onClick={useAvatar} className="w-full rounded-full border border-gold py-4 font-display uppercase tracking-widest text-gold">
            Use an avatar instead
          </button>
        )}
        <p className="text-center text-xs text-mute">The selfie frames are checked once and not stored. Hackathon PoC check, not a certified ID system.</p>
      </div>
    </section>
  );
}
