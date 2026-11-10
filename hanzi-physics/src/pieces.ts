// 汉字部件 = 刚体。字形本身就是积木图案，字义决定物理特性（滑 / 稳 / 挡 / 长）。
// key 为分享码用的单字符编码，新增部件时保持 key 唯一即可。
export interface PieceDef {
  key: string;
  glyph: string;
  label: string;
  w: number;
  h: number;
  friction: number;
  restitution: number;
  angle: number;      // 放置时的初始角度（弧度，正=右端下沉）
  color: string;
  desc: string;
}

export const PIECES: Record<string, PieceDef> = {
  '一': { key: 'a', glyph: '一', label: '横板', w: 100, h: 10, friction: 0.50, restitution: 0.05, angle: 0, color: '#8FA8C8', desc: '最长的一块，适合搭桥' },
  '木': { key: 'b', glyph: '木', label: '木梁', w: 84, h: 12, friction: 0.60, restitution: 0.06, angle: 0, color: '#B98554', desc: '摩擦大，球滚得稳' },
  '氵': { key: 'c', glyph: '氵', label: '水坡', w: 88, h: 10, friction: 0.001, restitution: 0.00, angle: Math.PI / 12, color: '#5AB4E0', desc: '超滑，球一沾就加速' },
  '冫': { key: 'd', glyph: '冫', label: '冰面', w: 74, h: 9, friction: 0.0005, restitution: 0.00, angle: -Math.PI / 12, color: '#A8DCEC', desc: '更滑，也能把球往左带' },
  '口': { key: 'e', glyph: '口', label: '方框', w: 34, h: 34, friction: 0.60, restitution: 0.20, angle: 0, color: '#D9A0A0', desc: '当挡板，硬改方向' },
  '亻': { key: 'f', glyph: '亻', label: '立柱', w: 12, h: 60, friction: 0.60, restitution: 0.02, angle: 0, color: '#A9B58C', desc: '竖着撑，也能当墙' },
  '石': { key: 'g', glyph: '石', label: '石块', w: 46, h: 28, friction: 0.90, restitution: 0.00, angle: 0, color: '#9A9A9A', desc: '最稳，球撞上不弹' },
  '土': { key: 'h', glyph: '土', label: '土坡', w: 72, h: 14, friction: 0.95, restitution: 0.00, angle: Math.PI / 12, color: '#C6A46B', desc: '摩擦最大，能刹住球' },
};

export function byKey(key: string): string | undefined {
  return Object.keys(PIECES).find(k => PIECES[k].key === key);
}

export function pieceColor(type: string): string {
  return PIECES[type] ? PIECES[type].color : '#CCCCCC';
}
