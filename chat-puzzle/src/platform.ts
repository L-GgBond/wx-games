// 运行时平台适配：同一份 game.js 既能被微信小游戏加载，也能在浏览器里预览。
// 所有坐标系统一为设计分辨率 375 x 667（逻辑点），由本层做等比缩放与触摸反算。
declare const wx: any;

export const DESIGN_W = 375;
export const DESIGN_H = 667;

// 激励视频广告单元 ID：上线前填入真实值；留空时自动走「演示模式直接发放提示」，保证项目可运行。
export const AD_UNIT_ID = '';

export type TouchPhase = 'start' | 'move' | 'end';
export type TouchHandler = (x: number, y: number, phase: TouchPhase) => void;

export interface SharePayload {
  title: string;
  query: string;
  /** 分享卡片图（由 social.ts 生成）；预览模式与生成失败时为空 */
  imageUrl?: string;
}

export interface IPlatform {
  readonly isWx: boolean;
  readonly ctx: any;
  beginFrame(): void;
  onTouch(cb: TouchHandler): void;
  requestFrame(cb: (t: number) => void): void;
  getLaunchQuery(): Record<string, any>;
  onShow(cb: () => void): void;
  share(p: SharePayload): void;
  onShareAppMessage(cb: () => SharePayload): void;
  rewardedAd(cb: (ok: boolean) => void): void;
  toast(msg: string): void;
  vibrate(): void;
  getStore<T>(key: string, fallback: T): T;
  setStore(key: string, value: any): void;
  setCloudScore(score: number): void;
}

abstract class BasePlatform implements IPlatform {
  abstract readonly isWx: boolean;
  canvas: any;
  ctx: any;
  protected dpr = 1;
  protected screenW = DESIGN_W;
  protected screenH = DESIGN_H;
  protected scale = 1;
  protected offX = 0;
  protected offY = 0;
  protected handler: TouchHandler = () => {};

  protected layout(w: number, h: number, dpr: number): void {
    this.screenW = w;
    this.screenH = h;
    this.dpr = dpr;
    this.scale = Math.min(w / DESIGN_W, h / DESIGN_H);
    this.offX = (w - DESIGN_W * this.scale) / 2;
    this.offY = (h - DESIGN_H * this.scale) / 2;
    this.canvas.width = Math.max(1, Math.round(w * dpr));
    this.canvas.height = Math.max(1, Math.round(h * dpr));
    this.ctx = this.canvas.getContext('2d');
  }

  protected toDesign(cx: number, cy: number, left = 0, top = 0): [number, number] {
    return [
      (cx - left - this.offX) / this.scale,
      (cy - top - this.offY) / this.scale,
    ];
  }

  beginFrame(): void {
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#111318';
    c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    c.setTransform(
      this.dpr * this.scale, 0, 0, this.dpr * this.scale,
      this.dpr * this.offX, this.dpr * this.offY,
    );
    c.fillStyle = '#EDEDED';
    c.fillRect(0, 0, DESIGN_W, DESIGN_H);
  }

  onTouch(cb: TouchHandler): void {
    this.handler = cb;
  }

  requestFrame(cb: (t: number) => void): void {
    // 不依赖 globalThis，兼容较旧的小游戏基础库
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(cb);
    else setTimeout(() => cb(Date.now()), 16);
  }

  vibrate(): void {
    // 浏览器默认不震动，微信实现覆写
  }

  abstract getLaunchQuery(): Record<string, any>;
  abstract onShow(cb: () => void): void;
  abstract share(p: SharePayload): void;
  abstract onShareAppMessage(cb: () => SharePayload): void;
  abstract rewardedAd(cb: (ok: boolean) => void): void;
  abstract toast(msg: string): void;
  abstract getStore<T>(key: string, fallback: T): T;
  abstract setStore(key: string, value: any): void;
  abstract setCloudScore(score: number): void;
}

class BrowserPlatform extends BasePlatform {
  readonly isWx = false;
  private toastTimer: any = null;

  constructor() {
    super();
    this.canvas = document.getElementById('game') as HTMLCanvasElement;
    this.relayout();
    window.addEventListener('resize', () => this.relayout());

    const map = (e: PointerEvent, phase: TouchPhase) => {
      const r = this.canvas.getBoundingClientRect();
      const [x, y] = this.toDesign(e.clientX, e.clientY, r.left, r.top);
      this.handler(x, y, phase);
    };
    this.canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      e.preventDefault();
      try { this.canvas.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
      map(e, 'start');
    });
    this.canvas.addEventListener('pointermove', (e: PointerEvent) => {
      if (e.buttons > 0) map(e, 'move');
    });
    this.canvas.addEventListener('pointerup', (e: PointerEvent) => map(e, 'end'));
    this.canvas.addEventListener('pointercancel', (e: PointerEvent) => map(e, 'end'));
  }

  private relayout(): void {
    const r = this.canvas.getBoundingClientRect();
    this.layout(r.width || DESIGN_W, r.height || DESIGN_H, window.devicePixelRatio || 1);
  }

  getLaunchQuery(): Record<string, any> {
    const out: Record<string, string> = {};
    const s = location.search.replace(/^\?/, '');
    if (s) s.split('&').forEach(kv => {
      const [k, v = ''] = kv.split('=');
      out[decodeURIComponent(k)] = decodeURIComponent(v);
    });
    return out;
  }

  onShow(cb: () => void): void {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) cb();
    });
  }

  share(p: SharePayload): void {
    const url = location.origin + location.pathname + '?' + p.query;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    this.toast('预览模式：已复制求助链接\n' + url);
  }

  onShareAppMessage(_cb: () => SharePayload): void {
    // 浏览器无右上角转发，由场景内按钮直接调用 share()
  }

  rewardedAd(cb: (ok: boolean) => void): void {
    this.toast('预览模式：模拟观看激励视频…');
    setTimeout(() => {
      this.toast('观看完成，已发放一次提示');
      cb(true);
    }, 1500);
  }

  toast(msg: string): void {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.style.whiteSpace = 'pre-line';
    el.style.display = 'block';
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { el.style.display = 'none'; }, 2200);
  }

  getStore<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw) as T;
    } catch (_) { return fallback; }
  }

  setStore(key: string, value: any): void {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* noop */ }
  }

  setCloudScore(_score: number): void {
    // 预览模式：写入本地模拟托管数据
  }
}

