// 纯逻辑层：路径 / 波次 / 怪物 / 伤害结算 / 三选一升级。
// 不依赖 platform / DOM，可被 verify.mjs 单独 bundle 跑模拟。
// 约定：step() 原地修改 state（每帧 60 次，避免大量临时对象），verify 里用固定随机数即可复现。

export const PATH: Array<{ x: number; y: number }> = [
  { x: -12, y: 138 },
  { x: 78, y: 138 },
  { x: 78, y: 238 },
  { x: 292, y: 238 },
  { x: 292, y: 338 },
  { x: 78, y: 338 },
  { x: 78, y: 428 },
  { x: 318, y: 428 },
];

/** 可放怪的槽位：都在路径两侧的空白处，坐标是设计分辨率下的绝对位置 */
export const SLOTS: Array<{ x: number; y: number }> = [
  { x: 44, y: 190 }, { x: 148, y: 190 }, { x: 240, y: 190 },
  { x: 44, y: 288 }, { x: 148, y: 288 }, { x: 240, y: 288 }, { x: 336, y: 288 },
  { x: 44, y: 388 }, { x: 148, y: 388 }, { x: 240, y: 388 },
];

export const FIELD_TOP = 96;
export const FIELD_BOTTOM = 474;

const SEG_LEN: number[] = [];
let TOTAL_LEN = 0;
for (let i = 1; i < PATH.length; i++) {
  const dx = PATH[i].x - PATH[i - 1].x;
  const dy = PATH[i].y - PATH[i - 1].y;
  const len = Math.sqrt(dx * dx + dy * dy);
  SEG_LEN.push(len);
  TOTAL_LEN += len;
}
export const PATH_LEN = TOTAL_LEN;
export { SEG_LEN };

/** 按累计路程取坐标；超出两端时收敛到端点，不抛错 */
export function posAt(dist: number): { x: number; y: number } {
  let d = Math.max(0, Math.min(PATH_LEN, dist));
  for (let i = 0; i < SEG_LEN.length; i++) {
    if (d <= SEG_LEN[i] || i === SEG_LEN.length - 1) {
      const t = SEG_LEN[i] <= 0 ? 0 : Math.min(1, d / SEG_LEN[i]);
      return {
        x: PATH[i].x + (PATH[i + 1].x - PATH[i].x) * t,
        y: PATH[i].y + (PATH[i + 1].y - PATH[i].y) * t,
      };
    }
    d -= SEG_LEN[i];
  }
  return { x: PATH[PATH.length - 1].x, y: PATH[PATH.length - 1].y };
}

export type EnemyKind = 'grunt' | 'knight' | 'rogue';

export const ENEMY_KINDS: Record<EnemyKind, {
  label: string; hp: number; speed: number; reward: number; color: string; r: number;
}> = {
  grunt: { label: '村民兵', hp: 42, speed: 26, reward: 6, color: '#E8C07A', r: 8 },
  knight: { label: '骑士', hp: 96, speed: 19, reward: 11, color: '#C9CEDA', r: 10 },
  rogue: { label: '盗贼', hp: 26, speed: 44, reward: 5, color: '#8FCB6B', r: 7 },
};

export type TowerKind = 'goblin' | 'archer' | 'mage' | 'dragon';

export const TOWERS: Array<{
  kind: TowerKind; label: string; cost: number; range: number;
  dmg: number; rate: number; color: string; desc: string; splash: number;
}> = [
  { kind: 'goblin', label: '哥布林', cost: 20, range: 74, dmg: 9, rate: 1.1, color: '#8FCB6B', desc: '投石 · 便宜', splash: 0 },
  { kind: 'archer', label: '骷髅弓手', cost: 35, range: 114, dmg: 15, rate: 0.75, color: '#C9CEDA', desc: '穿刺 · 射程远', splash: 0 },
  { kind: 'mage', label: '火法', cost: 65, range: 94, dmg: 32, rate: 0.45, color: '#F0845C', desc: '灼烧 · 溅射', splash: 44 },
  { kind: 'dragon', label: '幼龙', cost: 130, range: 146, dmg: 72, rate: 0.35, color: '#B45CE0', desc: '吐息 · 高伤', splash: 28 },
];

export function towerDef(kind: TowerKind) {
  return TOWERS.find(t => t.kind === kind) || TOWERS[0];
}

export interface Enemy {
  id: number; kind: EnemyKind; hp: number; maxHp: number;
  dist: number; speed: number; reward: number;
}

export interface Tower {
  slot: number; kind: TowerKind; cd: number; angle: number; flash: number;
}

export interface Buffs { dmg: number; rate: number; gold: number }

export type Phase = 'prep' | 'battle' | 'upgrade' | 'dead';

