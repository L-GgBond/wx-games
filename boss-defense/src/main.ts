import { platform } from './platform';
import { UI } from './ui';
import { Game } from './scenes';

const ui = new UI(() => platform.ctx);
const game = new Game(ui);

platform.onTouch((x, y, phase) => {
  // 场景内的地图点击优先；未被消费的点击才落到按钮热区
  if (game.handleTouch(x, y, phase)) return;
  if (phase === 'end') ui.tap(x, y);
});

platform.onShareAppMessage(() => game.sharePayload());

function frame(): void {
  platform.beginFrame();
  ui.begin();
  game.draw();
  platform.requestFrame(frame);
}

platform.requestFrame(frame);
