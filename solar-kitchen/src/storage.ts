import { platform } from './platform';

const K_BEST = 'sok_best_term';
const K_GUIDE = 'sok_guide_v1';
const K_MONEY = 'sok_best_money';

export const store = {
  /** 已解锁到的最高节气序号（年份已折算成 24 的倍数） */
  best(): number {
    return platform.getStore<number>(K_BEST, 0) | 0;
  },
  saveBest(n: number): void {
    const v = Math.max(0, Math.round(n));
    if (v > this.best()) {
      platform.setStore(K_BEST, v);
      platform.setCloudScore(v);
    }
  },
  bestMoney(): number {
    return platform.getStore<number>(K_MONEY, 0) | 0;
  },
  saveMoney(n: number): void {
    if (n > this.bestMoney()) platform.setStore(K_MONEY, Math.round(n));
  },
  guideSeen(): boolean {
    return !!platform.getStore<boolean>(K_GUIDE, false);
  },
  markGuide(): void {
    platform.setStore(K_GUIDE, true);
  },
};
