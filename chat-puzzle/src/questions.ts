// 题库：核心玩法是「分辨人味与机器味」。
// 真人群聊回复的特征：省略主语、指代上文、跑题、带情绪/语气词、只接跟自己有关的那半句。
// 干扰项特征：完整主谓宾、复述信息、礼貌过度、"建议/温馨提示/感谢关心"式书面语、总结陈词。
// 答案位置已刻意打散，避免玩家靠位置蒙题。

export interface ChatMsg {
  name: string;
  text: string;
  self?: boolean;
  time?: string;
}

export interface Question {
  id: string;
  group: number;
  groupName: string;
  scene: string;
  messages: ChatMsg[];
  prompt: string;
  options: [string, string, string];
  answer: number;
  tell: string;
  explain: string;
}

export interface GroupInfo {
  name: string;
  scene: string;
  desc: string;
}

export const GROUPS: GroupInfo[] = [
  { name: '相亲相爱一家人', scene: '相亲相爱一家人 (12)', desc: '养生、催婚、红包与天气预报' },
  { name: '摸鱼同事群', scene: '项目攻坚群 (8)', desc: '加班、报销与临时需求' },
  { name: '四年二班', scene: '四年二班 (38)', desc: '聚餐、拼单与深夜开黑' },
];

export const QUESTIONS: Question[] = [
  // ---------- 组 0：相亲相爱一家人 ----------
  {
    id: 'f1', group: 0, groupName: GROUPS[0].name, scene: GROUPS[0].scene,
    messages: [
      { name: '三姨', text: '【空腹吃这3样等于慢性自杀！】' },
      { name: '三姨', text: '都看看，尤其是年轻人' },
      { name: '妈', text: '@我 你就是不吃早饭那个' },
      { name: '爸', text: '[表情]' },
    ],
    prompt: '「我」接下来最可能回哪句？',
    options: [
      '感谢三姨分享，我会认真学习并转发给同事们。',
      '妈你别又拿这个念我…我吃了吃了',
      '温馨提示：空腹饮食需谨慎，建议合理安排膳食结构。',
    ],
    answer: 1,
    tell: '真人一般不复述文章，只接住「跟自己有关」的那句。',
    explain: '妈那句是在点名，「我」先喊冤再顺带认怂，省略号加口语才是群里真实反应。另外两句把群聊当公告栏，是典型的转发/客服腔。',
  },
  {
    id: 'f2', group: 0, groupName: GROUPS[0].name, scene: GROUPS[0].scene,
    messages: [
      { name: '二姑', text: '我同事家闺女，93的，在银行，照片发群里了' },
      { name: '二姑', text: '@我 你啥时候回来，见一面' },
      { name: '爸', text: '他忙' },
      { name: '妈', text: '周末有空' },
    ],
    prompt: '「我」接下来最可能回哪句？',
    options: [
      '…这周真加班，下周再说吧',
      '谢谢二姑关心，我会妥善安排时间，届时与您联系。',
      '好的，已收到相亲对象信息，我将尽快反馈。',
    ],
    answer: 0,
    tell: '面对不想接的话题，真人往往只给一个短推脱，不解释太多。',
    explain: '「…」开头的拖延 + 不提相亲对象，是回避式真人回复。后两句用「届时」「尽快反馈」，把家事写成了工单。',
  },
  {
    id: 'f3', group: 0, groupName: GROUPS[0].name, scene: GROUPS[0].scene,
    messages: [
      { name: '爸', text: '[微信红包] 大家过年好' },
      { name: '表弟', text: '谢谢姑父！手气不错' },
      { name: '三姨', text: '我没抢到…再发一个' },
      { name: '妈', text: '他发的是最小的那个' },
    ],
    prompt: '群里最可能接着出现哪句？',
    options: [
      '恭喜发财，红包已领取，感谢长辈的新春祝福。',
      '祝您新春快乐，万事如意阖家安康。',
      '爸你这也太抠了哈哈哈哈 再来一个',
    ],
    answer: 2,
    tell: '红包场景里，真人爱起哄，而且会顺着上一句「最小的那个」接。',
    explain: '「哈哈哈哈」+ 直接吐槽长辈，是熟人关系的特权。前两句像群发拜年模板，没人会在家族群里这么说话。',
  },
  {
    id: 'f4', group: 0, groupName: GROUPS[0].name, scene: GROUPS[0].scene,
    messages: [
      { name: '三姨', text: '晚上11点到1点是肝排毒，必须睡着！' },
      { name: '妈', text: '@我 听见没' },
      { name: '表弟', text: '我天天两点睡也没事啊' },
    ],
    prompt: '「我」接下来最可能回哪句？',
    options: [
      '从医学角度看，肝脏代谢并不严格遵循固定时段。',
      '听见了听见了…你们先睡',
      '建议保持规律作息，避免熬夜对身体造成负担。',
    ],
    answer: 1,
    tell: '被点名时，真人先敷衍应一声，而不是科普。',
    explain: '「听见了听见了」是典型的应付式重复。另两句一句像科普博主、一句像健康 App 推送，都不带情绪。',
  },
  {
    id: 'f5', group: 0, groupName: GROUPS[0].name, scene: GROUPS[0].scene,
    messages: [
      { name: '大伯', text: '@我 现在在哪儿上班来着？' },
      { name: '大伯', text: '一个月能挣多少啊' },
      { name: '妈', text: '孩子在外面挺辛苦的' },
      { name: '爸', text: '[表情]' },
    ],
    prompt: '「我」接下来最可能回哪句？',
    options: [
      '就那样吧 妈你别说了😅',
      '目前就职于一家互联网企业，薪资水平属于行业中位数。',
      '感谢关心，具体收入属于个人隐私，不便透露，谢谢理解。',
    ],
    answer: 0,
    tell: '尴尬话题下，真人会求「自己人」 stop，而不是回答提问者。',
    explain: '回的是妈那句、不是大伯那句，还带个😅——这种"错位接话"是群聊最真实的特征。后两句一本正经地回答了工资，反而假。',
  },
  {
    id: 'f6', group: 0, groupName: GROUPS[0].name, scene: GROUPS[0].scene,
    messages: [
      { name: '三姨', text: '紧急通知！不转不是中国人！！' },
      { name: '三姨', text: '赶紧发给10个群' },
      { name: '妈', text: '你三姨又来了' },
      { name: '表妹', text: '……' },
    ],
    prompt: '「我」接下来最可能回哪句？',
    options: [
      '已转发至相关群组，请放心。',
      '该信息缺乏权威来源，建议谨慎甄别后再传播。',
      '这个我上次辟过谣了…算了不说了',
    ],
    answer: 2,
    tell: '真人在家族群里常常「想说又懒得说」。',
    explain: '「算了不说了」这种半截话，只有知道说了也没用的人才会打。另两句一个像机器人执行指令，一个像平台辟谣公告。',
  },
  {
    id: 'f7', group: 0, groupName: GROUPS[0].name, scene: GROUPS[0].scene,
    messages: [
      { name: '妈', text: '客厅空调不制冷了 谁认识修空调的' },
      { name: '爸', text: '我问问楼下' },
      { name: '表弟', text: '上次那个师傅微信我还有' },
    ],
    prompt: '「我」接下来最可能回哪句？',
    options: [
      '好的，我已记录该维修需求，稍后会联系相关人员。',
      '先别找了 我周末回来自己看看',
      '建议优先联系官方售后，以保障维修质量与服务权益。',
    ],
    answer: 1,
    tell: '家里人说话会直接打断别人的安排，不用先致谢。',
    explain: '「先别找了」直接推翻前面两个人的方案，语气短、没主语，是自家人的说话方式。另两句像客服工单和售后话术。',
  },
  {
    id: 'f8', group: 0, groupName: GROUPS[0].name, scene: GROUPS[0].scene,
    messages: [
      { name: '妈', text: '明天降温 都多穿点' },
      { name: '妈', text: '[图片] 天气预报' },
      { name: '爸', text: '知道了' },
    ],
    prompt: '「我」接下来最可能回哪句？',
    options: [
      '哦 我那件厚外套还在家吗',
      '收到，感谢提醒，我会注意添衣保暖。',
      '气温下降请注意防寒，避免感冒影响工作与生活。',
    ],
    answer: 0,
    tell: '真人会把「提醒」立刻转成自己的一个具体小事。',
    explain: '不回应"多穿点"，反而问外套在哪——话题被轻轻带跑，这才是家人群。后两句是标准通知回复。',
  },

  // ---------- 组 1：摸鱼同事群 ----------
  {
    id: 'w1', group: 1, groupName: GROUPS[1].name, scene: GROUPS[1].scene,
    messages: [
      { name: '王总', text: '在吗' },
      { name: '王总', text: '刚才那个数再对一下' },
      { name: '小李', text: '……' },
      { name: '阿珍', text: '我刚关电脑了' },
    ],
    prompt: '群里最可能接着出现哪句？',
    options: [
      '收到，我马上核对数据，稍后向您同步结果。',
      '您好，我这边已收到，将在十分钟内完成复核。',
      '在的 哪个数…我看看😂',
    ],
    answer: 2,
    tell: '深夜被老板点名，真人先认怂，但会带点无奈的语气。',
    explain: '「哪个数」说明根本没看清是哪个数，还硬着头皮接了，😂 是给自己台阶。前两句太标准，像设了自动回复。',
  },
  {
    id: 'w2', group: 1, groupName: GROUPS[1].name, scene: GROUPS[1].scene,
    messages: [
      { name: 'HR 娜娜', text: '本周五下班后团建，地点定了～' },
      { name: 'HR 娜娜', text: '大家尽量都来哦' },
      { name: '小李', text: '又是周五…' },
    ],
    prompt: '群里最可能接着出现哪句？',
    options: [
      '能不去吗 我周五要接孩子',
      '感谢组织，我会尽量协调时间积极参与本次团建活动。',
      '温馨提示：请各位同事于周四前完成报名确认。',
    ],
    answer: 0,
    tell: '同事群里真人是会讨价还价的，而且理由很具体。',
    explain: '「接孩子」这种具体到不能再具体的私人理由，才是真人的推脱方式。另两句是 HR 自己会发的话。',
  },
  {
    id: 'w3', group: 1, groupName: GROUPS[1].name, scene: GROUPS[1].scene,
    messages: [
      { name: '财务', text: '@全体 上月报销今天截止' },
      { name: '阿珍', text: '我那张餐饮的被打回来了' },
      { name: '小李', text: '说是没写事由' },
    ],
    prompt: '阿珍接下来最可能回哪句？',
    options: [
      '好的，我将按要求补充事由后重新提交，谢谢提醒。',
      '我都写了啊…「团队聚餐」不算事由吗',
      '建议后续在提交前仔细核对填写规范，避免重复退回。',
    ],
    answer: 1,
    tell: '真人被驳回时第一反应是喊冤，而且会引用自己写过的原话。',
    explain: '引用「团队聚餐」并加问号，是带着情绪的具体反驳。另两句一句是服从、一句是复盘总结，都不是当下反应。',
  },
  {
    id: 'w4', group: 1, groupName: GROUPS[1].name, scene: GROUPS[1].scene,
    messages: [
      { name: '产品', text: '那个按钮还是改回上一版吧' },
      { name: '产品', text: '客户说看着不习惯' },
      { name: '我', text: '……' },
      { name: '小李', text: '我代码刚合了' },
    ],
    prompt: '「我」接下来最可能回哪句？',
    options: [
      '收到需求变更，我会评估影响范围并重新排期。',
      '理解客户诉求，我们后续会持续优化交互体验。',
      '啊？？？我刚提的测呢',
    ],
    answer: 2,
    tell: '连续问号 + 半截话，是开发看到需求回滚的真实反应。',
    explain: '「测呢」两个字省略了整句，但同组的人都懂。另两句是周报语言，不会出现在需求刚变的当下。',
  },
  {
    id: 'w5', group: 1, groupName: GROUPS[1].name, scene: GROUPS[1].scene,
    messages: [
      { name: '王总', text: '@全体成员 周报今晚前发我' },
      { name: '阿珍', text: '收到' },
      { name: '小李', text: '收到' },
      { name: '我', text: '' },
    ],
    prompt: '「我」接下来最可能发哪句？',
    options: [
      '1',
      '已收到通知，将按时提交本周工作总结。',
      '好的，我会准时完成周报并发送至您的邮箱。',
    ],
    answer: 0,
    tell: '群里已经有两个人「收到」了，第三个人通常不会再打一遍完整的。',
    explain: '跟一个「1」是工位默契：既算签到又不占屏幕。这种极简回复几乎不可能由模板生成。',
  },
  {
    id: 'w6', group: 1, groupName: GROUPS[1].name, scene: GROUPS[1].scene,
    messages: [
      { name: '小李', text: '我 last day 是这周五…' },
      { name: '阿珍', text: '啊？这么突然' },
      { name: '王总', text: '感谢小李这段时间的付出，祝前程似锦' },
    ],
    prompt: '群里最可能接着出现哪句？',
    options: [
      '感谢你一直以来的协作与支持，祝未来一切顺利！',
      '晚上聚一下吧 我订位子',
      '祝愿你在新的工作岗位上取得更好的成绩。',
    ],
    answer: 1,
    tell: '离职消息后，真人第一反应是「约饭」，不是颁奖词。',
    explain: '「我订位子」直接把话题拉到具体行动。另外两句是领导/贺卡口吻，群里看到会觉得像复制的。',
  },
  {
    id: 'w7', group: 1, groupName: GROUPS[1].name, scene: GROUPS[1].scene,
    messages: [
      { name: '销售', text: '客户临时要个方案，明早九点' },
      { name: '销售', text: '能不能搞…' },
      { name: '小李', text: '我这边还有个 bug 没修' },
      { name: '阿珍', text: '模板还在吗' },
    ],
    prompt: '「我」接下来最可能回哪句？',
    options: [
      '好的，我们会全力配合，确保按时交付方案。',
      '明白，我先梳理一下需求范围再给您答复。',
      '……行吧 谁陪我熬',
    ],
    answer: 2,
    tell: '不情愿但接了，还要拉个人一起，这是同事群。',
    explain: '「谁陪我熬」把任务变成了找同伴，带省略号和认命感。前两句是标准对外承诺，不会发在内部群。',
  },
  {
    id: 'w8', group: 1, groupName: GROUPS[1].name, scene: GROUPS[1].scene,
    messages: [
      { name: '阿珍', text: '拼奶茶吗 三点那波' },
      { name: '小李', text: '我要 少冰' },
      { name: '我', text: '' },
      { name: '王总', text: '顺便帮我带一杯，谢谢' },
    ],
    prompt: '「我」接下来最可能发哪句？',
    options: [
      '+1 无糖',
      '好的，我已登记您的饮品需求，稍后统一提交订单。',
      '收到，我会在下单时统一备注各位的口味偏好。',
    ],
    answer: 0,
    tell: '接龙场景里，真人只补自己的那一条信息。',
    explain: '「+1」是群接龙的最小单位。后两句把拼单写成了工单系统，尤其「统一备注」不像人话。',
  },

  // ---------- 组 2：四年二班 ----------
  {
    id: 'c1', group: 2, groupName: GROUPS[2].name, scene: GROUPS[2].scene,
    messages: [
      { name: '大壮', text: '周六聚一下？' },
      { name: '班长', text: '老地方？' },
      { name: '小敏', text: '我可能晚点到' },
      { name: '大壮', text: '几点都行 你们定' },
    ],
    prompt: '群里最可能接着出现哪句？',
    options: [
      '七点吧 别又拖到九点…',
      '建议大家提前确认时间，以便统一安排。',
      '好的，那我先统计一下参与人数和可到场时间。',
    ],
    answer: 0,
    tell: '老同学群里会翻旧账，还带点吐槽。',
    explain: '「别又拖到九点」是在说上一次的事，只有共同经历的人才接得住。另两句像会议纪要。',
  },
  {
    id: 'c2', group: 2, groupName: GROUPS[2].name, scene: GROUPS[2].scene,
    messages: [
      { name: '小敏', text: '凑满减 还差一个人' },
      { name: '大壮', text: '我来' },
      { name: '班长', text: '我要一杯芋泥的' },
    ],
    prompt: '群里最可能接着出现哪句？',
    options: [
      '感谢参与，本次拼单已达到优惠门槛。',
      '我已记录您的口味，将合并下单。',
      '……我也要芋泥 换我换我',
    ],
    answer: 2,
    tell: '真人会临时改主意，而且话说得乱、带重复。',
    explain: '「换我换我」是抢名额，前面还先反悔了一下。另两句是拼单机器人的播报。',
  },
  {
    id: 'c3', group: 2, groupName: GROUPS[2].name, scene: GROUPS[2].scene,
    messages: [
      { name: '大壮', text: '晚上开黑 缺一个' },
      { name: '班长', text: '我十点半才能上' },
      { name: '小敏', text: '我观战' },
    ],
    prompt: '群里最可能接着出现哪句？',
    options: [
      '好的，我会在十点半准时上线参与。',
      '那先打两把匹配等我 别掉段',
      '收到，队伍满员后我将通知各位开始游戏。',
    ],
    answer: 1,
    tell: '真人会顺手给安排，还会顺手吐槽一下队友。',
    explain: '先给替代方案、再补一句「别掉段」，信息密度和语气都对。另两句像系统消息。',
  },
  {
    id: 'c4', group: 2, groupName: GROUPS[2].name, scene: GROUPS[2].scene,
    messages: [
      { name: '班长', text: '[图片][图片]' },
      { name: '班长', text: '领证了 🎉' },
      { name: '大壮', text: '卧槽' },
      { name: '小敏', text: '！！！' },
    ],
    prompt: '群里最可能接着出现哪句？',
    options: [
      '随礼先记账上啊 我人没到',
      '恭喜恭喜！祝二位新婚快乐，百年好合！',
      '衷心祝福你们，愿今后的日子幸福美满。',
    ],
    answer: 0,
    tell: '熟人第一时间开玩笑，且会接自己能不能到场。',
    explain: '前两个人已经用「卧槽」「！！！」把恭喜额度用完了，第三个人自然转到随礼这种实际问题。后两句是群发祝福模板。',
  },
  {
    id: 'c5', group: 2, groupName: GROUPS[2].name, scene: GROUPS[2].scene,
    messages: [
      { name: '小敏', text: '帮我投个票 第三个链接' },
      { name: '小敏', text: '一天能投三次 谢谢家人们' },
      { name: '大壮', text: '投了' },
    ],
    prompt: '群里最可能接着出现哪句？',
    options: [
      '已为您完成投票，祝取得好成绩。',
      '感谢您的支持，我会继续努力！',
      '又来…投了投了 明天的别忘了提醒我',
    ],
    answer: 2,
    tell: '熟人帮忙会先抱怨一句，但手还是点了。',
    explain: '「又来」说明这不是第一次，「投了投了」是重复确认，「明天的」是只有知道规则的人才提得出来。另两句是主办方话术。',
  },
  {
    id: 'c6', group: 2, groupName: GROUPS[2].name, scene: GROUPS[2].scene,
    messages: [
      { name: '陌生头像', text: '大家好呀～好久不见' },
      { name: '陌生头像', text: '我这边有个理财项目想跟大家分享下' },
      { name: '大壮', text: '？' },
    ],
    prompt: '群里最可能接着出现哪句？',
    options: [
      '班长 这谁拉进来的',
      '欢迎新同学，请先做一下自我介绍哦。',
      '温馨提示：涉及投资理财请务必提高风险防范意识。',
    ],
    answer: 0,
    tell: '真人不会去回应内容，而是直接质疑「谁拉进来的」。',
    explain: '一句话把矛头转向群管理，是同学在群里看到广告的标准反应。另两句分别像群机器人和平台提示。',
  },
  {
    id: 'c7', group: 2, groupName: GROUPS[2].name, scene: GROUPS[2].scene,
    messages: [
      { name: '大壮', text: '那家店关了？？' },
      { name: '班长', text: '上个月就没了' },
      { name: '小敏', text: '我还想着毕业十周年去那儿' },
    ],
    prompt: '群里最可能接着出现哪句？',
    options: [
      '唉…那换哪儿啊',
      '很遗憾听到这个消息，建议另行选择聚会地点。',
      '已记录该场地变更，后续将同步新的活动安排。',
    ],
    answer: 0,
    tell: '带情绪的叹气 + 顺势问下一句，才是同学群。',
    explain: '「唉」承接了小敏的惋惜，再自然转入下一个待办。后两句一个像客服、一个像通知。',
  },
  {
    id: 'c8', group: 2, groupName: GROUPS[2].name, scene: GROUPS[2].scene,
    messages: [
      { name: '小敏', text: '谁有咱高二那张合照' },
      { name: '大壮', text: '我翻翻' },
      { name: '班长', text: '我相册里应该还有' },
      { name: '小敏', text: '急用 做视频' },
    ],
    prompt: '群里最可能接着出现哪句？',
    options: [
      '收到，我会尽快查找并上传相关照片。',
      '建议大家在相册中按时间范围进行检索。',
      '找到了 但是糊得一批😂 你先凑合',
    ],
    answer: 2,
    tell: '真人交付东西时会先打个预防针。',
    explain: '「糊得一批」是对自己交付质量的调侃，只有真翻了相册的人说得出来。另两句是任务认领模板。',
  },
];

