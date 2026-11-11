import { platform, DESIGN_W, DESIGN_H, SharePayload, TouchPhase } from './platform';
import { UI, C, roundPath } from './ui';
import {
  State, createState, TERMS, SEASON_COLOR, currentDish, putIngredient, clearPot,
  startCooking, finishHeat, nextOrder, nextTerm, heatTick, heatSpeed,
  potMatches, QUALITY_LABEL, QUALITY_STARS, encodeShare, decodeShare, termLabel, Dish,
} from './logic';
import {
  drawIngredient, drawPot, drawPlate, drawHeatBar, drawStar, drawCoin, drawSeal, ingColor,
} from './art';
import { shareImage } from './social';
import { store } from './storage';

type Mode = 'title' | 'play';

const CARD_X = 20;
const CARD_W = DESIGN_W - 40;
const POT_X = DESIGN_W / 2;
const POT_Y = 372;
const POT_W = 210;
const POT_H = 86;
const ING_Y = 436;
const ING_H = 86;
const ING_W = 105;

function potSlotPos(i: number): { x: number; y: number } {
  return { x: POT_X - 47 + i * 94, y: 340 };
}

export class Game {
  mode: Mode = 'title';
  state: State;
  heatPos = 0;
  heatDir = 1;
  guideVisible = false;
  termDoneVisible = false;
  resultAt = 0;
  termIncome = 0;
  doubled = false;
  private t = 0;
  private friend: { term: number; year: number; money: number } | null = null;

  constructor(private ui: UI) {
    this.state = createState(store.best());
    this.guideVisible = !store.guideSeen();
    const q = platform.getLaunchQuery();
    if (typeof q.kitchen === 'string') {
      const f = decodeShare(q.kitchen);
      if (f) {
        this.friend = f;
        platform.toast(`好友做到${TERMS[f.term].name}，营收 ¥${f.money}`);
      }
    }
  }

  private dish(): Dish {
    return currentDish(this.state);
  }

  sharePayload(): SharePayload {
    const s = this.state;
    const title = `我在${TERMS[s.term].name}做${this.dish().name}，你来掌这一勺`;
    return {
      title,
      query: 'kitchen=' + encodeShare(s),
      imageUrl: shareImage(title, '跟着节气做当季的菜，火候看准中线',
        `${TERMS[s.term].name} · 营收 ¥${s.money}`),
    };
  }

  /** 返回 true 表示触摸已被场景消费；end 一律放行给按钮热区 */
  handleTouch(x: number, y: number, phase: TouchPhase): boolean {
    if (phase !== 'end') return false;
    if (this.mode !== 'play' || this.termDoneVisible || this.guideVisible) return false;

    if (this.state.phase === 'heat') {
      this.stopHeat();
      return true;
    }
    if (this.state.phase !== 'cook') return false;

    // 食材卡
    for (let i = 0; i < 3; i++) {
      const cx = 20 + i * 115;
      if (x >= cx && x <= cx + ING_W && y >= ING_Y && y <= ING_Y + ING_H) {
        const ing = TERMS[this.state.term].ings[i];
        if (this.state.pot.includes(ing)) {
          this.state.pot = this.state.pot.filter(v => v !== ing);
          platform.toast('拿出来了');
        } else if (!putIngredient(this.state, ing)) {
          platform.toast('锅里最多两样，先拿一样出来');
        }
        return true;
      }
    }

    // 点锅里的食材：取出来
    for (let i = 0; i < this.state.pot.length; i++) {
      const p = potSlotPos(i);
      const dx = x - p.x, dy = y - p.y;
      if (dx * dx + dy * dy <= 30 * 30) {
        const ing = this.state.pot[i];
        this.state.pot = this.state.pot.filter(v => v !== ing);
        platform.toast('拿出来了');
        return true;
      }
    }
    return false;
  }

