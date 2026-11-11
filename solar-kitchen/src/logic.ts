// 纯逻辑层：二十四节气 / 当季食材 / 配方 / 火候判定 / 营收结算。
// 不依赖 platform / DOM，可被 verify.mjs 单独 bundle 做规则回归。

export type Season = '春' | '夏' | '秋' | '冬';

export interface Term {
  name: string;
  season: Season;
  /** 当季三种主角食材，按顺序两两组合就是这一关的三张订单 */
  ings: [string, string, string];
}

export const TERMS: Term[] = [
  { name: '立春', season: '春', ings: ['荠菜', '春笋', '韭菜'] },
  { name: '雨水', season: '春', ings: ['春笋', '韭黄', '菠菜'] },
  { name: '惊蛰', season: '春', ings: ['香椿', '豆苗', '豌豆'] },
  { name: '春分', season: '春', ings: ['荠菜', '豆腐', '豌豆'] },
  { name: '清明', season: '春', ings: ['香椿', '春笋', '艾草'] },
  { name: '谷雨', season: '春', ings: ['豌豆', '蚕豆', '菠菜'] },

  { name: '立夏', season: '夏', ings: ['蚕豆', '黄瓜', '苋菜'] },
  { name: '小满', season: '夏', ings: ['黄瓜', '苦瓜', '毛豆'] },
  { name: '芒种', season: '夏', ings: ['丝瓜', '毛豆', '茄子'] },
  { name: '夏至', season: '夏', ings: ['丝瓜', '西瓜', '荷叶'] },
  { name: '小暑', season: '夏', ings: ['莲藕', '绿豆', '苦瓜'] },
  { name: '大暑', season: '夏', ings: ['冬瓜', '荷叶', '绿豆'] },

  { name: '立秋', season: '秋', ings: ['莲藕', '山药', '秋葵'] },
  { name: '处暑', season: '秋', ings: ['山药', '百合', '银耳'] },
  { name: '白露', season: '秋', ings: ['板栗', '山药', '银耳'] },
  { name: '秋分', season: '秋', ings: ['南瓜', '板栗', '柿子'] },
  { name: '寒露', season: '秋', ings: ['南瓜', '柿子', '百合'] },
  { name: '霜降', season: '秋', ings: ['柿子', '白萝卜', '板栗'] },

  { name: '立冬', season: '冬', ings: ['白菜', '白萝卜', '羊肉'] },
  { name: '小雪', season: '冬', ings: ['白菜', '冬笋', '红枣'] },
  { name: '大雪', season: '冬', ings: ['羊肉', '白萝卜', '糯米'] },
  { name: '冬至', season: '冬', ings: ['羊肉', '冬笋', '糯米'] },
  { name: '小寒', season: '冬', ings: ['红枣', '糯米', '山药'] },
  { name: '大寒', season: '冬', ings: ['白菜', '红枣', '羊肉'] },
];

export const SEASON_COLOR: Record<Season, string> = {
  春: '#7FAF5E',
  夏: '#D9A33B',
  秋: '#C4703C',
  冬: '#6E8FA8',
};

const VERBS = ['清炒', '慢炖', '凉拌', '煨汤', '小炒', '焖'];

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export interface Dish {
  name: string;
  need: [string, string];
  price: number;
}

/** 第 order 张订单（0..2）固定取三种食材的两两组合，一关三单不重样 */
export function dishOf(termIdx: number, order: number): Dish {
  const t = TERMS[clampInt(termIdx, 0, TERMS.length - 1)];
  const pairs: Array<[string, string]> = [
    [t.ings[0], t.ings[1]],
    [t.ings[1], t.ings[2]],
    [t.ings[0], t.ings[2]],
  ];
  const need = pairs[clampInt(order, 0, 2)];
  const h = hashStr(need[0] + need[1] + t.name);
  const verb = VERBS[h % VERBS.length];
  const price = Math.round((12 + termIdx * 2) * (1 + (h % 5) * 0.06));
  return { name: `${verb}${need[0]}${need[1]}`, need, price };
}

export type Quality = 'perfect' | 'good' | 'burnt';

export const PERFECT_HALF = 0.06;
export const GOOD_HALF = 0.20;

/** 指针位置 0..1，0.5 是锅心；完美区 ±6%，不错 ±20%，其余算糊（epsilon 抵消浮点误差） */
export function judgeHeat(pos: number): Quality {
  const d = Math.abs(clamp01(pos) - 0.5);
  if (d <= PERFECT_HALF + 1e-9) return 'perfect';
  if (d <= GOOD_HALF + 1e-9) return 'good';
  return 'burnt';
}

export const QUALITY_LABEL: Record<Quality, string> = {
  perfect: '火候刚好',
  good: '还行',
  burnt: '糊了',
};

