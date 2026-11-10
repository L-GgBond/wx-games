// 微信小游戏开放数据域入口（由 game.json 的 openDataContext 指定）。
// 只有这个独立 JS 域能调用 wx.getFriendCloudStorage；算好后用 postMessage 回主域。
// 这里刻意用 ES5 写法，兼容开放数据域较旧的运行环境。
wx.onMessage(function (msg) {
  if (!msg || msg.cmd !== 'rank') return;
  wx.getFriendCloudStorage({
    keyList: ['score'],
    success: function (res) {
      var list = [];
      var users = (res && res.data) || [];
      for (var i = 0; i < users.length; i++) {
        var u = users[i];
        var score = 0;
        var kvs = u.KVDataList || [];
        for (var j = 0; j < kvs.length; j++) {
          if (kvs[j].key === 'score') {
            score = parseInt(kvs[j].value, 10) || 0;
          }
        }
        if (score > 0) {
          list.push({ name: u.nickname || '好友', score: score });
        }
      }
      list.sort(function (a, b) { return b.score - a.score; });
      wx.postMessage({ cmd: 'rank', list: list.slice(0, 5) });
    },
    fail: function () {
      wx.postMessage({ cmd: 'rank', list: [] });
    }
  });
});
