// 分享卡片图：微信侧用离屏 Canvas 画 5:4 卡片，浏览器预览返回 undefined。
declare const wx: any;
import { platform } from './platform';

let shareCanvas: any = null;   // 离屏画布全局只创建一次，反复重绘避免内存累积

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

/** 生成失败一律返回 undefined，platform 会退回无图分享，不阻断分享动作 */
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
    grad.addColorStop(0, '#6B3FA0');
    grad.addColorStop(1, '#2E1E3F');
    c.fillStyle = grad;
    c.fillRect(0, 0, 500, 400);
    c.fillStyle = 'rgba(255,255,255,0.07)';
    c.beginPath(); c.arc(430, 66, 100, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(60, 360, 120, 0, Math.PI * 2); c.fill();

    c.fillStyle = '#FFFFFF';
    roundRect(c, 36, 74, 428, 250, 18);
    c.fill();

    c.textAlign = 'left';
    c.textBaseline = 'top';
    c.font = 'bold 34px "PingFang SC", "Microsoft YaHei", sans-serif';
    c.fillStyle = '#1F2A1F';
    fillLines(c, title, 64, 104, 372, 44, 2);

    c.font = '20px "PingFang SC", "Microsoft YaHei", sans-serif';
    c.fillStyle = '#7C8A7C';
    fillLines(c, sub, 64, 206, 372, 30, 2);

    if (badge) {
      c.font = 'bold 22px "PingFang SC", "Microsoft YaHei", sans-serif';
      c.fillStyle = '#2F7B46';
      c.fillText(badge, 64, 272);
    }

    c.font = '18px "PingFang SC", "Microsoft YaHei", sans-serif';
    c.fillStyle = 'rgba(255,255,255,0.92)';
    c.textAlign = 'center';
    c.fillText('反向塔防 · 我是 Boss', 250, 350);

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
