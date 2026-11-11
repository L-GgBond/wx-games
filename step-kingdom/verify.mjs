// 纯逻辑回归：占领规则 / 产出结算 / 敌营反攻 / 步数兑换 / 跨天 / 分享码。
// 不启动服务、不开浏览器；改了 logic.ts 后执行 `npm run verify`。
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = mkdtempSync(join(tmpdir(), 'sk-verify-'));
let ok = true;
function check(cond, label) {
  console.log(`  ${cond ? '✓' : '✗'} ${label}`);
  if (!cond) ok = false;
}

try {
  await build({
    entryPoints: ['src/logic.ts'], bundle: true, format: 'esm',
    platform: 'node', outfile: join(dir, 'logic.mjs'), logLevel: 'silent',
  });
  const L = await import(pathToFileURL(join(dir, 'logic.mjs')).href);

  const NOW = 1700000000000;
  const DAY = '2026-11-11';

  /** 造一个「中心 5 格 + 指定格子也归我」的状态，避免测试依赖占领顺序 */
  function withTiles(tiles, extra = {}) {
    const base = L.initialState(DAY, NOW);
    const grid = base.grid.slice();
    for (const [r, c] of tiles) grid[L.indexOf(r, c)] = L.MINE;
    return { ...base, grid, ...extra };
  }

  console.log('[初始地图]');
  const s = L.initialState(DAY, NOW);
  check(s.grid.length === L.TILES, `${L.TILES} 格（9x9）`);
  check(L.ownedCount(s.grid) === 5, `开局 5 格（中心 + 四邻）：${L.ownedCount(s.grid)}`);
  check(L.foeCount(s.grid) === 3, `3 个敌营：${L.foeCount(s.grid)}`);
  check(s.grid[L.indexOf(0, 0)] === L.FOE && s.grid[L.indexOf(8, 0)] === L.FOE, '敌营在角落');
  check(s.troops === 30 && s.cleared === 0, '开局 30 兵 / 第 1 张图');

  console.log('[占领规则]');
  check(!L.canClaim(s, L.indexOf(2, 2)).ok, '不相邻的空地不能占');
  check(!L.canClaim(s, L.indexOf(3, 4)).ok, '已经是自己的地不能重复占');
  const adj = L.indexOf(2, 4);              // 与 (3,4) 相邻，距离中心 2
  check(L.canClaim(s, adj).ok, '相邻空地可占');
  check(L.costOf(adj, 0) === 16, `两格距离成本 16：${L.costOf(adj, 0)}`);
  check(L.costOf(L.indexOf(3, 4), 0) === 11, '一格距离成本 11');
  check(L.costOf(L.indexOf(1, 4), 0) === 21, '三格距离成本 21');
  check(L.costOf(L.indexOf(0, 0), 0) === 46, '六格距离成本 46');
  check(L.costOf(L.indexOf(0, 0), 1) > L.costOf(L.indexOf(0, 0), 0), '通关后地价上浮');

  const rich = { ...s, troops: 100 };
  const s2 = L.claim(rich, adj);
  check(!!s2 && s2.troops === 84, `占领扣兵力：${s2 && s2.troops}`);
  check(rich.troops === 100, '原状态未被修改（纯函数）');
  check(L.ownedCount(s2.grid) === 6, '占领后 6 格');

  const s3 = L.claim(s2, L.indexOf(1, 4));
  check(!!s3 && s3.troops === 63, `再占一格扣 21：${s3 && s3.troops}`);
  const poor = { ...s, troops: 5 };
  check(!L.canClaim(poor, adj).ok && L.canClaim(poor, adj).cost === 16, '兵力不足时拒绝并报出差额');
  check(L.claim(poor, adj) === null, '兵力不足时返回 null');
  check(L.canClaim(s, -1).ok === false && L.canClaim(s, 999).ok === false, '越界下标被拒绝');

  console.log('[时间结算]');
  const six = withTiles([[2, 4]]);
  check(L.incomePerHour(six) === 18, `6 格每小时 18 兵：${L.incomePerHour(six)}`);
  const oneHour = L.settle(six, NOW + 3600 * 1000);
  check(oneHour.gain === 18, `结算 1 小时 +18（实际 ${oneHour.gain}）`);
  check(oneHour.state.troops === six.troops + 18, '兵力确实到账');
  const halfDay = L.settle(six, NOW + 24 * 3600 * 1000);
  check(halfDay.gain === 18 * 12, `离线 24 小时只补 12 小时：${halfDay.gain}`);
  check(L.settle(six, NOW + 1000).gain === 0, '不到一分钟不结算');
  check(L.settle(six, NOW - 5000).gain === 0, '时间回拨不会倒扣');

  console.log('[敌营反攻]');
  const border = withTiles([[1, 0]], { lastRaid: NOW });   // (1,0) 贴着 (0,0) 敌营
  const r1 = L.raid(border, NOW + 6 * 3600 * 1000);
  check(r1.lost === 1, `6 小时后反攻 ${r1.lost} 格`);
  check(L.ownedCount(r1.state.grid) === L.ownedCount(border.grid) - 1, '反攻确实夺走了地');
  check(r1.state.grid[L.indexOf(1, 0)] === L.FOE, '被夺走的是贴着敌营的那一格');
  const r2 = L.raid(border, NOW + 30 * 3600 * 1000);
  check(r2.lost <= L.MAX_RAIDS_PER_SETTLE, `单次结算最多夺 ${L.MAX_RAIDS_PER_SETTLE} 格（实际 ${r2.lost}）`);
  check(L.raid(border, NOW + 1000).lost === 0, '不到 6 小时不反攻');
  const inland = withTiles([], { lastRaid: NOW });
  check(L.raid(inland, NOW + 6 * 3600 * 1000).lost === 0, '没有贴敌营的地就不反攻');

  console.log('[步数兑换]');
  const st = { ...six, steps: 0, troops: 100 };
  const a1 = L.applySteps(st, 250);
  check(a1.gained === 2 && a1.state.troops === 102, `250 步换 2 兵：${a1.gained}`);
  const a2 = L.applySteps(a1.state, 250);
  check(a2.gained === 0, '同一个步数重复同步不重复发放');
  const a3 = L.applySteps(a2.state, 405);
  check(a3.gained === 1 && a3.delta === 155, `补到 405 步再换 1 兵：+${a3.gained}`);
  check(L.applySteps(st, 0).gained === 0, '0 步不发放');
  check(L.applySteps(st, -100).gained === 0, '负数步数不发放');
  check(L.stepToTroops(99) === 0 && L.stepToTroops(100) === 1, '100 步 = 1 兵');

  console.log('[跨天]');
  const d1 = L.rollDay(st, '2026-11-12');
  check(d1.newDay && d1.state.steps === 0, '跨天后步数额度归零');
  check(d1.state.streak === 2, `连续登录 +1：${d1.state.streak}`);
  check(d1.state.troops === st.troops, '跨天不掉兵力');
  const d2 = L.rollDay(st, '2026-11-20');
  check(d2.state.streak === 1, '断档后连续天数归 1');
  check(L.rollDay(st, DAY).newDay === false, '同一天不触发跨天');

  console.log('[通关]');
  const full = { ...s3, grid: new Array(L.TILES).fill(L.MINE) };
  check(L.isCleared(full), '全占满判定为通关');
  check(!L.isCleared(s3), '没占满不算通关');
  const nm = L.nextMap(full, NOW);
  check(nm.cleared === full.cleared + 1, '通关数 +1');
  check(nm.troops > full.troops, '通关有兵力奖励');
  check(L.ownedCount(nm.grid) === 5, '新图从 5 格重新开始');
  check(nm.totalOwned === full.totalOwned, '累计占领不会被重复累加');
  check(nm.streak === full.streak, '通关不清空连续天数');

  console.log('[分享码]');
  const code = L.encodeShare(full);
  const back = L.decodeShare(code);
  check(!!back && back.cleared === full.cleared && back.owned === L.TILES, `往返 ${code}`);
  check(L.decodeShare('1~2') === null && L.decodeShare('a~b~c') === null, '格式错误被拒绝');
  check(L.decodeShare('1~99~100') === null, '越界格数被拒绝');
  check(L.decodeShare('x'.repeat(40)) === null, '超长被拒绝');

  check(L.pctComplete(full) === 100 && L.pctComplete(s) < 10, '完成度百分比正确');

  if (!ok) {
    console.log('逻辑自检未通过，请检查上述 ✗ 项');
    process.exitCode = 1;
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
