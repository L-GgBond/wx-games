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
      c.fillStyle = "#141C18";
      c.fillRect(0, 0, this.canvas.width, this.canvas.height);
      c.setTransform(
        this.dpr * this.scale,
        0,
        0,
        this.dpr * this.scale,
        this.dpr * this.offX,
        this.dpr * this.offY
      );
      c.fillStyle = "#F4F7F5";
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
    bg: "#F4F7F5",
    card: "#FFFFFF",
    green: "#1F9D55",
    greenDark: "#137A41",
    greenPale: "#E7F6EE",
    ink: "#182420",
    sub: "#7C8C85",
    line: "#E1E9E4",
    red: "#E4572E",
    redPale: "#FCEAE5",
    blue: "#576B95",
    warn: "#E8A020",
    warnPale: "#FFF4DF",
    soil: "#C9A77C",
    soilDark: "#9C7A52",
    overlay: "rgba(20,36,28,0.6)",
    field: "#2B3A33",
    fieldLine: "#3B4C44",
    path: "#6E5C48",
    pathEdge: "#4E4132",
    gold: "#F2C14E",
    pot: "#4A382B",
    steam: "rgba(255,255,255,0.55)"
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
      c.fillStyle = "#F7FAF8";
      c.fillRect(0, 0, DESIGN_W, 44);
      this.line(0, 44, DESIGN_W, 44, "#DCE7E0");
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
  var COLS = 4;
  var ROWS = 5;
  var CELLS = COLS * ROWS;
  var BASE_SLOTS = 7;
  var MAX_SLOTS = 9;
  var UNDO_PER_LEVEL = 3;
  function priceOf(kind) {
    return 8 + Math.max(0, kind) * 2;
  }
  function levelConfig(level) {
    const lv = Math.max(1, Math.round(level));
    const cells = Math.min(CELLS, 12 + lv * 2);
    const kinds = Math.min(8, 2 + lv);
    const avg = 8 + (kinds - 1);
    return { cells, kinds, groups: cells, target: Math.round(cells * avg * 0.62) };
  }
  function shuffle(arr, rnd) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1)) % (i + 1);
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
  }
  function createState(level = 1, rnd = Math.random) {
    const cfg = levelConfig(level);
    const kinds = [];
    for (let i = 0; i < cfg.groups; i++) kinds.push(i % cfg.kinds);
    shuffle(kinds, rnd);
    const shelves = new Array(CELLS).fill(null);
    for (let i = 0; i < cfg.groups && i < CELLS; i++) {
      shelves[i] = { kind: kinds[i], count: 3 };
    }
    return {
      level: Math.max(1, Math.round(level)),
      shelves,
      baskets: [],
      slots: BASE_SLOTS,
      revenue: 0,
      target: cfg.target,
      groupsLeft: cfg.groups,
      groupsTotal: cfg.groups,
      phase: "play",
      undoLeft: UNDO_PER_LEVEL,
      combo: 0,
      bestCombo: 0,
      kindCount: cfg.kinds,
      history: []
    };
  }
  function snapshot(s) {
    s.history.push(JSON.stringify({
      shelves: s.shelves,
      baskets: s.baskets,
      revenue: s.revenue,
      groupsLeft: s.groupsLeft,
      combo: s.combo,
      bestCombo: s.bestCombo
    }));
    if (s.history.length > 30) s.history.shift();
  }
  function insertBasket(baskets, kind) {
    const out = baskets.slice();
    const last = out.lastIndexOf(kind);
    if (last >= 0) out.splice(last + 1, 0, kind);
    else out.push(kind);
    if (out.filter((v) => v === kind).length >= 3) {
      const keep = [];
      let removed = 0;
      for (const v of out) {
        if (v === kind && removed < 3) {
          removed++;
          continue;
        }
        keep.push(v);
      }
      return { list: keep, matched: true };
    }
    return { list: out, matched: false };
  }
  function pick(s, idx) {
    if (s.phase !== "play") return { ok: false, matched: false, reason: "\u8FD9\u4E00\u5C40\u5DF2\u7ECF\u7ED3\u675F", gained: 0 };
    if (idx < 0 || idx >= CELLS) return { ok: false, matched: false, reason: "\u8D8A\u754C", gained: 0 };
    const cell = s.shelves[idx];
    if (!cell) return { ok: false, matched: false, reason: "\u8FD9\u683C\u7A7A\u4E86", gained: 0 };
    snapshot(s);
    const res = insertBasket(s.baskets, cell.kind);
    s.baskets = res.list;
    cell.count -= 1;
    if (cell.count <= 0) s.shelves[idx] = null;
    let gained = 0;
    if (res.matched) {
      gained = priceOf(cell.kind);
      s.revenue += gained;
      s.groupsLeft = Math.max(0, s.groupsLeft - 1);
      s.combo += 1;
      s.bestCombo = Math.max(s.bestCombo, s.combo);
    } else {
      s.combo = 0;
    }
    if (s.revenue >= s.target) {
      s.phase = "win";
    } else if (s.shelves.every((c) => !c)) {
      s.phase = "lose";
    } else if (s.baskets.length >= s.slots) {
      s.phase = "stuck";
    }
    return { ok: true, matched: res.matched, reason: "", gained };
  }
  function addSlot(s) {
    if (s.slots >= MAX_SLOTS) return false;
    s.slots = Math.min(MAX_SLOTS, s.slots + 2);
    if (s.phase === "stuck" && s.baskets.length < s.slots) s.phase = "play";
    return true;
  }
  function shuffleShelves(s, rnd = Math.random) {
    if (s.phase === "win" || s.phase === "lose") return;
    const items = [];
    const slots = [];
    s.shelves.forEach((c, i) => {
      if (c) {
        items.push(c);
        slots.push(i);
      }
    });
    shuffle(items, rnd);
    const next = new Array(CELLS).fill(null);
    slots.forEach((slot, i) => {
      next[slot] = items[i];
    });
    s.shelves = next;
  }
  function undo(s) {
    if (s.undoLeft <= 0) return false;
    const raw = s.history.pop();
    if (!raw) return false;
    const o = JSON.parse(raw);
    s.shelves = o.shelves;
    s.baskets = o.baskets;
    s.revenue = o.revenue;
    s.groupsLeft = o.groupsLeft;
    s.combo = o.combo || 0;
    s.bestCombo = o.bestCombo || s.bestCombo;
    s.phase = "play";
    s.undoLeft -= 1;
    return true;
  }
  function progressOf(s) {
    return Math.max(0, Math.min(1, s.revenue / Math.max(1, s.target)));
  }
  function starsOf(s) {
    const ratio = s.revenue / Math.max(1, s.target);
    if (ratio >= 1.35) return 3;
    if (ratio >= 1.1) return 2;
    return 1;
  }
  function encodeShare(s) {
    return [Math.min(999, s.level), Math.min(999999, s.revenue)].join("~");
  }
  function decodeShare(raw) {
    if (typeof raw !== "string" || raw.length > 20) return null;
    const parts = raw.split("~");
    if (parts.length !== 2) return null;
    const nums = parts.map((v) => Number(v));
    if (!nums.every((n) => Number.isInteger(n) && n >= 0)) return null;
    const [level, revenue] = nums;
    if (level < 1 || level > 999 || revenue > 999999) return null;
    return { level, revenue };
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
  function roundRect(c, x, y, w, h, r) {
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
  var GOODS_COLORS = [
    "#4A90D9",
    "#D9A05B",
    "#E8EEF5",
    "#E4572E",
    "#E8A020",
    "#7B4FB5",
    "#F2A0C0",
    "#5FA86B"
  ];
  function drawGoods(c, x, y, s, kind) {
    const k = (kind % 8 + 8) % 8;
    const color = GOODS_COLORS[k];
    const h = s * 0.5;
    c.save();
    c.translate(x, y);
    if (k === 0) {
      roundRect(c, -h * 0.42, -h, h * 0.84, h * 2, h * 0.22);
      c.fillStyle = color;
      c.fill();
      rect(c, -h * 0.42, -h * 0.3, h * 0.84, h * 0.5, "rgba(255,255,255,0.5)");
    } else if (k === 1) {
      c.beginPath();
      c.arc(0, 0, h * 0.95, Math.PI, 0);
      c.lineTo(h * 0.95, h * 0.5);
      c.lineTo(-h * 0.95, h * 0.5);
      c.closePath();
      c.fillStyle = color;
      c.fill();
      c.strokeStyle = "rgba(120,80,40,0.45)";
      c.lineWidth = 2;
      for (let i = -1; i <= 1; i++) {
        c.beginPath();
        c.moveTo(i * h * 0.4 - 4, -h * 0.5);
        c.lineTo(i * h * 0.4 + 4, h * 0.2);
        c.stroke();
      }
    } else if (k === 2) {
      roundRect(c, -h * 0.55, -h * 0.8, h * 1.1, h * 1.6, h * 0.12);
      c.fillStyle = color;
      c.fill();
      c.strokeStyle = "#B9C6D4";
      c.lineWidth = 1.5;
      c.stroke();
      c.beginPath();
      c.moveTo(-h * 0.55, -h * 0.8);
      c.lineTo(0, -h * 1.15);
      c.lineTo(h * 0.55, -h * 0.8);
      c.closePath();
      c.fillStyle = "#D7E2EC";
      c.fill();
      rect(c, -h * 0.28, -h * 0.2, h * 0.56, h * 0.5, "#4A90D9");
    } else if (k === 3) {
      circ(c, 0, h * 0.1, h * 0.85, color);
      c.beginPath();
      c.moveTo(0, -h * 0.7);
      c.quadraticCurveTo(h * 0.1, -h * 1.15, h * 0.45, -h * 1.05);
      c.quadraticCurveTo(h * 0.25, -h * 0.85, 0, -h * 0.7);
      c.fillStyle = "#5FA86B";
      c.fill();
      circ(c, -h * 0.28, -h * 0.1, h * 0.2, "rgba(255,255,255,0.5)");
    } else if (k === 4) {
      c.beginPath();
      c.moveTo(-h * 0.95, -h * 0.35);
      c.lineTo(h * 0.95, -h * 0.35);
      c.lineTo(h * 0.66, h * 0.7);
      c.lineTo(-h * 0.66, h * 0.7);
      c.closePath();
      c.fillStyle = color;
      c.fill();
      c.beginPath();
      c.moveTo(-h * 0.9, -h * 0.35);
      c.quadraticCurveTo(-h * 0.45, -h * 0.9, 0, -h * 0.4);
      c.quadraticCurveTo(h * 0.45, -h * 0.05, h * 0.9, -h * 0.35);
      c.strokeStyle = "#C97E12";
      c.lineWidth = 2.4;
      c.stroke();
    } else if (k === 5) {
      const w = h * 0.95;
      c.beginPath();
      c.moveTo(-w, -h);
      c.lineTo(w, -h);
      c.lineTo(w, h);
      c.lineTo(-w, h);
      c.closePath();
      c.fillStyle = color;
      c.fill();
      c.beginPath();
      for (let i = 0; i < 6; i++) {
        const px = -w + i * 2 * w / 5;
        c.lineTo(px, -h - (i % 2 === 0 ? 6 : 0));
      }
      c.strokeStyle = "#5A2F8A";
      c.lineWidth = 2;
      c.stroke();
      circ(c, 0, h * 0.15, h * 0.3, "rgba(255,255,255,0.55)");
    } else if (k === 6) {
      c.beginPath();
      c.moveTo(-h * 0.55, -h * 0.1);
      c.lineTo(h * 0.55, -h * 0.1);
      c.lineTo(0, h * 1.1);
      c.closePath();
      c.fillStyle = "#D9A05B";
      c.fill();
      circ(c, -h * 0.22, -h * 0.4, h * 0.42, color);
      circ(c, h * 0.24, -h * 0.42, h * 0.38, "#F5C7D8");
    } else {
      roundRect(c, -h, -h * 0.7, h * 2, h * 1.5, h * 0.16);
      c.fillStyle = color;
      c.fill();
      rect(c, -h * 0.86, -h * 0.5, h * 0.7, h * 0.5, "#F2C14E");
      rect(c, -h * 0.06, -h * 0.5, h * 0.7, h * 0.5, "#E4572E");
      rect(c, -h * 0.86, h * 0.06, h * 1.5, h * 0.18, "rgba(255,255,255,0.6)");
    }
    c.restore();
  }
  function drawShelfCell(c, x, y, w, h, kind, count, t) {
    roundRect(c, x, y, w, h, 10);
    c.fillStyle = "#FFFFFF";
    c.fill();
    c.strokeStyle = "#E1E9E4";
    c.lineWidth = 1;
    c.stroke();
    rect(c, x + 4, y + h - 10, w - 8, 4, "#EEF3EF");
    drawGoods(c, x + w / 2, y + h / 2 - 6, 40, kind);
    if (count > 0) {
      circ(c, x + w - 14, y + h - 16, 9, count >= 3 ? "#1F9D55" : "#7C8C85");
      c.fillStyle = "#FFFFFF";
      c.font = 'bold 11px -apple-system, "PingFang SC", sans-serif';
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(String(count), x + w - 14, y + h - 15);
    }
  }
  function drawEmptyCell(c, x, y, w, h) {
    roundRect(c, x, y, w, h, 10);
    c.fillStyle = "#F7FAF8";
    c.fill();
    c.save();
    c.setLineDash([5, 5]);
    c.strokeStyle = "#DFE8E2";
    c.lineWidth = 1;
    c.stroke();
    c.restore();
  }
  function drawBasketSlot(c, x, y, size, kind, highlight) {
    roundRect(c, x, y, size, size, 9);
    c.fillStyle = kind === null ? "#F7FAF8" : "#FFFFFF";
    c.fill();
    c.strokeStyle = highlight ? "#1F9D55" : "#DCE7E0";
    c.lineWidth = highlight ? 2 : 1.2;
    c.stroke();
    if (kind !== null) drawGoods(c, x + size / 2, y + size / 2, size * 0.62, kind);
    else {
      c.save();
      c.strokeStyle = "rgba(124,140,133,0.35)";
      c.lineWidth = 1;
      c.setLineDash([3, 4]);
      c.beginPath();
      c.moveTo(x + size / 2, y + size * 0.3);
      c.lineTo(x + size / 2, y + size * 0.7);
      c.moveTo(x + size * 0.3, y + size / 2);
      c.lineTo(x + size * 0.7, y + size / 2);
      c.stroke();
      c.restore();
    }
  }
  function drawProgress(c, x, y, w, h, ratio) {
    roundRect(c, x, y, w, h, h / 2);
    c.fillStyle = "#E7EFE9";
    c.fill();
    const r = Math.max(0, Math.min(1, ratio));
    if (r > 0) {
      roundRect(c, x, y, Math.max(h, w * r), h, h / 2);
      const g = c.createLinearGradient(x, y, x + w * r, y);
      g.addColorStop(0, "#3FCB7A");
      g.addColorStop(1, "#1F9D55");
      c.fillStyle = g;
      c.fill();
    }
  }
  function drawCoin(c, x, y, r) {
    circ(c, x, y, r, "#E8A020");
    circ(c, x, y, r * 0.62, "#F7C85C");
  }
  function drawPop(c, x, y, color, p) {
    const q = Math.max(0, Math.min(1, p));
    c.save();
    c.globalAlpha = 1 - q;
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      circ(c, x + Math.cos(a) * (8 + q * 26), y + Math.sin(a) * (8 + q * 26), 3 * (1 - q) + 1, color);
    }
    c.restore();
  }

  // src/social.ts
  var shareCanvas = null;
  function roundRect2(c, x, y, w, h, r) {
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
      grad.addColorStop(0, "#2FB46A");
      grad.addColorStop(1, "#125E36");
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
      roundRect2(c, 36, 74, 428, 250, 18);
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
      c.fillText("\u4E00\u683C\u4FBF\u5229\u5E97 \xB7 \u6446\u6EE1\u4E09\u4E2A\u5C31\u6D88", 250, 350);
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
  var K_LEVEL = "ogs_level";
  var K_REV = "ogs_best_rev";
  var K_GUIDE = "ogs_guide_v1";
  var store = {
    level() {
      return Math.max(1, platform.getStore(K_LEVEL, 1) | 0);
    },
    saveLevel(n) {
      platform.setStore(K_LEVEL, Math.max(1, Math.round(n)));
    },
    bestRevenue() {
      return platform.getStore(K_REV, 0) | 0;
    },
    saveRevenue(n) {
      if (n > this.bestRevenue()) {
        platform.setStore(K_REV, Math.round(n));
        platform.setCloudScore(Math.round(n));
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
  var CELL_W = 83;
  var CELL_H = 68;
  var CELL_GAP_X = 6;
  var CELL_GAP_Y = 6;
  var GRID_X = 12;
  var GRID_Y = 122;
  var BASKET_Y = 502;
  var BASKET_SIZE = 36;
  var BASKET_GAP = 4;
  function shelfRect(i) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    return {
      x: GRID_X + col * (CELL_W + CELL_GAP_X),
      y: GRID_Y + row * (CELL_H + CELL_GAP_Y),
      w: CELL_W,
      h: CELL_H
    };
  }
  function basketRect(i, slots) {
    const total = slots * (BASKET_SIZE + BASKET_GAP) - BASKET_GAP;
    const startX = (DESIGN_W - total) / 2;
    return { x: startX + i * (BASKET_SIZE + BASKET_GAP), y: BASKET_Y, s: BASKET_SIZE };
  }
  var Game = class {
    constructor(ui2) {
      this.ui = ui2;
      this.mode = "title";
      this.guideVisible = false;
      this.t = 0;
      this.pops = [];
      this.friend = null;
      this.state = createState(store.level());
      this.guideVisible = !store.guideSeen();
      const q = platform.getLaunchQuery();
      if (typeof q.store === "string") {
        const f = decodeShare(q.store);
        if (f) {
          this.friend = f;
          platform.toast(`\u597D\u53CB\u5728\u7B2C ${f.level} \u5173\u505A\u5230 \xA5${f.revenue}`);
        }
      }
    }
    sharePayload() {
      const s = this.state;
      const title = `\u6211\u5728\u7B2C ${s.level} \u5173\u505A\u5230 \xA5${s.revenue}\uFF0C\u4F60\u6765\u7406\u8FD9\u6392\u8D27\u67B6`;
      return {
        title,
        query: "store=" + encodeShare(s),
        imageUrl: shareImage(
          title,
          "\u540C\u6B3E\u51D1\u6EE1\u4E09\u4E2A\u5C31\u6D88\uFF0C\u7BEE\u5B50\u53EA\u6709\u4E03\u4E2A",
          `\u7B2C ${s.level} \u5173 \xB7 \u76EE\u6807 \xA5${s.target}`
        )
      };
    }
    toast(msg) {
      platform.toast(msg);
    }
    /** 返回 true 表示触摸已被场景消费；end 一律放行给按钮热区 */
    handleTouch(x, y, phase) {
      if (phase !== "end") return false;
      if (this.mode !== "play" || this.state.phase !== "play") return false;
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
            x: DESIGN_W / 2,
            y: BASKET_Y + BASKET_SIZE / 2,
            color: GOODS_COLORS[cell.kind],
            p: 0
          });
          this.toast(`\u6D88\u6389\u4E00\u7EC4 \xB7 +\xA5${res.gained}`);
        }
        store.saveRevenue(this.state.revenue);
        return true;
      }
      return false;
    }
    tick() {
      this.t += 16;
      for (const p of this.pops) p.p += 1 / 22;
      this.pops = this.pops.filter((p) => p.p < 1);
    }
    nextLevel() {
      const lv = this.state.level + 1;
      store.saveLevel(lv);
      this.state = createState(lv);
      this.pops = [];
      this.mode = "play";
    }
    retry() {
      this.state = createState(this.state.level);
      this.pops = [];
    }
    useSlot() {
      platform.rewardedAd((ok) => {
        if (!ok) {
          this.toast("\u6CA1\u770B\u5B8C\uFF0C\u69FD\u4F4D\u6CA1\u52A0\u4E0A");
          return;
        }
        if (addSlot(this.state)) this.toast(`\u7BEE\u5B50\u6269\u5230 ${this.state.slots} \u683C`);
        else this.toast("\u5DF2\u7ECF\u52A0\u6EE1\u4E86");
      });
    }
    useShuffle() {
      platform.rewardedAd((ok) => {
        if (!ok) {
          this.toast("\u6CA1\u770B\u5B8C\uFF0C\u6CA1\u6D17\u724C");
          return;
        }
        shuffleShelves(this.state);
        this.toast("\u8D27\u67B6\u91CD\u6392\u4E86\u4E00\u904D");
      });
    }
    draw() {
      this.tick();
      if (this.mode === "title") this.drawTitle();
      else this.drawPlay();
      if (this.guideVisible) this.drawGuide();
    }
    // ---------------- 首页 ----------------
    drawTitle() {
      const ui2 = this.ui;
      const c = ui2.c;
      ui2.navBar("\u4E00\u683C\u4FBF\u5229\u5E97");
      c.fillStyle = "#EAF6EF";
      c.fillRect(0, 44, DESIGN_W, 240);
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 4; j++) {
          const x = 74 + i * 76;
          const y = 96 + j * 44;
          roundPath(c, x, y, 64, 38, 8);
          c.fillStyle = "#FFFFFF";
          c.fill();
          drawGoods(c, x + 32, y + 19, 26, (i * 4 + j) % 8);
        }
      }
      ui2.text("\u4E00\u683C\u4FBF\u5229\u5E97", DESIGN_W / 2, 268, { size: 32, bold: true, align: "center" });
      ui2.text("\u8D27\u67B6\u4E0A\u7684\u540C\u6B3E\uFF0C\u51D1\u6EE1\u4E09\u4E2A\u5C31\u6D88", DESIGN_W / 2, 312, {
        size: 14,
        color: C.greenDark,
        align: "center"
      });
      if (this.friend) {
        ui2.text(
          `\u597D\u53CB\u5728\u7B2C ${this.friend.level} \u5173 \xB7 \xA5${this.friend.revenue}`,
          DESIGN_W / 2,
          340,
          { size: 12, color: C.blue, align: "center" }
        );
      }
      ui2.button(20, 366, DESIGN_W - 40, 50, `\u5F00 \u5E97\uFF08\u7B2C ${this.state.level} \u5173\uFF09`, () => {
        this.mode = "play";
      });
      ui2.button(20, 428, 160, 44, "\u6700\u9AD8\u8425\u6536", () => {
        this.toast(`\u5386\u53F2\u6700\u9AD8\u8425\u6536 \xA5${store.bestRevenue()}`);
      }, "ghost");
      ui2.button(195, 428, 160, 44, "\u9001 \u597D \u53CB", () => platform.share(this.sharePayload()), "ghost");
      const tips = [
        "\u2460 \u70B9\u8D27\u67B6\u4E0A\u7684\u5546\u54C1\uFF0C\u5B83\u81EA\u5DF1\u8DF3\u8FDB\u7BEE\u5B50",
        "\u2461 \u7BEE\u5B50\u91CC\u540C\u6B3E\u6EE1 3 \u4E2A\u81EA\u52A8\u6D88\uFF0C\u6362\u6210\u8425\u4E1A\u989D",
        "\u2462 \u7BEE\u5B50\u6EE1\u4E86\u5C31\u5361\u4F4F\uFF0C\u53EF\u4EE5\u52A0\u69FD\u6216\u6D17\u724C\u6551\u4E00\u4E0B"
      ];
      tips.forEach((tp, i) => {
        ui2.text(tp, 28, 496 + i * 26, { size: 12.5, color: C.ink, maxWidth: 320 });
      });
      ui2.text(
        `\u5386\u53F2\u6700\u9AD8 \u7B2C ${store.level()} \u5173 \xB7 \xA5${store.bestRevenue()}`,
        DESIGN_W / 2,
        604,
        { size: 12, color: C.warn, align: "center" }
      );
      ui2.text("\u4E0D\u8D76\u65F6\u95F4\uFF0C\u60F3\u6E05\u695A\u518D\u70B9", DESIGN_W / 2, 630, {
        size: 11,
        color: C.sub,
        align: "center"
      });
    }
    // ---------------- 主玩法 ----------------
    drawPlay() {
      const ui2 = this.ui;
      const c = ui2.c;
      const s = this.state;
      ui2.navBar("\u4E00\u683C\u4FBF\u5229\u5E97", () => {
        this.mode = "title";
        store.saveRevenue(s.revenue);
      });
      ui2.panel(12, 52, DESIGN_W - 24, 58, 12, C.card);
      ui2.text(`\u7B2C ${s.level} \u5173`, 26, 60, { size: 14, bold: true, color: C.ink });
      ui2.text(`\u76EE\u6807 \xA5${s.target}`, DESIGN_W - 26, 60, {
        size: 13,
        bold: true,
        color: C.warn,
        align: "right"
      });
      drawProgress(c, 26, 82, DESIGN_W - 52, 12, progressOf(s));
      ui2.text(`\xA5${s.revenue}`, 26, 96, { size: 11, bold: true, color: C.greenDark });
      ui2.text(`\u5269 ${s.groupsLeft} \u7EC4`, DESIGN_W - 26, 96, {
        size: 11,
        color: C.sub,
        align: "right"
      });
      ui2.panel(6, 116, DESIGN_W - 12, 376, 14, "#EDF5F0");
      for (let i = 0; i < COLS * ROWS; i++) {
        const r = shelfRect(i);
        const cell = s.shelves[i];
        if (cell) drawShelfCell(c, r.x, r.y, r.w, r.h, cell.kind, cell.count, this.t);
        else drawEmptyCell(c, r.x, r.y, r.w, r.h);
      }
      ui2.text("\u8D2D\u7269\u7BEE", 26, 486, { size: 11, color: C.sub });
      const filled = s.baskets.length;
      ui2.text(`${filled} / ${s.slots}`, DESIGN_W - 26, 486, {
        size: 11,
        color: filled >= s.slots - 1 ? C.red : C.sub,
        align: "right"
      });
      for (let i = 0; i < s.slots; i++) {
        const b = basketRect(i, s.slots);
        const kind = i < s.baskets.length ? s.baskets[i] : null;
        drawBasketSlot(c, b.x, b.y, b.s, kind, i === s.baskets.length - 1 && filled >= s.slots - 1);
      }
      ui2.button(12, 552, 110, 42, `\u64A4\u56DE ${s.undoLeft}`, () => {
        if (s.undoLeft <= 0) {
          this.toast("\u8FD9\u4E00\u5173\u7684\u64A4\u56DE\u7528\u5B8C\u4E86");
          return;
        }
        if (!undo(s)) this.toast("\u6CA1\u6709\u53EF\u64A4\u56DE\u7684\u6B65\u9AA4");
      }, "ghost", s.undoLeft > 0, 13);
      ui2.button(137, 552, 110, 42, "\u6D17 \u724C", () => this.useShuffle(), "ghost", true, 13);
      ui2.button(262, 552, 101, 42, `\u52A0\u69FD ${s.slots}`, () => this.useSlot(), "primary", s.slots < MAX_SLOTS, 13);
      ui2.text(`\u8FDE\u51FB ${s.combo} \xB7 \u6700\u9AD8\u8FDE\u51FB ${s.bestCombo}`, 20, 606, { size: 11, color: C.sub });
      ui2.text(`\u5386\u53F2\u6700\u9AD8 \xA5${store.bestRevenue()}`, DESIGN_W - 20, 606, {
        size: 11,
        color: C.warn,
        align: "right"
      });
      ui2.text("\u70B9\u7A7A\u683C\u5B50\u6CA1\u53CD\u5E94\uFF0C\u70B9\u6709\u8D27\u7684\u683C\u5B50\u624D\u62FF\u5F97\u51FA\u6765", DESIGN_W / 2, 630, {
        size: 10.5,
        color: C.sub,
        align: "center",
        maxWidth: 330
      });
      for (const p of this.pops) drawPop(c, p.x, p.y, p.color, p.p);
      if (s.phase === "stuck") this.drawStuck();
      if (s.phase === "win") this.drawWin();
      if (s.phase === "lose") this.drawLose();
    }
    // ---------------- 卡住 ----------------
    drawStuck() {
      const ui2 = this.ui;
      ui2.dim();
      ui2.regions.push({ x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, fn: () => {
      }, enabled: true });
      ui2.panel(30, 206, DESIGN_W - 60, 300, 16, C.card);
      ui2.text("\u7BEE\u5B50\u6EE1\u4E86", DESIGN_W / 2, 228, {
        size: 22,
        bold: true,
        color: C.red,
        align: "center"
      });
      ui2.text(
        `\u4E03\u4E2A\u683C\u5B50\u90FD\u5360\u4E86\uFF0C\u8FD8\u5DEE ${this.state.target - this.state.revenue} \u8425\u4E1A\u989D`,
        DESIGN_W / 2,
        266,
        { size: 12, color: C.sub, align: "center", maxWidth: 270 }
      );
      ui2.text("\u52A0\u4E00\u4E2A\u69FD\u4F4D\uFF0C\u6216\u8005\u628A\u8D27\u67B6\u91CD\u6392\u4E00\u904D", DESIGN_W / 2, 292, {
        size: 12,
        color: C.ink,
        align: "center"
      });
      ui2.button(52, 320, DESIGN_W - 104, 46, "\u770B\u89C6\u9891 \xB7 \u7BEE\u5B50 +1 \u683C", () => this.useSlot());
      ui2.button(
        52,
        376,
        (DESIGN_W - 104 - 10) / 2,
        40,
        "\u6D17 \u724C",
        () => this.useShuffle(),
        "ghost",
        true,
        13
      );
      ui2.button(
        52 + (DESIGN_W - 104 - 10) / 2 + 10,
        376,
        (DESIGN_W - 104 - 10) / 2,
        40,
        "\u91CD \u6765",
        () => this.retry(),
        "ghost",
        true,
        13
      );
      ui2.text("\u5361\u4F4F\u4E0D\u7B97\u8F93\uFF0C\u8FD8\u6709\u6551", DESIGN_W / 2, 434, { size: 11, color: C.sub, align: "center" });
    }
    // ---------------- 过关 ----------------
    drawWin() {
      const ui2 = this.ui;
      const s = this.state;
      const stars = starsOf(s);
      ui2.dim();
      ui2.regions.push({ x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, fn: () => {
      }, enabled: true });
      ui2.panel(32, 186, DESIGN_W - 64, 320, 16, C.card);
      ui2.text("\u6253\u70CA\u7ED3\u8D26", DESIGN_W / 2, 208, { size: 23, bold: true, align: "center" });
      ui2.text(`\u7B2C ${s.level} \u5173\u8FBE\u6210`, DESIGN_W / 2, 246, {
        size: 13,
        color: C.sub,
        align: "center"
      });
      drawCoin(ui2.c, DESIGN_W / 2 - 40, 288, 14);
      ui2.text(`\xA5${s.revenue}`, DESIGN_W / 2 + 8, 270, {
        size: 26,
        bold: true,
        color: C.warn,
        align: "center"
      });
      ui2.text(`\u76EE\u6807 \xA5${s.target} \xB7 \u5269\u4F59 ${s.groupsLeft} \u7EC4`, DESIGN_W / 2, 314, {
        size: 11,
        color: C.sub,
        align: "center"
      });
      for (let i = 0; i < 3; i++) {
        ui2.c.beginPath();
        ui2.c.arc(DESIGN_W / 2 - 30 + i * 30, 348, 9, 0, Math.PI * 2);
        ui2.c.fillStyle = i < stars ? "#F2C14E" : "#EDF2EE";
        ui2.c.fill();
      }
      ui2.text(`\u5386\u53F2\u6700\u9AD8 \xA5${store.bestRevenue()}`, DESIGN_W / 2, 374, {
        size: 11,
        color: C.sub,
        align: "center"
      });
      ui2.button(56, 396, DESIGN_W - 112, 46, `\u8FDB \u7B2C ${s.level + 1} \u5173`, () => this.nextLevel());
      ui2.button(56, 450, DESIGN_W - 112, 32, "\u9001 \u597D \u53CB", () => platform.share(this.sharePayload()), "plain", true, 12);
    }
    // ---------------- 没达标 ----------------
    drawLose() {
      const ui2 = this.ui;
      const s = this.state;
      ui2.dim();
      ui2.regions.push({ x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, fn: () => {
      }, enabled: true });
      ui2.panel(32, 200, DESIGN_W - 64, 300, 16, C.card);
      ui2.text("\u8D27\u67B6\u7A7A\u4E86", DESIGN_W / 2, 222, { size: 22, bold: true, color: C.red, align: "center" });
      ui2.text(`\u8425\u4E1A\u989D \xA5${s.revenue} / \xA5${s.target}`, DESIGN_W / 2, 260, {
        size: 14,
        bold: true,
        color: C.ink,
        align: "center"
      });
      ui2.text(`\u5DEE \xA5${Math.max(0, s.target - s.revenue)}\uFF0C\u7BEE\u5B50\u9650\u5236\u8BA9\u51E0\u7EC4\u6CA1\u6D88\u6210`, DESIGN_W / 2, 288, {
        size: 12,
        color: C.sub,
        align: "center",
        maxWidth: 270
      });
      ui2.text("\u4E0B\u6B21\u5148\u6E05\u540C\u6B3E\u591A\u7684\u683C\u5B50\uFF0C\u522B\u628A\u4E0D\u540C\u79CD\u7C7B\u90FD\u644A\u5F00", DESIGN_W / 2, 316, {
        size: 11,
        color: C.sub,
        align: "center",
        maxWidth: 280
      });
      ui2.button(56, 348, DESIGN_W - 112, 46, "\u518D \u6765 \u4E00 \u6B21", () => this.retry());
      ui2.button(56, 402, DESIGN_W - 112, 32, "\u56DE \u9996 \u9875", () => {
        this.mode = "title";
        store.saveRevenue(s.revenue);
      }, "plain", true, 12);
    }
    // ---------------- 首次引导 ----------------
    drawGuide() {
      const ui2 = this.ui;
      const cfg = levelConfig(this.state.level);
      ui2.dim();
      ui2.regions.push({ x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, fn: () => {
      }, enabled: true });
      ui2.panel(26, 152, DESIGN_W - 52, 330, 16, C.card);
      ui2.text("\u600E\u4E48\u7406\u8FD9\u6392\u8D27\u67B6", DESIGN_W / 2, 174, { size: 20, bold: true, align: "center" });
      const tips = [
        "\u2460 \u70B9\u6709\u8D27\u7684\u683C\u5B50\uFF0C\u4E00\u4EF6\u5546\u54C1\u8DF3\u8FDB\u4E0B\u9762\u7684\u7BEE\u5B50",
        "\u2461 \u7BEE\u5B50\u91CC\u540C\u6B3E\u51D1\u6EE1 3 \u4E2A\uFF0C\u7ACB\u523B\u6D88\u6389\u6362\u94B1",
        "\u2462 \u7BEE\u5B50\u53EA\u6709 7 \u683C\uFF0C\u88C5\u6EE1\u4E86\u4F1A\u5361\u4F4F",
        "\u2463 \u64A4\u56DE\u514D\u8D39 3 \u6B21\uFF0C\u6D17\u724C\u548C\u52A0\u69FD\u770B\u89C6\u9891\u6362\u6765"
      ];
      tips.forEach((t, i) => {
        ui2.text(t, 46, 214 + i * 46, { size: 12.5, color: C.ink, maxWidth: 285, lineHeight: 18 });
      });
      ui2.text(
        `\u672C\u5173 ${cfg.cells} \u683C\u8D27 \xB7 ${cfg.kinds} \u79CD\u5546\u54C1 \xB7 \u76EE\u6807 \xA5${cfg.target}`,
        DESIGN_W / 2,
        404,
        { size: 12, bold: true, color: C.greenDark, align: "center" }
      );
      ui2.text(`\u5171 ${UNDO_PER_LEVEL} \u6B21\u64A4\u56DE\uFF0C\u7701\u7740\u7528`, DESIGN_W / 2, 428, {
        size: 11,
        color: C.sub,
        align: "center"
      });
      ui2.button(48, 442, DESIGN_W - 96, 42, "\u5F00 \u59CB", () => {
        this.guideVisible = false;
        store.markGuide();
      });
    }
  };

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
