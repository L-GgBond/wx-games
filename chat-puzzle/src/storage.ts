import { platform } from './platform';

const K_UNLOCK = 'cp_unlocked';
const K_BEST = 'cp_best';
const K_TOTAL = 'cp_total';
const K_DAILY = 'cp_daily';
const MAX_GROUP = 2;

export function todayKey(d = new Date()): string {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${d.getFullYear()}${m < 10 ? '0' : ''}${m}${day < 10 ? '0' : ''}${day}`;
}

export const store = {
  unlocked(): number {
    const v = platform.getStore<number>(K_UNLOCK, 0);
    return Math.min(MAX_GROUP, Math.max(0, v | 0));
  },
  unlock(group: number): void {
    const g = Math.min(MAX_GROUP, group);
    if (g > this.unlocked()) platform.setStore(K_UNLOCK, g);
  },
  best(): number {
    return platform.getStore<number>(K_BEST, 0) | 0;
  },
  total(): number {
    return platform.getStore<number>(K_TOTAL, 0) | 0;
  },
  addTotal(n: number): void {
    platform.setStore(K_TOTAL, this.total() + n);
  },
  submit(score: number): void {
    if (score > this.best()) {
      platform.setStore(K_BEST, score);
      platform.setCloudScore(score);   // 供开放数据域读取好友榜
    }
  },
  dailyBest(): number {
    const m = platform.getStore<Record<string, number>>(K_DAILY, {});
    return (m && m[todayKey()]) || 0;
  },
  setDailyBest(score: number): void {
    const m = platform.getStore<Record<string, number>>(K_DAILY, {}) || {};
    const key = todayKey();
    if (score > (m[key] || 0)) {
      m[key] = score;
      platform.setStore(K_DAILY, m);
    }
  },
};
