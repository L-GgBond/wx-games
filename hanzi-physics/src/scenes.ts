import { platform, DESIGN_W, DESIGN_H, SharePayload } from './platform';
import { UI, C, roundPath } from './ui';
import { PIECES, byKey } from './pieces';
import { LEVELS, Level } from './levels';
import { PhysicsWorld } from './physics';
import { store } from './storage';
import { shareImage } from './social';

type Mode = 'select' | 'play';
type Phase = 'edit' | 'running' | 'won' | 'lost';
type TouchPhase = 'start' | 'move' | 'end';

interface Drag { type: string; x: number; y: number }
interface Card { type: string; x: number; y: number; w: number; h: number }

const SCENE_TOP = 56;
const SCENE_BOTTOM = 500;
const TRAY_TOP = 505;
const CARD_Y = 514;
const CARD_H = 56;
const ROW2_Y = 580;
const ROW3_Y = 626;
const K_GUIDE = 'hp_guide_v2';

export class Game {
  mode: Mode = 'select';
  phase: Phase = 'edit';
  levelIndex = 0;
  world: PhysicsWorld;
  stock: Record<string, number> = {};
  dragging: Drag | null = null;
  selectedId = -1;
  guideVisible = false;

  constructor(private ui: UI) {
    this.world = new PhysicsWorld(LEVELS[0]);
    const q = platform.getLaunchQuery();
    const layout = typeof q.layout === 'string' ? q.layout : '';
    if (layout) this.openShared(layout);
    this.guideVisible = !platform.getStore<boolean>(K_GUIDE, false);
  }

  get level(): Level { return LEVELS[this.levelIndex]; }

  private cards(): Card[] {
    const types = this.level.stock.map(s => s.type);
    const n = Math.max(1, types.length);
    const w = Math.min(84, (DESIGN_W - 24 - (n - 1) * 8) / n);
    return types.map((type, i) => ({ type, x: 12 + i * (w + 8), y: CARD_Y, w, h: CARD_H }));
  }

  private cardAt(x: number, y: number): string | null {
    if (y < CARD_Y || y > CARD_Y + CARD_H) return null;
    const c = this.cards().find(v => x >= v.x && x <= v.x + v.w);
    return c ? c.type : null;
  }

  private resetStock(): void {
    this.stock = {};
    this.level.stock.forEach(s => { this.stock[s.type] = s.count; });
  }

  private openLevel(index: number): void {
    this.levelIndex = Math.min(LEVELS.length - 1, Math.max(0, index));
    this.world = new PhysicsWorld(this.level);
    this.resetStock();
    this.phase = 'edit';
    this.dragging = null;
    this.selectedId = -1;
    this.mode = 'play';
  }

  /** 分享码来自外部链接，全部字段都要限幅，避免损坏/恶意链接卡死渲染 */
  private openShared(code: string): void {
    const parts = code.split('~');
    const idx = parseInt(parts[0], 10);
    this.openLevel(isFinite(idx) ? idx : 0);
    const body = (parts[1] || '').slice(0, 600);
    body.split('_').slice(0, 16).forEach(token => {
      if (!token || token.length > 40) return;
      const [k, sx, sy, sa] = token.split(',');
      const type = byKey(k);
      if (!type) return;
      const x = Number(sx), y = Number(sy), a = Number(sa) / 100;
      if (!isFinite(x) || !isFinite(y) || !isFinite(a) || Math.abs(a) > Math.PI) return;
      if (x < -50 || x > 425 || y < 0 || y > 560) return;
      this.world.addPiece(type, x, y, a);
      if (this.stock[type] !== undefined) this.stock[type] = Math.max(0, this.stock[type] - 1);
    });
    platform.toast('好友的摆法已加载，点「放球」看看能不能过');
  }

  private shareCode(): string {
    const body = this.world.pieces.map(p =>
      [PIECES[p.type].key, Math.round(p.x), Math.round(p.y),
        Math.round(Math.atan2(Math.sin(p.angle), Math.cos(p.angle)) * 100)].join(','),
    ).join('_');
    return this.levelIndex + '~' + body;
  }

