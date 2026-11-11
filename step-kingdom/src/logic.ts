// 纯逻辑层：不依赖 platform / DOM，可被 verify.mjs 单独 bundle 做数值回归。
// 设计约束：步数换兵力、只能从己方往外一格一格占、离线有产出但不惩罚、敌营定期反攻但不夺走全部。

export const GRID = 9;
export const TILES = GRID * GRID;
export const CENTER = Math.floor(GRID / 2);

export const NONE = 0;
export const MINE = 1;
export const FOE = 2;

/** 每格每小时的兵力产出 */
export const INCOME_PER_TILE_HOUR = 3;
/** 离线产出结算上限：12 小时 */
export const MAX_OFFLINE_MS = 12 * 3600 * 1000;
/** 敌营反攻间隔：6 小时 */
export const RAID_MS = 6 * 3600 * 1000;
/** 单次离线最多结算的反攻次数，避免一觉醒来全丢 */
export const MAX_RAIDS_PER_SETTLE = 2;
/** 多少步换 1 点兵力 */
export const STEPS_PER_TROOP = 100;

export interface State {
  grid: number[];
  troops: number;
  /** 今日日期 YYYY-MM-DD，跨天重置步数额度 */
  day: string;
  /** 今日已经计入过的步数（只兑换增量，防止反复同步刷兵力） */
  steps: number;
  lastSettle: number;
  lastRaid: number;
  /** 通关次数，决定下一张图的占领成本 */
  cleared: number;
  /** 累计占领过的格数（含被夺走后重新攻回的） */
  totalOwned: number;
  /** 连续登录天数 */
  streak: number;
  /** 上一次登录的日期，用于算 streak */
  lastDay: string;
}

export function rowOf(i: number): number { return Math.floor(i / GRID); }
export function colOf(i: number): number { return i % GRID; }
export function indexOf(r: number, c: number): number { return r * GRID + c; }

function inside(r: number, c: number): boolean {
  return r >= 0 && r < GRID && c >= 0 && c < GRID;
}

export function neighbors(i: number): number[] {
  const r = rowOf(i), c = colOf(i);
  const out: number[] = [];
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of dirs) {
    if (inside(r + dr, c + dc)) out.push(indexOf(r + dr, c + dc));
  }
  return out;
}

export function initialState(day: string, now: number): State {
  const grid = new Array(TILES).fill(NONE);
  grid[indexOf(CENTER, CENTER)] = MINE;
  for (const i of neighbors(indexOf(CENTER, CENTER))) grid[i] = MINE;
  // 三个敌营，固定在三个角，留一个角给玩家当突破口
  grid[indexOf(0, 0)] = FOE;
  grid[indexOf(0, GRID - 1)] = FOE;
  grid[indexOf(GRID - 1, 0)] = FOE;
  return {
    grid,
    troops: 30,
    day,
    steps: 0,
    lastSettle: now,
    lastRaid: now,
    cleared: 0,
    totalOwned: 5,
    streak: 1,
    lastDay: day,
  };
}

export function ownedCount(grid: number[]): number {
  let n = 0;
  for (const v of grid) if (v === MINE) n++;
  return n;
}

export function foeCount(grid: number[]): number {
  let n = 0;
  for (const v of grid) if (v === FOE) n++;
  return n;
}

/** 占领成本：离中心越远越贵，每通关一张图整体上浮 25% */
export function costOf(i: number, cleared = 0): number {
  const r = rowOf(i), c = colOf(i);
  const d = Math.abs(r - CENTER) + Math.abs(c - CENTER);
  const base = 6 + d * 5;
  return Math.max(4, Math.round(base * (1 + cleared * 0.25)));
}

function hasNeighbor(grid: number[], i: number, kind: number): boolean {
  return neighbors(i).some(n => grid[n] === kind);
}

export interface ClaimCheck {
  ok: boolean;
  cost: number;
  reason: string;
}

/** 只能占「与自己领地相邻」的空地；相邻敌营的格子要按两倍成本强攻 */
export function canClaim(state: State, i: number): ClaimCheck {
  if (i < 0 || i >= TILES) return { ok: false, cost: 0, reason: '越界' };
  const v = state.grid[i];
  if (v === MINE) return { ok: false, cost: 0, reason: '已经是你的地' };
  if (!hasNeighbor(state.grid, i, MINE)) {
    return { ok: false, cost: 0, reason: '只能占和自己领地相邻的格子' };
  }
  const base = costOf(i, state.cleared);
  const cost = v === FOE ? base * 2 : base;
  if (state.troops < cost) {
    return { ok: false, cost, reason: `兵力不够，还差 ${cost - state.troops}` };
  }
  return { ok: true, cost, reason: '' };
}

