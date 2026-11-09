import { ImageResponse } from "next/og";
import { badgeOf, visuals } from "@/lib/identity";
import { loadDouble } from "@/lib/store";

// 1080x1920 Story image of the cast reveal, for "Save for my Story".

async function googleFont(family: string, weight = 400, italic = false) {
  const css = await (
    await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:${italic ? "ital," : ""}wght@${italic ? "1," : ""}${weight}`)
  ).text();
  const url = css.match(/src: url\((.+?)\) format/)?.[1];
  if (!url) throw new Error(`font ${family} not found`);
  return (await fetch(url)).arrayBuffer();
}

let fonts: Promise<{ name: string; data: ArrayBuffer; style: "normal" | "italic"; weight: 400 }[]> | null = null;
const loadFonts = () =>
  (fonts ??= Promise.all([
    googleFont("Anton").then((data) => ({ name: "Anton", data, style: "normal" as const, weight: 400 as const })),
    googleFont("Instrument Serif", 400, true).then((data) => ({ name: "Serif", data, style: "italic" as const, weight: 400 as const })),
    googleFont("Inter", 400).then((data) => ({ name: "Inter", data, style: "normal" as const, weight: 400 as const })),
  ]));

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await loadDouble(id);
  if (!d) return new Response("not found", { status: 404 });
  const p = d.persona;
  const hero = visuals(d).hero;
  const badge = badgeOf(d);

  return new ImageResponse(
    (
      <div style={{ width: 1080, height: 1920, display: "flex", position: "relative", background: "#000", color: "#f5f1ea", fontFamily: "Inter" }}>
        <img src={hero} alt="" width={1080} height={1920} style={{ position: "absolute", inset: 0, width: 1080, height: 1920, objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", background: "linear-gradient(180deg, rgba(0,0,0,.7) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,.15) 50%, rgba(0,0,0,.96) 100%)" }} />
        <div style={{ position: "absolute", top: 64, left: 64, right: 64, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 30, letterSpacing: 8, textTransform: "uppercase" }}>
          <span style={{ fontFamily: "Anton" }}>DOUBLE. ORIGINALS</span>
          <span style={{ background: "#ff2d55", color: "#fff", padding: "12px 28px", borderRadius: 999 }}>Cast reveal</span>
        </div>
        <div style={{ position: "absolute", left: 72, right: 72, bottom: 96, display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 28, letterSpacing: 9, textTransform: "uppercase", opacity: 0.85, display: "flex", alignItems: "center", gap: 16 }}>Inspired by @{d.handle}&apos;s feed{badge === "verified" ? <span style={{ background: "#4aa3ff", color: "#0a0a0a", borderRadius: 999, padding: "4px 16px", fontSize: 22, letterSpacing: 4 }}>Verified</span> : badge === "avatar" ? <span style={{ border: "2px solid #e8c27a", color: "#e8c27a", borderRadius: 999, padding: "4px 16px", fontSize: 22, letterSpacing: 4 }}>Avatar</span> : null}</span>
          <span style={{ fontFamily: "Anton", fontSize: p.archetype.length > 18 ? 150 : 190, lineHeight: 0.9, textTransform: "uppercase", marginTop: 20 }}>{p.archetype}</span>
          <span style={{ fontFamily: "Serif", fontStyle: "italic", fontSize: 58, lineHeight: 1.15, marginTop: 28 }}>{p.tagline}</span>
          <div style={{ display: "flex", gap: 18, marginTop: 36 }}>
            {p.traits.map((t) => (
              <span key={t} style={{ border: "2px solid rgba(245,241,234,.7)", borderRadius: 999, padding: "10px 26px", fontSize: 28, letterSpacing: 4, textTransform: "uppercase" }}>
                {t}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", marginTop: 44, borderLeft: "6px solid #ff2d55", paddingLeft: 28, fontSize: 36, lineHeight: 1.35 }}>“{p.roast}”</div>
          <span style={{ marginTop: 52, fontSize: 24, letterSpacing: 7, textTransform: "uppercase", opacity: 0.6 }}>Fictional Double · cast yours at double.show</span>
        </div>
      </div>
    ),
    { width: 1080, height: 1920, fonts: await loadFonts() },
  );
}
