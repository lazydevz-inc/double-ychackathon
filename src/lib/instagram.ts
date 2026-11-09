// Real Instagram data via RocketAPI. Exactly two calls per handle (profile + 12 latest posts).

const BASE = "https://v1.rocketapi.io/instagram/user";

type Candidate = { url: string; width: number; height: number };
type IgMedia = {
  media_type: number;
  image_versions2?: { candidates?: Candidate[] };
  carousel_media?: IgMedia[];
  video_versions?: { url: string; width?: number; height?: number }[];
  caption?: { text?: string } | null;
  like_count?: number;
  taken_at?: number;
};

export type InstagramProfile = {
  username: string;
  fullName: string;
  bio: string;
  followers: number;
  verified: boolean;
  pfp: string;
  /** up to `max` photos, newest posts first */
  photos: { url: string; caption: string }[];
  /** reel mp4 urls, newest first */
  clips: string[];
};

async function call<T>(endpoint: string, body: object): Promise<T> {
  const key = process.env.ROCKETAPI_KEY;
  if (!key) throw new Error("ROCKETAPI_KEY is not set");
  const res = await fetch(`${BASE}/${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Token ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => null)) as
    | { status?: string; message?: string; response?: { status_code?: number; body?: T } }
    | null;
  if (!json || json.status !== "done" || !json.response?.body) {
    throw new Error(`Instagram lookup failed (${endpoint}): ${json?.message ?? `HTTP ${res.status}`}`);
  }
  if (json.response.status_code && json.response.status_code !== 200) {
    throw new Error(`Instagram lookup failed (${endpoint}): status ${json.response.status_code}`);
  }
  return json.response.body;
}

const best = (m?: IgMedia) => {
  const c = m?.image_versions2?.candidates ?? [];
  return c.reduce<Candidate | undefined>((a, b) => (!a || b.width > a.width ? b : a), undefined);
};

export async function fetchInstagram(handle: string, max = 9): Promise<InstagramProfile> {
  const username = handle.replace(/^@/, "").trim().toLowerCase();
  if (!/^[a-z0-9._]{1,30}$/.test(username)) throw new Error("That doesn't look like an Instagram handle");

  const [info, media] = await Promise.all([
    call<{ user?: { username: string; full_name?: string; biography?: string; follower_count?: number; is_verified?: boolean; is_private?: boolean; profile_pic_url?: string; profile_pic_url_hd?: string; hd_profile_pic_url_info?: { url?: string } } }>(
      "get_info_by_username",
      { username },
    ),
    call<{ items?: IgMedia[] }>("get_media_by_username", { username, count: 12 }),
  ]);
  const user = info.user;
  if (!user) throw new Error(`@${username} not found`);
  if (user.is_private) throw new Error(`@${username} is private`);
  const items = media.items ?? [];
  if (!items.length) throw new Error(`@${username} has no posts`);

  // pass 1: cover of every image / carousel post; pass 2: second carousel image
  const covers: { url: string; caption: string; width: number }[] = [];
  const seconds: typeof covers = [];
  const clips: { url: string; vertical: boolean }[] = [];
  for (const it of items) {
    const caption = it.caption?.text?.trim() ?? "";
    if (it.media_type === 2) {
      const v = it.video_versions?.[0];
      if (v?.url) clips.push({ url: v.url, vertical: (v.height ?? 0) > (v.width ?? 0) });
      continue;
    }
    if (it.media_type === 8) {
      const imgs = (it.carousel_media ?? []).filter((c) => c.media_type === 1).map(best).filter((c): c is Candidate => !!c);
      if (imgs[0]) covers.push({ url: imgs[0].url, caption, width: imgs[0].width });
      if (imgs[1]) seconds.push({ url: imgs[1].url, caption, width: imgs[1].width });
      continue;
    }
    const c = best(it);
    if (c) covers.push({ url: c.url, caption, width: c.width });
  }
  const hiRes = (x: { width: number }) => x.width >= 1080;
  const ordered = [...covers.filter(hiRes), ...seconds.filter(hiRes), ...covers.filter((x) => !hiRes(x)), ...seconds.filter((x) => !hiRes(x))];
  const photos = ordered.slice(0, max).map(({ url, caption }) => ({ url, caption }));
  if (photos.length < 3) throw new Error(`@${username} doesn't have enough photo posts`);

  return {
    username: user.username ?? username,
    fullName: displayName(user.full_name, username),
    bio: user.biography ?? "",
    followers: user.follower_count ?? 0,
    verified: !!user.is_verified,
    pfp: user.hd_profile_pic_url_info?.url ?? user.profile_pic_url_hd ?? user.profile_pic_url ?? "",
    photos,
    // vertical reels fill the 9:16 player without cropping, so they go first
    clips: [...clips.filter((c) => c.vertical), ...clips.filter((c) => !c.vertical)].map((c) => c.url),
  };
}

/** "LISA" -> "Lisa"; too-short names ("J") fall back to the handle. */
function displayName(full: string | undefined, username: string) {
  const n = full?.trim() ?? "";
  if (n.length < 2) return username;
  return /[a-z]/.test(n) ? n : n.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}
