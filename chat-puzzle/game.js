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

  // src/questions.ts
  var GROUPS = [
    { name: "\u76F8\u4EB2\u76F8\u7231\u4E00\u5BB6\u4EBA", scene: "\u76F8\u4EB2\u76F8\u7231\u4E00\u5BB6\u4EBA (12)", desc: "\u517B\u751F\u3001\u50AC\u5A5A\u3001\u7EA2\u5305\u4E0E\u5929\u6C14\u9884\u62A5" },
    { name: "\u6478\u9C7C\u540C\u4E8B\u7FA4", scene: "\u9879\u76EE\u653B\u575A\u7FA4 (8)", desc: "\u52A0\u73ED\u3001\u62A5\u9500\u4E0E\u4E34\u65F6\u9700\u6C42" },
    { name: "\u56DB\u5E74\u4E8C\u73ED", scene: "\u56DB\u5E74\u4E8C\u73ED (38)", desc: "\u805A\u9910\u3001\u62FC\u5355\u4E0E\u6DF1\u591C\u5F00\u9ED1" }
  ];
  var QUESTIONS = [
    // ---------- 组 0：相亲相爱一家人 ----------
    {
      id: "f1",
      group: 0,
      groupName: GROUPS[0].name,
      scene: GROUPS[0].scene,
      messages: [
        { name: "\u4E09\u59E8", text: "\u3010\u7A7A\u8179\u5403\u8FD93\u6837\u7B49\u4E8E\u6162\u6027\u81EA\u6740\uFF01\u3011" },
        { name: "\u4E09\u59E8", text: "\u90FD\u770B\u770B\uFF0C\u5C24\u5176\u662F\u5E74\u8F7B\u4EBA" },
        { name: "\u5988", text: "@\u6211 \u4F60\u5C31\u662F\u4E0D\u5403\u65E9\u996D\u90A3\u4E2A" },
        { name: "\u7238", text: "[\u8868\u60C5]" }
      ],
      prompt: "\u300C\u6211\u300D\u63A5\u4E0B\u6765\u6700\u53EF\u80FD\u56DE\u54EA\u53E5\uFF1F",
      options: [
        "\u611F\u8C22\u4E09\u59E8\u5206\u4EAB\uFF0C\u6211\u4F1A\u8BA4\u771F\u5B66\u4E60\u5E76\u8F6C\u53D1\u7ED9\u540C\u4E8B\u4EEC\u3002",
        "\u5988\u4F60\u522B\u53C8\u62FF\u8FD9\u4E2A\u5FF5\u6211\u2026\u6211\u5403\u4E86\u5403\u4E86",
        "\u6E29\u99A8\u63D0\u793A\uFF1A\u7A7A\u8179\u996E\u98DF\u9700\u8C28\u614E\uFF0C\u5EFA\u8BAE\u5408\u7406\u5B89\u6392\u81B3\u98DF\u7ED3\u6784\u3002"
      ],
      answer: 1,
      tell: "\u771F\u4EBA\u4E00\u822C\u4E0D\u590D\u8FF0\u6587\u7AE0\uFF0C\u53EA\u63A5\u4F4F\u300C\u8DDF\u81EA\u5DF1\u6709\u5173\u300D\u7684\u90A3\u53E5\u3002",
      explain: "\u5988\u90A3\u53E5\u662F\u5728\u70B9\u540D\uFF0C\u300C\u6211\u300D\u5148\u558A\u51A4\u518D\u987A\u5E26\u8BA4\u6002\uFF0C\u7701\u7565\u53F7\u52A0\u53E3\u8BED\u624D\u662F\u7FA4\u91CC\u771F\u5B9E\u53CD\u5E94\u3002\u53E6\u5916\u4E24\u53E5\u628A\u7FA4\u804A\u5F53\u516C\u544A\u680F\uFF0C\u662F\u5178\u578B\u7684\u8F6C\u53D1/\u5BA2\u670D\u8154\u3002"
    },
    {
      id: "f2",
      group: 0,
      groupName: GROUPS[0].name,
      scene: GROUPS[0].scene,
      messages: [
        { name: "\u4E8C\u59D1", text: "\u6211\u540C\u4E8B\u5BB6\u95FA\u5973\uFF0C93\u7684\uFF0C\u5728\u94F6\u884C\uFF0C\u7167\u7247\u53D1\u7FA4\u91CC\u4E86" },
        { name: "\u4E8C\u59D1", text: "@\u6211 \u4F60\u5565\u65F6\u5019\u56DE\u6765\uFF0C\u89C1\u4E00\u9762" },
        { name: "\u7238", text: "\u4ED6\u5FD9" },
        { name: "\u5988", text: "\u5468\u672B\u6709\u7A7A" }
      ],
      prompt: "\u300C\u6211\u300D\u63A5\u4E0B\u6765\u6700\u53EF\u80FD\u56DE\u54EA\u53E5\uFF1F",
      options: [
        "\u2026\u8FD9\u5468\u771F\u52A0\u73ED\uFF0C\u4E0B\u5468\u518D\u8BF4\u5427",
        "\u8C22\u8C22\u4E8C\u59D1\u5173\u5FC3\uFF0C\u6211\u4F1A\u59A5\u5584\u5B89\u6392\u65F6\u95F4\uFF0C\u5C4A\u65F6\u4E0E\u60A8\u8054\u7CFB\u3002",
        "\u597D\u7684\uFF0C\u5DF2\u6536\u5230\u76F8\u4EB2\u5BF9\u8C61\u4FE1\u606F\uFF0C\u6211\u5C06\u5C3D\u5FEB\u53CD\u9988\u3002"
      ],
      answer: 0,
      tell: "\u9762\u5BF9\u4E0D\u60F3\u63A5\u7684\u8BDD\u9898\uFF0C\u771F\u4EBA\u5F80\u5F80\u53EA\u7ED9\u4E00\u4E2A\u77ED\u63A8\u8131\uFF0C\u4E0D\u89E3\u91CA\u592A\u591A\u3002",
      explain: "\u300C\u2026\u300D\u5F00\u5934\u7684\u62D6\u5EF6 + \u4E0D\u63D0\u76F8\u4EB2\u5BF9\u8C61\uFF0C\u662F\u56DE\u907F\u5F0F\u771F\u4EBA\u56DE\u590D\u3002\u540E\u4E24\u53E5\u7528\u300C\u5C4A\u65F6\u300D\u300C\u5C3D\u5FEB\u53CD\u9988\u300D\uFF0C\u628A\u5BB6\u4E8B\u5199\u6210\u4E86\u5DE5\u5355\u3002"
    },
    {
      id: "f3",
      group: 0,
      groupName: GROUPS[0].name,
      scene: GROUPS[0].scene,
      messages: [
        { name: "\u7238", text: "[\u5FAE\u4FE1\u7EA2\u5305] \u5927\u5BB6\u8FC7\u5E74\u597D" },
        { name: "\u8868\u5F1F", text: "\u8C22\u8C22\u59D1\u7236\uFF01\u624B\u6C14\u4E0D\u9519" },
        { name: "\u4E09\u59E8", text: "\u6211\u6CA1\u62A2\u5230\u2026\u518D\u53D1\u4E00\u4E2A" },
        { name: "\u5988", text: "\u4ED6\u53D1\u7684\u662F\u6700\u5C0F\u7684\u90A3\u4E2A" }
      ],
      prompt: "\u7FA4\u91CC\u6700\u53EF\u80FD\u63A5\u7740\u51FA\u73B0\u54EA\u53E5\uFF1F",
      options: [
        "\u606D\u559C\u53D1\u8D22\uFF0C\u7EA2\u5305\u5DF2\u9886\u53D6\uFF0C\u611F\u8C22\u957F\u8F88\u7684\u65B0\u6625\u795D\u798F\u3002",
        "\u795D\u60A8\u65B0\u6625\u5FEB\u4E50\uFF0C\u4E07\u4E8B\u5982\u610F\u9616\u5BB6\u5B89\u5EB7\u3002",
        "\u7238\u4F60\u8FD9\u4E5F\u592A\u62A0\u4E86\u54C8\u54C8\u54C8\u54C8 \u518D\u6765\u4E00\u4E2A"
      ],
      answer: 2,
      tell: "\u7EA2\u5305\u573A\u666F\u91CC\uFF0C\u771F\u4EBA\u7231\u8D77\u54C4\uFF0C\u800C\u4E14\u4F1A\u987A\u7740\u4E0A\u4E00\u53E5\u300C\u6700\u5C0F\u7684\u90A3\u4E2A\u300D\u63A5\u3002",
      explain: "\u300C\u54C8\u54C8\u54C8\u54C8\u300D+ \u76F4\u63A5\u5410\u69FD\u957F\u8F88\uFF0C\u662F\u719F\u4EBA\u5173\u7CFB\u7684\u7279\u6743\u3002\u524D\u4E24\u53E5\u50CF\u7FA4\u53D1\u62DC\u5E74\u6A21\u677F\uFF0C\u6CA1\u4EBA\u4F1A\u5728\u5BB6\u65CF\u7FA4\u91CC\u8FD9\u4E48\u8BF4\u8BDD\u3002"
    },
    {
      id: "f4",
      group: 0,
      groupName: GROUPS[0].name,
      scene: GROUPS[0].scene,
      messages: [
        { name: "\u4E09\u59E8", text: "\u665A\u4E0A11\u70B9\u52301\u70B9\u662F\u809D\u6392\u6BD2\uFF0C\u5FC5\u987B\u7761\u7740\uFF01" },
        { name: "\u5988", text: "@\u6211 \u542C\u89C1\u6CA1" },
        { name: "\u8868\u5F1F", text: "\u6211\u5929\u5929\u4E24\u70B9\u7761\u4E5F\u6CA1\u4E8B\u554A" }
      ],
      prompt: "\u300C\u6211\u300D\u63A5\u4E0B\u6765\u6700\u53EF\u80FD\u56DE\u54EA\u53E5\uFF1F",
      options: [
        "\u4ECE\u533B\u5B66\u89D2\u5EA6\u770B\uFF0C\u809D\u810F\u4EE3\u8C22\u5E76\u4E0D\u4E25\u683C\u9075\u5FAA\u56FA\u5B9A\u65F6\u6BB5\u3002",
        "\u542C\u89C1\u4E86\u542C\u89C1\u4E86\u2026\u4F60\u4EEC\u5148\u7761",
        "\u5EFA\u8BAE\u4FDD\u6301\u89C4\u5F8B\u4F5C\u606F\uFF0C\u907F\u514D\u71AC\u591C\u5BF9\u8EAB\u4F53\u9020\u6210\u8D1F\u62C5\u3002"
      ],
      answer: 1,
      tell: "\u88AB\u70B9\u540D\u65F6\uFF0C\u771F\u4EBA\u5148\u6577\u884D\u5E94\u4E00\u58F0\uFF0C\u800C\u4E0D\u662F\u79D1\u666E\u3002",
      explain: "\u300C\u542C\u89C1\u4E86\u542C\u89C1\u4E86\u300D\u662F\u5178\u578B\u7684\u5E94\u4ED8\u5F0F\u91CD\u590D\u3002\u53E6\u4E24\u53E5\u4E00\u53E5\u50CF\u79D1\u666E\u535A\u4E3B\u3001\u4E00\u53E5\u50CF\u5065\u5EB7 App \u63A8\u9001\uFF0C\u90FD\u4E0D\u5E26\u60C5\u7EEA\u3002"
    },
    {
      id: "f5",
      group: 0,
      groupName: GROUPS[0].name,
      scene: GROUPS[0].scene,
      messages: [
        { name: "\u5927\u4F2F", text: "@\u6211 \u73B0\u5728\u5728\u54EA\u513F\u4E0A\u73ED\u6765\u7740\uFF1F" },
        { name: "\u5927\u4F2F", text: "\u4E00\u4E2A\u6708\u80FD\u6323\u591A\u5C11\u554A" },
        { name: "\u5988", text: "\u5B69\u5B50\u5728\u5916\u9762\u633A\u8F9B\u82E6\u7684" },
        { name: "\u7238", text: "[\u8868\u60C5]" }
      ],
      prompt: "\u300C\u6211\u300D\u63A5\u4E0B\u6765\u6700\u53EF\u80FD\u56DE\u54EA\u53E5\uFF1F",
      options: [
        "\u5C31\u90A3\u6837\u5427 \u5988\u4F60\u522B\u8BF4\u4E86\u{1F605}",
        "\u76EE\u524D\u5C31\u804C\u4E8E\u4E00\u5BB6\u4E92\u8054\u7F51\u4F01\u4E1A\uFF0C\u85AA\u8D44\u6C34\u5E73\u5C5E\u4E8E\u884C\u4E1A\u4E2D\u4F4D\u6570\u3002",
        "\u611F\u8C22\u5173\u5FC3\uFF0C\u5177\u4F53\u6536\u5165\u5C5E\u4E8E\u4E2A\u4EBA\u9690\u79C1\uFF0C\u4E0D\u4FBF\u900F\u9732\uFF0C\u8C22\u8C22\u7406\u89E3\u3002"
      ],
      answer: 0,
      tell: "\u5C34\u5C2C\u8BDD\u9898\u4E0B\uFF0C\u771F\u4EBA\u4F1A\u6C42\u300C\u81EA\u5DF1\u4EBA\u300D stop\uFF0C\u800C\u4E0D\u662F\u56DE\u7B54\u63D0\u95EE\u8005\u3002",
      explain: '\u56DE\u7684\u662F\u5988\u90A3\u53E5\u3001\u4E0D\u662F\u5927\u4F2F\u90A3\u53E5\uFF0C\u8FD8\u5E26\u4E2A\u{1F605}\u2014\u2014\u8FD9\u79CD"\u9519\u4F4D\u63A5\u8BDD"\u662F\u7FA4\u804A\u6700\u771F\u5B9E\u7684\u7279\u5F81\u3002\u540E\u4E24\u53E5\u4E00\u672C\u6B63\u7ECF\u5730\u56DE\u7B54\u4E86\u5DE5\u8D44\uFF0C\u53CD\u800C\u5047\u3002'
    },
    {
      id: "f6",
      group: 0,
      groupName: GROUPS[0].name,
      scene: GROUPS[0].scene,
      messages: [
        { name: "\u4E09\u59E8", text: "\u7D27\u6025\u901A\u77E5\uFF01\u4E0D\u8F6C\u4E0D\u662F\u4E2D\u56FD\u4EBA\uFF01\uFF01" },
        { name: "\u4E09\u59E8", text: "\u8D76\u7D27\u53D1\u7ED910\u4E2A\u7FA4" },
        { name: "\u5988", text: "\u4F60\u4E09\u59E8\u53C8\u6765\u4E86" },
        { name: "\u8868\u59B9", text: "\u2026\u2026" }
      ],
      prompt: "\u300C\u6211\u300D\u63A5\u4E0B\u6765\u6700\u53EF\u80FD\u56DE\u54EA\u53E5\uFF1F",
      options: [
        "\u5DF2\u8F6C\u53D1\u81F3\u76F8\u5173\u7FA4\u7EC4\uFF0C\u8BF7\u653E\u5FC3\u3002",
        "\u8BE5\u4FE1\u606F\u7F3A\u4E4F\u6743\u5A01\u6765\u6E90\uFF0C\u5EFA\u8BAE\u8C28\u614E\u7504\u522B\u540E\u518D\u4F20\u64AD\u3002",
        "\u8FD9\u4E2A\u6211\u4E0A\u6B21\u8F9F\u8FC7\u8C23\u4E86\u2026\u7B97\u4E86\u4E0D\u8BF4\u4E86"
      ],
      answer: 2,
      tell: "\u771F\u4EBA\u5728\u5BB6\u65CF\u7FA4\u91CC\u5E38\u5E38\u300C\u60F3\u8BF4\u53C8\u61D2\u5F97\u8BF4\u300D\u3002",
      explain: "\u300C\u7B97\u4E86\u4E0D\u8BF4\u4E86\u300D\u8FD9\u79CD\u534A\u622A\u8BDD\uFF0C\u53EA\u6709\u77E5\u9053\u8BF4\u4E86\u4E5F\u6CA1\u7528\u7684\u4EBA\u624D\u4F1A\u6253\u3002\u53E6\u4E24\u53E5\u4E00\u4E2A\u50CF\u673A\u5668\u4EBA\u6267\u884C\u6307\u4EE4\uFF0C\u4E00\u4E2A\u50CF\u5E73\u53F0\u8F9F\u8C23\u516C\u544A\u3002"
    },
    {
      id: "f7",
      group: 0,
      groupName: GROUPS[0].name,
      scene: GROUPS[0].scene,
      messages: [
        { name: "\u5988", text: "\u5BA2\u5385\u7A7A\u8C03\u4E0D\u5236\u51B7\u4E86 \u8C01\u8BA4\u8BC6\u4FEE\u7A7A\u8C03\u7684" },
        { name: "\u7238", text: "\u6211\u95EE\u95EE\u697C\u4E0B" },
        { name: "\u8868\u5F1F", text: "\u4E0A\u6B21\u90A3\u4E2A\u5E08\u5085\u5FAE\u4FE1\u6211\u8FD8\u6709" }
      ],
      prompt: "\u300C\u6211\u300D\u63A5\u4E0B\u6765\u6700\u53EF\u80FD\u56DE\u54EA\u53E5\uFF1F",
      options: [
        "\u597D\u7684\uFF0C\u6211\u5DF2\u8BB0\u5F55\u8BE5\u7EF4\u4FEE\u9700\u6C42\uFF0C\u7A0D\u540E\u4F1A\u8054\u7CFB\u76F8\u5173\u4EBA\u5458\u3002",
        "\u5148\u522B\u627E\u4E86 \u6211\u5468\u672B\u56DE\u6765\u81EA\u5DF1\u770B\u770B",
        "\u5EFA\u8BAE\u4F18\u5148\u8054\u7CFB\u5B98\u65B9\u552E\u540E\uFF0C\u4EE5\u4FDD\u969C\u7EF4\u4FEE\u8D28\u91CF\u4E0E\u670D\u52A1\u6743\u76CA\u3002"
      ],
      answer: 1,
      tell: "\u5BB6\u91CC\u4EBA\u8BF4\u8BDD\u4F1A\u76F4\u63A5\u6253\u65AD\u522B\u4EBA\u7684\u5B89\u6392\uFF0C\u4E0D\u7528\u5148\u81F4\u8C22\u3002",
      explain: "\u300C\u5148\u522B\u627E\u4E86\u300D\u76F4\u63A5\u63A8\u7FFB\u524D\u9762\u4E24\u4E2A\u4EBA\u7684\u65B9\u6848\uFF0C\u8BED\u6C14\u77ED\u3001\u6CA1\u4E3B\u8BED\uFF0C\u662F\u81EA\u5BB6\u4EBA\u7684\u8BF4\u8BDD\u65B9\u5F0F\u3002\u53E6\u4E24\u53E5\u50CF\u5BA2\u670D\u5DE5\u5355\u548C\u552E\u540E\u8BDD\u672F\u3002"
    },
    {
      id: "f8",
      group: 0,
      groupName: GROUPS[0].name,
      scene: GROUPS[0].scene,
      messages: [
        { name: "\u5988", text: "\u660E\u5929\u964D\u6E29 \u90FD\u591A\u7A7F\u70B9" },
        { name: "\u5988", text: "[\u56FE\u7247] \u5929\u6C14\u9884\u62A5" },
        { name: "\u7238", text: "\u77E5\u9053\u4E86" }
      ],
      prompt: "\u300C\u6211\u300D\u63A5\u4E0B\u6765\u6700\u53EF\u80FD\u56DE\u54EA\u53E5\uFF1F",
      options: [
        "\u54E6 \u6211\u90A3\u4EF6\u539A\u5916\u5957\u8FD8\u5728\u5BB6\u5417",
        "\u6536\u5230\uFF0C\u611F\u8C22\u63D0\u9192\uFF0C\u6211\u4F1A\u6CE8\u610F\u6DFB\u8863\u4FDD\u6696\u3002",
        "\u6C14\u6E29\u4E0B\u964D\u8BF7\u6CE8\u610F\u9632\u5BD2\uFF0C\u907F\u514D\u611F\u5192\u5F71\u54CD\u5DE5\u4F5C\u4E0E\u751F\u6D3B\u3002"
      ],
      answer: 0,
      tell: "\u771F\u4EBA\u4F1A\u628A\u300C\u63D0\u9192\u300D\u7ACB\u523B\u8F6C\u6210\u81EA\u5DF1\u7684\u4E00\u4E2A\u5177\u4F53\u5C0F\u4E8B\u3002",
      explain: '\u4E0D\u56DE\u5E94"\u591A\u7A7F\u70B9"\uFF0C\u53CD\u800C\u95EE\u5916\u5957\u5728\u54EA\u2014\u2014\u8BDD\u9898\u88AB\u8F7B\u8F7B\u5E26\u8DD1\uFF0C\u8FD9\u624D\u662F\u5BB6\u4EBA\u7FA4\u3002\u540E\u4E24\u53E5\u662F\u6807\u51C6\u901A\u77E5\u56DE\u590D\u3002'
    },
    // ---------- 组 1：摸鱼同事群 ----------
    {
      id: "w1",
      group: 1,
      groupName: GROUPS[1].name,
      scene: GROUPS[1].scene,
      messages: [
        { name: "\u738B\u603B", text: "\u5728\u5417" },
        { name: "\u738B\u603B", text: "\u521A\u624D\u90A3\u4E2A\u6570\u518D\u5BF9\u4E00\u4E0B" },
        { name: "\u5C0F\u674E", text: "\u2026\u2026" },
        { name: "\u963F\u73CD", text: "\u6211\u521A\u5173\u7535\u8111\u4E86" }
      ],
      prompt: "\u7FA4\u91CC\u6700\u53EF\u80FD\u63A5\u7740\u51FA\u73B0\u54EA\u53E5\uFF1F",
      options: [
        "\u6536\u5230\uFF0C\u6211\u9A6C\u4E0A\u6838\u5BF9\u6570\u636E\uFF0C\u7A0D\u540E\u5411\u60A8\u540C\u6B65\u7ED3\u679C\u3002",
        "\u60A8\u597D\uFF0C\u6211\u8FD9\u8FB9\u5DF2\u6536\u5230\uFF0C\u5C06\u5728\u5341\u5206\u949F\u5185\u5B8C\u6210\u590D\u6838\u3002",
        "\u5728\u7684 \u54EA\u4E2A\u6570\u2026\u6211\u770B\u770B\u{1F602}"
      ],
      answer: 2,
      tell: "\u6DF1\u591C\u88AB\u8001\u677F\u70B9\u540D\uFF0C\u771F\u4EBA\u5148\u8BA4\u6002\uFF0C\u4F46\u4F1A\u5E26\u70B9\u65E0\u5948\u7684\u8BED\u6C14\u3002",
      explain: "\u300C\u54EA\u4E2A\u6570\u300D\u8BF4\u660E\u6839\u672C\u6CA1\u770B\u6E05\u662F\u54EA\u4E2A\u6570\uFF0C\u8FD8\u786C\u7740\u5934\u76AE\u63A5\u4E86\uFF0C\u{1F602} \u662F\u7ED9\u81EA\u5DF1\u53F0\u9636\u3002\u524D\u4E24\u53E5\u592A\u6807\u51C6\uFF0C\u50CF\u8BBE\u4E86\u81EA\u52A8\u56DE\u590D\u3002"
    },
    {
      id: "w2",
      group: 1,
      groupName: GROUPS[1].name,
      scene: GROUPS[1].scene,
      messages: [
        { name: "HR \u5A1C\u5A1C", text: "\u672C\u5468\u4E94\u4E0B\u73ED\u540E\u56E2\u5EFA\uFF0C\u5730\u70B9\u5B9A\u4E86\uFF5E" },
        { name: "HR \u5A1C\u5A1C", text: "\u5927\u5BB6\u5C3D\u91CF\u90FD\u6765\u54E6" },
        { name: "\u5C0F\u674E", text: "\u53C8\u662F\u5468\u4E94\u2026" }
      ],
      prompt: "\u7FA4\u91CC\u6700\u53EF\u80FD\u63A5\u7740\u51FA\u73B0\u54EA\u53E5\uFF1F",
      options: [
        "\u80FD\u4E0D\u53BB\u5417 \u6211\u5468\u4E94\u8981\u63A5\u5B69\u5B50",
        "\u611F\u8C22\u7EC4\u7EC7\uFF0C\u6211\u4F1A\u5C3D\u91CF\u534F\u8C03\u65F6\u95F4\u79EF\u6781\u53C2\u4E0E\u672C\u6B21\u56E2\u5EFA\u6D3B\u52A8\u3002",
        "\u6E29\u99A8\u63D0\u793A\uFF1A\u8BF7\u5404\u4F4D\u540C\u4E8B\u4E8E\u5468\u56DB\u524D\u5B8C\u6210\u62A5\u540D\u786E\u8BA4\u3002"
      ],
      answer: 0,
      tell: "\u540C\u4E8B\u7FA4\u91CC\u771F\u4EBA\u662F\u4F1A\u8BA8\u4EF7\u8FD8\u4EF7\u7684\uFF0C\u800C\u4E14\u7406\u7531\u5F88\u5177\u4F53\u3002",
      explain: "\u300C\u63A5\u5B69\u5B50\u300D\u8FD9\u79CD\u5177\u4F53\u5230\u4E0D\u80FD\u518D\u5177\u4F53\u7684\u79C1\u4EBA\u7406\u7531\uFF0C\u624D\u662F\u771F\u4EBA\u7684\u63A8\u8131\u65B9\u5F0F\u3002\u53E6\u4E24\u53E5\u662F HR \u81EA\u5DF1\u4F1A\u53D1\u7684\u8BDD\u3002"
    },
    {
      id: "w3",
      group: 1,
      groupName: GROUPS[1].name,
      scene: GROUPS[1].scene,
      messages: [
        { name: "\u8D22\u52A1", text: "@\u5168\u4F53 \u4E0A\u6708\u62A5\u9500\u4ECA\u5929\u622A\u6B62" },
        { name: "\u963F\u73CD", text: "\u6211\u90A3\u5F20\u9910\u996E\u7684\u88AB\u6253\u56DE\u6765\u4E86" },
        { name: "\u5C0F\u674E", text: "\u8BF4\u662F\u6CA1\u5199\u4E8B\u7531" }
      ],
      prompt: "\u963F\u73CD\u63A5\u4E0B\u6765\u6700\u53EF\u80FD\u56DE\u54EA\u53E5\uFF1F",
      options: [
        "\u597D\u7684\uFF0C\u6211\u5C06\u6309\u8981\u6C42\u8865\u5145\u4E8B\u7531\u540E\u91CD\u65B0\u63D0\u4EA4\uFF0C\u8C22\u8C22\u63D0\u9192\u3002",
        "\u6211\u90FD\u5199\u4E86\u554A\u2026\u300C\u56E2\u961F\u805A\u9910\u300D\u4E0D\u7B97\u4E8B\u7531\u5417",
        "\u5EFA\u8BAE\u540E\u7EED\u5728\u63D0\u4EA4\u524D\u4ED4\u7EC6\u6838\u5BF9\u586B\u5199\u89C4\u8303\uFF0C\u907F\u514D\u91CD\u590D\u9000\u56DE\u3002"
      ],
      answer: 1,
      tell: "\u771F\u4EBA\u88AB\u9A73\u56DE\u65F6\u7B2C\u4E00\u53CD\u5E94\u662F\u558A\u51A4\uFF0C\u800C\u4E14\u4F1A\u5F15\u7528\u81EA\u5DF1\u5199\u8FC7\u7684\u539F\u8BDD\u3002",
      explain: "\u5F15\u7528\u300C\u56E2\u961F\u805A\u9910\u300D\u5E76\u52A0\u95EE\u53F7\uFF0C\u662F\u5E26\u7740\u60C5\u7EEA\u7684\u5177\u4F53\u53CD\u9A73\u3002\u53E6\u4E24\u53E5\u4E00\u53E5\u662F\u670D\u4ECE\u3001\u4E00\u53E5\u662F\u590D\u76D8\u603B\u7ED3\uFF0C\u90FD\u4E0D\u662F\u5F53\u4E0B\u53CD\u5E94\u3002"
    },
    {
      id: "w4",
      group: 1,
      groupName: GROUPS[1].name,
      scene: GROUPS[1].scene,
      messages: [
        { name: "\u4EA7\u54C1", text: "\u90A3\u4E2A\u6309\u94AE\u8FD8\u662F\u6539\u56DE\u4E0A\u4E00\u7248\u5427" },
        { name: "\u4EA7\u54C1", text: "\u5BA2\u6237\u8BF4\u770B\u7740\u4E0D\u4E60\u60EF" },
        { name: "\u6211", text: "\u2026\u2026" },
        { name: "\u5C0F\u674E", text: "\u6211\u4EE3\u7801\u521A\u5408\u4E86" }
      ],
      prompt: "\u300C\u6211\u300D\u63A5\u4E0B\u6765\u6700\u53EF\u80FD\u56DE\u54EA\u53E5\uFF1F",
      options: [
        "\u6536\u5230\u9700\u6C42\u53D8\u66F4\uFF0C\u6211\u4F1A\u8BC4\u4F30\u5F71\u54CD\u8303\u56F4\u5E76\u91CD\u65B0\u6392\u671F\u3002",
        "\u7406\u89E3\u5BA2\u6237\u8BC9\u6C42\uFF0C\u6211\u4EEC\u540E\u7EED\u4F1A\u6301\u7EED\u4F18\u5316\u4EA4\u4E92\u4F53\u9A8C\u3002",
        "\u554A\uFF1F\uFF1F\uFF1F\u6211\u521A\u63D0\u7684\u6D4B\u5462"
      ],
      answer: 2,
      tell: "\u8FDE\u7EED\u95EE\u53F7 + \u534A\u622A\u8BDD\uFF0C\u662F\u5F00\u53D1\u770B\u5230\u9700\u6C42\u56DE\u6EDA\u7684\u771F\u5B9E\u53CD\u5E94\u3002",
      explain: "\u300C\u6D4B\u5462\u300D\u4E24\u4E2A\u5B57\u7701\u7565\u4E86\u6574\u53E5\uFF0C\u4F46\u540C\u7EC4\u7684\u4EBA\u90FD\u61C2\u3002\u53E6\u4E24\u53E5\u662F\u5468\u62A5\u8BED\u8A00\uFF0C\u4E0D\u4F1A\u51FA\u73B0\u5728\u9700\u6C42\u521A\u53D8\u7684\u5F53\u4E0B\u3002"
    },
    {
      id: "w5",
      group: 1,
      groupName: GROUPS[1].name,
      scene: GROUPS[1].scene,
      messages: [
        { name: "\u738B\u603B", text: "@\u5168\u4F53\u6210\u5458 \u5468\u62A5\u4ECA\u665A\u524D\u53D1\u6211" },
        { name: "\u963F\u73CD", text: "\u6536\u5230" },
        { name: "\u5C0F\u674E", text: "\u6536\u5230" },
        { name: "\u6211", text: "" }
      ],
      prompt: "\u300C\u6211\u300D\u63A5\u4E0B\u6765\u6700\u53EF\u80FD\u53D1\u54EA\u53E5\uFF1F",
      options: [
        "1",
        "\u5DF2\u6536\u5230\u901A\u77E5\uFF0C\u5C06\u6309\u65F6\u63D0\u4EA4\u672C\u5468\u5DE5\u4F5C\u603B\u7ED3\u3002",
        "\u597D\u7684\uFF0C\u6211\u4F1A\u51C6\u65F6\u5B8C\u6210\u5468\u62A5\u5E76\u53D1\u9001\u81F3\u60A8\u7684\u90AE\u7BB1\u3002"
      ],
      answer: 0,
      tell: "\u7FA4\u91CC\u5DF2\u7ECF\u6709\u4E24\u4E2A\u4EBA\u300C\u6536\u5230\u300D\u4E86\uFF0C\u7B2C\u4E09\u4E2A\u4EBA\u901A\u5E38\u4E0D\u4F1A\u518D\u6253\u4E00\u904D\u5B8C\u6574\u7684\u3002",
      explain: "\u8DDF\u4E00\u4E2A\u300C1\u300D\u662F\u5DE5\u4F4D\u9ED8\u5951\uFF1A\u65E2\u7B97\u7B7E\u5230\u53C8\u4E0D\u5360\u5C4F\u5E55\u3002\u8FD9\u79CD\u6781\u7B80\u56DE\u590D\u51E0\u4E4E\u4E0D\u53EF\u80FD\u7531\u6A21\u677F\u751F\u6210\u3002"
    },
    {
      id: "w6",
      group: 1,
      groupName: GROUPS[1].name,
      scene: GROUPS[1].scene,
      messages: [
        { name: "\u5C0F\u674E", text: "\u6211 last day \u662F\u8FD9\u5468\u4E94\u2026" },
        { name: "\u963F\u73CD", text: "\u554A\uFF1F\u8FD9\u4E48\u7A81\u7136" },
        { name: "\u738B\u603B", text: "\u611F\u8C22\u5C0F\u674E\u8FD9\u6BB5\u65F6\u95F4\u7684\u4ED8\u51FA\uFF0C\u795D\u524D\u7A0B\u4F3C\u9526" }
      ],
      prompt: "\u7FA4\u91CC\u6700\u53EF\u80FD\u63A5\u7740\u51FA\u73B0\u54EA\u53E5\uFF1F",
      options: [
        "\u611F\u8C22\u4F60\u4E00\u76F4\u4EE5\u6765\u7684\u534F\u4F5C\u4E0E\u652F\u6301\uFF0C\u795D\u672A\u6765\u4E00\u5207\u987A\u5229\uFF01",
        "\u665A\u4E0A\u805A\u4E00\u4E0B\u5427 \u6211\u8BA2\u4F4D\u5B50",
        "\u795D\u613F\u4F60\u5728\u65B0\u7684\u5DE5\u4F5C\u5C97\u4F4D\u4E0A\u53D6\u5F97\u66F4\u597D\u7684\u6210\u7EE9\u3002"
      ],
      answer: 1,
      tell: "\u79BB\u804C\u6D88\u606F\u540E\uFF0C\u771F\u4EBA\u7B2C\u4E00\u53CD\u5E94\u662F\u300C\u7EA6\u996D\u300D\uFF0C\u4E0D\u662F\u9881\u5956\u8BCD\u3002",
      explain: "\u300C\u6211\u8BA2\u4F4D\u5B50\u300D\u76F4\u63A5\u628A\u8BDD\u9898\u62C9\u5230\u5177\u4F53\u884C\u52A8\u3002\u53E6\u5916\u4E24\u53E5\u662F\u9886\u5BFC/\u8D3A\u5361\u53E3\u543B\uFF0C\u7FA4\u91CC\u770B\u5230\u4F1A\u89C9\u5F97\u50CF\u590D\u5236\u7684\u3002"
    },
    {
      id: "w7",
      group: 1,
      groupName: GROUPS[1].name,
      scene: GROUPS[1].scene,
      messages: [
        { name: "\u9500\u552E", text: "\u5BA2\u6237\u4E34\u65F6\u8981\u4E2A\u65B9\u6848\uFF0C\u660E\u65E9\u4E5D\u70B9" },
        { name: "\u9500\u552E", text: "\u80FD\u4E0D\u80FD\u641E\u2026" },
        { name: "\u5C0F\u674E", text: "\u6211\u8FD9\u8FB9\u8FD8\u6709\u4E2A bug \u6CA1\u4FEE" },
        { name: "\u963F\u73CD", text: "\u6A21\u677F\u8FD8\u5728\u5417" }
      ],
      prompt: "\u300C\u6211\u300D\u63A5\u4E0B\u6765\u6700\u53EF\u80FD\u56DE\u54EA\u53E5\uFF1F",
      options: [
        "\u597D\u7684\uFF0C\u6211\u4EEC\u4F1A\u5168\u529B\u914D\u5408\uFF0C\u786E\u4FDD\u6309\u65F6\u4EA4\u4ED8\u65B9\u6848\u3002",
        "\u660E\u767D\uFF0C\u6211\u5148\u68B3\u7406\u4E00\u4E0B\u9700\u6C42\u8303\u56F4\u518D\u7ED9\u60A8\u7B54\u590D\u3002",
        "\u2026\u2026\u884C\u5427 \u8C01\u966A\u6211\u71AC"
      ],
      answer: 2,
      tell: "\u4E0D\u60C5\u613F\u4F46\u63A5\u4E86\uFF0C\u8FD8\u8981\u62C9\u4E2A\u4EBA\u4E00\u8D77\uFF0C\u8FD9\u662F\u540C\u4E8B\u7FA4\u3002",
      explain: "\u300C\u8C01\u966A\u6211\u71AC\u300D\u628A\u4EFB\u52A1\u53D8\u6210\u4E86\u627E\u540C\u4F34\uFF0C\u5E26\u7701\u7565\u53F7\u548C\u8BA4\u547D\u611F\u3002\u524D\u4E24\u53E5\u662F\u6807\u51C6\u5BF9\u5916\u627F\u8BFA\uFF0C\u4E0D\u4F1A\u53D1\u5728\u5185\u90E8\u7FA4\u3002"
    },
    {
      id: "w8",
      group: 1,
      groupName: GROUPS[1].name,
      scene: GROUPS[1].scene,
      messages: [
        { name: "\u963F\u73CD", text: "\u62FC\u5976\u8336\u5417 \u4E09\u70B9\u90A3\u6CE2" },
        { name: "\u5C0F\u674E", text: "\u6211\u8981 \u5C11\u51B0" },
        { name: "\u6211", text: "" },
        { name: "\u738B\u603B", text: "\u987A\u4FBF\u5E2E\u6211\u5E26\u4E00\u676F\uFF0C\u8C22\u8C22" }
      ],
      prompt: "\u300C\u6211\u300D\u63A5\u4E0B\u6765\u6700\u53EF\u80FD\u53D1\u54EA\u53E5\uFF1F",
      options: [
        "+1 \u65E0\u7CD6",
        "\u597D\u7684\uFF0C\u6211\u5DF2\u767B\u8BB0\u60A8\u7684\u996E\u54C1\u9700\u6C42\uFF0C\u7A0D\u540E\u7EDF\u4E00\u63D0\u4EA4\u8BA2\u5355\u3002",
        "\u6536\u5230\uFF0C\u6211\u4F1A\u5728\u4E0B\u5355\u65F6\u7EDF\u4E00\u5907\u6CE8\u5404\u4F4D\u7684\u53E3\u5473\u504F\u597D\u3002"
      ],
      answer: 0,
      tell: "\u63A5\u9F99\u573A\u666F\u91CC\uFF0C\u771F\u4EBA\u53EA\u8865\u81EA\u5DF1\u7684\u90A3\u4E00\u6761\u4FE1\u606F\u3002",
      explain: "\u300C+1\u300D\u662F\u7FA4\u63A5\u9F99\u7684\u6700\u5C0F\u5355\u4F4D\u3002\u540E\u4E24\u53E5\u628A\u62FC\u5355\u5199\u6210\u4E86\u5DE5\u5355\u7CFB\u7EDF\uFF0C\u5C24\u5176\u300C\u7EDF\u4E00\u5907\u6CE8\u300D\u4E0D\u50CF\u4EBA\u8BDD\u3002"
    },
    // ---------- 组 2：四年二班 ----------
    {
      id: "c1",
      group: 2,
      groupName: GROUPS[2].name,
      scene: GROUPS[2].scene,
      messages: [
        { name: "\u5927\u58EE", text: "\u5468\u516D\u805A\u4E00\u4E0B\uFF1F" },
        { name: "\u73ED\u957F", text: "\u8001\u5730\u65B9\uFF1F" },
        { name: "\u5C0F\u654F", text: "\u6211\u53EF\u80FD\u665A\u70B9\u5230" },
        { name: "\u5927\u58EE", text: "\u51E0\u70B9\u90FD\u884C \u4F60\u4EEC\u5B9A" }
      ],
      prompt: "\u7FA4\u91CC\u6700\u53EF\u80FD\u63A5\u7740\u51FA\u73B0\u54EA\u53E5\uFF1F",
      options: [
        "\u4E03\u70B9\u5427 \u522B\u53C8\u62D6\u5230\u4E5D\u70B9\u2026",
        "\u5EFA\u8BAE\u5927\u5BB6\u63D0\u524D\u786E\u8BA4\u65F6\u95F4\uFF0C\u4EE5\u4FBF\u7EDF\u4E00\u5B89\u6392\u3002",
        "\u597D\u7684\uFF0C\u90A3\u6211\u5148\u7EDF\u8BA1\u4E00\u4E0B\u53C2\u4E0E\u4EBA\u6570\u548C\u53EF\u5230\u573A\u65F6\u95F4\u3002"
      ],
      answer: 0,
      tell: "\u8001\u540C\u5B66\u7FA4\u91CC\u4F1A\u7FFB\u65E7\u8D26\uFF0C\u8FD8\u5E26\u70B9\u5410\u69FD\u3002",
      explain: "\u300C\u522B\u53C8\u62D6\u5230\u4E5D\u70B9\u300D\u662F\u5728\u8BF4\u4E0A\u4E00\u6B21\u7684\u4E8B\uFF0C\u53EA\u6709\u5171\u540C\u7ECF\u5386\u7684\u4EBA\u624D\u63A5\u5F97\u4F4F\u3002\u53E6\u4E24\u53E5\u50CF\u4F1A\u8BAE\u7EAA\u8981\u3002"
    },
    {
      id: "c2",
      group: 2,
      groupName: GROUPS[2].name,
      scene: GROUPS[2].scene,
      messages: [
        { name: "\u5C0F\u654F", text: "\u51D1\u6EE1\u51CF \u8FD8\u5DEE\u4E00\u4E2A\u4EBA" },
        { name: "\u5927\u58EE", text: "\u6211\u6765" },
        { name: "\u73ED\u957F", text: "\u6211\u8981\u4E00\u676F\u828B\u6CE5\u7684" }
      ],
      prompt: "\u7FA4\u91CC\u6700\u53EF\u80FD\u63A5\u7740\u51FA\u73B0\u54EA\u53E5\uFF1F",
      options: [
        "\u611F\u8C22\u53C2\u4E0E\uFF0C\u672C\u6B21\u62FC\u5355\u5DF2\u8FBE\u5230\u4F18\u60E0\u95E8\u69DB\u3002",
        "\u6211\u5DF2\u8BB0\u5F55\u60A8\u7684\u53E3\u5473\uFF0C\u5C06\u5408\u5E76\u4E0B\u5355\u3002",
        "\u2026\u2026\u6211\u4E5F\u8981\u828B\u6CE5 \u6362\u6211\u6362\u6211"
      ],
      answer: 2,
      tell: "\u771F\u4EBA\u4F1A\u4E34\u65F6\u6539\u4E3B\u610F\uFF0C\u800C\u4E14\u8BDD\u8BF4\u5F97\u4E71\u3001\u5E26\u91CD\u590D\u3002",
      explain: "\u300C\u6362\u6211\u6362\u6211\u300D\u662F\u62A2\u540D\u989D\uFF0C\u524D\u9762\u8FD8\u5148\u53CD\u6094\u4E86\u4E00\u4E0B\u3002\u53E6\u4E24\u53E5\u662F\u62FC\u5355\u673A\u5668\u4EBA\u7684\u64AD\u62A5\u3002"
    },
    {
      id: "c3",
      group: 2,
      groupName: GROUPS[2].name,
      scene: GROUPS[2].scene,
      messages: [
        { name: "\u5927\u58EE", text: "\u665A\u4E0A\u5F00\u9ED1 \u7F3A\u4E00\u4E2A" },
        { name: "\u73ED\u957F", text: "\u6211\u5341\u70B9\u534A\u624D\u80FD\u4E0A" },
        { name: "\u5C0F\u654F", text: "\u6211\u89C2\u6218" }
      ],
      prompt: "\u7FA4\u91CC\u6700\u53EF\u80FD\u63A5\u7740\u51FA\u73B0\u54EA\u53E5\uFF1F",
      options: [
        "\u597D\u7684\uFF0C\u6211\u4F1A\u5728\u5341\u70B9\u534A\u51C6\u65F6\u4E0A\u7EBF\u53C2\u4E0E\u3002",
        "\u90A3\u5148\u6253\u4E24\u628A\u5339\u914D\u7B49\u6211 \u522B\u6389\u6BB5",
        "\u6536\u5230\uFF0C\u961F\u4F0D\u6EE1\u5458\u540E\u6211\u5C06\u901A\u77E5\u5404\u4F4D\u5F00\u59CB\u6E38\u620F\u3002"
      ],
      answer: 1,
      tell: "\u771F\u4EBA\u4F1A\u987A\u624B\u7ED9\u5B89\u6392\uFF0C\u8FD8\u4F1A\u987A\u624B\u5410\u69FD\u4E00\u4E0B\u961F\u53CB\u3002",
      explain: "\u5148\u7ED9\u66FF\u4EE3\u65B9\u6848\u3001\u518D\u8865\u4E00\u53E5\u300C\u522B\u6389\u6BB5\u300D\uFF0C\u4FE1\u606F\u5BC6\u5EA6\u548C\u8BED\u6C14\u90FD\u5BF9\u3002\u53E6\u4E24\u53E5\u50CF\u7CFB\u7EDF\u6D88\u606F\u3002"
    },
    {
      id: "c4",
      group: 2,
      groupName: GROUPS[2].name,
      scene: GROUPS[2].scene,
      messages: [
        { name: "\u73ED\u957F", text: "[\u56FE\u7247][\u56FE\u7247]" },
        { name: "\u73ED\u957F", text: "\u9886\u8BC1\u4E86 \u{1F389}" },
        { name: "\u5927\u58EE", text: "\u5367\u69FD" },
        { name: "\u5C0F\u654F", text: "\uFF01\uFF01\uFF01" }
      ],
      prompt: "\u7FA4\u91CC\u6700\u53EF\u80FD\u63A5\u7740\u51FA\u73B0\u54EA\u53E5\uFF1F",
      options: [
        "\u968F\u793C\u5148\u8BB0\u8D26\u4E0A\u554A \u6211\u4EBA\u6CA1\u5230",
        "\u606D\u559C\u606D\u559C\uFF01\u795D\u4E8C\u4F4D\u65B0\u5A5A\u5FEB\u4E50\uFF0C\u767E\u5E74\u597D\u5408\uFF01",
        "\u8877\u5FC3\u795D\u798F\u4F60\u4EEC\uFF0C\u613F\u4ECA\u540E\u7684\u65E5\u5B50\u5E78\u798F\u7F8E\u6EE1\u3002"
      ],
      answer: 0,
      tell: "\u719F\u4EBA\u7B2C\u4E00\u65F6\u95F4\u5F00\u73A9\u7B11\uFF0C\u4E14\u4F1A\u63A5\u81EA\u5DF1\u80FD\u4E0D\u80FD\u5230\u573A\u3002",
      explain: "\u524D\u4E24\u4E2A\u4EBA\u5DF2\u7ECF\u7528\u300C\u5367\u69FD\u300D\u300C\uFF01\uFF01\uFF01\u300D\u628A\u606D\u559C\u989D\u5EA6\u7528\u5B8C\u4E86\uFF0C\u7B2C\u4E09\u4E2A\u4EBA\u81EA\u7136\u8F6C\u5230\u968F\u793C\u8FD9\u79CD\u5B9E\u9645\u95EE\u9898\u3002\u540E\u4E24\u53E5\u662F\u7FA4\u53D1\u795D\u798F\u6A21\u677F\u3002"
    },
    {
      id: "c5",
      group: 2,
      groupName: GROUPS[2].name,
      scene: GROUPS[2].scene,
      messages: [
        { name: "\u5C0F\u654F", text: "\u5E2E\u6211\u6295\u4E2A\u7968 \u7B2C\u4E09\u4E2A\u94FE\u63A5" },
        { name: "\u5C0F\u654F", text: "\u4E00\u5929\u80FD\u6295\u4E09\u6B21 \u8C22\u8C22\u5BB6\u4EBA\u4EEC" },
        { name: "\u5927\u58EE", text: "\u6295\u4E86" }
      ],
      prompt: "\u7FA4\u91CC\u6700\u53EF\u80FD\u63A5\u7740\u51FA\u73B0\u54EA\u53E5\uFF1F",
      options: [
        "\u5DF2\u4E3A\u60A8\u5B8C\u6210\u6295\u7968\uFF0C\u795D\u53D6\u5F97\u597D\u6210\u7EE9\u3002",
        "\u611F\u8C22\u60A8\u7684\u652F\u6301\uFF0C\u6211\u4F1A\u7EE7\u7EED\u52AA\u529B\uFF01",
        "\u53C8\u6765\u2026\u6295\u4E86\u6295\u4E86 \u660E\u5929\u7684\u522B\u5FD8\u4E86\u63D0\u9192\u6211"
      ],
      answer: 2,
      tell: "\u719F\u4EBA\u5E2E\u5FD9\u4F1A\u5148\u62B1\u6028\u4E00\u53E5\uFF0C\u4F46\u624B\u8FD8\u662F\u70B9\u4E86\u3002",
      explain: "\u300C\u53C8\u6765\u300D\u8BF4\u660E\u8FD9\u4E0D\u662F\u7B2C\u4E00\u6B21\uFF0C\u300C\u6295\u4E86\u6295\u4E86\u300D\u662F\u91CD\u590D\u786E\u8BA4\uFF0C\u300C\u660E\u5929\u7684\u300D\u662F\u53EA\u6709\u77E5\u9053\u89C4\u5219\u7684\u4EBA\u624D\u63D0\u5F97\u51FA\u6765\u3002\u53E6\u4E24\u53E5\u662F\u4E3B\u529E\u65B9\u8BDD\u672F\u3002"
    },
    {
      id: "c6",
      group: 2,
      groupName: GROUPS[2].name,
      scene: GROUPS[2].scene,
      messages: [
        { name: "\u964C\u751F\u5934\u50CF", text: "\u5927\u5BB6\u597D\u5440\uFF5E\u597D\u4E45\u4E0D\u89C1" },
        { name: "\u964C\u751F\u5934\u50CF", text: "\u6211\u8FD9\u8FB9\u6709\u4E2A\u7406\u8D22\u9879\u76EE\u60F3\u8DDF\u5927\u5BB6\u5206\u4EAB\u4E0B" },
        { name: "\u5927\u58EE", text: "\uFF1F" }
      ],
      prompt: "\u7FA4\u91CC\u6700\u53EF\u80FD\u63A5\u7740\u51FA\u73B0\u54EA\u53E5\uFF1F",
      options: [
        "\u73ED\u957F \u8FD9\u8C01\u62C9\u8FDB\u6765\u7684",
        "\u6B22\u8FCE\u65B0\u540C\u5B66\uFF0C\u8BF7\u5148\u505A\u4E00\u4E0B\u81EA\u6211\u4ECB\u7ECD\u54E6\u3002",
        "\u6E29\u99A8\u63D0\u793A\uFF1A\u6D89\u53CA\u6295\u8D44\u7406\u8D22\u8BF7\u52A1\u5FC5\u63D0\u9AD8\u98CE\u9669\u9632\u8303\u610F\u8BC6\u3002"
      ],
      answer: 0,
      tell: "\u771F\u4EBA\u4E0D\u4F1A\u53BB\u56DE\u5E94\u5185\u5BB9\uFF0C\u800C\u662F\u76F4\u63A5\u8D28\u7591\u300C\u8C01\u62C9\u8FDB\u6765\u7684\u300D\u3002",
      explain: "\u4E00\u53E5\u8BDD\u628A\u77DB\u5934\u8F6C\u5411\u7FA4\u7BA1\u7406\uFF0C\u662F\u540C\u5B66\u5728\u7FA4\u91CC\u770B\u5230\u5E7F\u544A\u7684\u6807\u51C6\u53CD\u5E94\u3002\u53E6\u4E24\u53E5\u5206\u522B\u50CF\u7FA4\u673A\u5668\u4EBA\u548C\u5E73\u53F0\u63D0\u793A\u3002"
    },
    {
      id: "c7",
      group: 2,
      groupName: GROUPS[2].name,
      scene: GROUPS[2].scene,
      messages: [
        { name: "\u5927\u58EE", text: "\u90A3\u5BB6\u5E97\u5173\u4E86\uFF1F\uFF1F" },
        { name: "\u73ED\u957F", text: "\u4E0A\u4E2A\u6708\u5C31\u6CA1\u4E86" },
        { name: "\u5C0F\u654F", text: "\u6211\u8FD8\u60F3\u7740\u6BD5\u4E1A\u5341\u5468\u5E74\u53BB\u90A3\u513F" }
      ],
      prompt: "\u7FA4\u91CC\u6700\u53EF\u80FD\u63A5\u7740\u51FA\u73B0\u54EA\u53E5\uFF1F",
      options: [
        "\u5509\u2026\u90A3\u6362\u54EA\u513F\u554A",
        "\u5F88\u9057\u61BE\u542C\u5230\u8FD9\u4E2A\u6D88\u606F\uFF0C\u5EFA\u8BAE\u53E6\u884C\u9009\u62E9\u805A\u4F1A\u5730\u70B9\u3002",
        "\u5DF2\u8BB0\u5F55\u8BE5\u573A\u5730\u53D8\u66F4\uFF0C\u540E\u7EED\u5C06\u540C\u6B65\u65B0\u7684\u6D3B\u52A8\u5B89\u6392\u3002"
      ],
      answer: 0,
      tell: "\u5E26\u60C5\u7EEA\u7684\u53F9\u6C14 + \u987A\u52BF\u95EE\u4E0B\u4E00\u53E5\uFF0C\u624D\u662F\u540C\u5B66\u7FA4\u3002",
      explain: "\u300C\u5509\u300D\u627F\u63A5\u4E86\u5C0F\u654F\u7684\u60CB\u60DC\uFF0C\u518D\u81EA\u7136\u8F6C\u5165\u4E0B\u4E00\u4E2A\u5F85\u529E\u3002\u540E\u4E24\u53E5\u4E00\u4E2A\u50CF\u5BA2\u670D\u3001\u4E00\u4E2A\u50CF\u901A\u77E5\u3002"
    },
    {
      id: "c8",
      group: 2,
      groupName: GROUPS[2].name,
      scene: GROUPS[2].scene,
      messages: [
        { name: "\u5C0F\u654F", text: "\u8C01\u6709\u54B1\u9AD8\u4E8C\u90A3\u5F20\u5408\u7167" },
        { name: "\u5927\u58EE", text: "\u6211\u7FFB\u7FFB" },
        { name: "\u73ED\u957F", text: "\u6211\u76F8\u518C\u91CC\u5E94\u8BE5\u8FD8\u6709" },
        { name: "\u5C0F\u654F", text: "\u6025\u7528 \u505A\u89C6\u9891" }
      ],
      prompt: "\u7FA4\u91CC\u6700\u53EF\u80FD\u63A5\u7740\u51FA\u73B0\u54EA\u53E5\uFF1F",
      options: [
        "\u6536\u5230\uFF0C\u6211\u4F1A\u5C3D\u5FEB\u67E5\u627E\u5E76\u4E0A\u4F20\u76F8\u5173\u7167\u7247\u3002",
        "\u5EFA\u8BAE\u5927\u5BB6\u5728\u76F8\u518C\u4E2D\u6309\u65F6\u95F4\u8303\u56F4\u8FDB\u884C\u68C0\u7D22\u3002",
        "\u627E\u5230\u4E86 \u4F46\u662F\u7CCA\u5F97\u4E00\u6279\u{1F602} \u4F60\u5148\u51D1\u5408"
      ],
      answer: 2,
      tell: "\u771F\u4EBA\u4EA4\u4ED8\u4E1C\u897F\u65F6\u4F1A\u5148\u6253\u4E2A\u9884\u9632\u9488\u3002",
      explain: "\u300C\u7CCA\u5F97\u4E00\u6279\u300D\u662F\u5BF9\u81EA\u5DF1\u4EA4\u4ED8\u8D28\u91CF\u7684\u8C03\u4F83\uFF0C\u53EA\u6709\u771F\u7FFB\u4E86\u76F8\u518C\u7684\u4EBA\u8BF4\u5F97\u51FA\u6765\u3002\u53E6\u4E24\u53E5\u662F\u4EFB\u52A1\u8BA4\u9886\u6A21\u677F\u3002"
    }
  ];
  function questionsOfGroup(group) {
    return QUESTIONS.filter((q) => q.group === group);
  }
  function findQuestion(id) {
    return QUESTIONS.find((q) => q.id === id);
  }
  function dailyQuestions(date = /* @__PURE__ */ new Date()) {
    const seed = date.getFullYear() * 1e4 + (date.getMonth() + 1) * 100 + date.getDate();
    let s = seed >>> 0;
    const rnd = () => {
      s = Math.imul(s, 1664525) + 1013904223 >>> 0;
      return s / 4294967296;
    };
    const arr = QUESTIONS.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr.slice(0, 8);
  }
  var HUMAN_TAGS = {
    f1: "\u53EA\u63A5\u8DDF\u81EA\u5DF1\u6709\u5173\u7684\u90A3\u534A\u53E5",
    f2: "\u77ED\u63A8\u8131\uFF0C\u4E0D\u89E3\u91CA",
    f3: "\u987A\u7740\u4E0A\u6587\u8D77\u54C4",
    f4: "\u5148\u6577\u884D\u5E94\u4E00\u58F0",
    f5: "\u9519\u4F4D\u63A5\u8BDD\uFF0C\u56DE\u7684\u4E0D\u662F\u63D0\u95EE\u8005",
    f6: "\u8BF4\u4E00\u534A\u53C8\u54BD\u56DE\u53BB",
    f7: "\u76F4\u63A5\u63A8\u7FFB\u522B\u4EBA\u7684\u5B89\u6392",
    f8: "\u8BDD\u9898\u88AB\u8F7B\u8F7B\u5E26\u8DD1",
    w1: "\u8BA4\u6002\u4F46\u5E26\u70B9\u65E0\u5948",
    w2: "\u5177\u4F53\u5230\u4E0D\u80FD\u518D\u5177\u4F53\u7684\u7406\u7531",
    w3: "\u5F15\u7528\u539F\u8BDD\u558A\u51A4",
    w4: "\u8FDE\u7EED\u95EE\u53F7 + \u534A\u622A\u8BDD",
    w5: "\u63A5\u9F99\u53EA\u8865\u81EA\u5DF1\u90A3\u6761",
    w6: "\u628A\u6D88\u606F\u62C9\u56DE\u5177\u4F53\u884C\u52A8",
    w7: "\u8BA4\u547D\u4E86\u8FD8\u8981\u62C9\u4E2A\u540C\u4F34",
    w8: "\u53EA\u8865\u81EA\u5DF1\u90A3\u4E00\u676F",
    c1: "\u7FFB\u65E7\u8D26",
    c2: "\u4E34\u65F6\u6539\u4E3B\u610F",
    c3: "\u987A\u624B\u7ED9\u5B89\u6392\u987A\u624B\u5410\u69FD",
    c4: "\u606D\u559C\u989D\u5EA6\u7528\u5B8C\u4E86",
    c5: "\u5148\u62B1\u6028\uFF0C\u624B\u8FD8\u662F\u70B9\u4E86",
    c6: "\u4E0D\u56DE\u5E94\u5185\u5BB9\uFF0C\u76F4\u63A5\u8D28\u7591\u6765\u6E90",
    c7: "\u5148\u53F9\u6C14\u518D\u95EE\u4E0B\u4E00\u53E5",
    c8: "\u4EA4\u4ED8\u524D\u5148\u6253\u9884\u9632\u9488"
  };
  function humanTag(q) {
    return HUMAN_TAGS[q.id] || q.tell;
  }

  // src/storage.ts
  var K_UNLOCK = "cp_unlocked";
  var K_BEST = "cp_best";
  var K_TOTAL = "cp_total";
  var K_DAILY = "cp_daily";
  var MAX_GROUP = 2;
  function todayKey(d = /* @__PURE__ */ new Date()) {
    const m = d.getMonth() + 1;
    const day = d.getDate();
    return `${d.getFullYear()}${m < 10 ? "0" : ""}${m}${day < 10 ? "0" : ""}${day}`;
  }
  var store = {
    unlocked() {
      const v = platform.getStore(K_UNLOCK, 0);
      return Math.min(MAX_GROUP, Math.max(0, v | 0));
    },
    unlock(group) {
      const g = Math.min(MAX_GROUP, group);
      if (g > this.unlocked()) platform.setStore(K_UNLOCK, g);
    },
    best() {
      return platform.getStore(K_BEST, 0) | 0;
    },
    total() {
      return platform.getStore(K_TOTAL, 0) | 0;
    },
    addTotal(n) {
      platform.setStore(K_TOTAL, this.total() + n);
    },
    submit(score) {
      if (score > this.best()) {
        platform.setStore(K_BEST, score);
        platform.setCloudScore(score);
      }
    },
    dailyBest() {
      const m = platform.getStore(K_DAILY, {});
      return m && m[todayKey()] || 0;
    },
    setDailyBest(score) {
      const m = platform.getStore(K_DAILY, {}) || {};
      const key = todayKey();
      if (score > (m[key] || 0)) {
        m[key] = score;
        platform.setStore(K_DAILY, m);
      }
    }
  };

  // src/social.ts
  var DEMO = [
    { name: "\u963F\u73CD", score: 82 },
    { name: "\u5C0F\u674E", score: 74 },
    { name: "\u5927\u58EE", score: 63 }
  ];
  var friendRank = [];
  var rankRequested = false;
  var shareCanvas = null;
  function initRank() {
    if (!platform.isWx || rankRequested) return;
    rankRequested = true;
    try {
      wx.onMessage((msg) => {
        if (msg && msg.cmd === "rank" && Array.isArray(msg.list)) {
          friendRank = msg.list.slice(0, 5);
        }
      });
      wx.getOpenDataContext().postMessage({ cmd: "rank" });
    } catch (_) {
      friendRank = [];
    }
  }
  function rankRows() {
    const list = friendRank.slice();
    list.push({ name: "\u6211", score: store.best() });
    if (!friendRank.length) DEMO.forEach((d) => list.push(d));
    list.sort((a, b) => b.score - a.score);
    return list.slice(0, 4).map((r) => ({
      name: String(r.name).slice(0, 8),
      score: Number(r.score) || 0
    }));
  }
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
      grad.addColorStop(0, "#07C160");
      grad.addColorStop(1, "#04954A");
      c.fillStyle = grad;
      c.fillRect(0, 0, 500, 400);
      c.fillStyle = "rgba(255,255,255,0.08)";
      c.beginPath();
      c.arc(440, 50, 96, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.arc(56, 372, 128, 0, Math.PI * 2);
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
        c.fillStyle = "#07C160";
        c.fillText(badge, 64, 272);
      }
      c.font = '18px "PingFang SC", "Microsoft YaHei", sans-serif';
      c.fillStyle = "rgba(255,255,255,0.92)";
      c.textAlign = "center";
      c.fillText("\u8FD9\u8BDD\u63A5\u4E0D\u63A5 \xB7 \u5FAE\u4FE1\u5C0F\u6E38\u620F", 250, 350);
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
  var AVATAR_COLORS = ["#7B9BD1", "#E39D7A", "#8FBF9F", "#C79BC7", "#D9B35C", "#8AA8B8"];
  var K_GUIDE = "cp_guide_v2";
  function colorOf(name) {
    let h = 0;
    for (const ch of name) h = h * 31 + ch.charCodeAt(0) | 0;
    return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
  }
  function bubbleLines(ui2, q) {
    ui2.c.font = '13px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    return q.messages.filter((m) => m.text.length > 0).map((m) => ({
      name: m.name,
      lines: wrapText(ui2.c, m.text, 226),
      self: m.name === "\u6211" || !!m.self
    }));
  }
  function drawChat(ui2, q, x, y, w, h) {
    const c = ui2.c;
    ui2.panel(x, y, w, h, 10, C.card);
    ui2.text(q.scene, x + w / 2, y + 7, { size: 11, color: C.sub, align: "center" });
    ui2.line(x + 10, y + 27, x + w - 10, y + 27, "#F0F0F0");
    const rows = bubbleLines(ui2, q);
    let cy = y + 36;
    let prevName = "";
    const maxBottom = y + h - 8;
    for (const row of rows) {
      const showName = row.name !== prevName;
      const nameH = showName ? 15 : 0;
      const bubbleH = row.lines.length * 19 + 14;
      const rowH = nameH + bubbleH + 7;
      if (cy + rowH > maxBottom) break;
      let bw = 0;
      for (const ln of row.lines) bw = Math.max(bw, ui2.measure(ln, 13));
      bw = Math.min(240, bw + 20);
      const avatarX = row.self ? x + w - 12 - 30 : x + 12;
      const bubbleX = row.self ? avatarX - 8 - bw : avatarX + 38;
      ui2.panel(avatarX, cy + nameH, 30, 30, 5, colorOf(row.name));
      ui2.text(row.name.slice(0, 1), avatarX + 15, cy + nameH + 7, {
        size: 14,
        color: "#FFFFFF",
        bold: true,
        align: "center"
      });
      if (showName) {
        if (row.self) ui2.text(row.name, avatarX - 8, cy, { size: 10, color: C.sub, align: "right" });
        else ui2.text(row.name, bubbleX, cy, { size: 10, color: C.sub });
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
        ui2.text(ln, bubbleX + 10, by + 7 + i * 19, { size: 13, color: C.ink });
      });
      cy += rowH;
      prevName = row.name;
    }
  }
  var Game = class {
    constructor(ui2) {
      this.ui = ui2;
      this.mode = "title";
      this.group = 0;
      this.index = 0;
      this.correct = 0;
      this.wrong = 0;
      this.streak = 0;
      this.maxStreak = 0;
      this.chosen = -1;
      this.eliminated = -1;
      this.helpChosen = -1;
      this.helpQid = null;
      this.guideVisible = false;
      this.list = questionsOfGroup(0);
      this.label = GROUPS[0].name;
      this.isDaily = false;
      const q = platform.getLaunchQuery();
      const helpId = typeof q.help === "string" ? q.help : "";
      if (helpId && findQuestion(helpId)) {
        this.helpQid = helpId;
        this.mode = "help";
      }
      this.guideVisible = !platform.getStore(K_GUIDE, false);
      initRank();
    }
    currentQuestion() {
      if (this.mode === "help") return this.helpQid ? findQuestion(this.helpQid) : void 0;
      return this.list[this.index];
    }
    /** 右上角转发与按钮分享共用同一份配置，自动带分享卡片图 */
    sharePayload() {
      const q = this.currentQuestion();
      const title = this.mode === "help" ? "\u8FD9\u53E5\u5230\u5E95\u54EA\u53E5\u50CF\u4EBA\u8BDD\uFF1F\u6765\u5E2E\u6211\u6295\u4E00\u7968" : q ? "\u7FA4\u91CC\u4E09\u53E5\u8BDD\uFF0C\u54EA\u53E5\u662F\u4EBA\u8BDD\uFF1F\u5E2E\u6211\u6295\u4E00\u7968" : "\u8FD9\u8BDD\u63A5\u4E0D\u63A5 \xB7 \u5FAE\u4FE1\u7FA4\u804A\u63A8\u7406";
      return {
        title,
        query: q ? "help=" + q.id : "",
        imageUrl: shareImage(title, "\u770B\u804A\u5929\u8BB0\u5F55\uFF0C\u6311\u51FA\u771F\u4EBA\u4F1A\u63A5\u7684\u90A3\u53E5", `\u6211\u7684\u6700\u9AD8\u5206 ${store.best()}`)
      };
    }
    begin(list, label, isDaily) {
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
      this.mode = "play";
    }
    start(group) {
      const g = Math.min(GROUPS.length - 1, Math.max(0, group));
      this.group = g;
      this.begin(questionsOfGroup(g), GROUPS[g].name, false);
    }
    startDaily() {
      this.begin(dailyQuestions(), "\u6BCF\u65E5\u4E71\u6597", true);
    }
    resetQuestionState() {
      this.chosen = -1;
      this.eliminated = -1;
      this.helpChosen = -1;
    }
    applyEliminate() {
      const q = this.currentQuestion();
      if (!q) return;
      const wrongs = [0, 1, 2].filter((i) => i !== q.answer && i !== this.eliminated);
      if (wrongs.length) this.eliminated = wrongs[Math.floor(Math.random() * wrongs.length)];
    }
    hint() {
      if (this.chosen >= 0) return;
      if (this.eliminated >= 0) {
        platform.toast("\u8FD9\u4E00\u9898\u7684\u63D0\u793A\u5DF2\u7ECF\u7528\u8FC7\u4E86");
        return;
      }
      platform.rewardedAd((ok) => {
        if (!ok) {
          platform.toast("\u6CA1\u770B\u5B8C\uFF0C\u63D0\u793A\u6CA1\u53D1\u653E");
          return;
        }
        this.applyEliminate();
        platform.toast("\u5DF2\u5212\u6389\u4E00\u4E2A\u4E0D\u50CF\u4EBA\u8BDD\u7684\u9009\u9879");
      });
    }
    askHelp() {
      const q = this.currentQuestion();
      if (!q) return;
      platform.share(__spreadProps(__spreadValues({}, this.sharePayload()), {
        title: "\u8FD9\u53E5\u5230\u5E95\u54EA\u53E5\u50CF\u4EBA\u8BDD\uFF1F\u6765\u5E2E\u6211\u6295\u4E00\u7968"
      }));
      if (this.eliminated < 0) {
        this.applyEliminate();
        platform.toast("\u5DF2\u53D1\u51FA\u6C42\u52A9\uFF0C\u5148\u5E2E\u4F60\u5212\u6389\u4E00\u4E2A\u9519\u8BEF\u9879");
      }
    }
    choose(i) {
      if (this.chosen >= 0 || this.helpChosen >= 0) return;
      if (i === this.eliminated) return;
      const q = this.currentQuestion();
      if (!q) return;
      if (this.mode === "help") {
        this.helpChosen = i;
        return;
      }
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
    next() {
      if (this.index + 1 >= this.list.length) {
        store.addTotal(this.list.length);
        const score = this.correct * 10 + this.maxStreak;
        store.submit(score);
        if (this.isDaily) store.setDailyBest(score);
        else if (this.correct >= 6) store.unlock(this.group + 1);
        this.mode = "result";
        return;
      }
      this.index++;
      this.resetQuestionState();
    }
    draw() {
      switch (this.mode) {
        case "title":
          this.drawTitle();
          break;
        case "play":
          this.drawPlay();
          break;
        case "result":
          this.drawResult();
          break;
        case "help":
          this.drawHelp();
          break;
      }
      if (this.guideVisible) this.drawGuide();
    }
    // ---------------- 首页 ----------------
    drawTitle() {
      const ui2 = this.ui;
      ui2.navBar("\u8FD9\u8BDD\u63A5\u4E0D\u63A5");
      ui2.text("\u7FA4\u91CC\u4E09\u53E5\u8BDD", DESIGN_W / 2, 100, { size: 30, bold: true, align: "center" });
      ui2.text("\u54EA\u53E5\u662F\u4EBA\u8BDD\uFF1F", DESIGN_W / 2, 142, { size: 30, bold: true, color: C.green, align: "center" });
      ui2.text("\u4ECE\u804A\u5929\u8BB0\u5F55\u91CC\uFF0C\u6311\u51FA\u771F\u4EBA\u4F1A\u63A5\u7684\u90A3\u4E00\u53E5", DESIGN_W / 2, 190, {
        size: 12,
        color: C.sub,
        align: "center"
      });
      ui2.text(`\u6700\u9AD8\u5206 ${store.best()}  \xB7  \u7D2F\u8BA1\u7B54\u9898 ${store.total()}`, DESIGN_W / 2, 212, {
        size: 11,
        color: C.sub,
        align: "center"
      });
      ui2.text(`\u6BCF\u65E5\u4E71\u6597\u4ECA\u65E5\u6700\u4F73 ${store.dailyBest()}`, DESIGN_W / 2, 232, {
        size: 11,
        color: C.green,
        align: "center"
      });
      const unlocked = store.unlocked();
      GROUPS.forEach((g, i) => {
        const y = 256 + i * 66;
        const open = i <= unlocked;
        ui2.panel(20, y, DESIGN_W - 40, 58, 10, open ? C.card : "#E2E2E2");
        ui2.text(g.name, 34, y + 10, { size: 16, bold: true, color: open ? C.ink : "#9A9A9A" });
        ui2.text(open ? g.desc : "\u7B54\u5BF9\u4E0A\u4E00\u7EC4 6 \u9898\u89E3\u9501", 34, y + 34, {
          size: 11,
          color: open ? C.sub : "#A5A5A5"
        });
        ui2.text(open ? `${questionsOfGroup(i).length} \u9898 \u203A` : "\u{1F512}", DESIGN_W - 34, y + 20, {
          size: 13,
          color: open ? C.green : "#9A9A9A",
          bold: true,
          align: "right"
        });
        if (open) {
          ui2.regions.push({
            x: 20,
            y,
            w: DESIGN_W - 40,
            h: 58,
            fn: () => this.start(i),
            enabled: true
          });
        }
      });
      ui2.button(20, 464, DESIGN_W - 40, 44, "\u6BCF\u65E5\u4E71\u6597 \xB7 \u4ECA\u65E5 8 \u9898", () => this.startDaily(), "primary");
      ui2.text("\u8DE8\u4E09\u4E2A\u7FA4\u968F\u673A\u62BD\u9898\uFF0C\u6BCF\u5929\u4E00\u5957\uFF0C\u4E0D\u91CD\u590D", DESIGN_W / 2, 520, {
        size: 11,
        color: C.sub,
        align: "center"
      });
      ui2.text("\u770B\u4E00\u6B21\u5E7F\u544A\u5212\u6389\u4E00\u4E2A\u9519\u8BEF\u9879 \xB7 \u53D1\u7FA4\u91CC\u6C42\u6551\u4E5F\u80FD\u5212\u6389\u4E00\u4E2A", DESIGN_W / 2, 544, {
        size: 11,
        color: C.sub,
        align: "center",
        maxWidth: 330
      });
      ui2.text("\u597D\u53CB\u699C\u5728\u6210\u7EE9\u9875 \xB7 \u5FAE\u4FE1\u4FA7\u8BFB\u5F00\u653E\u6570\u636E\u57DF\uFF0C\u9884\u89C8\u7528\u6A21\u62DF\u6570\u636E", DESIGN_W / 2, 620, {
        size: 10,
        color: "#B0B0B0",
        align: "center",
        maxWidth: 340
      });
    }
    // ---------------- 答题 ----------------
    drawOptions(y0, isHelp) {
      const ui2 = this.ui;
      const q = this.currentQuestion();
      if (!q) return;
      const revealed = isHelp ? this.helpChosen >= 0 : this.chosen >= 0;
      const picked = isHelp ? this.helpChosen : this.chosen;
      const marks = ["A", "B", "C"];
      q.options.forEach((opt, i) => {
        const y = y0 + i * 67;
        const disabled = this.eliminated === i && !revealed;
        let fill = C.card;
        let stroke = C.line;
        let fg = C.ink;
        let prefix = marks[i] + "  ";
        if (disabled) {
          fill = "#F0F0F0";
          fg = "#B5B5B5";
        }
        if (revealed) {
          if (i === q.answer) {
            fill = C.greenPale;
            stroke = C.green;
            fg = C.greenDark;
            prefix = "\u221A  ";
          } else if (i === picked) {
            fill = C.redPale;
            stroke = C.red;
            fg = C.red;
            prefix = "\xD7  ";
          } else {
            fg = C.sub;
          }
        }
        ui2.panel(12, y, DESIGN_W - 24, 58, 9, fill);
        ui2.outlined(12, y, DESIGN_W - 24, 58, 9, stroke, 1);
        ui2.text(prefix, 24, y + 19, { size: 14, bold: true, color: revealed && i === q.answer ? C.green : C.sub });
        ui2.text(opt, 48, y + 10, { size: 13, color: fg, maxWidth: 290, lineHeight: 19 });
        if (disabled) ui2.line(20, y + 29, DESIGN_W - 20, y + 29, "#C8C8C8");
        ui2.regions.push({
          x: 12,
          y,
          w: DESIGN_W - 24,
          h: 58,
          fn: () => this.choose(i),
          enabled: !revealed && !disabled
        });
      });
    }
    drawExplainOverlay() {
      const ui2 = this.ui;
      const q = this.currentQuestion();
      if (!q || this.chosen < 0) return;
      const ok = this.chosen === q.answer;
      const body = (ok ? "\u5224\u65AD\u5BF9\u4E86\u3002" : "\u8FD9\u9898\u8E29\u5751\u4E86\u3002") + q.explain;
      ui2.c.font = '13px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
      let lines = wrapText(ui2.c, body, 276);
      if (lines.length > 8) lines = lines.slice(0, 8).concat(["\u2026"]);
      const cardH = Math.min(520, 96 + lines.length * 21 + 62);
      const y = Math.max(40, (DESIGN_H - cardH) / 2);
      ui2.dim();
      ui2.regions.push({ x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, fn: () => {
      }, enabled: true });
      ui2.panel(24, y, DESIGN_W - 48, cardH, 14, C.card);
      ui2.text(ok ? "\u221A  \u63A5\u4F4F\u4E86" : "\xD7  \u4E0D\u50CF\u4EBA\u8BDD", 40, y + 18, {
        size: 19,
        bold: true,
        color: ok ? C.green : C.red
      });
      ui2.text(
        `\u6B63\u786E\u7B54\u6848 ${["A", "B", "C"][q.answer]}  \xB7  \u4EBA\u5473\u7279\u5F81\uFF1A${humanTag(q)}`,
        40,
        y + 48,
        { size: 11, color: C.greenDark, maxWidth: 290, lineHeight: 15 }
      );
      ui2.text(body, 40, y + 84, { size: 13, color: C.ink, maxWidth: 276, lineHeight: 21 });
      ui2.button(
        40,
        y + cardH - 54,
        DESIGN_W - 80,
        40,
        this.index + 1 >= this.list.length ? "\u770B\u672C\u8F6E\u6210\u7EE9" : "\u4E0B\u4E00\u9898",
        () => this.next()
      );
    }
    drawPlay() {
      const ui2 = this.ui;
      const q = this.currentQuestion();
      if (!q) {
        this.mode = "title";
        return;
      }
      const total = this.list.length;
      ui2.navBar(this.label, () => {
        this.mode = "title";
      });
      ui2.text(`${this.index + 1} / ${total}`, DESIGN_W / 2, 52, {
        size: 11,
        color: C.sub,
        align: "center"
      });
      ui2.text(`\u8FDE\u5BF9 ${this.streak}`, DESIGN_W - 14, 52, {
        size: 11,
        color: C.green,
        align: "right"
      });
      drawChat(ui2, q, 12, 68, DESIGN_W - 24, 234);
      ui2.text(q.prompt, 14, 312, { size: 13, bold: true, color: C.ink, maxWidth: 347 });
      this.drawOptions(340, false);
      ui2.button(12, 556, 170, 42, "\u770B\u5E7F\u544A\u6362\u63D0\u793A", () => this.hint(), "ghost", this.chosen < 0 && this.eliminated < 0, 13);
      ui2.button(193, 556, 170, 42, "\u53D1\u7FA4\u91CC\u6C42\u6551", () => this.askHelp(), "plain", this.chosen < 0, 13);
      ui2.text("\u597D\u53CB\u70B9\u94FE\u63A5\u8FDB\u6765\u6295\u4E00\u7968\uFF0C\u4E0D\u4F1A\u66FF\u4F60\u901A\u5173", DESIGN_W / 2, 610, {
        size: 10,
        color: C.sub,
        align: "center",
        maxWidth: 340
      });
      ui2.text("\u7EBF\u7D22\uFF1A" + q.tell, 14, 630, { size: 10, color: C.sub, maxWidth: 347, lineHeight: 14 });
      this.drawExplainOverlay();
    }
    // ---------------- 成绩 + 好友榜 ----------------
    drawResult() {
      const ui2 = this.ui;
      const total = this.list.length;
      ui2.navBar("\u672C\u8F6E\u6210\u7EE9");
      ui2.panel(20, 74, DESIGN_W - 40, 250, 14, C.card);
      ui2.text(this.isDaily ? "\u6BCF\u65E5\u4E71\u6597 \xB7 \u4ECA\u65E5\u7B54\u5BF9" : "\u672C\u8F6E\u7B54\u5BF9", DESIGN_W / 2, 88, {
        size: 12,
        color: C.sub,
        align: "center"
      });
      ui2.text(`${this.correct} / ${total}`, DESIGN_W / 2, 110, {
        size: 42,
        bold: true,
        color: C.green,
        align: "center"
      });
      const unlockedNow = this.correct >= 6;
      ui2.text(
        this.isDaily ? `\u672C\u8F6E\u5F97\u5206 ${this.correct * 10 + this.maxStreak} \xB7 \u4ECA\u65E5\u6700\u4F73 ${store.dailyBest()}` : unlockedNow ? "\u8FC7\u5173 \xB7 \u4E0B\u4E00\u7EC4\u5DF2\u89E3\u9501" : "\u5DEE\u4E00\u70B9 \xB7 \u7B54\u5BF9 6 \u9898\u5373\u53EF\u89E3\u9501\u4E0B\u4E00\u7EC4",
        DESIGN_W / 2,
        164,
        {
          size: 12,
          color: this.isDaily ? C.sub : unlockedNow ? C.green : C.warn,
          align: "center"
        }
      );
      ui2.line(40, 192, DESIGN_W - 40, 192);
      const rows = [
        ["\u6700\u9AD8\u8FDE\u5BF9", `${this.maxStreak} \u9898`],
        ["\u7B54\u9519", `${this.wrong} \u9898`],
        ["\u5386\u53F2\u6700\u9AD8\u5206", `${store.best()}`],
        ["\u7D2F\u8BA1\u7B54\u9898", `${store.total()} \u9898`]
      ];
      rows.forEach((r, i) => {
        const y = 200 + i * 26;
        ui2.text(r[0], 40, y, { size: 13, color: C.sub });
        ui2.text(r[1], DESIGN_W - 40, y, { size: 13, bold: true, align: "right" });
      });
      ui2.panel(20, 334, DESIGN_W - 40, 136, 14, C.card);
      ui2.text("\u597D\u53CB\u699C", 36, 344, { size: 13, bold: true });
      ui2.text(platform.isWx ? "\u6258\u7BA1\u6570\u636E" : "\u9884\u89C8\u6A21\u62DF", DESIGN_W - 36, 346, {
        size: 10,
        color: C.sub,
        align: "right"
      });
      rankRows().forEach((row, i) => {
        const y = 368 + i * 24;
        const me = row.name === "\u6211";
        ui2.text(`${i + 1}`, 36, y, { size: 12, color: me ? C.green : C.sub, bold: me });
        ui2.text(row.name, 62, y, { size: 12, color: me ? C.greenDark : C.ink, bold: me });
        ui2.text(`${row.score}`, DESIGN_W - 36, y, {
          size: 12,
          color: me ? C.green : C.sub,
          bold: me,
          align: "right"
        });
      });
      const hasNext = !this.isDaily && this.group < GROUPS.length - 1 && unlockedNow;
      ui2.button(
        20,
        482,
        DESIGN_W - 40,
        42,
        this.isDaily ? "\u91CD\u505A\u4ECA\u65E5 8 \u9898" : hasNext ? "\u6311\u6218\u4E0B\u4E00\u7EC4" : "\u518D\u6765\u4E00\u8F6E",
        () => {
          if (this.isDaily) this.startDaily();
          else this.start(hasNext ? this.group + 1 : this.group);
        }
      );
      const half = (DESIGN_W - 52) / 2;
      ui2.button(20, 534, half, 40, "\u5206\u4EAB\u6218\u7EE9", () => {
        const title = `\u6211\u5728\u300A\u8FD9\u8BDD\u63A5\u4E0D\u63A5\u300B\u7B54\u5BF9\u4E86 ${this.correct}/${total} \u9898\uFF0C\u6765\u8BD5\u8BD5\uFF1F`;
        platform.share({
          title,
          query: "",
          imageUrl: shareImage(title, "\u4E09\u4E2A\u7FA4\u300124 \u9053\u9898\uFF0C\u4F60\u80FD\u5168\u5BF9\u5417", `\u672C\u8F6E ${this.correct}/${total}`)
        });
      }, "ghost");
      ui2.button(20 + half + 12, 534, half, 40, "\u56DE\u9996\u9875", () => {
        this.mode = "title";
      }, "plain");
      ui2.text("\u5206\u6570\u8D8A\u9AD8\u6392\u540D\u8D8A\u524D \xB7 \u6258\u7BA1\u5206\u6570\u5199\u5165\u540E\u624D\u4F1A\u5728\u597D\u53CB\u699C\u51FA\u73B0", DESIGN_W / 2, 598, {
        size: 10,
        color: "#B0B0B0",
        align: "center",
        maxWidth: 340
      });
    }
    // ---------------- 好友帮答 ----------------
    drawHelp() {
      const ui2 = this.ui;
      const q = this.currentQuestion();
      if (!q) {
        this.mode = "title";
        return;
      }
      ui2.navBar("\u5E2E\u597D\u53CB\u6295\u4E00\u7968", () => {
        this.mode = "title";
      });
      ui2.text("\u597D\u53CB\u5361\u5728\u8FD9\u4E00\u9898\uFF0C\u4F60\u89C9\u5F97\u54EA\u53E5\u662F\u4EBA\u8BDD\uFF1F", DESIGN_W / 2, 54, {
        size: 12,
        color: C.sub,
        align: "center"
      });
      drawChat(ui2, q, 12, 78, DESIGN_W - 24, 226);
      ui2.text(q.prompt, 14, 314, { size: 13, bold: true, maxWidth: 347 });
      this.drawOptions(340, true);
      if (this.helpChosen >= 0) {
        const ok = this.helpChosen === q.answer;
        ui2.panel(12, 548, DESIGN_W - 24, 32, 8, ok ? C.greenPale : C.redPale);
        ui2.text(
          ok ? `\u221A \u6295\u5BF9\u4E86\uFF0C\u5C31\u662F ${["A", "B", "C"][q.answer]}` : `\xD7 \u6295\u9519\u4E86\uFF0C\u6B63\u786E\u7684\u662F ${["A", "B", "C"][q.answer]}`,
          DESIGN_W / 2,
          557,
          { size: 13, bold: true, color: ok ? C.greenDark : C.red, align: "center" }
        );
        ui2.text(`\u4EBA\u5473\u7279\u5F81\uFF1A${humanTag(q)} \xB7 ${q.tell}`, 14, 588, {
          size: 10,
          color: C.sub,
          maxWidth: 347,
          lineHeight: 14
        });
        ui2.button(12, 622, DESIGN_W - 24, 38, "\u6211\u4E5F\u6765\u4E00\u5C40", () => this.start(q.group));
      } else {
        ui2.text("\u4F60\u7684\u9009\u62E9\u53EA\u5E2E\u4F60\u5224\u65AD\u5BF9\u9519\uFF0C\u4E0D\u4F1A\u66FF\u597D\u53CB\u901A\u5173", DESIGN_W / 2, 570, {
          size: 11,
          color: C.sub,
          align: "center"
        });
        ui2.button(12, 610, DESIGN_W - 24, 42, "\u6211\u81EA\u5DF1\u4E5F\u6765\u4E00\u5C40", () => this.start(q.group), "ghost");
      }
    }
    // ---------------- 首次引导 ----------------
    drawGuide() {
      const ui2 = this.ui;
      ui2.dim();
      ui2.regions.push({ x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, fn: () => {
      }, enabled: true });
      ui2.panel(28, 168, DESIGN_W - 56, 320, 16, C.card);
      ui2.text("\u600E\u4E48\u73A9", DESIGN_W / 2, 188, { size: 22, bold: true, align: "center" });
      ui2.text("\u770B\u4E00\u6BB5\u5FAE\u4FE1\u7FA4\u804A\uFF0C\u4ECE\u4E09\u53E5\u8BDD\u91CC\u6311\u51FA", 48, 234, { size: 13, color: C.ink });
      ui2.text("\u771F\u4EBA\u4F1A\u63A5\u7684\u90A3\u4E00\u53E5\u3002", 48, 254, { size: 13, color: C.ink });
      ui2.line(48, 284, DESIGN_W - 48, 284);
      const tips = [
        "\u2460 \u771F\u4EBA\u7231\u7701\u7565\u3001\u8DD1\u9898\u3001\u53EA\u63A5\u8DDF\u81EA\u5DF1\u6709\u5173\u7684\u90A3\u534A\u53E5",
        "\u2461 \u5E72\u6270\u9879\u901A\u5E38\u793C\u8C8C\u8FC7\u5EA6\u3001\u590D\u8FF0\u4FE1\u606F\u3001\u50CF\u5BA2\u670D\u8BDD\u672F",
        "\u2462 \u5361\u4F4F\u53EF\u4EE5\u770B\u5E7F\u544A\u5212\u6389\u4E00\u4E2A\uFF0C\u6216\u53D1\u7FA4\u91CC\u8BA9\u597D\u53CB\u6295\u4E00\u7968"
      ];
      tips.forEach((t, i) => {
        ui2.text(t, 48, 298 + i * 40, { size: 12, color: C.sub, maxWidth: 278, lineHeight: 17 });
      });
      ui2.button(48, 428, DESIGN_W - 96, 42, "\u5F00\u59CB", () => {
        this.guideVisible = false;
        platform.setStore(K_GUIDE, true);
      });
    }
  };

  // src/main.ts
  var ui = new UI(() => platform.ctx);
  var game = new Game(ui);
  platform.onTouch((x, y, phase) => {
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