  sharePayload(): SharePayload {
    if (this.mode === 'play' && this.world.pieces.length > 0) {
      const title = `我搭的「${this.level.name}」字桥，你能让球进筐吗`;
      return {
        title,
        query: 'layout=' + this.shareCode(),
        imageUrl: shareImage(title, `用了 ${this.world.pieces.length} 个汉字部件`,
          `第 ${this.levelIndex + 1} 关 · ${this.level.name}`),
      };
    }
    return {
      title: '一字一关 · 用汉字部件搭一座桥',
      query: '',
      imageUrl: shareImage('偏旁当积木，把球送进筐', '八个部件，三种脾气', ''),
    };
  }

  /** 返回 true 表示本次触摸已被玩法消费，不再交给 UI 按钮 */
  handleTouch(x: number, y: number, phase: TouchPhase): boolean {
    if (this.mode !== 'play' || this.phase !== 'edit') return false;

    if (phase === 'start') {
      const type = this.cardAt(x, y);
      if (type && (this.stock[type] ?? 0) > 0) {
        this.dragging = { type, x, y };
        return true;
      }
      if (y > SCENE_TOP && y < SCENE_BOTTOM) {
        const id = this.world.hitPiece(x, y);
        if (id > 0) { this.selectedId = id; return true; }
        this.selectedId = -1;
      }
      return false;
    }

    if (phase === 'move') {
      if (this.dragging) { this.dragging.x = x; this.dragging.y = y; return true; }
      return false;
    }

    if (this.dragging) {
      const d = this.dragging;
      this.dragging = null;
      if (d.y > SCENE_TOP + 8 && d.y < SCENE_BOTTOM - 8 && (this.stock[d.type] ?? 0) > 0) {
        this.world.addPiece(d.type, d.x, d.y, PIECES[d.type].angle);
        this.stock[d.type] = (this.stock[d.type] ?? 0) - 1;
        this.selectedId = -1;
      }
      return true;
    }
    return false;
  }

  private launch(): void {
    if (this.world.pieces.length === 0) {
      platform.toast('先从下面拖一个部件到场景里');
      return;
    }
    this.selectedId = -1;
    this.dragging = null;
    this.phase = 'running';
    this.world.launch();
  }

  private retry(): void {
    this.world.resetBall();
    this.phase = 'edit';
  }

  private resetAll(): void {
    this.world.clearPieces();
    this.world.resetBall();
    this.resetStock();
    this.selectedId = -1;
    this.dragging = null;
    this.phase = 'edit';
  }

  private hint(): void {
    platform.rewardedAd(ok => {
      if (!ok) { platform.toast('没看完，提示没发放'); return; }
      this.world.clearPieces();
      this.world.resetBall();
      this.resetStock();
      this.level.solution.forEach(s => {
        this.world.addPiece(s.type, s.x, s.y, s.angle);
        if (this.stock[s.type] !== undefined) this.stock[s.type] = Math.max(0, this.stock[s.type] - 1);
      });
      this.selectedId = -1;
      this.phase = 'edit';
      platform.toast('参考坡摆好了，点「放球」看效果');
    });
  }

  draw(): void {
    if (this.mode === 'play' && this.phase === 'running') {
      this.world.step();
      if (this.world.inGoal()) {
        this.phase = 'won';
        store.markCleared(this.levelIndex, this.world.pieces.length);
        store.unlock(this.levelIndex + 1);
      } else if (this.world.isDead()) {
        this.phase = 'lost';
      }
    }
    if (this.mode === 'select') this.drawSelect();
    else this.drawPlay();
    if (this.guideVisible) this.drawGuide();
  }