export interface State {
  phase: Phase;
  wave: number;
  gold: number;
  hp: number;
  maxHp: number;
  enemies: Enemy[];
  towers: Tower[];
  /** 本波要出场的兵种顺序，开波时一次性决定 */
  plan: EnemyKind[];
  prepLeft: number;
  spawnLeft: number;
  spawned: number;
  buffs: Buffs;
  kills: number;
  bestWave: number;
  nextId: number;
  lastEvent: string;
}

export const PREP_MS = 7000;
export const SPAWN_INTERVAL_MS = 720;

export function createState(bestWave = 0): State {
  return {
    phase: 'prep',
    wave: 1,
    gold: 95,
    hp: 3,
    maxHp: 3,
    enemies: [],
    towers: [],
    plan: [],
    prepLeft: PREP_MS,
    spawnLeft: 0,
    spawned: 0,
    buffs: { dmg: 1, rate: 1, gold: 1 },
    kills: 0,
    bestWave,
    nextId: 1,
    lastEvent: '',
  };
}

/** 第 n 波的组成：数量、血量、速度都随波数上浮，但速度封顶避免不可玩 */
export function waveComposition(n: number, rnd: () => number): EnemyKind[] {
  const count = Math.min(16, 4 + Math.floor((n - 1) * 0.9));
  const out: EnemyKind[] = [];
  for (let i = 0; i < count; i++) {
    const r = rnd();
    if (n <= 1) out.push('grunt');
    else if (n <= 3) out.push(r < 0.7 ? 'grunt' : 'rogue');
    else if (r < 0.5) out.push('grunt');
    else if (r < 0.8) out.push('knight');
    else out.push('rogue');
  }
  return out;
}

export function waveHpMul(n: number): number { return 1 + (n - 1) * 0.32; }
export function waveSpeedMul(n: number): number { return Math.min(1.9, 1 + (n - 1) * 0.035); }

export function startWave(s: State, rnd: () => number): void {
  s.phase = 'battle';
  s.plan = waveComposition(s.wave, rnd);
  s.spawned = 0;
  s.spawnLeft = 0;
}

function spawnNext(s: State): void {
  const kind = s.plan[s.spawned] || 'grunt';
  const def = ENEMY_KINDS[kind];
  const mul = waveHpMul(s.wave);
  const hp = Math.round(def.hp * mul);
  s.enemies.push({
    id: s.nextId++,
    kind,
    hp,
    maxHp: hp,
    dist: 0,
    speed: def.speed * waveSpeedMul(s.wave),
    reward: def.reward,
  });
  s.spawned++;
}

/** 在槽位放怪：返回是否成功（魔晶不够 / 槽位被占 都返回 false） */
export function placeTower(s: State, slot: number, kind: TowerKind): boolean {
  if (slot < 0 || slot >= SLOTS.length) return false;
  if (s.towers.some(t => t.slot === slot)) return false;
  const def = towerDef(kind);
  if (s.gold < def.cost) return false;
  s.gold -= def.cost;
  s.towers.push({ slot, kind, cd: 0, angle: 0, flash: 0 });
  return true;
}

export function towerAt(s: State, slot: number): Tower | null {
  return s.towers.find(t => t.slot === slot) || null;
}

export interface TowerStat { dps: number; kills: number }

/** 强化后的实际数值，UI 直接展示 */
export function effective(s: State, kind: TowerKind) {
  const d = towerDef(kind);
  return {
    dmg: d.dmg * s.buffs.dmg,
    rate: d.rate * s.buffs.rate,
    dps: d.dmg * s.buffs.dmg * d.rate * s.buffs.rate,
    range: d.range,
  };
}

function killDead(s: State): void {
  const alive: Enemy[] = [];
  for (const e of s.enemies) {
    if (e.hp <= 0) {
      s.gold += Math.round(e.reward * s.buffs.gold);
      s.kills++;
    } else {
      alive.push(e);
    }
  }
  s.enemies = alive;
}

/**
 * 推进一帧。dt 为毫秒。
 * 返回本帧发生的事件（供 UI 提示），空数组表示无事发生。
 */
