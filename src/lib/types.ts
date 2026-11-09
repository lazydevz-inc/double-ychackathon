export type Lang = "en" | "ko";

export type AvatarStyle = "illustration" | "3d";

export type Receipt = {
  /** 0-based index into Double.photos */
  photo: number;
  /** what the AI noticed in that post, written as a playful exhibit */
  note: string;
};

export type Persona = {
  /** e.g. "THE UNTOUCHABLE ICON" */
  archetype: string;
  /** one-line hook under the archetype */
  tagline: string;
  traits: string[];
  /** narrator line introducing them on the show */
  showIntro: string;
  /** the affectionate roast line people will screenshot */
  roast: string;
  receipts: Receipt[];
  /** what their Double wants inside the house */
  desire: string;
  /** a fictional flaw that drives drama */
  flaw: string;
  /** how the Double talks */
  voice: string;
  /** a first confessional quote */
  confessional: string;
  /** 2-3 hex colors pulled from the feed */
  palette: string[];
  /** short visual description of the person */
  look: string;
  /** index into Double.photos of the most iconic, face-clearly-visible photo */
  hero: number;
};

export type Double = {
  id: string;
  handle: string;
  name: string;
  lang: Lang;
  photos: string[];
  /** captions aligned with photos (instagram mode) */
  captions?: string[];
  /** real reel mp4s copied to Blob */
  clips?: string[];
  /** hero photo (= photos[persona.hero]); always a real post */
  portrait?: string;
  followers?: number;
  /** Instagram's own verified flag (NOT our badge) */
  verified?: boolean;
  source?: "instagram" | "upload";
  /** how the Double appears: real photos, or an avatar drawn from the feed's style (default real) */
  identity?: "real" | "avatar";
  /** set when the owner passed the selfie check; only then does a real-face Double get the Verified badge */
  faceVerified?: { at: number; confidence: number };
  /** avatar mode visuals: [full-body, close-up, reaction]; the real photos are never shown */
  avatar?: { style: AvatarStyle; images: string[] };
  persona: Persona;
  house?: boolean;
  createdAt: number;
};

export type ActionKind =
  | "ALLY"
  | "BETRAY"
  | "CHALLENGE"
  | "PROTECT"
  | "SABOTAGE"
  | "CHARM";

export type ActorMove = {
  doubleId: string;
  action: ActionKind;
  targetId: string;
  publicLine: string;
  confessional: string;
  why: string;
  /** set when the owner chose this direction via a cliffhanger */
  forced?: boolean;
};

export type Relationship = {
  from: string;
  to: string;
  trust: number;
  rivalry: number;
  spark: number;
};

export type WorldState = {
  relationships: Relationship[];
  points: Record<string, number>;
  /** one-line canonical summaries of past events, oldest first */
  history: string[];
};

export type GameEvent = {
  kind: "alliance" | "betrayal" | "faceoff" | "protect" | "sabotage" | "spark" | "backstab" | "snub";
  actors: string[];
  summary: string;
  winner?: string;
};

export type SceneKind =
  | "hook"
  | "cast"
  | "encounter"
  | "confessional"
  | "twist"
  | "cliffhanger";

export type Scene = {
  kind: SceneKind;
  /** big display text */
  title: string;
  /** narration / subtitle */
  caption: string;
  lines: { speaker: string; text: string }[];
  /** doubles on screen (ids) */
  focus: string[];
  /** which real post to show as background: { double, photo index } */
  photo?: { double: string; index: number };
  /** AI still for this scene (filled by renderer) */
  still?: string;
  durationMs: number;
};

export type CliffhangerOption = {
  id: string;
  label: string;
  action: ActionKind;
  targetId: string;
  teaser: string;
};

export type Cliffhanger = {
  /** whose owner gets to decide */
  doubleId: string;
  question: string;
  options: CliffhangerOption[];
};

export type Episode = {
  id: string;
  lang: Lang;
  showTitle: string;
  /** scenario id from the catalog (road-trip, pop-up, survival, ...) */
  scenario?: string;
  number: number;
  title: string;
  premise: string;
  cast: string[];
  moves: ActorMove[];
  events: GameEvent[];
  scenes: Scene[];
  cliffhanger: Cliffhanger;
  state: WorldState;
  /** reaction stills per double for this episode */
  stills: Record<string, string>;
  parentId?: string;
  choice?: { doubleId: string; optionId: string; label: string };
  createdAt: number;
};

/** NDJSON progress events streamed from long-running API routes */
export type Progress =
  | { type: "stage"; stage: string; detail?: string }
  | { type: "done"; id: string }
  | { type: "error"; message: string };