export function questionsOfGroup(group: number): Question[] {
  return QUESTIONS.filter(q => q.group === group);
}

export function findQuestion(id: string): Question | undefined {
  return QUESTIONS.find(q => q.id === id);
}

/** 每日乱斗：用当天日期做种子打乱整题库，抽 8 题跨组混合，解决固定 24 题玩完即耗尽 */
export function dailyQuestions(date = new Date()): Question[] {
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  let s = seed >>> 0;
  const rnd = (): number => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const arr = QUESTIONS.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr.slice(0, 8);
}

/** 「人味」特征标签：答题反馈里点明这题考的是哪种群聊语言习惯 */
export const HUMAN_TAGS: Record<string, string> = {
  f1: '只接跟自己有关的那半句', f2: '短推脱，不解释', f3: '顺着上文起哄', f4: '先敷衍应一声',
  f5: '错位接话，回的不是提问者', f6: '说一半又咽回去', f7: '直接推翻别人的安排', f8: '话题被轻轻带跑',
  w1: '认怂但带点无奈', w2: '具体到不能再具体的理由', w3: '引用原话喊冤', w4: '连续问号 + 半截话',
  w5: '接龙只补自己那条', w6: '把消息拉回具体行动', w7: '认命了还要拉个同伴', w8: '只补自己那一杯',
  c1: '翻旧账', c2: '临时改主意', c3: '顺手给安排顺手吐槽', c4: '恭喜额度用完了',
  c5: '先抱怨，手还是点了', c6: '不回应内容，直接质疑来源', c7: '先叹气再问下一句', c8: '交付前先打预防针',
};

export function humanTag(q: Question): string {
  return HUMAN_TAGS[q.id] || q.tell;
}
