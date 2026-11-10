// 纯逻辑层：不依赖 platform / DOM，可被 verify.mjs 单独 bundle 做数值回归。
// 设计约束：零阅读、无倒计时、掉落不惩罚、同一条链跨年龄分层。

export interface Stage {
  key: string;
  label: string;
  color: string;
}

export interface Line {
  id: string;
  name: string;
  stages: Stage[];
}

export interface SpeedPreset {
  id: string;
  label: string;
  vy: number;      // px / 帧（60fps）
  auto: boolean;    // 自动档：盘子跟着物体走，完全不用操作
}

export const SPEEDS: SpeedPreset[] = [
  { id: 'slow', label: '慢', vy: 1.5, auto: false },
  { id: 'normal', label: '常', vy: 2.3, auto: false },
  { id: 'auto', label: '自动', vy: 1.5, auto: true },
];

export const DEFAULT_SPEED = 0;   // 默认慢速档，照顾银发与幼儿
export const TOTAL_STAGES = 8;

export const LINES: Line[] = [
  {
    id: 'plant',
    name: '生长',
    stages: [
      { key: 'drop', label: '水滴', color: '#6FB7E8' },
      { key: 'seed', label: '种子', color: '#B98A5E' },
      { key: 'sprout', label: '嫩芽', color: '#8FCB6B' },
      { key: 'leaves', label: '双叶', color: '#5FB97A' },
      { key: 'bud', label: '花苞', color: '#E8A0B8' },
      { key: 'flower', label: '开花', color: '#F07A9C' },
      { key: 'fruit', label: '果实', color: '#E8604C' },
      { key: 'spark', label: '光点', color: '#F5C451' },
    ],
  },
  {
    id: 'weather',
    name: '天气',
    stages: [
      { key: 'cloud', label: '云', color: '#B9C9D6' },
      { key: 'rain', label: '雨', color: '#6FB7E8' },
      { key: 'puddle', label: '水洼', color: '#7FC4D8' },
      { key: 'wave', label: '波纹', color: '#4FA8C8' },
      { key: 'fish', label: '小鱼', color: '#E8A04C' },
      { key: 'bubble', label: '气泡', color: '#A8DCEC' },
      { key: 'shell', label: '贝壳', color: '#E8B8A0' },
      { key: 'star', label: '星光', color: '#F5D96A' },
    ],
  },
];

export interface Progress {
  line: number;      // 路线索引
  stage: number;     // 当前形态下标 0..7
  round: number;     // 走完一圈的次数
  seen: string[];    // 图鉴：见过的形态 key
}

export function initialProgress(line = 0): Progress {
  const l = LINES[clampInt(line, 0, LINES.length - 1)];
  return { line: LINES.indexOf(l), stage: 0, round: 0, seen: [l.stages[0].key] };
}

export function stageOf(p: Progress): Stage {
  const l = LINES[clampInt(p.line, 0, LINES.length - 1)];
  return l.stages[clampInt(p.stage, 0, l.stages.length - 1)];
}

/** 接住一次：前进一个形态；走完一圈回到起点并 +1 轮，进度永不回退 */
export function advance(p: Progress): Progress {
  const l = LINES[clampInt(p.line, 0, LINES.length - 1)];
  const next = p.stage + 1;
  const wrap = next >= l.stages.length;
  const stage = wrap ? 0 : next;
  const round = Math.min(9999, p.round + (wrap ? 1 : 0));
  const key = l.stages[stage].key;
  const seen = p.seen.includes(key) ? p.seen.slice() : p.seen.concat(key);
  return { line: p.line, stage, round, seen };
}

/** 掉落：不扣进度、不扣轮数、不重开——原样返回 */
export function onMiss(p: Progress): Progress {
  return p;
}

/** 判定窗口比盘子略宽 10px、上下留 18px，给老人和小孩留足余量 */
export function caught(
  ballX: number, ballY: number, radius: number,
  trayX: number, trayY: number, trayW: number, trayH: number,
): boolean {
  const bottom = ballY + radius;
  const top = trayY - trayH / 2;
  return bottom >= top && bottom <= top + 18
    && Math.abs(ballX - trayX) <= trayW / 2 + 10;
}

/** 分享码只带「路线/形态/轮数」，好友点进来接着养；不含图鉴，避免链接过长 */
export function encodeShare(p: Progress): string {
  return [p.line, p.stage, p.round].join('~');
}

export function decodeShare(raw: string): Progress | null {
  if (typeof raw !== 'string' || raw.length > 40) return null;
  const parts = raw.split('~');
  if (parts.length !== 3) return null;
  const [a, b, c] = parts.map(v => Number(v));
  if (!Number.isInteger(a) || !Number.isInteger(b) || !Number.isInteger(c)) return null;
  if (a < 0 || a >= LINES.length || b < 0 || b >= TOTAL_STAGES || c < 0 || c > 9999) return null;
  const l = LINES[a];
  // 好友端把当前线路已走过的形态自动记入图鉴
  return { line: a, stage: b, round: c, seen: l.stages.slice(0, b + 1).map(s => s.key) };
}

export function clampInt(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

export function allStageKeys(): string[] {
  const keys: string[] = [];
  LINES.forEach(l => l.stages.forEach(s => keys.push(s.key)));
  return keys;
}
