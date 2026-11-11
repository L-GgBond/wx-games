// 纯逻辑层：货架 / 购物篮 / 三连消除 / 关卡目标 / 道具。
// 不依赖 platform / DOM，可被 verify.mjs 单独 bundle 做规则回归。

export const COLS = 4;
export const ROWS = 5;
export const CELLS = COLS * ROWS;
export const BASE_SLOTS = 7;
export const MAX_SLOTS = 9;
export const UNDO_PER_LEVEL = 3;

export interface Cell { kind: number; count: number }

export type Phase = 'play' | 'stuck' | 'win' | 'lose';

export interface State {
  level: number;
  shelves: Array<Cell | null>;
  baskets: number[];
  slots: number;
  revenue: number;
  target: number;
  groupsLeft: number;
  groupsTotal: number;
  phase: Phase;
  undoLeft: number;
  combo: number;
  bestCombo: number;
  kindCount: number;
  history: string[];
}

export interface LevelConfig {
  cells: number;
  kinds: number;
  groups: number;
  target: number;
}

export function priceOf(kind: number): number {
  return 8 + Math.max(0, kind) * 2;
}

export function levelConfig(level: number): LevelConfig {
  const lv = Math.max(1, Math.round(level));
  const cells = Math.min(CELLS, 12 + lv * 2);
  const kinds = Math.min(8, 2 + lv);
  const avg = 8 + (kinds - 1);
  return { cells, kinds, groups: cells, target: Math.round(cells * avg * 0.62) };
}

/** 洗牌用：Fisher-Yates，传入固定随机数即可复现 */
function shuffle<T>(arr: T[], rnd: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1)) % (i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
}

/** 生成货架：每格 3 个同类，总组数均分到各商品种类上，保证一定能全部消完 */
export function createState(level = 1, rnd: () => number = Math.random): State {
  const cfg = levelConfig(level);
  const kinds: number[] = [];
  for (let i = 0; i < cfg.groups; i++) kinds.push(i % cfg.kinds);
  shuffle(kinds, rnd);

  const shelves: Array<Cell | null> = new Array(CELLS).fill(null);
  for (let i = 0; i < cfg.groups && i < CELLS; i++) {
    shelves[i] = { kind: kinds[i], count: 3 };
  }
  return {
    level: Math.max(1, Math.round(level)),
    shelves,
    baskets: [],
    slots: BASE_SLOTS,
    revenue: 0,
    target: cfg.target,
    groupsLeft: cfg.groups,
    groupsTotal: cfg.groups,
    phase: 'play',
    undoLeft: UNDO_PER_LEVEL,
    combo: 0,
    bestCombo: 0,
    kindCount: cfg.kinds,
    history: [],
  };
}

function snapshot(s: State): void {
  s.history.push(JSON.stringify({
    shelves: s.shelves,
    baskets: s.baskets,
    revenue: s.revenue,
    groupsLeft: s.groupsLeft,
    combo: s.combo,
    bestCombo: s.bestCombo,
  }));
  if (s.history.length > 30) s.history.shift();
}

/** 把一件商品放进篮子：同类聚在一起，凑满 3 个立即消掉 */
export function insertBasket(baskets: number[], kind: number): { list: number[]; matched: boolean } {
  const out = baskets.slice();
  const last = out.lastIndexOf(kind);
  if (last >= 0) out.splice(last + 1, 0, kind);
  else out.push(kind);

  if (out.filter(v => v === kind).length >= 3) {
    const keep: number[] = [];
    let removed = 0;
    for (const v of out) {
      if (v === kind && removed < 3) { removed++; continue; }
      keep.push(v);
    }
    return { list: keep, matched: true };
  }
  return { list: out, matched: false };
}

export interface PickResult {
  ok: boolean;
  matched: boolean;
  reason: string;
  gained: number;
}

