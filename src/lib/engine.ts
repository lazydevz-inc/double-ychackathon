import { generateText, Output } from "ai";
import { z } from "zod";
import { FAST, TEXT_MODEL } from "./config";
import type {
  ActionKind,
  ActorMove,
  Cliffhanger,
  Double,
  Episode,
  GameEvent,
  Lang,
  Relationship,
  Scene,
  WorldState,
} from "./types";

/*
 * Story engine = Director -> Actors -> Game Engine -> Showrunner.
 * The LLM never mutates world state directly: actors pick from a fixed action
 * set, the engine applies deterministic rules, and the showrunner only edits
 * what actually happened into scenes.
 */

const ACTIONS = ["ALLY", "BETRAY", "CHALLENGE", "PROTECT", "SABOTAGE", "CHARM"] as const;

// Scenario-neutral interpersonal beats. Internal ids are kept stable for the engine/state.
const ACTION_GUIDE = `ALLY = team up with someone on tonight's plan
CHALLENGE = clash with someone: argue, compete, call them out
PROTECT = back someone up, cover for them, help them shine
SABOTAGE = mess with someone's part: a prank, a stolen spotlight, a "mistake"
CHARM = flirt with, flatter or win someone over
BETRAY = double-cross someone who trusted you (rare; only if the scenario is competitive or it is truly in character)`;

/*
 * The product is "AI writes a new story starring you and the people you follow", not a
 * competition. Each episode is ONE scenario, picked to fit the cast's real posts. Rivalry and
 * alliances are just one genre ("survival").
 */
export const SCENARIOS = [
  { id: "road-trip", name: "Road Trip", brief: "One car, one playlist, a trip to somewhere one of them actually posted about. The plan falls apart on the way.", competitive: false },
  { id: "pop-up", name: "Pop-Up", brief: "They open a one-day pop-up together (café, shop, gallery) inspired by what they post. Opening hour goes wrong.", competitive: false },
  { id: "film-shoot", name: "Film Shoot", brief: "They shoot a short film or music video. Roles, egos and the director's chair are up for grabs.", competitive: false },
  { id: "heist", name: "The Heist", brief: "A playful heist to 'borrow' something iconic from one of their feeds before anyone notices.", competitive: false },
  { id: "fashion-week", name: "Fashion Week", brief: "Backstage at a show with one closing look and a wardrobe emergency.", competitive: false },
  { id: "blind-date", name: "Blind Date", brief: "Someone set them up on a double date. The matchmaking goes sideways.", competitive: false },
  { id: "talent-night", name: "Talent Night", brief: "Everyone must perform something they've never done before, live.", competitive: false },
  { id: "whodunit", name: "Whodunit", brief: "Something precious went missing and everyone is a suspect.", competitive: false },
  { id: "villa", name: "Villa Weekend", brief: "A group vacation where the itinerary, the rooms and the group chat all fall apart.", competitive: false },
  { id: "startup", name: "Startup Weekend", brief: "They launch a ridiculous startup in 48 hours based on their own habits.", competitive: false },
  { id: "survival", name: "Survival Game", brief: "A reality-show elimination game: immunity, a secret vote, alliances and betrayals.", competitive: true },
] as const;
export type ScenarioId = (typeof SCENARIOS)[number]["id"];
const SCENARIO_IDS = SCENARIOS.map((x) => x.id) as unknown as [ScenarioId, ...ScenarioId[]];
const scenarioOf = (id: string) => SCENARIOS.find((x) => x.id === id) ?? SCENARIOS[0];

function langLine(lang: Lang) {
  return lang === "ko"
    ? "Write every human-readable string in witty, natural Korean (예능 자막 톤). Keep names and @handles as-is."
    : "Write every human-readable string in English.";
}

function castSheet(cast: Double[]) {
  return cast
    .map(
      (d) =>
        `- id=${d.id} | ${d.name} (@${d.handle}) | ${d.persona.archetype} | traits: ${d.persona.traits.join(", ")} | wants: ${d.persona.desire} | flaw: ${d.persona.flaw} | voice: ${d.persona.voice} | hero post (face clearly visible): ${d.persona.hero ?? 0} | real feed receipts: ${d.persona.receipts.map((r) => `[post ${r.photo}] ${r.note}`).join(" / ")}${d.captions?.length ? ` | post captions: ${d.captions.map((c, i) => (c ? `[${i}] ${c.slice(0, 80)}` : "")).filter(Boolean).join(" / ")}` : ""}`,
    )
    .join("\n");
}

