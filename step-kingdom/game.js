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
  var STEP_CLOUD_FN = "";
  function estimateSteps(nowMs) {
    const d = new Date(nowMs);
    const minutes = d.getHours() * 60 + d.getMinutes();
    const startMin = 7 * 60;
    const active = Math.max(0, minutes - startMin);
    const seed = d.getFullYear() * 372 + (d.getMonth() + 1) * 31 + d.getDate();
    const wobble = seed * 37 % 11 - 5;
    const base = Math.round(active * (83 + wobble) / 12) * 10;
    return Math.max(0, Math.min(18e3, base));
  }
  function dayKey(nowMs) {
    const d = new Date(nowMs);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  }
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
      c.fillStyle = "#101711";
      c.fillRect(0, 0, this.canvas.width, this.canvas.height);
      c.setTransform(
        this.dpr * this.scale,
        0,
        0,
        this.dpr * this.scale,
        this.dpr * this.offX,
        this.dpr * this.offY
      );
      c.fillStyle = "#F2F6EE";
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
    todayKey() {
      return dayKey(this.now());
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
    readSteps() {
      return Promise.resolve({
        steps: estimateSteps(this.now()),
        real: false,
        note: "\u9884\u89C8\u6A21\u5F0F\uFF1A\u6309\u4ECA\u5929\u7684\u65F6\u6BB5\u4F30\u7B97"
      });
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
    /**
     * 微信运动：getWeRunData 只给加密数据 + cloudID，必须由后端/云函数用 session_key 解密。
     * 这里把「授权 → 云函数 → 解密」三步都留了明确的接入点：
     *   1) 未配置 STEP_CLOUD_FN：只申请授权，随后退回本地估算；
     *   2) 配置了云函数：把 cloudID 交给云函数换取步数（云函数侧调用开放接口解密）。
     * 任何一步失败都不阻断游戏，只是标注「估算」。
     */
    readSteps() {
      return new Promise((resolve) => {
        const fallback = (note) => resolve({
          steps: estimateSteps(this.now()),
          real: false,
          note
        });
        try {
          if (typeof wx.getWeRunData !== "function") {
            fallback("\u57FA\u7840\u5E93\u4E0D\u652F\u6301\u5FAE\u4FE1\u8FD0\u52A8");
            return;
          }
          wx.getWeRunData({
            success: (res) => {
              if (!STEP_CLOUD_FN || !wx.cloud || typeof wx.cloud.callFunction !== "function") {
                fallback("\u5DF2\u6388\u6743\u5FAE\u4FE1\u8FD0\u52A8\uFF0C\u672A\u914D\u7F6E\u4E91\u51FD\u6570\u89E3\u5BC6\uFF0C\u5148\u7528\u4F30\u7B97");
                return;
              }
              wx.cloud.callFunction({
                name: STEP_CLOUD_FN,
                data: { cloudID: res.cloudID, encryptedData: res.encryptedData, iv: res.iv },
                success: (r) => {
                  const n = r && r.result && Number(r.result.steps);
                  if (Number.isFinite(n) && n >= 0) resolve({ steps: Math.min(8e4, n | 0), real: true });
                  else fallback("\u4E91\u51FD\u6570\u672A\u8FD4\u56DE\u6B65\u6570\uFF0C\u5148\u7528\u4F30\u7B97");
                },
                fail: () => fallback("\u4E91\u51FD\u6570\u8C03\u7528\u5931\u8D25\uFF0C\u5148\u7528\u4F30\u7B97")
              });
            },
            fail: () => fallback("\u672A\u6388\u6743\u5FAE\u4FE1\u8FD0\u52A8\uFF0C\u5148\u7528\u4F30\u7B97")
          });
        } catch (_) {
          fallback("\u5FAE\u4FE1\u8FD0\u52A8\u4E0D\u53EF\u7528\uFF0C\u5148\u7528\u4F30\u7B97");
        }
      });
    }
  };
  var isWx = typeof wx !== "undefined" && typeof wx.getSystemInfoSync === "function";
  var platform = isWx ? new WxPlatform() : new BrowserPlatform();

  // src/ui.ts
  var C = {
    bg: "#F2F6EE",
    card: "#FFFFFF",
    green: "#3E9B5A",
    greenDark: "#2F7B46",
    greenPale: "#E9F4EA",
    ink: "#1F2A1F",
    sub: "#7C8A7C",
    line: "#E1E8DE",
    red: "#C2543F",
    redPale: "#FBEAE5",
    blue: "#576B95",
    warn: "#D79A2B",
    warnPale: "#FFF6E0",
    soil: "#C9A77C",
    soilDark: "#9C7A52",
    overlay: "rgba(20,30,20,0.55)"
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
      c.fillStyle = "#F7FAF4";
      c.fillRect(0, 0, DESIGN_W, 44);
      this.line(0, 44, DESIGN_W, 44, "#DCE5D8");
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
  var GRID = 9;
  var TILES = GRID * GRID;
  var CENTER = Math.floor(GRID / 2);
  var NONE = 0;
  var MINE = 1;
  var FOE = 2;
  var INCOME_PER_TILE_HOUR = 3;
  var MAX_OFFLINE_MS = 12 * 3600 * 1e3;
  var RAID_MS = 6 * 3600 * 1e3;
  var MAX_RAIDS_PER_SETTLE = 2;
  var STEPS_PER_TROOP = 100;
  function rowOf(i) {
    return Math.floor(i / GRID);
  }
  function colOf(i) {
    return i % GRID;
  }
  function indexOf(r, c) {
    return r * GRID + c;
  }
  function inside(r, c) {
    return r >= 0 && r < GRID && c >= 0 && c < GRID;
  }
  function neighbors(i) {
    const r = rowOf(i), c = colOf(i);
    const out = [];
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      if (inside(r + dr, c + dc)) out.push(indexOf(r + dr, c + dc));
    }
    return out;
  }
  function initialState(day, now) {
    const grid = new Array(TILES).fill(NONE);
    grid[indexOf(CENTER, CENTER)] = MINE;
    for (const i of neighbors(indexOf(CENTER, CENTER))) grid[i] = MINE;
    grid[indexOf(0, 0)] = FOE;
    grid[indexOf(0, GRID - 1)] = FOE;
    grid[indexOf(GRID - 1, 0)] = FOE;
    return {
      grid,
      troops: 30,
      day,
      steps: 0,
      lastSettle: now,
      lastRaid: now,
      cleared: 0,
      totalOwned: 5,
      streak: 1,
      lastDay: day
    };
  }
  function ownedCount(grid) {
    let n = 0;
    for (const v of grid) if (v === MINE) n++;
    return n;
  }
  function costOf(i, cleared = 0) {
    const r = rowOf(i), c = colOf(i);
    const d = Math.abs(r - CENTER) + Math.abs(c - CENTER);
    const base = 6 + d * 5;
    return Math.max(4, Math.round(base * (1 + cleared * 0.25)));
  }
  function hasNeighbor(grid, i, kind) {
    return neighbors(i).some((n) => grid[n] === kind);
  }
  function canClaim(state, i) {
    if (i < 0 || i >= TILES) return { ok: false, cost: 0, reason: "\u8D8A\u754C" };
    const v = state.grid[i];
    if (v === MINE) return { ok: false, cost: 0, reason: "\u5DF2\u7ECF\u662F\u4F60\u7684\u5730" };
    if (!hasNeighbor(state.grid, i, MINE)) {
      return { ok: false, cost: 0, reason: "\u53EA\u80FD\u5360\u548C\u81EA\u5DF1\u9886\u5730\u76F8\u90BB\u7684\u683C\u5B50" };
    }
    const base = costOf(i, state.cleared);
    const cost = v === FOE ? base * 2 : base;
    if (state.troops < cost) {
      return { ok: false, cost, reason: `\u5175\u529B\u4E0D\u591F\uFF0C\u8FD8\u5DEE ${cost - state.troops}` };
    }
    return { ok: true, cost, reason: "" };
  }
  function claim(state, i) {
    const check = canClaim(state, i);
    if (!check.ok) return null;
    const grid = state.grid.slice();
    const wasFoe = grid[i] === FOE;
    grid[i] = MINE;
    return __spreadProps(__spreadValues({}, state), {
      grid,
      troops: state.troops - check.cost,
      totalOwned: state.totalOwned + 1 + (wasFoe ? 1 : 0)
    });
  }
  function incomePerHour(state) {
    return ownedCount(state.grid) * INCOME_PER_TILE_HOUR;
  }
  function settle(state, now) {
    const elapsed = Math.max(0, Math.min(MAX_OFFLINE_MS, now - state.lastSettle));
    const gain = Math.floor(elapsed / 36e5 * incomePerHour(state));
    if (gain <= 0 && elapsed < 6e4) return { state, gain: 0 };
    return {
      state: __spreadProps(__spreadValues({}, state), { troops: state.troops + gain, lastSettle: now }),
      gain
    };
  }
  function hashInt(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h);
  }
  function raid(state, now) {
    const times = Math.min(
      MAX_RAIDS_PER_SETTLE,
      Math.floor(Math.max(0, now - state.lastRaid) / RAID_MS)
    );
    if (times <= 0) return { state, lost: 0 };
    let grid = state.grid.slice();
    let lost = 0;
    for (let k = 0; k < times; k++) {
      const cands = [];
      for (let i = 0; i < TILES; i++) {
        if (grid[i] === MINE && hasNeighbor(grid, i, FOE)) cands.push(i);
      }
      if (!cands.length) break;
      const pick = cands[hashInt(`${state.day}:${state.cleared}:${k}`) % cands.length];
      grid[pick] = FOE;
      lost++;
    }
    if (lost === 0) return { state: __spreadProps(__spreadValues({}, state), { lastRaid: now }), lost: 0 };
    return { state: __spreadProps(__spreadValues({}, state), { grid, lastRaid: now }), lost };
  }
  function stepToTroops(deltaSteps) {
    return Math.floor(Math.max(0, deltaSteps) / STEPS_PER_TROOP);
  }
  function applySteps(state, todaySteps) {
    const total = Math.max(0, Math.floor(todaySteps));
    const delta = Math.max(0, total - state.steps);
    const gained = stepToTroops(delta);
    return {
      state: __spreadProps(__spreadValues({}, state), { steps: state.steps + delta, troops: state.troops + gained }),
      gained,
      delta
    };
  }
  function rollDay(state, day) {
    if (state.day === day) return { state, newDay: false };
    const y = (/* @__PURE__ */ new Date(state.lastDay + "T00:00:00")).getTime();
    const t = (/* @__PURE__ */ new Date(day + "T00:00:00")).getTime();
    const gap = Math.round((t - y) / 864e5);
    const streak = gap === 1 ? state.streak + 1 : 1;
    return {
      state: __spreadProps(__spreadValues({}, state), { day, steps: 0, streak, lastDay: day }),
      newDay: true
    };
  }
  function isCleared(state) {
    return state.grid.every((v) => v === MINE);
  }
  function nextMap(state, now) {
    const fresh = initialState(state.day, now);
    return __spreadProps(__spreadValues({}, fresh), {
      troops: state.troops + 120 + state.cleared * 60,
      cleared: state.cleared + 1,
      totalOwned: state.totalOwned,
      streak: state.streak,
      lastDay: state.lastDay,
      steps: state.steps
    });
  }
  function pctComplete(state) {
    return Math.round(ownedCount(state.grid) / TILES * 100);
  }
  function encodeShare(state) {
    return [state.cleared, ownedCount(state.grid), Math.min(999999, state.troops)].join("~");
  }
  function decodeShare(raw) {
    if (typeof raw !== "string" || raw.length > 24) return null;
    const parts = raw.split("~");
    if (parts.length !== 3) return null;
    const nums = parts.map((v) => Number(v));
    if (!nums.every((n) => Number.isInteger(n) && n >= 0)) return null;
    const [cleared, owned, troops] = nums;
    if (cleared > 999 || owned > TILES || troops > 999999) return null;
    return { cleared, owned, troops };
  }

  // src/art.ts
  function rect(c, x, y, w, h, fill) {
    c.fillStyle = fill;
    c.fillRect(x, y, w, h);
  }
  function circ(c, x, y, r, fill) {
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fillStyle = fill;
    c.fill();
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
  function drawFlag(c, x, y, s, color) {
    c.save();
    c.strokeStyle = "#5C4A32";
    c.lineWidth = Math.max(1.2, s * 0.08);
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x, y - s);
    c.stroke();
    c.beginPath();
    c.moveTo(x, y - s);
    c.lineTo(x + s * 0.62, y - s * 0.74);
    c.lineTo(x, y - s * 0.48);
    c.closePath();
    c.fillStyle = color;
    c.fill();
    c.restore();
  }
  function drawCamp(c, x, y, s) {
    c.save();
    rect(c, x - s * 0.42, y + s * 0.16, s * 0.84, s * 0.2, "#8E3A2B");
    for (let i = -1; i <= 1; i++) {
      tri(
        c,
        x + i * s * 0.26 - s * 0.1,
        y + s * 0.18,
        x + i * s * 0.26,
        y - s * 0.42,
        x + i * s * 0.26 + s * 0.1,
        y + s * 0.18,
        "#C2543F"
      );
    }
    circ(c, x, y + s * 0.02, s * 0.1, "#F0C9BE");
    c.restore();
  }
  function drawHut(c, x, y, s) {
    c.save();
    rect(c, x - s * 0.3, y - s * 0.12, s * 0.6, s * 0.42, "#F6EFDF");
    tri(c, x - s * 0.38, y - s * 0.1, x, y - s * 0.52, x + s * 0.38, y - s * 0.1, "#9C7A52");
    rect(c, x - s * 0.08, y + s * 0.12, s * 0.16, s * 0.18, "#7A6248");
    c.restore();
  }
  function drawTile(c, x, y, size, kind, t, hasHut = false, highlight = 0) {
    const pad = 1;
    const s = size - pad * 2;
    const px = x + pad, py = y + pad;
    if (kind === "mine") {
      rect(c, px, py, s, s, "#8CC47A");
      rect(c, px, py, s, s * 0.16, "#A5D293");
      c.save();
      c.strokeStyle = "rgba(72,120,60,0.16)";
      c.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        c.beginPath();
        c.moveTo(px + 2, py + s / 4 * i);
        c.lineTo(px + s - 2, py + s / 4 * i);
        c.stroke();
      }
      c.restore();
      if (hasHut) drawHut(c, px + s / 2, py + s / 2, s);
      else drawFlag(c, px + s * 0.5, py + s * 0.72, s * 0.42, "#2F7B46");
    } else if (kind === "foe") {
      rect(c, px, py, s, s, "#E4B7AC");
      rect(c, px, py, s, s * 0.16, "#EFC9BF");
      drawCamp(c, px + s / 2, py + s / 2, s);
    } else {
      rect(c, px, py, s, s, "#E9E0CB");
      c.save();
      c.fillStyle = "rgba(150,164,120,0.5)";
      const seed = (x * 13 + y * 7) % 11;
      for (let i = 0; i < 3; i++) {
        const gx = px + 5 + (seed + i * 7) % (s - 10);
        const gy = py + 6 + (seed + i * 11) % (s - 12);
        c.fillRect(gx, gy, 2, 2);
      }
      c.restore();
    }
    if (kind === "reachable") {
      const a = 0.45 + Math.sin(t / 320) * 0.25;
      c.save();
      c.strokeStyle = `rgba(62,155,90,${a.toFixed(3)})`;
      c.lineWidth = 2;
      c.strokeRect(px + 1, py + 1, s - 2, s - 2);
      c.restore();
    }
    if (highlight > 0) {
      c.save();
      c.globalAlpha = Math.min(0.7, highlight);
      rect(c, px, py, s, s, "#FFFFFF");
      c.restore();
    }
    c.save();
    c.strokeStyle = "rgba(110,130,100,0.18)";
    c.lineWidth = 1;
    c.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);
    c.restore();
  }
  function drawTroop(c, x, y, r) {
    circ(c, x, y, r, "#3E9B5A");
    circ(c, x, y, r * 0.62, "#EAF6E6");
    circ(c, x, y, r * 0.3, "#3E9B5A");
  }
  function drawBurst(c, x, y, color, progress) {
    const p = Math.max(0, Math.min(1, progress));
    c.save();
    c.globalAlpha = 1 - p;
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      const r = 8 + p * 26;
      circ(c, x + Math.cos(a) * r, y + Math.sin(a) * r, 3 * (1 - p) + 1, color);
    }
    c.restore();
  }
  function drawMiniMap(c, cx, cy, cell, t) {
    for (let r = 0; r < 5; r++) {
      for (let col = 0; col < 5; col++) {
        const x = cx - cell * 2.5 + col * cell;
        const y = cy - cell * 2.5 + r * cell;
        const d = Math.abs(r - 2) + Math.abs(col - 2);
        const kind = d === 0 ? "mine" : d === 1 ? "mine" : d === 2 ? "reachable" : "none";
        drawTile(c, x, y, cell, kind, t, d === 0);
      }
    }
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
      grad.addColorStop(0, "#5FA86B");
      grad.addColorStop(1, "#2F6B45");
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
      c.fillText("\u6B65\u6570\u9886\u5730 \xB7 \u4E00\u683C\u4E00\u683C\u5F80\u5916\u5360", 250, 350);
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
  var K_STATE = "sk_state_v1";
  var K_BEST = "sk_best_owned";
  var K_GUIDE = "sk_guide_v1";
  function valid(p) {
    if (!p || typeof p !== "object") return false;
    if (!Array.isArray(p.grid) || p.grid.length !== TILES) return false;
    if (!p.grid.every((v) => v === 0 || v === 1 || v === 2)) return false;
    const nums = ["troops", "steps", "lastSettle", "lastRaid", "cleared", "totalOwned", "streak"];
    if (!nums.every((k) => typeof p[k] === "number" && Number.isFinite(p[k]))) return false;
    if (typeof p.day !== "string" || typeof p.lastDay !== "string") return false;
    return true;
  }
  var store = {
    /** 损坏/旧版存档一律回退到干净起点，不让界面崩 */
    load() {
      const p = platform.getStore(K_STATE, null);
      if (!valid(p)) return initialState(platform.todayKey(), platform.now());
      return p;
    },
    save(s) {
      platform.setStore(K_STATE, s);
      let owned = 0;
      for (const v of s.grid) if (v === 1) owned++;
      if (owned > this.best()) platform.setStore(K_BEST, owned);
      platform.setCloudScore(owned + s.cleared * 20);
    },
    best() {
      return platform.getStore(K_BEST, 0) | 0;
    },
    guideSeen() {
      return !!platform.getStore(K_GUIDE, false);
    },
    markGuide() {
      platform.setStore(K_GUIDE, true);
    }
  };

  // src/scenes.ts
  var CELL = 34;
  var GRID_PX = CELL * GRID;
  var GRID_X = (DESIGN_W - GRID_PX) / 2;
  var GRID_Y = 118;
  var BURST_FRAMES = 22;
  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }
  var Game = class {
    constructor(ui2) {
      this.ui = ui2;
      this.mode = "title";
      this.selected = null;
      this.todaySteps = 0;
      this.realSteps = false;
      this.stepNote = "";
      this.syncBusy = false;
      this.guideVisible = false;
      this.winVisible = false;
      this.boostUsed = false;
      this.t = 0;
      this.burst = null;
      this.raidFlash = 0;
      this.pendingGain = 0;
      this.gainFlash = 0;
      this.reachable = /* @__PURE__ */ new Set();
      this.frameCount = 0;
      this.friendLand = null;
      this.state = store.load();
      this.todaySteps = estimateSteps(platform.now());
      const q = platform.getLaunchQuery();
      if (typeof q.land === "string") {
        const f = decodeShare(q.land);
        if (f) {
          this.friendLand = f;
          platform.toast(`\u597D\u53CB\u5DF2\u5360 ${f.owned} \u683C\uFF0C\u4ECE\u4E00\u683C\u5F00\u59CB\u4E5F\u4E0D\u6162`);
        }
      }
      this.guideVisible = !store.guideSeen();
      this.boostUsed = platform.getStore("sk_boost_day", "") === platform.todayKey();
      this.refreshReachable();
    }
    refreshReachable() {
      this.reachable.clear();
      for (let i = 0; i < TILES; i++) {
        if (canClaim(this.state, i).ok) this.reachable.add(i);
      }
    }
    commit(s) {
      this.state = s;
      store.save(s);
      this.refreshReachable();
    }
    toast(msg) {
      platform.toast(msg);
    }
    sharePayload() {
      const owned = ownedCount(this.state.grid);
      const title = `\u6211\u7684\u9886\u5730\u5DF2\u7ECF ${owned} \u683C\u4E86\uFF0C\u6765\u9694\u58C1\u5360\u4E00\u683C`;
      return {
        title,
        query: "land=" + encodeShare(this.state),
        imageUrl: shareImage(
          title,
          "\u6BCF 100 \u6B65\u6362 1 \u5175\uFF0C\u4E00\u683C\u4E00\u683C\u5F80\u5916\u63A8",
          `\u7B2C ${this.state.cleared + 1} \u5F20\u56FE \xB7 ${owned} / ${TILES} \u683C`
        )
      };
    }
    /** 返回 true 表示触摸已被场景消费；end 一律放行给按钮热区 */
    handleTouch(x, y, phase) {
      if (phase !== "end") return false;
      if (this.mode !== "play" || this.winVisible) return false;
      if (x < GRID_X || x > GRID_X + GRID_PX || y < GRID_Y || y > GRID_Y + GRID_PX) return false;
      const col = clamp(Math.floor((x - GRID_X) / CELL), 0, GRID - 1);
      const row = clamp(Math.floor((y - GRID_Y) / CELL), 0, GRID - 1);
      const i = indexOf(row, col);
      if (this.state.grid[i] === MINE) {
        this.selected = i;
        this.toast(`\u4F60\u7684\u5730\uFF1A\u6BCF\u5C0F\u65F6 +${INCOME_PER_TILE_HOUR} \u5175`);
        return true;
      }
      const check = canClaim(this.state, i);
      if (!check.ok) {
        this.selected = i;
        this.toast(check.reason);
        return true;
      }
      const next = claim(this.state, i);
      if (!next) return true;
      this.commit(next);
      this.selected = i;
      this.burst = { i, p: 0 };
      platform.vibrate();
      if (isCleared(next)) {
        this.winVisible = true;
      }
      return true;
    }
    /** 每帧推进：时间驱动产出与反攻，不依赖任何倒计时 */
    tick() {
      this.t += 16;
      if (this.mode !== "play") return;
      const now = platform.now();
      const rolled = rollDay(this.state, platform.todayKey());
      if (rolled.newDay) {
        this.commit(rolled.state);
        this.todaySteps = 0;
        this.boostUsed = false;
        this.toast(`\u65B0\u7684\u4E00\u5929\uFF0C\u8FDE\u7EED ${this.state.streak} \u5929`);
      }
      const s = settle(this.state, now);
      if (s.gain > 0) {
        this.commit(s.state);
        this.pendingGain += s.gain;
        this.gainFlash = 1;
      }
      const r = raid(this.state, now);
      if (r.lost > 0) {
        this.commit(r.state);
        this.raidFlash = 1;
        this.toast(`\u654C\u8425\u53CD\u653B\uFF0C\u4E22\u4E86 ${r.lost} \u683C`);
      }
      if (this.burst) {
        this.burst.p += 1 / BURST_FRAMES;
        if (this.burst.p >= 1) this.burst = null;
      }
      if (this.raidFlash > 0) this.raidFlash = Math.max(0, this.raidFlash - 0.02);
      if (this.gainFlash > 0) this.gainFlash = Math.max(0, this.gainFlash - 0.02);
      this.frameCount++;
      if (this.frameCount % 1800 === 0) store.save(this.state);
    }
    syncSteps() {
      if (this.syncBusy) return;
      this.syncBusy = true;
      platform.readSteps().then((r) => {
        this.syncBusy = false;
        this.todaySteps = r.steps;
        this.realSteps = r.real;
        this.stepNote = r.note || (r.real ? "\u6765\u81EA\u5FAE\u4FE1\u8FD0\u52A8" : "\u672C\u5730\u4F30\u7B97");
        const res = applySteps(this.state, r.steps);
        this.commit(res.state);
        if (res.gained > 0) {
          this.toast(`\u4ECA\u65E5 ${r.steps} \u6B65 \xB7 \u6362\u5230 ${res.gained} \u5175`);
        } else if (res.delta > 0) {
          this.toast(`\u6B65\u6570 +${res.delta}\uFF0C\u8FD8\u5DEE ${100 - res.state.steps % 100} \u6B65\u6362 1 \u5175`);
        } else {
          this.toast("\u6B65\u6570\u6CA1\u6709\u65B0\u589E\uFF0C\u8D70\u4E24\u6B65\u518D\u6765");
        }
      }).catch(() => {
        this.syncBusy = false;
        this.toast("\u540C\u6B65\u5931\u8D25\uFF0C\u7A0D\u540E\u518D\u8BD5");
      });
    }
    boost() {
      if (this.boostUsed) {
        this.toast("\u4ECA\u5929\u5DF2\u7ECF\u8865\u8FC7\u4E00\u6B21\u4E86");
        return;
      }
      platform.rewardedAd((ok) => {
        if (!ok) {
          this.toast("\u6CA1\u770B\u5B8C\uFF0C\u6B65\u6570\u6CA1\u8865\u4E0A");
          return;
        }
        this.boostUsed = true;
        platform.setStore("sk_boost_day", platform.todayKey());
        const res = applySteps(this.state, this.state.steps + 2e3);
        this.todaySteps = res.state.steps;
        this.commit(res.state);
        this.toast("\u8865\u4E86 2000 \u6B65 \xB7 20 \u5175");
      });
    }
    openNextMap() {
      const next = nextMap(this.state, platform.now());
      this.commit(next);
      this.winVisible = false;
      this.selected = null;
      store.save(next);
      this.toast(`\u7B2C ${next.cleared + 1} \u5F20\u56FE\uFF0C\u5730\u4EF7\u8D35\u4E86 25%`);
    }
    draw() {
      this.tick();
      if (this.mode === "title") this.drawTitle();
      else if (this.mode === "stats") this.drawStats();
      else this.drawPlay();
      if (this.winVisible) this.drawWin();
      if (this.guideVisible) this.drawGuide();
    }
    // ---------------- 首页 ----------------
    drawTitle() {
      const ui2 = this.ui;
      const c = ui2.c;
      ui2.navBar("\u6B65\u6570\u9886\u5730");
      c.fillStyle = "#F7FAF2";
      c.fillRect(0, 44, DESIGN_W, 120);
      ui2.text("\u6B65\u6570\u9886\u5730", DESIGN_W / 2, 72, { size: 34, bold: true, align: "center" });
      ui2.text("\u4ECA\u5929\u8D70\u8FC7\u7684\u8DEF\uFF0C\u5C31\u662F\u660E\u5929\u5360\u7684\u5730", DESIGN_W / 2, 120, {
        size: 14,
        color: C.greenDark,
        align: "center"
      });
      drawMiniMap(c, DESIGN_W / 2, 268, 34, this.t);
      const owned = ownedCount(this.state.grid);
      ui2.text(`${owned} / ${TILES} \u683C`, DESIGN_W / 2, 344, {
        size: 22,
        bold: true,
        color: C.greenDark,
        align: "center"
      });
      if (this.friendLand) {
        ui2.text(
          `\u597D\u53CB\u7684\u9886\u5730\uFF1A${this.friendLand.owned} \u683C \xB7 \u7B2C ${this.friendLand.cleared + 1} \u5F20\u56FE`,
          DESIGN_W / 2,
          378,
          { size: 12, color: C.blue, align: "center" }
        );
      }
      ui2.button(20, 410, DESIGN_W - 40, 50, "\u5F00 \u59CB \u5360 \u5730", () => {
        this.mode = "play";
      });
      ui2.button(20, 472, 160, 44, "\u9886 \u5730 \u7EDF \u8BA1", () => {
        this.mode = "stats";
      }, "ghost");
      ui2.button(195, 472, 160, 44, "\u9001 \u597D \u53CB", () => platform.share(this.sharePayload()), "ghost");
      ui2.text(
        `\u4ECA\u5929\u7EA6 ${this.todaySteps.toLocaleString()} \u6B65 \xB7 \u6BCF 100 \u6B65\u6362 1 \u5175`,
        DESIGN_W / 2,
        540,
        { size: 13, color: C.ink, align: "center" }
      );
      ui2.text("\u53EA\u80FD\u5360\u548C\u81EA\u5DF1\u76F8\u90BB\u7684\u4E00\u683C\uFF0C\u6162\u6162\u5F80\u5916\u63A8", DESIGN_W / 2, 566, {
        size: 13,
        color: C.sub,
        align: "center"
      });
      ui2.text("\u79BB\u7EBF\u4E5F\u5728\u4EA7\u51FA\uFF0C\u6700\u591A\u8865 12 \u5C0F\u65F6", DESIGN_W / 2, 592, {
        size: 12,
        color: C.sub,
        align: "center"
      });
      ui2.panel(20, 618, DESIGN_W - 40, 34, 8, C.greenPale);
      ui2.text(
        `\u8FDE\u7EED ${this.state.streak} \u5929 \xB7 \u5DF2\u901A\u5173 ${this.state.cleared} \u5F20\u56FE`,
        DESIGN_W / 2,
        626,
        { size: 12, color: C.greenDark, align: "center" }
      );
    }
    // ---------------- 主玩法 ----------------
    drawPlay() {
      const ui2 = this.ui;
      const c = ui2.c;
      ui2.navBar("\u6B65\u6570\u9886\u5730", () => {
        this.mode = "title";
      });
      this.drawResourceBar();
      c.fillStyle = "#DCD3BC";
      roundPath(c, GRID_X - 3, GRID_Y - 3, GRID_PX + 6, GRID_PX + 6, 8);
      c.fill();
      for (let i = 0; i < TILES; i++) {
        const x = GRID_X + colOf(i) * CELL;
        const y = GRID_Y + rowOf(i) * CELL;
        const v = this.state.grid[i];
        let kind = "none";
        if (v === MINE) kind = "mine";
        else if (v === FOE) kind = "foe";
        else if (this.reachable.has(i)) kind = "reachable";
        const isBurst = !!this.burst && this.burst.i === i;
        const hl = isBurst && this.burst ? (1 - this.burst.p) * 0.5 : 0;
        const hasHut = v === MINE && (rowOf(i) + colOf(i)) % 5 === 0;
        drawTile(c, x, y, CELL, kind, this.t, hasHut, hl);
      }
      if (this.burst) {
        const i = this.burst.i;
        drawBurst(
          c,
          GRID_X + colOf(i) * CELL + CELL / 2,
          GRID_Y + rowOf(i) * CELL + CELL / 2,
          "#F5D96A",
          this.burst.p
        );
      }
      if (this.selected !== null) {
        const i = this.selected;
        const v = this.state.grid[i];
        const label = v === MINE ? "\u4F60\u7684\u5730" : v === FOE ? "\u654C\u8425" : "\u8352\u5730";
        const cost = v === FOE ? costOf(i, this.state.cleared) * 2 : costOf(i, this.state.cleared);
        ui2.text(`${label} \xB7 \u7B2C ${rowOf(i) + 1} \u884C\u7B2C ${colOf(i) + 1} \u5217`, 20, 432, {
          size: 13,
          bold: true,
          color: C.ink
        });
        if (v !== MINE) {
          ui2.text(`\u5360\u9886\u9700\u8981 ${cost} \u5175${v === FOE ? "\uFF08\u5F3A\u653B\u53CC\u500D\uFF09" : ""}`, 20, 452, {
            size: 12,
            color: v === FOE ? C.red : C.sub
          });
        } else {
          ui2.text(`\u6BCF\u5C0F\u65F6\u4EA7\u51FA ${INCOME_PER_TILE_HOUR} \u5175`, 20, 452, { size: 12, color: C.greenDark });
        }
        ui2.text(`\u53EF\u5360 ${this.reachable.size} \u683C`, DESIGN_W - 20, 432, {
          size: 12,
          color: C.sub,
          align: "right"
        });
      } else {
        ui2.text("\u70B9\u76F8\u90BB\u7684\u7A7A\u5730\u5360\u9886\uFF0C\u70B9\u81EA\u5DF1\u7684\u5730\u770B\u4EA7\u51FA", DESIGN_W / 2, 438, {
          size: 12,
          color: C.sub,
          align: "center"
        });
      }
      ui2.button(
        20,
        478,
        160,
        46,
        this.syncBusy ? "\u540C \u6B65 \u4E2D" : "\u540C \u6B65 \u6B65 \u6570",
        () => this.syncSteps(),
        "primary",
        !this.syncBusy
      );
      ui2.button(195, 478, 160, 46, "\u770B\u89C6\u9891 +2000 \u6B65", () => this.boost(), "ghost", !this.boostUsed, 14);
      ui2.button(20, 534, 160, 44, "\u9001 \u597D \u53CB", () => platform.share(this.sharePayload()), "ghost");
      ui2.button(195, 534, 160, 44, "\u9886 \u5730 \u7EDF \u8BA1", () => {
        this.mode = "stats";
      }, "ghost");
      const note = this.stepNote || "\u70B9\u300C\u540C\u6B65\u6B65\u6570\u300D\u628A\u4ECA\u5929\u7684\u6B65\u6570\u6362\u6210\u5175\u529B";
      ui2.text(note, DESIGN_W / 2, 590, {
        size: 12,
        color: this.realSteps ? C.greenDark : C.sub,
        align: "center",
        maxWidth: 335
      });
      ui2.text(
        `\u6BCF ${INCOME_PER_TILE_HOUR} \u5175 / \u683C / \u5C0F\u65F6 \xB7 \u79BB\u7EBF\u6700\u591A\u8865 12 \u5C0F\u65F6`,
        DESIGN_W / 2,
        616,
        { size: 11, color: C.sub, align: "center" }
      );
      ui2.text(
        `\u8FDE\u7EED ${this.state.streak} \u5929 \xB7 \u901A\u5173 ${this.state.cleared} \u6B21`,
        DESIGN_W / 2,
        638,
        { size: 11, color: C.sub, align: "center" }
      );
    }
    drawResourceBar() {
      const ui2 = this.ui;
      const c = ui2.c;
      const y = 52;
      const w = (DESIGN_W - 40 - 16) / 3;
      const cards = [
        { label: "\u5175\u529B", value: String(Math.floor(this.state.troops)), color: C.greenDark },
        { label: "\u4ECA\u65E5\u6B65\u6570", value: this.todaySteps.toLocaleString(), color: C.ink },
        { label: "\u6BCF\u5C0F\u65F6", value: `+${incomePerHour(this.state)}`, color: C.warn }
      ];
      cards.forEach((card, i) => {
        const x = 20 + i * (w + 8);
        ui2.panel(x, y, w, 56, 10, C.card);
        ui2.text(card.label, x + w / 2, y + 9, { size: 11, color: C.sub, align: "center" });
        ui2.text(card.value, x + w / 2, y + 26, {
          size: 19,
          bold: true,
          color: card.color,
          align: "center"
        });
      });
      if (this.gainFlash > 0) {
        c.save();
        c.globalAlpha = this.gainFlash;
        ui2.text(`+${this.pendingGain}`, 20 + w / 2, y + 44, {
          size: 11,
          bold: true,
          color: C.greenDark,
          align: "center"
        });
        c.restore();
      }
      if (this.raidFlash > 0) {
        c.save();
        c.globalAlpha = this.raidFlash;
        ui2.text("\u654C\u8425\u53CD\u653B", DESIGN_W - 20 - w / 2, y + 44, {
          size: 11,
          bold: true,
          color: C.red,
          align: "center"
        });
        c.restore();
      }
    }
    // ---------------- 统计 ----------------
    drawStats() {
      const ui2 = this.ui;
      ui2.navBar("\u9886\u5730\u7EDF\u8BA1", () => {
        this.mode = "title";
      });
      const owned = ownedCount(this.state.grid);
      const rows = [
        ["\u5F53\u524D\u9886\u5730", `${owned} / ${TILES} \u683C\uFF08${pctComplete(this.state)}%\uFF09`],
        ["\u901A\u5173\u5F20\u6570", `${this.state.cleared} \u5F20`],
        ["\u8FDE\u7EED\u767B\u5F55", `${this.state.streak} \u5929`],
        ["\u7D2F\u8BA1\u5360\u9886", `${this.state.totalOwned} \u683C`],
        ["\u6BCF\u5C0F\u65F6\u4EA7\u51FA", `${incomePerHour(this.state)} \u5175`],
        ["\u5386\u53F2\u6700\u591A", `${store.best()} \u683C`]
      ];
      rows.forEach((row, i) => {
        const y = 60 + i * 52;
        ui2.panel(20, y, DESIGN_W - 40, 44, 10, C.card);
        ui2.text(row[0], 36, y + 13, { size: 13, color: C.sub });
        ui2.text(row[1], DESIGN_W - 36, y + 13, { size: 14, bold: true, color: C.ink, align: "right" });
      });
      ui2.text(
        `\u7B2C ${this.state.cleared + 1} \u5F20\u56FE \xB7 \u5730\u4EF7\u7CFB\u6570 ${(1 + this.state.cleared * 0.25).toFixed(2)}x`,
        DESIGN_W / 2,
        442,
        { size: 12, color: C.sub, align: "center" }
      );
      ui2.button(20, 486, DESIGN_W - 40, 48, "\u56DE\u53BB\u5360\u5730", () => {
        this.mode = "play";
      });
      ui2.button(20, 546, DESIGN_W - 40, 44, "\u9001 \u597D \u53CB", () => platform.share(this.sharePayload()), "ghost");
    }
    // ---------------- 通关弹窗 ----------------
    drawWin() {
      const ui2 = this.ui;
      ui2.dim();
      ui2.regions.push({ x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, fn: () => {
      }, enabled: true });
      ui2.panel(32, 190, DESIGN_W - 64, 286, 16, C.card);
      ui2.text("\u9886\u5730\u8FDE\u6210\u4E00\u7247\u4E86", DESIGN_W / 2, 212, { size: 22, bold: true, align: "center" });
      ui2.text(`${TILES} \u683C\u5168\u90E8\u62FF\u4E0B`, DESIGN_W / 2, 248, {
        size: 14,
        color: C.greenDark,
        align: "center"
      });
      drawTroop(ui2.c, DESIGN_W / 2, 300, 22);
      ui2.text(`\u7B2C ${this.state.cleared + 1} \u5F20\u56FE\u5DF2\u5B8C\u6210`, DESIGN_W / 2, 334, {
        size: 13,
        color: C.ink,
        align: "center"
      });
      ui2.text("\u4E0B\u4E00\u5F20\u5730\u4EF7 +25%\uFF0C\u4F46\u4EA7\u51FA\u4E0D\u53D8", DESIGN_W / 2, 356, {
        size: 12,
        color: C.sub,
        align: "center"
      });
      ui2.button(56, 386, DESIGN_W - 112, 46, "\u5F00 \u4E0B \u4E00 \u5F20", () => this.openNextMap());
      ui2.button(56, 440, DESIGN_W - 112, 34, "\u5148\u770B\u770B\u9886\u5730", () => {
        this.winVisible = false;
      }, "plain", true, 13);
    }
    // ---------------- 首次引导 ----------------
    drawGuide() {
      const ui2 = this.ui;
      ui2.dim();
      ui2.regions.push({ x: 0, y: 0, w: DESIGN_W, h: DESIGN_H, fn: () => {
      }, enabled: true });
      ui2.panel(26, 150, DESIGN_W - 52, 340, 16, C.card);
      ui2.text("\u600E\u4E48\u73A9", DESIGN_W / 2, 172, { size: 22, bold: true, align: "center" });
      const tips = [
        "\u2460 \u70B9\u300C\u540C\u6B65\u6B65\u6570\u300D\uFF0C\u6BCF 100 \u6B65\u6362 1 \u5175",
        "\u2461 \u70B9\u548C\u81EA\u5DF1\u76F8\u90BB\u7684\u7A7A\u5730\uFF0C\u82B1\u5175\u5360\u4E0B\u6765",
        "\u2462 \u6BCF\u5360\u4E00\u683C\uFF0C\u6BCF\u5C0F\u65F6\u591A\u4EA7 3 \u5175",
        "\u2463 \u654C\u8425\u6BCF 6 \u5C0F\u65F6\u53CD\u653B\u4E00\u683C\uFF0C\u6253\u56DE\u6765\u5C31\u884C"
      ];
      tips.forEach((t, i) => {
        ui2.text(t, 48, 218 + i * 44, {
          size: 13,
          color: C.ink,
          maxWidth: 280,
          lineHeight: 18
        });
      });
      ui2.text("\u79BB\u7EBF\u4E5F\u5728\u4EA7\u51FA\uFF0C\u6700\u591A\u8865 12 \u5C0F\u65F6", DESIGN_W / 2, 410, {
        size: 13,
        bold: true,
        color: C.greenDark,
        align: "center"
      });
      ui2.text("\u4E0D\u7740\u6025\uFF0C\u4E00\u683C\u4E00\u683C\u6765", DESIGN_W / 2, 434, {
        size: 12,
        color: C.sub,
        align: "center"
      });
      ui2.button(48, 456, DESIGN_W - 96, 42, "\u77E5\u9053\u4E86", () => {
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
