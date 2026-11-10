// 分享卡片图 + 好友排行榜。
// 微信侧：主域通过开放数据域拿好友托管分数，并用离屏 Canvas 生成 5:4 分享图。
// 浏览器预览：全部走本地模拟数据 / 不生成图片，保证预览不报错。
declare const wx: any;
import { platform } from './platform';
import { store } from './storage';

export interface RankRow { name: string; score: number }

const DEMO: RankRow[] = [
  { name: '阿珍', score: 82 },
  { name: '小李', score: 74 },
  { name: '大壮', score: 63 },
];

let friendRank: RankRow[] = [];
let rankRequested = false;
let shareCanvas: any = null;   // 离屏画布全局只创建一次，反复重绘避免内存累积

/** 主域启动时调用一次：请求开放数据域读取好友榜 */
export function initRank(): void {
  if (!platform.isWx || rankRequested) return;
  rankRequested = true;
  try {
    wx.onMessage((msg: any) => {
      if (msg && msg.cmd === 'rank' && Array.isArray(msg.list)) {
        friendRank = msg.list.slice(0, 5);
      }
    });
    wx.getOpenDataContext().postMessage({ cmd: 'rank' });
  } catch (_) {
    friendRank = [];   // 未配置开放数据域时降级到本地榜
  }
}

/** 无好友/预览时造几个对手，保证「我」始终在榜里，界面不空 */
export function rankRows(): RankRow[] {
  const list = friendRank.slice();
  list.push({ name: '我', score: store.best() });
  if (!friendRank.length) DEMO.forEach(d => list.push(d));
  list.sort((a, b) => b.score - a.score);
  // 好友昵称来自外部数据，限长后再渲染，避免撑破榜单卡片
  return list.slice(0, 4).map(r => ({
    name: String(r.name).slice(0, 8),
    score: Number(r.score) || 0,
  }));
}

function roundRect(c: any, x: number, y: number, w: number, h: number, r: number): void {
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

function fillLines(c: any, text: string, x: number, y: number, maxW: number, lh: number, maxLines: number): void {
  let cur = '', used = 0;
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

/**
 * 生成分享卡片（500x400，微信推荐 5:4）。
 * 任何一步不支持都返回 undefined，platform 会退回无图分享，绝不阻断分享动作。
 */
export function shareImage(title: string, sub: string, badge = ''): string | undefined {
  if (!platform.isWx) return undefined;
  try {
    if (!shareCanvas) {
      shareCanvas = wx.createCanvas();  // 第二次 createCanvas = 离屏画布
      shareCanvas.width = 500;
      shareCanvas.height = 400;
    }
    const cv = shareCanvas;
    const c = cv.getContext('2d');
    c.clearRect(0, 0, 500, 400);

    const grad = c.createLinearGradient(0, 0, 500, 400);
    grad.addColorStop(0, '#07C160');
    grad.addColorStop(1, '#04954A');
    c.fillStyle = grad;
    c.fillRect(0, 0, 500, 400);
    c.fillStyle = 'rgba(255,255,255,0.08)';
    c.beginPath(); c.arc(440, 50, 96, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(56, 372, 128, 0, Math.PI * 2); c.fill();

    c.fillStyle = '#FFFFFF';
    roundRect(c, 36, 74, 428, 250, 18);
    c.fill();

    c.textAlign = 'left';
    c.textBaseline = 'top';
    c.font = 'bold 34px "PingFang SC", "Microsoft YaHei", sans-serif';
    c.fillStyle = '#191919';
    fillLines(c, title, 64, 104, 372, 44, 2);

    c.font = '20px "PingFang SC", "Microsoft YaHei", sans-serif';
    c.fillStyle = '#8A8A8A';
    fillLines(c, sub, 64, 206, 372, 30, 2);

    if (badge) {
      c.font = 'bold 22px "PingFang SC", "Microsoft YaHei", sans-serif';
      c.fillStyle = '#07C160';
      c.fillText(badge, 64, 272);
    }

    c.font = '18px "PingFang SC", "Microsoft YaHei", sans-serif';
    c.fillStyle = 'rgba(255,255,255,0.92)';
    c.textAlign = 'center';
    c.fillText('这话接不接 · 微信小游戏', 250, 350);

    const out = cv.toTempFilePathSync({
      x: 0, y: 0, width: 500, height: 400,
      destWidth: 500, destHeight: 400,
    });
    if (typeof out === 'string') return out;
    if (out && typeof out.tempFilePath === 'string') return out.tempFilePath;
    return undefined;
  } catch (_) {
    return undefined;
  }
}
