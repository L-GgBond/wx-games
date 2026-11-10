// 纯逻辑回归：变化链 / 速度档 / 掉落不惩罚 / 分享码 / 接住判定。
// 不启动服务、不开浏览器；改了 logic.ts 后执行 `npm run verify`。
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = mkdtempSync(join(tmpdir(), 'gc-verify-'));
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

  console.log('[变化链]');
  check(L.LINES.length === 2, `${L.LINES.length} 条路线（期望 2）`);
  L.LINES.forEach(l => check(l.stages.length === L.TOTAL_STAGES, `${l.name}：${l.stages.length} 个形态`));
  const keys = L.LINES.flatMap(l => l.stages.map(s => s.key));
  check(new Set(keys).size === keys.length, `全部 ${keys.length} 个形态 key 唯一`);
  check(keys.length === 16, `共 ${keys.length} 个形态（期望 16）`);
  check(L.LINES.every(l => l.stages.every(s => !!s.label && /^#[0-9A-Fa-f]{6}$/.test(s.color))),
    '每个形态都有名称和合法颜色');

  console.log('[全年龄约束]');
  check(L.SPEEDS.length === 3, `${L.SPEEDS.length} 档速度`);
  check(L.DEFAULT_SPEED === 0 && L.SPEEDS[0].id === 'slow', '默认慢速档');
  check(L.SPEEDS.every(s => s.vy <= 2.5), `最大下落速度 ${Math.max(...L.SPEEDS.map(s => s.vy))} px/帧（无时间压力）`);
  check(L.SPEEDS.some(s => s.auto), '存在完全不用操作的自动档');

  console.log('[进度与掉落]');
  let p = L.initialProgress(0);
  check(p.stage === 0 && p.round === 0 && p.seen.length === 1, '起点：第 0 变 / 第 0 轮 / 图鉴 1 个');
  for (let i = 0; i < 7; i++) p = L.advance(p);
  check(p.stage === 7 && p.round === 0, '接住 7 次到第 7 变');
  p = L.advance(p);
  check(p.stage === 0 && p.round === 1, '第 8 次回到起点并 +1 轮');
  check(p.seen.length === 8, `图鉴收集 ${p.seen.length} 个形态`);
  const before = JSON.stringify(L.onMiss(p));
  check(L.onMiss(p) === p && before === JSON.stringify(p), '掉落不惩罚（进度原样返回）');
  const clamped = L.stageOf({ line: 99, stage: 99, round: 0, seen: [] });
  check(!!clamped && typeof clamped.key === 'string', '越界路线/形态取值会被收敛而不报错');

  console.log('[判定与分享码]');
  check(L.caught(180, 440, 22, 180, 470, 110, 16), '正中间接住 → 命中');
  check(L.caught(245, 440, 22, 180, 470, 110, 16), '偏 65px 仍命中（宽容）');
  check(!L.caught(60, 440, 22, 180, 470, 110, 16), '偏 120px 不命中');
  check(!L.caught(180, 300, 22, 180, 470, 110, 16), '还没落到盘口不命中');
  const code = L.encodeShare(p);
  const back = L.decodeShare(code);
  check(!!back && back.line === p.line && back.stage === p.stage && back.round === p.round,
    `分享码往返 ${code}`);
  check(L.decodeShare('9~9~9') === null, '越界路线/形态被拒绝');
  check(L.decodeShare('x'.repeat(80)) === null, '超长链接被拒绝');
  check(L.decodeShare('0~1') === null && L.decodeShare('a~b~c') === null, '格式错误的链接被拒绝');
  check(L.decodeShare('grow=0~1~2') === null, '非数字链接被拒绝');

  if (!ok) {
    console.log('逻辑自检未通过，请检查上述 ✗ 项');
    process.exitCode = 1;
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
