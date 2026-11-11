// 纯逻辑回归：节气数据 / 配方 / 火候判定 / 出餐结算 / 分享码。
// 不启动服务、不开浏览器；改了 logic.ts 后执行 `npm run verify`。
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = mkdtempSync(join(tmpdir(), 'sk2-verify-'));
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

  console.log('[节气数据]');
  check(L.TERMS.length === 24, `24 个节气：${L.TERMS.length}`);
  check(L.TERMS.every(t => t.ings.length === 3), '每个节气 3 样当季食材');
  check(L.TERMS.every(t => new Set(t.ings).size === 3), '同一节气的食材不重复');
  const seasons = { 春: 0, 夏: 0, 秋: 0, 冬: 0 };
  L.TERMS.forEach(t => { seasons[t.season] += 1; });
  check(Object.values(seasons).every(n => n === 6), `四季各 6 个节气：${JSON.stringify(seasons)}`);
  check(L.TERMS.every(t => !!L.SEASON_COLOR[t.season]), '每个季节都有配色');

  console.log('[订单与配方]');
  const dishes = [0, 1, 2].map(i => L.dishOf(0, i));
  check(dishes.length === 3, '一关 3 张订单');
  const keys = dishes.map(d => d.need.slice().sort().join('|'));
  check(new Set(keys).size === 3, `三张订单配方不重样：${keys.join(' , ')}`);
  check(dishes.every(d => d.need.every(n => L.TERMS[0].ings.includes(n))), '配方只用当季食材');
  check(dishes.every(d => d.price > 0 && Number.isInteger(d.price)), '价格为正整数');
  check(dishes.every(d => d.name.length >= 4), `菜名像样：${dishes.map(d => d.name).join('、')}`);
  const late = L.dishOf(23, 0);
  check(late.price > dishes[0].price, `越往后越贵：${dishes[0].price} → ${late.price}`);
  check(L.dishOf(99, 0).need.length === 2, '越界节气被收敛');
  check(L.dishOf(0, 9).need.length === 2, '越界单号被收敛');

  console.log('[火候判定]');
  check(L.judgeHeat(0.5) === 'perfect', '正中是完美');
  check(L.judgeHeat(0.45) === 'perfect', '0.45 仍在完美区');
  check(L.judgeHeat(0.56) === 'perfect', '0.56 仍在完美区');
  check(L.judgeHeat(0.57) === 'good', '0.57 掉到不错');
  check(L.judgeHeat(0.35) === 'good', '0.35 是不错');
  check(L.judgeHeat(0.30) === 'good', '0.30 边界算不错');
  check(L.judgeHeat(0.29) === 'burnt', '0.29 糊了');
  check(L.judgeHeat(0.7) === 'good', '0.70 边界算不错');
  check(L.judgeHeat(0.71) === 'burnt', '0.71 糊了');
  check(L.judgeHeat(-3) === 'burnt' && L.judgeHeat(9) === 'burnt', '越界位置算糊');

  console.log('[收入与星级]');
  const p = 20;
  check(L.rewardOf(p, 'perfect') === 32, `完美 ×1.6：${L.rewardOf(p, 'perfect')}`);
  check(L.rewardOf(p, 'good') === 20, '不错按原价');
  check(L.rewardOf(p, 'burnt') === 8, `糊了 ×0.4：${L.rewardOf(p, 'burnt')}`);
  check(L.QUALITY_STARS.perfect === 3 && L.QUALITY_STARS.good === 2 && L.QUALITY_STARS.burnt === 1, '星级 3/2/1');

  console.log('[下锅校验]');
  const d0 = L.dishOf(0, 0);
  check(L.potMatches([d0.need[1], d0.need[0]], d0), '顺序无关');
  check(!L.potMatches([d0.need[0]], d0), '只有一样不算');
  check(!L.potMatches([d0.need[0], d0.need[1], '春笋'], d0), '多一样不算');

  const s = L.createState();
  check(s.phase === 'cook' && s.order === 0 && s.money === 0, '开局第一单、零营收');
  check(L.putIngredient(s, L.TERMS[0].ings[0]) === true, '放第一样食材');
  check(L.putIngredient(s, L.TERMS[0].ings[0]) === false, '同一样不能重复放');
  check(L.putIngredient(s, L.TERMS[0].ings[1]) === true, '放第二样食材');
  check(L.putIngredient(s, L.TERMS[0].ings[2]) === false, '锅里最多两样');

  const wrong = L.createState();
  L.putIngredient(wrong, L.TERMS[0].ings[0]);
  L.putIngredient(wrong, L.TERMS[0].ings[2]);
  check(L.startCooking(wrong) === false, '配方不对不能下锅');
  check(wrong.phase === 'cook', '失败的尝试不改变阶段');

  const good = L.createState();
  const need = L.currentDish(good).need;
  L.putIngredient(good, need[0]);
  L.putIngredient(good, need[1]);
  check(L.startCooking(good) === true && good.phase === 'heat', '配料正确进入火候阶段');

  console.log('[出餐结算]');
  const before = { money: good.money, served: good.served };
  const q = L.finishHeat(good, 0.5);
  check(q === 'perfect', '正中停手 → 完美');
  check(good.phase === 'result' && good.quality === 'perfect', '进入结果阶段');
  check(good.money > before.money && good.served === before.served + 1, '营收与服务数都增加');
  check(good.lastReward === L.rewardOf(L.currentDish(good).price, 'perfect'), '收入与品质对应');

  console.log('[推进关卡]');
  const t = L.createState();
  const n1 = L.nextOrder(t);
  check(!n1.termDone && t.order === 1, '第一单之后到第二单');
  L.nextOrder(t);
  const n3 = L.nextOrder(t);
  check(n3.termDone === true, '第三单之后本节气结束');
  check(t.pot.length === 0, '换单会清空锅');
  t.order = 0;
  L.nextTerm(t);
  check(t.term === 1 && t.year === 0, '进入下一个节气');
  const last = L.createState();
  last.term = 23;
  L.nextTerm(last);
  check(last.term === 0 && last.year === 1, '走完 24 个节气进第二年');
  check(last.best === 0 || last.best >= 0, 'best 不越界');

  console.log('[火候指针]');
  const r1 = L.heatTick(0.95, 1, 1.0, 0.1);
  check(r1.pos <= 1 && r1.dir === -1, `撞右端反弹：${r1.pos.toFixed(2)}`);
  const r2 = L.heatTick(0.05, -1, 1.0, 0.1);
  check(r2.pos >= 0 && r2.dir === 1, `撞左端反弹：${r2.pos.toFixed(2)}`);
  const r3 = L.heatTick(0.5, 1, 0.5, 0.016);
  check(Math.abs(r3.pos - 0.508) < 1e-6, '按速度与时间推进');
  check(L.heatSpeed(23, 0) > L.heatSpeed(0, 0), '越往后指针越快');
  check(L.heatSpeed(0, 1) > L.heatSpeed(0, 0), '第二年更快');
  check(L.heatSpeed(23, 9) <= 1.65, `速度有上限：${L.heatSpeed(23, 9).toFixed(2)}`);

  console.log('[分享码]');
  const sh = L.createState();
  sh.money = 4321;
  const code = L.encodeShare(sh);
  const back = L.decodeShare(code);
  check(!!back && back.term === sh.term && back.money === 4321, `往返 ${code}`);
  check(L.decodeShare('1~2') === null && L.decodeShare('a~b~c') === null, '格式错误被拒绝');
  check(L.decodeShare('24~0~1') === null, '节气越界被拒绝');
  check(L.decodeShare('x'.repeat(40)) === null, '超长被拒绝');

  check(L.termLabel(L.createState()) === '立春 · 第 1 年', `标签 ${L.termLabel(L.createState())}`);

  if (!ok) {
    console.log('逻辑自检未通过，请检查上述 ✗ 项');
    process.exitCode = 1;
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