function relSheet(state: WorldState, cast: Double[]) {
  const name = (id: string) => cast.find((d) => d.id === id)?.name ?? id;
  const rels = state.relationships
    .filter((r) => r.trust || r.rivalry || r.spark)
    .map((r) => `${name(r.from)}→${name(r.to)}: trust ${r.trust}, rivalry ${r.rivalry}, spark ${r.spark}`);
  return [
    rels.length ? `Relationships:\n${rels.join("\n")}` : "Relationships: everyone just met.",
    state.history.length ? `What happened so far:\n${state.history.map((h, i) => `${i + 1}. ${h}`).join("\n")}` : "",
    `Points: ${cast.map((d) => `${d.name} ${state.points[d.id] ?? 0}`).join(", ")}`,
  ].join("\n");
}

export function emptyState(cast: Double[]): WorldState {
  const relationships: Relationship[] = [];
  for (const a of cast) for (const b of cast) if (a.id !== b.id) relationships.push({ from: a.id, to: b.id, trust: 0, rivalry: 0, spark: 0 });
  return { relationships, points: Object.fromEntries(cast.map((d) => [d.id, 0])), history: [] };
}

// ---------- 1. Director ----------

const directorSchema = z.object({
  scenario: z.enum(SCENARIO_IDS).describe("The scenario for this episode, chosen to fit the cast's real posts"),
  why: z.string().describe("Which real posts inspired this scenario, one line"),
  showTitle: z.string().describe('Episode-series title in caps, 2-4 words, NOT the word "DOUBLE". e.g. "THE BUSAN RUN", "OPENING NIGHT"'),
  episodeTitle: z.string().describe("Episode title, 2-5 words"),
  setting: z.string().describe("Where it happens. One sentence, max 120 chars"),
  challenge: z.string().describe("What they are trying to do together tonight, in ONE sentence a viewer gets in 3 seconds, max 140 chars"),
  stakes: z.string().describe("What could go wrong or what someone stands to gain. One sentence, max 110 chars"),
  dilemma: z.string().describe("The choice each of them faces about another cast member tonight. One sentence"),
  hook: z.string().describe("Cold-open line that makes you keep watching, max 70 chars"),
  secrets: z
    .array(z.object({ doubleId: z.string(), secret: z.string().describe("A private motive only this cast member has (a crush, a hidden talent, an embarrassment to hide, wanting credit), max 140 chars") }))
    .describe("One per cast member. Motives that create comedy, romance or tension inside this scenario"),
});

async function direct(cast: Double[], state: WorldState, lang: Lang, carry?: string, avoid: string[] = []) {
  const catalog = SCENARIOS.filter((x) => !avoid.includes(x.id))
    .map((x) => `- ${x.id}: ${x.name} — ${x.brief}`)
    .join("\n");
  const { output } = await generateText({
    model: TEXT_MODEL,
    system: `You are the head writer of DOUBLE, a social app where people's AI Doubles (built from their real Instagram) live out short stories with the people they follow. Viewers watch a 30-second episode about themselves and their people.
Pick ONE scenario from the catalog and set it up. Requirements:
- Choose the scenario that fits the cast's REAL posts best (a travel post suggests a road trip, a café post a pop-up, a campaign shoot a film shoot). Say which posts inspired it.
- Most episodes are adventures, comedies, romances or mysteries, not competitions. Only the survival scenario is about alliances, votes and elimination.
- One clear goal, one complication. Use at most one real-feed detail per cast member. No lists of props.
- Give EACH cast member a private motive (secrets[]) that creates comedy, romance or tension. Motives reference other cast members by name.
- Continue past events if any (who owes whom, crushes, grudges), but do not repeat the previous scenario or outcome.
- If a viewer decision is given, build the episode around it and make it pay off visibly.
${langLine(lang)} showTitle stays in English caps.

Scenario catalog:
${catalog}`,
    prompt: `Cast:\n${castSheet(cast)}\n\n${relSheet(state, cast)}${carry ? `\n\nViewer decision that MUST shape this episode: ${carry}` : ""}`,
    output: Output.object({ schema: directorSchema }),
    providerOptions: FAST,
  });
  return output;
}

// ---------- 2. Actors ----------