class WxPlatform extends BasePlatform {
  readonly isWx = true;
  private rewarded: any = null;
  private adCb: ((ok: boolean) => void) | null = null;

  constructor() {
    super();
    const sys = wx.getSystemInfoSync();
    this.canvas = wx.createCanvas();
    this.layout(sys.windowWidth, sys.windowHeight, sys.pixelRatio || 1);

    const emit = (e: any, phase: TouchPhase) => {
      const list = phase === 'end' ? e.changedTouches : e.touches;
      const t = list && list[0];
      if (!t) return;
      const [x, y] = this.toDesign(t.clientX, t.clientY, 0, 0);
      this.handler(x, y, phase);
    };
    wx.onTouchStart((e: any) => emit(e, 'start'));
    wx.onTouchMove((e: any) => emit(e, 'move'));
    wx.onTouchEnd((e: any) => emit(e, 'end'));
    wx.onTouchCancel((e: any) => emit(e, 'end'));
  }

  getLaunchQuery(): Record<string, any> {
    try { return wx.getLaunchOptionsSync().query || {}; } catch (_) { return {}; }
  }

  onShow(cb: () => void): void {
    wx.onShow(cb);
  }

  share(p: SharePayload): void {
    const opts: any = { title: p.title, query: p.query };
    if (p.imageUrl) opts.imageUrl = p.imageUrl;
    wx.shareAppMessage(opts);
  }

  onShareAppMessage(cb: () => SharePayload): void {
    wx.onShareAppMessage(() => {
      const p = cb();
      const opts: any = { title: p.title, query: p.query };
      if (p.imageUrl) opts.imageUrl = p.imageUrl;
      return opts;
    });
  }

  private ensureAd(): void {
    if (this.rewarded || !AD_UNIT_ID) return;
    this.rewarded = wx.createRewardedVideoAd({ adUnitId: AD_UNIT_ID });
    this.rewarded.onClose((res: any) => {
      const cb = this.adCb;
      this.adCb = null;
      if (cb) cb(!!(res && res.isEnded));
    });
    this.rewarded.onError(() => {
      const cb = this.adCb;
      this.adCb = null;
      if (cb) { this.toast('广告加载失败，已直接发放提示'); cb(true); }
    });
  }

  rewardedAd(cb: (ok: boolean) => void): void {
    if (!AD_UNIT_ID) {
      this.toast('未配置广告单元，演示模式直接发放提示');
      cb(true);
      return;
    }
    try {
      this.ensureAd();
      this.adCb = cb;
      this.rewarded.show().catch(() =>
        this.rewarded.load().then(() => this.rewarded.show()).catch(() => {
          const pending = this.adCb;
          this.adCb = null;
          if (pending) { this.toast('广告暂不可用，已直接发放提示'); pending(true); }
        }),
      );
    } catch (_) {
      this.adCb = null;
      this.toast('广告不可用，已直接发放提示');
      cb(true);
    }
  }

  toast(msg: string): void {
    wx.showToast({ title: String(msg).slice(0, 30), icon: 'none', duration: 2000 });
  }

  vibrate(): void {
    try { wx.vibrateShort({ type: 'light' }); } catch (_) { /* noop */ }
  }

  getStore<T>(key: string, fallback: T): T {
    try {
      const v = wx.getStorageSync(key);
      return (v === '' || v === null || v === undefined) ? fallback : v as T;
    } catch (_) { return fallback; }
  }

  setStore(key: string, value: any): void {
    try { wx.setStorageSync(key, value); } catch (_) { /* noop */ }
  }

  setCloudScore(score: number): void {
    try {
      wx.setUserCloudStorage({
        KVDataList: [{ key: 'score', value: String(score) }],
      });
    } catch (_) { /* 未开放托管数据能力时忽略 */ }
  }
}

const isWx = typeof wx !== 'undefined' && typeof wx.getSystemInfoSync === 'function';
export const platform: IPlatform = isWx ? new WxPlatform() : new BrowserPlatform();