/** 占领一格；返回 null 表示条件不满足（调用方用 canClaim 取原因） */
export function claim(state: State, i: number): State | null {
  const check = canClaim(state, i);
  if (!check.ok) return null;
  const grid = state.grid.slice();
  const wasFoe = grid[i] === FOE;
  grid[i] = MINE;
  return {
    ...state,
    grid,
    troops: state.troops - check.cost,
    totalOwned: state.totalOwned + 1 + (wasFoe ? 1 : 0),
  };
}

export function incomePerHour(state: State): number {
  return ownedCount(state.grid) * INCOME_PER_TILE_HOUR;
}

/** 离线/在线统一结算：按时间差产出兵力，最多补 12 小时 */
export function settle(state: State, now: number): { state: State; gain: number } {
  const elapsed = Math.max(0, Math.min(MAX_OFFLINE_MS, now - state.lastSettle));
  const gain = Math.floor((elapsed / 3600000) * incomePerHour(state));
  if (gain <= 0 && elapsed < 60000) return { state, gain: 0 };
  return {
    state: { ...state, troops: state.troops + gain, lastSettle: now },
    gain,
  };
}

function hashInt(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** 敌营反攻：每隔 6 小时夺走一格「贴着敌营的己方地」，离线最多补 2 次 */
export function raid(state: State, now: number): { state: State; lost: number } {
  const times = Math.min(
    MAX_RAIDS_PER_SETTLE,
    Math.floor(Math.max(0, now - state.lastRaid) / RAID_MS),
  );
  if (times <= 0) return { state, lost: 0 };
  let grid = state.grid.slice();
  let lost = 0;
  for (let k = 0; k < times; k++) {
    const cands: number[] = [];
    for (let i = 0; i < TILES; i++) {
      if (grid[i] === MINE && hasNeighbor(grid, i, FOE)) cands.push(i);
    }
    if (!cands.length) break;
    const pick = cands[hashInt(`${state.day}:${state.cleared}:${k}`) % cands.length];
    grid[pick] = FOE;
    lost++;
  }
  if (lost === 0) return { state: { ...state, lastRaid: now }, lost: 0 };
  return { state: { ...state, grid, lastRaid: now }, lost };
}

export function stepToTroops(deltaSteps: number): number {
  return Math.floor(Math.max(0, deltaSteps) / STEPS_PER_TROOP);
}

/** 把「今日步数」的增量换成兵力；重复同步同一数字不会重复发放 */
export function applySteps(state: State, todaySteps: number): { state: State; gained: number; delta: number } {
  const total = Math.max(0, Math.floor(todaySteps));
  const delta = Math.max(0, total - state.steps);
  const gained = stepToTroops(delta);
  return {
    state: { ...state, steps: state.steps + delta, troops: state.troops + gained },
    gained,
    delta,
  };
}

/** 跨天：步数额度归零、连续登录 +1，其余进度保留 */
export function rollDay(state: State, day: string): { state: State; newDay: boolean } {
  if (state.day === day) return { state, newDay: false };
  const y = new Date(state.lastDay + 'T00:00:00').getTime();
  const t = new Date(day + 'T00:00:00').getTime();
  const gap = Math.round((t - y) / 86400000);
  const streak = gap === 1 ? state.streak + 1 : 1;
  return {
    state: { ...state, day, steps: 0, streak, lastDay: day },
    newDay: true,
  };
}

export function isCleared(state: State): boolean {
  return state.grid.every(v => v === MINE);
}

/** 通关：重开一张更贵的地图，保留兵力与通关数，并给一笔通关奖励 */
export function nextMap(state: State, now: number): State {
  const fresh = initialState(state.day, now);
  return {
    ...fresh,
    troops: state.troops + 120 + state.cleared * 60,
    cleared: state.cleared + 1,
    totalOwned: state.totalOwned,
    streak: state.streak,
    lastDay: state.lastDay,
    steps: state.steps,
  };
}

export function pctComplete(state: State): number {
  return Math.round((ownedCount(state.grid) / TILES) * 100);
}

/** 分享码只带「通关数 / 已占格数 / 兵力」，好友点进来看到的是同进度的领地 */
export function encodeShare(state: State): string {
  return [state.cleared, ownedCount(state.grid), Math.min(999999, state.troops)].join('~');
}

export function decodeShare(raw: string): { cleared: number; owned: number; troops: number } | null {
  if (typeof raw !== 'string' || raw.length > 24) return null;
  const parts = raw.split('~');
  if (parts.length !== 3) return null;
  const nums = parts.map(v => Number(v));
  if (!nums.every(n => Number.isInteger(n) && n >= 0)) return null;
  const [cleared, owned, troops] = nums;
  if (cleared > 999 || owned > TILES || troops > 999999) return null;
  return { cleared, owned, troops };
}

export function clampInt(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(v)));
}
