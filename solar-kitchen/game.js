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
      c.fillStyle = "#2A1F18";
      c.fillRect(0, 0, this.canvas.width, this.canvas.height);
      c.setTransform(
        this.dpr * this.scale,
        0,
        0,
        this.dpr * this.scale,
        this.dpr * this.offX,
        this.dpr * this.offY
      );
      c.fillStyle = "#FDF8F1";
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
    bg: "#FDF8F1",
    card: "#FFFFFF",
    green: "#C86B3C",
    greenDark: "#9E4F2A",
    greenPale: "#FBEDE3",
    ink: "#2E241C",
    sub: "#8C7B6B",
    line: "#EFE5D8",
    red: "#C0392B",
    redPale: "#FBEAE7",
    blue: "#576B95",
    warn: "#D99A2B",
    warnPale: "#FFF4DF",
    soil: "#C9A77C",
    soilDark: "#9C7A52",
    overlay: "rgba(40,28,20,0.58)",
    field: "#3B2C22",
    fieldLine: "#4B3A2D",
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
      c.fillStyle = "#FAF5EC";
      c.fillRect(0, 0, DESIGN_W, 44);
      this.line(0, 44, DESIGN_W, 44, "#E9DCCB");
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
  var TERMS = [
    { name: "\u7ACB\u6625", season: "\u6625", ings: ["\u8360\u83DC", "\u6625\u7B0B", "\u97ED\u83DC"] },
    { name: "\u96E8\u6C34", season: "\u6625", ings: ["\u6625\u7B0B", "\u97ED\u9EC4", "\u83E0\u83DC"] },
    { name: "\u60CA\u86F0", season: "\u6625", ings: ["\u9999\u693F", "\u8C46\u82D7", "\u8C4C\u8C46"] },
    { name: "\u6625\u5206", season: "\u6625", ings: ["\u8360\u83DC", "\u8C46\u8150", "\u8C4C\u8C46"] },
    { name: "\u6E05\u660E", season: "\u6625", ings: ["\u9999\u693F", "\u6625\u7B0B", "\u827E\u8349"] },
    { name: "\u8C37\u96E8", season: "\u6625", ings: ["\u8C4C\u8C46", "\u8695\u8C46", "\u83E0\u83DC"] },
    { name: "\u7ACB\u590F", season: "\u590F", ings: ["\u8695\u8C46", "\u9EC4\u74DC", "\u82CB\u83DC"] },
    { name: "\u5C0F\u6EE1", season: "\u590F", ings: ["\u9EC4\u74DC", "\u82E6\u74DC", "\u6BDB\u8C46"] },
    { name: "\u8292\u79CD", season: "\u590F", ings: ["\u4E1D\u74DC", "\u6BDB\u8C46", "\u8304\u5B50"] },
    { name: "\u590F\u81F3", season: "\u590F", ings: ["\u4E1D\u74DC", "\u897F\u74DC", "\u8377\u53F6"] },
    { name: "\u5C0F\u6691", season: "\u590F", ings: ["\u83B2\u85D5", "\u7EFF\u8C46", "\u82E6\u74DC"] },
    { name: "\u5927\u6691", season: "\u590F", ings: ["\u51AC\u74DC", "\u8377\u53F6", "\u7EFF\u8C46"] },
    { name: "\u7ACB\u79CB", season: "\u79CB", ings: ["\u83B2\u85D5", "\u5C71\u836F", "\u79CB\u8475"] },
    { name: "\u5904\u6691", season: "\u79CB", ings: ["\u5C71\u836F", "\u767E\u5408", "\u94F6\u8033"] },
    { name: "\u767D\u9732", season: "\u79CB", ings: ["\u677F\u6817", "\u5C71\u836F", "\u94F6\u8033"] },
    { name: "\u79CB\u5206", season: "\u79CB", ings: ["\u5357\u74DC", "\u677F\u6817", "\u67FF\u5B50"] },
    { name: "\u5BD2\u9732", season: "\u79CB", ings: ["\u5357\u74DC", "\u67FF\u5B50", "\u767E\u5408"] },
    { name: "\u971C\u964D", season: "\u79CB", ings: ["\u67FF\u5B50", "\u767D\u841D\u535C", "\u677F\u6817"] },
    { name: "\u7ACB\u51AC", season: "\u51AC", ings: ["\u767D\u83DC", "\u767D\u841D\u535C", "\u7F8A\u8089"] },
    { name: "\u5C0F\u96EA", season: "\u51AC", ings: ["\u767D\u83DC", "\u51AC\u7B0B", "\u7EA2\u67A3"] },
    { name: "\u5927\u96EA", season: "\u51AC", ings: ["\u7F8A\u8089", "\u767D\u841D\u535C", "\u7CEF\u7C73"] },
    { name: "\u51AC\u81F3", season: "\u51AC", ings: ["\u7F8A\u8089", "\u51AC\u7B0B", "\u7CEF\u7C73"] },
    { name: "\u5C0F\u5BD2", season: "\u51AC", ings: ["\u7EA2\u67A3", "\u7CEF\u7C73", "\u5C71\u836F"] },
    { name: "\u5927\u5BD2", season: "\u51AC", ings: ["\u767D\u83DC", "\u7EA2\u67A3", "\u7F8A\u8089"] }
  ];
  var SEASON_COLOR = {
    \u6625: "#7FAF5E",
    \u590F: "#D9A33B",
    \u79CB: "#C4703C",
    \u51AC: "#6E8FA8"
  };
  var VERBS = ["\u6E05\u7092", "\u6162\u7096", "\u51C9\u62CC", "\u7168\u6C64", "\u5C0F\u7092", "\u7116"];
  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h);
  }
  function dishOf(termIdx, order) {
    const t = TERMS[clampInt(termIdx, 0, TERMS.length - 1)];
    const pairs = [
      [t.ings[0], t.ings[1]],
      [t.ings[1], t.ings[2]],
      [t.ings[0], t.ings[2]]
    ];
    const need = pairs[clampInt(order, 0, 2)];
    const h = hashStr(need[0] + need[1] + t.name);
    const verb = VERBS[h % VERBS.length];
    const price = Math.round((12 + termIdx * 2) * (1 + h % 5 * 0.06));
    return { name: `${verb}${need[0]}${need[1]}`, need, price };
  }
  var PERFECT_HALF = 0.06;
  var GOOD_HALF = 0.2;
  function judgeHeat(pos) {
    const d = Math.abs(clamp01(pos) - 0.5);
    if (d <= PERFECT_HALF + 1e-9) return "perfect";
    if (d <= GOOD_HALF + 1e-9) return "good";
    return "burnt";
  }
  var QUALITY_LABEL = {
    perfect: "\u706B\u5019\u521A\u597D",
    good: "\u8FD8\u884C",
    burnt: "\u7CCA\u4E86"
  };
  var QUALITY_STARS = {
    perfect: 3,
    good: 2,
    burnt: 1
  };
  function rewardOf(price, q) {
    if (q === "perfect") return Math.ceil(price * 1.6);
    if (q === "good") return price;
    return Math.max(1, Math.ceil(price * 0.4));
  }
  function potMatches(pot, dish) {
    if (pot.length !== 2) return false;
    const a = pot.slice().sort().join("|");
    const b = dish.need.slice().sort().join("|");
    return a === b;
  }
  function heatTick(pos, dir, speed, dtSec) {
    let p = pos + dir * speed * Math.max(0, dtSec);
    let d = dir >= 0 ? 1 : -1;
    if (p > 1) {
      p = 2 - p;
      d = -1;
    }
    if (p < 0) {
      p = -p;
      d = 1;
    }
    return { pos: clamp01(p), dir: d };
  }
  function heatSpeed(termIdx, year) {
    return 0.55 + Math.min(0.5, termIdx * 0.02) + Math.min(0.6, year * 0.15);
  }
  function createState(best = 0) {
    const term = best % TERMS.length;
    return {
      term,
      year: Math.floor(best / TERMS.length),
      order: 0,
      pot: [],
      money: 0,
      stars: 0,
      served: 0,
      phase: "cook",
      quality: null,
      lastReward: 0,
      best
    };
  }
  function currentDish(s) {
    return dishOf(s.term, s.order);
  }
  function putIngredient(s, ing) {
    if (s.phase !== "cook") return false;
    if (s.pot.includes(ing)) return false;
    if (s.pot.length >= 2) return false;
    s.pot.push(ing);
    return true;
  }
  function clearPot(s) {
    if (s.phase !== "cook") return;
    s.pot = [];
  }
  function startCooking(s) {
    if (s.phase !== "cook") return false;
    if (!potMatches(s.pot, currentDish(s))) return false;
    s.phase = "heat";
    s.quality = null;
    return true;
  }
  function finishHeat(s, pos) {
    const q = judgeHeat(pos);
    const dish = currentDish(s);
    const reward = rewardOf(dish.price, q);
    s.quality = q;
    s.lastReward = reward;
    s.money += reward;
    s.stars += QUALITY_STARS[q];
    s.served += 1;
    s.phase = "result";
    return q;
  }
  function nextOrder(s) {
    s.pot = [];
    s.quality = null;
    s.lastReward = 0;
    if (s.order >= 2) {
      s.phase = "cook";
      return { termDone: true };
    }
    s.order += 1;
    s.phase = "cook";
    return { termDone: false };
  }
  function nextTerm(s) {
    s.term += 1;
    if (s.term >= TERMS.length) {
      s.term = 0;
      s.year += 1;
    }
    s.order = 0;
    s.pot = [];
    s.phase = "cook";
    s.quality = null;
    s.lastReward = 0;
    s.best = Math.max(s.best, s.year * TERMS.length + s.term);
  }
  function termLabel(s) {
    return `${TERMS[s.term].name} \xB7 \u7B2C ${s.year + 1} \u5E74`;
  }
  function encodeShare(s) {
    return [s.term, Math.min(99, s.year), Math.min(999999, s.money)].join("~");
  }
  function decodeShare(raw) {
    if (typeof raw !== "string" || raw.length > 24) return null;
    const parts = raw.split("~");
    if (parts.length !== 3) return null;
    const nums = parts.map((v) => Number(v));
    if (!nums.every((n) => Number.isInteger(n) && n >= 0)) return null;
    const [term, year, money] = nums;
    if (term >= TERMS.length || year > 99 || money > 999999) return null;
    return { term, year, money };
  }
  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }
  function clampInt(v, lo, hi) {
    return Math.max(lo, Math.min(hi, Math.round(v)));
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
  function hash(name) {
    let h = 2166136261;
    for (let i = 0; i < name.length; i++) {
      h ^= name.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h);
  }
  var ING_COLORS = [
    "#7FAF5E",
    "#D9A33B",
    "#C4703C",
    "#8FBF7A",
    "#B8865A",
    "#D98C8C",
    "#9BB86A",
    "#C9A227",
    "#6E9E8A"
  ];
  function ingColor(name) {
    return ING_COLORS[hash(name) % ING_COLORS.length];
  }
  function drawIngredient(c, x, y, s, name) {
    const color = ingColor(name);
    const kind = hash(name) % 3;
    c.save();
    c.translate(x, y);
    if (kind === 0) {
      c.save();
      c.rotate(-0.35);
      c.beginPath();
      c.moveTo(0, s * 0.5);
      c.quadraticCurveTo(-s * 0.62, 0, 0, -s * 0.55);
      c.quadraticCurveTo(s * 0.62, 0, 0, s * 0.5);
      c.fillStyle = color;
      c.fill();
      c.beginPath();
      c.moveTo(0, s * 0.45);
      c.lineTo(0, -s * 0.45);
      c.strokeStyle = "rgba(255,255,255,0.55)";
      c.lineWidth = Math.max(1, s * 0.06);
      c.stroke();
      c.restore();
    } else if (kind === 1) {
      c.beginPath();
      c.moveTo(0, -s * 0.5);
      c.quadraticCurveTo(s * 0.34, s * 0.1, s * 0.06, s * 0.52);
      c.quadraticCurveTo(-s * 0.3, s * 0.12, 0, -s * 0.5);
      c.fillStyle = color;
      c.fill();
      c.strokeStyle = "rgba(255,255,255,0.4)";
      c.lineWidth = Math.max(1, s * 0.05);
      c.beginPath();
      c.moveTo(s * 0.04, s * 0.3);
      c.lineTo(s * 0.3, s * 0.5);
      c.stroke();
    } else {
      circ(c, 0, s * 0.06, s * 0.42, color);
      circ(c, -s * 0.14, -s * 0.08, s * 0.12, "rgba(255,255,255,0.5)");
      rect(c, -s * 0.05, -s * 0.5, s * 0.1, s * 0.14, "#5F7A45");
    }
    c.restore();
  }
  function drawPot(c, x, y, w, h, t) {
    c.save();
    c.beginPath();
    c.moveTo(x - w / 2, y - h / 2);
    c.lineTo(x + w / 2, y - h / 2);
    c.quadraticCurveTo(x + w / 2 - 6, y + h / 2, x, y + h / 2);
    c.quadraticCurveTo(x - w / 2 + 6, y + h / 2, x - w / 2, y - h / 2);
    c.closePath();
    c.fillStyle = "#4A382B";
    c.fill();
    rect(c, x - w / 2 - 12, y - h / 2 + 4, 12, 7, "#3A2C22");
    rect(c, x + w / 2, y - h / 2 + 4, 12, 7, "#3A2C22");
    c.save();
    c.translate(x, y - h / 2);
    c.scale(1, 7 / Math.max(6, w / 2 - 2));
    c.beginPath();
    c.arc(0, 0, w / 2 - 2, 0, Math.PI * 2);
    c.fillStyle = "#7A5A38";
    c.fill();
    c.restore();
    c.restore();
    for (let i = 0; i < 3; i++) {
      const ph = (t / 700 + i * 0.7) % 1;
      c.save();
      c.globalAlpha = 0.25 + (1 - ph) * 0.35;
      circ(c, x - w / 4 + i * (w / 4), y - h / 2 - ph * 10, 3 * (1 - ph * 0.4), "#F0D9B8");
      c.restore();
    }
  }
  function drawSteam(c, x, y, t) {
    c.save();
    c.strokeStyle = "rgba(255,255,255,0.55)";
    c.lineWidth = 2;
    c.lineCap = "round";
    for (let i = -1; i <= 1; i++) {
      c.beginPath();
      for (let k = 0; k <= 8; k++) {
        const py = y - k * 5;
        const px = x + i * 12 + Math.sin(t / 520 + k * 0.7 + i) * 4;
        if (k === 0) c.moveTo(px, py);
        else c.lineTo(px, py);
      }
      c.stroke();
    }
    c.restore();
  }
  function drawHeatBar(c, x, y, w, h, pos) {
    const seg = (from, to, color) => {
      rect(c, x + w * from, y, Math.max(1, w * (to - from)), h, color);
    };
    c.save();
    seg(0, 0.3, "#A6524A");
    seg(0.3, 0.44, "#7FAF5E");
    seg(0.44, 0.56, "#F2C14E");
    seg(0.56, 0.7, "#7FAF5E");
    seg(0.7, 1, "#A6524A");
    c.strokeStyle = "rgba(255,255,255,0.65)";
    c.lineWidth = 1;
    c.setLineDash([3, 4]);
    c.beginPath();
    c.moveTo(x + w * 0.5, y);
    c.lineTo(x + w * 0.5, y + h);
    c.stroke();
    c.setLineDash([]);
    const px = x + w * Math.max(0, Math.min(1, pos));
    c.beginPath();
    c.moveTo(px, y - 10);
    c.lineTo(px - 7, y - 20);
    c.lineTo(px + 7, y - 20);
    c.closePath();
    c.fillStyle = "#FFFFFF";
    c.fill();
    rect(c, px - 2, y - 12, 4, h + 8, "#FFFFFF");
    c.restore();
  }
  function drawPlate(c, x, y, r, t) {
    c.save();
    circ(c, x, y, r, "#FFFFFF");
    circ(c, x, y, r * 0.86, "#F7F1E6");
    circ(c, x - r * 0.26, y + r * 0.1, r * 0.26, "#C9A227");
    circ(c, x + r * 0.28, y - r * 0.06, r * 0.22, "#8FBF7A");
    circ(c, x + r * 0.1, y + r * 0.34, r * 0.12, "#C4703C");
    c.restore();
    drawSteam(c, x, y - r * 0.7, t);
  }
  function drawStar(c, x, y, r, filled) {
    c.save();
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i / 10 * Math.PI * 2;
      const rr = i % 2 === 0 ? r : r * 0.45;
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.closePath();
    if (filled) {
      c.fillStyle = "#F2C14E";
      c.fill();
    } else {
      c.strokeStyle = "#D9CDBC";
      c.lineWidth = 1.2;
      c.stroke();
    }
    c.restore();
  }
  function drawCoin(c, x, y, r) {
    c.save();
    circ(c, x, y, r, "#D9A33B");
    circ(c, x, y, r * 0.66, "#F2C14E");
    c.restore();
  }
  function drawSeal(c, x, y, size, color) {
    c.save();
    c.fillStyle = color;
    c.globalAlpha = 0.14;
    c.beginPath();
    c.moveTo(x + 6, y);
    c.lineTo(x + size - 6, y);
    c.quadraticCurveTo(x + size, y, x + size, y + 6);
    c.lineTo(x + size, y + size - 6);
    c.quadraticCurveTo(x + size, y + size, x + size - 6, y + size);
    c.lineTo(x + 6, y + size);
    c.quadraticCurveTo(x, y + size, x, y + size - 6);
    c.lineTo(x, y + 6);
    c.quadraticCurveTo(x, y, x + 6, y);
    c.closePath();
    c.fill();
    c.globalAlpha = 0.85;
    c.strokeStyle = color;
    c.lineWidth = 1.4;
    c.stroke();
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
      grad.addColorStop(0, "#C86B3C");
      grad.addColorStop(1, "#8A4A28");
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
      c.fillText("\u8282\u6C14\u53A8\u623F \xB7 \u8DDF\u7740\u8282\u6C14\u505A\u83DC", 250, 350);
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
  var K_BEST = "sok_best_term";
  var K_GUIDE = "sok_guide_v1";
  var K_MONEY = "sok_best_money";
  var store = {
    /** 已解锁到的最高节气序号（年份已折算成 24 的倍数） */
    best() {
      return platform.getStore(K_BEST, 0) | 0;
    },
    saveBest(n) {
      const v = Math.max(0, Math.round(n));
      if (v > this.best()) {
        platform.setStore(K_BEST, v);
        platform.setCloudScore(v);
      }
    },
    bestMoney() {
      return platform.getStore(K_MONEY, 0) | 0;
    },
    saveMoney(n) {
      if (n > this.bestMoney()) platform.setStore(K_MONEY, Math.round(n));
    },
    guideSeen() {
      return !!platform.getStore(K_GUIDE, false);
    },
    markGuide() {
      platform.setStore(K_GUIDE, true);
    }
  };

  // src/scenes.ts
  var CARD_X = 20;
  var CARD_W = DESIGN_W - 40;
  var POT_X = DESIGN_W / 2;
  var POT_Y = 372;
  var POT_W = 210;
  var POT_H = 86;
  var ING_Y = 436;
  var ING_H = 86;
  var ING_W = 105;
  function potSlotPos(i) {
    return { x: POT_X - 47 + i * 94, y: 340 };
  }
  var Game = class {
    constructor(ui2) {
      this.ui = ui2;
      this.mode = "title";
      this.heatPos = 0;
      this.heatDir = 1;
      this.guideVisible = false;
      this.termDoneVisible = false;
      this.resultAt = 0;
      this.termIncome = 0;
      this.doubled = false;
      this.t = 0;
      this.friend = null;
      this.state = createState(store.best());
      this.guideVisible = !store.guideSeen();
      const q = platform.getLaunchQuery();
      if (typeof q.kitchen === "string") {
        const f = decodeShare(q.kitchen);
        if (f) {
          this.friend = f;
          platform.toast(`\u597D\u53CB\u505A\u5230${TERMS[f.term].name}\uFF0C\u8425\u6536 \xA5${f.money}`);
        }
      }
    }
    dish() {
      return currentDish(this.state);
    }
    sharePayload() {
      const s = this.state;
      const title = `\u6211\u5728${TERMS[s.term].name}\u505A${this.dish().name}\uFF0C\u4F60\u6765\u638C\u8FD9\u4E00\u52FA`;
      return {
        title,
        query: "kitchen=" + encodeShare(s),
        imageUrl: shareImage(
          title,
          "\u8DDF\u7740\u8282\u6C14\u505A\u5F53\u5B63\u7684\u83DC\uFF0C\u706B\u5019\u770B\u51C6\u4E2D\u7EBF",
          `${TERMS[s.term].name} \xB7 \u8425\u6536 \xA5${s.money}`
        )
      };
    }
    /** 返回 true 表示触摸已被场景消费；end 一律放行给按钮热区 */
    handleTouch(x, y, phase) {
      if (phase !== "end") return false;
      if (this.mode !== "play" || this.termDoneVisible || this.guideVisible) return false;
      if (this.state.phase === "heat") {
        this.stopHeat();
        return true;
      }
      if (this.state.phase !== "cook") return false;
      for (let i = 0; i < 3; i++) {
        const cx = 20 + i * 115;
        if (x >= cx && x <= cx + ING_W && y >= ING_Y && y <= ING_Y + ING_H) {
          const ing = TERMS[this.state.term].ings[i];
          if (this.state.pot.includes(ing)) {
            this.state.pot = this.state.pot.filter((v) => v !== ing);
            platform.toast("\u62FF\u51FA\u6765\u4E86");
          } else if (!putIngredient(this.state, ing)) {
            platform.toast("\u9505\u91CC\u6700\u591A\u4E24\u6837\uFF0C\u5148\u62FF\u4E00\u6837\u51FA\u6765");
          }
          return true;
        }
      }
      for (let i = 0; i < this.state.pot.length; i++) {
        const p = potSlotPos(i);
        const dx = x - p.x, dy = y - p.y;
        if (dx * dx + dy * dy <= 30 * 30) {
          const ing = this.state.pot[i];
          this.state.pot = this.state.pot.filter((v) => v !== ing);
          platform.toast("\u62FF\u51FA\u6765\u4E86");
          return true;
        }
      }
      return false;
    }
    stopHeat() {
      finishHeat(this.state, this.heatPos);
      this.resultAt = this.t;
      this.doubled = false;
      this.termIncome += this.state.lastReward;
      store.saveMoney(this.state.money);
      store.saveBest(this.state.year * TERMS.length + this.state.term);
      platform.vibrate();
    }
    /** 结果页的双倍：看一次激励视频，这一单收入再补一份 */
    doubleReward() {
      if (this.doubled) {
        platform.toast("\u8FD9\u5355\u5DF2\u7ECF\u53CC\u500D\u8FC7\u4E86");
        return;
      }
      platform.rewardedAd((ok) => {
        if (!ok) {
          platform.toast("\u6CA1\u770B\u5B8C\uFF0C\u8FD9\u5355\u4E0D\u7FFB\u500D");
          return;
        }
        this.doubled = true;
        this.state.money += this.state.lastReward;
        this.state.lastReward *= 2;
        this.termIncome += this.state.lastReward / 2;
        store.saveMoney(this.state.money);
        platform.toast("\u8FD9\u5355\u6536\u5165\u7FFB\u500D");
      });
    }
    cook() {
      if (!startCooking(this.state)) {
        platform.toast("\u914D\u4E0D\u4E0A\u8FD9\u9053\u83DC\uFF0C\u770B\u770B\u5BA2\u4EBA\u8981\u7684\u4E24\u6837");
        return;
      }
      this.heatPos = 0;
      this.heatDir = 1;
    }
    advanceOrder() {
      if (this.t - this.resultAt < 450) return;
      const r = nextOrder(this.state);
      if (r.termDone) {
        this.termDoneVisible = true;
        store.saveBest(this.state.year * TERMS.length + this.state.term + 1);
      }
    }
    goNextTerm() {
      nextTerm(this.state);
      this.termDoneVisible = false;
      this.termIncome = 0;
      this.guideVisible = false;
    }
    tick() {
      this.t += 16;
      if (this.mode !== "play") return;
      if (this.state.phase !== "heat") return;
      const speed = heatSpeed(this.state.term, this.state.year);
      const r = heatTick(this.heatPos, this.heatDir, speed, 0.016);
      this.heatPos = r.pos;
      this.heatDir = r.dir;
    }
    draw() {
      this.tick();
      if (this.mode === "title") this.drawTitle();
      else this.drawPlay();
      if (this.termDoneVisible) this.drawTermDone();
      if (this.guideVisible) this.drawGuide();
    }
    // ---------------- 首页 ----------------
    drawTitle() {
      const ui2 = this.ui;
      const c = ui2.c;
      const term = TERMS[this.state.term];
      ui2.navBar("\u8282\u6C14\u53A8\u623F");
      c.fillStyle = "#FBF3E7";
      c.fillRect(0, 44, DESIGN_W, 230);
      drawPlate(c, DESIGN_W / 2, 168, 56, this.t);
      ui2.text("\u8282\u6C14\u53A8\u623F", DESIGN_W / 2, 246, { size: 32, bold: true, align: "center" });
      ui2.text("\u8DDF\u7740\u8282\u6C14\uFF0C\u505A\u5F53\u5B63\u7684\u90A3\u53E3\u83DC", DESIGN_W / 2, 290, {
        size: 14,
        color: C.greenDark,
        align: "center"
      });
      drawSeal(c, DESIGN_W / 2 - 62, 322, 40, SEASON_COLOR[term.season]);
      ui2.text(term.name, DESIGN_W / 2 - 42, 330, {
        size: 17,
        bold: true,
        color: SEASON_COLOR[term.season],
        align: "center"
      });
      ui2.text(termLabel(this.state), DESIGN_W / 2 + 46, 334, {
        size: 12,
        color: C.sub,
        align: "center"
      });
      if (this.friend) {
        ui2.text(
          `\u597D\u53CB\u505A\u5230${TERMS[this.friend.term].name} \xB7 \u8425\u6536 \xA5${this.friend.money}`,
          DESIGN_W / 2,
          378,
          { size: 12, color: C.blue, align: "center" }
        );
      }
      ui2.button(20, 402, DESIGN_W - 40, 50, "\u5F00 \u95E8 \u8425 \u4E1A", () => {
        this.mode = "play";
      });
      ui2.button(20, 464, DESIGN_W - 40, 44, "\u9001 \u597D \u53CB", () => platform.share(this.sharePayload()), "ghost");
      const tips = [
        "\u2460 \u5BA2\u4EBA\u70B9\u4E00\u9053\u83DC\uFF0C\u4ECE\u5F53\u5B63\u4E09\u6837\u91CC\u6311\u5BF9\u4E24\u6837",
        "\u2461 \u4E0B\u9505\u540E\u770B\u706B\u5019\uFF0C\u6307\u9488\u5230\u4E2D\u7EBF\u70B9\u505C",
        "\u2462 \u706B\u5019\u521A\u597D\u6709\u52A0\u6210\uFF0C\u7CCA\u4E86\u4E5F\u7167\u6837\u51FA\u9910"
      ];
      tips.forEach((tp, i) => {
        ui2.text(tp, 28, 528 + i * 26, { size: 12.5, color: C.ink, maxWidth: 320 });
      });
      ui2.text(
        `\u7D2F\u8BA1\u8425\u6536 \xA5${this.state.money} \xB7 \u51FA\u9910 ${this.state.served} \u4EFD`,
        DESIGN_W / 2,
        618,
        { size: 12, color: C.sub, align: "center" }
      );
      ui2.text(
        `\u5386\u53F2\u6700\u9AD8 \u7B2C ${store.best() % 24 + 1} \u4E2A\u8282\u6C14 \xB7 \xA5${store.bestMoney()}`,
        DESIGN_W / 2,
        640,
        { size: 11, color: C.warn, align: "center" }
      );
    }
    // ---------------- 主玩法 ----------------
    drawPlay() {
      const ui2 = this.ui;
      const c = ui2.c;
      const term = TERMS[this.state.term];
      const dish = this.dish();
      ui2.navBar("\u8282\u6C14\u53A8\u623F", () => {
        this.mode = "title";
        store.saveBest(this.state.year * TERMS.length + this.state.term);
      });
      ui2.panel(16, 52, DESIGN_W - 32, 60, 12, C.card);
      drawSeal(c, 28, 62, 40, SEASON_COLOR[term.season]);
      ui2.text(term.name, 48, 70, {
        size: 16,
        bold: true,
        color: SEASON_COLOR[term.season],
        align: "center"
      });
      ui2.text(`${term.season}\u5B63 \xB7 \u7B2C ${this.state.year + 1} \u5E74`, 78, 64, { size: 11, color: C.sub });
      ui2.text(`\u8425\u6536 \xA5${this.state.money}`, 78, 82, { size: 13, bold: true, color: C.warn });
      for (let i = 0; i < 3; i++) {
        const x = 300 + i * 14;
        c.beginPath();
        c.arc(x, 82, 5, 0, Math.PI * 2);
        c.fillStyle = i < this.state.order ? C.green : i === this.state.order ? C.warn : "#E7DCCB";
        c.fill();
      }
      ui2.panel(CARD_X, 120, CARD_W, 150, 14, C.card);
      ui2.text(`\u7B2C ${this.state.order + 1} \u5355 / \u5171 3 \u5355`, CARD_X + 16, 132, { size: 11, color: C.sub });
      ui2.text(dish.name, CARD_X + 16, 150, { size: 19, bold: true, color: C.ink, maxWidth: 240 });
      drawCoin(c, CARD_W + 4, 158, 7);
      ui2.text(`\xA5${dish.price}`, CARD_X + CARD_W - 10, 150, {
        size: 15,
        bold: true,
        color: C.warn,
        align: "right"
      });
      drawIngredient(c, 90, 218, 40, dish.need[0]);
      ui2.text("+", 152, 206, { size: 20, color: C.sub, align: "center" });
      drawIngredient(c, 214, 218, 40, dish.need[1]);
      ui2.text(dish.need[0], 90, 244, { size: 11, color: C.ink, align: "center" });
      ui2.text(dish.need[1], 214, 244, { size: 11, color: C.ink, align: "center" });
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
          c.strokeStyle = "rgba(255,255,255,0.45)";
          c.lineWidth = 1.5;
          c.setLineDash([4, 4]);
          c.stroke();
          c.restore();
        }
      }
      ui2.text(this.state.pot.length === 2 ? "\u70B9\u300C\u4E0B\u9505\u300D\u5F00\u59CB\u638C\u706B" : "\u70B9\u4E0B\u9762\u7684\u5F53\u5B63\u98DF\u6750\uFF0C\u653E\u8FDB\u9505\u91CC", DESIGN_W / 2, 424, {
        size: 11,
        color: C.sub,
        align: "center"
      });
      const ings = term.ings;
      ings.forEach((ing, i) => {
        const x = 20 + i * 115;
        const used = this.state.pot.includes(ing);
        ui2.panel(x, ING_Y, ING_W, ING_H, 12, used ? "#F2ECE1" : C.card);
        if (!used) ui2.outlined(x, ING_Y, ING_W, ING_H, 12, "#EFE5D8", 1);
        drawIngredient(c, x + ING_W / 2, ING_Y + 30, 34, ing);
        ui2.text(ing, x + ING_W / 2, ING_Y + 56, {
          size: 12,
          bold: true,
          color: used ? C.sub : C.ink,
          align: "center"
        });
        ui2.regions.push({
          x,
          y: ING_Y,
          w: ING_W,
          h: ING_H,
          fn: () => {
            if (this.state.pot.includes(ing)) {
              this.state.pot = this.state.pot.filter((v) => v !== ing);
            } else if (!putIngredient(this.state, ing)) {
              platform.toast("\u9505\u91CC\u6700\u591A\u4E24\u6837\uFF0C\u5148\u62FF\u4E00\u6837\u51FA\u6765");
            }
          },
          enabled: !used
        });
      });
      ui2.button(20, 534, 100, 46, "\u6E05 \u7A7A", () => clearPot(this.state), "ghost", this.state.pot.length > 0, 14);
      const ready = potMatches(this.state.pot, dish);
      ui2.button(
        130,
        534,
        225,
        46,
        ready ? "\u4E0B \u9505" : "\u8FD8\u5DEE\u98DF\u6750",
        () => this.cook(),
        ready ? "primary" : "plain",
        ready,
        15
      );
      ui2.text("\u540C\u4E00\u79CD\u98DF\u6750\u53EA\u80FD\u653E\u4E00\u6B21", DESIGN_W / 2, 596, { size: 11, color: C.sub, align: "center" });
      ui2.text(
        `\u5DF2\u51FA\u9910 ${this.state.served} \u4EFD \xB7 \u7D2F\u8BA1\u661F\u6570 ${this.state.stars}`,
        DESIGN_W / 2,
        618,
        { size: 11, color: C.sub, align: "center" }
      );
      if (this.state.phase === "heat") this.drawHeatPanel();
      if (this.state.phase === "result") this.drawResult();
    }
    // ---------------- 火候 ----------------
    drawHeatPanel() {
      const ui2 = this.ui;
      ui2.dim();
      ui2.regions.push({ x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, fn: () => {
      }, enabled: true });
      ui2.panel(18, 152, DESIGN_W - 36, 348, 16, C.card);
      ui2.text("\u638C \u706B", DESIGN_W / 2, 172, { size: 22, bold: true, align: "center" });
      ui2.text(this.dish().name, DESIGN_W / 2, 206, { size: 13, color: C.sub, align: "center" });
      drawHeatBar(ui2.c, 40, 276, 295, 26, this.heatPos);
      const labels = [
        [0.15, "\u7CCA", "#A6524A"],
        [0.37, "\u4E0D\u9519", "#5F8F45"],
        [0.5, "\u5B8C\u7F8E", "#B8860B"],
        [0.63, "\u4E0D\u9519", "#5F8F45"],
        [0.85, "\u7CCA", "#A6524A"]
      ];
      labels.forEach(([p, label, color]) => {
        ui2.text(label, 40 + 295 * p, 308, { size: 10, color, align: "center" });
      });
      ui2.button(95, 344, 185, 62, "\u505C", () => this.stopHeat(), "primary", true, 24);
      ui2.text("\u6307\u9488\u5230\u4E2D\u7EBF\u9644\u8FD1\u70B9\u300C\u505C\u300D", DESIGN_W / 2, 420, {
        size: 12,
        color: C.sub,
        align: "center"
      });
      ui2.text("\u706B\u5019\u8D8A\u5FEB\uFF0C\u8D8A\u8981\u6C89\u4F4F\u6C14", DESIGN_W / 2, 442, {
        size: 11,
        color: C.sub,
        align: "center"
      });
    }
    // ---------------- 单份结果 ----------------
    drawResult() {
      const ui2 = this.ui;
      const q = this.state.quality;
      if (!q) return;
      ui2.dim();
      ui2.regions.push({ x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, fn: () => {
      }, enabled: true });
      ui2.panel(48, 190, 279, 320, 16, C.card);
      const color = q === "perfect" ? "#B8860B" : q === "good" ? C.greenDark : C.red;
      ui2.text(QUALITY_LABEL[q], DESIGN_W / 2, 210, { size: 24, bold: true, color, align: "center" });
      ui2.text(`${this.dish().name} \u51FA\u9910`, DESIGN_W / 2, 248, {
        size: 12,
        color: C.sub,
        align: "center"
      });
      const stars = QUALITY_STARS[q];
      for (let i = 0; i < 3; i++) {
        drawStar(ui2.c, DESIGN_W / 2 - 30 + i * 30, 286, 11, i < stars);
      }
      drawCoin(ui2.c, DESIGN_W / 2 - 34, 330, 9);
      ui2.text(`+\xA5${this.state.lastReward}`, DESIGN_W / 2 + 8, 318, {
        size: 22,
        bold: true,
        color: C.warn,
        align: "center"
      });
      ui2.text(q === "burnt" ? "\u5BA2\u4EBA\u8FD8\u662F\u6536\u4E0B\u4E86\uFF0C\u4E0B\u6B21\u770B\u51C6\u70B9" : "\u5BA2\u4EBA\u5F88\u6EE1\u610F", DESIGN_W / 2, 352, {
        size: 11,
        color: C.sub,
        align: "center"
      });
      if (this.doubled) {
        ui2.text("\u8FD9\u5355\u5DF2\u7ECF\u53CC\u500D", DESIGN_W / 2, 382, {
          size: 12,
          bold: true,
          color: C.greenDark,
          align: "center"
        });
      } else {
        ui2.button(76, 374, 223, 36, "\u770B\u89C6\u9891 \xB7 \u8FD9\u5355\u53CC\u500D", () => this.doubleReward(), "ghost", true, 12);
      }
      ui2.button(
        76,
        420,
        223,
        46,
        this.state.order >= 2 ? "\u6536 \u5DE5 \u7ED3 \u8D26" : "\u4E0B \u4E00 \u5355",
        () => this.advanceOrder()
      );
      ui2.text(`\u672C\u5173\u5DF2\u5165\u8D26 \xA5${this.termIncome}`, DESIGN_W / 2, 474, {
        size: 11,
        color: C.sub,
        align: "center"
      });
    }
    // ---------------- 节气完成 ----------------
    drawTermDone() {
      const ui2 = this.ui;
      const term = TERMS[this.state.term];
      ui2.dim();
      ui2.regions.push({ x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, fn: () => {
      }, enabled: true });
      ui2.panel(36, 176, DESIGN_W - 72, 316, 16, C.card);
      drawSeal(ui2.c, DESIGN_W / 2 - 26, 196, 52, SEASON_COLOR[term.season]);
      ui2.text(term.name, DESIGN_W / 2, 210, {
        size: 18,
        bold: true,
        color: SEASON_COLOR[term.season],
        align: "center"
      });
      ui2.text("\u8FD9\u4E00\u8282\u6C14\u6536\u5DE5\u4E86", DESIGN_W / 2, 268, { size: 21, bold: true, align: "center" });
      ui2.text(`\u672C\u5173\u8425\u6536 \xA5${this.termIncome}`, DESIGN_W / 2, 306, {
        size: 15,
        bold: true,
        color: C.warn,
        align: "center"
      });
      ui2.text(`\u7D2F\u8BA1 \xA5${this.state.money} \xB7 \u661F\u6570 ${this.state.stars}`, DESIGN_W / 2, 332, {
        size: 12,
        color: C.sub,
        align: "center"
      });
      ui2.text("\u4E0B\u4E00\u4E2A\u8282\u6C14\u6362\u4E2A\u5F53\u5B63\u98DF\u6750\uFF0C\u706B\u5019\u4E5F\u66F4\u5FEB\u4E00\u70B9", DESIGN_W / 2, 362, {
        size: 11,
        color: C.sub,
        align: "center",
        maxWidth: 250
      });
      const idx = (TERMS.findIndex((t) => t.name === term.name) + 1) % TERMS.length;
      ui2.button(64, 396, DESIGN_W - 128, 46, `\u8FDB\u5165${TERMS[idx].name}`, () => this.goNextTerm());
      ui2.button(64, 448, DESIGN_W - 128, 32, "\u9001 \u597D \u53CB", () => platform.share(this.sharePayload()), "plain", true, 12);
    }
    // ---------------- 首次引导 ----------------
    drawGuide() {
      const ui2 = this.ui;
      ui2.dim();
      ui2.regions.push({ x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, fn: () => {
      }, enabled: true });
      ui2.panel(26, 152, DESIGN_W - 52, 330, 16, C.card);
      ui2.text("\u600E\u4E48\u5F00\u8FD9\u5BB6\u5E97", DESIGN_W / 2, 174, { size: 21, bold: true, align: "center" });
      const tips = [
        "\u2460 \u5BA2\u4EBA\u70B9\u4E00\u9053\u83DC\uFF0C\u5361\u4E0A\u5199\u7740\u8981\u54EA\u4E24\u6837",
        "\u2461 \u4ECE\u4E0B\u9762\u4E09\u6837\u5F53\u5B63\u98DF\u6750\u91CC\u70B9\u4E24\u6837\u653E\u8FDB\u9505",
        "\u2462 \u4E0B\u9505\u540E\u6307\u9488\u6765\u56DE\u8DD1\uFF0C\u5230\u4E2D\u7EBF\u9644\u8FD1\u70B9\u505C",
        "\u2463 \u706B\u5019\u521A\u597D \u2192 \u6536\u5165 \xD71.6\uFF1B\u7CCA\u4E86\u4E5F\u6709\u94B1"
      ];
      tips.forEach((t, i) => {
        ui2.text(t, 46, 216 + i * 46, { size: 12.5, color: C.ink, maxWidth: 285, lineHeight: 18 });
      });
      ui2.text("\u4E09\u4E2A\u5355\u505A\u5B8C\uFF0C\u5C31\u53BB\u4E0B\u4E00\u4E2A\u8282\u6C14", DESIGN_W / 2, 414, {
        size: 13,
        bold: true,
        color: C.greenDark,
        align: "center"
      });
      ui2.button(48, 440, DESIGN_W - 96, 42, "\u5F00 \u59CB \u505A \u83DC", () => {
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
