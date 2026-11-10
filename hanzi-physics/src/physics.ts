// 极简刚体：只解决「一个圆球 + 若干静态旋转矩形」。
// 不引入 Matter.js：小游戏里没有 window/document，第三方 UMD 包会带来环境风险与 220KB 冗余。
// 每帧固定 60Hz、2 个子步、3 次碰撞迭代，保证同一套摆法在好友手机上可复现。
import { Level } from './levels';
import { PIECES } from './pieces';

const STEP = 1000 / 60;
const GRAVITY = 0.32;      // px / 帧²
const AIR_DRAG = 0.0006;
const RADIUS = 9;
const SUBSTEPS = 2;
const ITERATIONS = 3;
const STALL_FRAMES = 90;   // 静止 1.5 秒即判失败，不让玩家干等超时

export interface PlacedPiece {
  id: number;
  type: string;
  x: number;
  y: number;
  angle: number;
}

interface PhysRect {
  id: number;             // -1 = 地形/边界，>0 = 玩家部件
  x: number; y: number;
  w: number; h: number;
  angle: number;
  friction: number;
  restitution: number;
}

interface Ball {
  x: number; y: number;
  vx: number; vy: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export class PhysicsWorld {
  pieces: PlacedPiece[] = [];
  trail: { x: number; y: number }[] = [];
  elapsed = 0;
  running = false;
  ball: Ball | null = null;
  private rects: PhysRect[] = [];
  private nextId = 1;
  private stallFrames = 0;

  constructor(public level: Level) {
    // 场景边界：x ∈ [0,375]，y ∈ [56,500]，y=508 为死亡地面
    this.addRect(-1, -8, 278, 16, 560, 0, 0.6, 0.1);
    this.addRect(-1, 383, 278, 16, 560, 0, 0.6, 0.1);
    this.addRect(-1, 187, 508, 380, 16, 0, 0.8, 0);
    level.pegs.forEach(p => this.addRect(-1, p.x, p.y, p.w, p.h, p.angle || 0, 0.7, 0.05));

    // 终点筐：左右墙 + 底板，开口朝上
    const g = level.goal;
    this.addRect(-1, g.x - 5, g.y + g.h / 2, 10, g.h, 0, 0.7, 0);
    this.addRect(-1, g.x + g.w + 5, g.y + g.h / 2, 10, g.h, 0, 0.7, 0);
    this.addRect(-1, g.x + g.w / 2, g.y + g.h + 5, g.w + 20, 10, 0, 0.9, 0);
    // 筐口两侧导流斜板：擦到筐边的球被导入筐，而不是卡在墙顶
    this.addRect(-1, g.x - 18, g.y - 8, 28, 8, 0.45, 0.6, 0);
    this.addRect(-1, g.x + g.w + 18, g.y - 8, 28, 8, -0.45, 0.6, 0);
  }

  private addRect(
    id: number, x: number, y: number, w: number, h: number,
    angle: number, friction: number, restitution: number,
  ): void {
    this.rects.push({ id, x, y, w, h, angle, friction, restitution });
  }

  addPiece(type: string, x: number, y: number, angle: number): PlacedPiece | null {
    const d = PIECES[type];
    if (!d) return null;
    const p: PlacedPiece = { id: this.nextId++, type, x, y, angle };
    this.pieces.push(p);
    this.addRect(p.id, x, y, d.w, d.h, angle, d.friction, d.restitution);
    return p;
  }

  remove(id: number): void {
    const i = this.pieces.findIndex(p => p.id === id);
    if (i < 0) return;
    this.pieces.splice(i, 1);
    const r = this.rects.findIndex(v => v.id === id);
    if (r >= 0) this.rects.splice(r, 1);
  }

  clearPieces(): void {
    while (this.pieces.length) this.remove(this.pieces[0].id);
  }

  rotate(id: number, delta: number): void {
    const p = this.pieces.find(v => v.id === id);
    const r = this.rects.find(v => v.id === id);
    if (!p || !r) return;
    // 归一化到 [-π, π]：防止连点旋转攒出 300°，导致分享码被好友端拒绝
    const next = p.angle + delta;
    p.angle = Math.atan2(Math.sin(next), Math.cos(next));
    r.angle = p.angle;
  }

  /** 命中测试：把点击坐标反旋转到部件本地坐标 */
  hitPiece(x: number, y: number): number {
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const p = this.pieces[i];
      const d = PIECES[p.type];
      const [lx, ly] = toLocal(x - p.x, y - p.y, p.angle);
      if (Math.abs(lx) <= d.w / 2 + 6 && Math.abs(ly) <= Math.max(d.h / 2, 12) + 8) return p.id;
    }
    return -1;
  }

