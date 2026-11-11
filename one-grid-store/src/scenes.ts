import { platform, DESIGN_W, DESIGN_H, SharePayload, TouchPhase } from './platform';
import { UI, C, roundPath } from './ui';
import {
  State, createState, pick, undo, addSlot, shuffleShelves, progressOf, starsOf,
  levelConfig, encodeShare, decodeShare, COLS, ROWS, MAX_SLOTS, UNDO_PER_LEVEL,
} from './logic';
import {
  drawShelfCell, drawEmptyCell, drawBasketSlot, drawProgress,
  drawCoin, drawPop, drawGoods, GOODS_COLORS,
} from './art';
import { shareImage } from './social';
import { store } from './storage';

type Mode = 'title' | 'play';

const CELL_W = 83;
const CELL_H = 68;
const CELL_GAP_X = 6;
const CELL_GAP_Y = 6;
const GRID_X = 12;
const GRID_Y = 122;
const BASKET_Y = 502;
const BASKET_SIZE = 36;
const BASKET_GAP = 4;

function shelfRect(i: number): { x: number; y: number; w: number; h: number } {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  return {
    x: GRID_X + col * (CELL_W + CELL_GAP_X),
    y: GRID_Y + row * (CELL_H + CELL_GAP_Y),
    w: CELL_W,
    h: CELL_H,
  };
}

function basketRect(i: number, slots: number): { x: number; y: number; s: number } {
  const total = slots * (BASKET_SIZE + BASKET_GAP) - BASKET_GAP;
  const startX = (DESIGN_W - total) / 2;
  return { x: startX + i * (BASKET_SIZE + BASKET_GAP), y: BASKET_Y, s: BASKET_SIZE };
}

export class Game {
  mode: Mode = 'title';
  state: State;
  guideVisible = false;
  private t = 0;
  private pops: Array<{ x: number; y: number; color: string; p: number }> = [];
  private friend: { level: number; revenue: number } | null = null;

  constructor(private ui: UI) {
    this.state = createState(store.level());
    this.guideVisible = !store.guideSeen();
    const q = platform.getLaunchQuery();
    if (typeof q.store === 'string') {
      const f = decodeShare(q.store);
      if (f) {
        this.friend = f;
        platform.toast(`好友在第 ${f.level} 关做到 ¥${f.revenue}`);
      }
    }
  }

  sharePayload(): SharePayload {
    const s = this.state;
    const title = `我在第 ${s.level} 关做到 ¥${s.revenue}，你来理这排货架`;
    return {
      title,
      query: 'store=' + encodeShare(s),
      imageUrl: shareImage(title, '同款凑满三个就消，篮子只有七个',
        `第 ${s.level} 关 · 目标 ¥${s.target}`),
    };
  }

  private toast(msg: string): void {
    platform.toast(msg);
  }

  /** 返回 true 表示触摸已被场景消费；end 一律放行给按钮热区 */
  handleTouch(x: number, y: number, phase: TouchPhase): boolean {
    if (phase !== 'end') return false;
    if (this.mode !== 'play' || this.state.phase !== 'play') return false;
    if (this.guideVisible) return false;

    for (let i = 0; i < COLS * ROWS; i++) {
      const r = shelfRect(i);
      if (x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) continue;
      const cell = this.state.shelves[i];
      if (!cell) return true;
      const res = pick(this.state, i);
      if (!res.ok) {
        this.toast(res.reason);
        return true;
      }
      if (res.matched) {
        platform.vibrate();
        this.pops.push({
          x: DESIGN_W / 2, y: BASKET_Y + BASKET_SIZE / 2,
          color: GOODS_COLORS[cell.kind], p: 0,
        });
        this.toast(`消掉一组 · +¥${res.gained}`);
      }
      // 最高营收随时更新（内部只在变大时写入）
      store.saveRevenue(this.state.revenue);
      return true;
    }
    return false;
  }

  private tick(): void {
    this.t += 16;
    for (const p of this.pops) p.p += 1 / 22;
    this.pops = this.pops.filter(p => p.p < 1);
  }

  private nextLevel(): void {
    const lv = this.state.level + 1;
    store.saveLevel(lv);
    this.state = createState(lv);
    this.pops = [];
    this.mode = 'play';
  }