  // ---------------- 选关 ----------------
  private drawSelect(): void {
    const ui = this.ui;
    ui.navBar('一字一关');
    ui.text('偏旁当积木', DESIGN_W / 2, 92, { size: 29, bold: true, align: 'center' });
    ui.text('把球送进筐', DESIGN_W / 2, 132, { size: 29, bold: true, color: C.green, align: 'center' });
    ui.text('拖部件 → 点选 → 旋转 → 放球', DESIGN_W / 2, 184, {
      size: 12, color: C.sub, align: 'center',
    });

    const unlocked = store.unlocked();
    const cleared = store.cleared();
    LEVELS.forEach((lv, i) => {
      const y = 224 + i * 88;
      const open = i <= unlocked;
      ui.panel(20, y, DESIGN_W - 40, 74, 10, open ? C.card : '#E2E2E2');
      ui.text(`第 ${i + 1} 关 · ${lv.name}`, 34, y + 12, {
        size: 16, bold: true, color: open ? C.ink : '#9A9A9A',
      });
      ui.text(open ? lv.desc : '通过上一关解锁', 34, y + 40, {
        size: 11, color: open ? C.sub : '#A5A5A5', maxWidth: 250,
      });
      const stars = store.stars(i);
      const right = !open ? '🔒'
        : stars > 0 ? '★'.repeat(stars) + '☆'.repeat(3 - stars)
        : (cleared.includes(i) ? '已通关 ✓' : '开始 ›');
      ui.text(right, DESIGN_W - 34, y + 27, {
        size: 12, bold: true, color: open ? (stars > 0 ? C.warn : C.green) : '#9A9A9A', align: 'right',
      });
      if (open) {
        ui.regions.push({ x: 20, y, w: DESIGN_W - 40, h: 74, fn: () => this.openLevel(i), enabled: true });
      }
    });

    ui.text('氵 冫 很滑 · 木 土 很涩 · 口 亻 能挡', DESIGN_W / 2, 512, {
      size: 11, color: C.sub, align: 'center',
    });
    ui.text('每个部件的脾气，就是它的字义', DESIGN_W / 2, 536, {
      size: 11, color: C.sub, align: 'center',
    });
    ui.text(`已收集 ${store.totalStars()} / ${LEVELS.length * 3} 星 · 部件用得越少星级越高`,
      DESIGN_W / 2, 566, { size: 10, color: C.warn, align: 'center' });
    ui.text('分享摆法会把坐标编码进链接，好友一键复刻', DESIGN_W / 2, 606, {
      size: 10, color: '#B0B0B0', align: 'center', maxWidth: 330,
    });
  }

  private drawPiece(type: string, x: number, y: number, angle: number, alpha = 1, selected = false): void {
    const c = this.ui.c;
    const d = PIECES[type];
    if (!d) return;
    c.save();
    c.translate(x, y);
    c.rotate(angle);
    c.globalAlpha = alpha;
    roundPath(c, -d.w / 2, -d.h / 2, d.w, d.h, 5);
    c.fillStyle = d.color;
    c.fill();
    if (selected) {
      c.strokeStyle = C.green;
      c.lineWidth = 2;
      c.stroke();
    }
    const size = Math.max(13, Math.min(20, d.h + 8));
    this.ui.text(d.glyph, 0, -size * 0.72, {
      size, color: '#FFFFFF', bold: true, align: 'center',
    });
    c.restore();
  }

  // 球体绘制统一走文件底部的 drawBallLocal

  private drawScene(): void {
    const ui = this.ui;
    const c = ui.c;
    c.fillStyle = '#F7F9F7';
    c.fillRect(0, SCENE_TOP, DESIGN_W, SCENE_BOTTOM - SCENE_TOP);
    for (let gx = 0; gx <= DESIGN_W; gx += 25) ui.line(gx, SCENE_TOP, gx, SCENE_BOTTOM, '#EDF2ED');
    for (let gy = SCENE_TOP; gy <= SCENE_BOTTOM; gy += 25) ui.line(0, gy, DESIGN_W, gy, '#EDF2ED');

    // 起点标记 + 未放球时的半透明预览球
    const b = this.level.ball;
    c.save();
    c.setLineDash([3, 3]);
    c.beginPath();
    c.arc(b.x, b.y, 13, 0, Math.PI * 2);
    c.strokeStyle = C.sub;
    c.lineWidth = 1;
    c.stroke();
    c.setLineDash([]);
    c.restore();
    ui.text('起点', b.x, b.y - 30, { size: 10, color: C.sub, align: 'center' });

    // 终点筐
    const g = this.level.goal;
    ui.panel(g.x - 5, g.y, 10, g.h, 2, '#6FBF8F');
    ui.panel(g.x + g.w + 5, g.y, 10, g.h, 2, '#6FBF8F');
    ui.panel(g.x, g.y + g.h + 2, g.w + 10, 8, 2, '#6FBF8F');
    const funnels: [number, number][] = [[g.x - 18, 0.45], [g.x + g.w + 18, -0.45]];
    funnels.forEach(([px, ang]) => {
      c.save();
      c.translate(px, g.y - 8);
      c.rotate(ang);
      roundPath(c, -14, -4, 28, 8, 3);
      c.fillStyle = '#9AD3AE';
      c.fill();
      c.restore();
    });
    c.save();
    c.setLineDash([4, 3]);
    roundPath(c, g.x, g.y, g.w, g.h, 6);
    c.strokeStyle = C.green;
    c.lineWidth = 2;
    c.stroke();
    c.setLineDash([]);
    c.restore();
    ui.text('终点', g.x + g.w / 2, g.y + g.h / 2 - 8, {
      size: 15, color: C.green, bold: true, align: 'center',
    });

    // 固定地形
    this.level.pegs.forEach(p => {
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.angle || 0);
      roundPath(c, -p.w / 2, -p.h / 2, p.w, p.h, 3);
      c.fillStyle = '#8C9A8C';
      c.fill();
      if (p.label) ui.text(p.label, 0, -7, { size: 10, color: '#FFFFFF', align: 'center' });
      c.restore();
    });