export const QUALITY_STARS: Record<Quality, number> = {
  perfect: 3,
  good: 2,
  burnt: 1,
};

export function rewardOf(price: number, q: Quality): number {
  if (q === 'perfect') return Math.ceil(price * 1.6);
  if (q === 'good') return price;
  return Math.max(1, Math.ceil(price * 0.4));
}

/** 锅里必须正好是这道菜的两样，多了少了都不算 */
export function potMatches(pot: string[], dish: Dish): boolean {
  if (pot.length !== 2) return false;
  const a = pot.slice().sort().join('|');
  const b = dish.need.slice().sort().join('|');
  return a === b;
}

/** 火候指针来回移动，撞到两端就反弹 */
export function heatTick(pos: number, dir: number, speed: number, dtSec: number): { pos: number; dir: number } {
  let p = pos + dir * speed * Math.max(0, dtSec);
  let d = dir >= 0 ? 1 : -1;
  if (p > 1) { p = 2 - p; d = -1; }
  if (p < 0) { p = -p; d = 1; }
  return { pos: clamp01(p), dir: d };
}

/** 指针速度：越往后的节气越快，第二年再加一档 */
export function heatSpeed(termIdx: number, year: number): number {
  return 0.55 + Math.min(0.5, termIdx * 0.02) + Math.min(0.6, year * 0.15);
}

export type Phase = 'cook' | 'heat' | 'result';

export interface State {
  term: number;
  year: number;
  order: number;
  pot: string[];
  money: number;
  stars: number;
  served: number;
  phase: Phase;
  quality: Quality | null;
  lastReward: number;
  /** 已解锁到的最高节气序号（含年份折算） */
  best: number;
}

export function createState(best = 0): State {
  const term = best % TERMS.length;
  return {
    term,
    year: Math.floor(best / TERMS.length),
    order: 0,
    pot: [],
    money: 0,
    stars: 0,
    served: 0,
    phase: 'cook',
    quality: null,
    lastReward: 0,
    best,
  };
}

export function currentDish(s: State): Dish {
  return dishOf(s.term, s.order);
}

export function putIngredient(s: State, ing: string): boolean {
  if (s.phase !== 'cook') return false;
  if (s.pot.includes(ing)) return false;
  if (s.pot.length >= 2) return false;
  s.pot.push(ing);
  return true;
}

export function clearPot(s: State): void {
  if (s.phase !== 'cook') return;
  s.pot = [];
}

/** 下锅：锅里对得上这道菜才允许进入火候阶段 */
export function startCooking(s: State): boolean {
  if (s.phase !== 'cook') return false;
  if (!potMatches(s.pot, currentDish(s))) return false;
  s.phase = 'heat';
  s.quality = null;
  return true;
}

/** 停：判定火候、结算收入，进入结果阶段 */
export function finishHeat(s: State, pos: number): Quality {
  const q = judgeHeat(pos);
  const dish = currentDish(s);
  const reward = rewardOf(dish.price, q);
  s.quality = q;
  s.lastReward = reward;
  s.money += reward;
  s.stars += QUALITY_STARS[q];
  s.served += 1;
  s.phase = 'result';
  return q;
}

/** 下一单；三单做完这一关就结束 */
export function nextOrder(s: State): { termDone: boolean } {
  s.pot = [];
  s.quality = null;
  s.lastReward = 0;
  if (s.order >= 2) {
    s.phase = 'cook';
    return { termDone: true };
  }
  s.order += 1;
  s.phase = 'cook';
  return { termDone: false };
}

/** 进入下一个节气；走完 24 个就进第二年，食材不变但火候更快 */
export function nextTerm(s: State): void {
  s.term += 1;
  if (s.term >= TERMS.length) {
    s.term = 0;
    s.year += 1;
  }
  s.order = 0;
  s.pot = [];
  s.phase = 'cook';
  s.quality = null;
  s.lastReward = 0;
  s.best = Math.max(s.best, s.year * TERMS.length + s.term);
}

export function termLabel(s: State): string {
  return `${TERMS[s.term].name} · 第 ${s.year + 1} 年`;
}

/** 分享码：节气 / 年份 / 营收，好友点进来只做对比 */
export function encodeShare(s: State): string {
  return [s.term, Math.min(99, s.year), Math.min(999999, s.money)].join('~');
}

export function decodeShare(raw: string): { term: number; year: number; money: number } | null {
  if (typeof raw !== 'string' || raw.length > 24) return null;
  const parts = raw.split('~');
  if (parts.length !== 3) return null;
  const nums = parts.map(v => Number(v));
  if (!nums.every(n => Number.isInteger(n) && n >= 0)) return null;
  const [term, year, money] = nums;
  if (term >= TERMS.length || year > 99 || money > 999999) return null;
  return { term, year, money };
}

export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function clampInt(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(v)));
}
