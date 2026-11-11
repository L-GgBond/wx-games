import { platform } from './platform';
import { State, TILES, initialState } from './logic';

const K_STATE = 'sk_state_v1';
const K_BEST = 'sk_best_owned';
const K_GUIDE = 'sk_guide_v1';

function valid(p: any): p is State {
  if (!p || typeof p !== 'object') return false;
  if (!Array.isArray(p.grid) || p.grid.length !== TILES) return false;
  if (!p.grid.every((v: any) => v === 0 || v === 1 || v === 2)) return false;
  const nums = ['troops', 'steps', 'lastSettle', 'lastRaid', 'cleared', 'totalOwned', 'streak'];
  if (!nums.every(k => typeof p[k] === 'number' && Number.isFinite(p[k]))) return false;
  if (typeof p.day !== 'string' || typeof p.lastDay !== 'string') return false;
  return true;
}

export const store = {
  /** 损坏/旧版存档一律回退到干净起点，不让界面崩 */
  load(): State {
    const p = platform.getStore<any>(K_STATE, null);
    if (!valid(p)) return initialState(platform.todayKey(), platform.now());
    return p;
  },
  save(s: State): void {
    platform.setStore(K_STATE, s);
    let owned = 0;
    for (const v of s.grid) if (v === 1) owned++;
    if (owned > this.best()) platform.setStore(K_BEST, owned);
    platform.setCloudScore(owned + s.cleared * 20);
  },
  best(): number {
    return platform.getStore<number>(K_BEST, 0) | 0;
  },
  guideSeen(): boolean {
    return !!platform.getStore<boolean>(K_GUIDE, false);
  },
  markGuide(): void {
    platform.setStore(K_GUIDE, true);
  },
};
