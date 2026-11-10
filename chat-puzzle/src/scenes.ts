import { platform, DESIGN_W, DESIGN_H, SharePayload } from './platform';
import { UI, C, roundPath, wrapText } from './ui';
import {
  Question, GROUPS, questionsOfGroup, findQuestion, dailyQuestions, humanTag,
} from './questions';
import { store } from './storage';
import { initRank, rankRows, shareImage } from './social';

type Mode = 'title' | 'play' | 'result' | 'help';

const AVATAR_COLORS = ['#7B9BD1', '#E39D7A', '#8FBF9F', '#C79BC7', '#D9B35C', '#8AA8B8'];
const K_GUIDE = 'cp_guide_v2';

function colorOf(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function bubbleLines(ui: UI, q: Question): { name: string; lines: string[]; self: boolean }[] {
  ui.c.font = '13px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
  return q.messages
    .filter(m => m.text.length > 0)
    .map(m => ({
      name: m.name,
      lines: wrapText(ui.c, m.text, 226),
      self: m.name === '我' || !!m.self,
    }));
}

/** 仿微信群聊卡片：头像 + 昵称 + 气泡，自动按内容高度排布 */
function drawChat(ui: UI, q: Question, x: number, y: number, w: number, h: number): void {
  const c = ui.c;
  ui.panel(x, y, w, h, 10, C.card);
  ui.text(q.scene, x + w / 2, y + 7, { size: 11, color: C.sub, align: 'center' });
  ui.line(x + 10, y + 27, x + w - 10, y + 27, '#F0F0F0');

  const rows = bubbleLines(ui, q);
  let cy = y + 36;
  let prevName = '';
  const maxBottom = y + h - 8;

  for (const row of rows) {
    const showName = row.name !== prevName;
    const nameH = showName ? 15 : 0;
    const bubbleH = row.lines.length * 19 + 14;
    const rowH = nameH + bubbleH + 7;
    if (cy + rowH > maxBottom) break;

    let bw = 0;
    for (const ln of row.lines) bw = Math.max(bw, ui.measure(ln, 13));
    bw = Math.min(240, bw + 20);

    const avatarX = row.self ? x + w - 12 - 30 : x + 12;
    const bubbleX = row.self ? avatarX - 8 - bw : avatarX + 38;

    ui.panel(avatarX, cy + nameH, 30, 30, 5, colorOf(row.name));
    ui.text(row.name.slice(0, 1), avatarX + 15, cy + nameH + 7, {
      size: 14, color: '#FFFFFF', bold: true, align: 'center',
    });

    if (showName) {
      if (row.self) ui.text(row.name, avatarX - 8, cy, { size: 10, color: C.sub, align: 'right' });
      else ui.text(row.name, bubbleX, cy, { size: 10, color: C.sub });
    }

    const by = cy + nameH;
    roundPath(c, bubbleX, by, bw, bubbleH, 6);
    c.fillStyle = row.self ? C.selfBubble : C.bubble;
    c.fill();
    c.beginPath();
    if (row.self) {
      c.moveTo(bubbleX + bw, by + 10);
      c.lineTo(bubbleX + bw + 6, by + 14);
      c.lineTo(bubbleX + bw, by + 18);
    } else {
      c.moveTo(bubbleX, by + 10);
      c.lineTo(bubbleX - 6, by + 14);
      c.lineTo(bubbleX, by + 18);
    }
    c.closePath();
    c.fill();

    row.lines.forEach((ln, i) => {
      ui.text(ln, bubbleX + 10, by + 7 + i * 19, { size: 13, color: C.ink });
    });

    cy += rowH;
    prevName = row.name;
  }
}

export class Game {
  mode: Mode = 'title';
  group = 0;
  index = 0;
  correct = 0;
  wrong = 0;
  streak = 0;
  maxStreak = 0;
  chosen = -1;
  eliminated = -1;
  helpChosen = -1;
  helpQid: string | null = null;
  guideVisible = false;

  private list: Question[] = questionsOfGroup(0);
  private label = GROUPS[0].name;
  private isDaily = false;

  constructor(private ui: UI) {
    const q = platform.getLaunchQuery();
    const helpId = typeof q.help === 'string' ? q.help : '';
    if (helpId && findQuestion(helpId)) {
      this.helpQid = helpId;
      this.mode = 'help';
    }
    this.guideVisible = !platform.getStore<boolean>(K_GUIDE, false);
    initRank();
  }

  currentQuestion(): Question | undefined {
    if (this.mode === 'help') return this.helpQid ? findQuestion(this.helpQid) : undefined;
    return this.list[this.index];
  }

  /** 右上角转发与按钮分享共用同一份配置，自动带分享卡片图 */
  sharePayload(): SharePayload {
    const q = this.currentQuestion();
    const title = this.mode === 'help'
      ? '这句到底哪句像人话？来帮我投一票'
      : q ? '群里三句话，哪句是人话？帮我投一票' : '这话接不接 · 微信群聊推理';
    return {
      title,
      query: q ? 'help=' + q.id : '',
      imageUrl: shareImage(title, '看聊天记录，挑出真人会接的那句', `我的最高分 ${store.best()}`),
    };
  }

  private begin(list: Question[], label: string, isDaily: boolean): void {
    this.list = list;
    this.label = label;
    this.isDaily = isDaily;
    this.index = 0;
    this.correct = 0;
    this.wrong = 0;
    this.streak = 0;
    this.maxStreak = 0;
    this.helpQid = null;
    this.resetQuestionState();
    this.mode = 'play';
  }

  start(group: number): void {
    const g = Math.min(GROUPS.length - 1, Math.max(0, group));
    this.group = g;
    this.begin(questionsOfGroup(g), GROUPS[g].name, false);
  }

  startDaily(): void {
    this.begin(dailyQuestions(), '每日乱斗', true);
  }

  private resetQuestionState(): void {
    this.chosen = -1;
    this.eliminated = -1;
    this.helpChosen = -1;
  }

  private applyEliminate(): void {
    const q = this.currentQuestion();
    if (!q) return;
    const wrongs = [0, 1, 2].filter(i => i !== q.answer && i !== this.eliminated);
    if (wrongs.length) this.eliminated = wrongs[Math.floor(Math.random() * wrongs.length)];
  }

  hint(): void {
    if (this.chosen >= 0) return;
    if (this.eliminated >= 0) {
      platform.toast('这一题的提示已经用过了');
      return;
    }
    platform.rewardedAd(ok => {
      if (!ok) { platform.toast('没看完，提示没发放'); return; }
      this.applyEliminate();
      platform.toast('已划掉一个不像人话的选项');
    });
  }

  askHelp(): void {
    const q = this.currentQuestion();
    if (!q) return;
    platform.share({
      ...this.sharePayload(),
      title: '这句到底哪句像人话？来帮我投一票',
    });
    // 微信不保证 onShow 一定触发，也不提供「分享成功」回调，因此分享动作后立即发奖励，
    // 帮答模式作为独立裂变入口保留（好友点链接进来投一票，不替求助者通关）。
    if (this.eliminated < 0) {
      this.applyEliminate();
      platform.toast('已发出求助，先帮你划掉一个错误项');
    }
  }

  choose(i: number): void {
    if (this.chosen >= 0 || this.helpChosen >= 0) return;
    if (i === this.eliminated) return;
    const q = this.currentQuestion();
    if (!q) return;
    if (this.mode === 'help') { this.helpChosen = i; return; }

    this.chosen = i;
    if (i === q.answer) {
      this.correct++;
      this.streak++;
      this.maxStreak = Math.max(this.maxStreak, this.streak);
    } else {
      this.wrong++;
      this.streak = 0;
      platform.vibrate();
    }
  }

  next(): void {
    if (this.index + 1 >= this.list.length) {
      store.addTotal(this.list.length);
      const score = this.correct * 10 + this.maxStreak;
      store.submit(score);
      if (this.isDaily) store.setDailyBest(score);
      else if (this.correct >= 6) store.unlock(this.group + 1);
      this.mode = 'result';
      return;
    }
    this.index++;
    this.resetQuestionState();
  }

  draw(): void {
    switch (this.mode) {
      case 'title': this.drawTitle(); break;
      case 'play': this.drawPlay(); break;
      case 'result': this.drawResult(); break;
      case 'help': this.drawHelp(); break;
    }
    if (this.guideVisible) this.drawGuide();
  }

  // ---------------- 首页 ----------------
  private drawTitle(): void {
    const ui = this.ui;
    ui.navBar('这话接不接');
    ui.text('群里三句话', DESIGN_W / 2, 100, { size: 30, bold: true, align: 'center' });
    ui.text('哪句是人话？', DESIGN_W / 2, 142, { size: 30, bold: true, color: C.green, align: 'center' });
    ui.text('从聊天记录里，挑出真人会接的那一句', DESIGN_W / 2, 190, {
      size: 12, color: C.sub, align: 'center',
    });
    ui.text(`最高分 ${store.best()}  ·  累计答题 ${store.total()}`, DESIGN_W / 2, 212, {
      size: 11, color: C.sub, align: 'center',
    });
    ui.text(`每日乱斗今日最佳 ${store.dailyBest()}`, DESIGN_W / 2, 232, {
      size: 11, color: C.green, align: 'center',
    });

    const unlocked = store.unlocked();
    GROUPS.forEach((g, i) => {
      const y = 256 + i * 66;
      const open = i <= unlocked;
      ui.panel(20, y, DESIGN_W - 40, 58, 10, open ? C.card : '#E2E2E2');
      ui.text(g.name, 34, y + 10, { size: 16, bold: true, color: open ? C.ink : '#9A9A9A' });
      ui.text(open ? g.desc : '答对上一组 6 题解锁', 34, y + 34, {
        size: 11, color: open ? C.sub : '#A5A5A5',
      });
      ui.text(open ? `${questionsOfGroup(i).length} 题 ›` : '🔒', DESIGN_W - 34, y + 20, {
        size: 13, color: open ? C.green : '#9A9A9A', bold: true, align: 'right',
      });
      if (open) {
        ui.regions.push({
          x: 20, y, w: DESIGN_W - 40, h: 58,
          fn: () => this.start(i), enabled: true,
        });
      }
    });

    ui.button(20, 464, DESIGN_W - 40, 44, '每日乱斗 · 今日 8 题', () => this.startDaily(), 'primary');
    ui.text('跨三个群随机抽题，每天一套，不重复', DESIGN_W / 2, 520, {
      size: 11, color: C.sub, align: 'center',
    });
    ui.text('看一次广告划掉一个错误项 · 发群里求救也能划掉一个', DESIGN_W / 2, 544, {
      size: 11, color: C.sub, align: 'center', maxWidth: 330,
    });
    ui.text('好友榜在成绩页 · 微信侧读开放数据域，预览用模拟数据', DESIGN_W / 2, 620, {
      size: 10, color: '#B0B0B0', align: 'center', maxWidth: 340,
    });
  }

  // ---------------- 答题 ----------------
  private drawOptions(y0: number, isHelp: boolean): void {
    const ui = this.ui;
    const q = this.currentQuestion();
    if (!q) return;
    const revealed = isHelp ? this.helpChosen >= 0 : this.chosen >= 0;
    const picked = isHelp ? this.helpChosen : this.chosen;
    const marks = ['A', 'B', 'C'];

    q.options.forEach((opt, i) => {
      const y = y0 + i * 67;
      const disabled = this.eliminated === i && !revealed;
      let fill = C.card;
      let stroke = C.line;
      let fg = C.ink;
      let prefix = marks[i] + '  ';
      if (disabled) { fill = '#F0F0F0'; fg = '#B5B5B5'; }
      if (revealed) {
        if (i === q.answer) { fill = C.greenPale; stroke = C.green; fg = C.greenDark; prefix = '√  '; }
        else if (i === picked) { fill = C.redPale; stroke = C.red; fg = C.red; prefix = '×  '; }
        else { fg = C.sub; }
      }
      ui.panel(12, y, DESIGN_W - 24, 58, 9, fill);
      ui.outlined(12, y, DESIGN_W - 24, 58, 9, stroke, 1);
      ui.text(prefix, 24, y + 19, { size: 14, bold: true, color: revealed && i === q.answer ? C.green : C.sub });
      ui.text(opt, 48, y + 10, { size: 13, color: fg, maxWidth: 290, lineHeight: 19 });
      if (disabled) ui.line(20, y + 29, DESIGN_W - 20, y + 29, '#C8C8C8');
      ui.regions.push({
        x: 12, y, w: DESIGN_W - 24, h: 58,
        fn: () => this.choose(i),
        enabled: !revealed && !disabled,
      });
    });
  }

  private drawExplainOverlay(): void {
    const ui = this.ui;
    const q = this.currentQuestion();
    if (!q || this.chosen < 0) return;
    const ok = this.chosen === q.answer;
    const body = (ok ? '判断对了。' : '这题踩坑了。') + q.explain;
    ui.c.font = '13px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    let lines = wrapText(ui.c, body, 276);
    if (lines.length > 8) lines = lines.slice(0, 8).concat(['…']);
    const cardH = Math.min(520, 96 + lines.length * 21 + 62);
    const y = Math.max(40, (DESIGN_H - cardH) / 2);
    ui.dim();
    // 吞掉浮层下方所有热区（浮层内按钮后注册，优先命中）
    ui.regions.push({ x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, fn: () => {}, enabled: true });
    ui.panel(24, y, DESIGN_W - 48, cardH, 14, C.card);
    ui.text(ok ? '√  接住了' : '×  不像人话', 40, y + 18, {
      size: 19, bold: true, color: ok ? C.green : C.red,
    });
    ui.text(`正确答案 ${['A', 'B', 'C'][q.answer]}  ·  人味特征：${humanTag(q)}`,
      40, y + 48, { size: 11, color: C.greenDark, maxWidth: 290, lineHeight: 15 });
    ui.text(body, 40, y + 84, { size: 13, color: C.ink, maxWidth: 276, lineHeight: 21 });
    ui.button(40, y + cardH - 54, DESIGN_W - 80, 40,
      this.index + 1 >= this.list.length ? '看本轮成绩' : '下一题',
      () => this.next());
  }

  private drawPlay(): void {
    const ui = this.ui;
    const q = this.currentQuestion();
    if (!q) { this.mode = 'title'; return; }
    const total = this.list.length;

    ui.navBar(this.label, () => { this.mode = 'title'; });
    ui.text(`${this.index + 1} / ${total}`, DESIGN_W / 2, 52, {
      size: 11, color: C.sub, align: 'center',
    });
    ui.text(`连对 ${this.streak}`, DESIGN_W - 14, 52, {
      size: 11, color: C.green, align: 'right',
    });

    drawChat(ui, q, 12, 68, DESIGN_W - 24, 234);
    ui.text(q.prompt, 14, 312, { size: 13, bold: true, color: C.ink, maxWidth: 347 });
    this.drawOptions(340, false);

    ui.button(12, 556, 170, 42, '看广告换提示', () => this.hint(), 'ghost', this.chosen < 0 && this.eliminated < 0, 13);
    ui.button(193, 556, 170, 42, '发群里求救', () => this.askHelp(), 'plain', this.chosen < 0, 13);
    ui.text('好友点链接进来投一票，不会替你通关', DESIGN_W / 2, 610, {
      size: 10, color: C.sub, align: 'center', maxWidth: 340,
    });
    ui.text('线索：' + q.tell, 14, 630, { size: 10, color: C.sub, maxWidth: 347, lineHeight: 14 });

    this.drawExplainOverlay();
  }

  // ---------------- 成绩 + 好友榜 ----------------
  private drawResult(): void {
    const ui = this.ui;
    const total = this.list.length;
    ui.navBar('本轮成绩');

    ui.panel(20, 74, DESIGN_W - 40, 250, 14, C.card);
    ui.text(this.isDaily ? '每日乱斗 · 今日答对' : '本轮答对', DESIGN_W / 2, 88, {
      size: 12, color: C.sub, align: 'center',
    });
    ui.text(`${this.correct} / ${total}`, DESIGN_W / 2, 110, {
      size: 42, bold: true, color: C.green, align: 'center',
    });

    const unlockedNow = this.correct >= 6;
    ui.text(this.isDaily
      ? `本轮得分 ${this.correct * 10 + this.maxStreak} · 今日最佳 ${store.dailyBest()}`
      : (unlockedNow ? '过关 · 下一组已解锁' : '差一点 · 答对 6 题即可解锁下一组'),
    DESIGN_W / 2, 164, {
      size: 12, color: this.isDaily ? C.sub : (unlockedNow ? C.green : C.warn), align: 'center',
    });
    ui.line(40, 192, DESIGN_W - 40, 192);
    const rows = [
      ['最高连对', `${this.maxStreak} 题`],
      ['答错', `${this.wrong} 题`],
      ['历史最高分', `${store.best()}`],
      ['累计答题', `${store.total()} 题`],
    ];
    rows.forEach((r, i) => {
      const y = 200 + i * 26;
      ui.text(r[0], 40, y, { size: 13, color: C.sub });
      ui.text(r[1], DESIGN_W - 40, y, { size: 13, bold: true, align: 'right' });
    });

    // 好友榜：微信侧来自开放数据域，浏览器/无好友时含本地模拟对手
    ui.panel(20, 334, DESIGN_W - 40, 136, 14, C.card);
    ui.text('好友榜', 36, 344, { size: 13, bold: true });
    ui.text(platform.isWx ? '托管数据' : '预览模拟', DESIGN_W - 36, 346, {
      size: 10, color: C.sub, align: 'right',
    });
    rankRows().forEach((row, i) => {
      const y = 368 + i * 24;
      const me = row.name === '我';
      ui.text(`${i + 1}`, 36, y, { size: 12, color: me ? C.green : C.sub, bold: me });
      ui.text(row.name, 62, y, { size: 12, color: me ? C.greenDark : C.ink, bold: me });
      ui.text(`${row.score}`, DESIGN_W - 36, y, {
        size: 12, color: me ? C.green : C.sub, bold: me, align: 'right',
      });
    });

    const hasNext = !this.isDaily && this.group < GROUPS.length - 1 && unlockedNow;
    ui.button(20, 482, DESIGN_W - 40, 42,
      this.isDaily ? '重做今日 8 题' : (hasNext ? '挑战下一组' : '再来一轮'),
      () => { if (this.isDaily) this.startDaily(); else this.start(hasNext ? this.group + 1 : this.group); });

    const half = (DESIGN_W - 52) / 2;
    ui.button(20, 534, half, 40, '分享战绩', () => {
      const title = `我在《这话接不接》答对了 ${this.correct}/${total} 题，来试试？`;
      platform.share({
        title,
        query: '',
        imageUrl: shareImage(title, '三个群、24 道题，你能全对吗', `本轮 ${this.correct}/${total}`),
      });
    }, 'ghost');
    ui.button(20 + half + 12, 534, half, 40, '回首页', () => { this.mode = 'title'; }, 'plain');
    ui.text('分数越高排名越前 · 托管分数写入后才会在好友榜出现', DESIGN_W / 2, 598, {
      size: 10, color: '#B0B0B0', align: 'center', maxWidth: 340,
    });
  }

  // ---------------- 好友帮答 ----------------
  private drawHelp(): void {
    const ui = this.ui;
    const q = this.currentQuestion();
    if (!q) { this.mode = 'title'; return; }
    ui.navBar('帮好友投一票', () => { this.mode = 'title'; });
    ui.text('好友卡在这一题，你觉得哪句是人话？', DESIGN_W / 2, 54, {
      size: 12, color: C.sub, align: 'center',
    });
    drawChat(ui, q, 12, 78, DESIGN_W - 24, 226);
    ui.text(q.prompt, 14, 314, { size: 13, bold: true, maxWidth: 347 });
    this.drawOptions(340, true);

    if (this.helpChosen >= 0) {
      const ok = this.helpChosen === q.answer;
      ui.panel(12, 548, DESIGN_W - 24, 32, 8, ok ? C.greenPale : C.redPale);
      ui.text(ok ? `√ 投对了，就是 ${['A', 'B', 'C'][q.answer]}` : `× 投错了，正确的是 ${['A', 'B', 'C'][q.answer]}`,
        DESIGN_W / 2, 557, { size: 13, bold: true, color: ok ? C.greenDark : C.red, align: 'center' });
      ui.text(`人味特征：${humanTag(q)} · ${q.tell}`, 14, 588, {
        size: 10, color: C.sub, maxWidth: 347, lineHeight: 14,
      });
      ui.button(12, 622, DESIGN_W - 24, 38, '我也来一局', () => this.start(q.group));
    } else {
      ui.text('你的选择只帮你判断对错，不会替好友通关', DESIGN_W / 2, 570, {
        size: 11, color: C.sub, align: 'center',
      });
      ui.button(12, 610, DESIGN_W - 24, 42, '我自己也来一局', () => this.start(q.group), 'ghost');
    }
  }

  // ---------------- 首次引导 ----------------
  private drawGuide(): void {
    const ui = this.ui;
    ui.dim();
    ui.regions.push({ x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, fn: () => {}, enabled: true });
    ui.panel(28, 168, DESIGN_W - 56, 320, 16, C.card);
    ui.text('怎么玩', DESIGN_W / 2, 188, { size: 22, bold: true, align: 'center' });
    ui.text('看一段微信群聊，从三句话里挑出', 48, 234, { size: 13, color: C.ink });
    ui.text('真人会接的那一句。', 48, 254, { size: 13, color: C.ink });
    ui.line(48, 284, DESIGN_W - 48, 284);
    const tips = [
      '① 真人爱省略、跑题、只接跟自己有关的那半句',
      '② 干扰项通常礼貌过度、复述信息、像客服话术',
      '③ 卡住可以看广告划掉一个，或发群里让好友投一票',
    ];
    tips.forEach((t, i) => {
      ui.text(t, 48, 298 + i * 40, { size: 12, color: C.sub, maxWidth: 278, lineHeight: 17 });
    });
    ui.button(48, 428, DESIGN_W - 96, 42, '开始', () => {
      this.guideVisible = false;
      platform.setStore(K_GUIDE, true);
    });
  }
}