  private stopHeat(): void {
    finishHeat(this.state, this.heatPos);
    this.resultAt = this.t;
    this.doubled = false;
    this.termIncome += this.state.lastReward;
    store.saveMoney(this.state.money);
    store.saveBest(this.state.year * TERMS.length + this.state.term);
    platform.vibrate();
  }

  /** 结果页的双倍：看一次激励视频，这一单收入再补一份 */
  private doubleReward(): void {
    if (this.doubled) { platform.toast('这单已经双倍过了'); return; }
    platform.rewardedAd(ok => {
      if (!ok) { platform.toast('没看完，这单不翻倍'); return; }
      this.doubled = true;
      this.state.money += this.state.lastReward;
      this.state.lastReward *= 2;
      this.termIncome += this.state.lastReward / 2;
      store.saveMoney(this.state.money);
      platform.toast('这单收入翻倍');
    });
  }

  private cook(): void {
    if (!startCooking(this.state)) {
      platform.toast('配不上这道菜，看看客人要的两样');
      return;
    }
    this.heatPos = 0;
    this.heatDir = 1;
  }

  private advanceOrder(): void {
    if (this.t - this.resultAt < 450) return;
    const r = nextOrder(this.state);
    if (r.termDone) {
      this.termDoneVisible = true;
      store.saveBest(this.state.year * TERMS.length + this.state.term + 1);
    }
  }

  private goNextTerm(): void {
    nextTerm(this.state);
    this.termDoneVisible = false;
    this.termIncome = 0;
    this.guideVisible = false;
  }

  private tick(): void {
    this.t += 16;
    if (this.mode !== 'play') return;
    if (this.state.phase !== 'heat') return;
    const speed = heatSpeed(this.state.term, this.state.year);
    const r = heatTick(this.heatPos, this.heatDir, speed, 0.016);
    this.heatPos = r.pos;
    this.heatDir = r.dir;
  }

  draw(): void {
    this.tick();
    if (this.mode === 'title') this.drawTitle();
    else this.drawPlay();
    if (this.termDoneVisible) this.drawTermDone();
    if (this.guideVisible) this.drawGuide();
  }

  // ---------------- 首页 ----------------
  private drawTitle(): void {
    const ui = this.ui;
    const c = ui.c;
    const term = TERMS[this.state.term];
    ui.navBar('节气厨房');

    c.fillStyle = '#FBF3E7';
    c.fillRect(0, 44, DESIGN_W, 230);
    drawPlate(c, DESIGN_W / 2, 168, 56, this.t);

    ui.text('节气厨房', DESIGN_W / 2, 246, { size: 32, bold: true, align: 'center' });
    ui.text('跟着节气，做当季的那口菜', DESIGN_W / 2, 290, {
      size: 14, color: C.greenDark, align: 'center',
    });

    drawSeal(c, DESIGN_W / 2 - 62, 322, 40, SEASON_COLOR[term.season]);
    ui.text(term.name, DESIGN_W / 2 - 42, 330, {
      size: 17, bold: true, color: SEASON_COLOR[term.season], align: 'center',
    });
    ui.text(termLabel(this.state), DESIGN_W / 2 + 46, 334, {
      size: 12, color: C.sub, align: 'center',
    });

    if (this.friend) {
      ui.text(`好友做到${TERMS[this.friend.term].name} · 营收 ¥${this.friend.money}`,
        DESIGN_W / 2, 378, { size: 12, color: C.blue, align: 'center' });
    }

    ui.button(20, 402, DESIGN_W - 40, 50, '开 门 营 业', () => { this.mode = 'play'; });
    ui.button(20, 464, DESIGN_W - 40, 44, '送 好 友', () => platform.share(this.sharePayload()), 'ghost');

    const tips = [
      '① 客人点一道菜，从当季三样里挑对两样',
      '② 下锅后看火候，指针到中线点停',
      '③ 火候刚好有加成，糊了也照样出餐',
    ];
    tips.forEach((tp, i) => {
      ui.text(tp, 28, 528 + i * 26, { size: 12.5, color: C.ink, maxWidth: 320 });
    });

    ui.text(`累计营收 ¥${this.state.money} · 出餐 ${this.state.served} 份`,
      DESIGN_W / 2, 618, { size: 12, color: C.sub, align: 'center' });
    ui.text(`历史最高 第 ${store.best() % 24 + 1} 个节气 · ¥${store.bestMoney()}`,
      DESIGN_W / 2, 640, { size: 11, color: C.warn, align: 'center' });
  }

