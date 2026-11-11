import { platform } from './platform';

const K_LEVEL = 'ogs_level';
const K_REV = 'ogs_best_rev';
const K_GUIDE = 'ogs_guide_v1';

export const store = {
  level(): number {
    return Math.max(1, platform.getStore<number>(K_LEVEL, 1) | 0);
  },
  saveLevel(n: number): void {
    platform.setStore(K_LEVEL, Math.max(1, Math.round(n)));
  },
  bestRevenue(): number {
    return platform.getStore<number>(K_REV, 0) | 0;
  },
  saveRevenue(n: number): void {
    if (n > this.bestRevenue()) {
      platform.setStore(K_REV, Math.round(n));
      platform.setCloudScore(Math.round(n));
    }
  },
  guideSeen(): boolean {
    return !!platform.getStore<boolean>(K_GUIDE, false);
  },
  markGuide(): void {
    platform.setStore(K_GUIDE, true);
  },
};
