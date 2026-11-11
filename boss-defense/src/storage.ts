import { platform } from './platform';

const K_BEST = 'bd_best_wave';
const K_GUIDE = 'bd_guide_v1';

export const store = {
  bestWave(): number {
    return platform.getStore<number>(K_BEST, 0) | 0;
  },
  saveBest(n: number): void {
    const w = Math.max(0, Math.round(n));
    if (w > this.bestWave()) {
      platform.setStore(K_BEST, w);
      platform.setCloudScore(w);
    }
  },
  guideSeen(): boolean {
    return !!platform.getStore<boolean>(K_GUIDE, false);
  },
  markGuide(): void {
    platform.setStore(K_GUIDE, true);
  },
};
