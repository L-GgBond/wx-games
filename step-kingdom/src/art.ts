// 零美术资源：领地全部用 Canvas 基础图元画。
// 三种地块（荒地 / 己方 / 敌营）在颜色和轮廓上必须一眼可分，这是「一眼看懂地图」的前提。

function rect(c: any, x: number, y: number, w: number, h: number, fill: string): void {
  c.fillStyle = fill;
  c.fillRect(x, y, w, h);
}

function circ(c: any, x: number, y: number, r: number, fill: string): void {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fillStyle = fill;
  c.fill();
}

function tri(c: any, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, fill: string): void {
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.lineTo(x3, y3);
  c.closePath();
  c.fillStyle = fill;
  c.fill();
}

/** 小旗：己方地块的标记，旗面按 size 缩放 */
export function drawFlag(c: any, x: number, y: number, s: number, color: string): void {
  c.save();
  c.strokeStyle = '#5C4A32';
  c.lineWidth = Math.max(1.2, s * 0.08);
  c.lineCap = 'round';
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

/** 敌营：三根尖刺 + 一个暗色底座 */
export function drawCamp(c: any, x: number, y: number, s: number): void {
  c.save();
  rect(c, x - s * 0.42, y + s * 0.16, s * 0.84, s * 0.2, '#8E3A2B');
  for (let i = -1; i <= 1; i++) {
    tri(c, x + i * s * 0.26 - s * 0.1, y + s * 0.18,
      x + i * s * 0.26, y - s * 0.42,
      x + i * s * 0.26 + s * 0.1, y + s * 0.18, '#C2543F');
  }
  circ(c, x, y + s * 0.02, s * 0.1, '#F0C9BE');
  c.restore();
}

/** 小屋：己方腹地的装饰，按地块坐标决定有无，纯视觉 */
export function drawHut(c: any, x: number, y: number, s: number): void {
  c.save();
  rect(c, x - s * 0.3, y - s * 0.12, s * 0.6, s * 0.42, '#F6EFDF');
  tri(c, x - s * 0.38, y - s * 0.1, x, y - s * 0.52, x + s * 0.38, y - s * 0.1, '#9C7A52');
  rect(c, x - s * 0.08, y + s * 0.12, s * 0.16, s * 0.18, '#7A6248');
  c.restore();
}

export type TileKind = 'none' | 'mine' | 'foe' | 'reachable' | 'blocked';

/** 单格绘制；highlight 用于「刚被点过」的短暂反馈 */
export function drawTile(
  c: any, x: number, y: number, size: number,
  kind: TileKind, t: number, hasHut = false, highlight = 0,
): void {
  const pad = 1;
  const s = size - pad * 2;
  const px = x + pad, py = y + pad;

  if (kind === 'mine') {
    rect(c, px, py, s, s, '#8CC47A');
    rect(c, px, py, s, s * 0.16, '#A5D293');
    // 田垄纹理
    c.save();
    c.strokeStyle = 'rgba(72,120,60,0.16)';
    c.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      c.beginPath();
      c.moveTo(px + 2, py + (s / 4) * i);
      c.lineTo(px + s - 2, py + (s / 4) * i);
      c.stroke();
    }
    c.restore();
    if (hasHut) drawHut(c, px + s / 2, py + s / 2, s);
    else drawFlag(c, px + s * 0.5, py + s * 0.72, s * 0.42, '#2F7B46');
  } else if (kind === 'foe') {
    rect(c, px, py, s, s, '#E4B7AC');
    rect(c, px, py, s, s * 0.16, '#EFC9BF');
    drawCamp(c, px + s / 2, py + s / 2, s);
  } else {
    rect(c, px, py, s, s, '#E9E0CB');
    // 荒地草点，位置由坐标决定，避免每帧跳动
    c.save();
    c.fillStyle = 'rgba(150,164,120,0.5)';
    const seed = (x * 13 + y * 7) % 11;
    for (let i = 0; i < 3; i++) {
      const gx = px + 5 + ((seed + i * 7) % (s - 10));
      const gy = py + 6 + ((seed + i * 11) % (s - 12));
      c.fillRect(gx, gy, 2, 2);
    }
    c.restore();
  }

  if (kind === 'reachable') {
    // 可占领：呼吸式描边，告诉玩家「这里点得动」
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
    rect(c, px, py, s, s, '#FFFFFF');
    c.restore();
  }

  // 网格线
  c.save();
  c.strokeStyle = 'rgba(110,130,100,0.18)';
  c.lineWidth = 1;
  c.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);
  c.restore();
}

/** 兵力图标：一枚小圆章 */
export function drawTroop(c: any, x: number, y: number, r: number): void {
  circ(c, x, y, r, '#3E9B5A');
  circ(c, x, y, r * 0.62, '#EAF6E6');
  circ(c, x, y, r * 0.3, '#3E9B5A');
}

/** 步数图标：一只鞋底 */
export function drawBoot(c: any, x: number, y: number, s: number, color = '#5C6B57'): void {
  c.save();
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(x - s * 0.3, y + s * 0.45);
  c.quadraticCurveTo(x - s * 0.45, y - s * 0.1, x - s * 0.1, y - s * 0.2);
  c.lineTo(x + s * 0.2, y - s * 0.45);
  c.quadraticCurveTo(x + s * 0.42, y - s * 0.5, x + s * 0.4, y - s * 0.2);
  c.lineTo(x + s * 0.42, y + s * 0.45);
  c.closePath();
  c.fill();
  c.restore();
}

/** 占领成功的小粒子 */
export function drawBurst(c: any, x: number, y: number, color: string, progress: number): void {
  const p = Math.max(0, Math.min(1, progress));
  c.save();
  c.globalAlpha = 1 - p;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = 8 + p * 26;
    circ(c, x + Math.cos(a) * r, y + Math.sin(a) * r, 3 * (1 - p) + 1, color);
  }
  c.restore();
}

/** 首页的迷你领地示意：5x5 的地块缩略 */
export function drawMiniMap(c: any, cx: number, cy: number, cell: number, t: number): void {
  for (let r = 0; r < 5; r++) {
    for (let col = 0; col < 5; col++) {
      const x = cx - cell * 2.5 + col * cell;
      const y = cy - cell * 2.5 + r * cell;
      const d = Math.abs(r - 2) + Math.abs(col - 2);
      const kind: TileKind = d === 0 ? 'mine' : d === 1 ? 'mine' : d === 2 ? 'reachable' : 'none';
      drawTile(c, x, y, cell, kind, t, d === 0);
    }
  }
}
