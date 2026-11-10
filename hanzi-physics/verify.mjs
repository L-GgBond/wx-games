// 关卡参考摆法回归：不启动服务、不开浏览器，纯数值模拟跑一遍每关的 solution。
//   npm run verify              检查三关内置参考摆法是否都能通关
//   npm run verify -- --tune    搜索可用的单部件摆法（改关卡后用来找新参考解）
//   npm run verify -- --tune --level=3   只搜第 3 关
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const tune = args.includes('--tune');
const levelArg = args.find(a => a.startsWith('--level='));
const onlyLevel = levelArg ? Number(levelArg.split('=')[1]) : 0;

const dir = mkdtempSync(join(tmpdir(), 'hp-verify-'));
try {
  const common = { bundle: true, format: 'esm', platform: 'node', logLevel: 'silent' };
  await build({ ...common, entryPoints: ['src/physics.ts'], outfile: join(dir, 'physics.mjs') });
  await build({ ...common, entryPoints: ['src/levels.ts'], outfile: join(dir, 'levels.mjs') });

  const { PhysicsWorld } = await import(pathToFileURL(join(dir, 'physics.mjs')).href);
  const { LEVELS } = await import(pathToFileURL(join(dir, 'levels.mjs')).href);

  function simulate(lv, pieces, maxSteps = 420) {
    const w = new PhysicsWorld(lv);
    pieces.forEach(s => w.addPiece(s.type, s.x, s.y, s.angle));
    w.launch();
    for (let i = 0; i < maxSteps; i++) {
      w.step();
      if (w.inGoal()) return { result: 'PASS', w };
      if (w.isDead()) return { result: 'FAIL', w };
    }
    return { result: 'TIMEOUT', w };
  }

  // 只搜玩家用旋转按钮能摆出的角度（15° 的整数倍）
  const ANGLE_STEPS = [
    -Math.PI / 4, -Math.PI / 6, -Math.PI / 12, 0,
    Math.PI / 12, Math.PI / 6, Math.PI / 4,
  ];

  function tuneLevel(lv) {
    const type = lv.solution[0].type;
    const found = [];
    for (const a of ANGLE_STEPS) {
      for (let y = 170; y <= 270; y += 20) {
        for (let x = 160; x <= 320; x += 20) {
          const angle = Number(a.toFixed(4));
          const r = simulate(lv, [{ type, x, y, angle }]);
          if (r.result === 'PASS') {
            found.push({ type, x, y, angle, t: Number((r.w.elapsed / 1000).toFixed(2)) });
            if (found.length >= 8) return found;
          }
        }
      }
    }
    return found;
  }

  let allOk = true;
  for (const lv of LEVELS) {
    if (onlyLevel && lv.id + 1 !== onlyLevel) continue;

    if (tune) {
      const list = tuneLevel(lv);
      console.log(`[第${lv.id + 1}关 ${lv.name}] 找到 ${list.length} 组可用摆法：`);
      list.forEach(v => console.log(`   { type:'${v.type}', x:${v.x}, y:${v.y}, angle:${v.angle} }   ${v.t}s`));
      if (!list.length) allOk = false;
      continue;
    }

    const r = simulate(lv, lv.solution, 600);
    const p = r.w.ballPos();
    const pos = p ? `(${p.x.toFixed(0)}, ${p.y.toFixed(0)})` : '(none)';
    console.log(`[第${lv.id + 1}关 ${lv.name}] ${r.result.padEnd(7)} t=${(r.w.elapsed / 1000).toFixed(2)}s ball=${pos} goal=${lv.goal.x}~${lv.goal.x + lv.goal.w}`);
    if (r.result !== 'PASS') allOk = false;
  }

  if (!tune) {
    console.log('[物理自检]');
    // 连点旋转 40 次后角度仍应落在 [-π, π]，否则分享码会被好友端拒绝
    const w2 = new PhysicsWorld(LEVELS[0]);
    const p = w2.addPiece('木', 180, 210, 0);
    if (p) {
      for (let i = 0; i < 40; i++) w2.rotate(p.id, Math.PI / 12);
      const a = w2.pieces[0].angle;
      const inRange = Math.abs(a) <= Math.PI;
      console.log(`  ${inRange ? '✓' : '✗'} 连续旋转 40 次后角度 ${a.toFixed(3)} rad 仍在 [-π, π]`);
      if (!inRange) allOk = false;
    }
    // 球停在水平板上应提前判失败，而不是干等满 9 秒超时
    const w3 = new PhysicsWorld(LEVELS[0]);
    w3.addPiece('一', 150, 140, 0);
    w3.launch();
    let deadAt = -1;
    for (let i = 0; i < 600; i++) {
      w3.step();
      if (w3.inGoal()) break;
      if (w3.isDead()) { deadAt = w3.elapsed / 1000; break; }
    }
    const early = deadAt >= 0 && deadAt < 9;
    console.log(`  ${early ? '✓' : '✗'} 球停在平板上 ${deadAt.toFixed(2)}s 判失败（应 <9s）`);
    if (!early) allOk = false;
  }

  if (!allOk) {
    console.log(tune ? '未找到可用摆法' : '存在未通关或自检未通过的项目，请检查上述输出');
    process.exitCode = 1;
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