const moveSchema = z.object({
  action: z.enum(ACTIONS),
  targetId: z.string().describe("id of the cast member you act on"),
  publicLine: z.string().describe("What you say out loud in the house, in your voice, max 90 chars"),
  confessional: z.string().describe("What you tell the camera in the confessional, max 110 chars"),
  why: z.string().describe("One-line motive"),
});

async function act(
  me: Double,
  cast: Double[],
  setup: Awaited<ReturnType<typeof direct>>,
  state: WorldState,
  lang: Lang,
  secret: string | undefined,
  forced?: { action: ActionKind; targetId: string },
  incoming?: string,
): Promise<ActorMove> {
  const others = cast.filter((d) => d.id !== me.id);
  const { output } = await generateText({
    model: TEXT_MODEL,
    system: `You ARE ${me.name}'s Double on the reality show DOUBLE. Stay in character.
Your persona: ${me.persona.archetype}. Traits: ${me.persona.traits.join(", ")}. You want: ${me.persona.desire}. Your flaw: ${me.persona.flaw}. Voice: ${me.persona.voice}.
Pick ONE move for tonight from:
${ACTION_GUIDE}
Make the move your persona (and your flaw) would make inside THIS scenario. Don't repeat your move from last episode unless your persona truly would. Funny, warm and flirty moves are as good as dramatic ones; double-crossing is rare.
Talk like a real reality-TV cast member: short, petty, funny, specific. Mention at most one real-feed detail, and never recite catchphrases.
${langLine(lang)}`,
    prompt: `Scenario: ${scenarioOf(setup.scenario).name}\nTonight: ${setup.setting}\nGoal: ${setup.challenge}\nStakes: ${setup.stakes}\nDilemma: ${setup.dilemma}${secret ? `\nOnly you know: ${secret}` : ""}${incoming ? `\nHeads up: ${incoming}` : ""}\n\nOther cast:\n${castSheet(others)}\n\n${relSheet(state, cast)}${forced ? `\n\nYour owner decided your move: ${forced.action} on id=${forced.targetId}. You MUST use exactly that action and target; make it feel in character.` : ""}`,
    output: Output.object({ schema: moveSchema }),
    providerOptions: FAST,
  });
  let { action, targetId } = output;
  if (forced) ({ action, targetId } = forced);
  if (!others.some((o) => o.id === targetId)) targetId = others[0].id;
  return { doubleId: me.id, action, targetId, publicLine: output.publicLine, confessional: output.confessional, why: output.why, forced: !!forced };
}

// ---------- 3. Game engine (deterministic) ----------

