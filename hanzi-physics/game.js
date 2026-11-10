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
      c.fillStyle = "#111318";
      c.fillRect(0, 0, this.canvas.width, this.canvas.height);
      c.setTransform(
        this.dpr * this.scale,
        0,
        0,
        this.dpr * this.scale,
        this.dpr * this.offX,
        this.dpr * this.offY
      );
      c.fillStyle = "#EDEDED";
      c.fillRect(0, 0, DESIGN_W, DESIGN_H);
    }
    onTouch(cb) {
      this.handler = cb;
    }
    requestFrame(cb) {
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(cb);
      else setTimeout(() => cb(Date.now()), 16);
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
      this.toast("\u9884\u89C8\u6A21\u5F0F\uFF1A\u5DF2\u590D\u5236\u5206\u4EAB\u94FE\u63A5\n" + url);
    }
    onShareAppMessage(_cb) {
    }
    rewardedAd(cb) {
      this.toast("\u9884\u89C8\u6A21\u5F0F\uFF1A\u6A21\u62DF\u89C2\u770B\u6FC0\u52B1\u89C6\u9891\u2026");
      setTimeout(() => {
        this.toast("\u89C2\u770B\u5B8C\u6210\uFF0C\u5DF2\u53D1\u653E\u4E00\u6B21\u63D0\u793A");
        cb(true);
      }, 1500);
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
          this.toast("\u5E7F\u544A\u52A0\u8F7D\u5931\u8D25\uFF0C\u5DF2\u76F4\u63A5\u53D1\u653E\u63D0\u793A");
          cb(true);
        }
      });
    }
    rewardedAd(cb) {
      if (!AD_UNIT_ID) {
        this.toast("\u672A\u914D\u7F6E\u5E7F\u544A\u5355\u5143\uFF0C\u6F14\u793A\u6A21\u5F0F\u76F4\u63A5\u53D1\u653E\u63D0\u793A");
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
              this.toast("\u5E7F\u544A\u6682\u4E0D\u53EF\u7528\uFF0C\u5DF2\u76F4\u63A5\u53D1\u653E\u63D0\u793A");
              pending(true);
            }
          })
        );
      } catch (_) {
        this.adCb = null;
        this.toast("\u5E7F\u544A\u4E0D\u53EF\u7528\uFF0C\u5DF2\u76F4\u63A5\u53D1\u653E\u63D0\u793A");
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
    bg: "#EDEDED",
    card: "#FFFFFF",
    green: "#07C160",
    greenDark: "#06AD56",
    greenPale: "#E8F8EF",
    ink: "#191919",
    sub: "#8A8A8A",
    line: "#E5E5E5",
    red: "#FA5151",
    redPale: "#FDECEC",
    blue: "#576B95",
    bubble: "#FFFFFF",
    selfBubble: "#95EC69",
    warn: "#E8A317",
    warnPale: "#FFF6E0",
    overlay: "rgba(0,0,0,0.55)"
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
      const fill = !enabled ? "#D8D8D8" : style === "primary" ? C.green : style === "ghost" ? C.card : style === "danger" ? C.redPale : "#F4F4F4";
      const fg = !enabled ? "#9A9A9A" : style === "primary" ? "#FFFFFF" : style === "ghost" ? C.green : style === "danger" ? C.red : C.ink;
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
      c.fillStyle = "#F7F7F7";
      c.fillRect(0, 0, DESIGN_W, 44);
      this.line(0, 44, DESIGN_W, 44, "#DCDCDC");
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
      c.fillRect(0, 0, DESIGN_W, 667);
    }
  };

  // src/pieces.ts
  var PIECES = {
    "\u4E00": { key: "a", glyph: "\u4E00", label: "\u6A2A\u677F", w: 100, h: 10, friction: 0.5, restitution: 0.05, angle: 0, color: "#8FA8C8", desc: "\u6700\u957F\u7684\u4E00\u5757\uFF0C\u9002\u5408\u642D\u6865" },
    "\u6728": { key: "b", glyph: "\u6728", label: "\u6728\u6881", w: 84, h: 12, friction: 0.6, restitution: 0.06, angle: 0, color: "#B98554", desc: "\u6469\u64E6\u5927\uFF0C\u7403\u6EDA\u5F97\u7A33" },
    "\u6C35": { key: "c", glyph: "\u6C35", label: "\u6C34\u5761", w: 88, h: 10, friction: 1e-3, restitution: 0, angle: Math.PI / 12, color: "#5AB4E0", desc: "\u8D85\u6ED1\uFF0C\u7403\u4E00\u6CBE\u5C31\u52A0\u901F" },
    "\u51AB": { key: "d", glyph: "\u51AB", label: "\u51B0\u9762", w: 74, h: 9, friction: 5e-4, restitution: 0, angle: -Math.PI / 12, color: "#A8DCEC", desc: "\u66F4\u6ED1\uFF0C\u4E5F\u80FD\u628A\u7403\u5F80\u5DE6\u5E26" },
    "\u53E3": { key: "e", glyph: "\u53E3", label: "\u65B9\u6846", w: 34, h: 34, friction: 0.6, restitution: 0.2, angle: 0, color: "#D9A0A0", desc: "\u5F53\u6321\u677F\uFF0C\u786C\u6539\u65B9\u5411" },
    "\u4EBB": { key: "f", glyph: "\u4EBB", label: "\u7ACB\u67F1", w: 12, h: 60, friction: 0.6, restitution: 0.02, angle: 0, color: "#A9B58C", desc: "\u7AD6\u7740\u6491\uFF0C\u4E5F\u80FD\u5F53\u5899" },
    "\u77F3": { key: "g", glyph: "\u77F3", label: "\u77F3\u5757", w: 46, h: 28, friction: 0.9, restitution: 0, angle: 0, color: "#9A9A9A", desc: "\u6700\u7A33\uFF0C\u7403\u649E\u4E0A\u4E0D\u5F39" },
    "\u571F": { key: "h", glyph: "\u571F", label: "\u571F\u5761", w: 72, h: 14, friction: 0.95, restitution: 0, angle: Math.PI / 12, color: "#C6A46B", desc: "\u6469\u64E6\u6700\u5927\uFF0C\u80FD\u5239\u4F4F\u7403" }
  };
  function byKey(key) {
    return Object.keys(PIECES).find((k) => PIECES[k].key === key);
  }

  // src/levels.ts
  var LEVELS = [
    {
      id: 0,
      name: "\u4E00\u6865\u901A",
      desc: "\u7403\u4ECE\u4E0A\u9762\u843D\u4E0B\u6765\uFF0C\u642D\u4E00\u5757\u5761\u628A\u5B83\u9001\u8FDB\u53F3\u8FB9\u7684\u7B50",
      hint: "\u300C\u6728\u300D\u5F80\u53F3\u8F6C 15\xB0\uFF0C\u7403\u843D\u4E0A\u53BB\u5C31\u4F1A\u5F80\u53F3\u6EDA",
      ball: { x: 150, y: 92 },
      goal: { x: 238, y: 396, w: 110, h: 70 },
      pegs: [
        { x: 58, y: 320, w: 96, h: 12, angle: -0.16, label: "\u65E7\u53F0" }
      ],
      stock: [{ type: "\u4E00", count: 1 }, { type: "\u6728", count: 1 }, { type: "\u6C35", count: 1 }, { type: "\u53E3", count: 1 }],
      solution: [{ type: "\u6728", x: 180, y: 210, angle: Math.PI / 12 }]
    },
    {
      id: 1,
      name: "\u7ED5\u77F3",
      desc: "\u4E2D\u95F4\u6321\u7740\u4E00\u5757\u77F3\u5934\uFF0C\u628A\u7403\u5F80\u5DE6\u8FB9\u5F15",
      hint: "\u300C\u51AB\u300D\u5F80\u5DE6\u8F6C\u5230 45\xB0\uFF0C\u6B63\u597D\u7ED5\u5F00\u77F3\u5934",
      ball: { x: 170, y: 92 },
      goal: { x: 40, y: 396, w: 118, h: 70 },
      pegs: [
        { x: 188, y: 272, w: 132, h: 20, angle: 0, label: "\u77F3\u53F0" }
      ],
      stock: [{ type: "\u51AB", count: 1 }, { type: "\u6C35", count: 1 }, { type: "\u53E3", count: 2 }, { type: "\u4EBB", count: 1 }],
      solution: [{ type: "\u51AB", x: 180, y: 190, angle: -Math.PI / 4 }]
    },
    {
      id: 2,
      name: "\u957F\u5761",
      desc: "\u8D77\u70B9\u5728\u6700\u53F3\u8FB9\uFF0C\u7B50\u5728\u5DE6\u4E0B\uFF0C\u9700\u8981\u4E00\u6761\u957F\u5761\u628A\u7403\u5E26\u56DE\u6765",
      hint: "\u300C\u4E00\u300D\u5F80\u5DE6\u8F6C 30\xB0\uFF0C\u957F\u5761\u624D\u591F\u5F97\u5230\u5DE6\u8FB9\u7684\u7B50",
      ball: { x: 300, y: 92 },
      goal: { x: 44, y: 396, w: 130, h: 70 },
      pegs: [
        { x: 300, y: 292, w: 84, h: 16, angle: 0, label: "\u6321\u677F" },
        { x: 120, y: 350, w: 90, h: 12, angle: 0.1, label: "\u659C\u53F0" }
      ],
      stock: [{ type: "\u4E00", count: 1 }, { type: "\u6728", count: 2 }, { type: "\u53E3", count: 1 }, { type: "\u571F", count: 1 }],
      solution: [{ type: "\u4E00", x: 260, y: 210, angle: -Math.PI / 6 }]
    }
  ];

  // src/physics.ts
  var STEP = 1e3 / 60;
  var GRAVITY = 0.32;
  var AIR_DRAG = 6e-4;
  var RADIUS = 9;
  var SUBSTEPS = 2;
  var ITERATIONS = 3;
  var STALL_FRAMES = 90;
  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }
  var PhysicsWorld = class {
    constructor(level) {
      this.level = level;
      this.pieces = [];
      this.trail = [];
      this.elapsed = 0;
      this.running = false;
      this.ball = null;
      this.rects = [];
      this.nextId = 1;
      this.stallFrames = 0;
      this.addRect(-1, -8, 278, 16, 560, 0, 0.6, 0.1);
      this.addRect(-1, 383, 278, 16, 560, 0, 0.6, 0.1);
      this.addRect(-1, 187, 508, 380, 16, 0, 0.8, 0);
      level.pegs.forEach((p) => this.addRect(-1, p.x, p.y, p.w, p.h, p.angle || 0, 0.7, 0.05));
      const g = level.goal;
      this.addRect(-1, g.x - 5, g.y + g.h / 2, 10, g.h, 0, 0.7, 0);
      this.addRect(-1, g.x + g.w + 5, g.y + g.h / 2, 10, g.h, 0, 0.7, 0);
      this.addRect(-1, g.x + g.w / 2, g.y + g.h + 5, g.w + 20, 10, 0, 0.9, 0);
      this.addRect(-1, g.x - 18, g.y - 8, 28, 8, 0.45, 0.6, 0);
      this.addRect(-1, g.x + g.w + 18, g.y - 8, 28, 8, -0.45, 0.6, 0);
    }
    addRect(id, x, y, w, h, angle, friction, restitution) {
      this.rects.push({ id, x, y, w, h, angle, friction, restitution });
    }
    addPiece(type, x, y, angle) {
      const d = PIECES[type];
      if (!d) return null;
      const p = { id: this.nextId++, type, x, y, angle };
      this.pieces.push(p);
      this.addRect(p.id, x, y, d.w, d.h, angle, d.friction, d.restitution);
      return p;
    }
    remove(id) {
      const i = this.pieces.findIndex((p) => p.id === id);
      if (i < 0) return;
      this.pieces.splice(i, 1);
      const r = this.rects.findIndex((v) => v.id === id);
      if (r >= 0) this.rects.splice(r, 1);
    }
    clearPieces() {
      while (this.pieces.length) this.remove(this.pieces[0].id);
    }
    rotate(id, delta) {
      const p = this.pieces.find((v) => v.id === id);
      const r = this.rects.find((v) => v.id === id);
      if (!p || !r) return;
      const next = p.angle + delta;
      p.angle = Math.atan2(Math.sin(next), Math.cos(next));
      r.angle = p.angle;
    }
    /** 命中测试：把点击坐标反旋转到部件本地坐标 */
    hitPiece(x, y) {
      for (let i = this.pieces.length - 1; i >= 0; i--) {
        const p = this.pieces[i];
        const d = PIECES[p.type];
        const [lx, ly] = toLocal(x - p.x, y - p.y, p.angle);
        if (Math.abs(lx) <= d.w / 2 + 6 && Math.abs(ly) <= Math.max(d.h / 2, 12) + 8) return p.id;
      }
      return -1;
    }
    launch() {
      this.resetBall();
      const b = this.level.ball;
      this.ball = { x: b.x, y: b.y, vx: b.vx || 0, vy: 0 };
      this.running = true;
    }
    resetBall() {
      this.ball = null;
      this.trail = [];
      this.elapsed = 0;
      this.running = false;
      this.stallFrames = 0;
    }
    /** 圆 vs 旋转矩形：最近点 + 法向推出 + 法向反弹 + 切向摩擦衰减 */
    collide(r) {
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
        const px = hx - Math.abs(lx), py = hy - Math.abs(ly);
        if (px < py) {
          nx = lx >= 0 ? 1 : -1;
          ny = 0;
        } else {
          nx = 0;
          ny = ly >= 0 ? 1 : -1;
        }
        dist = 0;
      } else {
        nx /= dist;
        ny /= dist;
      }
      const pen = RADIUS - dist;
      lx += nx * pen;
      ly += ny * pen;
      b.x = r.x + lx * cos - ly * sin;
      b.y = r.y + lx * sin + ly * cos;
      let lvx = b.vx * cos + b.vy * sin;
      let lvy = -b.vx * sin + b.vy * cos;
      const vn = lvx * nx + lvy * ny;
      let tvx = lvx - vn * nx, tvy = lvy - vn * ny;
      const nvn = vn < 0 ? -vn * r.restitution : vn;
      const decay = 1 - Math.min(0.35, r.friction * 0.16);
      tvx *= decay;
      tvy *= decay;
      lvx = tvx + nvn * nx;
      lvy = tvy + nvn * ny;
      b.vx = lvx * cos - lvy * sin;
      b.vy = lvx * sin + lvy * cos;
    }
    step() {
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
      if (Math.hypot(b.vx, b.vy) < 0.12 && this.elapsed > 1200) this.stallFrames++;
      else this.stallFrames = 0;
    }
    inGoal() {
      if (!this.ball) return false;
      const b = this.ball, g = this.level.goal;
      return b.x >= g.x - 6 && b.x <= g.x + g.w + 6 && b.y >= g.y && b.y <= g.y + g.h + 12;
    }
    isDead() {
      if (!this.ball) return false;
      return this.ball.y > 500 || this.elapsed > 9e3 || this.stallFrames > STALL_FRAMES;
    }
    ballPos() {
      return this.ball ? { x: this.ball.x, y: this.ball.y } : null;
    }
  };
  function toLocal(dx, dy, angle) {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    return [dx * cos + dy * sin, -dx * sin + dy * cos];
  }

  // src/storage.ts
  var K_UNLOCK = "hp_unlocked";
  var K_CLEARED = "hp_cleared";
  var K_STARS = "hp_stars";
  var MAX_LEVEL = LEVELS.length - 1;
  var store = {
    unlocked() {
      const v = platform.getStore(K_UNLOCK, 0) | 0;
      return Math.min(MAX_LEVEL, Math.max(0, v));
    },
    unlock(level) {
      if (level > this.unlocked()) platform.setStore(K_UNLOCK, Math.min(MAX_LEVEL, level));
    },
    cleared() {
      const v = platform.getStore(K_CLEARED, []);
      return Array.isArray(v) ? v : [];
    },
    stars(level) {
      const m = platform.getStore(K_STARS, {}) || {};
      return m[String(level)] || 0;
    },
    totalStars() {
      const m = platform.getStore(K_STARS, {}) || {};
      let sum = 0;
      Object.keys(m).forEach((k) => {
        sum += m[k] || 0;
      });
      return sum;
    },
    /** 星级：用 1 个部件 3 星、2 个 2 星、更多 1 星，只保留历史最好成绩 */
    markCleared(level, pieceCount) {
      const list = this.cleared();
      if (!list.includes(level)) {
        list.push(level);
        platform.setStore(K_CLEARED, list);
      }
      const stars = pieceCount <= 1 ? 3 : pieceCount <= 2 ? 2 : 1;
      const m = platform.getStore(K_STARS, {}) || {};
      const key = String(level);
      if (stars > (m[key] || 0)) {
        m[key] = stars;
        platform.setStore(K_STARS, m);
      }
      platform.setCloudScore(this.totalStars() * 100 + list.length * 100);
    }
  };

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
      grad.addColorStop(0, "#4A7C59");
      grad.addColorStop(1, "#2E5C43");
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
      c.fillStyle = "#191919";
      fillLines(c, title, 64, 104, 372, 44, 2);
      c.font = '20px "PingFang SC", "Microsoft YaHei", sans-serif';
      c.fillStyle = "#8A8A8A";
      fillLines(c, sub, 64, 206, 372, 30, 2);
      if (badge) {
        c.font = 'bold 22px "PingFang SC", "Microsoft YaHei", sans-serif';
        c.fillStyle = "#2E7D4F";
        c.fillText(badge, 64, 272);
      }
      c.font = '18px "PingFang SC", "Microsoft YaHei", sans-serif';
      c.fillStyle = "rgba(255,255,255,0.92)";
      c.textAlign = "center";
      c.fillText("\u4E00\u5B57\u4E00\u5173 \xB7 \u6C49\u5B57\u7269\u7406\u5C0F\u6E38\u620F", 250, 350);
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

  // src/scenes.ts
  var SCENE_TOP = 56;
  var SCENE_BOTTOM = 500;
  var TRAY_TOP = 505;
  var CARD_Y = 514;
  var CARD_H = 56;
  var ROW2_Y = 580;
  var ROW3_Y = 626;
  var K_GUIDE = "hp_guide_v2";
  var Game = class {
    constructor(ui2) {
      this.ui = ui2;
      this.mode = "select";
      this.phase = "edit";
      this.levelIndex = 0;
      this.stock = {};
      this.dragging = null;
      this.selectedId = -1;
      this.guideVisible = false;
      this.world = new PhysicsWorld(LEVELS[0]);
      const q = platform.getLaunchQuery();
      const layout = typeof q.layout === "string" ? q.layout : "";
      if (layout) this.openShared(layout);
      this.guideVisible = !platform.getStore(K_GUIDE, false);
    }
    get level() {
      return LEVELS[this.levelIndex];
    }
    cards() {
      const types = this.level.stock.map((s) => s.type);
      const n = Math.max(1, types.length);
      const w = Math.min(84, (DESIGN_W - 24 - (n - 1) * 8) / n);
      return types.map((type, i) => ({ type, x: 12 + i * (w + 8), y: CARD_Y, w, h: CARD_H }));
    }
    cardAt(x, y) {
      if (y < CARD_Y || y > CARD_Y + CARD_H) return null;
      const c = this.cards().find((v) => x >= v.x && x <= v.x + v.w);
      return c ? c.type : null;
    }
    resetStock() {
      this.stock = {};
      this.level.stock.forEach((s) => {
        this.stock[s.type] = s.count;
      });
    }
    openLevel(index) {
      this.levelIndex = Math.min(LEVELS.length - 1, Math.max(0, index));
      this.world = new PhysicsWorld(this.level);
      this.resetStock();
      this.phase = "edit";
      this.dragging = null;
      this.selectedId = -1;
      this.mode = "play";
    }
    /** 分享码来自外部链接，全部字段都要限幅，避免损坏/恶意链接卡死渲染 */
    openShared(code) {
      const parts = code.split("~");
      const idx = parseInt(parts[0], 10);
      this.openLevel(isFinite(idx) ? idx : 0);
      const body = (parts[1] || "").slice(0, 600);
      body.split("_").slice(0, 16).forEach((token) => {
        if (!token || token.length > 40) return;
        const [k, sx, sy, sa] = token.split(",");
        const type = byKey(k);
        if (!type) return;
        const x = Number(sx), y = Number(sy), a = Number(sa) / 100;
        if (!isFinite(x) || !isFinite(y) || !isFinite(a) || Math.abs(a) > Math.PI) return;
        if (x < -50 || x > 425 || y < 0 || y > 560) return;
        this.world.addPiece(type, x, y, a);
        if (this.stock[type] !== void 0) this.stock[type] = Math.max(0, this.stock[type] - 1);
      });
      platform.toast("\u597D\u53CB\u7684\u6446\u6CD5\u5DF2\u52A0\u8F7D\uFF0C\u70B9\u300C\u653E\u7403\u300D\u770B\u770B\u80FD\u4E0D\u80FD\u8FC7");
    }
    shareCode() {
      const body = this.world.pieces.map(
        (p) => [
          PIECES[p.type].key,
          Math.round(p.x),
          Math.round(p.y),
          Math.round(Math.atan2(Math.sin(p.angle), Math.cos(p.angle)) * 100)
        ].join(",")
      ).join("_");
      return this.levelIndex + "~" + body;
    }
    sharePayload() {
      if (this.mode === "play" && this.world.pieces.length > 0) {
        const title = `\u6211\u642D\u7684\u300C${this.level.name}\u300D\u5B57\u6865\uFF0C\u4F60\u80FD\u8BA9\u7403\u8FDB\u7B50\u5417`;
        return {
          title,
          query: "layout=" + this.shareCode(),
          imageUrl: shareImage(
            title,
            `\u7528\u4E86 ${this.world.pieces.length} \u4E2A\u6C49\u5B57\u90E8\u4EF6`,
            `\u7B2C ${this.levelIndex + 1} \u5173 \xB7 ${this.level.name}`
          )
        };
      }
      return {
        title: "\u4E00\u5B57\u4E00\u5173 \xB7 \u7528\u6C49\u5B57\u90E8\u4EF6\u642D\u4E00\u5EA7\u6865",
        query: "",
        imageUrl: shareImage("\u504F\u65C1\u5F53\u79EF\u6728\uFF0C\u628A\u7403\u9001\u8FDB\u7B50", "\u516B\u4E2A\u90E8\u4EF6\uFF0C\u4E09\u79CD\u813E\u6C14", "")
      };
    }
    /** 返回 true 表示本次触摸已被玩法消费，不再交给 UI 按钮 */
    handleTouch(x, y, phase) {
      var _a, _b, _c;
      if (this.mode !== "play" || this.phase !== "edit") return false;
      if (phase === "start") {
        const type = this.cardAt(x, y);
        if (type && ((_a = this.stock[type]) != null ? _a : 0) > 0) {
          this.dragging = { type, x, y };
          return true;
        }
        if (y > SCENE_TOP && y < SCENE_BOTTOM) {
          const id = this.world.hitPiece(x, y);
          if (id > 0) {
            this.selectedId = id;
            return true;
          }
          this.selectedId = -1;
        }
        return false;
      }
      if (phase === "move") {
        if (this.dragging) {
          this.dragging.x = x;
          this.dragging.y = y;
          return true;
        }
        return false;
      }
      if (this.dragging) {
        const d = this.dragging;
        this.dragging = null;
        if (d.y > SCENE_TOP + 8 && d.y < SCENE_BOTTOM - 8 && ((_b = this.stock[d.type]) != null ? _b : 0) > 0) {
          this.world.addPiece(d.type, d.x, d.y, PIECES[d.type].angle);
          this.stock[d.type] = ((_c = this.stock[d.type]) != null ? _c : 0) - 1;
          this.selectedId = -1;
        }
        return true;
      }
      return false;
    }
    launch() {
      if (this.world.pieces.length === 0) {
        platform.toast("\u5148\u4ECE\u4E0B\u9762\u62D6\u4E00\u4E2A\u90E8\u4EF6\u5230\u573A\u666F\u91CC");
        return;
      }
      this.selectedId = -1;
      this.dragging = null;
      this.phase = "running";
      this.world.launch();
    }
    retry() {
      this.world.resetBall();
      this.phase = "edit";
    }
    resetAll() {
      this.world.clearPieces();
      this.world.resetBall();
      this.resetStock();
      this.selectedId = -1;
      this.dragging = null;
      this.phase = "edit";
    }
    hint() {
      platform.rewardedAd((ok) => {
        if (!ok) {
          platform.toast("\u6CA1\u770B\u5B8C\uFF0C\u63D0\u793A\u6CA1\u53D1\u653E");
          return;
        }
        this.world.clearPieces();
        this.world.resetBall();
        this.resetStock();
        this.level.solution.forEach((s) => {
          this.world.addPiece(s.type, s.x, s.y, s.angle);
          if (this.stock[s.type] !== void 0) this.stock[s.type] = Math.max(0, this.stock[s.type] - 1);
        });
        this.selectedId = -1;
        this.phase = "edit";
        platform.toast("\u53C2\u8003\u5761\u6446\u597D\u4E86\uFF0C\u70B9\u300C\u653E\u7403\u300D\u770B\u6548\u679C");
      });
    }
    draw() {
      if (this.mode === "play" && this.phase === "running") {
        this.world.step();
        if (this.world.inGoal()) {
          this.phase = "won";
          store.markCleared(this.levelIndex, this.world.pieces.length);
          store.unlock(this.levelIndex + 1);
        } else if (this.world.isDead()) {
          this.phase = "lost";
        }
      }
      if (this.mode === "select") this.drawSelect();
      else this.drawPlay();
      if (this.guideVisible) this.drawGuide();
    }
    // ---------------- 选关 ----------------
    drawSelect() {
      const ui2 = this.ui;
      ui2.navBar("\u4E00\u5B57\u4E00\u5173");
      ui2.text("\u504F\u65C1\u5F53\u79EF\u6728", DESIGN_W / 2, 92, { size: 29, bold: true, align: "center" });
      ui2.text("\u628A\u7403\u9001\u8FDB\u7B50", DESIGN_W / 2, 132, { size: 29, bold: true, color: C.green, align: "center" });
      ui2.text("\u62D6\u90E8\u4EF6 \u2192 \u70B9\u9009 \u2192 \u65CB\u8F6C \u2192 \u653E\u7403", DESIGN_W / 2, 184, {
        size: 12,
        color: C.sub,
        align: "center"
      });
      const unlocked = store.unlocked();
      const cleared = store.cleared();
      LEVELS.forEach((lv, i) => {
        const y = 224 + i * 88;
        const open = i <= unlocked;
        ui2.panel(20, y, DESIGN_W - 40, 74, 10, open ? C.card : "#E2E2E2");
        ui2.text(`\u7B2C ${i + 1} \u5173 \xB7 ${lv.name}`, 34, y + 12, {
          size: 16,
          bold: true,
          color: open ? C.ink : "#9A9A9A"
        });
        ui2.text(open ? lv.desc : "\u901A\u8FC7\u4E0A\u4E00\u5173\u89E3\u9501", 34, y + 40, {
          size: 11,
          color: open ? C.sub : "#A5A5A5",
          maxWidth: 250
        });
        const stars = store.stars(i);
        const right = !open ? "\u{1F512}" : stars > 0 ? "\u2605".repeat(stars) + "\u2606".repeat(3 - stars) : cleared.includes(i) ? "\u5DF2\u901A\u5173 \u2713" : "\u5F00\u59CB \u203A";
        ui2.text(right, DESIGN_W - 34, y + 27, {
          size: 12,
          bold: true,
          color: open ? stars > 0 ? C.warn : C.green : "#9A9A9A",
          align: "right"
        });
        if (open) {
          ui2.regions.push({ x: 20, y, w: DESIGN_W - 40, h: 74, fn: () => this.openLevel(i), enabled: true });
        }
      });
      ui2.text("\u6C35 \u51AB \u5F88\u6ED1 \xB7 \u6728 \u571F \u5F88\u6DA9 \xB7 \u53E3 \u4EBB \u80FD\u6321", DESIGN_W / 2, 512, {
        size: 11,
        color: C.sub,
        align: "center"
      });
      ui2.text("\u6BCF\u4E2A\u90E8\u4EF6\u7684\u813E\u6C14\uFF0C\u5C31\u662F\u5B83\u7684\u5B57\u4E49", DESIGN_W / 2, 536, {
        size: 11,
        color: C.sub,
        align: "center"
      });
      ui2.text(
        `\u5DF2\u6536\u96C6 ${store.totalStars()} / ${LEVELS.length * 3} \u661F \xB7 \u90E8\u4EF6\u7528\u5F97\u8D8A\u5C11\u661F\u7EA7\u8D8A\u9AD8`,
        DESIGN_W / 2,
        566,
        { size: 10, color: C.warn, align: "center" }
      );
      ui2.text("\u5206\u4EAB\u6446\u6CD5\u4F1A\u628A\u5750\u6807\u7F16\u7801\u8FDB\u94FE\u63A5\uFF0C\u597D\u53CB\u4E00\u952E\u590D\u523B", DESIGN_W / 2, 606, {
        size: 10,
        color: "#B0B0B0",
        align: "center",
        maxWidth: 330
      });
    }
    drawPiece(type, x, y, angle, alpha = 1, selected = false) {
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
        size,
        color: "#FFFFFF",
        bold: true,
        align: "center"
      });
      c.restore();
    }
    // 球体绘制统一走文件底部的 drawBallLocal
    drawScene() {
      const ui2 = this.ui;
      const c = ui2.c;
      c.fillStyle = "#F7F9F7";
      c.fillRect(0, SCENE_TOP, DESIGN_W, SCENE_BOTTOM - SCENE_TOP);
      for (let gx = 0; gx <= DESIGN_W; gx += 25) ui2.line(gx, SCENE_TOP, gx, SCENE_BOTTOM, "#EDF2ED");
      for (let gy = SCENE_TOP; gy <= SCENE_BOTTOM; gy += 25) ui2.line(0, gy, DESIGN_W, gy, "#EDF2ED");
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
      ui2.text("\u8D77\u70B9", b.x, b.y - 30, { size: 10, color: C.sub, align: "center" });
      const g = this.level.goal;
      ui2.panel(g.x - 5, g.y, 10, g.h, 2, "#6FBF8F");
      ui2.panel(g.x + g.w + 5, g.y, 10, g.h, 2, "#6FBF8F");
      ui2.panel(g.x, g.y + g.h + 2, g.w + 10, 8, 2, "#6FBF8F");
      const funnels = [[g.x - 18, 0.45], [g.x + g.w + 18, -0.45]];
      funnels.forEach(([px, ang]) => {
        c.save();
        c.translate(px, g.y - 8);
        c.rotate(ang);
        roundPath(c, -14, -4, 28, 8, 3);
        c.fillStyle = "#9AD3AE";
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
      ui2.text("\u7EC8\u70B9", g.x + g.w / 2, g.y + g.h / 2 - 8, {
        size: 15,
        color: C.green,
        bold: true,
        align: "center"
      });
      this.level.pegs.forEach((p) => {
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.angle || 0);
        roundPath(c, -p.w / 2, -p.h / 2, p.w, p.h, 3);
        c.fillStyle = "#8C9A8C";
        c.fill();
        if (p.label) ui2.text(p.label, 0, -7, { size: 10, color: "#FFFFFF", align: "center" });
        c.restore();
      });
      const t = this.world.trail;
      if (t.length > 1) {
        c.beginPath();
        c.moveTo(t[0].x, t[0].y);
        for (let i = 1; i < t.length; i++) c.lineTo(t[i].x, t[i].y);
        c.strokeStyle = "rgba(232,96,76,0.35)";
        c.lineWidth = 2;
        c.stroke();
      }
      this.world.pieces.forEach((p) => this.drawPiece(p.type, p.x, p.y, p.angle, 1, p.id === this.selectedId));
      const bp = this.world.ballPos();
      if (bp) drawBallLocal(this.ui.c, bp.x, bp.y, 1);
      else if (!this.world.running) drawBallLocal(this.ui.c, b.x, b.y, 0.5);
      if (this.dragging) {
        const d = this.dragging;
        this.drawPiece(d.type, d.x, d.y, PIECES[d.type].angle, 0.55);
      }
    }
    drawTray() {
      const ui2 = this.ui;
      ui2.panel(0, TRAY_TOP, DESIGN_W, DESIGN_H - TRAY_TOP, 0, "#FFFFFF");
      ui2.line(0, TRAY_TOP, DESIGN_W, TRAY_TOP);
      this.cards().forEach((card) => {
        var _a;
        const d = PIECES[card.type];
        const left = (_a = this.stock[card.type]) != null ? _a : 0;
        ui2.panel(card.x, card.y, card.w, card.h, 8, left > 0 ? d.color : "#E2E2E2");
        ui2.text(d.glyph, card.x + card.w / 2, card.y + 6, {
          size: 24,
          bold: true,
          color: "#FFFFFF",
          align: "center"
        });
        ui2.text(`${d.label} \xD7${left}`, card.x + card.w / 2, card.y + 36, {
          size: 10,
          color: "#FFFFFF",
          align: "center"
        });
      });
      const editable = this.phase === "edit";
      const hasSel = this.selectedId > 0;
      const T = Math.PI / 12;
      ui2.button(12, ROW2_Y, 80, 38, "\u21BA -15\xB0", () => {
        if (this.selectedId > 0) this.world.rotate(this.selectedId, -T);
      }, "plain", editable && hasSel, 12);
      ui2.button(98, ROW2_Y, 80, 38, "\u21BB +15\xB0", () => {
        if (this.selectedId > 0) this.world.rotate(this.selectedId, T);
      }, "plain", editable && hasSel, 12);
      ui2.button(184, ROW2_Y, 179, 38, editable ? "\u653E \u7403" : "\u91CD \u8BD5", () => {
        if (editable) this.launch();
        else this.retry();
      }, "primary", true, 15);
      const w = 82;
      ui2.button(12, ROW3_Y, w, 32, "\u2715 \u6536\u56DE", () => {
        var _a;
        if (this.selectedId <= 0) return;
        const p = this.world.pieces.find((v) => v.id === this.selectedId);
        if (!p) return;
        this.world.remove(p.id);
        this.stock[p.type] = ((_a = this.stock[p.type]) != null ? _a : 0) + 1;
        this.selectedId = -1;
      }, "ghost", editable && hasSel, 12);
      ui2.button(100, ROW3_Y, w, 32, "\u91CD\u7F6E", () => this.resetAll(), "ghost", true, 12);
      ui2.button(188, ROW3_Y, w, 32, "\u770B\u63D0\u793A", () => this.hint(), "ghost", editable, 12);
      ui2.button(276, ROW3_Y, w, 32, "\u5206\u4EAB", () => {
        if (this.world.pieces.length === 0) {
          platform.toast("\u5148\u6446\u51E0\u4E2A\u90E8\u4EF6\u518D\u5206\u4EAB");
          return;
        }
        platform.share(this.sharePayload());
      }, "ghost", true, 12);
    }
    drawOverlay() {
      const ui2 = this.ui;
      if (this.phase !== "won" && this.phase !== "lost") return;
      const won = this.phase === "won";
      const h = 214;
      const y = (DESIGN_H - h) / 2;
      ui2.dim();
      ui2.regions.push({ x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, fn: () => {
      }, enabled: true });
      ui2.panel(24, y, DESIGN_W - 48, h, 14, C.card);
      ui2.text(won ? "\u221A  \u8FDB\u7B50\u4E86" : "\xD7  \u6CA1\u8FDB\u7B50", DESIGN_W / 2, y + 22, {
        size: 22,
        bold: true,
        color: won ? C.green : C.red,
        align: "center"
      });
      const stars = won ? store.stars(this.levelIndex) : 0;
      ui2.text(
        won ? `${"\u2605".repeat(stars)}${"\u2606".repeat(3 - stars)}  ${this.world.pieces.length} \u4E2A\u90E8\u4EF6 \xB7 ${(this.world.elapsed / 1e3).toFixed(1)} \u79D2` : "\u7403\u6CA1\u843D\u5230\u7B50\u91CC\uFF0C\u6362\u4E2A\u89D2\u5EA6\u6216\u52A0\u4E00\u5757\u6321\u677F",
        DESIGN_W / 2,
        y + 58,
        { size: 12, color: won ? C.warn : C.sub, align: "center", maxWidth: 290 }
      );
      const last = this.levelIndex >= LEVELS.length - 1;
      ui2.button(
        40,
        y + 92,
        DESIGN_W - 80,
        40,
        won ? last ? "\u518D\u6765\u4E00\u6B21" : "\u4E0B\u4E00\u5173" : "\u518D\u8BD5\u4E00\u6B21",
        () => {
          if (won && !last) this.openLevel(this.levelIndex + 1);
          else this.retry();
        }
      );
      ui2.button(
        40,
        y + 142,
        (DESIGN_W - 88) / 2,
        38,
        "\u770B\u63D0\u793A",
        () => {
          this.retry();
          this.hint();
        },
        "ghost",
        true,
        13
      );
      ui2.button(
        40 + (DESIGN_W - 88) / 2 + 8,
        y + 142,
        (DESIGN_W - 88) / 2,
        38,
        "\u5206\u4EAB\u6446\u6CD5",
        () => platform.share(this.sharePayload()),
        "plain",
        true,
        13
      );
    }
    drawPlay() {
      const ui2 = this.ui;
      ui2.navBar(`\u7B2C ${this.levelIndex + 1} \u5173 \xB7 ${this.level.name}`, () => {
        this.mode = "select";
      });
      ui2.text(this.level.hint, DESIGN_W / 2, 46, { size: 10, color: C.sub, align: "center" });
      this.drawScene();
      let tip = "\u4ECE\u4E0B\u9762\u62D6\u90E8\u4EF6\u5230\u573A\u666F\u91CC\uFF0C\u70B9\u4E00\u4E0B\u53EF\u9009\u4E2D";
      if (this.dragging) {
        const d = PIECES[this.dragging.type];
        tip = `${d.label} \xB7 ${d.desc}`;
      } else if (this.selectedId > 0) {
        tip = "\u5DF2\u9009\u4E2D \xB7 \u7528 \u21BA\u21BB \u8C03\u89D2\u5EA6\uFF0C\u7B2C\u4E09\u884C\u53EF\u6536\u56DE";
      }
      ui2.text(tip, DESIGN_W / 2, 480, { size: 10, color: "#9AA79A", align: "center" });
      this.drawTray();
      this.drawOverlay();
    }
    // ---------------- 首次引导 ----------------
    drawGuide() {
      const ui2 = this.ui;
      ui2.dim();
      ui2.regions.push({ x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, fn: () => {
      }, enabled: true });
      ui2.panel(28, 168, DESIGN_W - 56, 320, 16, C.card);
      ui2.text("\u600E\u4E48\u73A9", DESIGN_W / 2, 188, { size: 22, bold: true, align: "center" });
      const tips = [
        "\u2460 \u4ECE\u4E0B\u9762\u628A\u6C49\u5B57\u90E8\u4EF6\u62D6\u5230\u573A\u666F\u91CC",
        "\u2461 \u70B9\u4E00\u4E0B\u9009\u4E2D\uFF0C\u7528 \u21BA\u21BB \u6BCF\u6B21\u8F6C 15\xB0",
        "\u2462 \u90E8\u4EF6\u6709\u813E\u6C14\uFF1A\u6C35\u51AB\u5F88\u6ED1\u3001\u6728\u571F\u5F88\u6DA9\u3001\u53E3\u4EBB\u80FD\u6321",
        "\u2463 \u70B9\u300C\u653E\u7403\u300D\uFF0C\u8BA9\u7403\u843D\u8FDB\u7EFF\u7B50\u5C31\u7B97\u8FC7\u5173"
      ];
      tips.forEach((t, i) => {
        ui2.text(t, 48, 234 + i * 44, { size: 12, color: C.sub, maxWidth: 278, lineHeight: 17 });
      });
      ui2.text("\u7528\u5F97\u8D8A\u5C11\uFF0C\u661F\u7EA7\u8D8A\u9AD8", DESIGN_W / 2, 414, {
        size: 11,
        color: C.warn,
        align: "center"
      });
      ui2.button(48, 440, DESIGN_W - 96, 42, "\u5F00\u59CB", () => {
        this.guideVisible = false;
        platform.setStore(K_GUIDE, true);
      });
    }
  };
  function drawBallLocal(c, x, y, alpha) {
    c.save();
    c.globalAlpha = alpha;
    c.beginPath();
    c.arc(x, y, 9, 0, Math.PI * 2);
    c.fillStyle = "#E8604C";
    c.fill();
    c.strokeStyle = "#B84232";
    c.lineWidth = 1;
    c.stroke();
    c.beginPath();
    c.arc(x - 3, y - 3, 3, 0, Math.PI * 2);
    c.fillStyle = "rgba(255,255,255,0.75)";
    c.fill();
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
