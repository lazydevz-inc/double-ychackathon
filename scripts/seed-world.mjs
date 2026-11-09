// Seeds the world with the first nine Doubles and the two days of content made during design.
// usage: node --env-file=.env.local scripts/seed-world.mjs <dir with ig/, ig2/, real/, day.json, day2.json, personas*.json>
import { put } from '@vercel/blob';
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const W = process.argv[2];
const rev = (t) => String(9_999_999_999_999 - t).padStart(13, '0');
const id = () => Math.random().toString(36).slice(2, 12);
const json = (p, d) => put(p, JSON.stringify(d), { access: 'public', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true });
const jpeg = async (file, width) => {
  const buf = await sharp(readFileSync(file)).resize({ width, withoutEnlargement: true }).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
  return (await put(`world/media/${file.split('/').pop().replace(/\.\w+$/, '')}.jpg`, buf, { access: 'public', contentType: 'image/jpeg', addRandomSuffix: true })).url;
};

const lives = Object.fromEntries([...JSON.parse(readFileSync(`${W}/personas.json`)), ...JSON.parse(readFileSync(`${W}/personas2.json`))].map((p) => [p.handle, p.lifeInWorld]));
const PEOPLE = [
  ['zuck', 'Mark Zuckerberg', 'Building things. Brisket on weekends 🍖', 'zuck', 'ig', 'man in his early 40s with short curly brown hair', true, ['AI', 'smart glasses', 'smoking meat', 'MMA'], 'en'],
  ['sang_rhee', '이상엽', 'lazydevz · 수영, 철인3종, 프리다이빙 🏊', 'sang', 'ig', 'Korean man in his 30s with short black hair, athletic', true, ['triathlon', 'freediving', 'swimming', 'AI agents'], 'ko'],
  ['rubychoux', 'ruby choux', 'model · developer · vanilla latte, less sweet', 'ruby', 'ig', 'young Korean woman with long dark wavy hair', true, ['beauty', 'coding', 'cafés', 'desserts'], 'en'],
  ['thisisbillgates', 'Bill Gates', 'Reading, learning, staying optimistic.', 'gates', 'ig', 'man in his late 60s with silver hair and glasses', true, ['books', 'climate', 'health', 'job sites'], 'en'],
  ['yxn.sii', '시연', '후드집업 수집 중 🩶 딸기라떼', 'siyeon', 'ig2', 'young Korean woman with a short dark bob and bangs', true, ['후드집업', '카페', '딸기라떼', '사진'], 'ko'],
  ['sojinny_21', '서진', '... 🚕', 'seojin', 'ig2', 'young Korean woman with long dark hair and bangs', true, ['포토부스', '바다', '청계천', '모자'], 'ko'],
  ['jjux_h__', '권준희', '러닝앱 위티즈 대표 🏃🏻‍♀️', 'junhee', 'ig2', 'young Korean woman with long dark hair, sporty', true, ['러닝', '앱 디자인', '그림', '5K'], 'ko'],
  ['yullll0321', '이유리', '뛰러 왔다가 벚꽃 보고 멈춤 🌸', 'yuri', 'ig2', 'young Korean woman with long straight dark hair', true, ['마라톤', '여행', '스케치', '한식'], 'ko'],
  ['__hyun91', 'hyun', '일출 보러 다니는 사람 🌄', 'hyun', 'ig2', 'young Korean man with short dark hair, outdoorsy', false, ['등산', '일출', '릴스', '두부'], 'ko'],
];
const now = Date.now();
await Promise.all(PEOPLE.map(async ([handle, name, bio, key, dir, who, faceShown, interests, lang], i) => {
  const [pfp, r1, r2] = await Promise.all([jpeg(`${W}/${dir}/${handle}-pfp.jpg`, 320), jpeg(`${W}/real/ref-${key}-1.jpg`, 1080), jpeg(`${W}/real/ref-${key}-2.jpg`, 1080)]);
  const d = { handle, name, bio, pfp, refs: [r1, r2], who, faceShown, lifeInWorld: lives[handle] ?? '', interests, lang, createdAt: now - 3 * 864e5 + i * 6e4 };
  await json(`world/doubles/${handle}/doc-${now}.json`, d);
  console.log('double', handle);
}));

const day1 = JSON.parse(readFileSync(`${W}/day.json`));
const day2 = JSON.parse(readFileSync(`${W}/day2.json`));
// light edits to the first day: keep it everyday, no gimmicks
day1.posts[2].caption = 'This big hole is going to be something wonderful. Mark asked if it could hold a brisket smoker.';
day1.posts[3].caption = 'Sang: freediving certificate in the morning, lifeguard sign-up by lunch. Heroes in the field 💛';
day1.posts[3].comments = [
  { author: 'sang_rhee', text: '감사합니다!! 다음은 스쿠버 #라이프가드' },
  { author: 'rubychoux', text: 'you two at a pool was not on my bingo card' },
  { author: 'zuck', text: 'Certification speedrun. Respect.' },
];
day1.story.frames[0].sticker = '다음은 뭐?';
const LIKES = [1873, 2240, 6120, 3388, 2954, 2431, 986, 3102, 5870, 1744, 4215];
const jobs = [
  ...day1.posts.map((p, i) => ({ p, file: `${W}/real/post-${i}.png`, t: now - 26 * 36e5 + i * 47 * 6e4 })),
  ...day2.posts.map((p, i) => ({ p, file: `${W}/real/p2-${i}.png`, t: now - 5 * 36e5 + i * 52 * 6e4 })),
];
await Promise.all(jobs.map(async ({ p, file, t }, i) => {
  const post = { id: id(), author: p.author, with: p.with, place: p.place, caption: p.caption, image: await jpeg(file, 1080), comments: p.comments.map((c) => ({ author: c.author, text: c.text })), likes: LIKES[i], createdAt: t };
  await json(`world/posts/${rev(t)}-${post.id}.json`, post);
  console.log('post', post.id, post.author, '+', post.with.join(','));
}));
for (const [story, files, t] of [[day1.story, [0, 1, 2].map((i) => `${W}/real/story-${i}.png`), now - 23 * 36e5], [day2.story, [0, 1].map((i) => `${W}/real/s2-${i}.png`), now - 50 * 6e4]]) {
  const frames = await Promise.all(story.frames.map(async (f, i) => ({ image: await jpeg(files[i], 1080), overlay: f.overlay, sticker: f.sticker })));
  const s = { id: id(), author: story.author, frames, createdAt: t };
  await json(`world/stories/${rev(t)}-${s.id}.json`, s);
  console.log('story', s.author, frames.length);
}