  private retry(): void {
    this.state = createState(this.state.level);
    this.pops = [];
  }

  private useSlot(): void {
    platform.rewardedAd(ok => {
      if (!ok) { this.toast('没看完，槽位没加上'); return; }
      if (addSlot(this.state)) this.toast(`篮子扩到 ${this.state.slots} 格`);
      else this.toast('已经加满了');
    });
  }

  private useShuffle(): void {
    platform.rewardedAd(ok => {
      if (!ok) { this.toast('没看完，没洗牌'); return; }
      shuffleShelves(this.state);
      this.toast('货架重排了一遍');
    });
  }

  draw(): void {
    this.tick();
    if (this.mode === 'title') this.drawTitle();
    else this.drawPlay();
    if (this.guideVisible) this.drawGuide();
  }

  // ---------------- 首页 ----------------
  private drawTitle(): void {
    const ui = this.ui;
    const c = ui.c;
    ui.navBar('一格便利店');

    c.fillStyle = '#EAF6EF';
    c.fillRect(0, 44, DESIGN_W, 240);
    // 一排小货架做装饰
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 4; j++) {
        const x = 74 + i * 76;
        const y = 96 + j * 44;
        roundPath(c, x, y, 64, 38, 8);
        c.fillStyle = '#FFFFFF';
        c.fill();
        drawGoods(c, x + 32, y + 19, 26, (i * 4 + j) % 8);
      }
    }

    ui.text('一格便利店', DESIGN_W / 2, 268, { size: 32, bold: true, align: 'center' });
    ui.text('货架上的同款，凑满三个就消', DESIGN_W / 2, 312, {
      size: 14, color: C.greenDark, align: 'center',
    });

    if (this.friend) {
      ui.text(`好友在第 ${this.friend.level} 关 · ¥${this.friend.revenue}`,
        DESIGN_W / 2, 340, { size: 12, color: C.blue, align: 'center' });
    }

    ui.button(20, 366, DESIGN_W - 40, 50, `开 店（第 ${this.state.level} 关）`, () => { this.mode = 'play'; });
    ui.button(20, 428, 160, 44, '最高营收', () => {
      this.toast(`历史最高营收 ¥${store.bestRevenue()}`);
    }, 'ghost');
    ui.button(195, 428, 160, 44, '送 好 友', () => platform.share(this.sharePayload()), 'ghost');

    const tips = [
      '① 点货架上的商品，它自己跳进篮子',
      '② 篮子里同款满 3 个自动消，换成营业额',
      '③ 篮子满了就卡住，可以加槽或洗牌救一下',
    ];
    tips.forEach((tp, i) => {
      ui.text(tp, 28, 496 + i * 26, { size: 12.5, color: C.ink, maxWidth: 320 });
    });
    ui.text(`历史最高 第 ${store.level()} 关 · ¥${store.bestRevenue()}`,
      DESIGN_W / 2, 604, { size: 12, color: C.warn, align: 'center' });
    ui.text('不赶时间，想清楚再点', DESIGN_W / 2, 630, {
      size: 11, color: C.sub, align: 'center',
    });
  }

  // ---------------- 主玩法 ----------------
  private drawPlay(): void {
    const ui = this.ui;
    const c = ui.c;
    const s = this.state;
    ui.navBar('一格便利店', () => {
      this.mode = 'title';
      store.saveRevenue(s.revenue);
    });

    // 顶栏
    ui.panel(12, 52, DESIGN_W - 24, 58, 12, C.card);
    ui.text(`第 ${s.level} 关`, 26, 60, { size: 14, bold: true, color: C.ink });
    ui.text(`目标 ¥${s.target}`, DESIGN_W - 26, 60, {
      size: 13, bold: true, color: C.warn, align: 'right',
    });
    drawProgress(c, 26, 82, DESIGN_W - 52, 12, progressOf(s));
    ui.text(`¥${s.revenue}`, 26, 96, { size: 11, bold: true, color: C.greenDark });
    ui.text(`剩 ${s.groupsLeft} 组`, DESIGN_W - 26, 96, {
      size: 11, color: C.sub, align: 'right',
    });

    // 货架
    ui.panel(6, 116, DESIGN_W - 12, 376, 14, '#EDF5F0');
    for (let i = 0; i < COLS * ROWS; i++) {
      const r = shelfRect(i);
      const cell = s.shelves[i];
      if (cell) drawShelfCell(c, r.x, r.y, r.w, r.h, cell.kind, cell.count, this.t);
      else drawEmptyCell(c, r.x, r.y, r.w, r.h);
    }

    // 篮子
    ui.text('购物篮', 26, 486, { size: 11, color: C.sub });
    const filled = s.baskets.length;
    ui.text(`${filled} / ${s.slots}`, DESIGN_W - 26, 486, {
      size: 11, color: filled >= s.slots - 1 ? C.red : C.sub, align: 'right',
    });
    for (let i = 0; i < s.slots; i++) {
      const b = basketRect(i, s.slots);
      const kind = i < s.baskets.length ? s.baskets[i] : null;
      drawBasketSlot(c, b.x, b.y, b.s, kind, i === s.baskets.length - 1 && filled >= s.slots - 1);
    }

    // 道具
    ui.button(12, 552, 110, 42, `撤回 ${s.undoLeft}`, () => {
      if (s.undoLeft <= 0) { this.toast('这一关的撤回用完了'); return; }
      if (!undo(s)) this.toast('没有可撤回的步骤');
    }, 'ghost', s.undoLeft > 0, 13);
    ui.button(137, 552, 110, 42, '洗 牌', () => this.useShuffle(), 'ghost', true, 13);
    ui.button(262, 552, 101, 42, `加槽 ${s.slots}`, () => this.useSlot(), 'primary', s.slots < MAX_SLOTS, 13);

    ui.text(`连击 ${s.combo} · 最高连击 ${s.bestCombo}`, 20, 606, { size: 11, color: C.sub });
    ui.text(`历史最高 ¥${store.bestRevenue()}`, DESIGN_W - 20, 606, {
      size: 11, color: C.warn, align: 'right',
    });
    ui.text('点空格子没反应，点有货的格子才拿得出来', DESIGN_W / 2, 630, {
      size: 10.5, color: C.sub, align: 'center', maxWidth: 330,
    });

    // 粒子
    for (const p of this.pops) drawPop(c, p.x, p.y, p.color, p.p);

    if (s.phase === 'stuck') this.drawStuck();
    if (s.phase === 'win') this.drawWin();
    if (s.phase === 'lose') this.drawLose();
  }

  // ---------------- 卡住 ----------------
  private drawStuck(): void {
    const ui = this.ui;
    ui.dim();
    ui.regions.push({ x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, fn: () => {}, enabled: true });
    ui.panel(30, 206, DESIGN_W - 60, 300, 16, C.card);
    ui.text('篮子满了', DESIGN_W / 2, 228, {
      size: 22, bold: true, color: C.red, align: 'center',
    });
    ui.text(`七个格子都占了，还差 ${this.state.target - this.state.revenue} 营业额`,
      DESIGN_W / 2, 266, { size: 12, color: C.sub, align: 'center', maxWidth: 270 });
    ui.text('加一个槽位，或者把货架重排一遍', DESIGN_W / 2, 292, {
      size: 12, color: C.ink, align: 'center',
    });
    ui.button(52, 320, DESIGN_W - 104, 46, '看视频 · 篮子 +1 格', () => this.useSlot());
    ui.button(52, 376, (DESIGN_W - 104 - 10) / 2, 40, '洗 牌',
      () => this.useShuffle(), 'ghost', true, 13);
    ui.button(52 + (DESIGN_W - 104 - 10) / 2 + 10, 376, (DESIGN_W - 104 - 10) / 2, 40, '重 来',
      () => this.retry(), 'ghost', true, 13);
    ui.text('卡住不算输，还有救', DESIGN_W / 2, 434, { size: 11, color: C.sub, align: 'center' });
  }

  // ---------------- 过关 ----------------
  private drawWin(): void {
    const ui = this.ui;
    const s = this.state;
    const stars = starsOf(s);
    ui.dim();
    ui.regions.push({ x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, fn: () => {}, enabled: true });
    ui.panel(32, 186, DESIGN_W - 64, 320, 16, C.card);
    ui.text('打烊结账', DESIGN_W / 2, 208, { size: 23, bold: true, align: 'center' });
    ui.text(`第 ${s.level} 关达成`, DESIGN_W / 2, 246, {
      size: 13, color: C.sub, align: 'center',
    });
    drawCoin(ui.c, DESIGN_W / 2 - 40, 288, 14);
    ui.text(`¥${s.revenue}`, DESIGN_W / 2 + 8, 270, {
      size: 26, bold: true, color: C.warn, align: 'center',
    });
    ui.text(`目标 ¥${s.target} · 剩余 ${s.groupsLeft} 组`, DESIGN_W / 2, 314, {
      size: 11, color: C.sub, align: 'center',
    });
    for (let i = 0; i < 3; i++) {
      ui.c.beginPath();
      ui.c.arc(DESIGN_W / 2 - 30 + i * 30, 348, 9, 0, Math.PI * 2);
      ui.c.fillStyle = i < stars ? '#F2C14E' : '#EDF2EE';
      ui.c.fill();
    }
    ui.text(`历史最高 ¥${store.bestRevenue()}`, DESIGN_W / 2, 374, {
      size: 11, color: C.sub, align: 'center',
    });
    ui.button(56, 396, DESIGN_W - 112, 46, `进 第 ${s.level + 1} 关`, () => this.nextLevel());
    ui.button(56, 450, DESIGN_W - 112, 32, '送 好 友', () => platform.share(this.sharePayload()), 'plain', true, 12);
  }

  // ---------------- 没达标 ----------------
  private drawLose(): void {
    const ui = this.ui;
    const s = this.state;
    ui.dim();
    ui.regions.push({ x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, fn: () => {}, enabled: true });
    ui.panel(32, 200, DESIGN_W - 64, 300, 16, C.card);
    ui.text('货架空了', DESIGN_W / 2, 222, { size: 22, bold: true, color: C.red, align: 'center' });
    ui.text(`营业额 ¥${s.revenue} / ¥${s.target}`, DESIGN_W / 2, 260, {
      size: 14, bold: true, color: C.ink, align: 'center',
    });
    ui.text(`差 ¥${Math.max(0, s.target - s.revenue)}，篮子限制让几组没消成`, DESIGN_W / 2, 288, {
      size: 12, color: C.sub, align: 'center', maxWidth: 270,
    });
    ui.text('下次先清同款多的格子，别把不同种类都摊开', DESIGN_W / 2, 316, {
      size: 11, color: C.sub, align: 'center', maxWidth: 280,
    });
    ui.button(56, 348, DESIGN_W - 112, 46, '再 来 一 次', () => this.retry());
    ui.button(56, 402, DESIGN_W - 112, 32, '回 首 页', () => {
      this.mode = 'title';
      store.saveRevenue(s.revenue);
    }, 'plain', true, 12);
  }

  // ---------------- 首次引导 ----------------
  private drawGuide(): void {
    const ui = this.ui;
    const cfg = levelConfig(this.state.level);
    ui.dim();
    ui.regions.push({ x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, fn: () => {}, enabled: true });
    ui.panel(26, 152, DESIGN_W - 52, 330, 16, C.card);
    ui.text('怎么理这排货架', DESIGN_W / 2, 174, { size: 20, bold: true, align: 'center' });

    const tips = [
      '① 点有货的格子，一件商品跳进下面的篮子',
      '② 篮子里同款凑满 3 个，立刻消掉换钱',
      '③ 篮子只有 7 格，装满了会卡住',
      '④ 撤回免费 3 次，洗牌和加槽看视频换来',
    ];
    tips.forEach((t, i) => {
      ui.text(t, 46, 214 + i * 46, { size: 12.5, color: C.ink, maxWidth: 285, lineHeight: 18 });
    });
    ui.text(`本关 ${cfg.cells} 格货 · ${cfg.kinds} 种商品 · 目标 ¥${cfg.target}`,
      DESIGN_W / 2, 404, { size: 12, bold: true, color: C.greenDark, align: 'center' });
    ui.text(`共 ${UNDO_PER_LEVEL} 次撤回，省着用`, DESIGN_W / 2, 428, {
      size: 11, color: C.sub, align: 'center',
    });
    ui.button(48, 442, DESIGN_W - 96, 42, '开 始', () => {
      this.guideVisible = false;
      store.markGuide();
    });
  }
}
