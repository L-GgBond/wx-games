# 反向塔防 · 我是 Boss · boss-defense

这一回你不守塔，你放怪。勇者沿路走向右下角的王座，别让他们走到。

## 怎么跑

| 场景 | 操作 |
|---|---|
| 浏览器预览 | 直接打开 `index.html`（`game.js` 已入库） |
| 微信小游戏 | 微信开发者工具导入本目录，`compileType` 已是 `game` |
| 改代码 | `npm install` → `npm run watch` |
| 自检 | `npm run check`（`tsc --noEmit` + 构建 + 逻辑回归） |

## 玩法与数值

| 规则 | 数值 | 改哪里 |
|---|---|---|
| 槽位 | 10 个，固定在路径两侧 | `src/logic.ts` → `SLOTS` |
| 勇者 | 村民兵 / 骑士 / 盗贼，血量速度各不同 | `ENEMY_KINDS` |
| 怪物 | 哥布林 20 / 弓手 35 / 火法 65 / 幼龙 130 | `TOWERS` |
| 波次 | 数量 `4 + (n-1)×0.9`，封顶 16；血量 ×1.32/波；速度封顶 1.9× | `waveComposition` / `waveHpMul` / `waveSpeedMul` |
| 开局 | 95 魔晶 / 3 点耐久 / 7 秒准备 | `createState` / `PREP_MS` |
| 强化 | 每 3 波三选一：伤害 / 攻速 / 魔晶 / 耐久 / 陨石 | `UPGRADES` |

调平衡只需要改 `ENEMY_KINDS` 的 `hp/speed/reward` 和 `TOWERS` 的 `cost/dmg/rate`，改完跑 `npm run verify` 确认「整局模拟」那段仍然能跑通。

## 目录

| 文件 | 作用 |
|---|---|
| `src/logic.ts` | 纯逻辑：路径、波次、放怪、伤害结算、三选一、分享码 |
| `src/scenes.ts` | 首页 / 战场 HUD / 商店 / 三选一 / 结算 |
| `src/art.ts` | 石板战场、行军路径、勇者、四种怪物、王座，全 Canvas 图元 |
| `src/ui.ts` | immediate-mode 按钮 / 文本 / 点击热区 |
| `src/platform.ts` | 微信与浏览器双端适配、激励视频 |
| `src/storage.ts` | 最高波数、引导标记 |
| `src/social.ts` | 微信侧离屏 Canvas 分享卡片 |
| `verify.mjs` | 48 条断言，含 90 秒整局模拟 |

## 上线前要改的

| 位置 | 现在 | 改成 |
|---|---|---|
| `project.config.json` → `appid` | `touristappid` | 自己的小游戏 AppID |
| `src/platform.ts` → `AD_UNIT_ID` | 空 | 激励视频广告位 ID（当前版本没挂广告位，复活 / 跳波可以挂在这里） |

## 已知取舍

- 伤害按帧结算，`step()` 原地改 state（每帧 60 次 × 双倍速 120 次，避免大量临时对象）。要复现问题就把 `Math.random` 换成 `verify.mjs` 里的 `lcg(seed)`。
- 勇者到终点才扣耐久，没有「漏一个就输」的惩罚，3 点耐久够撑到第 6~8 波，新手不至于开局就结束。
