import { platform } from './platform';
import { UI } from './ui';
import { Game } from './scenes';

const ui = new UI(() => platform.ctx);
const game = new Game(ui);

platform.onTouch((x, y, phase) => {
  if (phase === 'end') ui.tap(x, y);
});

// 右上角「转发」也带上当前题目的求助参数
platform.onShareAppMessage(() => game.sharePayload());

function frame(): void {
  platform.beginFrame();
  ui.begin();
  game.draw();
  platform.requestFrame(frame);
}

platform.requestFrame(frame);
