import { build, context } from 'esbuild';

// 产物 game.js 直接位于项目根目录，微信开发者工具以根目录作为小游戏项目导入。
const options = {
  entryPoints: ['src/main.ts'],
  bundle: true,
  outfile: 'game.js',
  format: 'iife',
  target: ['es2017'],
  minify: false,
  legalComments: 'none',
  logLevel: 'info',
};

if (process.argv.includes('--watch')) {
  const ctx = await context(options);
  await ctx.watch();
  console.log('[step-kingdom] watching src/ ...');
} else {
  await build(options);
  console.log('[step-kingdom] built game.js');
}
