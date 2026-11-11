// 纯逻辑回归：货架生成 / 三连消除 / 卡住与救场 / 关卡目标 / 撤回与洗牌 / 分享码。
// 不启动服务、不开浏览器；改了 logic.ts 后执行 `npm run verify`。
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = mkdtempSync(join(tmpdir(), 'ogs-verify-'));
let ok = true;
function check(cond, label) {
  console.log(`  ${cond ? '✓' : '✗'} ${label}`);
  if (!cond) ok = false;
}
function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const rnd = lcg(20261111);

try {
  await build({
    entryPoints: ['src/logic.ts'], bundle: true, format: 'esm',
    platform: 'node', outfile: join(dir, 'logic.mjs'), logLevel: 'silent',
  });
  const L = await import(pathToFileURL(join(dir, 'logic.mjs')).href);

  console.log('[关卡配置]');
  const c1 = L.levelConfig(1);
  check(c1.cells === 14 && c1.kinds === 3, `第 1 关 14 格 / 3 种：${c1.cells}/${c1.kinds}`);
  check(c1.target === 87, `第 1 关目标 87：${c1.target}`);
  const c5 = L.levelConfig(5);
  check(c5.cells === L.CELLS, `第 5 关铺满 ${L.CELLS} 格`);
  check(L.levelConfig(9).kinds === 8, '商品种类封顶 8');
  check(L.levelConfig(99).target > c1.target, '目标随关卡上浮');
  check(L.priceOf(0) === 8 && L.priceOf(3) === 14, '商品单价递增');

  console.log('[货架生成]');
  const s = L.createState(1, rnd);
  const cells = s.shelves.filter(Boolean);
  check(cells.length === c1.cells, `摆出 ${cells.length} 格货`);
  check(cells.every(c => c.count === 3), '每格初始 3 件');
  check(cells.every(c => c.kind >= 0 && c.kind < c1.kinds), '商品种类在配置范围内');
  const byKind = {};
  cells.forEach(c => { byKind[c.kind] = (byKind[c.kind] || 0) + c.count; });
  check(Object.values(byKind).every(n => n % 3 === 0), `每种数量都是 3 的倍数：${JSON.stringify(byKind)}`);
  check(Object.values(byKind).reduce((a, b) => a + b, 0) === c1.groups * 3, '总件数 = 组数 × 3');

  console.log('[篮子规则]');
  check(JSON.stringify(L.insertBasket([], 1).list) === '[1]', '空篮子放第一件');
  check(JSON.stringify(L.insertBasket([1], 1).list) === '[1,1]', '同类聚在一起');
  const m = L.insertBasket([1, 1], 1);
  check(m.matched && m.list.length === 0, '第三件凑齐立即消');
  check(JSON.stringify(L.insertBasket([1, 1], 2).list) === '[1,1,2]', '不同类追加到末尾');
  const m2 = L.insertBasket([1, 2, 1], 1);
  check(m2.matched && JSON.stringify(m2.list) === '[2]', '跨位置也能凑齐三个');

  console.log('[取货与营收]');
  const p = L.createState(1, rnd);
  const idx = p.shelves.findIndex(c => c && c.count === 3);
  const kind = p.shelves[idx].kind;
  const r1 = L.pick(p, idx);
  check(r1.ok && !r1.matched && p.shelves[idx].count === 2, '点一次拿一件');
  L.pick(p, idx);
  const r3 = L.pick(p, idx);
  check(r3.matched && r3.gained === L.priceOf(kind), `第三件消掉并结算 ${r3.gained}`);
  check(p.shelves[idx] === null, '拿空的格子变空');
  check(p.revenue === L.priceOf(kind), '营业额到账');
  check(p.groupsLeft === c1.groups - 1, '剩余组数 -1');
  check(L.pick(p, 999).ok === false && L.pick(p, -1).ok === false, '越界下标被拒绝');
  check(L.pick(p, idx).ok === false, '空格子不能再拿');

  console.log('[卡住与救场]');
  const st = L.createState(1, rnd);
  st.shelves[0] = { kind: 3, count: 3 };
  st.baskets = [0, 1, 2, 0, 1, 2, 3];
  const r4 = L.pick(st, 0);
  check(r4.ok && st.phase === 'stuck', `放下第 8 件时卡住：${st.phase}`);
  check(st.baskets.length === 8, `篮子 8 件 / ${st.slots} 格`);
  check(L.addSlot(st) === true, '看广告加槽成功');
  check(st.slots === 9 && st.phase === 'play', `加槽后继续：${st.slots} 格`);
  check(L.addSlot(st) === false, '已经到上限就不能再加');
  const st2 = L.createState(1, rnd);
  st2.slots = 9;
  check(L.addSlot(st2) === false, '满槽位时 addSlot 返回 false');

  console.log('[胜负判定]');
  const w = L.createState(1, rnd);
  w.revenue = w.target - 1;
  w.shelves[0] = { kind: L.priceOf(0) === 8 ? 0 : 0, count: 3 };
  w.baskets = [0, 0];
  L.pick(w, 0);
  check(w.revenue >= w.target && w.phase === 'win', `达标即过关：${w.revenue}/${w.target}`);
  const lose = L.createState(1, rnd);
  lose.shelves = lose.shelves.map(() => null);
  lose.shelves[0] = { kind: 0, count: 1 };
  lose.baskets = [];
  L.pick(lose, 0);
  check(lose.phase === 'lose', '货架空了没达标算没完成');
  const winStars = L.starsOf({ ...w, revenue: w.target * 1.4 });
  check(winStars === 3, `超额完成给 3 星：${winStars}`);

  console.log('[道具]');
  const u = L.createState(1, rnd);
  const beforeBaskets = u.baskets.slice();
  const firstIdx = u.shelves.findIndex(c => c && c.count === 3);
  const firstKind = u.shelves[firstIdx].kind;
  L.pick(u, firstIdx);
  check(u.history.length === 1, '每步都留了快照');
  check(L.undo(u) === true, '撤回成功');
  check(u.shelves[firstIdx].count === 3 && u.baskets.length === 0, '货架和篮子都还原');
  check(u.undoLeft === L.UNDO_PER_LEVEL - 1, `撤回次数 -1：${u.undoLeft}`);
  check(beforeBaskets.length === u.baskets.length, '篮子回到初始');

  const sh = L.createState(2, rnd);
  const before = sh.shelves.filter(Boolean).map(c => `${c.kind}:${c.count}`).sort().join(',');
  const posBefore = sh.shelves.map((c, i) => c ? i : -1).filter(i => i >= 0).join(',');
  L.shuffleShelves(sh, lcg(99));
  const after = sh.shelves.filter(Boolean).map(c => `${c.kind}:${c.count}`).sort().join(',');
  const posAfter = sh.shelves.map((c, i) => c ? i : -1).filter(i => i >= 0).join(',');
  check(before === after, '洗牌不改变商品构成');
  check(posBefore === posAfter, '洗牌只在原有格子间重排');
  check(sh.shelves.filter(Boolean).length === L.levelConfig(2).cells, '洗牌不丢货');

  console.log('[整局模拟]');
  const sim = L.createState(1, lcg(5));
  const simRnd = lcg(77);
  let guard = 0;
  while (sim.phase === 'play' && guard++ < 200) {
    // 简单策略：优先点同款数量最多的格子
    const counts = {};
    sim.baskets.forEach(k => { counts[k] = (counts[k] || 0) + 1; });
    let best = -1, bestScore = -1;
    sim.shelves.forEach((c, i) => {
      if (!c) return;
      const score = (counts[c.kind] || 0) * 10 + c.count;
      if (score > bestScore) { bestScore = score; best = i; }
    });
    if (best < 0) break;
    L.pick(sim, best);
  }
  check(sim.phase !== 'play' || sim.revenue > 0, `模拟到 ${sim.phase}，营收 ¥${sim.revenue}`);
  check(sim.revenue >= 0 && sim.groupsLeft >= 0, '营收与剩余组数不为负');
  check(sim.baskets.length <= sim.slots, '篮子不会超过槽位');

  console.log('[分享码]');
  const sh2 = L.createState(3, rnd);
  sh2.revenue = 456;
  const code = L.encodeShare(sh2);
  const back = L.decodeShare(code);
  check(!!back && back.level === 3 && back.revenue === 456, `往返 ${code}`);
  check(L.decodeShare('1') === null && L.decodeShare('a~b') === null, '格式错误被拒绝');
  check(L.decodeShare('0~1') === null, '关卡 0 被拒绝');
  check(L.decodeShare('x'.repeat(30)) === null, '超长被拒绝');

  if (!ok) {
    console.log('逻辑自检未通过，请检查上述 ✗ 项');
    process.exitCode = 1;
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