function seeded(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export function resolve(cast: Double[], moves: ActorMove[], prev: WorldState, seed: string, competitive = false) {
  const state: WorldState = structuredClone(prev);
  const rel = (a: string, b: string) => state.relationships.find((r) => r.from === a && r.to === b)!;
  const name = (id: string) => cast.find((d) => d.id === id)?.name ?? id;
  const pts = (id: string, n: number) => (state.points[id] = (state.points[id] ?? 0) + n);
  const clamp = (n: number) => Math.max(-100, Math.min(100, n));
  const bump = (a: string, b: string, k: keyof Omit<Relationship, "from" | "to">, n: number) => {
    const r = rel(a, b);
    r[k] = clamp(r[k] + n);
  };
  const rand = seeded(seed);
  const moveOf = (id: string) => moves.find((m) => m.doubleId === id);
  const events: GameEvent[] = [];
  const handled = new Set<string>();

  for (const m of moves) {
    if (m.forced) {
      pts(m.doubleId, 3);
      events.push({ kind: "protect", actors: [m.doubleId], summary: `${name(m.doubleId)} made the move their owner chose` });
    }
    const t = m.targetId;
    const back = moveOf(t);
    const pairKey = [m.doubleId, t].sort().join("|") + m.action;
    switch (m.action) {
      case "ALLY":
        if (back?.action === "ALLY" && back.targetId === m.doubleId) {
          if (handled.has(pairKey)) break;
          handled.add(pairKey);
          bump(m.doubleId, t, "trust", 35);
          bump(t, m.doubleId, "trust", 35);
          pts(m.doubleId, 2);
          pts(t, 2);
          events.push({ kind: "alliance", actors: [m.doubleId, t], summary: `${name(m.doubleId)} and ${name(t)} teamed up` });
        } else if (back?.targetId === m.doubleId && (back.action === "BETRAY" || back.action === "SABOTAGE")) {
          bump(m.doubleId, t, "trust", -40);
          bump(m.doubleId, t, "rivalry", 45);
          pts(t, 3);
          pts(m.doubleId, -2);
          events.push({ kind: "backstab", actors: [t, m.doubleId], summary: `${name(m.doubleId)} tried to team up with ${name(t)} and got double-crossed` });
        } else {
          bump(m.doubleId, t, "trust", 15);
          pts(m.doubleId, 1);
          events.push({ kind: "snub", actors: [m.doubleId, t], summary: `${name(m.doubleId)} reached out to ${name(t)}, who had other plans` });
        }
        break;
      case "BETRAY": {
        const hadTrust = rel(t, m.doubleId).trust > 0 || moveOf(t)?.targetId === m.doubleId;
        bump(t, m.doubleId, "trust", -50);
        bump(t, m.doubleId, "rivalry", 50);
        pts(m.doubleId, hadTrust ? 3 : 2);
        pts(t, -2);
        if (!(back?.action === "ALLY" && back.targetId === m.doubleId))
          events.push({ kind: "betrayal", actors: [m.doubleId, t], summary: `${name(m.doubleId)} double-crossed ${name(t)}${hadTrust ? " despite their history" : ""}` });
        break;
      }
      case "CHALLENGE": {
        if (handled.has(pairKey)) break;
        handled.add(pairKey);
        const a = m.doubleId;
        const edge = (state.points[a] ?? 0) - (state.points[t] ?? 0);
        const winner = rand() + edge * 0.05 > 0.5 ? a : t;
        const loser = winner === a ? t : a;
        pts(winner, 3);
        pts(loser, -1);
        bump(a, t, "rivalry", 30);
        bump(t, a, "rivalry", 30);
        events.push({ kind: "faceoff", actors: [a, t], winner, summary: `${name(a)} clashed with ${name(t)} — ${name(winner)} came out ahead` });
        break;
      }
      case "PROTECT":
        bump(t, m.doubleId, "trust", 25);
        pts(t, 2);
        events.push({ kind: "protect", actors: [m.doubleId, t], summary: `${name(m.doubleId)} backed up ${name(t)}` });
        break;
      case "SABOTAGE":
        pts(t, -2);
        pts(m.doubleId, 1);
        bump(t, m.doubleId, "rivalry", 20);
        if (!(back?.action === "ALLY" && back.targetId === m.doubleId))
          events.push({ kind: "sabotage", actors: [m.doubleId, t], summary: `${name(m.doubleId)} messed with ${name(t)}'s plans` });
        break;
      case "CHARM":
        bump(m.doubleId, t, "spark", 20);
        if (back?.action === "CHARM" && back.targetId === m.doubleId) {
          if (handled.has(pairKey)) break;
          handled.add(pairKey);
          bump(t, m.doubleId, "spark", 20);
          pts(m.doubleId, 1);
          pts(t, 1);
          events.push({ kind: "spark", actors: [m.doubleId, t], summary: `Sparks flew between ${name(m.doubleId)} and ${name(t)}` });
        } else {
          pts(m.doubleId, 1);
          events.push({ kind: "spark", actors: [m.doubleId, t], summary: `${name(m.doubleId)} turned on the charm for ${name(t)}` });
        }
        break;
    }
  }

  const ranking = [...cast].sort((a, b) => (state.points[b.id] ?? 0) - (state.points[a.id] ?? 0));
  const top = ranking[0];
  const bottom = ranking[ranking.length - 1];
  const outcome = competitive
    ? `${top.name} ends the night on top; ${bottom.name} is in danger`
    : `${top.name} stole the spotlight; ${bottom.name} had the roughest night`;
  state.history.push(...events.map((e) => e.summary), outcome);
  // weight dramatic events first for the edit
  const order: GameEvent["kind"][] = ["backstab", "betrayal", "faceoff", "sabotage", "alliance", "spark", "protect", "snub"];
  events.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  return { state, events, top: top.id, bottom: bottom.id, outcome };
}

// ---------- 4. Showrunner (edit into scenes) ----------

const sceneSchema = z.object({
  kind: z.enum(["hook", "cast", "encounter", "confessional", "twist", "cliffhanger"]),
  title: z.string().describe("Big on-screen display text, max 40 chars"),
  caption: z.string().describe("Narration subtitle, max 110 chars"),
  lines: z
    .array(z.object({ speaker: z.string().describe("cast id"), text: z.string().describe("max 90 chars") }))
    .max(4),
  focus: z.array(z.string()).describe("cast ids on screen"),
  photoOf: z.string().describe("cast id whose real Instagram post should be the background, or empty"),
  photoIndex: z.number().int().describe("index of that post (from their receipts), or -1"),
});

const editSchema = z.object({
  scenes: z.array(sceneSchema).min(6).max(8),
  cliffhanger: z.object({
    doubleId: z.string().describe("cast id whose owner decides what happens next (the one with the most at stake)"),
    question: z.string().describe('Question to that owner, e.g. "Your Double just found out. What now?", max 80 chars'),
    options: z
      .array(
        z.object({
          label: z.string().describe("2-4 words, e.g. Get revenge"),
          action: z.enum(ACTIONS),
          targetId: z.string(),
          teaser: z.string().describe("What it would set up next episode, max 70 chars"),
        }),
      )
      .length(3),
  }),
});

async function showrun(
  cast: Double[],
  setup: Awaited<ReturnType<typeof direct>>,
  moves: ActorMove[],
  result: ReturnType<typeof resolve>,
  lang: Lang,
) {
  const name = (id: string) => cast.find((d) => d.id === id)?.name ?? id;
  const { output } = await generateText({
    model: TEXT_MODEL,
    system: `You are the story editor of DOUBLE, a social app where AI Doubles of real people live out short stories. Cut this scenario into a 30-40 second vertical episode with reality-TV editing (confessionals, reaction cuts, a twist), like a teaser on TikTok. The genre follows the scenario: a road trip plays as a comedy, a blind date as a romance, a whodunit as a mystery.
Scene order (6-8 scenes): hook -> cast -> encounter (1-2) -> confessional (1-2) -> twist -> cliffhanger. The LAST scene must have kind "cliffhanger".
Rules:
- ONLY show what actually happened (moves + resolved events). Do not invent outcomes.
- Use the real lines the cast said (you may trim). Confessionals are direct-to-camera.
- Tie EVERY scene to a real Instagram post via photoOf/photoIndex (post numbers from the cast sheet) so viewers see "that's from her actual feed".
- Confessional and twist scenes must use a post where that person's face is clearly visible (their hero post is a safe choice). Use different posts across scenes.
- The twist = the most surprising turn in what actually happened (a reveal, a mix-up, a crush, a clash), told in the scenario's genre. The cliffhanger asks the most affected cast member's owner to decide the next move; its 3 options must be meaningfully different.
- Punchy reality-TV subtitles: short, dramatic, a little funny. Every scene must say something new; never repeat a detail or catchphrase across scenes.
- Each title is a tabloid-style headline written for THIS scene's specific event and people (2-5 words). Never a generic label like "<name>, Confessional", and never a stock phrase that would fit any episode.
- No emojis.
${langLine(lang)}`,
    prompt: `Scenario: ${scenarioOf(setup.scenario).name} (inspired by: ${setup.why})\nShow: ${setup.showTitle} — "${setup.episodeTitle}"\nSetting: ${setup.setting}\nGoal: ${setup.challenge}\nStakes: ${setup.stakes}\nCold open: ${setup.hook}\nProducer plants: ${setup.secrets.map((x) => `${name(x.doubleId)}: ${x.secret}`).join(" / ")}\n\nCast:\n${castSheet(cast)}\n\nMoves:\n${moves
      .map((m) => `- ${name(m.doubleId)} (id=${m.doubleId}) -> ${m.action} ${name(m.targetId)} (id=${m.targetId})${m.forced ? " [owner's choice]" : ""}. Said: "${m.publicLine}". Confessional: "${m.confessional}". Motive: ${m.why}`)
      .join("\n")}\n\nResolved by the game engine:\n${result.events.map((e) => `- ${e.summary}`).join("\n")}\nOutcome: ${result.outcome}`,
    output: Output.object({ schema: editSchema }),
    providerOptions: FAST,
  });
  return output;
}

// ---------- Orchestration ----------

export async function runEpisode(opts: {
  id: string;
  cast: Double[];
  lang: Lang;
  prev?: Episode;
  choice?: { doubleId: string; optionId: string };
  onStage: (stage: string, detail?: string) => void;
}): Promise<Episode> {
  const { id, cast, lang, prev, onStage } = opts;
  const state = prev?.state ?? emptyState(cast);
  const picked = prev && opts.choice ? prev.cliffhanger.options.find((o) => o.id === opts.choice!.optionId) : undefined;
  const chooser = picked ? cast.find((d) => d.id === prev!.cliffhanger.doubleId) : undefined;
  const carry = picked && chooser ? `${chooser.name}'s owner chose "${picked.label}" (${picked.action} on ${cast.find((c) => c.id === picked.targetId)?.name}). Set up: ${picked.teaser}` : undefined;

  onStage("director", "Picking a story from your feeds");
  const setup = await direct(cast, state, lang, carry, prev?.scenario ? [prev.scenario] : []);
  const scenario = scenarioOf(setup.scenario);

  onStage("actors", "The Doubles are making their moves");
  const moves = await Promise.all(
    cast.map((d) =>
      act(
        d,
        cast,
        setup,
        state,
        lang,
        setup.secrets.find((x) => x.doubleId === d.id)?.secret,
        picked && chooser?.id === d.id ? { action: picked.action, targetId: picked.targetId } : undefined,
        picked && chooser && picked.targetId === d.id
          ? `${chooser.name} is coming at you with ${picked.action} tonight — and the viewers voted for it. React like your persona would.`
          : undefined,
      ),
    ),
  );

  onStage("engine", "Working out what happens");
  const result = resolve(cast, moves, state, id, scenario.competitive);

  onStage("editor", "Cutting the episode");
  const edit = await showrun(cast, setup, moves, result, lang);
  const stills: Record<string, string> = {};

  const ids = new Set(cast.map((d) => d.id));
  const DUR: Record<Scene["kind"], number> = { hook: 3200, cast: 4500, encounter: 6000, confessional: 5500, twist: 5000, cliffhanger: 8000 };
  const scenes: Scene[] = edit.scenes.map((s) => {
    const photoDouble = cast.find((d) => d.id === s.photoOf);
    const idx = photoDouble && s.photoIndex >= 0 && s.photoIndex < photoDouble.photos.length ? s.photoIndex : -1;
    const focus = s.focus.filter((f) => ids.has(f));
    return {
      kind: s.kind,
      title: s.title,
      caption: s.caption,
      lines: s.lines.filter((l) => ids.has(l.speaker)),
      focus,
      photo: photoDouble && idx >= 0 ? { double: photoDouble.id, index: idx } : undefined,
      durationMs: DUR[s.kind] + s.lines.length * 900,
    };
  });

  // the player's last scene is where the owner decides — guarantee it exists and comes last
  const cliffScenes = scenes.filter((s) => s.kind === "cliffhanger");
  const body = scenes.filter((s) => s.kind !== "cliffhanger");
  const cliffScene: Scene = cliffScenes[0] ?? {
    kind: "cliffhanger",
    title: edit.cliffhanger.question,
    caption: result.outcome,
    lines: [],
    focus: [edit.cliffhanger.doubleId].filter((x) => ids.has(x)),
    durationMs: DUR.cliffhanger,
  };
  scenes.splice(0, scenes.length, ...body, cliffScene);

  const cliff: Cliffhanger = {
    doubleId: ids.has(edit.cliffhanger.doubleId) ? edit.cliffhanger.doubleId : result.bottom,
    question: edit.cliffhanger.question,
    options: edit.cliffhanger.options.map((o, i) => ({
      id: `o${i}`,
      label: o.label,
      action: o.action,
      targetId: ids.has(o.targetId) && o.targetId !== edit.cliffhanger.doubleId ? o.targetId : cast.find((c) => c.id !== edit.cliffhanger.doubleId)!.id,
      teaser: o.teaser,
    })),
  };

  return {
    id,
    lang,
    showTitle: setup.showTitle,
    scenario: scenario.id,
    number: (prev?.number ?? 0) + 1,
    title: setup.episodeTitle,
    premise: `${setup.setting} ${setup.challenge}`,
    cast: cast.map((d) => d.id),
    moves,
    events: result.events,
    scenes,
    cliffhanger: cliff,
    state: result.state,
    stills,
    parentId: prev?.id,
    choice: picked && chooser ? { doubleId: chooser.id, optionId: picked.id, label: picked.label } : undefined,
    createdAt: Date.now(),
  };
}