  // ---------------- 主玩法 ----------------
  private drawPlay(): void {
    const ui = this.ui;
    const c = ui.c;
    const term = TERMS[this.state.term];
    const dish = this.dish();
    ui.navBar('节气厨房', () => {
      this.mode = 'title';
      store.saveBest(this.state.year * TERMS.length + this.state.term);
    });

    // 节气条
    ui.panel(16, 52, DESIGN_W - 32, 60, 12, C.card);
    drawSeal(c, 28, 62, 40, SEASON_COLOR[term.season]);
    ui.text(term.name, 48, 70, {
      size: 16, bold: true, color: SEASON_COLOR[term.season], align: 'center',
    });
    ui.text(`${term.season}季 · 第 ${this.state.year + 1} 年`, 78, 64, { size: 11, color: C.sub });
    ui.text(`营收 ¥${this.state.money}`, 78, 82, { size: 13, bold: true, color: C.warn });

    // 三个订单进度点
    for (let i = 0; i < 3; i++) {
      const x = 300 + i * 14;
      c.beginPath();
      c.arc(x, 82, 5, 0, Math.PI * 2);
      c.fillStyle = i < this.state.order ? C.green : i === this.state.order ? C.warn : '#E7DCCB';
      c.fill();
    }

    // 订单卡
    ui.panel(CARD_X, 120, CARD_W, 150, 14, C.card);
    ui.text(`第 ${this.state.order + 1} 单 / 共 3 单`, CARD_X + 16, 132, { size: 11, color: C.sub });
    ui.text(dish.name, CARD_X + 16, 150, { size: 19, bold: true, color: C.ink, maxWidth: 240 });
    drawCoin(c, CARD_W + 4, 158, 7);
    ui.text(`¥${dish.price}`, CARD_X + CARD_W - 10, 150, {
      size: 15, bold: true, color: C.warn, align: 'right',
    });

    // 需要的两样
    drawIngredient(c, 90, 218, 40, dish.need[0]);
    ui.text('+', 152, 206, { size: 20, color: C.sub, align: 'center' });
    drawIngredient(c, 214, 218, 40, dish.need[1]);
    ui.text(dish.need[0], 90, 244, { size: 11, color: C.ink, align: 'center' });
    ui.text(dish.need[1], 214, 244, { size: 11, color: C.ink, align: 'center' });

    // 锅
    drawPot(c, POT_X, POT_Y, POT_W, POT_H, this.t);
    for (let i = 0; i < 2; i++) {
      const p = potSlotPos(i);
      const ing = this.state.pot[i];
      if (ing) {
        drawIngredient(c, p.x, p.y, 30, ing);
      } else {
        c.save();
        c.beginPath();
        c.arc(p.x, p.y, 17, 0, Math.PI * 2);
        c.strokeStyle = 'rgba(255,255,255,0.45)';
        c.lineWidth = 1.5;
        c.setLineDash([4, 4]);
        c.stroke();
        c.restore();
      }
    }
    ui.text(this.state.pot.length === 2
      ? '点「下锅」开始掌火'
      : '点下面的当季食材，放进锅里', DESIGN_W / 2, 424, {
      size: 11, color: C.sub, align: 'center',
    });

    // 当季食材
    const ings = term.ings;
    ings.forEach((ing, i) => {
      const x = 20 + i * 115;
      const used = this.state.pot.includes(ing);
      ui.panel(x, ING_Y, ING_W, ING_H, 12, used ? '#F2ECE1' : C.card);
      if (!used) ui.outlined(x, ING_Y, ING_W, ING_H, 12, '#EFE5D8', 1);
      drawIngredient(c, x + ING_W / 2, ING_Y + 30, 34, ing);
      ui.text(ing, x + ING_W / 2, ING_Y + 56, {
        size: 12, bold: true, color: used ? C.sub : C.ink, align: 'center',
      });
      ui.regions.push({
        x, y: ING_Y, w: ING_W, h: ING_H,
        fn: () => {
          if (this.state.pot.includes(ing)) {
            this.state.pot = this.state.pot.filter(v => v !== ing);
          } else if (!putIngredient(this.state, ing)) {
            platform.toast('锅里最多两样，先拿一样出来');
          }
        },
        enabled: !used,
      });
    });

    // 操作
    ui.button(20, 534, 100, 46, '清 空', () => clearPot(this.state), 'ghost', this.state.pot.length > 0, 14);
    const ready = potMatches(this.state.pot, dish);
    ui.button(130, 534, 225, 46, ready ? '下 锅' : '还差食材', () => this.cook(),
      ready ? 'primary' : 'plain', ready, 15);

    ui.text('同一种食材只能放一次', DESIGN_W / 2, 596, { size: 11, color: C.sub, align: 'center' });
    ui.text(`已出餐 ${this.state.served} 份 · 累计星数 ${this.state.stars}`,
      DESIGN_W / 2, 618, { size: 11, color: C.sub, align: 'center' });

    if (this.state.phase === 'heat') this.drawHeatPanel();
    if (this.state.phase === 'result') this.drawResult();
  }

