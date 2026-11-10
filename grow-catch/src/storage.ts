import { platform } from './platform';
import { Progress, initialProgress, DEFAULT_SPEED, SPEEDS, LINES } from './logic';

const K_PROGRESS = 'gc_progress';
const K_BEST = 'gc_best';
const K_SPEED = 'gc_speed';
const K_LINE = 'gc_line_unlocked';
const K_GUIDE = 'gc_guide_v1';

function valid(p: any): p is Progress {
  return !!p && typeof p === 'object'
    && Number.isInteger(p.line) && Number.isInteger(p.stage)
    && Number.isInteger(p.round) && Array.isArray(p.seen);
}

export const store = {
  /** 损坏/旧版存档一律回退到干净起点，不让界面崩 */
  progress(): Progress {
    const p = platform.getStore<Progress | null>(K_PROGRESS, null);
    if (!valid(p) || p.line < 0 || p.line >= LINES.length
      || p.stage < 0 || p.stage >= LINES[p.line].stages.length) {
      return initialProgress(0);
    }
    return p;
  },
  save(p: Progress): void {
    platform.setStore(K_PROGRESS, p);
    if (p.round > this.bestRound()) platform.setStore(K_BEST, p.round);
    platform.setCloudScore(this.bestRound() * 100 + p.seen.length);
  },
  bestRound(): number {
    return platform.getStore<number>(K_BEST, 0) | 0;
  },
  speedIdx(): number {
    const v = platform.getStore<number>(K_SPEED, DEFAULT_SPEED) | 0;
    return Math.max(0, Math.min(SPEEDS.length - 1, v));
  },
  setSpeed(i: number): void {
    platform.setStore(K_SPEED, Math.max(0, Math.min(SPEEDS.length - 1, i)));
  },
  lineUnlocked(): boolean {
    return !!platform.getStore<boolean>(K_LINE, false);
  },
  unlockLine(): void {
    platform.setStore(K_LINE, true);
  },
  guideSeen(): boolean {
    return !!platform.getStore<boolean>(K_GUIDE, false);
  },
  markGuide(): void {
    platform.setStore(K_GUIDE, true);
  },
};
