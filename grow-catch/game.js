"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));

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
      this.toast("\u9884\u89C8\u6A21\u5F0F\uFF1A\u5DF2\u590D\u5236\u6C42\u52A9\u94FE\u63A5\n" + url);
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

  // src/logic.ts
  var SPEEDS = [
    { id: "slow", label: "\u6162", vy: 1.5, auto: false },
    { id: "normal", label: "\u5E38", vy: 2.3, auto: false },
    { id: "auto", label: "\u81EA\u52A8", vy: 1.5, auto: true }
  ];
  var DEFAULT_SPEED = 0;
  var TOTAL_STAGES = 8;
  var LINES = [
    {
      id: "plant",
      name: "\u751F\u957F",
      stages: [
        { key: "drop", label: "\u6C34\u6EF4", color: "#6FB7E8" },
        { key: "seed", label: "\u79CD\u5B50", color: "#B98A5E" },
        { key: "sprout", label: "\u5AE9\u82BD", color: "#8FCB6B" },
        { key: "leaves", label: "\u53CC\u53F6", color: "#5FB97A" },
        { key: "bud", label: "\u82B1\u82DE", color: "#E8A0B8" },
        { key: "flower", label: "\u5F00\u82B1", color: "#F07A9C" },
        { key: "fruit", label: "\u679C\u5B9E", color: "#E8604C" },
        { key: "spark", label: "\u5149\u70B9", color: "#F5C451" }
      ]
    },
    {
      id: "weather",
      name: "\u5929\u6C14",
      stages: [
        { key: "cloud", label: "\u4E91", color: "#B9C9D6" },
        { key: "rain", label: "\u96E8", color: "#6FB7E8" },
        { key: "puddle", label: "\u6C34\u6D3C", color: "#7FC4D8" },
        { key: "wave", label: "\u6CE2\u7EB9", color: "#4FA8C8" },
        { key: "fish", label: "\u5C0F\u9C7C", color: "#E8A04C" },
        { key: "bubble", label: "\u6C14\u6CE1", color: "#A8DCEC" },
        { key: "shell", label: "\u8D1D\u58F3", color: "#E8B8A0" },
        { key: "star", label: "\u661F\u5149", color: "#F5D96A" }
      ]
    }
  ];
  function initialProgress(line = 0) {
    const l = LINES[clampInt(line, 0, LINES.length - 1)];
    return { line: LINES.indexOf(l), stage: 0, round: 0, seen: [l.stages[0].key] };
  }
  function stageOf(p) {
    const l = LINES[clampInt(p.line, 0, LINES.length - 1)];
    return l.stages[clampInt(p.stage, 0, l.stages.length - 1)];
  }
  function advance(p) {
    const l = LINES[clampInt(p.line, 0, LINES.length - 1)];
    const next = p.stage + 1;
    const wrap = next >= l.stages.length;
    const stage = wrap ? 0 : next;
    const round = Math.min(9999, p.round + (wrap ? 1 : 0));
    const key = l.stages[stage].key;
    const seen = p.seen.includes(key) ? p.seen.slice() : p.seen.concat(key);
    return { line: p.line, stage, round, seen };
  }
  function onMiss(p) {
    return p;
  }
  function caught(ballX, ballY, radius, trayX, trayY, trayW, trayH) {
    const bottom = ballY + radius;
    const top = trayY - trayH / 2;
    return bottom >= top && bottom <= top + 18 && Math.abs(ballX - trayX) <= trayW / 2 + 10;
  }
  function encodeShare(p) {
    return [p.line, p.stage, p.round].join("~");
  }
  function decodeShare(raw) {
    if (typeof raw !== "string" || raw.length > 40) return null;
    const parts = raw.split("~");
    if (parts.length !== 3) return null;
    const [a, b, c] = parts.map((v) => Number(v));
    if (!Number.isInteger(a) || !Number.isInteger(b) || !Number.isInteger(c)) return null;
    if (a < 0 || a >= LINES.length || b < 0 || b >= TOTAL_STAGES || c < 0 || c > 9999) return null;
    const l = LINES[a];
    return { line: a, stage: b, round: c, seen: l.stages.slice(0, b + 1).map((s) => s.key) };
  }
  function clampInt(v, lo, hi) {
    return Math.max(lo, Math.min(hi, Math.round(v)));
  }
  function allStageKeys() {
    const keys = [];
    LINES.forEach((l) => l.stages.forEach((s) => keys.push(s.key)));
    return keys;
  }

  // src/art.ts
  function circ(c, x, y, r, fill) {
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fillStyle = fill;
    c.fill();
  }
  function ell(c, x, y, rx, ry, fill, rot = 0) {
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    c.scale(rx / ry, 1);
    c.beginPath();
    c.arc(0, 0, ry, 0, Math.PI * 2);
    c.fillStyle = fill;
    c.fill();
    c.restore();
  }
  function seg(c, x1, y1, x2, y2, color, w = 3) {
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.strokeStyle = color;
    c.lineWidth = w;
    c.lineCap = "round";
    c.stroke();
  }
  function stem(c, K, from = 24, to = -4) {
    seg(c, 0, from, 0, to, K("#5FA86B"), 3);
  }
  function drawStage(c, key, x, y, size, t = 0, dim = false) {
    const K = (v) => dim ? "#BCC7BA" : v;
    c.save();
    c.translate(x, y);
    const k = Math.max(0.1, size / 26);
    c.scale(k, k);
    if (dim) c.globalAlpha = 0.5;
    const spin = key === "spark" || key === "star" ? t / 1400 : Math.sin(t / 700) * 0.06;
    c.rotate(spin);
    switch (key) {
      case "drop": {
        circ(c, 0, 6, 17, K("#6FB7E8"));
        c.beginPath();
        c.moveTo(-11, -3);
        c.lineTo(0, -26);
        c.lineTo(11, -3);
        c.closePath();
        c.fillStyle = K("#6FB7E8");
        c.fill();
        circ(c, -6, 2, 4, "rgba(255,255,255,0.55)");
        break;
      }
      case "seed": {
        ell(c, 0, 0, 13, 18, K("#B98A5E"), 0.3);
        c.beginPath();
        c.moveTo(-4, -11);
        c.quadraticCurveTo(4, 0, -3, 12);
        c.strokeStyle = K("#8A6242");
        c.lineWidth = 2;
        c.stroke();
        circ(c, 5, -7, 2.5, "rgba(255,255,255,0.45)");
        break;
      }
      case "sprout": {
        stem(c, K, 24, -3);
        ell(c, -10, -6, 9, 5, K("#8FCB6B"), -0.6);
        ell(c, 10, -11, 9, 5, K("#6FBE72"), 0.6);
        break;
      }
      case "leaves": {
        stem(c, K, 24, -15);
        ell(c, -13, -5, 12, 7, K("#5FB97A"), -0.7);
        ell(c, 13, -12, 12, 7, K("#8FCB6B"), 0.7);
        break;
      }
      case "bud": {
        stem(c, K, 24, 2);
        ell(c, 0, -8, 9, 13, K("#E8A0B8"));
        ell(c, 0, 3, 11, 5, K("#7FC48A"));
        circ(c, -3, -12, 2.5, "rgba(255,255,255,0.5)");
        break;
      }
      case "flower": {
        stem(c, K, 24, 6);
        for (let i = 0; i < 5; i++) {
          const a = i / 5 * Math.PI * 2;
          ell(c, Math.cos(a) * 11, Math.sin(a) * 11 - 6, 7, 10, K("#F07A9C"), a + Math.PI / 2);
        }
        circ(c, 0, -6, 6, K("#F5C451"));
        break;
      }
      case "fruit": {
        stem(c, K, 24, -3);
        circ(c, 0, 5, 15, K("#E8604C"));
        ell(c, 8, -12, 8, 4, K("#5FB97A"), -0.5);
        circ(c, -5, 0, 3, "rgba(255,255,255,0.45)");
        break;
      }
      case "spark": {
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * Math.PI * 2;
          seg(
            c,
            Math.cos(a) * 12,
            Math.sin(a) * 12,
            Math.cos(a) * 23,
            Math.sin(a) * 23,
            K("#F5C451"),
            2.5
          );
        }
        circ(c, 0, 0, 10, K("#F5C451"));
        circ(c, -3, -3, 3.5, "rgba(255,255,255,0.7)");
        break;
      }
      case "cloud": {
        circ(c, -12, 3, 12, K("#B9C9D6"));
        circ(c, 0, -6, 16, K("#CFDCE5"));
        circ(c, 14, 4, 11, K("#B9C9D6"));
        ell(c, 0, 9, 24, 8, K("#CFDCE5"));
        break;
      }
      case "rain": {
        circ(c, -8, -12, 10, K("#B9C9D6"));
        circ(c, 5, -16, 13, K("#CFDCE5"));
        ell(c, 0, -5, 20, 6, K("#CFDCE5"));
        for (let i = -1; i <= 1; i++) {
          const x0 = i * 11;
          seg(c, x0, 3, x0 - 3, 17, K("#6FB7E8"), 3);
          circ(c, x0 - 3, 19, 2.5, K("#6FB7E8"));
        }
        break;
      }
      case "puddle": {
        ell(c, 0, 8, 24, 9, K("#7FC4D8"));
        ell(c, -6, 5, 9, 2.5, "rgba(255,255,255,0.6)");
        ell(c, 9, 11, 5, 1.8, "rgba(255,255,255,0.45)");
        break;
      }
      case "wave": {
        for (let j = 0; j < 3; j++) {
          const y0 = -8 + j * 10;
          c.beginPath();
          c.moveTo(-24, y0);
          c.quadraticCurveTo(-12, y0 - 8, 0, y0);
          c.quadraticCurveTo(12, y0 + 8, 24, y0);
          c.strokeStyle = K("#4FA8C8");
          c.lineWidth = 3;
          c.lineCap = "round";
          c.stroke();
        }
        break;
      }
      case "fish": {
        ell(c, 2, 0, 16, 10, K("#E8A04C"));
        c.beginPath();
        c.moveTo(-12, 0);
        c.lineTo(-25, -10);
        c.lineTo(-25, 10);
        c.closePath();
        c.fillStyle = K("#E8A04C");
        c.fill();
        circ(c, 10, -3, 2.5, K("#5A4632"));
        ell(c, -1, -8, 6, 3, K("#F2B56A"), -0.4);
        break;
      }
      case "bubble": {
        circ(c, -9, 7, 9, K("rgba(168,220,236,0.75)"));
        circ(c, 6, -5, 13, K("rgba(168,220,236,0.75)"));
        circ(c, 15, 11, 6, K("rgba(168,220,236,0.75)"));
        circ(c, 2, -9, 3, "rgba(255,255,255,0.85)");
        circ(c, -12, 4, 2.2, "rgba(255,255,255,0.8)");
        break;
      }
      case "shell": {
        c.beginPath();
        c.arc(0, 8, 20, Math.PI, 0);
        c.closePath();
        c.fillStyle = K("#E8B8A0");
        c.fill();
        for (let i = 1; i < 5; i++) {
          const a = Math.PI + i / 5 * Math.PI;
          seg(c, 0, 8, Math.cos(a) * 20, 8 + Math.sin(a) * 20, K("#C99378"), 2);
        }
        circ(c, 0, 8, 3, K("#C99378"));
        break;
      }
      case "star": {
        c.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + i / 10 * Math.PI * 2;
          const r = i % 2 === 0 ? 22 : 9;
          const px = Math.cos(a) * r, py = Math.sin(a) * r;
          if (i === 0) c.moveTo(px, py);
          else c.lineTo(px, py);
        }
        c.closePath();
        c.fillStyle = K("#F5D96A");
        c.fill();
        break;
      }
      default: {
        circ(c, 0, 0, 16, K("#BCC7BA"));
      }
    }
    c.restore();
  }
  function drawBurst(c, x, y, color, progress) {
    const p = Math.max(0, Math.min(1, progress));
    c.save();
    c.globalAlpha = 1 - p;
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      const r = 14 + p * 34;
      circ(c, x + Math.cos(a) * r, y + Math.sin(a) * r, 3.5 * (1 - p) + 1, color);
    }
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
      c.fillText("\u63A5\u4F4F\u5B83 \xB7 \u4E07\u7269\u751F\u957F", 250, 350);
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
  var K_PROGRESS = "gc_progress";
  var K_BEST = "gc_best";
  var K_SPEED = "gc_speed";
  var K_LINE = "gc_line_unlocked";
  var K_GUIDE = "gc_guide_v1";
  function valid(p) {
    return !!p && typeof p === "object" && Number.isInteger(p.line) && Number.isInteger(p.stage) && Number.isInteger(p.round) && Array.isArray(p.seen);
  }
  var store = {
    /** 损坏/旧版存档一律回退到干净起点，不让界面崩 */
    progress() {
      const p = platform.getStore(K_PROGRESS, null);
      if (!valid(p) || p.line < 0 || p.line >= LINES.length || p.stage < 0 || p.stage >= LINES[p.line].stages.length) {
        return initialProgress(0);
      }
      return p;
    },
    save(p) {
      platform.setStore(K_PROGRESS, p);
      if (p.round > this.bestRound()) platform.setStore(K_BEST, p.round);
      platform.setCloudScore(this.bestRound() * 100 + p.seen.length);
    },
    bestRound() {
      return platform.getStore(K_BEST, 0) | 0;
    },
    speedIdx() {
      const v = platform.getStore(K_SPEED, DEFAULT_SPEED) | 0;
      return Math.max(0, Math.min(SPEEDS.length - 1, v));
    },
    setSpeed(i) {
      platform.setStore(K_SPEED, Math.max(0, Math.min(SPEEDS.length - 1, i)));
    },
    lineUnlocked() {
      return !!platform.getStore(K_LINE, false);
    },
    unlockLine() {
      platform.setStore(K_LINE, true);
    },
    guideSeen() {
      return !!platform.getStore(K_GUIDE, false);
    },
    markGuide() {
      platform.setStore(K_GUIDE, true);
    }
  };

  // src/scenes.ts
  var TRAY_Y = 470;
  var TRAY_W = 110;
  var TRAY_H = 16;
  var BALL_R = 22;
  var SCENE_TOP = 96;
  var SCENE_BOTTOM = 505;
  var CELEBRATE_FRAMES = 28;
  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }
  var Game = class {
    constructor(ui2) {
      this.ui = ui2;
      this.mode = "title";
      this.progress = store.progress();
      this.speedIdx = store.speedIdx();
      this.ball = { x: DESIGN_W / 2, y: 110 };
      this.trayX = DESIGN_W / 2;
      this.celebrate = 0;
      this.burst = 0;
      this.guideVisible = false;
      this.albumLine = 0;
      this.t = 0;
      const q = platform.getLaunchQuery();
      if (typeof q.grow === "string") {
        const p = decodeShare(q.grow);
        if (p) {
          this.progress = p;
          store.save(p);
          this.mode = "play";
          this.albumLine = p.line;
          platform.toast("\u597D\u53CB\u517B\u5230\u7684\u8FD9\u4E00\u53D8\uFF0C\u63A5\u7740\u517B");
        }
      }
      this.speedIdx = store.speedIdx();
      this.guideVisible = !store.guideSeen();
      this.spawn();
    }
    spawn() {
      this.ball.x = 65 + Math.random() * 245;
      this.ball.y = 140;
      this.celebrate = 0;
      this.burst = 0;
      this.trayX = clamp(this.trayX, 65, DESIGN_W - 65);
    }
    sharePayload() {
      const st = stageOf(this.progress);
      const title = `\u6211\u517B\u5230\u300C${st.label}\u300D\u4E86\uFF0C\u4F60\u4E5F\u6765\u63A5\u4E00\u6B21`;
      return {
        title,
        query: "grow=" + encodeShare(this.progress),
        imageUrl: shareImage(
          title,
          "\u6CA1\u6709\u5012\u8BA1\u65F6\uFF0C\u63A5\u4E0D\u4F4F\u4E5F\u6CA1\u5173\u7CFB",
          `\u7B2C ${this.progress.stage + 1} \u53D8 \xB7 \u7B2C ${this.progress.round} \u8F6E`
        )
      };
    }
    /** 返回 true 表示触摸已被场景消费；end 一律放行给按钮热区 */
    handleTouch(x, y, phase) {
      if (this.mode !== "play") return false;
      if (phase === "end") return false;
      const sp = SPEEDS[clamp(this.speedIdx, 0, SPEEDS.length - 1)];
      if (sp.auto) return true;
      if (y < SCENE_BOTTOM) {
        this.trayX = clamp(x, 65, DESIGN_W - 65);
        return true;
      }
      return false;
    }
    /** 每帧推进：只有位置在变，没有任何倒计时或失败状态 */
    tick() {
      this.t += 16;
      if (this.mode !== "play") return;
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
        this.progress = onMiss(this.progress);
        this.spawn();
      }
    }
    setSpeed(i) {
      this.speedIdx = clamp(i, 0, SPEEDS.length - 1);
      store.setSpeed(this.speedIdx);
      this.spawn();
    }
    applyLine(i) {
      const key = LINES[i].stages[0].key;
      const seen = this.progress.seen.includes(key) ? this.progress.seen.slice() : this.progress.seen.concat(key);
      this.progress = { line: i, stage: 0, round: this.progress.round, seen };
      store.save(this.progress);
      this.albumLine = i;
      this.spawn();
      platform.toast("\u6362\u4E86\u4E00\u6761\u53D8\u5316\u8DEF\u7EBF");
    }
    switchLine() {
      if (!store.lineUnlocked()) {
        platform.rewardedAd((ok) => {
          if (!ok) {
            platform.toast("\u6CA1\u770B\u5B8C\uFF0C\u8DEF\u7EBF\u6CA1\u6362");
            return;
          }
          store.unlockLine();
          this.applyLine(1);
        });
      } else {
        this.applyLine(this.progress.line === 0 ? 1 : 0);
      }
    }
    draw() {
      this.tick();
      if (this.mode === "title") this.drawTitle();
      else if (this.mode === "album") this.drawAlbum();
      else this.drawPlay();
      if (this.guideVisible) this.drawGuide();
    }
    /** 8 个进度点 + 轮数点，全程不用文字说明进度 */
    drawDots(y) {
      const c = this.ui.c;
      const line = LINES[this.progress.line];
      const x0 = DESIGN_W / 2 - (TOTAL_STAGES - 1) * 32 / 2;
      for (let i = 0; i < TOTAL_STAGES; i++) {
        const cx = x0 + i * 32;
        const cur = i === this.progress.stage;
        c.beginPath();
        c.arc(cx, y, cur ? 8 : 5.5, 0, Math.PI * 2);
        c.fillStyle = cur ? line.stages[i].color : i < this.progress.stage ? "#BFD9C4" : "#DDE5DA";
        c.fill();
      }
      const rounds = Math.min(5, this.progress.round);
      for (let i = 0; i < rounds; i++) {
        c.beginPath();
        c.arc(DESIGN_W / 2 - (rounds - 1) * 5 + i * 10, y + 20, 3, 0, Math.PI * 2);
        c.fillStyle = "#7FC48A";
        c.fill();
      }
    }
    drawTrayShape() {
      const c = this.ui.c;
      c.save();
      roundPath(c, this.trayX - TRAY_W / 2, TRAY_Y - TRAY_H / 2, TRAY_W, TRAY_H, 8);
      c.fillStyle = "#B98A5E";
      c.fill();
      c.fillStyle = "#D8B389";
      roundPath(c, this.trayX - TRAY_W / 2 + 6, TRAY_Y - TRAY_H / 2 + 2, TRAY_W - 12, 4, 2);
      c.fill();
      c.restore();
    }
    // ---------------- 首页 ----------------
    drawTitle() {
      const ui2 = this.ui;
      ui2.navBar("\u63A5\u4F4F\u5B83 \xB7 \u4E07\u7269\u751F\u957F");
      ui2.text("\u63A5\u4F4F\u5B83", DESIGN_W / 2, 96, { size: 34, bold: true, align: "center" });
      ui2.text("\u4E07\u7269\u751F\u957F", DESIGN_W / 2, 146, {
        size: 26,
        bold: true,
        color: C.green,
        align: "center"
      });
      const st = stageOf(this.progress);
      drawStage(ui2.c, st.key, DESIGN_W / 2, 250, 64, this.t);
      this.drawDots(330);
      ui2.button(20, 386, DESIGN_W - 40, 48, "\u5F00 \u59CB", () => {
        this.mode = "play";
      });
      ui2.button(20, 448, 162, 44, "\u56FE \u9274", () => {
        this.mode = "album";
      }, "ghost");
      ui2.button(193, 448, 162, 44, "\u9001 \u597D \u53CB", () => platform.share(this.sharePayload()), "ghost");
      ui2.text("\u6CA1\u6709\u5012\u8BA1\u65F6 \xB7 \u63A5\u4E0D\u4F4F\u4E5F\u6CA1\u5173\u7CFB", DESIGN_W / 2, 518, {
        size: 15,
        color: C.greenDark,
        align: "center"
      });
      ui2.text("\u70B9\u5C4F\u5E55\u4EFB\u610F\u5904\uFF0C\u76D8\u5B50\u5C31\u8FC7\u53BB", DESIGN_W / 2, 548, {
        size: 13,
        color: C.sub,
        align: "center"
      });
      ui2.text(
        `\u5DF2\u517B ${this.progress.round} \u8F6E \xB7 \u5DF2\u89C1 ${this.progress.seen.length} / ${allStageKeys().length} \u53D8`,
        DESIGN_W / 2,
        590,
        { size: 12, color: C.sub, align: "center" }
      );
      ui2.text("\u6162\u901F\u6863\u662F\u9ED8\u8BA4\u7684\uFF0C\u4E5F\u53EF\u4EE5\u9009\u300C\u81EA\u52A8\u300D\u770B\u7740\u5B83\u957F", DESIGN_W / 2, 620, {
        size: 11,
        color: "#A0A8A0",
        align: "center",
        maxWidth: 330
      });
    }
    // ---------------- 主玩法 ----------------
    drawPlay() {
      const ui2 = this.ui;
      const c = ui2.c;
      const st = stageOf(this.progress);
      const line = LINES[this.progress.line];
      ui2.navBar("\u63A5\u4F4F\u5B83", () => {
        this.mode = "title";
      });
      c.fillStyle = "#F4F9F1";
      c.fillRect(0, SCENE_TOP, DESIGN_W, SCENE_BOTTOM - SCENE_TOP);
      for (let i = 1; i <= 4; i++) {
        const y = SCENE_TOP + i * 80;
        c.save();
        c.setLineDash([3, 7]);
        ui2.line(20, y, DESIGN_W - 20, y, "#E0EADF");
        c.restore();
      }
      this.drawDots(66);
      ui2.text(`${line.name} \xB7 ${st.label}`, DESIGN_W / 2, 96, {
        size: 16,
        bold: true,
        color: st.color,
        align: "center"
      });
      const showSize = this.celebrate > 0 ? 26 + Math.sin(this.burst * Math.PI) * 16 : 26;
      drawStage(c, st.key, this.ball.x, this.ball.y, showSize, this.t);
      if (this.celebrate > 0) drawBurst(c, this.ball.x, TRAY_Y - 8, st.color, this.burst);
      this.drawTrayShape();
      ui2.panel(0, SCENE_BOTTOM, DESIGN_W, DESIGN_H - SCENE_BOTTOM, 0, "#FFFFFF");
      ui2.line(0, SCENE_BOTTOM, DESIGN_W, SCENE_BOTTOM);
      SPEEDS.forEach((sp, i) => {
        ui2.button(
          12 + i * 84,
          518,
          76,
          46,
          sp.label,
          () => this.setSpeed(i),
          i === this.speedIdx ? "primary" : "ghost",
          true,
          15
        );
      });
      ui2.button(264, 518, 99, 46, "\u6362", () => this.switchLine(), "plain", true, 15);
      for (let i = 0; i < 2; i++) {
        c.beginPath();
        c.arc(322 + i * 14, 541, 4, 0, Math.PI * 2);
        c.fillStyle = i === 0 ? LINES[0].stages[0].color : store.lineUnlocked() ? LINES[1].stages[0].color : "#D8DED8";
        c.fill();
      }
      ui2.button(12, 574, 110, 46, "\u9001", () => platform.share(this.sharePayload()), "ghost", true, 15);
      ui2.button(130, 574, 110, 46, "\u56FE \u9274", () => {
        this.mode = "album";
      }, "ghost", true, 15);
      ui2.button(248, 574, 115, 46, "\u4ECE\u5934\u770B", () => {
        this.progress = __spreadProps(__spreadValues({}, initialProgress(this.progress.line)), {
          round: this.progress.round,
          seen: this.progress.seen
        });
        store.save(this.progress);
        this.spawn();
      }, "ghost", true, 15);
      ui2.text("\u6389\u4E86\u4E5F\u6CA1\u5173\u7CFB\uFF0C\u4F1A\u91CD\u65B0\u843D\u4E0B\u6765", DESIGN_W / 2, 630, {
        size: 13,
        color: C.greenDark,
        align: "center"
      });
      ui2.text(`\u7B2C ${this.progress.stage + 1} \u53D8 \xB7 \u7B2C ${this.progress.round} \u8F6E`, DESIGN_W / 2, 650, {
        size: 11,
        color: C.sub,
        align: "center"
      });
    }
    // ---------------- 图鉴 ----------------
    drawAlbum() {
      const ui2 = this.ui;
      const c = ui2.c;
      ui2.navBar("\u56FE\u9274", () => {
        this.mode = "title";
      });
      if (store.lineUnlocked()) {
        ui2.button(
          20,
          58,
          160,
          36,
          "\u2460",
          () => {
            this.albumLine = 0;
          },
          this.albumLine === 0 ? "primary" : "ghost"
        );
        ui2.button(
          195,
          58,
          160,
          36,
          "\u2461",
          () => {
            this.albumLine = 1;
          },
          this.albumLine === 1 ? "primary" : "ghost"
        );
      }
      const line = LINES[this.albumLine];
      line.stages.forEach((s, i) => {
        const col = i % 4, row = Math.floor(i / 4);
        const x = 12 + col * 88, y = 116 + row * 130;
        ui2.panel(x, y, 82, 115, 10, "#FFFFFF");
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
      ui2.text(`\u5DF2\u89C1 ${seenCount} / ${allStageKeys().length} \u53D8`, DESIGN_W / 2, 396, {
        size: 17,
        bold: true,
        color: C.greenDark,
        align: "center"
      });
      ui2.text("\u63A5\u4F4F\u4E00\u6B21\uFF0C\u5C31\u591A\u8BA4\u8BC6\u4E00\u4E2A", DESIGN_W / 2, 428, {
        size: 13,
        color: C.sub,
        align: "center"
      });
      ui2.button(20, 480, DESIGN_W - 40, 46, "\u56DE\u53BB\u63A5\u7740\u63A5", () => {
        this.mode = "play";
      });
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
        "\u2460 \u70B9\u5C4F\u5E55\u4EFB\u610F\u5904\uFF0C\u76D8\u5B50\u5C31\u79FB\u8FC7\u53BB",
        "\u2461 \u63A5\u4F4F\u4E00\u6B21\uFF0C\u5B83\u5C31\u957F\u5927\u4E00\u70B9",
        "\u2462 \u6389\u4E86\u4E5F\u6CA1\u5173\u7CFB\uFF0C\u4F1A\u91CD\u65B0\u843D\u4E0B\u6765"
      ];
      tips.forEach((t, i) => {
        ui2.text(t, 48, 238 + i * 44, {
          size: 13,
          color: C.ink,
          maxWidth: 278,
          lineHeight: 18
        });
      });
      ui2.text("\u6CA1\u6709\u5012\u8BA1\u65F6\uFF0C\u4E0D\u7528\u7740\u6025", DESIGN_W / 2, 392, {
        size: 14,
        bold: true,
        color: C.greenDark,
        align: "center"
      });
      ui2.text("\u4E0D\u60F3\u52A8\u624B\uFF1F\u4E0B\u9762\u9009\u300C\u81EA\u52A8\u300D\u5C31\u597D", DESIGN_W / 2, 418, {
        size: 12,
        color: C.sub,
        align: "center"
      });
      ui2.button(48, 440, DESIGN_W - 96, 42, "\u5F00\u59CB", () => {
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
