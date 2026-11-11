// 极简 immediate-mode Canvas UI：绘制时注册点击热区，触摸结束时按后注册优先命中。
import { DESIGN_W, DESIGN_H } from './platform';

export const C = {
  bg: '#F4F1F7',
  card: '#FFFFFF',
  green: '#7B4FB5',
  greenDark: '#5F3A8C',
  greenPale: '#F0E9F8',
  ink: '#221A2B',
  sub: '#857A92',
  line: '#E7E0EE',
  red: '#D95F3B',
  redPale: '#FBEAE4',
  blue: '#576B95',
  warn: '#E0A030',
  warnPale: '#FFF5E2',
  soil: '#C9A77C',
  soilDark: '#9C7A52',
  overlay: 'rgba(30,20,40,0.62)',
  field: '#2B2033',
  fieldLine: '#3D2F49',
  path: '#6E5C48',
  pathEdge: '#4E4132',
  gold: '#F2B441',
};

export interface Region {
  x: number; y: number; w: number; h: number;
  fn: () => void;
  enabled: boolean;
}

export interface TextOpts {
  size?: number;
  color?: string;
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
  maxWidth?: number;
  lineHeight?: number;
}

export function wrapText(c: any, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const ch of text) {
    if (ch === '\n') { lines.push(cur); cur = ''; continue; }
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

export function roundPath(c: any, x: number, y: number, w: number, h: number, r: number): void {
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

export class UI {
  regions: Region[] = [];
  constructor(private getCtx: () => any) {}

  get c(): any { return this.getCtx(); }

  begin(): void { this.regions = []; }

  tap(x: number, y: number): boolean {
    for (let i = this.regions.length - 1; i >= 0; i--) {
      const r = this.regions[i];
      if (r.enabled && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        r.fn();
        return true;
      }
    }
    return false;
  }

  panel(x: number, y: number, w: number, h: number, r = 10, color = C.card): void {
    const c = this.c;
    roundPath(c, x, y, w, h, r);
    c.fillStyle = color;
    c.fill();
  }

  outlined(x: number, y: number, w: number, h: number, r: number, color: string, width = 1): void {
    const c = this.c;
    roundPath(c, x, y, w, h, r);
    c.strokeStyle = color;
    c.lineWidth = width;
    c.stroke();
  }

  line(x1: number, y1: number, x2: number, y2: number, color = C.line): void {
    const c = this.c;
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.strokeStyle = color;
    c.lineWidth = 1;
    c.stroke();
  }

  text(str: string, x: number, y: number, opts: TextOpts = {}): number {
    const c = this.c;
    const size = opts.size ?? 14;
    const lh = opts.lineHeight ?? Math.round(size * 1.5);
    c.font = `${opts.bold ? 'bold ' : ''}${size}px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`;
    c.fillStyle = opts.color ?? C.ink;
    c.textAlign = opts.align ?? 'left';
    c.textBaseline = 'top';
    const lines = opts.maxWidth ? wrapText(c, str, opts.maxWidth) : str.split('\n');
    lines.forEach((ln, i) => c.fillText(ln, x, y + i * lh));
    return lines.length * lh;
  }

  measure(str: string, size = 14, bold = false): number {
    const c = this.c;
    c.font = `${bold ? 'bold ' : ''}${size}px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`;
    return c.measureText(str).width;
  }

  button(
    x: number, y: number, w: number, h: number, label: string,
    fn: () => void,
    style: 'primary' | 'ghost' | 'plain' | 'danger' = 'primary',
    enabled = true,
    size = 15,
  ): void {
    const c = this.c;
    const fill = !enabled ? '#D8DDD6'
      : style === 'primary' ? C.green
      : style === 'ghost' ? C.card
      : style === 'danger' ? C.redPale
      : '#EFF3EC';
    const fg = !enabled ? '#9AA59A'
      : style === 'primary' ? '#FFFFFF'
      : style === 'ghost' ? C.green
      : style === 'danger' ? C.red
      : C.ink;
    this.panel(x, y, w, h, h / 2, fill);
    if (style === 'ghost' && enabled) this.outlined(x, y, w, h, h / 2, C.green, 1);
    this.text(label, x + w / 2, y + h / 2 - size * 0.72, {
      size, color: fg, bold: true, align: 'center',
    });
    this.regions.push({ x, y, w, h, fn, enabled });
  }

  /** 顶部导航栏：标题 + 可选返回按钮，返回统一高度 44 */
  navBar(title: string, onBack?: () => void): number {
    const c = this.c;
    c.fillStyle = '#F7F4FA';
    c.fillRect(0, 0, DESIGN_W, 44);
    this.line(0, 44, DESIGN_W, 44, '#E3DBEB');
    this.text(title, DESIGN_W / 2, 13, { size: 17, bold: true, align: 'center' });
    if (onBack) {
      this.text('‹', 14, 6, { size: 30, color: C.ink });
      this.regions.push({ x: 0, y: 0, w: 56, h: 44, fn: onBack, enabled: true });
    }
    return 44;
  }

  dim(): void {
    const c = this.c;
    c.fillStyle = C.overlay;
    c.fillRect(0, 0, DESIGN_W, DESIGN_H);
  }
}
