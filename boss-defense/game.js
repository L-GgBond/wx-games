"use strict";
(() => {
  // src/platform.ts
  var DESIGN_W = 375;
  var DESIGN_H = 667;
  var AD_UNIT_ID = "";
  var BasePlatform = class {
    constructor() {
      this.dpr = 1;
      this.screenW = DESIGN_W;
      this.screenH = DESIGN_H;
      this.scale = 1;
      this.offX = 0;
      this.offY = 0;
      this.handler = () => {
      };
    }
    layout(w, h, dpr) {
      this.screenW = w;
      this.screenH = h;
      this.dpr = dpr;
      this.scale = Math.min(w / DESIGN_W, h / DESIGN_H);
      this.offX = (w - DESIGN_W * this.scale) / 2;
      this.offY = (h - DESIGN_H * this.scale) / 2;
      this.canvas.width = Math.max(1, Math.round(w * dpr));
      this.canvas.height = Math.max(1, Math.round(h * dpr));
      this.ctx = this.canvas.getContext("2d");
    }
    toDesign(cx, cy, left = 0, top = 0) {
      return [
        (cx - left - this.offX) / this.scale,
        (cy - top - this.offY) / this.scale
      ];
    }
    beginFrame() {
      const c = this.ctx;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.fillStyle = "#1A1320";
      c.fillRect(0, 0, this.canvas.width, this.canvas.height);
      c.setTransform(
        this.dpr * this.scale,
        0,
        0,
        this.dpr * this.scale,
        this.dpr * this.offX,
        this.dpr * this.offY
      );
      c.fillStyle = "#F4F1F7";
      c.fillRect(0, 0, DESIGN_W, DESIGN_H);
    }
    onTouch(cb) {
      this.handler = cb;
    }
    requestFrame(cb) {
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(cb);
      else setTimeout(() => cb(Date.now()), 16);
    }
    now() {
      return Date.now();
    }
    vibrate() {
    }
  };
  var BrowserPlatform = class extends BasePlatform {
    constructor() {
      super();
      this.isWx = false;
      this.toastTimer = null;
      this.canvas = document.getElementById("game");
      this.relayout();
      window.addEventListener("resize", () => this.relayout());
      const map = (e, phase) => {
        const r = this.canvas.getBoundingClientRect();
        const [x, y] = this.toDesign(e.clientX, e.clientY, r.left, r.top);
        this.handler(x, y, phase);
      };
      this.canvas.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        try {
          this.canvas.setPointerCapture(e.pointerId);
        } catch (_) {
        }
        map(e, "start");
      });
      this.canvas.addEventListener("pointermove", (e) => {
        if (e.buttons > 0) map(e, "move");
      });
      this.canvas.addEventListener("pointerup", (e) => map(e, "end"));
      this.canvas.addEventListener("pointercancel", (e) => map(e, "end"));
    }
    relayout() {
      const r = this.canvas.getBoundingClientRect();
      this.layout(r.width || DESIGN_W, r.height || DESIGN_H, window.devicePixelRatio || 1);
    }
    getLaunchQuery() {
      const out = {};
      const s = location.search.replace(/^\?/, "");
      if (s) s.split("&").forEach((kv) => {
        const [k, v = ""] = kv.split("=");
        out[decodeURIComponent(k)] = decodeURIComponent(v);
      });
      return out;
    }
    onShow(cb) {
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) cb();
      });
    }
    share(p) {
      const url = location.origin + location.pathname + "?" + p.query;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).catch(() => {
        });
      }
      this.toast("\u9884\u89C8\u6A21\u5F0F\uFF1A\u5DF2\u590D\u5236\u9886\u5730\u94FE\u63A5\n" + url);
    }
    onShareAppMessage(_cb) {
    }
    rewardedAd(cb) {
      this.toast("\u9884\u89C8\u6A21\u5F0F\uFF1A\u6A21\u62DF\u89C2\u770B\u6FC0\u52B1\u89C6\u9891\u2026");
      setTimeout(() => {
        this.toast("\u89C2\u770B\u5B8C\u6210\uFF0C\u5DF2\u53D1\u653E\u5956\u52B1");
        cb(true);
      }, 1200);
    }
    toast(msg) {
      const el = document.getElementById("toast");
      if (!el) return;
      el.textContent = msg;
      el.style.whiteSpace = "pre-line";
      el.style.display = "block";
      if (this.toastTimer) clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => {
        el.style.display = "none";
      }, 2200);
    }
    getStore(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (_) {
        return fallback;
      }
    }
    setStore(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (_) {
      }
    }
    setCloudScore(_score) {
    }
  };
  var WxPlatform = class extends BasePlatform {
    constructor() {
      super();
      this.isWx = true;
      this.rewarded = null;
      this.adCb = null;
      const sys = wx.getSystemInfoSync();
      this.canvas = wx.createCanvas();
      this.layout(sys.windowWidth, sys.windowHeight, sys.pixelRatio || 1);
      const emit = (e, phase) => {
        const list = phase === "end" ? e.changedTouches : e.touches;
        const t = list && list[0];
        if (!t) return;
        const [x, y] = this.toDesign(t.clientX, t.clientY, 0, 0);
        this.handler(x, y, phase);
      };
      wx.onTouchStart((e) => emit(e, "start"));
      wx.onTouchMove((e) => emit(e, "move"));
      wx.onTouchEnd((e) => emit(e, "end"));
      wx.onTouchCancel((e) => emit(e, "end"));
    }
    getLaunchQuery() {
      try {
        return wx.getLaunchOptionsSync().query || {};
      } catch (_) {
        return {};
      }
    }
    onShow(cb) {
      wx.onShow(cb);
    }
    share(p) {
      const opts = { title: p.title, query: p.query };
      if (p.imageUrl) opts.imageUrl = p.imageUrl;
      wx.shareAppMessage(opts);
    }
    onShareAppMessage(cb) {
      wx.onShareAppMessage(() => {
        const p = cb();
        const opts = { title: p.title, query: p.query };
        if (p.imageUrl) opts.imageUrl = p.imageUrl;
        return opts;
      });
    }
    ensureAd() {
      if (this.rewarded || !AD_UNIT_ID) return;
      this.rewarded = wx.createRewardedVideoAd({ adUnitId: AD_UNIT_ID });
      this.rewarded.onClose((res) => {
        const cb = this.adCb;
        this.adCb = null;
        if (cb) cb(!!(res && res.isEnded));
      });
      this.rewarded.onError(() => {
        const cb = this.adCb;
        this.adCb = null;
        if (cb) {
          this.toast("\u5E7F\u544A\u52A0\u8F7D\u5931\u8D25\uFF0C\u5DF2\u76F4\u63A5\u53D1\u653E\u5956\u52B1");
          cb(true);
        }
      });
    }
    rewardedAd(cb) {
      if (!AD_UNIT_ID) {
        this.toast("\u672A\u914D\u7F6E\u5E7F\u544A\u5355\u5143\uFF0C\u6F14\u793A\u6A21\u5F0F\u76F4\u63A5\u53D1\u653E\u5956\u52B1");
        cb(true);
        return;
      }
      try {
        this.ensureAd();
        this.adCb = cb;
        this.rewarded.show().catch(
          () => this.rewarded.load().then(() => this.rewarded.show()).catch(() => {
            const pending = this.adCb;
            this.adCb = null;
            if (pending) {
              this.toast("\u5E7F\u544A\u6682\u4E0D\u53EF\u7528\uFF0C\u5DF2\u76F4\u63A5\u53D1\u653E\u5956\u52B1");
              pending(true);
            }
          })
        );
      } catch (_) {
        this.adCb = null;
        this.toast("\u5E7F\u544A\u4E0D\u53EF\u7528\uFF0C\u5DF2\u76F4\u63A5\u53D1\u653E\u5956\u52B1");
        cb(true);
      }
    }
    toast(msg) {
      wx.showToast({ title: String(msg).slice(0, 30), icon: "none", duration: 2e3 });
    }
    vibrate() {
      try {
        wx.vibrateShort({ type: "light" });
      } catch (_) {
      }
    }
    getStore(key, fallback) {
      try {
        const v = wx.getStorageSync(key);
        return v === "" || v === null || v === void 0 ? fallback : v;
      } catch (_) {
        return fallback;
      }
    }
    setStore(key, value) {
      try {
        wx.setStorageSync(key, value);
      } catch (_) {
      }
    }
    setCloudScore(score) {
      try {
        wx.setUserCloudStorage({
          KVDataList: [{ key: "score", value: String(score) }]
        });
      } catch (_) {
      }
    }
  };
  var isWx = typeof wx !== "undefined" && typeof wx.getSystemInfoSync === "function";
  var platform = isWx ? new WxPlatform() : new BrowserPlatform();

  // src/ui.ts
  var C = {
    bg: "#F4F1F7",
    card: "#FFFFFF",
    green: "#7B4FB5",
    greenDark: "#5F3A8C",
    greenPale: "#F0E9F8",
    ink: "#221A2B",
    sub: "#857A92",
    line: "#E7E0EE",
    red: "#D95F3B",
    redPale: "#FBEAE4",
    blue: "#576B95",
    warn: "#E0A030",
    warnPale: "#FFF5E2",
    soil: "#C9A77C",
    soilDark: "#9C7A52",
    overlay: "rgba(30,20,40,0.62)",
    field: "#2B2033",
    fieldLine: "#3D2F49",
    path: "#6E5C48",
    pathEdge: "#4E4132",
    gold: "#F2B441"
  };
  function wrapText(c, text, maxWidth) {
    const lines = [];
    let cur = "";
    for (const ch of text) {
      if (ch === "\n") {
        lines.push(cur);
        cur = "";
        continue;
      }
      if (cur && c.measureText(cur + ch).width > maxWidth) {
        lines.push(cur);
        cur = ch;
      } else {
        cur += ch;
      }
    }
    if (cur || lines.length === 0) lines.push(cur);
    return lines;
  }
  function roundPath(c, x, y, w, h, r) {
    const rr = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath();
    c.moveTo(x + rr, y);
    c.lineTo(x + w - rr, y);
    c.quadraticCurveTo(x + w, y, x + w, y + rr);
    c.lineTo(x + w, y + h - rr);
    c.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    c.lineTo(x + rr, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - rr);
    c.lineTo(x, y + rr);
    c.quadraticCurveTo(x, y, x + rr, y);
    c.closePath();
  }
  var UI = class {
    constructor(getCtx) {
      this.getCtx = getCtx;
      this.regions = [];
    }
    get c() {
      return this.getCtx();
    }
    begin() {
      this.regions = [];
    }
    tap(x, y) {
      for (let i = this.regions.length - 1; i >= 0; i--) {
        const r = this.regions[i];
        if (r.enabled && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
          r.fn();
          return true;
        }
      }
      return false;
    }
    panel(x, y, w, h, r = 10, color = C.card) {
      const c = this.c;
      roundPath(c, x, y, w, h, r);
      c.fillStyle = color;
      c.fill();
    }
    outlined(x, y, w, h, r, color, width = 1) {
      const c = this.c;
      roundPath(c, x, y, w, h, r);
      c.strokeStyle = color;
      c.lineWidth = width;
      c.stroke();
    }
    line(x1, y1, x2, y2, color = C.line) {
      const c = this.c;
      c.beginPath();
      c.moveTo(x1, y1);
      c.lineTo(x2, y2);
      c.strokeStyle = color;
      c.lineWidth = 1;
      c.stroke();
    }
    text(str, x, y, opts = {}) {
      var _a, _b, _c, _d;
      const c = this.c;
      const size = (_a = opts.size) != null ? _a : 14;
      const lh = (_b = opts.lineHeight) != null ? _b : Math.round(size * 1.5);
      c.font = `${opts.bold ? "bold " : ""}${size}px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`;
      c.fillStyle = (_c = opts.color) != null ? _c : C.ink;
      c.textAlign = (_d = opts.align) != null ? _d : "left";
      c.textBaseline = "top";
      const lines = opts.maxWidth ? wrapText(c, str, opts.maxWidth) : str.split("\n");
      lines.forEach((ln, i) => c.fillText(ln, x, y + i * lh));
      return lines.length * lh;
    }
    measure(str, size = 14, bold = false) {
      const c = this.c;
      c.font = `${bold ? "bold " : ""}${size}px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`;
      return c.measureText(str).width;
    }
    button(x, y, w, h, label, fn, style = "primary", enabled = true, size = 15) {
      const c = this.c;
      const fill = !enabled ? "#D8DDD6" : style === "primary" ? C.green : style === "ghost" ? C.card : style === "danger" ? C.redPale : "#EFF3EC";
      const fg = !enabled ? "#9AA59A" : style === "primary" ? "#FFFFFF" : style === "ghost" ? C.green : style === "danger" ? C.red : C.ink;
      this.panel(x, y, w, h, h / 2, fill);
      if (style === "ghost" && enabled) this.outlined(x, y, w, h, h / 2, C.green, 1);
      this.text(label, x + w / 2, y + h / 2 - size * 0.72, {
        size,
        color: fg,
        bold: true,
        align: "center"
      });
      this.regions.push({ x, y, w, h, fn, enabled });
    }
    /** 顶部导航栏：标题 + 可选返回按钮，返回统一高度 44 */
    navBar(title, onBack) {
      const c = this.c;
      c.fillStyle = "#F7F4FA";
      c.fillRect(0, 0, DESIGN_W, 44);
      this.line(0, 44, DESIGN_W, 44, "#E3DBEB");
      this.text(title, DESIGN_W / 2, 13, { size: 17, bold: true, align: "center" });
      if (onBack) {
        this.text("\u2039", 14, 6, { size: 30, color: C.ink });
        this.regions.push({ x: 0, y: 0, w: 56, h: 44, fn: onBack, enabled: true });
      }
      return 44;
    }
    dim() {
      const c = this.c;
      c.fillStyle = C.overlay;
      c.fillRect(0, 0, DESIGN_W, DESIGN_H);
    }
  };

  // src/logic.ts
  var PATH = [
    { x: -12, y: 138 },
    { x: 78, y: 138 },
    { x: 78, y: 238 },
    { x: 292, y: 238 },
    { x: 292, y: 338 },
    { x: 78, y: 338 },
    { x: 78, y: 428 },
    { x: 318, y: 428 }
  ];
  var SLOTS = [
    { x: 44, y: 190 },
    { x: 148, y: 190 },
    { x: 240, y: 190 },
    { x: 44, y: 288 },
    { x: 148, y: 288 },
    { x: 240, y: 288 },
    { x: 336, y: 288 },
    { x: 44, y: 388 },
    { x: 148, y: 388 },
    { x: 240, y: 388 }
  ];
  var SEG_LEN = [];
  var TOTAL_LEN = 0;
  for (let i = 1; i < PATH.length; i++) {
    const dx = PATH[i].x - PATH[i - 1].x;
    const dy = PATH[i].y - PATH[i - 1].y;
    const len = Math.sqrt(dx * dx + dy * dy);
    SEG_LEN.push(len);
    TOTAL_LEN += len;
  }
  var PATH_LEN = TOTAL_LEN;
  function posAt(dist) {
    let d = Math.max(0, Math.min(PATH_LEN, dist));
    for (let i = 0; i < SEG_LEN.length; i++) {
      if (d <= SEG_LEN[i] || i === SEG_LEN.length - 1) {
        const t = SEG_LEN[i] <= 0 ? 0 : Math.min(1, d / SEG_LEN[i]);
        return {
          x: PATH[i].x + (PATH[i + 1].x - PATH[i].x) * t,
          y: PATH[i].y + (PATH[i + 1].y - PATH[i].y) * t
        };
      }
      d -= SEG_LEN[i];
    }
    return { x: PATH[PATH.length - 1].x, y: PATH[PATH.length - 1].y };
  }
  var ENEMY_KINDS = {
    grunt: { label: "\u6751\u6C11\u5175", hp: 42, speed: 26, reward: 6, color: "#E8C07A", r: 8 },
    knight: { label: "\u9A91\u58EB", hp: 96, speed: 19, reward: 11, color: "#C9CEDA", r: 10 },
    rogue: { label: "\u76D7\u8D3C", hp: 26, speed: 44, reward: 5, color: "#8FCB6B", r: 7 }
  };
  var TOWERS = [
    { kind: "goblin", label: "\u54E5\u5E03\u6797", cost: 20, range: 74, dmg: 9, rate: 1.1, color: "#8FCB6B", desc: "\u6295\u77F3 \xB7 \u4FBF\u5B9C", splash: 0 },
    { kind: "archer", label: "\u9AB7\u9AC5\u5F13\u624B", cost: 35, range: 114, dmg: 15, rate: 0.75, color: "#C9CEDA", desc: "\u7A7F\u523A \xB7 \u5C04\u7A0B\u8FDC", splash: 0 },
    { kind: "mage", label: "\u706B\u6CD5", cost: 65, range: 94, dmg: 32, rate: 0.45, color: "#F0845C", desc: "\u707C\u70E7 \xB7 \u6E85\u5C04", splash: 44 },
    { kind: "dragon", label: "\u5E7C\u9F99", cost: 130, range: 146, dmg: 72, rate: 0.35, color: "#B45CE0", desc: "\u5410\u606F \xB7 \u9AD8\u4F24", splash: 28 }
  ];
  function towerDef(kind) {
    return TOWERS.find((t) => t.kind === kind) || TOWERS[0];
  }
  var PREP_MS = 7e3;
  var SPAWN_INTERVAL_MS = 720;
  function createState(bestWave = 0) {
    return {
      phase: "prep",
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
      lastEvent: ""
    };
  }
  function waveComposition(n, rnd) {
    const count = Math.min(16, 4 + Math.floor((n - 1) * 0.9));
    const out = [];
    for (let i = 0; i < count; i++) {
      const r = rnd();
      if (n <= 1) out.push("grunt");
      else if (n <= 3) out.push(r < 0.7 ? "grunt" : "rogue");
      else if (r < 0.5) out.push("grunt");
      else if (r < 0.8) out.push("knight");
      else out.push("rogue");
    }
    return out;
  }
  function waveHpMul(n) {
    return 1 + (n - 1) * 0.32;
  }
  function waveSpeedMul(n) {
    return Math.min(1.9, 1 + (n - 1) * 0.035);
  }
  function startWave(s, rnd) {
    s.phase = "battle";
    s.plan = waveComposition(s.wave, rnd);
    s.spawned = 0;
    s.spawnLeft = 0;
  }
  function spawnNext(s) {
    const kind = s.plan[s.spawned] || "grunt";
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
      reward: def.reward
    });
    s.spawned++;
  }
  function placeTower(s, slot, kind) {
    if (slot < 0 || slot >= SLOTS.length) return false;
    if (s.towers.some((t) => t.slot === slot)) return false;
    const def = towerDef(kind);
    if (s.gold < def.cost) return false;
    s.gold -= def.cost;
    s.towers.push({ slot, kind, cd: 0, angle: 0, flash: 0 });
    return true;
  }
  function towerAt(s, slot) {
    return s.towers.find((t) => t.slot === slot) || null;
  }
  function effective(s, kind) {
    const d = towerDef(kind);
    return {
      dmg: d.dmg * s.buffs.dmg,
      rate: d.rate * s.buffs.rate,
      dps: d.dmg * s.buffs.dmg * d.rate * s.buffs.rate,
      range: d.range
    };
  }
  function killDead(s) {
    const alive = [];
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
  function step(s, dtMs, rnd) {
    const events = [];
    if (s.phase === "dead" || s.phase === "upgrade") return events;
    const dt = Math.max(0, Math.min(100, dtMs));
    if (s.phase === "prep") {
      s.prepLeft -= dt;
      if (s.prepLeft <= 0) {
        startWave(s, rnd);
        events.push(`\u7B2C ${s.wave} \u6CE2\u6765\u4E86`);
      }
      return events;
    }
    if (s.spawned < s.plan.length) {
      s.spawnLeft -= dt;
      while (s.spawnLeft <= 0 && s.spawned < s.plan.length) {
        spawnNext(s);
        s.spawnLeft += SPAWN_INTERVAL_MS;
      }
    }
    for (const e of s.enemies) e.dist += e.speed * (dt / 1e3);
    const escaped = s.enemies.filter((e) => e.dist >= PATH_LEN);
    if (escaped.length) {
      s.enemies = s.enemies.filter((e) => e.dist < PATH_LEN);
      s.hp -= escaped.length;
      events.push(escaped.length > 1 ? `${escaped.length} \u4E2A\u52C7\u8005\u51B2\u8FDB\u5B9D\u5EA7` : "\u4E00\u4E2A\u52C7\u8005\u51B2\u8FDB\u5B9D\u5EA7");
      if (s.hp <= 0) {
        s.hp = 0;
        s.phase = "dead";
        s.bestWave = Math.max(s.bestWave, s.wave);
        events.push("\u738B\u5EA7\u5931\u5B88");
        return events;
      }
    }
    for (const t of s.towers) {
      const def = towerDef(t.kind);
      t.flash = Math.max(0, t.flash - dt / 220);
      t.cd -= dt;
      if (t.cd > 0) continue;
      const pos = SLOTS[t.slot];
      let target = null;
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
      t.cd = 1e3 / Math.max(0.05, def.rate * s.buffs.rate);
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
    if (s.spawned >= s.plan.length && s.enemies.length === 0) {
      const done = s.wave;
      s.bestWave = Math.max(s.bestWave, done);
      if (done % 3 === 0) {
        s.phase = "upgrade";
        events.push(`\u7B2C ${done} \u6CE2\u6E05\u5B8C\uFF0C\u9009\u4E00\u4E2A\u5F3A\u5316`);
      } else {
        s.wave = done + 1;
        s.phase = "prep";
        s.prepLeft = PREP_MS;
        events.push(`\u7B2C ${done} \u6CE2\u6E05\u5B8C`);
      }
    }
    return events;
  }
  var UPGRADES = [
    { id: "dmg", label: "\u6DEC\u6BD2", desc: "\u6240\u6709\u602A\u7269\u4F24\u5BB3 +15%" },
    { id: "rate", label: "\u72C2\u70ED", desc: "\u6240\u6709\u602A\u7269\u653B\u901F +15%" },
    { id: "gold", label: "\u8D2A\u5A6A", desc: "\u51FB\u6740\u9B54\u6676 +25%" },
    { id: "hp", label: "\u52A0\u56FA\u738B\u5EA7", desc: "\u8010\u4E45 +1\uFF08\u4E0A\u9650 5\uFF09" },
    { id: "meteor", label: "\u9668\u77F3", desc: "\u7ACB\u523B\u5BF9\u5168\u573A\u52C7\u8005\u9020\u6210 30 \u4F24\u5BB3" }
  ];
  function pickUpgrades(rnd, count = 3) {
    const pool = UPGRADES.slice();
    const out = [];
    while (out.length < count && pool.length) {
      const i = Math.floor(rnd() * pool.length) % pool.length;
      out.push(pool.splice(i, 1)[0]);
    }
    return out;
  }
  function applyUpgrade(s, id) {
    if (id === "dmg") s.buffs.dmg *= 1.15;
    else if (id === "rate") s.buffs.rate *= 1.15;
    else if (id === "gold") s.buffs.gold *= 1.25;
    else if (id === "hp") {
      s.maxHp = Math.min(5, s.maxHp + 1);
      s.hp = Math.min(s.maxHp, s.hp + 1);
    } else if (id === "meteor") {
      for (const e of s.enemies) e.hp -= 30;
      killDead(s);
    }
    s.wave += 1;
    s.phase = "prep";
    s.prepLeft = PREP_MS;
    return id === "meteor" ? "\u9668\u77F3\u7838\u4E0B\u6765\u4E86" : `\u5F3A\u5316\u5DF2\u751F\u6548\uFF1A${id}`;
  }
  function rushWave(s, rnd) {
    if (s.phase !== "prep") return;
    startWave(s, rnd);
  }
  function encodeShare(s) {
    return [Math.min(999, s.bestWave), Math.min(9999, s.kills), s.hp].join("~");
  }
  function decodeShare(raw) {
    if (typeof raw !== "string" || raw.length > 24) return null;
    const parts = raw.split("~");
    if (parts.length !== 3) return null;
    const nums = parts.map((v) => Number(v));
    if (!nums.every((n) => Number.isInteger(n) && n >= 0)) return null;
    const [bestWave, kills, hp] = nums;
    if (bestWave > 999 || kills > 9999 || hp > 5) return null;
    return { bestWave, kills, hp };
  }

  // src/art.ts
  function circ(c, x, y, r, fill) {
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fillStyle = fill;
    c.fill();
  }
  function rect(c, x, y, w, h, fill) {
    c.fillStyle = fill;
    c.fillRect(x, y, w, h);
  }
  function tri(c, x1, y1, x2, y2, x3, y3, fill) {
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.lineTo(x3, y3);
    c.closePath();
    c.fillStyle = fill;
    c.fill();
  }
  function drawField(c, top, bottom, t) {
    rect(c, 0, top, 375, bottom - top, "#2B2033");
    c.save();
    c.strokeStyle = "rgba(255,255,255,0.035)";
    c.lineWidth = 1;
    for (let y = top; y < bottom; y += 34) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(375, y);
      c.stroke();
    }
    for (let x = 0; x < 375; x += 34) {
      c.beginPath();
      c.moveTo(x, top);
      c.lineTo(x, bottom);
      c.stroke();
    }
    const g = c.createRadialGradient(318, 440, 10, 318, 440, 130);
    g.addColorStop(0, "rgba(242,180,65,0.16)");
    g.addColorStop(1, "rgba(242,180,65,0)");
    c.fillStyle = g;
    c.fillRect(180, 330, 195, 144);
    c.restore();
  }
  function drawPath(c) {
    c.save();
    c.lineCap = "round";
    c.lineJoin = "round";
    const stroke = (width, color, dash = []) => {
      c.beginPath();
      c.moveTo(PATH[0].x, PATH[0].y);
      for (let i = 1; i < PATH.length; i++) c.lineTo(PATH[i].x, PATH[i].y);
      c.lineWidth = width;
      c.strokeStyle = color;
      c.setLineDash(dash);
      c.stroke();
    };
    stroke(30, "#4E4132");
    stroke(24, "#6E5C48");
    stroke(2.5, "rgba(255,255,255,0.22)", [9, 11]);
    c.restore();
  }
  function drawSlot(c, x, y, selected, t) {
    c.save();
    c.beginPath();
    c.arc(x, y, 16, 0, Math.PI * 2);
    const a = selected ? 0.55 + Math.sin(t / 260) * 0.3 : 0.22;
    c.strokeStyle = selected ? `rgba(180,92,224,${a.toFixed(3)})` : "rgba(255,255,255,0.16)";
    c.lineWidth = selected ? 2 : 1.4;
    c.setLineDash([4, 5]);
    c.stroke();
    c.restore();
  }
  function drawEnemy(c, x, y, kind, hpRatio, t, id) {
    const bob = Math.sin(t / 180 + id) * 1.6;
    c.save();
    c.translate(x, y + bob);
    if (kind === "grunt") {
      circ(c, 0, 0, 8, "#E8C07A");
      rect(c, -3, -10, 6, 5, "#C9A05A");
      rect(c, -9, -2, 5, 10, "#B8825C");
    } else if (kind === "knight") {
      rect(c, -7, -9, 14, 17, "#C9CEDA");
      rect(c, -5, -14, 10, 6, "#A8B0C0");
      rect(c, -1, -2, 2, 9, "#8E96A8");
    } else {
      tri(c, 0, -10, 8, 8, -8, 8, "#8FCB6B");
      circ(c, 0, -2, 3, "#5F8F45");
    }
    c.restore();
    const w = 18;
    const ratio = Math.max(0, Math.min(1, hpRatio));
    rect(c, x - w / 2, y - 20, w, 3, "rgba(0,0,0,0.45)");
    rect(c, x - w / 2, y - 20, w * ratio, 3, ratio > 0.5 ? "#8FCB6B" : ratio > 0.25 ? "#E8C07A" : "#D95F3B");
  }
  function drawTower(c, x, y, kind, angle, flash, t) {
    c.save();
    c.translate(x, y);
    circ(c, 0, 4, 15, "rgba(0,0,0,0.35)");
    if (kind === "goblin") {
      circ(c, 0, 0, 11, "#8FCB6B");
      tri(c, -11, -4, -16, -14, -4, -9, "#6FAF4E");
      tri(c, 11, -4, 16, -14, 4, -9, "#6FAF4E");
      circ(c, -4, -1, 2.2, "#243020");
      circ(c, 4, -1, 2.2, "#243020");
    } else if (kind === "archer") {
      circ(c, 0, 0, 10, "#E6E9F0");
      rect(c, -6, -3, 4, 4, "#2B2033");
      rect(c, 2, -3, 4, 4, "#2B2033");
      rect(c, -1, 3, 2, 4, "#2B2033");
      c.beginPath();
      c.arc(9, 0, 8, -Math.PI / 2.2, Math.PI / 2.2);
      c.strokeStyle = "#C9A05A";
      c.lineWidth = 2;
      c.stroke();
    } else if (kind === "mage") {
      circ(c, 0, 0, 11, "#F0845C");
      tri(c, 0, -18, 7, -6, -7, -6, "#F2B441");
      circ(c, 0, 0, 5, "#FFD9A0");
    } else {
      circ(c, 0, 0, 13, "#B45CE0");
      tri(c, -12, -2, -24, -14, -10, 6, "#8E3FB8");
      tri(c, 12, -2, 24, -14, 10, 6, "#8E3FB8");
      circ(c, -4, -3, 2.4, "#F5E6FF");
      circ(c, 5, -3, 2.4, "#F5E6FF");
    }
    c.save();
    c.rotate(angle);
    tri(c, 13, 0, 6, -3.4, 6, 3.4, "rgba(255,255,255,0.55)");
    c.restore();
    if (flash > 0) {
      c.save();
      c.globalAlpha = flash * 0.7;
      circ(c, 0, 0, 18 + (1 - flash) * 8, "rgba(255,255,255,0.28)");
      c.restore();
    }
    c.restore();
  }
  function drawCastle(c, x, y, t) {
    c.save();
    c.translate(x, y);
    rect(c, -26, -18, 52, 34, "#5B4A6E");
    rect(c, -26, -30, 10, 14, "#5B4A6E");
    rect(c, -5, -30, 10, 14, "#5B4A6E");
    rect(c, 16, -30, 10, 14, "#5B4A6E");
    rect(c, -8, -6, 16, 22, "#33263F");
    c.beginPath();
    c.arc(0, -6, 8, Math.PI, 0);
    c.fillStyle = "#33263F";
    c.fill();
    c.beginPath();
    c.moveTo(0, -30);
    c.lineTo(0, -50);
    c.strokeStyle = "#C9CEDA";
    c.lineWidth = 2;
    c.stroke();
    const wave = Math.sin(t / 320) * 3;
    c.beginPath();
    c.moveTo(0, -50);
    c.lineTo(18, -46 + wave);
    c.lineTo(0, -40);
    c.closePath();
    c.fillStyle = "#D95F3B";
    c.fill();
    c.restore();
  }
  function drawCoin(c, x, y, r) {
    c.save();
    c.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + i / 6 * Math.PI * 2;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (i === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.closePath();
    c.fillStyle = "#F2B441";
    c.fill();
    c.strokeStyle = "#D08F1E";
    c.lineWidth = 1;
    c.stroke();
    c.restore();
  }
  function drawHeart(c, x, y, s, filled) {
    c.save();
    c.beginPath();
    c.moveTo(x, y + s * 0.75);
    c.lineTo(x - s * 0.9, y - s * 0.1);
    c.quadraticCurveTo(x - s * 0.55, y - s * 0.75, x, y - s * 0.3);
    c.quadraticCurveTo(x + s * 0.55, y - s * 0.75, x + s * 0.9, y - s * 0.1);
    c.closePath();
    if (filled) {
      c.fillStyle = "#D95F3B";
      c.fill();
    } else {
      c.strokeStyle = "rgba(255,255,255,0.35)";
      c.lineWidth = 1.4;
      c.stroke();
    }
    c.restore();
  }
  function drawSpawnHint(c, t) {
    const a = 0.35 + Math.sin(t / 300) * 0.25;
    c.save();
    c.globalAlpha = a;
    tri(c, 4, 126, 20, 138, 4, 150, "#F2B441");
    c.restore();
  }

  // src/social.ts
  var shareCanvas = null;
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }
  function fillLines(c, text, x, y, maxW, lh, maxLines) {
    let cur = "", used = 0;
    for (const ch of text) {
      if (cur && c.measureText(cur + ch).width > maxW) {
        c.fillText(cur, x, y + used * lh);
        used++;
        if (used >= maxLines) return;
        cur = ch;
      } else {
        cur += ch;
      }
    }
    if (cur && used < maxLines) c.fillText(cur, x, y + used * lh);
  }
  function shareImage(title, sub, badge = "") {
    if (!platform.isWx) return void 0;
    try {
      if (!shareCanvas) {
        shareCanvas = wx.createCanvas();
        shareCanvas.width = 500;
        shareCanvas.height = 400;
      }
      const cv = shareCanvas;
      const c = cv.getContext("2d");
      c.clearRect(0, 0, 500, 400);
      const grad = c.createLinearGradient(0, 0, 500, 400);
      grad.addColorStop(0, "#6B3FA0");
      grad.addColorStop(1, "#2E1E3F");
      c.fillStyle = grad;
      c.fillRect(0, 0, 500, 400);
      c.fillStyle = "rgba(255,255,255,0.07)";
      c.beginPath();
      c.arc(430, 66, 100, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.arc(60, 360, 120, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#FFFFFF";
      roundRect(c, 36, 74, 428, 250, 18);
      c.fill();
      c.textAlign = "left";
      c.textBaseline = "top";
      c.font = 'bold 34px "PingFang SC", "Microsoft YaHei", sans-serif';
      c.fillStyle = "#1F2A1F";
      fillLines(c, title, 64, 104, 372, 44, 2);
      c.font = '20px "PingFang SC", "Microsoft YaHei", sans-serif';
      c.fillStyle = "#7C8A7C";
      fillLines(c, sub, 64, 206, 372, 30, 2);
      if (badge) {
        c.font = 'bold 22px "PingFang SC", "Microsoft YaHei", sans-serif';
        c.fillStyle = "#2F7B46";
        c.fillText(badge, 64, 272);
      }
      c.font = '18px "PingFang SC", "Microsoft YaHei", sans-serif';
      c.fillStyle = "rgba(255,255,255,0.92)";
      c.textAlign = "center";
      c.fillText("\u53CD\u5411\u5854\u9632 \xB7 \u6211\u662F Boss", 250, 350);
      const out = cv.toTempFilePathSync({
        x: 0,
        y: 0,
        width: 500,
        height: 400,
        destWidth: 500,
        destHeight: 400
      });
      if (typeof out === "string") return out;
      if (out && typeof out.tempFilePath === "string") return out.tempFilePath;
      return void 0;
    } catch (_) {
      return void 0;
    }
  }

  // src/storage.ts
  var K_BEST = "bd_best_wave";
  var K_GUIDE = "bd_guide_v1";
  var store = {
    bestWave() {
      return platform.getStore(K_BEST, 0) | 0;
    },
    saveBest(n) {
      const w = Math.max(0, Math.round(n));
      if (w > this.bestWave()) {
        platform.setStore(K_BEST, w);
        platform.setCloudScore(w);
      }
    },
    guideSeen() {
      return !!platform.getStore(K_GUIDE, false);
    },
    markGuide() {
      platform.setStore(K_GUIDE, true);
    }
  };

  // src/scenes.ts
  var HUD_Y = 48;
  var FIELD_TOP = 96;
  var FIELD_BOTTOM = 474;
  var SHOP_Y = 474;
  var CARD_Y = 498;
  var CARD_H = 94;
  var CARD_W = 81;
  var CARD_GAP = 8;
  var Game = class {
    constructor(ui2) {
      this.ui = ui2;
      this.mode = "title";
      this.selected = "goblin";
      this.speed = 1;
      this.guideVisible = false;
      this.upgradeChoices = [];
      this.deadVisible = false;
      this.t = 0;
      this.lastEvent = "";
      this.eventAt = 0;
      this.friend = null;
      this.state = createState(store.bestWave());
      this.guideVisible = !store.guideSeen();
      const q = platform.getLaunchQuery();
      if (typeof q.boss === "string") {
        const f = decodeShare(q.boss);
        if (f) {
          this.friend = f;
          platform.toast(`\u597D\u53CB\u5B88\u5230\u7B2C ${f.bestWave} \u6CE2\uFF0C\u770B\u770B\u4F60\u80FD\u5B88\u591A\u4E45`);
        }
      }
    }
    sharePayload() {
      const w = Math.max(this.state.bestWave, this.state.wave);
      const title = `\u6211\u628A\u52C7\u8005\u6321\u5728\u7B2C ${w} \u6CE2\uFF0C\u4F60\u6765\u5F53\u8FD9\u4E2A Boss`;
      return {
        title,
        query: "boss=" + encodeShare(this.state),
        imageUrl: shareImage(
          title,
          "\u5E03\u7F6E\u602A\u7269\uFF0C\u522B\u8BA9\u52C7\u8005\u8D70\u5230\u738B\u5EA7",
          `\u51FB\u6740 ${this.state.kills} \u4E2A\u52C7\u8005 \xB7 \u8FD8\u5269 ${this.state.hp} \u70B9\u8010\u4E45`
        )
      };
    }
    /** 返回 true 表示触摸已被场景消费；end 一律放行给按钮热区 */
    handleTouch(x, y, phase) {
      if (phase !== "end") return false;
      if (this.mode !== "play") return false;
      if (this.upgradeChoices.length || this.deadVisible || this.guideVisible) return false;
      for (let i = 0; i < SLOTS.length; i++) {
        const p = SLOTS[i];
        const dx = x - p.x, dy = y - p.y;
        if (dx * dx + dy * dy > 24 * 24) continue;
        const exist = towerAt(this.state, i);
        if (exist) {
          const d = towerDef(exist.kind);
          platform.toast(`${d.label} \xB7 ${d.desc}`);
          return true;
        }
        if (!this.selected) {
          platform.toast("\u5148\u5728\u4E0B\u9762\u9009\u4E00\u79CD\u602A");
          return true;
        }
        const def = towerDef(this.selected);
        if (this.state.gold < def.cost) {
          platform.toast(`\u9B54\u6676\u4E0D\u591F\uFF0C\u8FD8\u5DEE ${def.cost - this.state.gold}`);
          return true;
        }
        if (placeTower(this.state, i, this.selected)) {
          platform.vibrate();
          this.state.lastEvent = `\u653E\u4E86 ${def.label}`;
        }
        return true;
      }
      return false;
    }
    tick() {
      this.t += 16;
      if (this.mode !== "play") return;
      if (this.upgradeChoices.length || this.deadVisible || this.guideVisible) return;
      for (let i = 0; i < this.speed; i++) {
        const events = step(this.state, 16, Math.random);
        if (events.length) this.announce(events[events.length - 1]);
      }
      if (this.state.phase === "upgrade" && this.upgradeChoices.length === 0) {
        this.upgradeChoices = pickUpgrades(Math.random);
      }
      if (this.state.phase === "dead" && !this.deadVisible) {
        this.deadVisible = true;
        store.saveBest(Math.max(this.state.bestWave, this.state.wave));
      }
    }
    announce(msg) {
      if (msg === this.lastEvent && this.t - this.eventAt < 1500) return;
      this.lastEvent = msg;
      this.eventAt = this.t;
      platform.toast(msg);
    }
    choose(up) {
      applyUpgrade(this.state, up.id);
      this.upgradeChoices = [];
      platform.vibrate();
      platform.toast(up.id === "meteor" ? "\u9668\u77F3\u7838\u4E0B\u6765\u4E86" : `${up.label} \u751F\u6548`);
    }
    restart() {
      this.state = createState(store.bestWave());
      this.deadVisible = false;
      this.upgradeChoices = [];
      this.selected = "goblin";
      this.speed = 1;
    }
    draw() {
      this.tick();
      if (this.mode === "title") this.drawTitle();
      else this.drawPlay();
      if (this.deadVisible) this.drawDead();
      if (this.upgradeChoices.length) this.drawUpgrade();
      if (this.guideVisible) this.drawGuide();
    }
    // ---------------- 首页 ----------------
    drawTitle() {
      const ui2 = this.ui;
      const c = ui2.c;
      ui2.navBar("\u53CD\u5411\u5854\u9632 \xB7 \u6211\u662F Boss");
      c.fillStyle = "#2B2033";
      c.fillRect(0, 44, DESIGN_W, 300);
      drawPathShapes(c);
      drawCastle(c, 312, 268, this.t);
      drawTower(c, 90, 150, "goblin", 0.4, 0, this.t);
      drawTower(c, 190, 210, "mage", -0.6, 0, this.t);
      drawTower(c, 262, 300, "archer", 2.4, 0, this.t);
      drawEnemy(c, 60, 220, "knight", 0.7, this.t, 1);
      ui2.text("\u8FD9\u4E00\u56DE\uFF0C\u4F60\u662F Boss", DESIGN_W / 2, 364, {
        size: 26,
        bold: true,
        align: "center",
        color: C.ink
      });
      ui2.text("\u5E03\u7F6E\u602A\u7269\uFF0C\u522B\u8BA9\u52C7\u8005\u8D70\u5230\u738B\u5EA7", DESIGN_W / 2, 402, {
        size: 14,
        color: C.greenDark,
        align: "center"
      });
      if (this.friend) {
        ui2.text(
          `\u597D\u53CB\u5B88\u5230\u7B2C ${this.friend.bestWave} \u6CE2 \xB7 \u51FB\u6740 ${this.friend.kills}`,
          DESIGN_W / 2,
          428,
          { size: 12, color: C.blue, align: "center" }
        );
      }
      ui2.button(20, 456, DESIGN_W - 40, 50, "\u5F00 \u59CB \u5E03 \u9632", () => {
        this.mode = "play";
      });
      ui2.button(20, 518, 160, 44, "\u6700\u9AD8\u6CE2\u6570", () => {
        platform.toast(`\u5386\u53F2\u6700\u9AD8\uFF1A\u7B2C ${store.bestWave()} \u6CE2`);
      }, "ghost");
      ui2.button(195, 518, 160, 44, "\u9001 \u597D \u53CB", () => platform.share(this.sharePayload()), "ghost");
      ui2.text("\u4E0A\u4E00\u5C40\u5B88\u5230\u7B2C\u51E0\u6CE2\uFF0C\u602A\u7269\u548C\u9B54\u6676\u5C31\u7559\u5230\u54EA", DESIGN_W / 2, 586, {
        size: 12,
        color: C.sub,
        align: "center",
        maxWidth: 330
      });
      ui2.text("\u52C7\u8005\u8D70\u8FDB\u738B\u5EA7\u4F1A\u6263\u8010\u4E45\uFF0C\u6263\u5B8C\u8FD9\u5C40\u5C31\u7ED3\u675F", DESIGN_W / 2, 612, {
        size: 12,
        color: C.sub,
        align: "center",
        maxWidth: 330
      });
      ui2.text(`\u5386\u53F2\u6700\u9AD8 \u7B2C ${store.bestWave()} \u6CE2`, DESIGN_W / 2, 644, {
        size: 12,
        bold: true,
        color: C.warn,
        align: "center"
      });
    }
    // ---------------- 主玩法 ----------------
    drawPlay() {
      const ui2 = this.ui;
      const c = ui2.c;
      ui2.navBar("\u6211\u662F Boss", () => {
        this.mode = "title";
        store.saveBest(this.state.bestWave);
      });
      this.drawHud();
      drawField(c, FIELD_TOP, FIELD_BOTTOM, this.t);
      drawPath(c);
      drawCastle(c, 318, 440, this.t);
      if (this.state.phase === "prep") drawSpawnHint(c, this.t);
      for (let i = 0; i < SLOTS.length; i++) {
        const p = SLOTS[i];
        const tw = towerAt(this.state, i);
        if (tw) drawTower(c, p.x, p.y, tw.kind, tw.angle, tw.flash, this.t);
        else drawSlot(c, p.x, p.y, !!this.selected, this.t);
      }
      const list = this.state.enemies.slice().sort((a, b) => a.dist - b.dist);
      for (const e of list) {
        const p = posAt(e.dist);
        drawEnemy(c, p.x, p.y, e.kind, e.hp / e.maxHp, this.t, e.id);
      }
      this.drawShop();
    }
    drawHud() {
      const ui2 = this.ui;
      const s = this.state;
      ui2.panel(12, HUD_Y, DESIGN_W - 24, 44, 12, C.card);
      ui2.text(`\u7B2C ${s.wave} \u6CE2`, 24, HUD_Y + 8, { size: 15, bold: true, color: C.ink });
      const sub = s.phase === "prep" ? `\u51C6\u5907 ${Math.ceil(s.prepLeft / 1e3)} \u79D2` : s.phase === "battle" ? `\u5269 ${s.enemies.length + (s.plan.length - s.spawned)} \u4E2A` : s.phase === "upgrade" ? "\u9009\u5F3A\u5316" : "\u5DF2\u7ED3\u675F";
      ui2.text(sub, 24, HUD_Y + 26, { size: 10, color: C.sub });
      drawCoin(ui2.c, 150, HUD_Y + 22, 8);
      ui2.text(String(Math.floor(s.gold)), 162, HUD_Y + 14, { size: 15, bold: true, color: C.ink });
      for (let i = 0; i < s.maxHp; i++) {
        drawHeart(ui2.c, 224 + i * 18, HUD_Y + 24, 8, i < s.hp);
      }
      const speedLabel = this.speed === 1 ? "x1" : "x2";
      ui2.button(322, HUD_Y + 8, 40, 28, speedLabel, () => {
        this.speed = this.speed === 1 ? 2 : 1;
      }, this.speed === 1 ? "plain" : "primary", true, 12);
    }
    drawShop() {
      const ui2 = this.ui;
      const c = ui2.c;
      ui2.panel(0, SHOP_Y, DESIGN_W, DESIGN_H - SHOP_Y, 0, "#FBF9FD");
      ui2.line(0, SHOP_Y, DESIGN_W, SHOP_Y, C.line);
      ui2.text("\u70B9\u4E00\u79CD\u602A\uFF0C\u518D\u70B9\u6218\u573A\u4E0A\u7684\u865A\u7EBF\u5708\u653E\u4E0B\u53BB", DESIGN_W / 2, SHOP_Y + 8, {
        size: 11,
        color: C.sub,
        align: "center"
      });
      TOWERS.forEach((def, i) => {
        const x = 13 + i * (CARD_W + CARD_GAP);
        const active = this.selected === def.kind;
        const afford = this.state.gold >= def.cost;
        ui2.panel(x, CARD_Y, CARD_W, CARD_H, 12, active ? C.greenPale : C.card);
        if (active) ui2.outlined(x, CARD_Y, CARD_W, CARD_H, 12, C.green, 1.6);
        c.save();
        c.translate(x + CARD_W / 2, CARD_Y + 30);
        c.scale(0.82, 0.82);
        drawTower(c, 0, 0, def.kind, -Math.PI / 2, 0, this.t);
        c.restore();
        ui2.text(def.label, x + CARD_W / 2, CARD_Y + 50, {
          size: 11,
          bold: true,
          color: afford ? C.ink : C.sub,
          align: "center"
        });
        ui2.text(def.desc, x + CARD_W / 2, CARD_Y + 66, {
          size: 9,
          color: C.sub,
          align: "center"
        });
        drawCoin(c, x + CARD_W / 2 - 12, CARD_Y + 82, 5);
        ui2.text(String(def.cost), x + CARD_W / 2 + 2, CARD_Y + 76, {
          size: 11,
          bold: true,
          color: afford ? C.warn : C.red,
          align: "center"
        });
        ui2.regions.push({
          x,
          y: CARD_Y,
          w: CARD_W,
          h: CARD_H,
          fn: () => {
            this.selected = def.kind;
          },
          enabled: true
        });
      });
      if (this.state.phase === "prep") {
        ui2.button(13, 602, 220, 40, `\u7ACB \u523B \u5F00 \u6218\uFF08\u7B2C ${this.state.wave} \u6CE2\uFF09`, () => {
          rushWave(this.state, Math.random);
        }, "primary", true, 13);
      } else {
        const st = effective(this.state, "goblin");
        ui2.text(
          `\u4F24\u5BB3 x${this.state.buffs.dmg.toFixed(2)} \xB7 \u653B\u901F x${this.state.buffs.rate.toFixed(2)} \xB7 \u9B54\u6676 x${this.state.buffs.gold.toFixed(2)}`,
          13,
          610,
          { size: 11, color: C.sub, maxWidth: 220 }
        );
        ui2.text(`\u54E5\u5E03\u6797 DPS ${st.dps.toFixed(1)}`, 13, 628, { size: 10, color: C.sub });
      }
      ui2.button(241, 602, 121, 40, "\u91CD \u5F00", () => this.restart(), "ghost", true, 13);
      ui2.text(
        `\u51FB\u6740 ${this.state.kills} \xB7 \u5386\u53F2\u6700\u9AD8 \u7B2C ${store.bestWave()} \u6CE2`,
        DESIGN_W / 2,
        650,
        { size: 11, color: C.sub, align: "center" }
      );
    }
    // ---------------- 三选一 ----------------
    drawUpgrade() {
      const ui2 = this.ui;
      ui2.dim();
      ui2.regions.push({ x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, fn: () => {
      }, enabled: true });
      ui2.panel(20, 140, DESIGN_W - 40, 396, 16, C.card);
      ui2.text(`\u7B2C ${this.state.wave} \u6CE2\u6E05\u5B8C`, DESIGN_W / 2, 162, {
        size: 13,
        color: C.sub,
        align: "center"
      });
      ui2.text("\u9009\u4E00\u4E2A\u5F3A\u5316\uFF0C\u63A5\u7740\u5B88", DESIGN_W / 2, 186, {
        size: 20,
        bold: true,
        align: "center"
      });
      this.upgradeChoices.forEach((up, i) => {
        const y = 228 + i * 92;
        ui2.panel(38, y, DESIGN_W - 76, 80, 12, "#F8F4FD");
        ui2.text(up.label, 56, y + 14, { size: 16, bold: true, color: C.greenDark });
        ui2.text(up.desc, 56, y + 40, { size: 12, color: C.ink, maxWidth: 250 });
        ui2.regions.push({
          x: 38,
          y,
          w: DESIGN_W - 76,
          h: 80,
          fn: () => this.choose(up),
          enabled: true
        });
      });
      ui2.text("\u6BCF 3 \u6CE2\u9009\u4E00\u6B21", DESIGN_W / 2, 508, { size: 11, color: C.sub, align: "center" });
    }
    // ---------------- 结束 ----------------
    drawDead() {
      const ui2 = this.ui;
      const s = this.state;
      ui2.dim();
      ui2.regions.push({ x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, fn: () => {
      }, enabled: true });
      ui2.panel(30, 176, DESIGN_W - 60, 326, 16, C.card);
      ui2.text("\u738B\u5EA7\u5931\u5B88", DESIGN_W / 2, 198, { size: 24, bold: true, align: "center", color: C.red });
      ui2.text(`\u5B88\u5230\u7B2C ${Math.max(s.bestWave, s.wave)} \u6CE2`, DESIGN_W / 2, 238, {
        size: 16,
        bold: true,
        color: C.ink,
        align: "center"
      });
      ui2.text(`\u51FB\u6740 ${s.kills} \u4E2A\u52C7\u8005`, DESIGN_W / 2, 266, {
        size: 13,
        color: C.sub,
        align: "center"
      });
      ui2.text(`\u5386\u53F2\u6700\u9AD8 \u7B2C ${store.bestWave()} \u6CE2`, DESIGN_W / 2, 290, {
        size: 12,
        color: C.warn,
        align: "center"
      });
      ui2.text("\u602A\u7269\u7684\u4F24\u5BB3\u3001\u653B\u901F\u3001\u9B54\u6676\u6536\u76CA\u4F1A\u5E26\u8FDB\u4E0B\u4E00\u5C40", DESIGN_W / 2, 318, {
        size: 11,
        color: C.sub,
        align: "center",
        maxWidth: 280
      });
      ui2.button(56, 344, DESIGN_W - 112, 46, "\u518D \u6765 \u4E00 \u5C40", () => this.restart());
      ui2.button(
        56,
        398,
        (DESIGN_W - 112 - 10) / 2,
        40,
        "\u9001 \u597D \u53CB",
        () => platform.share(this.sharePayload()),
        "ghost",
        true,
        13
      );
      ui2.button(
        56 + (DESIGN_W - 112 - 10) / 2 + 10,
        398,
        (DESIGN_W - 112 - 10) / 2,
        40,
        "\u56DE \u9996 \u9875",
        () => {
          this.deadVisible = false;
          this.mode = "title";
        },
        "ghost",
        true,
        13
      );
      ui2.text("\u8010\u4E45\u662F\u8FD9\u5C40\u552F\u4E00\u7684\u5931\u8D25\u6761\u4EF6", DESIGN_W / 2, 452, {
        size: 10,
        color: C.sub,
        align: "center"
      });
    }
    // ---------------- 首次引导 ----------------
    drawGuide() {
      const ui2 = this.ui;
      ui2.dim();
      ui2.regions.push({ x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, fn: () => {
      }, enabled: true });
      ui2.panel(26, 150, DESIGN_W - 52, 344, 16, C.card);
      ui2.text("\u8FD9\u4E00\u5C40\u600E\u4E48\u6253", DESIGN_W / 2, 172, { size: 21, bold: true, align: "center" });
      const tips = [
        "\u2460 \u4E0B\u65B9\u9009\u4E00\u79CD\u602A\uFF0C\u518D\u70B9\u6218\u573A\u4E0A\u7684\u865A\u7EBF\u5708",
        "\u2461 \u52C7\u8005\u6CBF\u8DEF\u8D70\u5411\u53F3\u4E0B\u89D2\u7684\u738B\u5EA7",
        "\u2462 \u653E\u602A\u8981\u82B1\u9B54\u6676\uFF0C\u51FB\u6740\u52C7\u8005\u4F1A\u56DE\u9B54\u6676",
        "\u2463 \u6BCF 3 \u6CE2\u80FD\u9009\u4E00\u4E2A\u5F3A\u5316\uFF0C\u8D8A\u5B88\u8D8A\u5F3A"
      ];
      tips.forEach((t, i) => {
        ui2.text(t, 46, 216 + i * 46, {
          size: 12.5,
          color: C.ink,
          maxWidth: 285,
          lineHeight: 18
        });
      });
      ui2.text("3 \u70B9\u8010\u4E45\uFF0C\u8DD1\u8FDB\u53BB\u4E00\u4E2A\u6263\u4E00\u70B9", DESIGN_W / 2, 410, {
        size: 13,
        bold: true,
        color: C.red,
        align: "center"
      });
      ui2.button(48, 438, DESIGN_W - 96, 42, "\u5F00 \u59CB \u5E03 \u9632", () => {
        this.guideVisible = false;
        store.markGuide();
      });
    }
  };
  function drawPathShapes(c) {
    c.save();
    c.lineCap = "round";
    c.lineJoin = "round";
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
    c.strokeStyle = "#6E5C48";
    c.stroke();
    c.lineWidth = 2;
    c.strokeStyle = "rgba(255,255,255,0.18)";
    c.setLineDash([8, 10]);
    c.stroke();
    c.restore();
  }

  // src/main.ts
  var ui = new UI(() => platform.ctx);
  var game = new Game(ui);
  platform.onTouch((x, y, phase) => {
    if (game.handleTouch(x, y, phase)) return;
    if (phase === "end") ui.tap(x, y);
  });
  platform.onShareAppMessage(() => game.sharePayload());
  function frame() {
    platform.beginFrame();
    ui.begin();
    game.draw();
    platform.requestFrame(frame);
  }
  platform.requestFrame(frame);
})();
