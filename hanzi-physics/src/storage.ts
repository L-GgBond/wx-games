import { platform } from './platform';
import { LEVELS } from './levels';

const K_UNLOCK = 'hp_unlocked';
const K_CLEARED = 'hp_cleared';
const K_STARS = 'hp_stars';
const MAX_LEVEL = LEVELS.length - 1;

export const store = {
  unlocked(): number {
    const v = platform.getStore<number>(K_UNLOCK, 0) | 0;
    return Math.min(MAX_LEVEL, Math.max(0, v));
  },
  unlock(level: number): void {
    if (level > this.unlocked()) platform.setStore(K_UNLOCK, Math.min(MAX_LEVEL, level));
  },
  cleared(): number[] {
    const v = platform.getStore<number[]>(K_CLEARED, []);
    return Array.isArray(v) ? v : [];
  },
  stars(level: number): number {
    const m = platform.getStore<Record<string, number>>(K_STARS, {}) || {};
    return m[String(level)] || 0;
  },
  totalStars(): number {
    const m = platform.getStore<Record<string, number>>(K_STARS, {}) || {};
    let sum = 0;
    Object.keys(m).forEach(k => { sum += m[k] || 0; });
    return sum;
  },
  /** 星级：用 1 个部件 3 星、2 个 2 星、更多 1 星，只保留历史最好成绩 */
  markCleared(level: number, pieceCount: number): void {
    const list = this.cleared();
    if (!list.includes(level)) {
      list.push(level);
      platform.setStore(K_CLEARED, list);
    }
    const stars = pieceCount <= 1 ? 3 : pieceCount <= 2 ? 2 : 1;
    const m = platform.getStore<Record<string, number>>(K_STARS, {}) || {};
    const key = String(level);
    if (stars > (m[key] || 0)) {
      m[key] = stars;
      platform.setStore(K_STARS, m);
    }
    platform.setCloudScore(this.totalStars() * 100 + list.length * 100);
  },
};
