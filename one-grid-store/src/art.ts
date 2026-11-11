// 零美术资源：8 种商品全部用 Canvas 基础图元画，形状 + 颜色双重区分，不靠文字也认得出。

function circ(c: any, x: number, y: number, r: number, fill: string): void {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fillStyle = fill;
  c.fill();
}

function rect(c: any, x: number, y: number, w: number, h: number, fill: string): void {
  c.fillStyle = fill;
  c.fillRect(x, y, w, h);
}

function roundRect(c: any, x: number, y: number, w: number, h: number, r: number): void {
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

export const GOODS_COLORS = [
  '#4A90D9', '#D9A05B', '#E8EEF5', '#E4572E',
  '#E8A020', '#7B4FB5', '#F2A0C0', '#5FA86B',
];

export const GOODS_NAMES = ['饮料', '面包', '牛奶', '苹果', '泡面', '薯片', '冰淇淋', '便当'];

/** 单个商品图形，s 为整体尺寸（约等于高度） */
export function drawGoods(c: any, x: number, y: number, s: number, kind: number): void {
  const k = ((kind % 8) + 8) % 8;
  const color = GOODS_COLORS[k];
  const h = s * 0.5;
  c.save();
  c.translate(x, y);

  if (k === 0) {
    // 饮料罐
    roundRect(c, -h * 0.42, -h, h * 0.84, h * 2, h * 0.22);
    c.fillStyle = color;
    c.fill();
    rect(c, -h * 0.42, -h * 0.3, h * 0.84, h * 0.5, 'rgba(255,255,255,0.5)');
  } else if (k === 1) {
    // 面包
    c.beginPath();
    c.arc(0, 0, h * 0.95, Math.PI, 0);
    c.lineTo(h * 0.95, h * 0.5);
    c.lineTo(-h * 0.95, h * 0.5);
    c.closePath();
    c.fillStyle = color;
    c.fill();
    c.strokeStyle = 'rgba(120,80,40,0.45)';
    c.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
      c.beginPath();
      c.moveTo(i * h * 0.4 - 4, -h * 0.5);
      c.lineTo(i * h * 0.4 + 4, h * 0.2);
      c.stroke();
    }
  } else if (k === 2) {
    // 牛奶盒
    roundRect(c, -h * 0.55, -h * 0.8, h * 1.1, h * 1.6, h * 0.12);
    c.fillStyle = color;
    c.fill();
    c.strokeStyle = '#B9C6D4';
    c.lineWidth = 1.5;
    c.stroke();
    c.beginPath();
    c.moveTo(-h * 0.55, -h * 0.8);
    c.lineTo(0, -h * 1.15);
    c.lineTo(h * 0.55, -h * 0.8);
    c.closePath();
    c.fillStyle = '#D7E2EC';
    c.fill();
    rect(c, -h * 0.28, -h * 0.2, h * 0.56, h * 0.5, '#4A90D9');
  } else if (k === 3) {
    // 苹果
    circ(c, 0, h * 0.1, h * 0.85, color);
    c.beginPath();
    c.moveTo(0, -h * 0.7);
    c.quadraticCurveTo(h * 0.1, -h * 1.15, h * 0.45, -h * 1.05);
    c.quadraticCurveTo(h * 0.25, -h * 0.85, 0, -h * 0.7);
    c.fillStyle = '#5FA86B';
    c.fill();
    circ(c, -h * 0.28, -h * 0.1, h * 0.2, 'rgba(255,255,255,0.5)');
  } else if (k === 4) {
    // 泡面碗
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
    c.strokeStyle = '#C97E12';
    c.lineWidth = 2.4;
    c.stroke();
  } else if (k === 5) {
    // 薯片袋
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
      const px = -w + (i * 2 * w) / 5;
      c.lineTo(px, -h - (i % 2 === 0 ? 6 : 0));
    }
    c.strokeStyle = '#5A2F8A';
    c.lineWidth = 2;
    c.stroke();
    circ(c, 0, h * 0.15, h * 0.3, 'rgba(255,255,255,0.55)');
  } else if (k === 6) {
    // 冰淇淋
    c.beginPath();
    c.moveTo(-h * 0.55, -h * 0.1);
    c.lineTo(h * 0.55, -h * 0.1);
    c.lineTo(0, h * 1.1);
    c.closePath();
    c.fillStyle = '#D9A05B';
    c.fill();
    circ(c, -h * 0.22, -h * 0.4, h * 0.42, color);
    circ(c, h * 0.24, -h * 0.42, h * 0.38, '#F5C7D8');
  } else {
    // 便当盒
    roundRect(c, -h, -h * 0.7, h * 2, h * 1.5, h * 0.16);
    c.fillStyle = color;
    c.fill();
    rect(c, -h * 0.86, -h * 0.5, h * 0.7, h * 0.5, '#F2C14E');
    rect(c, -h * 0.06, -h * 0.5, h * 0.7, h * 0.5, '#E4572E');
    rect(c, -h * 0.86, h * 0.06, h * 1.5, h * 0.18, 'rgba(255,255,255,0.6)');
  }
  c.restore();
}

