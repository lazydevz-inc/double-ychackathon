import { nanoid } from "nanoid";
import { MAX_PHOTOS } from "@/lib/config";
import { fetchInstagram } from "@/lib/instagram";
import { makeAvatar } from "@/lib/avatar";
import { castPersona } from "@/lib/persona";
import { fetchBytes, putImage, saveDouble } from "@/lib/store";
import { streamJob } from "@/lib/stream";
import type { AvatarStyle, Double, Lang } from "@/lib/types";

export const maxDuration = 300;

const MAX_CLIP_BYTES = 25 * 1024 * 1024;

export async function POST(req: Request) {
  const form = await req.formData();
  const handle = String(form.get("handle") ?? "").replace(/^@/, "").trim();
  const nameIn = String(form.get("name") ?? "").trim();
  const bioIn = String(form.get("bio") ?? "").trim();
  const lang: Lang = form.get("lang") === "ko" ? "ko" : "en";
  const house = form.get("house") === "1";
  const identity: Double["identity"] = form.get("identity") === "avatar" ? "avatar" : "real";
  const style: AvatarStyle = form.get("style") === "3d" ? "3d" : "illustration";
  const files = form.getAll("photos").filter((f): f is File => f instanceof File).slice(0, MAX_PHOTOS);
  if (!handle) return Response.json({ error: "Need an Instagram handle" }, { status: 400 });
  if (files.length > 0 && files.length < 3) return Response.json({ error: "Upload at least 3 photos" }, { status: 400 });

  return streamJob(async (emit) => {
    const id = nanoid(10);
    let photos: string[];
    let captions: string[] | undefined;
    let clips: string[] | undefined;
    let name = nameIn || handle;
    let bio = bioIn;
    let followers: number | undefined;
    let verified: boolean | undefined;
    let source: Double["source"];

    if (files.length) {
      source = "upload";
      emit({ type: "stage", stage: "upload", detail: "Uploading your posts" });
      photos = await Promise.all(
        files.map((f, i) => putImage(`doubles/${id}/post-${i}.${f.type.split("/")[1] ?? "jpg"}`, f, f.type || "image/jpeg")),
      );
    } else {
      source = "instagram";
      emit({ type: "stage", stage: "instagram", detail: `Pulling @${handle}'s latest posts` });
      const ig = await fetchInstagram(handle);
      name = nameIn || ig.fullName;
      bio = bioIn || ig.bio;
      followers = ig.followers;
      verified = ig.verified;
      emit({ type: "stage", stage: "copy", detail: `Saving ${ig.photos.length} posts` });
      // IG CDN links expire, so keep our own copies
      photos = await Promise.all(
        ig.photos.map(async (p, i) => putImage(`doubles/${id}/post-${i}.jpg`, await fetchBytes(p.url), "image/jpeg")),
      );
      captions = ig.photos.map((p) => p.caption);
      const copied = await Promise.all(
        ig.clips.slice(0, 2).map(async (url, i) => {
          try {
            const bytes = await fetchBytes(url);
            if (bytes.byteLength > MAX_CLIP_BYTES) return null;
            return await putImage(`doubles/${id}/clip-${i}.mp4`, bytes, "video/mp4");
          } catch (e) {
            console.error("clip copy failed", e);
            return null;
          }
        }),
      );
      clips = copied.filter((c): c is string => !!c);
    }

    emit({ type: "stage", stage: "persona", detail: "Reading the feed like a casting director" });
    const persona = await castPersona({ handle, name, bio, lang, photos, captions });
    let avatar: Double["avatar"];
    if (identity === "avatar") {
      emit({ type: "stage", stage: "avatar", detail: "Drawing your avatar (your face is never used)" });
      avatar = { style, images: await makeAvatar(id, persona, style) };
    }
    const double: Double = {
      identity,
      avatar,
      id,
      handle,
      name,
      lang,
      photos,
      captions,
      clips,
      portrait: photos[persona.hero],
      followers,
      verified,
      source,
      persona,
      house,
      createdAt: Date.now(),
    };
    await saveDouble(double);
    return id;
  });
}