  launch(): void {
    this.resetBall();
    const b = this.level.ball;
    this.ball = { x: b.x, y: b.y, vx: b.vx || 0, vy: 0 };
    this.running = true;
  }

  resetBall(): void {
    this.ball = null;
    this.trail = [];
    this.elapsed = 0;
    this.running = false;
    this.stallFrames = 0;
  }

  /** 圆 vs 旋转矩形：最近点 + 法向推出 + 法向反弹 + 切向摩擦衰减 */
  private collide(r: PhysRect): void {
    const b = this.ball;
    if (!b) return;
    const cos = Math.cos(r.angle), sin = Math.sin(r.angle);
    let [lx, ly] = toLocal(b.x - r.x, b.y - r.y, r.angle);
    const hx = r.w / 2, hy = r.h / 2;
    const cx = clamp(lx, -hx, hx), cy = clamp(ly, -hy, hy);
    let nx = lx - cx, ny = ly - cy;
    let dist = Math.hypot(nx, ny);
    if (dist >= RADIUS) return;

    if (dist < 1e-6) {
      // 球心陷进矩形内部：沿最浅的一侧推出
      const px = hx - Math.abs(lx), py = hy - Math.abs(ly);
      if (px < py) { nx = lx >= 0 ? 1 : -1; ny = 0; }
      else { nx = 0; ny = ly >= 0 ? 1 : -1; }
      dist = 0;
    } else {
      nx /= dist; ny /= dist;
    }
    const pen = RADIUS - dist;

    // 位置推出（局部），再转回世界
    lx += nx * pen;
    ly += ny * pen;
    b.x = r.x + lx * cos - ly * sin;
    b.y = r.y + lx * sin + ly * cos;

    // 速度转到局部，分解法向 / 切向
    let lvx = b.vx * cos + b.vy * sin;
    let lvy = -b.vx * sin + b.vy * cos;
    const vn = lvx * nx + lvy * ny;
    let tvx = lvx - vn * nx, tvy = lvy - vn * ny;
    const nvn = vn < 0 ? -vn * r.restitution : vn;
    const decay = 1 - Math.min(0.35, r.friction * 0.16);
    tvx *= decay; tvy *= decay;
    lvx = tvx + nvn * nx;
    lvy = tvy + nvn * ny;
    b.vx = lvx * cos - lvy * sin;
    b.vy = lvx * sin + lvy * cos;
  }

  step(): void {
    const b = this.ball;
    if (!this.running || !b) return;
    for (let s = 0; s < SUBSTEPS; s++) {
      b.vy += GRAVITY / SUBSTEPS;
      b.vx *= 1 - AIR_DRAG;
      b.vy *= 1 - AIR_DRAG;
      b.x += b.vx / SUBSTEPS;
      b.y += b.vy / SUBSTEPS;
      for (let it = 0; it < ITERATIONS; it++) {
        for (const r of this.rects) this.collide(r);
      }
    }
    this.elapsed += STEP;
    this.trail.push({ x: b.x, y: b.y });
    if (this.trail.length > 200) this.trail.shift();

    // 球停在平台/被部件卡住时提前判失败（起点后的头 1.2 秒不计数）
    if (Math.hypot(b.vx, b.vy) < 0.12 && this.elapsed > 1200) this.stallFrames++;
    else this.stallFrames = 0;
  }

  inGoal(): boolean {
    if (!this.ball) return false;
    const b = this.ball, g = this.level.goal;
    // 6px 是筐口导流斜板的容差；y 从筐口算起，球一落入即判成功
    return b.x >= g.x - 6 && b.x <= g.x + g.w + 6
      && b.y >= g.y && b.y <= g.y + g.h + 12;
  }

  isDead(): boolean {
    if (!this.ball) return false;
    return this.ball.y > 500 || this.elapsed > 9000 || this.stallFrames > STALL_FRAMES;
  }

  ballPos(): { x: number; y: number } | null {
    return this.ball ? { x: this.ball.x, y: this.ball.y } : null;
  }
}

/** 世界向量 → 矩形局部向量（旋转 -angle） */
function toLocal(dx: number, dy: number, angle: number): [number, number] {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  return [dx * cos + dy * sin, -dx * sin + dy * cos];
}
