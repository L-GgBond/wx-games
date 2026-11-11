// 零美术资源：战场、勇者、怪物全部用 Canvas 基础图元画。
// 战场是深色石板，勇者用暖色、怪物用亮色轮廓，保证在深底上都能一眼分清。
import { PATH, SLOTS, EnemyKind, TowerKind } from './logic';

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

function tri(c: any, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, fill: string): void {
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.lineTo(x3, y3);
  c.closePath();
  c.fillStyle = fill;
  c.fill();
}

/** 战场底色：深紫石板 + 淡淡的砖缝 */
export function drawField(c: any, top: number, bottom: number, t: number): void {
  rect(c, 0, top, 375, bottom - top, '#2B2033');
  c.save();
  c.strokeStyle = 'rgba(255,255,255,0.035)';
  c.lineWidth = 1;
  for (let y = top; y < bottom; y += 34) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(375, y);
    c.stroke();
  }
  for (let x = 0; x < 375; x += 34) {
    c.beginPath();
    c.moveTo(x, top);
    c.lineTo(x, bottom);
    c.stroke();
  }
  // 宝座方向的一点暖光
  const g = c.createRadialGradient(318, 440, 10, 318, 440, 130);
  g.addColorStop(0, 'rgba(242,180,65,0.16)');
  g.addColorStop(1, 'rgba(242,180,65,0)');
  c.fillStyle = g;
  c.fillRect(180, 330, 195, 144);
  c.restore();
}

/** 行军路径：先画深色路肩，再画路面，最后一条虚线中心线 */
export function drawPath(c: any): void {
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';

  const stroke = (width: number, color: string, dash: number[] = []) => {
    c.beginPath();
    c.moveTo(PATH[0].x, PATH[0].y);
    for (let i = 1; i < PATH.length; i++) c.lineTo(PATH[i].x, PATH[i].y);
    c.lineWidth = width;
    c.strokeStyle = color;
    c.setLineDash(dash);
    c.stroke();
  };

  stroke(30, '#4E4132');
  stroke(24, '#6E5C48');
  stroke(2.5, 'rgba(255,255,255,0.22)', [9, 11]);
  c.restore();
}

/** 空槽位：虚线圈，可放时呼吸 */
export function drawSlot(c: any, x: number, y: number, selected: boolean, t: number): void {
  c.save();
  c.beginPath();
  c.arc(x, y, 16, 0, Math.PI * 2);
  const a = selected ? 0.55 + Math.sin(t / 260) * 0.3 : 0.22;
  c.strokeStyle = selected ? `rgba(180,92,224,${a.toFixed(3)})` : 'rgba(255,255,255,0.16)';
  c.lineWidth = selected ? 2 : 1.4;
  c.setLineDash([4, 5]);
  c.stroke();
  c.restore();
}

/** 勇者：按兵种画不同轮廓，头顶一条血条 */
export function drawEnemy(
  c: any, x: number, y: number, kind: EnemyKind, hpRatio: number, t: number, id: number,
): void {
  const bob = Math.sin(t / 180 + id) * 1.6;
  c.save();
  c.translate(x, y + bob);

  if (kind === 'grunt') {
    circ(c, 0, 0, 8, '#E8C07A');
    rect(c, -3, -10, 6, 5, '#C9A05A');
    rect(c, -9, -2, 5, 10, '#B8825C');
  } else if (kind === 'knight') {
    rect(c, -7, -9, 14, 17, '#C9CEDA');
    rect(c, -5, -14, 10, 6, '#A8B0C0');
    rect(c, -1, -2, 2, 9, '#8E96A8');
  } else {
    tri(c, 0, -10, 8, 8, -8, 8, '#8FCB6B');
    circ(c, 0, -2, 3, '#5F8F45');
  }
  c.restore();

  // 血条
  const w = 18;
  const ratio = Math.max(0, Math.min(1, hpRatio));
  rect(c, x - w / 2, y - 20, w, 3, 'rgba(0,0,0,0.45)');
  rect(c, x - w / 2, y - 20, w * ratio, 3, ratio > 0.5 ? '#8FCB6B' : ratio > 0.25 ? '#E8C07A' : '#D95F3B');
}

