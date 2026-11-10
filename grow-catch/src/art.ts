// 零美术资源：16 个形态全部用 Canvas 基础图元（arc / line / quadratic）画出来。
// 不识字的人也能看懂「它变成什么了」，这是全年龄玩法的前提。
// 基准单位 26，drawStage 的 size 参数会整体缩放，图鉴与场景共用一套画法。

function circ(c: any, x: number, y: number, r: number, fill: string): void {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fillStyle = fill;
  c.fill();
}

/** 只依赖 arc，不用 c.ellipse，兼容较旧的小游戏 Canvas 实现 */
function ell(c: any, x: number, y: number, rx: number, ry: number, fill: string, rot = 0): void {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.scale(rx / ry, 1);
  c.beginPath();
  c.arc(0, 0, ry, 0, Math.PI * 2);
  c.fillStyle = fill;
  c.fill();
  c.restore();
}

function seg(c: any, x1: number, y1: number, x2: number, y2: number, color: string, w = 3): void {
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.strokeStyle = color;
  c.lineWidth = w;
  c.lineCap = 'round';
  c.stroke();
}

function stem(c: any, K: (v: string) => string, from = 24, to = -4): void {
  seg(c, 0, from, 0, to, K('#5FA86B'), 3);
}

/** 主绘制入口：t 为毫秒时间戳，仅用于轻微摆动/闪烁，不参与任何判定 */
export function drawStage(
  c: any, key: string, x: number, y: number, size: number,
  t = 0, dim = false,
): void {
  const K = (v: string): string => dim ? '#BCC7BA' : v;
  c.save();
  c.translate(x, y);
  const k = Math.max(0.1, size / 26);
  c.scale(k, k);
  if (dim) c.globalAlpha = 0.5;
  const spin = key === 'spark' || key === 'star' ? t / 1400 : Math.sin(t / 700) * 0.06;
  c.rotate(spin);

  switch (key) {
    case 'drop': {
      circ(c, 0, 6, 17, K('#6FB7E8'));
      c.beginPath();
      c.moveTo(-11, -3); c.lineTo(0, -26); c.lineTo(11, -3);
      c.closePath();
      c.fillStyle = K('#6FB7E8');
      c.fill();
      circ(c, -6, 2, 4, 'rgba(255,255,255,0.55)');
      break;
    }
    case 'seed': {
      ell(c, 0, 0, 13, 18, K('#B98A5E'), 0.3);
      c.beginPath();
      c.moveTo(-4, -11); c.quadraticCurveTo(4, 0, -3, 12);
      c.strokeStyle = K('#8A6242'); c.lineWidth = 2; c.stroke();
      circ(c, 5, -7, 2.5, 'rgba(255,255,255,0.45)');
      break;
    }
    case 'sprout': {
      stem(c, K, 24, -3);
      ell(c, -10, -6, 9, 5, K('#8FCB6B'), -0.6);
      ell(c, 10, -11, 9, 5, K('#6FBE72'), 0.6);
      break;
    }
    case 'leaves': {
      stem(c, K, 24, -15);
      ell(c, -13, -5, 12, 7, K('#5FB97A'), -0.7);
      ell(c, 13, -12, 12, 7, K('#8FCB6B'), 0.7);
      break;
    }
    case 'bud': {
      stem(c, K, 24, 2);
      ell(c, 0, -8, 9, 13, K('#E8A0B8'));
      ell(c, 0, 3, 11, 5, K('#7FC48A'));
      circ(c, -3, -12, 2.5, 'rgba(255,255,255,0.5)');
      break;
    }
    case 'flower': {
      stem(c, K, 24, 6);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ell(c, Math.cos(a) * 11, Math.sin(a) * 11 - 6, 7, 10, K('#F07A9C'), a + Math.PI / 2);
      }
      circ(c, 0, -6, 6, K('#F5C451'));
      break;
    }
    case 'fruit': {
      stem(c, K, 24, -3);
      circ(c, 0, 5, 15, K('#E8604C'));
      ell(c, 8, -12, 8, 4, K('#5FB97A'), -0.5);
      circ(c, -5, 0, 3, 'rgba(255,255,255,0.45)');
      break;
    }
    case 'spark': {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        seg(c, Math.cos(a) * 12, Math.sin(a) * 12,
          Math.cos(a) * 23, Math.sin(a) * 23, K('#F5C451'), 2.5);
      }
      circ(c, 0, 0, 10, K('#F5C451'));
      circ(c, -3, -3, 3.5, 'rgba(255,255,255,0.7)');
      break;
    }
    case 'cloud': {
      circ(c, -12, 3, 12, K('#B9C9D6'));
      circ(c, 0, -6, 16, K('#CFDCE5'));
      circ(c, 14, 4, 11, K('#B9C9D6'));
      ell(c, 0, 9, 24, 8, K('#CFDCE5'));
      break;
    }
    case 'rain': {
      circ(c, -8, -12, 10, K('#B9C9D6'));
      circ(c, 5, -16, 13, K('#CFDCE5'));
      ell(c, 0, -5, 20, 6, K('#CFDCE5'));
      for (let i = -1; i <= 1; i++) {
        const x0 = i * 11;
        seg(c, x0, 3, x0 - 3, 17, K('#6FB7E8'), 3);
        circ(c, x0 - 3, 19, 2.5, K('#6FB7E8'));
      }
      break;
    }
    case 'puddle': {
      ell(c, 0, 8, 24, 9, K('#7FC4D8'));
      ell(c, -6, 5, 9, 2.5, 'rgba(255,255,255,0.6)');
      ell(c, 9, 11, 5, 1.8, 'rgba(255,255,255,0.45)');
      break;
    }
    case 'wave': {
      for (let j = 0; j < 3; j++) {
        const y0 = -8 + j * 10;
        c.beginPath();
        c.moveTo(-24, y0);
        c.quadraticCurveTo(-12, y0 - 8, 0, y0);
        c.quadraticCurveTo(12, y0 + 8, 24, y0);
        c.strokeStyle = K('#4FA8C8');
        c.lineWidth = 3;
        c.lineCap = 'round';
        c.stroke();
      }
      break;
    }
    case 'fish': {
      ell(c, 2, 0, 16, 10, K('#E8A04C'));
      c.beginPath();
      c.moveTo(-12, 0); c.lineTo(-25, -10); c.lineTo(-25, 10);
      c.closePath();
      c.fillStyle = K('#E8A04C');
      c.fill();
      circ(c, 10, -3, 2.5, K('#5A4632'));
      ell(c, -1, -8, 6, 3, K('#F2B56A'), -0.4);
      break;
    }
    case 'bubble': {
      circ(c, -9, 7, 9, K('rgba(168,220,236,0.75)'));
      circ(c, 6, -5, 13, K('rgba(168,220,236,0.75)'));
      circ(c, 15, 11, 6, K('rgba(168,220,236,0.75)'));
      circ(c, 2, -9, 3, 'rgba(255,255,255,0.85)');
      circ(c, -12, 4, 2.2, 'rgba(255,255,255,0.8)');
      break;
    }
    case 'shell': {
      c.beginPath();
      c.arc(0, 8, 20, Math.PI, 0);
      c.closePath();
      c.fillStyle = K('#E8B8A0');
      c.fill();
      for (let i = 1; i < 5; i++) {
        const a = Math.PI + (i / 5) * Math.PI;
        seg(c, 0, 8, Math.cos(a) * 20, 8 + Math.sin(a) * 20, K('#C99378'), 2);
      }
      circ(c, 0, 8, 3, K('#C99378'));
      break;
    }
    case 'star': {
      c.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
        const r = i % 2 === 0 ? 22 : 9;
        const px = Math.cos(a) * r, py = Math.sin(a) * r;
        if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
      }
      c.closePath();
      c.fillStyle = K('#F5D96A');
      c.fill();
      break;
    }
    default: {
      circ(c, 0, 0, 16, K('#BCC7BA'));
    }
  }
  c.restore();
}

/** 接住时的小粒子，纯装饰 */
export function drawBurst(c: any, x: number, y: number, color: string, progress: number): void {
  const p = Math.max(0, Math.min(1, progress));
  c.save();
  c.globalAlpha = 1 - p;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = 14 + p * 34;
    circ(c, x + Math.cos(a) * r, y + Math.sin(a) * r, 3.5 * (1 - p) + 1, color);
  }
  c.restore();
}
