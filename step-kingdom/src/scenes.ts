import { platform, DESIGN_W, DESIGN_H, SharePayload, TouchPhase, estimateSteps } from './platform';
import { UI, C, roundPath } from './ui';
import {
  State, TILES, GRID, MINE, FOE, INCOME_PER_TILE_HOUR,
  canClaim, claim, rowOf, colOf, indexOf,
  isCleared, nextMap, pctComplete,
  encodeShare, decodeShare, ownedCount, incomePerHour,
  rollDay, settle, raid, applySteps, costOf,
} from './logic';
import { drawTile, drawTroop, drawBoot, drawBurst, drawMiniMap, TileKind } from './art';
import { shareImage } from './social';
import { store } from './storage';

type Mode = 'title' | 'play' | 'stats';

const CELL = 34;
const GRID_PX = CELL * GRID;
const GRID_X = (DESIGN_W - GRID_PX) / 2;
const GRID_Y = 118;
const BURST_FRAMES = 22;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class Game {
  mode: Mode = 'title';
  state: State;
  selected: number | null = null;
  todaySteps = 0;
  realSteps = false;
  stepNote = '';
  syncBusy = false;
  guideVisible = false;
  winVisible = false;
  boostUsed = false;
  private t = 0;
  private burst: { i: number; p: number } | null = null;
  private raidFlash = 0;
  private pendingGain = 0;
  private gainFlash = 0;
  private reachable = new Set<number>();
  private frameCount = 0;
  private friendLand: { cleared: number; owned: number; troops: number } | null = null;

  constructor(private ui: UI) {
    this.state = store.load();
    this.todaySteps = estimateSteps(platform.now());

    const q = platform.getLaunchQuery();
    if (typeof q.land === 'string') {
      const f = decodeShare(q.land);
      if (f) {
        this.friendLand = f;
        platform.toast(`好友已占 ${f.owned} 格，从一格开始也不慢`);
      }
    }

    this.guideVisible = !store.guideSeen();
    this.boostUsed = platform.getStore<string>('sk_boost_day', '') === platform.todayKey();
    this.refreshReachable();
  }

  private refreshReachable(): void {
    this.reachable.clear();
    for (let i = 0; i < TILES; i++) {
      if (canClaim(this.state, i).ok) this.reachable.add(i);
    }
  }

  private commit(s: State): void {
    this.state = s;
    store.save(s);
    this.refreshReachable();
  }

  private toast(msg: string): void {
    platform.toast(msg);
  }

  sharePayload(): SharePayload {
    const owned = ownedCount(this.state.grid);
    const title = `我的领地已经 ${owned} 格了，来隔壁占一格`;
    return {
      title,
      query: 'land=' + encodeShare(this.state),
      imageUrl: shareImage(title, '每 100 步换 1 兵，一格一格往外推',
        `第 ${this.state.cleared + 1} 张图 · ${owned} / ${TILES} 格`),
    };
  }

  /** 返回 true 表示触摸已被场景消费；end 一律放行给按钮热区 */
  handleTouch(x: number, y: number, phase: TouchPhase): boolean {
    if (phase !== 'end') return false;
    if (this.mode !== 'play' || this.winVisible) return false;
    if (x < GRID_X || x > GRID_X + GRID_PX || y < GRID_Y || y > GRID_Y + GRID_PX) return false;

    const col = clamp(Math.floor((x - GRID_X) / CELL), 0, GRID - 1);
    const row = clamp(Math.floor((y - GRID_Y) / CELL), 0, GRID - 1);
    const i = indexOf(row, col);

    if (this.state.grid[i] === MINE) {
      this.selected = i;
      this.toast(`你的地：每小时 +${INCOME_PER_TILE_HOUR} 兵`);
      return true;
    }

    const check = canClaim(this.state, i);
    if (!check.ok) {
      this.selected = i;
      this.toast(check.reason);
      return true;
    }
    const next = claim(this.state, i);
    if (!next) return true;
    this.commit(next);
    this.selected = i;
    this.burst = { i, p: 0 };
    platform.vibrate();
    if (isCleared(next)) {
      this.winVisible = true;
    }
    return true;
  }

  /** 每帧推进：时间驱动产出与反攻，不依赖任何倒计时 */
  private tick(): void {
    this.t += 16;
    if (this.mode !== 'play') return;

    const now = platform.now();
    const rolled = rollDay(this.state, platform.todayKey());
    if (rolled.newDay) {
      this.commit(rolled.state);
      this.todaySteps = 0;
      this.boostUsed = false;
      this.toast(`新的一天，连续 ${this.state.streak} 天`);
    }

    const s = settle(this.state, now);
    if (s.gain > 0) {
      this.commit(s.state);
      this.pendingGain += s.gain;
      this.gainFlash = 1;
    }

    const r = raid(this.state, now);
    if (r.lost > 0) {
      this.commit(r.state);
      this.raidFlash = 1;
      this.toast(`敌营反攻，丢了 ${r.lost} 格`);
    }

    if (this.burst) {
      this.burst.p += 1 / BURST_FRAMES;
      if (this.burst.p >= 1) this.burst = null;
    }
    if (this.raidFlash > 0) this.raidFlash = Math.max(0, this.raidFlash - 0.02);
    if (this.gainFlash > 0) this.gainFlash = Math.max(0, this.gainFlash - 0.02);

    this.frameCount++;
    if (this.frameCount % 1800 === 0) store.save(this.state);
  }

  private syncSteps(): void {
    if (this.syncBusy) return;
    this.syncBusy = true;
    platform.readSteps().then(r => {
      this.syncBusy = false;
      this.todaySteps = r.steps;
      this.realSteps = r.real;
      this.stepNote = r.note || (r.real ? '来自微信运动' : '本地估算');
      const res = applySteps(this.state, r.steps);
      this.commit(res.state);
      if (res.gained > 0) {
        this.toast(`今日 ${r.steps} 步 · 换到 ${res.gained} 兵`);
      } else if (res.delta > 0) {
        this.toast(`步数 +${res.delta}，还差 ${100 - (res.state.steps % 100)} 步换 1 兵`);
      } else {
        this.toast('步数没有新增，走两步再来');
      }
    }).catch(() => {
      this.syncBusy = false;
      this.toast('同步失败，稍后再试');
    });
  }

  private boost(): void {
    if (this.boostUsed) { this.toast('今天已经补过一次了'); return; }
    platform.rewardedAd(ok => {
      if (!ok) { this.toast('没看完，步数没补上'); return; }
      this.boostUsed = true;
      platform.setStore('sk_boost_day', platform.todayKey());
      const res = applySteps(this.state, this.state.steps + 2000);
      this.todaySteps = res.state.steps;
      this.commit(res.state);
      this.toast('补了 2000 步 · 20 兵');
    });
  }

  private openNextMap(): void {
    const next = nextMap(this.state, platform.now());
    this.commit(next);
    this.winVisible = false;
    this.selected = null;
    store.save(next);
    this.toast(`第 ${next.cleared + 1} 张图，地价贵了 25%`);
  }

  draw(): void {
    this.tick();
    if (this.mode === 'title') this.drawTitle();
    else if (this.mode === 'stats') this.drawStats();
    else this.drawPlay();
    if (this.winVisible) this.drawWin();
    if (this.guideVisible) this.drawGuide();
  }

  // ---------------- 首页 ----------------
  private drawTitle(): void {
    const ui = this.ui;
    const c = ui.c;
    ui.navBar('步数领地');

    c.fillStyle = '#F7FAF2';
    c.fillRect(0, 44, DESIGN_W, 120);
    ui.text('步数领地', DESIGN_W / 2, 72, { size: 34, bold: true, align: 'center' });
    ui.text('今天走过的路，就是明天占的地', DESIGN_W / 2, 120, {
      size: 14, color: C.greenDark, align: 'center',
    });

    drawMiniMap(c, DESIGN_W / 2, 268, 34, this.t);

    const owned = ownedCount(this.state.grid);
    ui.text(`${owned} / ${TILES} 格`, DESIGN_W / 2, 344, {
      size: 22, bold: true, color: C.greenDark, align: 'center',
    });

    if (this.friendLand) {
      ui.text(`好友的领地：${this.friendLand.owned} 格 · 第 ${this.friendLand.cleared + 1} 张图`,
        DESIGN_W / 2, 378, { size: 12, color: C.blue, align: 'center' });
    }

    ui.button(20, 410, DESIGN_W - 40, 50, '开 始 占 地', () => { this.mode = 'play'; });
    ui.button(20, 472, 160, 44, '领 地 统 计', () => { this.mode = 'stats'; }, 'ghost');
    ui.button(195, 472, 160, 44, '送 好 友', () => platform.share(this.sharePayload()), 'ghost');

    ui.text(`今天约 ${this.todaySteps.toLocaleString()} 步 · 每 100 步换 1 兵`,
      DESIGN_W / 2, 540, { size: 13, color: C.ink, align: 'center' });
    ui.text('只能占和自己相邻的一格，慢慢往外推', DESIGN_W / 2, 566, {
      size: 13, color: C.sub, align: 'center',
    });
    ui.text('离线也在产出，最多补 12 小时', DESIGN_W / 2, 592, {
      size: 12, color: C.sub, align: 'center',
    });

    ui.panel(20, 618, DESIGN_W - 40, 34, 8, C.greenPale);
    ui.text(`连续 ${this.state.streak} 天 · 已通关 ${this.state.cleared} 张图`,
      DESIGN_W / 2, 626, { size: 12, color: C.greenDark, align: 'center' });
  }

  // ---------------- 主玩法 ----------------
  private drawPlay(): void {
    const ui = this.ui;
    const c = ui.c;
    ui.navBar('步数领地', () => { this.mode = 'title'; });

    this.drawResourceBar();

    // 地图底
    c.fillStyle = '#DCD3BC';
    roundPath(c, GRID_X - 3, GRID_Y - 3, GRID_PX + 6, GRID_PX + 6, 8);
    c.fill();

    for (let i = 0; i < TILES; i++) {
      const x = GRID_X + colOf(i) * CELL;
      const y = GRID_Y + rowOf(i) * CELL;
      const v = this.state.grid[i];
      let kind: TileKind = 'none';
      if (v === MINE) kind = 'mine';
      else if (v === FOE) kind = 'foe';
      else if (this.reachable.has(i)) kind = 'reachable';

      const isBurst = !!this.burst && this.burst.i === i;
      const hl = isBurst && this.burst ? (1 - this.burst.p) * 0.5 : 0;
      const hasHut = v === MINE && ((rowOf(i) + colOf(i)) % 5 === 0);
      drawTile(c, x, y, CELL, kind, this.t, hasHut, hl);
    }

    if (this.burst) {
      const i = this.burst.i;
      drawBurst(c,
        GRID_X + colOf(i) * CELL + CELL / 2,
        GRID_Y + rowOf(i) * CELL + CELL / 2,
        '#F5D96A', this.burst.p);
    }

    // 选中信息
    if (this.selected !== null) {
      const i = this.selected;
      const v = this.state.grid[i];
      const label = v === MINE ? '你的地' : v === FOE ? '敌营' : '荒地';
      const cost = v === FOE ? costOf(i, this.state.cleared) * 2 : costOf(i, this.state.cleared);
      ui.text(`${label} · 第 ${rowOf(i) + 1} 行第 ${colOf(i) + 1} 列`, 20, 432, {
        size: 13, bold: true, color: C.ink,
      });
      if (v !== MINE) {
        ui.text(`占领需要 ${cost} 兵${v === FOE ? '（强攻双倍）' : ''}`, 20, 452, {
          size: 12, color: v === FOE ? C.red : C.sub,
        });
      } else {
        ui.text(`每小时产出 ${INCOME_PER_TILE_HOUR} 兵`, 20, 452, { size: 12, color: C.greenDark });
      }
      ui.text(`可占 ${this.reachable.size} 格`, DESIGN_W - 20, 432, {
        size: 12, color: C.sub, align: 'right',
      });
    } else {
      ui.text('点相邻的空地占领，点自己的地看产出', DESIGN_W / 2, 438, {
        size: 12, color: C.sub, align: 'center',
      });
    }

    ui.button(20, 478, 160, 46,
      this.syncBusy ? '同 步 中' : '同 步 步 数',
      () => this.syncSteps(), 'primary', !this.syncBusy);
    ui.button(195, 478, 160, 46, '看视频 +2000 步', () => this.boost(), 'ghost', !this.boostUsed, 14);
    ui.button(20, 534, 160, 44, '送 好 友', () => platform.share(this.sharePayload()), 'ghost');
    ui.button(195, 534, 160, 44, '领 地 统 计', () => { this.mode = 'stats'; }, 'ghost');

    const note = this.stepNote || '点「同步步数」把今天的步数换成兵力';
    ui.text(note, DESIGN_W / 2, 590, {
      size: 12, color: this.realSteps ? C.greenDark : C.sub, align: 'center', maxWidth: 335,
    });
    ui.text(`每 ${INCOME_PER_TILE_HOUR} 兵 / 格 / 小时 · 离线最多补 12 小时`,
      DESIGN_W / 2, 616, { size: 11, color: C.sub, align: 'center' });
    ui.text(`连续 ${this.state.streak} 天 · 通关 ${this.state.cleared} 次`,
      DESIGN_W / 2, 638, { size: 11, color: C.sub, align: 'center' });
  }

  private drawResourceBar(): void {
    const ui = this.ui;
    const c = ui.c;
    const y = 52;
    const w = (DESIGN_W - 40 - 16) / 3;

    const cards: Array<{ label: string; value: string; color: string }> = [
      { label: '兵力', value: String(Math.floor(this.state.troops)), color: C.greenDark },
      { label: '今日步数', value: this.todaySteps.toLocaleString(), color: C.ink },
      { label: '每小时', value: `+${incomePerHour(this.state)}`, color: C.warn },
    ];

    cards.forEach((card, i) => {
      const x = 20 + i * (w + 8);
      ui.panel(x, y, w, 56, 10, C.card);
      ui.text(card.label, x + w / 2, y + 9, { size: 11, color: C.sub, align: 'center' });
      ui.text(card.value, x + w / 2, y + 26, {
        size: 19, bold: true, color: card.color, align: 'center',
      });
    });

    if (this.gainFlash > 0) {
      c.save();
      c.globalAlpha = this.gainFlash;
      ui.text(`+${this.pendingGain}`, 20 + w / 2, y + 44, {
        size: 11, bold: true, color: C.greenDark, align: 'center',
      });
      c.restore();
    }
    if (this.raidFlash > 0) {
      c.save();
      c.globalAlpha = this.raidFlash;
      ui.text('敌营反攻', DESIGN_W - 20 - w / 2, y + 44, {
        size: 11, bold: true, color: C.red, align: 'center',
      });
      c.restore();
    }
  }

  // ---------------- 统计 ----------------
  private drawStats(): void {
    const ui = this.ui;
    ui.navBar('领地统计', () => { this.mode = 'title'; });

    const owned = ownedCount(this.state.grid);
    const rows: Array<[string, string]> = [
      ['当前领地', `${owned} / ${TILES} 格（${pctComplete(this.state)}%）`],
      ['通关张数', `${this.state.cleared} 张`],
      ['连续登录', `${this.state.streak} 天`],
      ['累计占领', `${this.state.totalOwned} 格`],
      ['每小时产出', `${incomePerHour(this.state)} 兵`],
      ['历史最多', `${store.best()} 格`],
    ];

    rows.forEach((row, i) => {
      const y = 60 + i * 52;
      ui.panel(20, y, DESIGN_W - 40, 44, 10, C.card);
      ui.text(row[0], 36, y + 13, { size: 13, color: C.sub });
      ui.text(row[1], DESIGN_W - 36, y + 13, { size: 14, bold: true, color: C.ink, align: 'right' });
    });

    ui.text(`第 ${this.state.cleared + 1} 张图 · 地价系数 ${(1 + this.state.cleared * 0.25).toFixed(2)}x`,
      DESIGN_W / 2, 442, { size: 12, color: C.sub, align: 'center' });

    ui.button(20, 486, DESIGN_W - 40, 48, '回去占地', () => { this.mode = 'play'; });
    ui.button(20, 546, DESIGN_W - 40, 44, '送 好 友', () => platform.share(this.sharePayload()), 'ghost');
  }

  // ---------------- 通关弹窗 ----------------
  private drawWin(): void {
    const ui = this.ui;
    ui.dim();
    ui.regions.push({ x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, fn: () => {}, enabled: true });
    ui.panel(32, 190, DESIGN_W - 64, 286, 16, C.card);

    ui.text('领地连成一片了', DESIGN_W / 2, 212, { size: 22, bold: true, align: 'center' });
    ui.text(`${TILES} 格全部拿下`, DESIGN_W / 2, 248, {
      size: 14, color: C.greenDark, align: 'center',
    });
    drawTroop(ui.c, DESIGN_W / 2, 300, 22);
    ui.text(`第 ${this.state.cleared + 1} 张图已完成`, DESIGN_W / 2, 334, {
      size: 13, color: C.ink, align: 'center',
    });
    ui.text('下一张地价 +25%，但产出不变', DESIGN_W / 2, 356, {
      size: 12, color: C.sub, align: 'center',
    });
    ui.button(56, 386, DESIGN_W - 112, 46, '开 下 一 张', () => this.openNextMap());
    ui.button(56, 440, DESIGN_W - 112, 34, '先看看领地', () => {
      this.winVisible = false;
    }, 'plain', true, 13);
  }

  // ---------------- 首次引导 ----------------
  private drawGuide(): void {
    const ui = this.ui;
    ui.dim();
    ui.regions.push({ x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, fn: () => {}, enabled: true });
    ui.panel(26, 150, DESIGN_W - 52, 340, 16, C.card);
    ui.text('怎么玩', DESIGN_W / 2, 172, { size: 22, bold: true, align: 'center' });

    const tips = [
      '① 点「同步步数」，每 100 步换 1 兵',
      '② 点和自己相邻的空地，花兵占下来',
      '③ 每占一格，每小时多产 3 兵',
      '④ 敌营每 6 小时反攻一格，打回来就行',
    ];
    tips.forEach((t, i) => {
      ui.text(t, 48, 218 + i * 44, {
        size: 13, color: C.ink, maxWidth: 280, lineHeight: 18,
      });
    });
    ui.text('离线也在产出，最多补 12 小时', DESIGN_W / 2, 410, {
      size: 13, bold: true, color: C.greenDark, align: 'center',
    });
    ui.text('不着急，一格一格来', DESIGN_W / 2, 434, {
      size: 12, color: C.sub, align: 'center',
    });
    ui.button(48, 456, DESIGN_W - 96, 42, '知道了', () => {
      this.guideVisible = false;
      store.markGuide();
    });
  }
}