  // ---------------- 火候 ----------------
  private drawHeatPanel(): void {
    const ui = this.ui;
    ui.dim();
    ui.regions.push({ x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, fn: () => {}, enabled: true });
    ui.panel(18, 152, DESIGN_W - 36, 348, 16, C.card);

    ui.text('掌 火', DESIGN_W / 2, 172, { size: 22, bold: true, align: 'center' });
    ui.text(this.dish().name, DESIGN_W / 2, 206, { size: 13, color: C.sub, align: 'center' });

    drawHeatBar(ui.c, 40, 276, 295, 26, this.heatPos);

    const labels: Array<[number, string, string]> = [
      [0.15, '糊', '#A6524A'],
      [0.37, '不错', '#5F8F45'],
      [0.5, '完美', '#B8860B'],
      [0.63, '不错', '#5F8F45'],
      [0.85, '糊', '#A6524A'],
    ];
    labels.forEach(([p, label, color]) => {
      ui.text(label, 40 + 295 * p, 308, { size: 10, color, align: 'center' });
    });

    ui.button(95, 344, 185, 62, '停', () => this.stopHeat(), 'primary', true, 24);
    ui.text('指针到中线附近点「停」', DESIGN_W / 2, 420, {
      size: 12, color: C.sub, align: 'center',
    });
    ui.text('火候越快，越要沉住气', DESIGN_W / 2, 442, {
      size: 11, color: C.sub, align: 'center',
    });
  }

