# 步数领地 · step-kingdom

把每天走的步数换成兵力，从中心那一格开始，一格一格往外占。

## 怎么跑

| 场景 | 操作 |
|---|---|
| 浏览器预览 | 直接打开 `index.html`（`game.js` 已入库，不用构建） |
| 微信小游戏 | 微信开发者工具「导入项目」选本目录，`compileType` 已是 `game` |
| 改代码 | `npm install` → `npm run watch`，产物是根目录 `game.js` |
| 自检 | `npm run check`（`tsc --noEmit` + 构建 + 逻辑回归） |

## 玩法与数值

| 规则 | 数值 | 改哪里 |
|---|---|---|
| 步数换兵力 | 100 步 = 1 兵 | `src/logic.ts` → `STEPS_PER_TROOP` |
| 占领成本 | `6 + 曼哈顿距离 × 5`，每通关一张图 ×1.25 | `src/logic.ts` → `costOf` |
| 领地产出 | 每格每小时 3 兵 | `INCOME_PER_TILE_HOUR` |
| 离线结算上限 | 12 小时 | `MAX_OFFLINE_MS` |
| 敌营反攻 | 每 6 小时夺一格，单次结算最多 2 格 | `RAID_MS` / `MAX_RAIDS_PER_SETTLE` |
| 地图 | 9×9，中心 5 格起手，3 个敌营在角落 | `GRID` / `initialState` |

## 微信运动怎么接（重要）

`src/platform.ts` 里的 `readSteps()` 已经把三步都留好了，只有第 2 步需要你补：

1. **开通云开发**：开发者工具 → 云开发 → 新建环境。
2. **建一个云函数** `getSteps`，把 `cloudID` 换成步数（云函数里调用 `cloud.openapi.wxacode` 同级的运动接口，用 `cloud.getWXContext()` 拿 `session_key` 解密 `encryptedData`）。
3. **填常量**：`src/platform.ts` → `STEP_CLOUD_FN = 'getSteps'`。

没填之前不会报错，会退回 `estimateSteps()` 的本地估算（按当天时段推算，同一天数字稳定），界面上会标「估算」。**估算值是演示用的假数据，上线前必须接真实步数**，否则玩家会觉得被糊弄。

## 目录

| 文件 | 作用 |
|---|---|
| `src/logic.ts` | 纯逻辑：地块、成本、产出、反攻、跨天、分享码 |
| `src/scenes.ts` | 首页 / 地图 / 统计 / 通关弹窗 |
| `src/art.ts` | 地块、旗子、敌营、粒子，全部 Canvas 图元，无图片资源 |
| `src/ui.ts` | immediate-mode 按钮 / 文本 / 点击热区 |
| `src/platform.ts` | 微信与浏览器双端适配、广告、微信运动 |
| `src/storage.ts` | 存档校验与回退（坏档自动重开，不崩界面） |
| `src/social.ts` | 微信侧离屏 Canvas 分享卡片 |
| `verify.mjs` | 55 条纯逻辑断言，改数值后先跑它 |

## 上线前要改的

| 位置 | 现在 | 改成 |
|---|---|---|
| `project.config.json` → `appid` | `touristappid` | 自己的小游戏 AppID |
| `src/platform.ts` → `AD_UNIT_ID` | 空（演示模式直接发奖） | 激励视频广告位 ID |
| `src/platform.ts` → `STEP_CLOUD_FN` | 空 | 云函数名，见上一节 |

## 已知取舍

- 敌营反攻用 `day + cleared + 序号` 的哈希选格，是确定性的：同一局同样的离线时长，结果可复现，方便回归测试。
- 分享码只带「通关数 / 已占格数 / 兵力」，好友点进来只做进度对比，不覆盖他自己的存档。
