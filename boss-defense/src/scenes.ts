import { platform, DESIGN_W, DESIGN_H, SharePayload, TouchPhase } from './platform';
import { UI, C, roundPath } from './ui';
import {
  State, createState, step, rushWave, placeTower, towerAt, TOWERS, towerDef,
  SLOTS, PATH_LEN, posAt, pickUpgrades, applyUpgrade, Upgrade,
  encodeShare, decodeShare, ENEMY_KINDS, PREP_MS, TowerKind, effective,
} from './logic';
import {
  drawField, drawPath, drawSlot, drawEnemy, drawTower, drawCastle,
  drawCoin, drawHeart, drawSpawnHint,
} from './art';
import { shareImage } from './social';
import { store } from './storage';

type Mode = 'title' | 'play';

const HUD_Y = 48;
const FIELD_TOP = 96;
const FIELD_BOTTOM = 474;
const SHOP_Y = 474;
const CARD_Y = 498;
const CARD_H = 94;
const CARD_W = 81;
const CARD_GAP = 8;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class Game {
  mode: Mode = 'title';
  state: State;
  selected: TowerKind | null = 'goblin';
  speed = 1;
  guideVisible = false;
  upgradeChoices: Upgrade[] = [];
  deadVisible = false;
  private t = 0;
  private lastEvent = '';
  private eventAt = 0;
  private friend: { bestWave: number; kills: number; hp: number } | null = null;

  constructor(private ui: UI) {
    this.state = createState(store.bestWave());
    this.guideVisible = !store.guideSeen();

    const q = platform.getLaunchQuery();
    if (typeof q.boss === 'string') {
      const f = decodeShare(q.boss);
      if (f) {
        this.friend = f;
        platform.toast(`好友守到第 ${f.bestWave} 波，看看你能守多久`);
      }
    }
  }

  sharePayload(): SharePayload {
    const w = Math.max(this.state.bestWave, this.state.wave);
    const title = `我把勇者挡在第 ${w} 波，你来当这个 Boss`;
    return {
      title,
      query: 'boss=' + encodeShare(this.state),
      imageUrl: shareImage(title, '布置怪物，别让勇者走到王座',
        `击杀 ${this.state.kills} 个勇者 · 还剩 ${this.state.hp} 点耐久`),
    };
  }

  /** 返回 true 表示触摸已被场景消费；end 一律放行给按钮热区 */
  handleTouch(x: number, y: number, phase: TouchPhase): boolean {
    if (phase !== 'end') return false;
    if (this.mode !== 'play') return false;
    if (this.upgradeChoices.length || this.deadVisible || this.guideVisible) return false;

    // 槽位：把选中的怪放下去，或看已有的怪
    for (let i = 0; i < SLOTS.length; i++) {
      const p = SLOTS[i];
      const dx = x - p.x, dy = y - p.y;
      if (dx * dx + dy * dy > 24 * 24) continue;
      const exist = towerAt(this.state, i);
      if (exist) {
        const d = towerDef(exist.kind);
        platform.toast(`${d.label} · ${d.desc}`);
        return true;
      }
      if (!this.selected) { platform.toast('先在下面选一种怪'); return true; }
      const def = towerDef(this.selected);
      if (this.state.gold < def.cost) {
        platform.toast(`魔晶不够，还差 ${def.cost - this.state.gold}`);
        return true;
      }
      if (placeTower(this.state, i, this.selected)) {
        platform.vibrate();
        this.state.lastEvent = `放了 ${def.label}`;
      }
      return true;
    }
    return false;
  }

  private tick(): void {
    this.t += 16;
    if (this.mode !== 'play') return;
    if (this.upgradeChoices.length || this.deadVisible || this.guideVisible) return;

    for (let i = 0; i < this.speed; i++) {
      const events = step(this.state, 16, Math.random);
      if (events.length) this.announce(events[events.length - 1]);
    }
    if (this.state.phase === 'upgrade' && this.upgradeChoices.length === 0) {
      this.upgradeChoices = pickUpgrades(Math.random);
    }
    if (this.state.phase === 'dead' && !this.deadVisible) {
      this.deadVisible = true;
      store.saveBest(Math.max(this.state.bestWave, this.state.wave));
    }
  }

  private announce(msg: string): void {
    if (msg === this.lastEvent && this.t - this.eventAt < 1500) return;
    this.lastEvent = msg;
    this.eventAt = this.t;
    platform.toast(msg);
  }

  private choose(up: Upgrade): void {
    applyUpgrade(this.state, up.id);
    this.upgradeChoices = [];
    platform.vibrate();
    platform.toast(up.id === 'meteor' ? '陨石砸下来了' : `${up.label} 生效`);
  }

  private restart(): void {
    this.state = createState(store.bestWave());
    this.deadVisible = false;
    this.upgradeChoices = [];
    this.selected = 'goblin';
    this.speed = 1;
  }

  draw(): void {
    this.tick();
    if (this.mode === 'title') this.drawTitle();
    else this.drawPlay();
    if (this.deadVisible) this.drawDead();
    if (this.upgradeChoices.length) this.drawUpgrade();
    if (this.guideVisible) this.drawGuide();
  }

  // ---------------- 首页 ----------------
  private drawTitle(): void {
    const ui = this.ui;
    const c = ui.c;
    ui.navBar('反向塔防 · 我是 Boss');

    c.fillStyle = '#2B2033';
    c.fillRect(0, 44, DESIGN_W, 300);
    drawPathShapes(c);
    drawCastle(c, 312, 268, this.t);
    drawTower(c, 90, 150, 'goblin', 0.4, 0, this.t);
    drawTower(c, 190, 210, 'mage', -0.6, 0, this.t);
    drawTower(c, 262, 300, 'archer', 2.4, 0, this.t);
    drawEnemy(c, 60, 220, 'knight', 0.7, this.t, 1);

    ui.text('这一回，你是 Boss', DESIGN_W / 2, 364, {
      size: 26, bold: true, align: 'center', color: C.ink,
    });
    ui.text('布置怪物，别让勇者走到王座', DESIGN_W / 2, 402, {
      size: 14, color: C.greenDark, align: 'center',
    });

    if (this.friend) {
      ui.text(`好友守到第 ${this.friend.bestWave} 波 · 击杀 ${this.friend.kills}`,
        DESIGN_W / 2, 428, { size: 12, color: C.blue, align: 'center' });
    }

    ui.button(20, 456, DESIGN_W - 40, 50, '开 始 布 防', () => { this.mode = 'play'; });
    ui.button(20, 518, 160, 44, '最高波数', () => {
      platform.toast(`历史最高：第 ${store.bestWave()} 波`);
    }, 'ghost');
    ui.button(195, 518, 160, 44, '送 好 友', () => platform.share(this.sharePayload()), 'ghost');

    ui.text('上一局守到第几波，怪物和魔晶就留到哪', DESIGN_W / 2, 586, {
      size: 12, color: C.sub, align: 'center', maxWidth: 330,
    });
    ui.text('勇者走进王座会扣耐久，扣完这局就结束', DESIGN_W / 2, 612, {
      size: 12, color: C.sub, align: 'center', maxWidth: 330,
    });
    ui.text(`历史最高 第 ${store.bestWave()} 波`, DESIGN_W / 2, 644, {
      size: 12, bold: true, color: C.warn, align: 'center',
    });
  }

  // ---------------- 主玩法 ----------------
  private drawPlay(): void {
    const ui = this.ui;
    const c = ui.c;
    ui.navBar('我是 Boss', () => { this.mode = 'title'; store.saveBest(this.state.bestWave); });

    this.drawHud();

    drawField(c, FIELD_TOP, FIELD_BOTTOM, this.t);
    drawPath(c);
    drawCastle(c, 318, 440, this.t);
    if (this.state.phase === 'prep') drawSpawnHint(c, this.t);

    // 槽位与怪物
    for (let i = 0; i < SLOTS.length; i++) {
      const p = SLOTS[i];
      const tw = towerAt(this.state, i);
      if (tw) drawTower(c, p.x, p.y, tw.kind, tw.angle, tw.flash, this.t);
      else drawSlot(c, p.x, p.y, !!this.selected, this.t);
    }

    // 勇者：按路程排序，走得远的盖在上面
    const list = this.state.enemies.slice().sort((a, b) => a.dist - b.dist);
    for (const e of list) {
      const p = posAt(e.dist);
      drawEnemy(c, p.x, p.y, e.kind, e.hp / e.maxHp, this.t, e.id);
    }

    this.drawShop();
  }

  private drawHud(): void {
    const ui = this.ui;
    const s = this.state;
    ui.panel(12, HUD_Y, DESIGN_W - 24, 44, 12, C.card);

    ui.text(`第 ${s.wave} 波`, 24, HUD_Y + 8, { size: 15, bold: true, color: C.ink });
    const sub = s.phase === 'prep'
      ? `准备 ${Math.ceil(s.prepLeft / 1000)} 秒`
      : s.phase === 'battle'
        ? `剩 ${s.enemies.length + (s.plan.length - s.spawned)} 个`
        : s.phase === 'upgrade' ? '选强化' : '已结束';
    ui.text(sub, 24, HUD_Y + 26, { size: 10, color: C.sub });

    drawCoin(ui.c, 150, HUD_Y + 22, 8);
    ui.text(String(Math.floor(s.gold)), 162, HUD_Y + 14, { size: 15, bold: true, color: C.ink });

    for (let i = 0; i < s.maxHp; i++) {
      drawHeart(ui.c, 224 + i * 18, HUD_Y + 24, 8, i < s.hp);
    }

    const speedLabel = this.speed === 1 ? 'x1' : 'x2';
    ui.button(322, HUD_Y + 8, 40, 28, speedLabel, () => {
      this.speed = this.speed === 1 ? 2 : 1;
    }, this.speed === 1 ? 'plain' : 'primary', true, 12);
  }

  private drawShop(): void {
    const ui = this.ui;
    const c = ui.c;
    ui.panel(0, SHOP_Y, DESIGN_W, DESIGN_H - SHOP_Y, 0, '#FBF9FD');
    ui.line(0, SHOP_Y, DESIGN_W, SHOP_Y, C.line);

    ui.text('点一种怪，再点战场上的虚线圈放下去', DESIGN_W / 2, SHOP_Y + 8, {
      size: 11, color: C.sub, align: 'center',
    });

    TOWERS.forEach((def, i) => {
      const x = 13 + i * (CARD_W + CARD_GAP);
      const active = this.selected === def.kind;
      const afford = this.state.gold >= def.cost;
      ui.panel(x, CARD_Y, CARD_W, CARD_H, 12, active ? C.greenPale : C.card);
      if (active) ui.outlined(x, CARD_Y, CARD_W, CARD_H, 12, C.green, 1.6);

      // 卡片里的小怪预览：复用战场画法，缩小一圈
      c.save();
      c.translate(x + CARD_W / 2, CARD_Y + 30);
      c.scale(0.82, 0.82);
      drawTower(c, 0, 0, def.kind, -Math.PI / 2, 0, this.t);
      c.restore();

      ui.text(def.label, x + CARD_W / 2, CARD_Y + 50, {
        size: 11, bold: true, color: afford ? C.ink : C.sub, align: 'center',
      });
      ui.text(def.desc, x + CARD_W / 2, CARD_Y + 66, {
        size: 9, color: C.sub, align: 'center',
      });
      drawCoin(c, x + CARD_W / 2 - 12, CARD_Y + 82, 5);
      ui.text(String(def.cost), x + CARD_W / 2 + 2, CARD_Y + 76, {
        size: 11, bold: true, color: afford ? C.warn : C.red, align: 'center',
      });

      ui.regions.push({
        x, y: CARD_Y, w: CARD_W, h: CARD_H,
        fn: () => { this.selected = def.kind; },
        enabled: true,
      });
    });

    // 开战 / 重开
    if (this.state.phase === 'prep') {
      ui.button(13, 602, 220, 40, `立 刻 开 战（第 ${this.state.wave} 波）`, () => {
        rushWave(this.state, Math.random);
      }, 'primary', true, 13);
    } else {
      const st = effective(this.state, 'goblin');
      ui.text(`伤害 x${this.state.buffs.dmg.toFixed(2)} · 攻速 x${this.state.buffs.rate.toFixed(2)} · 魔晶 x${this.state.buffs.gold.toFixed(2)}`,
        13, 610, { size: 11, color: C.sub, maxWidth: 220 });
      ui.text(`哥布林 DPS ${st.dps.toFixed(1)}`, 13, 628, { size: 10, color: C.sub });
    }
    ui.button(241, 602, 121, 40, '重 开', () => this.restart(), 'ghost', true, 13);

    ui.text(`击杀 ${this.state.kills} · 历史最高 第 ${store.bestWave()} 波`,
      DESIGN_W / 2, 650, { size: 11, color: C.sub, align: 'center' });
  }

  // ---------------- 三选一 ----------------
  private drawUpgrade(): void {
    const ui = this.ui;
    ui.dim();
    ui.regions.push({ x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, fn: () => {}, enabled: true });
    ui.panel(20, 140, DESIGN_W - 40, 396, 16, C.card);
    ui.text(`第 ${this.state.wave} 波清完`, DESIGN_W / 2, 162, {
      size: 13, color: C.sub, align: 'center',
    });
    ui.text('选一个强化，接着守', DESIGN_W / 2, 186, {
      size: 20, bold: true, align: 'center',
    });

    this.upgradeChoices.forEach((up, i) => {
      const y = 228 + i * 92;
      ui.panel(38, y, DESIGN_W - 76, 80, 12, '#F8F4FD');
      ui.text(up.label, 56, y + 14, { size: 16, bold: true, color: C.greenDark });
      ui.text(up.desc, 56, y + 40, { size: 12, color: C.ink, maxWidth: 250 });
      ui.regions.push({
        x: 38, y, w: DESIGN_W - 76, h: 80,
        fn: () => this.choose(up), enabled: true,
      });
    });

    ui.text('每 3 波选一次', DESIGN_W / 2, 508, { size: 11, color: C.sub, align: 'center' });
  }

  // ---------------- 结束 ----------------
  private drawDead(): void {
    const ui = this.ui;
    const s = this.state;
    ui.dim();
    ui.regions.push({ x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, fn: () => {}, enabled: true });
    ui.panel(30, 176, DESIGN_W - 60, 326, 16, C.card);
    ui.text('王座失守', DESIGN_W / 2, 198, { size: 24, bold: true, align: 'center', color: C.red });
    ui.text(`守到第 ${Math.max(s.bestWave, s.wave)} 波`, DESIGN_W / 2, 238, {
      size: 16, bold: true, color: C.ink, align: 'center',
    });
    ui.text(`击杀 ${s.kills} 个勇者`, DESIGN_W / 2, 266, {
      size: 13, color: C.sub, align: 'center',
    });
    ui.text(`历史最高 第 ${store.bestWave()} 波`, DESIGN_W / 2, 290, {
      size: 12, color: C.warn, align: 'center',
    });
    ui.text('怪物的伤害、攻速、魔晶收益会带进下一局', DESIGN_W / 2, 318, {
      size: 11, color: C.sub, align: 'center', maxWidth: 280,
    });
    ui.button(56, 344, DESIGN_W - 112, 46, '再 来 一 局', () => this.restart());
    ui.button(56, 398, (DESIGN_W - 112 - 10) / 2, 40, '送 好 友',
      () => platform.share(this.sharePayload()), 'ghost', true, 13);
    ui.button(56 + (DESIGN_W - 112 - 10) / 2 + 10, 398, (DESIGN_W - 112 - 10) / 2, 40, '回 首 页',
      () => { this.deadVisible = false; this.mode = 'title'; }, 'ghost', true, 13);
    ui.text('耐久是这局唯一的失败条件', DESIGN_W / 2, 452, {
      size: 10, color: C.sub, align: 'center',
    });
  }

  // ---------------- 首次引导 ----------------
  private drawGuide(): void {
    const ui = this.ui;
    ui.dim();
    ui.regions.push({ x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, fn: () => {}, enabled: true });
    ui.panel(26, 150, DESIGN_W - 52, 344, 16, C.card);
    ui.text('这一局怎么打', DESIGN_W / 2, 172, { size: 21, bold: true, align: 'center' });

    const tips = [
      '① 下方选一种怪，再点战场上的虚线圈',
      '② 勇者沿路走向右下角的王座',
      '③ 放怪要花魔晶，击杀勇者会回魔晶',
      '④ 每 3 波能选一个强化，越守越强',
    ];
    tips.forEach((t, i) => {
      ui.text(t, 46, 216 + i * 46, {
        size: 12.5, color: C.ink, maxWidth: 285, lineHeight: 18,
      });
    });
    ui.text('3 点耐久，跑进去一个扣一点', DESIGN_W / 2, 410, {
      size: 13, bold: true, color: C.red, align: 'center',
    });
    ui.button(48, 438, DESIGN_W - 96, 42, '开 始 布 防', () => {
      this.guideVisible = false;
      store.markGuide();
    });
  }
}

/** 首页战场上的路径描边（不能复用 drawPath，因为首页战场只有 300 高） */
function drawPathShapes(c: any): void {
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(-12, 120);
  c.lineTo(78, 120);
  c.lineTo(78, 200);
  c.lineTo(292, 200);
  c.lineTo(292, 290);
  c.lineTo(78, 290);
  c.lineTo(78, 344);
  c.lineTo(330, 344);
  c.lineWidth = 26;
  c.strokeStyle = '#6E5C48';
  c.stroke();
  c.lineWidth = 2;
  c.strokeStyle = 'rgba(255,255,255,0.18)';
  c.setLineDash([8, 10]);
  c.stroke();
  c.restore();
}
