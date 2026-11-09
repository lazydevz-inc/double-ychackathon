/** Someone's Double: built from their real Instagram, lives on in the shared world. */
export type Double = {
  handle: string;
  name: string;
  /** short in-world bio, plain, in their own language */
  bio: string;
  pfp: string;
  /** two face reference photos (real posts) used to keep the likeness */
  refs: string[];
  /** appearance hint for the image model, e.g. "Korean man in his 30s, short black hair" */
  who: string;
  /** false: the person never shows their face, so scenes show them from behind or in profile */
  faceShown: boolean;
  lifeInWorld: string;
  interests: string[];
  lang: "ko" | "en";
  igFollowers?: number;
  createdAt: number;
};

export type Comment = { author: string; text: string; at?: number };

export type Post = {
  id: string;
  /** 2-5 plain words: what happened */
  title?: string;
  author: string;
  with: string[];
  place: string;
  caption: string;
  image: string;
  comments: Comment[];
  likes: number;
  createdAt: number;
};

export type StoryFrame = { image: string; overlay: string; sticker?: string };
export type Story = { id: string; author: string; frames: StoryFrame[]; createdAt: number };

export type JoinStep = "queued" | "reading" | "persona" | "moments" | "photos" | "done" | "error";
export type JoinStatus = { handle: string; step: JoinStep; message?: string; at: number };

export type World = {
  doubles: Map<string, Double>;
  posts: Post[];
  stories: Story[];
  /** postId -> mp4 url */
  videos: Map<string, string>;
  /** postId -> comments people added later */
  extraComments: Map<string, Comment[]>;
};