/** 点一格货架：取一件放篮子。篮子满了就卡住，不直接判负，留给道具救场 */
export function pick(s: State, idx: number): PickResult {
  if (s.phase !== 'play') return { ok: false, matched: false, reason: '这一局已经结束', gained: 0 };
  if (idx < 0 || idx >= CELLS) return { ok: false, matched: false, reason: '越界', gained: 0 };
  const cell = s.shelves[idx];
  if (!cell) return { ok: false, matched: false, reason: '这格空了', gained: 0 };

  snapshot(s);
  const res = insertBasket(s.baskets, cell.kind);
  s.baskets = res.list;
  cell.count -= 1;
  if (cell.count <= 0) s.shelves[idx] = null;

  let gained = 0;
  if (res.matched) {
    gained = priceOf(cell.kind);
    s.revenue += gained;
    s.groupsLeft = Math.max(0, s.groupsLeft - 1);
    s.combo += 1;
    s.bestCombo = Math.max(s.bestCombo, s.combo);
  } else {
    s.combo = 0;
  }

  if (s.revenue >= s.target) {
    s.phase = 'win';
  } else if (s.shelves.every(c => !c)) {
    s.phase = 'lose';
  } else if (s.baskets.length >= s.slots) {
    s.phase = 'stuck';
  }
  return { ok: true, matched: res.matched, reason: '', gained };
}

/** 加篮子槽：卡住时用来救场，一次加 2 格（7 → 9），最多到 MAX_SLOTS */
export function addSlot(s: State): boolean {
  if (s.slots >= MAX_SLOTS) return false;
  s.slots = Math.min(MAX_SLOTS, s.slots + 2);
  if (s.phase === 'stuck' && s.baskets.length < s.slots) s.phase = 'play';
  return true;
}

/** 洗牌：只重排还剩货的格子，商品与数量不变 */
export function shuffleShelves(s: State, rnd: () => number = Math.random): void {
  if (s.phase === 'win' || s.phase === 'lose') return;
  const items: Cell[] = [];
  const slots: number[] = [];
  s.shelves.forEach((c, i) => {
    if (c) { items.push(c); slots.push(i); }
  });
  shuffle(items, rnd);
  const next: Array<Cell | null> = new Array(CELLS).fill(null);
  slots.forEach((slot, i) => { next[slot] = items[i]; });
  s.shelves = next;
}

/** 撤回一步；每关有限次 */
export function undo(s: State): boolean {
  if (s.undoLeft <= 0) return false;
  const raw = s.history.pop();
  if (!raw) return false;
  const o = JSON.parse(raw);
  s.shelves = o.shelves;
  s.baskets = o.baskets;
  s.revenue = o.revenue;
  s.groupsLeft = o.groupsLeft;
  s.combo = o.combo || 0;
  s.bestCombo = o.bestCombo || s.bestCombo;
  s.phase = 'play';
  s.undoLeft -= 1;
  return true;
}

export function progressOf(s: State): number {
  return Math.max(0, Math.min(1, s.revenue / Math.max(1, s.target)));
}

export function starsOf(s: State): number {
  // 这里不能复用 progressOf：进度条要 clamp 到 1，星级要看超额倍数
  const ratio = s.revenue / Math.max(1, s.target);
  if (ratio >= 1.35) return 3;
  if (ratio >= 1.1) return 2;
  return 1;
}

/** 分享码：关卡 / 营收 */
export function encodeShare(s: State): string {
  return [Math.min(999, s.level), Math.min(999999, s.revenue)].join('~');
}

export function decodeShare(raw: string): { level: number; revenue: number } | null {
  if (typeof raw !== 'string' || raw.length > 20) return null;
  const parts = raw.split('~');
  if (parts.length !== 2) return null;
  const nums = parts.map(v => Number(v));
  if (!nums.every(n => Number.isInteger(n) && n >= 0)) return null;
  const [level, revenue] = nums;
  if (level < 1 || level > 999 || revenue > 999999) return null;
  return { level, revenue };
}

export function clampInt(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(v)));
}
