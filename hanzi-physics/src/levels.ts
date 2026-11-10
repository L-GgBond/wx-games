// 关卡坐标 = 设计坐标（375 x 667），物理场景可视区为 y ∈ [56, 500]。
// goal 是「筐口」矩形，physics.ts 会自动生成三面筐墙把球兜住。
// solution 是内置的参考摆法：激励视频提示会直接摆出它，也便于回归验证物理参数。
export interface Peg {
  x: number; y: number; w: number; h: number;
  angle?: number;
  label?: string;
}

export interface SolutionPiece {
  type: string; x: number; y: number; angle: number;
}

export interface Level {
  id: number;
  name: string;
  desc: string;
  hint: string;
  ball: { x: number; y: number; vx?: number };
  goal: { x: number; y: number; w: number; h: number };
  pegs: Peg[];
  stock: { type: string; count: number }[];
  solution: SolutionPiece[];
}

// solution 的角度一律取 15° 的整数倍，与游戏内旋转按钮的步长对齐：
// 玩家自己也能一步步转出参考解，而不是只有「看提示」才能摆出来。
export const LEVELS: Level[] = [
  {
    id: 0,
    name: '一桥通',
    desc: '球从上面落下来，搭一块坡把它送进右边的筐',
    hint: '「木」往右转 15°，球落上去就会往右滚',
    ball: { x: 150, y: 92 },
    goal: { x: 238, y: 396, w: 110, h: 70 },
    pegs: [
      { x: 58, y: 320, w: 96, h: 12, angle: -0.16, label: '旧台' },
    ],
    stock: [{ type: '一', count: 1 }, { type: '木', count: 1 }, { type: '氵', count: 1 }, { type: '口', count: 1 }],
    solution: [{ type: '木', x: 180, y: 210, angle: Math.PI / 12 }],
  },
  {
    id: 1,
    name: '绕石',
    desc: '中间挡着一块石头，把球往左边引',
    hint: '「冫」往左转到 45°，正好绕开石头',
    ball: { x: 170, y: 92 },
    goal: { x: 40, y: 396, w: 118, h: 70 },
    pegs: [
      { x: 188, y: 272, w: 132, h: 20, angle: 0, label: '石台' },
    ],
    stock: [{ type: '冫', count: 1 }, { type: '氵', count: 1 }, { type: '口', count: 2 }, { type: '亻', count: 1 }],
    solution: [{ type: '冫', x: 180, y: 190, angle: -Math.PI / 4 }],
  },
  {
    id: 2,
    name: '长坡',
    desc: '起点在最右边，筐在左下，需要一条长坡把球带回来',
    hint: '「一」往左转 30°，长坡才够得到左边的筐',
    ball: { x: 300, y: 92 },
    goal: { x: 44, y: 396, w: 130, h: 70 },
    pegs: [
      { x: 300, y: 292, w: 84, h: 16, angle: 0, label: '挡板' },
      { x: 120, y: 350, w: 90, h: 12, angle: 0.10, label: '斜台' },
    ],
    stock: [{ type: '一', count: 1 }, { type: '木', count: 2 }, { type: '口', count: 1 }, { type: '土', count: 1 }],
    solution: [{ type: '一', x: 260, y: 210, angle: -Math.PI / 6 }],
  },
];
