// 题库 / 每日乱斗自检：改了 questions.ts 后执行 `npm run verify`。
// 纯数据校验，不启动服务、不依赖浏览器。
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = mkdtempSync(join(tmpdir(), 'cp-verify-'));
let ok = true;
function check(cond, label) {
  console.log(`  ${cond ? '✓' : '✗'} ${label}`);
  if (!cond) ok = false;
}

try {
  await build({
    entryPoints: ['src/questions.ts'], bundle: true, format: 'esm',
    platform: 'node', outfile: join(dir, 'questions.mjs'), logLevel: 'silent',
  });
  const { QUESTIONS, GROUPS, HUMAN_TAGS, dailyQuestions } =
    await import(pathToFileURL(join(dir, 'questions.mjs')).href);

  console.log('[题库结构]');
  check(QUESTIONS.length === 24, `共 ${QUESTIONS.length} 题（期望 24）`);
  check(GROUPS.length === 3, `共 ${GROUPS.length} 组（期望 3）`);
  GROUPS.forEach((g, i) => {
    const n = QUESTIONS.filter(q => q.group === i).length;
    check(n === 8, `第 ${i + 1} 组 ${g.name}：${n} 题（期望 8）`);
  });

  const ids = new Set();
  const dist = [0, 0, 0];
  let structOk = true, tagOk = true;
  QUESTIONS.forEach(q => {
    if (ids.has(q.id)) structOk = false;
    ids.add(q.id);
    if (!Array.isArray(q.options) || q.options.length !== 3) structOk = false;
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 2) structOk = false;
    else dist[q.answer]++;
    if (!q.tell || !q.explain || !q.messages || q.messages.length === 0) structOk = false;
    if (!q.options[q.answer]) structOk = false;
    if (!HUMAN_TAGS[q.id]) tagOk = false;
  });
  check(structOk, '每题：3 选项 / 合法答案 / 上下文与解析齐全 / id 唯一');
  check(tagOk, 'HUMAN_TAGS 覆盖全部题目 id');
  check(dist.every(n => n >= 5), `答案位置分布 A/B/C = ${dist.join('/')}（各 ≥5，防蒙题）`);

  console.log('[每日乱斗]');
  const d1 = new Date(2026, 10, 10);
  const d2 = new Date(2026, 10, 11);
  const a = dailyQuestions(d1);
  const b = dailyQuestions(d1);
  const c = dailyQuestions(d2);
  check(a.length === 8, `抽题 ${a.length} 道（期望 8）`);
  check(new Set(a.map(q => q.id)).size === 8, '8 道题互不重复');
  check(new Set(a.map(q => q.group)).size >= 2, '跨组混合');
  check(a.map(q => q.id).join(',') === b.map(q => q.id).join(','), '同一天结果确定（同种子）');
  check(a.map(q => q.id).join(',') !== c.map(q => q.id).join(','), '换一天题目会变');

  if (!ok) {
    console.log('题库自检未通过，请检查上述 ✗ 项');
    process.exitCode = 1;
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
