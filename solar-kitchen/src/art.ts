// 零美术资源：食材、锅、火候条、蒸汽全部用 Canvas 基础图元画。
// 食材按名字哈希决定形状与颜色，保证同一种食材在任何界面里长得一样。

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

function hash(name: string): number {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const ING_COLORS = [
  '#7FAF5E', '#D9A33B', '#C4703C', '#8FBF7A',
  '#B8865A', '#D98C8C', '#9BB86A', '#C9A227', '#6E9E8A',
];

export function ingColor(name: string): string {
  return ING_COLORS[hash(name) % ING_COLORS.length];
}

/** 三种外形：叶菜 / 根茎 / 果实，按名字哈希固定 */
export function drawIngredient(c: any, x: number, y: number, s: number, name: string): void {
  const color = ingColor(name);
  const kind = hash(name) % 3;
  c.save();
  c.translate(x, y);

  if (kind === 0) {
    // 叶菜：一片叶子 + 叶脉
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
    c.strokeStyle = 'rgba(255,255,255,0.55)';
    c.lineWidth = Math.max(1, s * 0.06);
    c.stroke();
    c.restore();
  } else if (kind === 1) {
    // 根茎：圆锥 + 两根须
    c.beginPath();
    c.moveTo(0, -s * 0.5);
    c.quadraticCurveTo(s * 0.34, s * 0.1, s * 0.06, s * 0.52);
    c.quadraticCurveTo(-s * 0.3, s * 0.12, 0, -s * 0.5);
    c.fillStyle = color;
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.4)';
    c.lineWidth = Math.max(1, s * 0.05);
    c.beginPath();
    c.moveTo(s * 0.04, s * 0.3);
    c.lineTo(s * 0.3, s * 0.5);
    c.stroke();
  } else {
    // 果实：圆 + 高光 + 小蒂
    circ(c, 0, s * 0.06, s * 0.42, color);
    circ(c, -s * 0.14, -s * 0.08, s * 0.12, 'rgba(255,255,255,0.5)');
    rect(c, -s * 0.05, -s * 0.5, s * 0.1, s * 0.14, '#5F7A45');
  }
  c.restore();
}

/** 锅：深色锅身 + 两侧把手 + 汤面 */
export function drawPot(c: any, x: number, y: number, w: number, h: number, t: number): void {
  c.save();
  // 锅身
  c.beginPath();
  c.moveTo(x - w / 2, y - h / 2);
  c.lineTo(x + w / 2, y - h / 2);
  c.quadraticCurveTo(x + w / 2 - 6, y + h / 2, x, y + h / 2);
  c.quadraticCurveTo(x - w / 2 + 6, y + h / 2, x - w / 2, y - h / 2);
  c.closePath();
  c.fillStyle = '#4A382B';
  c.fill();
  // 把手
  rect(c, x - w / 2 - 12, y - h / 2 + 4, 12, 7, '#3A2C22');
  rect(c, x + w / 2, y - h / 2 + 4, 12, 7, '#3A2C22');
  // 汤面
  c.save();
  c.translate(x, y - h / 2);
  c.scale(1, 7 / Math.max(6, w / 2 - 2));
  c.beginPath();
  c.arc(0, 0, w / 2 - 2, 0, Math.PI * 2);
  c.fillStyle = '#7A5A38';
  c.fill();
  c.restore();
  c.restore();

  // 冒泡：三颗随时间起伏的小圆
  for (let i = 0; i < 3; i++) {
    const ph = (t / 700 + i * 0.7) % 1;
    c.save();
    c.globalAlpha = 0.25 + (1 - ph) * 0.35;
    circ(c, x - w / 4 + i * (w / 4), y - h / 2 - ph * 10, 3 * (1 - ph * 0.4), '#F0D9B8');
    c.restore();
  }
}

/** 蒸汽：三条正弦曲线往上飘 */
export function drawSteam(c: any, x: number, y: number, t: number): void {
  c.save();
  c.strokeStyle = 'rgba(255,255,255,0.55)';
  c.lineWidth = 2;
  c.lineCap = 'round';
  for (let i = -1; i <= 1; i++) {
    c.beginPath();
    for (let k = 0; k <= 8; k++) {
      const py = y - k * 5;
      const px = x + i * 12 + Math.sin(t / 520 + k * 0.7 + i) * 4;
      if (k === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.stroke();
  }
  c.restore();
}

/** 火候条：糊 / 不错 / 完美 / 不错 / 糊，五段底色，指针一条白线 */
export function drawHeatBar(c: any, x: number, y: number, w: number, h: number, pos: number): void {
  const seg = (from: number, to: number, color: string) => {
    rect(c, x + w * from, y, Math.max(1, w * (to - from)), h, color);
  };
  c.save();
  seg(0, 0.30, '#A6524A');
  seg(0.30, 0.44, '#7FAF5E');
  seg(0.44, 0.56, '#F2C14E');
  seg(0.56, 0.70, '#7FAF5E');
  seg(0.70, 1, '#A6524A');

  // 中线提示
  c.strokeStyle = 'rgba(255,255,255,0.65)';
  c.lineWidth = 1;
  c.setLineDash([3, 4]);
  c.beginPath();
  c.moveTo(x + w * 0.5, y);
  c.lineTo(x + w * 0.5, y + h);
  c.stroke();
  c.setLineDash([]);

  // 指针
  const px = x + w * Math.max(0, Math.min(1, pos));
  c.beginPath();
  c.moveTo(px, y - 10);
  c.lineTo(px - 7, y - 20);
  c.lineTo(px + 7, y - 20);
  c.closePath();
  c.fillStyle = '#FFFFFF';
  c.fill();
  rect(c, px - 2, y - 12, 4, h + 8, '#FFFFFF');
  c.restore();
}

/** 盘子：白盘 + 内圈阴影 + 两道菜色 */
export function drawPlate(c: any, x: number, y: number, r: number, t: number): void {
  c.save();
  circ(c, x, y, r, '#FFFFFF');
  circ(c, x, y, r * 0.86, '#F7F1E6');
  circ(c, x - r * 0.26, y + r * 0.1, r * 0.26, '#C9A227');
  circ(c, x + r * 0.28, y - r * 0.06, r * 0.22, '#8FBF7A');
  circ(c, x + r * 0.1, y + r * 0.34, r * 0.12, '#C4703C');
  c.restore();
  drawSteam(c, x, y - r * 0.7, t);
}

/** 星星：完美 / 不错 / 糊 分别 3 / 2 / 1 颗 */
export function drawStar(c: any, x: number, y: number, r: number, filled: boolean): void {
  c.save();
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
  }
  c.closePath();
  if (filled) {
    c.fillStyle = '#F2C14E';
    c.fill();
  } else {
    c.strokeStyle = '#D9CDBC';
    c.lineWidth = 1.2;
    c.stroke();
  }
  c.restore();
}

export function drawCoin(c: any, x: number, y: number, r: number): void {
  c.save();
  circ(c, x, y, r, '#D9A33B');
  circ(c, x, y, r * 0.66, '#F2C14E');
  c.restore();
}

/** 节气印章：方形圆角 + 季节色边框，里面写节气名（文字由 UI 画） */
export function drawSeal(c: any, x: number, y: number, size: number, color: string): void {
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
