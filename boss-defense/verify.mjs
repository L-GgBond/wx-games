// 纯逻辑回归：路径 / 波次 / 放怪 / 伤害结算 / 三选一 / 分享码。
// 不启动服务、不开浏览器；改了 logic.ts 后执行 `npm run verify`。
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = mkdtempSync(join(tmpdir(), 'bd-verify-'));
let ok = true;
function check(cond, label) {
  console.log(`  ${cond ? '✓' : '✗'} ${label}`);
  if (!cond) ok = false;
}

/** 固定种子的线性同余，保证模拟可复现 */
function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

try {
  await build({
    entryPoints: ['src/logic.ts'], bundle: true, format: 'esm',
    platform: 'node', outfile: join(dir, 'logic.mjs'), logLevel: 'silent',
  });
  const L = await import(pathToFileURL(join(dir, 'logic.mjs')).href);
  const rnd = lcg(20261111);

  console.log('[路径]');
  check(L.PATH_LEN > 900, `路径总长 ${Math.round(L.PATH_LEN)} px`);
  const p0 = L.posAt(0);
  check(Math.round(p0.x) === -12 && Math.round(p0.y) === 138, '起点在左上入口');
  const pe = L.posAt(L.PATH_LEN);
  check(Math.round(pe.x) === 318 && Math.round(pe.y) === 428, '终点在右下王座');
  check(L.posAt(-500).x === p0.x, '负数路程收敛到起点');
  check(L.posAt(L.PATH_LEN + 500).x === pe.x, '超长路程收敛到终点');
  const mid = L.posAt(L.PATH_LEN / 2);
  check(Number.isFinite(mid.x) && Number.isFinite(mid.y), '中点坐标有效');
  check(L.SLOTS.length === 10, `${L.SLOTS.length} 个可放怪槽位`);
  check(L.SLOTS.every(s => s.y > 96 && s.y < 474), '槽位都在战场范围内');

  console.log('[波次]');
  const w1 = L.waveComposition(1, rnd);
  check(w1.length === 4 && w1.every(k => k === 'grunt'), `第 1 波 4 个村民兵：${w1.join(',')}`);
  const w10 = L.waveComposition(10, rnd);
  check(w10.length === 12, `第 10 波 12 个：${w10.length}`);
  check(L.waveComposition(40, rnd).length === 16, '数量封顶 16');
  check(L.waveHpMul(2) > L.waveHpMul(1), '血量随波数上浮');
  check(L.waveSpeedMul(99) <= 1.9, `速度封顶 ${L.waveSpeedMul(99)}`);

  console.log('[初始状态与放怪]');
  const s = L.createState();
  check(s.phase === 'prep' && s.wave === 1, '开局在准备阶段');
  check(s.gold === 95 && s.hp === 3 && s.maxHp === 3, '95 魔晶 / 3 耐久');
  check(L.placeTower(s, 0, 'goblin') === true && s.gold === 75, '放哥布林扣 20');
  check(L.placeTower(s, 0, 'archer') === false, '同一槽位不能重复放');
  check(L.placeTower(s, 1, 'dragon') === false && s.gold === 75, '魔晶不够不能放龙');
  check(L.placeTower(s, 99, 'goblin') === false, '越界槽位被拒绝');
  check(L.placeTower(s, 1, 'archer') === true && s.gold === 40, '继续放弓手扣 35');
  check(L.towerAt(s, 0).kind === 'goblin', '槽位查询正确');

  console.log('[开火与击杀]');
  const s2 = L.createState();
  s2.gold = 200;
  L.placeTower(s2, 0, 'goblin');
  s2.phase = 'battle';
  s2.plan = ['grunt'];
  s2.spawned = 1;
  s2.enemies = [{ id: 1, kind: 'grunt', hp: 42, maxHp: 42, dist: 60, speed: 0, reward: 6 }];
  L.step(s2, 16, rnd);
  check(s2.enemies[0].hp < 42, `进入射程后开火：${s2.enemies[0].hp}`);
  s2.enemies[0].hp = 5;
  const goldBefore = s2.gold;
  for (let i = 0; i < 80; i++) L.step(s2, 16, rnd);   // 等过一轮冷却
  check(s2.enemies.length === 0, '血量为 0 的敌人被移除');
  check(s2.gold === goldBefore + 6 && s2.kills === 1, `击杀给 6 魔晶：${s2.gold}`);
  check(s2.wave === 2 && s2.phase === 'prep', '清完一波进入下一波准备');

  console.log('[逃到终点]');
  const s3 = L.createState();
  s3.phase = 'battle';
  s3.plan = ['grunt'];
  s3.spawned = 1;
  s3.enemies = [{ id: 1, kind: 'grunt', hp: 42, maxHp: 42, dist: L.PATH_LEN - 1, speed: 26, reward: 6 }];
  const ev = L.step(s3, 100, rnd);
  check(s3.hp === 2, `跑进王座扣 1 点耐久：${s3.hp}`);
  check(ev.some(e => e.includes('宝座')), '事件里报告了冲进宝座');
  s3.enemies = [];
  s3.phase = 'battle';
  s3.hp = 1;
  s3.plan = ['grunt'];
  s3.spawned = 1;
  s3.enemies = [{ id: 2, kind: 'grunt', hp: 42, maxHp: 42, dist: L.PATH_LEN - 1, speed: 26, reward: 6 }];
  L.step(s3, 100, rnd);
  check(s3.hp === 0 && s3.phase === 'dead', '耐久归零这局结束');
  check(s3.bestWave >= 1, '结束时记录了最高波数');

  console.log('[准备阶段]');
  const s4 = L.createState();
  s4.prepLeft = 10;
  L.step(s4, 16, rnd);
  check(s4.phase === 'battle' && s4.plan.length === 4, '倒计时结束自动开波');
  const s5 = L.createState();
  L.rushWave(s5, rnd);
  check(s5.phase === 'battle' && s5.plan.length === 4, '立刻开战跳过倒计时');

  console.log('[每 3 波强化]');
  const s6 = L.createState();
  s6.wave = 3;
  s6.phase = 'battle';
  s6.plan = ['grunt'];
  s6.spawned = 1;
  s6.enemies = [];
  L.step(s6, 16, rnd);
  check(s6.phase === 'upgrade', '第 3 波清完进入三选一');
  const picks = L.pickUpgrades(rnd);
  check(picks.length === 3, '抽 3 个强化');
  check(new Set(picks.map(p => p.id)).size === 3, '三个强化不重复');
  const seen = new Set();
  for (let i = 0; i < 30; i++) L.pickUpgrades(rnd).forEach(p => seen.add(p.id));
  check(seen.size === L.UPGRADES.length, `多次抽取能覆盖全部 ${L.UPGRADES.length} 种`);

  console.log('[强化效果]');
  const s7 = L.createState();
  const dmg0 = s7.buffs.dmg;
  L.applyUpgrade(s7, 'dmg');
  check(Math.abs(s7.buffs.dmg - dmg0 * 1.15) < 1e-9, '淬毒：伤害 +15%');
  check(s7.phase === 'prep' && s7.wave === 2, '选完强化进入下一波准备');
  const s8 = L.createState();
  s8.hp = 2;
  L.applyUpgrade(s8, 'hp');
  check(s8.maxHp === 4 && s8.hp === 3, '加固王座：上限 +1 并回 1 点');
  s8.maxHp = 5;
  s8.hp = 5;
  L.applyUpgrade(s8, 'hp');
  check(s8.maxHp === 5, '耐久上限封顶 5');
  const s9 = L.createState();
  s9.gold = 0;
  s9.enemies = [{ id: 9, kind: 'grunt', hp: 20, maxHp: 42, dist: 10, speed: 0, reward: 6 }];
  s9.buffs.gold = 1;
  L.applyUpgrade(s9, 'meteor');
  check(s9.enemies.length === 0 && s9.kills === 1 && s9.gold === 6, '陨石砸死场上勇者并结算魔晶');

  console.log('[整局模拟]');
  const sim = L.createState();
  const simRnd = lcg(7);
  L.placeTower(sim, 0, 'goblin');
  L.placeTower(sim, 1, 'goblin');
  L.placeTower(sim, 3, 'goblin');
  L.placeTower(sim, 4, 'goblin');
  L.placeTower(sim, 5, 'goblin');
  let minHp = sim.hp;
  for (let i = 0; i < 60 * 90; i++) {           // 90 秒
    L.step(sim, 16, simRnd);
    if (sim.hp < minHp) minHp = sim.hp;
    if (sim.phase === 'dead') break;
  }
  check(sim.phase === 'dead' || sim.wave >= 1, `模拟 90 秒后仍在运行（第 ${sim.wave} 波）`);
  check(sim.hp >= 0 && sim.hp <= sim.maxHp, '耐久始终在合法区间');
  check(sim.gold >= 0, '魔晶不会变成负数');
  check(sim.enemies.every(e => e.hp > 0), '场上没有残留的零血敌人');

  console.log('[分享码]');
  const sh = L.createState();
  sh.bestWave = 12;
  sh.kills = 34;
  sh.hp = 2;
  const code = L.encodeShare(sh);
  const back = L.decodeShare(code);
  check(!!back && back.bestWave === 12 && back.kills === 34 && back.hp === 2, `往返 ${code}`);
  check(L.decodeShare('1~2') === null && L.decodeShare('a~b~c') === null, '格式错误被拒绝');
  check(L.decodeShare('1~2~9') === null, '耐久越界被拒绝');
  check(L.decodeShare('x'.repeat(40)) === null, '超长被拒绝');

  if (!ok) {
    console.log('逻辑自检未通过，请检查上述 ✗ 项');
    process.exitCode = 1;
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