  // ---------------- 单份结果 ----------------
  private drawResult(): void {
    const ui = this.ui;
    const q = this.state.quality;
    if (!q) return;
    ui.dim();
    ui.regions.push({ x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, fn: () => {}, enabled: true });
    ui.panel(48, 190, 279, 320, 16, C.card);

    const color = q === 'perfect' ? '#B8860B' : q === 'good' ? C.greenDark : C.red;
    ui.text(QUALITY_LABEL[q], DESIGN_W / 2, 210, { size: 24, bold: true, color, align: 'center' });
    ui.text(`${this.dish().name} 出餐`, DESIGN_W / 2, 248, {
      size: 12, color: C.sub, align: 'center',
    });

    const stars = QUALITY_STARS[q];
    for (let i = 0; i < 3; i++) {
      drawStar(ui.c, DESIGN_W / 2 - 30 + i * 30, 286, 11, i < stars);
    }

    drawCoin(ui.c, DESIGN_W / 2 - 34, 330, 9);
    ui.text(`+¥${this.state.lastReward}`, DESIGN_W / 2 + 8, 318, {
      size: 22, bold: true, color: C.warn, align: 'center',
    });
    ui.text(q === 'burnt' ? '客人还是收下了，下次看准点' : '客人很满意', DESIGN_W / 2, 352, {
      size: 11, color: C.sub, align: 'center',
    });

    if (this.doubled) {
      ui.text('这单已经双倍', DESIGN_W / 2, 382, {
        size: 12, bold: true, color: C.greenDark, align: 'center',
      });
    } else {
      ui.button(76, 374, 223, 36, '看视频 · 这单双倍', () => this.doubleReward(), 'ghost', true, 12);
    }

    ui.button(76, 420, 223, 46, this.state.order >= 2 ? '收 工 结 账' : '下 一 单',
      () => this.advanceOrder());
    ui.text(`本关已入账 ¥${this.termIncome}`, DESIGN_W / 2, 474, {
      size: 11, color: C.sub, align: 'center',
    });
  }

  // ---------------- 节气完成 ----------------
  private drawTermDone(): void {
    const ui = this.ui;
    const term = TERMS[this.state.term];
    ui.dim();
    ui.regions.push({ x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, fn: () => {}, enabled: true });
    ui.panel(36, 176, DESIGN_W - 72, 316, 16, C.card);

    drawSeal(ui.c, DESIGN_W / 2 - 26, 196, 52, SEASON_COLOR[term.season]);
    ui.text(term.name, DESIGN_W / 2, 210, {
      size: 18, bold: true, color: SEASON_COLOR[term.season], align: 'center',
    });

    ui.text('这一节气收工了', DESIGN_W / 2, 268, { size: 21, bold: true, align: 'center' });
    ui.text(`本关营收 ¥${this.termIncome}`, DESIGN_W / 2, 306, {
      size: 15, bold: true, color: C.warn, align: 'center',
    });
    ui.text(`累计 ¥${this.state.money} · 星数 ${this.state.stars}`, DESIGN_W / 2, 332, {
      size: 12, color: C.sub, align: 'center',
    });
    ui.text('下一个节气换个当季食材，火候也更快一点', DESIGN_W / 2, 362, {
      size: 11, color: C.sub, align: 'center', maxWidth: 250,
    });

    const idx = (TERMS.findIndex(t => t.name === term.name) + 1) % TERMS.length;
    ui.button(64, 396, DESIGN_W - 128, 46, `进入${TERMS[idx].name}`, () => this.goNextTerm());
    ui.button(64, 448, DESIGN_W - 128, 32, '送 好 友', () => platform.share(this.sharePayload()), 'plain', true, 12);
  }

  // ---------------- 首次引导 ----------------
  private drawGuide(): void {
    const ui = this.ui;
    ui.dim();
    ui.regions.push({ x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, fn: () => {}, enabled: true });
    ui.panel(26, 152, DESIGN_W - 52, 330, 16, C.card);
    ui.text('怎么开这家店', DESIGN_W / 2, 174, { size: 21, bold: true, align: 'center' });

    const tips = [
      '① 客人点一道菜，卡上写着要哪两样',
      '② 从下面三样当季食材里点两样放进锅',
      '③ 下锅后指针来回跑，到中线附近点停',
      '④ 火候刚好 → 收入 ×1.6；糊了也有钱',
    ];
    tips.forEach((t, i) => {
      ui.text(t, 46, 216 + i * 46, { size: 12.5, color: C.ink, maxWidth: 285, lineHeight: 18 });
    });
    ui.text('三个单做完，就去下一个节气', DESIGN_W / 2, 414, {
      size: 13, bold: true, color: C.greenDark, align: 'center',
    });
    ui.button(48, 440, DESIGN_W - 96, 42, '开 始 做 菜', () => {
      this.guideVisible = false;
      store.markGuide();
    });
  }
}