export function step(s: State, dtMs: number, rnd: () => number): string[] {
  const events: string[] = [];
  if (s.phase === 'dead' || s.phase === 'upgrade') return events;

  const dt = Math.max(0, Math.min(100, dtMs));

  if (s.phase === 'prep') {
    s.prepLeft -= dt;
    if (s.prepLeft <= 0) {
      startWave(s, rnd);
      events.push(`第 ${s.wave} 波来了`);
    }
    return events;
  }

  // battle
  if (s.spawned < s.plan.length) {
    s.spawnLeft -= dt;
    while (s.spawnLeft <= 0 && s.spawned < s.plan.length) {
      spawnNext(s);
      s.spawnLeft += SPAWN_INTERVAL_MS;
    }
  }

  for (const e of s.enemies) e.dist += e.speed * (dt / 1000);

  // 到终点：扣王座耐久
  const escaped = s.enemies.filter(e => e.dist >= PATH_LEN);
  if (escaped.length) {
    s.enemies = s.enemies.filter(e => e.dist < PATH_LEN);
    s.hp -= escaped.length;
    events.push(escaped.length > 1 ? `${escaped.length} 个勇者冲进宝座` : '一个勇者冲进宝座');
    if (s.hp <= 0) {
      s.hp = 0;
      s.phase = 'dead';
      s.bestWave = Math.max(s.bestWave, s.wave);
      events.push('王座失守');
      return events;
    }
  }

  // 怪物开火
  for (const t of s.towers) {
    const def = towerDef(t.kind);
    t.flash = Math.max(0, t.flash - dt / 220);
    t.cd -= dt;
    if (t.cd > 0) continue;
    const pos = SLOTS[t.slot];
    let target: Enemy | null = null;
    let bestDist = -1;
    for (const e of s.enemies) {
      const p = posAt(e.dist);
      const dx = p.x - pos.x, dy = p.y - pos.y;
      if (dx * dx + dy * dy <= def.range * def.range && e.dist > bestDist) {
        bestDist = e.dist;
        target = e;
      }
    }
    if (!target) continue;
    t.angle = Math.atan2(posAt(target.dist).y - pos.y, posAt(target.dist).x - pos.x);
    t.cd = 1000 / Math.max(0.05, def.rate * s.buffs.rate);
    t.flash = 1;

    const dmg = def.dmg * s.buffs.dmg;
    target.hp -= dmg;
    if (def.splash > 0) {
      const hp = posAt(target.dist);
      for (const e of s.enemies) {
        if (e === target) continue;
        const p = posAt(e.dist);
        const dx = p.x - hp.x, dy = p.y - hp.y;
        if (dx * dx + dy * dy <= def.splash * def.splash) e.hp -= dmg * 0.5;
      }
    }
    killDead(s);
  }

  // 本波结束
  if (s.spawned >= s.plan.length && s.enemies.length === 0) {
    const done = s.wave;
    s.bestWave = Math.max(s.bestWave, done);
    if (done % 3 === 0) {
      s.phase = 'upgrade';
      events.push(`第 ${done} 波清完，选一个强化`);
    } else {
      s.wave = done + 1;
      s.phase = 'prep';
      s.prepLeft = PREP_MS;
      events.push(`第 ${done} 波清完`);
    }
  }

  return events;
}

export interface Upgrade {
  id: string;
  label: string;
  desc: string;
}

export const UPGRADES: Upgrade[] = [
  { id: 'dmg', label: '淬毒', desc: '所有怪物伤害 +15%' },
  { id: 'rate', label: '狂热', desc: '所有怪物攻速 +15%' },
  { id: 'gold', label: '贪婪', desc: '击杀魔晶 +25%' },
  { id: 'hp', label: '加固王座', desc: '耐久 +1（上限 5）' },
  { id: 'meteor', label: '陨石', desc: '立刻对全场勇者造成 30 伤害' },
];

/** 随机抽 3 个不重复的强化项 */
export function pickUpgrades(rnd: () => number, count = 3): Upgrade[] {
  const pool = UPGRADES.slice();
  const out: Upgrade[] = [];
  while (out.length < count && pool.length) {
    const i = Math.floor(rnd() * pool.length) % pool.length;
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

/** 应用强化并继续下一波；返回给 UI 的说明 */
export function applyUpgrade(s: State, id: string): string {
  if (id === 'dmg') s.buffs.dmg *= 1.15;
  else if (id === 'rate') s.buffs.rate *= 1.15;
  else if (id === 'gold') s.buffs.gold *= 1.25;
  else if (id === 'hp') {
    s.maxHp = Math.min(5, s.maxHp + 1);
    s.hp = Math.min(s.maxHp, s.hp + 1);
  } else if (id === 'meteor') {
    for (const e of s.enemies) e.hp -= 30;
    killDead(s);
  }
  s.wave += 1;
  s.phase = 'prep';
  s.prepLeft = PREP_MS;
  return id === 'meteor' ? '陨石砸下来了' : `强化已生效：${id}`;
}

/** 开战：跳过准备倒计时 */
export function rushWave(s: State, rnd: () => number): void {
  if (s.phase !== 'prep') return;
  startWave(s, rnd);
}

/** 分享码：最高波数 / 击杀数 / 耐久，好友点进来只做对比，不覆盖存档 */
export function encodeShare(s: State): string {
  return [Math.min(999, s.bestWave), Math.min(9999, s.kills), s.hp].join('~');
}

export function decodeShare(raw: string): { bestWave: number; kills: number; hp: number } | null {
  if (typeof raw !== 'string' || raw.length > 24) return null;
  const parts = raw.split('~');
  if (parts.length !== 3) return null;
  const nums = parts.map(v => Number(v));
  if (!nums.every(n => Number.isInteger(n) && n >= 0)) return null;
  const [bestWave, kills, hp] = nums;
  if (bestWave > 999 || kills > 9999 || hp > 5) return null;
  return { bestWave, kills, hp };
}

export function clampInt(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(v)));
}
