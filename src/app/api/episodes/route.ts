import { nanoid } from "nanoid";
import { runEpisode } from "@/lib/engine";
import { loadDoubles, loadEpisode, saveEpisode } from "@/lib/store";
import { streamJob } from "@/lib/stream";
import type { Lang } from "@/lib/types";

export const maxDuration = 300;

export async function POST(req: Request) {
  const body = (await req.json()) as { cast?: string[]; lang?: Lang; parentId?: string; optionId?: string };
  return streamJob(async (emit) => {
    const prev = body.parentId ? await loadEpisode(body.parentId) : undefined;
    if (body.parentId && !prev) throw new Error("Previous episode not found");
    const castIds = prev?.cast ?? [...new Set(body.cast ?? [])];
    if (castIds.length < 2 || castIds.length > 5) throw new Error("Need 2-5 cast members");
    emit({ type: "stage", stage: "casting", detail: "Calling the cast into the house" });
    const cast = await loadDoubles(castIds);
    if (cast.length !== castIds.length) throw new Error("Some cast members were not found");
    const lang: Lang = prev?.lang ?? body.lang ?? cast[0].lang;
    const id = nanoid(10);
    const episode = await runEpisode({
      id,
      cast,
      lang,
      prev: prev ?? undefined,
      choice: prev && body.optionId ? { doubleId: prev.cliffhanger.doubleId, optionId: body.optionId } : undefined,
      onStage: (stage, detail) => emit({ type: "stage", stage, detail }),
    });
    await saveEpisode(episode);
    return id;
  });
}