/** 货架格子：白底圆角 + 商品 + 右下角数量徽章 */
export function drawShelfCell(
  c: any, x: number, y: number, w: number, h: number,
  kind: number, count: number, t: number,
): void {
  roundRect(c, x, y, w, h, 10);
  c.fillStyle = '#FFFFFF';
  c.fill();
  c.strokeStyle = '#E1E9E4';
  c.lineWidth = 1;
  c.stroke();

  // 底部一层淡色货架板
  rect(c, x + 4, y + h - 10, w - 8, 4, '#EEF3EF');

  drawGoods(c, x + w / 2, y + h / 2 - 6, 40, kind);

  if (count > 0) {
    circ(c, x + w - 14, y + h - 16, 9, count >= 3 ? '#1F9D55' : '#7C8C85');
    c.fillStyle = '#FFFFFF';
    c.font = 'bold 11px -apple-system, "PingFang SC", sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(String(count), x + w - 14, y + h - 15);
  }
}

/** 空货架格 */
export function drawEmptyCell(c: any, x: number, y: number, w: number, h: number): void {
  roundRect(c, x, y, w, h, 10);
  c.fillStyle = '#F7FAF8';
  c.fill();
  c.save();
  c.setLineDash([5, 5]);
  c.strokeStyle = '#DFE8E2';
  c.lineWidth = 1;
  c.stroke();
  c.restore();
}

/** 购物篮槽位 */
export function drawBasketSlot(
  c: any, x: number, y: number, size: number, kind: number | null, highlight: boolean,
): void {
  roundRect(c, x, y, size, size, 9);
  c.fillStyle = kind === null ? '#F7FAF8' : '#FFFFFF';
  c.fill();
  c.strokeStyle = highlight ? '#1F9D55' : '#DCE7E0';
  c.lineWidth = highlight ? 2 : 1.2;
  c.stroke();
  if (kind !== null) drawGoods(c, x + size / 2, y + size / 2, size * 0.62, kind);
  else {
    c.save();
    c.strokeStyle = 'rgba(124,140,133,0.35)';
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

/** 营业额进度条 */
export function drawProgress(
  c: any, x: number, y: number, w: number, h: number, ratio: number,
): void {
  roundRect(c, x, y, w, h, h / 2);
  c.fillStyle = '#E7EFE9';
  c.fill();
  const r = Math.max(0, Math.min(1, ratio));
  if (r > 0) {
    roundRect(c, x, y, Math.max(h, w * r), h, h / 2);
    const g = c.createLinearGradient(x, y, x + w * r, y);
    g.addColorStop(0, '#3FCB7A');
    g.addColorStop(1, '#1F9D55');
    c.fillStyle = g;
    c.fill();
  }
}

export function drawCoin(c: any, x: number, y: number, r: number): void {
  circ(c, x, y, r, '#E8A020');
  circ(c, x, y, r * 0.62, '#F7C85C');
}

/** 消除时的三连爆点 */
export function drawPop(c: any, x: number, y: number, color: string, p: number): void {
  const q = Math.max(0, Math.min(1, p));
  c.save();
  c.globalAlpha = 1 - q;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    circ(c, x + Math.cos(a) * (8 + q * 26), y + Math.sin(a) * (8 + q * 26), 3 * (1 - q) + 1, color);
  }
  c.restore();
}
