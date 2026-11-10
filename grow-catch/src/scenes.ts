import { platform, DESIGN_W, DESIGN_H, SharePayload, TouchPhase } from './platform';
import { UI, C, roundPath } from './ui';
import {
  LINES, SPEEDS, TOTAL_STAGES, Progress,
  initialProgress, stageOf, advance, onMiss, caught,
  encodeShare, decodeShare, allStageKeys,
} from './logic';
import { drawStage, drawBurst } from './art';
import { shareImage } from './social';
import { store } from './storage';

type Mode = 'title' | 'play' | 'album';

const TRAY_Y = 470;
const TRAY_W = 110;
const TRAY_H = 16;
const BALL_R = 22;
const SCENE_TOP = 96;
const SCENE_BOTTOM = 505;
const CELEBRATE_FRAMES = 28;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class Game {
  mode: Mode = 'title';
  progress: Progress = store.progress();
  speedIdx: number = store.speedIdx();
  ball = { x: DESIGN_W / 2, y: 110 };
  trayX = DESIGN_W / 2;
  celebrate = 0;
  burst = 0;
  guideVisible = false;
  albumLine = 0;
  private t = 0;

  constructor(private ui: UI) {
    const q = platform.getLaunchQuery();
    if (typeof q.grow === 'string') {
      const p = decodeShare(q.grow);
      if (p) {
        this.progress = p;
        store.save(p);
        this.mode = 'play';
        this.albumLine = p.line;
        platform.toast('好友养到的这一变，接着养');
      }
    }
    this.speedIdx = store.speedIdx();
    this.guideVisible = !store.guideSeen();
    this.spawn();
  }

  private spawn(): void {
    this.ball.x = 65 + Math.random() * 245;
    this.ball.y = 140;   // 避开顶部的形态名称文字
    this.celebrate = 0;
    this.burst = 0;
    this.trayX = clamp(this.trayX, 65, DESIGN_W - 65);
  }

  sharePayload(): SharePayload {
    const st = stageOf(this.progress);
    const title = `我养到「${st.label}」了，你也来接一次`;
    return {
      title,
      query: 'grow=' + encodeShare(this.progress),
      imageUrl: shareImage(title, '没有倒计时，接不住也没关系',
        `第 ${this.progress.stage + 1} 变 · 第 ${this.progress.round} 轮`),
    };
  }

  /** 返回 true 表示触摸已被场景消费；end 一律放行给按钮热区 */
  handleTouch(x: number, y: number, phase: TouchPhase): boolean {
    if (this.mode !== 'play') return false;
    if (phase === 'end') return false;
    const sp = SPEEDS[clamp(this.speedIdx, 0, SPEEDS.length - 1)];
    if (sp.auto) return true;   // 自动档完全不用操作
    if (y < SCENE_BOTTOM) {
      this.trayX = clamp(x, 65, DESIGN_W - 65);
      return true;
    }
    return false;
  }

  /** 每帧推进：只有位置在变，没有任何倒计时或失败状态 */
  private tick(): void {
    this.t += 16;
    if (this.mode !== 'play') return;

    if (this.celebrate > 0) {
      this.celebrate--;
      this.burst = 1 - this.celebrate / CELEBRATE_FRAMES;
      if (this.celebrate === 0) this.spawn();
      return;
    }

    const sp = SPEEDS[clamp(this.speedIdx, 0, SPEEDS.length - 1)];
    if (sp.auto) this.trayX = clamp(this.ball.x, 65, DESIGN_W - 65);
    this.ball.y += sp.vy;

    if (caught(this.ball.x, this.ball.y, BALL_R, this.trayX, TRAY_Y, TRAY_W, TRAY_H)) {
      this.progress = advance(this.progress);
      store.save(this.progress);
      this.celebrate = CELEBRATE_FRAMES;
      this.burst = 0;
      platform.vibrate();
    } else if (this.ball.y > 570) {
      this.progress = onMiss(this.progress);   // 不扣进度、不重开
      this.spawn();
    }
  }

  private setSpeed(i: number): void {
    this.speedIdx = clamp(i, 0, SPEEDS.length - 1);
    store.setSpeed(this.speedIdx);
    this.spawn();
  }

  private applyLine(i: number): void {
    const key = LINES[i].stages[0].key;
    const seen = this.progress.seen.includes(key)
      ? this.progress.seen.slice()
      : this.progress.seen.concat(key);
    this.progress = { line: i, stage: 0, round: this.progress.round, seen };
    store.save(this.progress);
    this.albumLine = i;
    this.spawn();
    platform.toast('换了一条变化路线');
  }

  private switchLine(): void {
    if (!store.lineUnlocked()) {
      platform.rewardedAd(ok => {
        if (!ok) { platform.toast('没看完，路线没换'); return; }
        store.unlockLine();
        this.applyLine(1);
      });
    } else {
      this.applyLine(this.progress.line === 0 ? 1 : 0);
    }
  }

  draw(): void {
    this.tick();
    if (this.mode === 'title') this.drawTitle();
    else if (this.mode === 'album') this.drawAlbum();
    else this.drawPlay();
    if (this.guideVisible) this.drawGuide();
  }

  /** 8 个进度点 + 轮数点，全程不用文字说明进度 */
  private drawDots(y: number): void {
    const c = this.ui.c;
    const line = LINES[this.progress.line];
    const x0 = DESIGN_W / 2 - (TOTAL_STAGES - 1) * 32 / 2;
    for (let i = 0; i < TOTAL_STAGES; i++) {
      const cx = x0 + i * 32;
      const cur = i === this.progress.stage;
      c.beginPath();
      c.arc(cx, y, cur ? 8 : 5.5, 0, Math.PI * 2);
      c.fillStyle = cur ? line.stages[i].color
        : (i < this.progress.stage ? '#BFD9C4' : '#DDE5DA');
      c.fill();
    }
    const rounds = Math.min(5, this.progress.round);
    for (let i = 0; i < rounds; i++) {
      c.beginPath();
      c.arc(DESIGN_W / 2 - (rounds - 1) * 5 + i * 10, y + 20, 3, 0, Math.PI * 2);
      c.fillStyle = '#7FC48A';
      c.fill();
    }
  }

  private drawTrayShape(): void {
    const c = this.ui.c;
    c.save();
    roundPath(c, this.trayX - TRAY_W / 2, TRAY_Y - TRAY_H / 2, TRAY_W, TRAY_H, 8);
    c.fillStyle = '#B98A5E';
    c.fill();
    c.fillStyle = '#D8B389';
    roundPath(c, this.trayX - TRAY_W / 2 + 6, TRAY_Y - TRAY_H / 2 + 2, TRAY_W - 12, 4, 2);
    c.fill();
    c.restore();
  }

  // ---------------- 首页 ----------------
  private drawTitle(): void {
    const ui = this.ui;
    ui.navBar('接住它 · 万物生长');
    ui.text('接住它', DESIGN_W / 2, 96, { size: 34, bold: true, align: 'center' });
    ui.text('万物生长', DESIGN_W / 2, 146, {
      size: 26, bold: true, color: C.green, align: 'center',
    });

    const st = stageOf(this.progress);
    drawStage(ui.c, st.key, DESIGN_W / 2, 250, 64, this.t);
    this.drawDots(330);

    ui.button(20, 386, DESIGN_W - 40, 48, '开 始', () => { this.mode = 'play'; });
    ui.button(20, 448, 162, 44, '图 鉴', () => { this.mode = 'album'; }, 'ghost');
    ui.button(193, 448, 162, 44, '送 好 友', () => platform.share(this.sharePayload()), 'ghost');

    ui.text('没有倒计时 · 接不住也没关系', DESIGN_W / 2, 518, {
      size: 15, color: C.greenDark, align: 'center',
    });
    ui.text('点屏幕任意处，盘子就过去', DESIGN_W / 2, 548, {
      size: 13, color: C.sub, align: 'center',
    });
    ui.text(`已养 ${this.progress.round} 轮 · 已见 ${this.progress.seen.length} / ${allStageKeys().length} 变`,
      DESIGN_W / 2, 590, { size: 12, color: C.sub, align: 'center' });
    ui.text('慢速档是默认的，也可以选「自动」看着它长', DESIGN_W / 2, 620, {
      size: 11, color: '#A0A8A0', align: 'center', maxWidth: 330,
    });
  }

  // ---------------- 主玩法 ----------------
  private drawPlay(): void {
    const ui = this.ui;
    const c = ui.c;
    const st = stageOf(this.progress);
    const line = LINES[this.progress.line];

    ui.navBar('接住它', () => { this.mode = 'title'; });

    c.fillStyle = '#F4F9F1';
    c.fillRect(0, SCENE_TOP, DESIGN_W, SCENE_BOTTOM - SCENE_TOP);
    // 装饰用的水平参考线，纯视觉，不表示时间/速度
    for (let i = 1; i <= 4; i++) {
      const y = SCENE_TOP + i * 80;
      c.save();
      c.setLineDash([3, 7]);
      ui.line(20, y, DESIGN_W - 20, y, '#E0EADF');
      c.restore();
    }

    this.drawDots(66);
    ui.text(`${line.name} · ${st.label}`, DESIGN_W / 2, 96, {
      size: 16, bold: true, color: st.color, align: 'center',
    });

    const showSize = this.celebrate > 0
      ? 26 + Math.sin(this.burst * Math.PI) * 16
      : 26;
    drawStage(c, st.key, this.ball.x, this.ball.y, showSize, this.t);
    if (this.celebrate > 0) drawBurst(c, this.ball.x, TRAY_Y - 8, st.color, this.burst);
    this.drawTrayShape();

    // 托盘
    ui.panel(0, SCENE_BOTTOM, DESIGN_W, DESIGN_H - SCENE_BOTTOM, 0, '#FFFFFF');
    ui.line(0, SCENE_BOTTOM, DESIGN_W, SCENE_BOTTOM);
    SPEEDS.forEach((sp, i) => {
      ui.button(12 + i * 84, 518, 76, 46, sp.label,
        () => this.setSpeed(i), i === this.speedIdx ? 'primary' : 'ghost', true, 15);
    });
    ui.button(264, 518, 99, 46, '换', () => this.switchLine(), 'plain', true, 15);
    // 两条路线的小圆点：当前路线高亮，未解锁时第二个是灰的
    for (let i = 0; i < 2; i++) {
      c.beginPath();
      c.arc(322 + i * 14, 541, 4, 0, Math.PI * 2);
      c.fillStyle = i === 0 ? LINES[0].stages[0].color
        : (store.lineUnlocked() ? LINES[1].stages[0].color : '#D8DED8');
      c.fill();
    }

    ui.button(12, 574, 110, 46, '送', () => platform.share(this.sharePayload()), 'ghost', true, 15);
    ui.button(130, 574, 110, 46, '图 鉴', () => { this.mode = 'album'; }, 'ghost', true, 15);
    ui.button(248, 574, 115, 46, '从头看', () => {
      this.progress = {
        ...initialProgress(this.progress.line),
        round: this.progress.round,
        seen: this.progress.seen,
      };
      store.save(this.progress);
      this.spawn();
    }, 'ghost', true, 15);

    ui.text('掉了也没关系，会重新落下来', DESIGN_W / 2, 630, {
      size: 13, color: C.greenDark, align: 'center',
    });
    ui.text(`第 ${this.progress.stage + 1} 变 · 第 ${this.progress.round} 轮`, DESIGN_W / 2, 650, {
      size: 11, color: C.sub, align: 'center',
    });
  }

  // ---------------- 图鉴 ----------------
  private drawAlbum(): void {
    const ui = this.ui;
    const c = ui.c;
    ui.navBar('图鉴', () => { this.mode = 'title'; });

    if (store.lineUnlocked()) {
      ui.button(20, 58, 160, 36, '①', () => { this.albumLine = 0; },
        this.albumLine === 0 ? 'primary' : 'ghost');
      ui.button(195, 58, 160, 36, '②', () => { this.albumLine = 1; },
        this.albumLine === 1 ? 'primary' : 'ghost');
    }

    const line = LINES[this.albumLine];
    line.stages.forEach((s, i) => {
      const col = i % 4, row = Math.floor(i / 4);
      const x = 12 + col * 88, y = 116 + row * 130;
      ui.panel(x, y, 82, 115, 10, '#FFFFFF');
      const seen = this.progress.seen.includes(s.key);
      drawStage(c, s.key, x + 41, y + 46, 30, this.t, !seen);
      if (seen) {
        c.beginPath();
        c.arc(x + 41, y + 98, 4, 0, Math.PI * 2);
        c.fillStyle = s.color;
        c.fill();
      }
    });

    const seenCount = this.progress.seen.length;
    ui.text(`已见 ${seenCount} / ${allStageKeys().length} 变`, DESIGN_W / 2, 396, {
      size: 17, bold: true, color: C.greenDark, align: 'center',
    });
    ui.text('接住一次，就多认识一个', DESIGN_W / 2, 428, {
      size: 13, color: C.sub, align: 'center',
    });
    ui.button(20, 480, DESIGN_W - 40, 46, '回去接着接', () => { this.mode = 'play'; });
  }

  // ---------------- 首次引导 ----------------
  private drawGuide(): void {
    const ui = this.ui;
    ui.dim();
    ui.regions.push({ x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, fn: () => {}, enabled: true });
    ui.panel(28, 168, DESIGN_W - 56, 320, 16, C.card);
    ui.text('怎么玩', DESIGN_W / 2, 188, { size: 22, bold: true, align: 'center' });
    const tips = [
      '① 点屏幕任意处，盘子就移过去',
      '② 接住一次，它就长大一点',
      '③ 掉了也没关系，会重新落下来',
    ];
    tips.forEach((t, i) => {
      ui.text(t, 48, 238 + i * 44, {
        size: 13, color: C.ink, maxWidth: 278, lineHeight: 18,
      });
    });
    ui.text('没有倒计时，不用着急', DESIGN_W / 2, 392, {
      size: 14, bold: true, color: C.greenDark, align: 'center',
    });
    ui.text('不想动手？下面选「自动」就好', DESIGN_W / 2, 418, {
      size: 12, color: C.sub, align: 'center',
    });
    ui.button(48, 440, DESIGN_W - 96, 42, '开始', () => {
      this.guideVisible = false;
      store.markGuide();
    });
  }
}