/** 怪物：四种不同形状，开火瞬间有一圈白光 */
export function drawTower(
  c: any, x: number, y: number, kind: TowerKind, angle: number, flash: number, t: number,
): void {
  c.save();
  c.translate(x, y);

  // 底座
  circ(c, 0, 4, 15, 'rgba(0,0,0,0.35)');

  if (kind === 'goblin') {
    circ(c, 0, 0, 11, '#8FCB6B');
    tri(c, -11, -4, -16, -14, -4, -9, '#6FAF4E');
    tri(c, 11, -4, 16, -14, 4, -9, '#6FAF4E');
    circ(c, -4, -1, 2.2, '#243020');
    circ(c, 4, -1, 2.2, '#243020');
  } else if (kind === 'archer') {
    circ(c, 0, 0, 10, '#E6E9F0');
    rect(c, -6, -3, 4, 4, '#2B2033');
    rect(c, 2, -3, 4, 4, '#2B2033');
    rect(c, -1, 3, 2, 4, '#2B2033');
    // 弓
    c.beginPath();
    c.arc(9, 0, 8, -Math.PI / 2.2, Math.PI / 2.2);
    c.strokeStyle = '#C9A05A';
    c.lineWidth = 2;
    c.stroke();
  } else if (kind === 'mage') {
    circ(c, 0, 0, 11, '#F0845C');
    tri(c, 0, -18, 7, -6, -7, -6, '#F2B441');
    circ(c, 0, 0, 5, '#FFD9A0');
  } else {
    circ(c, 0, 0, 13, '#B45CE0');
    tri(c, -12, -2, -24, -14, -10, 6, '#8E3FB8');
    tri(c, 12, -2, 24, -14, 10, 6, '#8E3FB8');
    circ(c, -4, -3, 2.4, '#F5E6FF');
    circ(c, 5, -3, 2.4, '#F5E6FF');
  }

  // 朝向的小箭头
  c.save();
  c.rotate(angle);
  tri(c, 13, 0, 6, -3.4, 6, 3.4, 'rgba(255,255,255,0.55)');
  c.restore();

  if (flash > 0) {
    c.save();
    c.globalAlpha = flash * 0.7;
    circ(c, 0, 0, 18 + (1 - flash) * 8, 'rgba(255,255,255,0.28)');
    c.restore();
  }
  c.restore();
}

/** 王座：城垛 + 一扇门 + 顶上一面旗 */
export function drawCastle(c: any, x: number, y: number, t: number): void {
  c.save();
  c.translate(x, y);
  rect(c, -26, -18, 52, 34, '#5B4A6E');
  rect(c, -26, -30, 10, 14, '#5B4A6E');
  rect(c, -5, -30, 10, 14, '#5B4A6E');
  rect(c, 16, -30, 10, 14, '#5B4A6E');
  rect(c, -8, -6, 16, 22, '#33263F');
  c.beginPath();
  c.arc(0, -6, 8, Math.PI, 0);
  c.fillStyle = '#33263F';
  c.fill();
  // 旗
  c.beginPath();
  c.moveTo(0, -30);
  c.lineTo(0, -50);
  c.strokeStyle = '#C9CEDA';
  c.lineWidth = 2;
  c.stroke();
  const wave = Math.sin(t / 320) * 3;
  c.beginPath();
  c.moveTo(0, -50);
  c.lineTo(18, -46 + wave);
  c.lineTo(0, -40);
  c.closePath();
  c.fillStyle = '#D95F3B';
  c.fill();
  c.restore();
}

/** 魔晶 */
export function drawCoin(c: any, x: number, y: number, r: number): void {
  c.save();
  c.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * Math.PI * 2;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
  }
  c.closePath();
  c.fillStyle = '#F2B441';
  c.fill();
  c.strokeStyle = '#D08F1E';
  c.lineWidth = 1;
  c.stroke();
  c.restore();
}

/** 王座耐久：实心 / 空心的盾牌 */
export function drawHeart(c: any, x: number, y: number, s: number, filled: boolean): void {
  c.save();
  c.beginPath();
  c.moveTo(x, y + s * 0.75);
  c.lineTo(x - s * 0.9, y - s * 0.1);
  c.quadraticCurveTo(x - s * 0.55, y - s * 0.75, x, y - s * 0.3);
  c.quadraticCurveTo(x + s * 0.55, y - s * 0.75, x + s * 0.9, y - s * 0.1);
  c.closePath();
  if (filled) {
    c.fillStyle = '#D95F3B';
    c.fill();
  } else {
    c.strokeStyle = 'rgba(255,255,255,0.35)';
    c.lineWidth = 1.4;
    c.stroke();
  }
  c.restore();
}

/** 开波前在入口处的提示箭头 */
export function drawSpawnHint(c: any, t: number): void {
  const a = 0.35 + Math.sin(t / 300) * 0.25;
  c.save();
  c.globalAlpha = a;
  tri(c, 4, 126, 20, 138, 4, 150, '#F2B441');
  c.restore();
}

export function slotPos(i: number): { x: number; y: number } {
  return SLOTS[i] || SLOTS[0];
}