    // 轨迹
    const t = this.world.trail;
    if (t.length > 1) {
      c.beginPath();
      c.moveTo(t[0].x, t[0].y);
      for (let i = 1; i < t.length; i++) c.lineTo(t[i].x, t[i].y);
      c.strokeStyle = 'rgba(232,96,76,0.35)';
      c.lineWidth = 2;
      c.stroke();
    }

    this.world.pieces.forEach(p => this.drawPiece(p.type, p.x, p.y, p.angle, 1, p.id === this.selectedId));

    const bp = this.world.ballPos();
    if (bp) drawBallLocal(this.ui.c, bp.x, bp.y, 1);
    else if (!this.world.running) drawBallLocal(this.ui.c, b.x, b.y, 0.5);

    if (this.dragging) {
      const d = this.dragging;
      this.drawPiece(d.type, d.x, d.y, PIECES[d.type].angle, 0.55);
    }
  }

  private drawTray(): void {
    const ui = this.ui;
    ui.panel(0, TRAY_TOP, DESIGN_W, DESIGN_H - TRAY_TOP, 0, '#FFFFFF');
    ui.line(0, TRAY_TOP, DESIGN_W, TRAY_TOP);

    this.cards().forEach(card => {
      const d = PIECES[card.type];
      const left = this.stock[card.type] ?? 0;
      ui.panel(card.x, card.y, card.w, card.h, 8, left > 0 ? d.color : '#E2E2E2');
      ui.text(d.glyph, card.x + card.w / 2, card.y + 6, {
        size: 24, bold: true, color: '#FFFFFF', align: 'center',
      });
      ui.text(`${d.label} ×${left}`, card.x + card.w / 2, card.y + 36, {
        size: 10, color: '#FFFFFF', align: 'center',
      });
    });

    const editable = this.phase === 'edit';
    const hasSel = this.selectedId > 0;
    const T = Math.PI / 12;   // 旋转步长 15°，与 levels.ts 的参考解角度对齐
    ui.button(12, ROW2_Y, 80, 38, '↺ -15°', () => {
      if (this.selectedId > 0) this.world.rotate(this.selectedId, -T);
    }, 'plain', editable && hasSel, 12);
    ui.button(98, ROW2_Y, 80, 38, '↻ +15°', () => {
      if (this.selectedId > 0) this.world.rotate(this.selectedId, T);
    }, 'plain', editable && hasSel, 12);
    ui.button(184, ROW2_Y, 179, 38, editable ? '放 球' : '重 试', () => {
      if (editable) this.launch(); else this.retry();
    }, 'primary', true, 15);

    const w = 82;
    ui.button(12, ROW3_Y, w, 32, '✕ 收回', () => {
      if (this.selectedId <= 0) return;
      const p = this.world.pieces.find(v => v.id === this.selectedId);
      if (!p) return;
      this.world.remove(p.id);
      this.stock[p.type] = (this.stock[p.type] ?? 0) + 1;
      this.selectedId = -1;
    }, 'ghost', editable && hasSel, 12);
    ui.button(100, ROW3_Y, w, 32, '重置', () => this.resetAll(), 'ghost', true, 12);
    ui.button(188, ROW3_Y, w, 32, '看提示', () => this.hint(), 'ghost', editable, 12);
    ui.button(276, ROW3_Y, w, 32, '分享', () => {
      if (this.world.pieces.length === 0) { platform.toast('先摆几个部件再分享'); return; }
      platform.share(this.sharePayload());
    }, 'ghost', true, 12);
  }

  private drawOverlay(): void {
    const ui = this.ui;
    if (this.phase !== 'won' && this.phase !== 'lost') return;
    const won = this.phase === 'won';
    const h = 214;
    const y = (DESIGN_H - h) / 2;
    ui.dim();
    ui.regions.push({ x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, fn: () => {}, enabled: true });
    ui.panel(24, y, DESIGN_W - 48, h, 14, C.card);

    ui.text(won ? '√  进筐了' : '×  没进筐', DESIGN_W / 2, y + 22, {
      size: 22, bold: true, color: won ? C.green : C.red, align: 'center',
    });
    const stars = won ? store.stars(this.levelIndex) : 0;
    ui.text(won
      ? `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}  ${this.world.pieces.length} 个部件 · ${(this.world.elapsed / 1000).toFixed(1)} 秒`
      : '球没落到筐里，换个角度或加一块挡板',
      DESIGN_W / 2, y + 58, { size: 12, color: won ? C.warn : C.sub, align: 'center', maxWidth: 290 });

    const last = this.levelIndex >= LEVELS.length - 1;
    ui.button(40, y + 92, DESIGN_W - 80, 40,
      won ? (last ? '再来一次' : '下一关') : '再试一次',
      () => {
        if (won && !last) this.openLevel(this.levelIndex + 1);
        else this.retry();
      });
    ui.button(40, y + 142, (DESIGN_W - 88) / 2, 38, '看提示',
      () => { this.retry(); this.hint(); }, 'ghost', true, 13);
    ui.button(40 + (DESIGN_W - 88) / 2 + 8, y + 142, (DESIGN_W - 88) / 2, 38,
      '分享摆法', () => platform.share(this.sharePayload()), 'plain', true, 13);
  }

  private drawPlay(): void {
    const ui = this.ui;
    ui.navBar(`第 ${this.levelIndex + 1} 关 · ${this.level.name}`, () => { this.mode = 'select'; });
    ui.text(this.level.hint, DESIGN_W / 2, 46, { size: 10, color: C.sub, align: 'center' });
    this.drawScene();

    let tip = '从下面拖部件到场景里，点一下可选中';
    if (this.dragging) {
      const d = PIECES[this.dragging.type];
      tip = `${d.label} · ${d.desc}`;
    } else if (this.selectedId > 0) {
      tip = '已选中 · 用 ↺↻ 调角度，第三行可收回';
    }
    ui.text(tip, DESIGN_W / 2, 480, { size: 10, color: '#9AA79A', align: 'center' });
    this.drawTray();
    this.drawOverlay();
  }

  // ---------------- 首次引导 ----------------
  private drawGuide(): void {
    const ui = this.ui;
    ui.dim();
    ui.regions.push({ x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, fn: () => {}, enabled: true });
    ui.panel(28, 168, DESIGN_W - 56, 320, 16, C.card);
    ui.text('怎么玩', DESIGN_W / 2, 188, { size: 22, bold: true, align: 'center' });
    const tips = [
      '① 从下面把汉字部件拖到场景里',
      '② 点一下选中，用 ↺↻ 每次转 15°',
      '③ 部件有脾气：氵冫很滑、木土很涩、口亻能挡',
      '④ 点「放球」，让球落进绿筐就算过关',
    ];
    tips.forEach((t, i) => {
      ui.text(t, 48, 234 + i * 44, { size: 12, color: C.sub, maxWidth: 278, lineHeight: 17 });
    });
    ui.text('用得越少，星级越高', DESIGN_W / 2, 414, {
      size: 11, color: C.warn, align: 'center',
    });
    ui.button(48, 440, DESIGN_W - 96, 42, '开始', () => {
      this.guideVisible = false;
      platform.setStore(K_GUIDE, true);
    });
  }
}

/** 独立的球体绘制，避免每帧重复创建闭包 */
function drawBallLocal(c: any, x: number, y: number, alpha: number): void {
  c.save();
  c.globalAlpha = alpha;
  c.beginPath();
  c.arc(x, y, 9, 0, Math.PI * 2);
  c.fillStyle = '#E8604C';
  c.fill();
  c.strokeStyle = '#B84232';
  c.lineWidth = 1;
  c.stroke();
  c.beginPath();
  c.arc(x - 3, y - 3, 3, 0, Math.PI * 2);
  c.fillStyle = 'rgba(255,255,255,0.75)';
  c.fill();
  c.restore();
}
