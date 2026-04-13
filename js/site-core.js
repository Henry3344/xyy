        // === 核心逻辑 (V35.0: 文案优化 + 终极稳定版) ===
        const CHIP_DEFAULT_SHOW = 4;
        let usageData = {};
        let pinnedUnits = JSON.parse(localStorage.getItem('pinned_units') || '[]');
        let chipHoldTimer = null;
        let chipLongPressSuppress = false;
        let pressTimer;
        let recognition = null;
        let practiceMode = 'translate';
        let dialogScript = [];
        let dialogStep = 0;
        let pronIdx = 0;
        let dailyPhraseIdx = 0;
        let currentDrillData = null;
        let drillTimerInterval = null;
        let drillRoundPhase = 'idle';
        const DRILL_SECONDS = 5;
        const SPEED_DRILL_SECONDS = 3;
        const DRILL_STREAK_KEY = 'drill_streak_v1';
        let drillMode = 'normal';
        let speedDrillSessionData = [];
        let ambushTimerId = null;
        let ambushOverlayActive = false;
        let ambushListenPhase = 'idle';
        let ambushCurrentPrompt = null;
        let ambushCountdownInterval = null;
        let ambushRoundSettled = false;
        let ambushVisibilityHooked = false;
        const AMBUSH_RESPONSE_SECONDS = 7;

        let aiState = { active: false, currentUnit: null, currentStep: 0, score: 0, total: 0, currentTargetEng: "", currentTargetCn: "", waitingForSpeech: false, silenceTimer: null, idleTimer: null, currentMode: 'translate', dialogCallback: null };
        /** 机器人提示气泡：滑动场景/导航条时的 touchstart 会冒泡到 document，若全部算「活动」则计时器永不触发 */
        const ROBOT_BUBBLE_IDLE_MS = 40000;

        // 搜索别名词典：用户可能输入的词 → 对应的 unitId 列表
        const SEARCH_ALIASES = {
            '邻居': ['u1'], '新邻居': ['u1'], '搬家': ['u1'], 'neighbor': ['u1'],
            '问路': ['u2'], '找路': ['u2'], '迷路': ['u2'], '导航': ['u2'], 'direction': ['u2'], 'where': ['u2'],
            '内急': ['u3'], '厕所': ['u3'], '上厕所': ['u3'], '尿急': ['u3'], 'toilet': ['u3'], 'bathroom': ['u3'],
            '银行': ['u4'], '开户': ['u4'], '存钱': ['u4'], '取钱': ['u4'], '汇款': ['u4'], 'bank': ['u4'],
            '结账': ['u5'], '付钱': ['u5'], '收银': ['u5'], '超市': ['u5'], 'checkout': ['u5'], 'pay': ['u5'],
            '点餐': ['u6'], '点菜': ['u6'], '吃饭': ['u6'], '餐厅': ['u6'], '忌口': ['u6'], 'order': ['u6'], 'food': ['u6'], 'restaurant': ['u6'],
            '聚餐': ['u7'], '买单': ['u7'], 'AA': ['u7'], '请客': ['u7'], '分摊': ['u7'], 'split': ['u7'], 'bill': ['u7'],
            '叙旧': ['u8'], '老朋友': ['u8'], '寒暄': ['u8'], '聊天': ['u8'], '咖啡': ['u8'], 'long time': ['u8'],
            '打车': ['u9'], '司机': ['u9'], 'uber': ['u9'], 'lyft': ['u9'], 'taxi': ['u9'], '出行': ['u9'], 'ride': ['u9'],
            '急救': ['u10'], '救命': ['u10'], '看医生': ['u10'], '警察': ['u10'], '救护车': ['u10'], '911': ['u10'], 'help': ['u10'], 'doctor': ['u10'],
            '翻译': ['u11'], '听不懂': ['u11'], '没听懂': ['u11'], '听不清': ['u11'], '重复': ['u11'], 'understand': ['u11'], 'repeat': ['u11'],
            '退货': ['u12'], '退款': ['u12'], '换货': ['u12'], '投诉': ['u12'], 'return': ['u12'], 'refund': ['u12'], 'exchange': ['u12'],
            '预约': ['u13'], '约时间': ['u13'], '挂号': ['u13'], '理发': ['u13'], '订位': ['u13'], 'appointment': ['u13'], 'book': ['u13'],
            '报修': ['u14'], '维修': ['u14'], '房东': ['u14'], '暖气': ['u14'], '漏水': ['u14'], '修理': ['u14'], 'repair': ['u14'], 'landlord': ['u14'],
            '取包裹': ['u15'], '快递': ['u15'], '邮局': ['u15'], '包裹': ['u15'], 'usps': ['u15'], 'package': ['u15'], 'post': ['u15'],
            '买药': ['u16'], '药店': ['u16'], '感冒': ['u16'], '头疼': ['u16'], '发烧': ['u16'], 'pharmacy': ['u16'], 'medicine': ['u16'],
            '外卖': ['u6', 'u9'],
            '咖啡厅': ['u6', 'u8'],
            '看病': ['u10', 'u16'],
            '钱': ['u4', 'u5', 'u7'],
            '紧急': ['u3', 'u10']
        };

        // 扩充词库 (Unit -> Step -> [{e:英文, c:中文}])
        const extraVocab = {
            1: { 1: [{e:"your neighbor from 3B", c:"3B的邻居"}, {e:"new to this floor", c:"刚搬到这层"}, {e:"moving in next week", c:"下周搬进来"}, {e:"from apartment 202", c:"202室的"}, {e:"the guy across the hall", c:"走廊对面的"}, {e:"new neighbor", c:"新邻居"}, {e:"from 3B", c:"3B的住户"}, {e:"just moved in", c:"刚搬来的"}, {e:"living downstairs", c:"住楼下的"}, {e:"the new guy", c:"新来的那个"}], 2: [{e:"right next door", c:"就在隔壁"}, {e:"on the third floor", c:"在三楼"}, {e:"in the unit across", c:"对面单元"}, {e:"at the end of the hall", c:"走廊尽头"}, {e:"in the basement unit", c:"地下室单元"}, {e:"down the hall", c:"走廊尽头"}, {e:"upstairs", c:"楼上"}, {e:"next door", c:"隔壁"}, {e:"in unit 402", c:"402室"}, {e:"across the street", c:"马路对面"}] },
            2: { 1: [{e:"the nearest subway", c:"最近的地铁站"}, {e:"the parking lot", c:"停车场"}, {e:"the laundry room", c:"洗衣房"}, {e:"the leasing office", c:"租赁办公室"}, {e:"the trash room", c:"垃圾房"}, {e:"a pharmacy nearby", c:"附近的药店"}, {e:"the subway", c:"地铁站"}, {e:"the restroom", c:"洗手间"}, {e:"the exit", c:"出口"}, {e:"an elevator", c:"电梯"}, {e:"a pharmacy", c:"药房"}, {e:"the bus stop", c:"公交站"}], 2: [{e:"how far it is", c:"有多远"}, {e:"which elevator to take", c:"坐哪部电梯"}, {e:"if it's on this floor", c:"是否在这层"}, {e:"the fastest way there", c:"最快的路"}, {e:"where it is", c:"它在哪"}, {e:"which floor", c:"在几楼"}, {e:"the direction", c:"方向"}, {e:"how to get there", c:"怎么走"}] },
            3: { 1: [{e:"the restroom", c:"洗手间"}, {e:"a pen for a second", c:"笔"}, {e:"your umbrella", c:"雨伞"}, {e:"your phone for a minute", c:"手机"}, {e:"a napkin", c:"纸巾"}, {e:"scissors", c:"剪刀"}, {e:"phone charger", c:"充电器"}, {e:"wifi password", c:"WiFi密码"}, {e:"pen", c:"笔"}, {e:"lighter", c:"打火机"}, {e:"umbrella", c:"雨伞"}, {e:"power bank", c:"充电宝"}], 2: [{e:"won't take long", c:"不会太久的"}, {e:"a real emergency", c:"真的是紧急情况"}, {e:"just a second", c:"就一秒"}, {e:"very important", c:"非常重要"}, {e:"urgent", c:"紧急"}, {e:"an emergency", c:"急事"}, {e:"dying", c:"要没电了"}, {e:"running low", c:"电量低"}, {e:"important", c:"很重要"}] },
            4: { 1: [{e:"check my balance", c:"查余额"}, {e:"report a lost card", c:"挂失"}, {e:"set up direct deposit", c:"设置自动存款"}, {e:"close this account", c:"注销账户"}, {e:"apply for a credit card", c:"申请信用卡"}, {e:"deposit cash", c:"存现金"}, {e:"withdraw money", c:"取钱"}, {e:"transfer funds", c:"转账"}, {e:"open an account", c:"开户"}, {e:"change PIN", c:"改密码"}], 2: [{e:"Social Security card", c:"社会安全卡"}, {e:"utility bill", c:"水电账单"}, {e:"driver's license", c:"驾照"}, {e:"green card", c:"绿卡"}, {e:"lease agreement", c:"租约"}, {e:"ID card", c:"身份证"}, {e:"passport", c:"护照"}, {e:"debit card", c:"借记卡"}, {e:"check", c:"支票"}, {e:"account number", c:"账号"}] },
            5: { 1: [{e:"check", c:"支票"}, {e:"Zelle", c:"Zelle转账"}, {e:"Venmo", c:"Venmo"}, {e:"Samsung Pay", c:"Samsung Pay"}, {e:"Google Pay", c:"Google Pay"}, {e:"credit card", c:"信用卡"}, {e:"Apple Pay", c:"Apple Pay"}, {e:"cash", c:"现金"}, {e:"AliPay", c:"支付宝"}], 2: [{e:"price match", c:"价格匹配"}, {e:"a paper bag", c:"纸袋"}, {e:"senior discount", c:"老人折扣"}, {e:"store credit", c:"店内积分"}, {e:"a loyalty card", c:"会员卡"}, {e:"a receipt", c:"收据"}, {e:"a discount", c:"折扣"}, {e:"cash back", c:"返现"}, {e:"small change", c:"零钱"}, {e:"a bag", c:"袋子"}] },
            6: { 1: [{e:"the chicken sandwich", c:"鸡肉三明治"}, {e:"the soup of the day", c:"今日例汤"}, {e:"a side of fries", c:"一份薯条"}, {e:"the lunch special", c:"午市特价"}, {e:"a coffee to go", c:"外带咖啡"}, {e:"a kids' meal", c:"儿童套餐"}, {e:"tap water", c:"自来水"}, {e:"the menu", c:"菜单"}, {e:"napkins", c:"餐巾纸"}, {e:"a refill", c:"续杯"}, {e:"chopsticks", c:"筷子"}, {e:"a box", c:"打包盒"}], 2: [{e:"dairy", c:"奶制品"}, {e:"nuts", c:"坚果"}, {e:"gluten", c:"麸质"}, {e:"MSG", c:"味精"}, {e:"extra sauce", c:"额外酱汁"}, {e:"add sugar", c:"加糖"}, {e:"make it spicy", c:"加辣"}, {e:"add ice", c:"加冰"}, {e:"put cilantro", c:"放香菜"}, {e:"rush it", c:"快一点"}] },
            7: { 1: [{e:"order one more round", c:"再点一轮"}, {e:"ask for the check", c:"叫单"}, {e:"get takeout instead", c:"改成打包"}, {e:"try the dessert menu", c:"看看甜品"}, {e:"split the bill", c:"平摊"}, {e:"share the cost", c:"分担费用"}, {e:"go Dutch", c:"AA制"}, {e:"treat you", c:"请你"}], 2: [{e:"my boss", c:"我老板（报销）"}, {e:"him tonight", c:"他今晚请"}, {e:"her this time", c:"这次她请"}, {e:"the birthday person", c:"寿星（免单）"}, {e:"on me", c:"我请客"}, {e:"my treat", c:"我买单"}, {e:"my turn", c:"轮到我了"}, {e:"covered by me", c:"我包了"}] },
            8: { 1: [{e:"work going", c:"工作怎么样"}, {e:"the new job", c:"新工作怎样"}, {e:"the kids", c:"孩子们好吗"}, {e:"your mom doing", c:"你妈妈还好吗"}, {e:"married life", c:"婚后生活"}, {e:"no see", c:"没见"}, {e:"no talk", c:"没聊"}, {e:"since college", c:"大学后"}, {e:"since last year", c:"去年后"}], 2: [{e:"exchange numbers", c:"互换号码"}, {e:"meet up soon", c:"找时间见个面"}, {e:"add each other on WeChat", c:"加个微信"}, {e:"plan a trip together", c:"一起计划旅行"}, {e:"catch up", c:"叙叙旧"}, {e:"hang out", c:"聚聚"}, {e:"get coffee", c:"喝杯咖啡"}, {e:"keep in touch", c:"常联系"}] },
            9: { 1: [{e:"LaGuardia Airport", c:"拉瓜迪亚机场"}, {e:"Penn Station", c:"宾州车站"}, {e:"downtown Manhattan", c:"曼哈顿下城"}, {e:"Sunset Park", c:"日落公园"}, {e:"the nearest hospital", c:"最近的医院"}, {e:"this intersection", c:"这个路口"}, {e:"JFK airport", c:"JFK机场"}, {e:"Main Street", c:"Main街"}, {e:"the hotel", c:"酒店"}, {e:"this address", c:"这个地址"}], 2: [{e:"right in front of that building", c:"就在那栋楼前面"}, {e:"after the traffic light", c:"红绿灯过后"}, {e:"next to the fire hydrant", c:"消防栓旁边"}, {e:"wherever is easiest", c:"方便停就行"}, {e:"right here", c:"就在这"}, {e:"at the corner", c:"在路口"}, {e:"at the light", c:"在红绿灯"}, {e:"by the sign", c:"标志牌旁"}] },
            10: { 1: [{e:"first aid", c:"急救"}, {e:"an interpreter", c:"口译员"}, {e:"to call my family", c:"联系我家人"}, {e:"water", c:"水（紧急）"}, {e:"insulin", c:"胰岛素"}, {e:"a doctor", c:"医生"}, {e:"an ambulance", c:"救护车"}, {e:"painkillers", c:"止痛药"}, {e:"some ice", c:"冰块"}, {e:"help", c:"帮助"}], 2: [{e:"chest pain", c:"胸痛"}, {e:"bleeding", c:"出血了"}, {e:"an allergic reaction", c:"过敏反应"}, {e:"very nauseous", c:"很恶心"}, {e:"trouble walking", c:"走路有困难"}, {e:"dizzy", c:"头晕"}, {e:"nauseous", c:"恶心"}, {e:"feverish", c:"发烧"}, {e:"terrible", c:"很糟"}, {e:"weak", c:"虚弱"}] },
            11: { 1: [{e:"use simpler words", c:"用简单的词"}, {e:"type it out", c:"打出来给我看"}, {e:"use Google Translate", c:"用谷歌翻译"}, {e:"speak one word at a time", c:"一个词一个词说"}, {e:"point to what you mean", c:"指给我看"}, {e:"speak slowly", c:"说慢点"}, {e:"say that again", c:"再说一次"}, {e:"write it down", c:"写下来"}], 2: [{e:"follow what you're saying", c:"跟上你说的"}, {e:"speak English well", c:"英语说得好"}, {e:"read this", c:"看懂这个"}, {e:"catch your accent", c:"听懂你的口音"}, {e:"understand", c:"明白"}, {e:"hear you", c:"听清"}, {e:"get it", c:"懂"}, {e:"know that word", c:"懂那个词"}] },
            12: { 1: [{e:"speak to a manager", c:"找经理"}, {e:"get store credit", c:"换成购物积分"}, {e:"check the price again", c:"重新核对价格"}, {e:"return this online order", c:"退网购商品"}, {e:"file a complaint", c:"投诉"}, {e:"return this", c:"退这个"}, {e:"exchange this", c:"换这个"}, {e:"get a refund", c:"退款"}, {e:"speak to manager", c:"找经理"}], 2: [{e:"the wrong color", c:"颜色不对"}, {e:"damaged", c:"有损坏"}, {e:"missing parts", c:"缺配件"}, {e:"different from the photo", c:"和图片不一样"}, {e:"never used", c:"全新没用过"}, {e:"is broken", c:"坏了"}, {e:"is expired", c:"过期了"}, {e:"doesn't fit", c:"不合身"}, {e:"is the wrong color", c:"颜色错了"}] },
            13: { 1: [{e:"check availability", c:"查询空档"}, {e:"move my appointment up", c:"提前预约时间"}, {e:"book a haircut", c:"预约理发"}, {e:"schedule a viewing", c:"预约看房"}, {e:"set up a phone call", c:"约一个电话"}, {e:"book a table", c:"订位"}, {e:"make a reservation", c:"预约"}, {e:"cancel my appointment", c:"取消预约"}, {e:"reschedule", c:"改期"}], 2: [{e:"this Saturday morning", c:"这周六早上"}, {e:"anytime after 3 PM", c:"下午3点以后都可以"}, {e:"the earliest slot available", c:"最早的空档"}, {e:"the end of the month", c:"月底"}, {e:"7:00 PM", c:"晚上7点"}, {e:"noon", c:"中午"}, {e:"tomorrow morning", c:"明早"}, {e:"next Monday", c:"下周一"}] }
        };

        const CULTURE_BY_UNIT = {
            1: `• 美国人打招呼后不一定要继续聊，说完 "Nice to meet you" 对方转身离开是正常的，不是不礼貌。<br>• 不要问 "How much do you make?"（你赚多少钱）或 "How old are you?"，这两个问题在美国非常冒犯。<br>• 握手时要有力，软绵绵的握手会被认为没自信。`,
            2: `• 问路时说 "Excuse me" 开头是必须的，直接开口问会显得很突兀。<br>• 对方说 "You can't miss it"（你不会错过的）意思是"很好找"，不是客气话，是真的。<br>• 如果对方说 "I'm not from around here"，是在说自己也不熟悉，不是在拒绝你。`,
            3: `• 永远说 "restroom" 或 "bathroom"，不要说 "toilet"——在美国 toilet 专指马桶本身，当众说这个词会让对方尴尬。<br>• 餐厅的洗手间通常不需要问，直接找标志走就行，问反而显得奇怪。<br>• 借完东西一定要说 "Thank you so much"，比只说 "Thanks" 更诚恳。`,
            4: `• 美国银行柜员经常说 "How are you today?"，这是礼貌性开场，回答 "Fine, thanks" 就够，不需要真的描述你的状态。<br>• 填表时 "First Name" 是名，"Last Name" 是姓，顺序和中文相反，很多人填错。<br>• 说错了不用慌，直接说 "Sorry, let me redo that" 柜员会帮你重新处理。`,
            5: `• 收银员说 "Did you find everything okay?" 是礼貌性问候，不是真的在问你，回答 "Yes, thank you" 即可。<br>• 排队时要与前面的人保持至少一个购物车的距离，站太近会让人不舒服。<br>• 如果价格有误，直接说 "I think this rang up wrong"，不要不好意思，超市有义务核对。`,
            6: `• 服务员说完菜名后说 "Excellent choice!" 只是礼貌，不代表你点的真的很好。<br>• 吃饭中途服务员会来问 "How is everything?"，回答 "Great, thank you" 就够，不用详细描述。<br>• 想续杯（免费）说 "Can I get a refill?" 大部分美式餐厅饮料是可以免费续的。<br>• 打包剩菜是完全正常的事，说 "Can I get a box?" 或 "Can I get this to go?" 没有人会觉得奇怪。`,
            7: `• AA 制（split the bill）在美国朋友间非常普遍，不像国内会显得不够意思。<br>• 说 "It's on me" 后对方通常会说 "Are you sure?" 然后接受，这是正常流程，不是真的在质疑你。<br>• 小费通常是税后金额的 18-20%，直接给现金或在刷卡机上选，不给或给太少会被记住。`,
            8: `• "We should hang out sometime" 在美国很多时候只是礼貌性的结束语，不一定真的会约。如果你想真的见面，要直接给出具体时间："Are you free this Saturday?"<br>• "How are you?" 的标准回答是 "Good, you?" 不是真的在汇报你的健康状况。<br>• 互留联系方式时说 "Let me give you my number" 比问对方要号码更自然。`,
            9: `• Uber/Lyft 上车后不需要打招呼，直接确认目的地是正常的，司机也习惯了。<br>• 不要坐副驾驶，除非后排真的坐满了。<br>• 到达后说 "Thanks, have a good one" 然后直接下车，不需要长篇道别。<br>• 小费在 App 里给，不用给现金。`,
            10: `• 打 911 后保持电话接通，不要挂断，接线员会全程指导你。<br>• 说不清楚位置时，报出你能看到的最近的商店名字或街道交叉口。<br>• 如果是别人受伤，先说 "Someone needs help"，再描述情况，不要先描述再说需要帮助。`,
            11: `• 说 "Sorry, could you say that again?" 比 "What?" 礼貌得多，直接说 "What?" 在美国被认为有点粗鲁。<br>• 对方说慢了你还是不懂，可以说 "Could you write it down?" 大部分人都会配合。<br>• 不要假装听懂了点头，这会导致后续更大的误解。承认听不懂在美国是被尊重的诚实行为。`,
            12: `• 退货前先检查收据上的退货期限（return policy），一般是 30 天，过期就算态度再好也没用。<br>• 说 "I'd like to return this" 后对方第一句话一定是 "Do you have your receipt?"，提前把收据准备好。<br>• 如果没有收据，说 "I don't have the receipt, but I paid by credit card" 有时候可以查记录。<br>• 不满意服务可以说 "I'd like to speak with a manager"，这是完全正当的权利，不是找麻烦。`,
            13: `• 美国医生诊所一般需要提前数天甚至数周预约，不能直接去等，先打电话或网上预约。<br>• 预约时间到了必须准时，迟到超过 15 分钟很多诊所会直接取消预约。<br>• 取消预约要提前 24 小时通知，否则可能被收 no-show fee（缺席费）。`,
            14: `• 口头报修后要发短信或邮件跟进，留下文字记录，这在法律上对你有保护。<br>• 紧急问题（暖气、热水、漏水）房东必须在 24-48 小时内处理，这是法律规定。<br>• 说 "I'd like to document this in writing" 如果房东一直拖，这句话很有用。`,
            15: `• 取包裹需要带有照片的证件（驾照或护照），没有证件一定取不了。<br>• USPS 的工作人员态度参差不齐，遇到态度不好的保持礼貌，说完需求等就行。<br>• 如果包裹被退回，可以在 USPS 网站上填 "Package Intercept" 申请拦截重新投递。`,
            16: `• 非处方药（OTC）直接买，处方药（Prescription）必须有医生处方。<br>• 药剂师（Pharmacist）可以免费咨询，比去诊所快，感冒等小问题直接问药剂师。<br>• 买药时告知正在服用的其他药物，药剂师会帮你检查是否有冲突。<br>• 常见的通用名（generic）和品牌药成分完全相同但便宜很多，可以问 "Do you have a generic version?"`
        };

        const DAILY_REC_RULES = [
            [() => { const h = new Date().getHours(); return h >= 6 && h < 9; }, 'u9', '早高峰常打车：点横幅练「打车」说法'],
            [() => { const h = new Date().getHours(); return h >= 11 && h < 14; }, 'u6', '午饭外食多：点横幅练「点餐」模板句'],
            [() => { const h = new Date().getHours(); return h >= 11 && h < 14; }, 'u7', '和同事吃饭：点横幅练「聚餐买单」'],
            [() => { const h = new Date().getHours(); return h >= 14 && h < 18; }, 'u4', '下午跑银行：点横幅练「银行办事」'],
            [() => { const h = new Date().getHours(); return h >= 14 && h < 18; }, 'u12', '退换货窗口别拖：点横幅练「退货」'],
            [() => { const h = new Date().getHours(); return h >= 18 && h < 21; }, 'u7', '晚饭常聚餐：点横幅练「AA与小费」说法'],
            [() => { const h = new Date().getHours(); return h >= 18 && h < 21; }, 'u8', '夜场叙旧多：点横幅练「闲聊叙旧」'],
            [() => { const h = new Date().getHours(); return (h >= 21 || h < 6); }, 'u9', '深夜叫车回家：点横幅练「目的地」说法'],
            [() => new Date().getDay() === 1, 'u13', '周一约医生理发：点横幅练「预约」'],
            [() => new Date().getDay() === 5, 'u7', '周五易聚餐：点横幅练「买单与AA」'],
            [() => new Date().getDay() === 6, 'u5', '周六逛超市：点横幅练「结账」'],
            [() => new Date().getDay() === 0, 'u15', '周日取包裹：点横幅练「邮局取件」'],
            [() => [11, 0, 1].includes(new Date().getMonth()), 'u14', '天冷易报修：点横幅练「房东维修」'],
            [() => [5, 6, 7].includes(new Date().getMonth()), 'u16', '天热买常用药：点横幅练「药店」']
        ];

        /** 同一场景多条话术，刷新时随机一条，显得不那么死板 */
        const DAILY_REC_UNIT_VARIANTS = {
            u1: [
                { label: '✨ 今日推荐', text: '点横幅进「邻居」练见面打招呼' },
                { label: '👋 练一句', text: '新邻居不熟？先练 Hi 与自我介绍' },
                { label: '💡 小贴士', text: '见面开口不尬：跟「邻居」卡片念两句' },
            ],
            u9: [
                { label: '🚕 今日推荐', text: '打车先练：跟司机说清目的地与下车点' },
                { label: '🚕 小贴士', text: '网约车/招手都能用：点横幅进「打车」场景' },
                { label: '✨ 玩一练', text: '上车三句：去哪、顺路停、到了叫我' },
            ],
            u6: [
                { label: '🍔 今日推荐', text: '点横幅进「点餐」练要啥不要啥' },
                { label: '🍔 小贴士', text: '排队前默念：忌口、打包、加水怎么说' },
                { label: '💡 请注意', text: '午餐高峰别慌：模板在「点餐」场景里' },
            ],
            u7: [
                { label: '🍽️ 今日推荐', text: '聚餐先练：请客、AA、小费怎么说' },
                { label: '🥂 小贴士', text: '点横幅进「聚餐」看买单与分账英文' },
                { label: '✨ 玩一练', text: 'Split the bill 念顺：少一次社交尴尬' },
            ],
            u4: [
                { label: '🏦 今日推荐', text: '点横幅进「银行」练开户取钱关键词' },
                { label: '🏦 请注意', text: '窗口听力不够？先跟卡片过一遍' },
                { label: '💡 小贴士', text: '办卡取现说法：都在「银行」单元' },
            ],
            u12: [
                { label: '🛍️ 今日推荐', text: '退换货：点横幅进「退货」照句念' },
                { label: '↩️ 小贴士', text: '收据+理由怎么说：看「退货」模板' },
                { label: '⚡ 请注意', text: '柜台省时间：先练熟再开口' },
            ],
            u8: [
                { label: '👋 今日推荐', text: '点横幅进「叙旧」练久别重逢怎么说' },
                { label: '☕ 小贴士', text: 'catch up、近况问答：模板在场景里' },
                { label: '✨ 玩一练', text: '久别怎么接话：跟「叙旧」模板念' },
            ],
            u13: [
                { label: '📅 今日推荐', text: '点横幅进「预约」练时间医生理发' },
                { label: '📅 请注意', text: 'make an appointment 这周约起来' },
                { label: '💡 小贴士', text: '改期取消怎么说：同场景可查' },
            ],
            u5: [
                { label: '🛒 今日推荐', text: '点横幅进「结账」练自助台与小票' },
                { label: '🧾 小贴士', text: '刷卡现金收据：跟「结账」卡片念' },
                { label: '✨ 玩一练', text: '买菜顺路练一句：结账少卡壳' },
            ],
            u15: [
                { label: '📦 今日推荐', text: '点横幅进「邮局」练取件带证件说法' },
                { label: '📦 小贴士', text: 'tracking number 怎么说：场景里有' },
                { label: '💡 请注意', text: '取件先练两句：柜台更快' },
            ],
            u14: [
                { label: '🔧 今日推荐', text: '点横幅进「报修」练暖气漏水怎么说' },
                { label: '🏠 请注意', text: '房东维修关键词：跟场景念一遍' },
                { label: '⚡ 小贴士', text: '紧急报修句子：单元里可直接用' },
            ],
            u16: [
                { label: '💊 今日推荐', text: '点横幅进「药店」练非处方药怎么说' },
                { label: '💊 小贴士', text: '问药剂师过敏与剂量：模板在场景' },
                { label: '✨ 玩一练', text: '先问再买：比瞎买药安心' },
            ],
        };

        function shuffleBannerArray(arr) {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        }

        /** 时段场景推荐条尽量不连续出现（避免同屏连刷同一条） */
        function shuffleBannerNoAdjacentDailyScene(slides) {
            if (!slides || slides.length < 2) return;
            const isDaily = s => s && s._bannerKind === 'dailyScene';
            const daily = slides.filter(isDaily);
            const rest = slides.filter(s => !isDaily(s));
            if (daily.length <= 1) {
                shuffleBannerArray(slides);
                return;
            }
            const feasible = daily.length <= rest.length + 1;
            if (feasible) {
                for (let t = 0; t < 160; t++) {
                    shuffleBannerArray(slides);
                    let ok = true;
                    for (let i = 1; i < slides.length; i++) {
                        if (isDaily(slides[i]) && isDaily(slides[i - 1])) {
                            ok = false;
                            break;
                        }
                    }
                    if (ok) return;
                }
                const rsh = shuffleBannerArray([...rest]);
                const out = [];
                let di = 0;
                let ri = 0;
                while (di < daily.length && ri < rsh.length) {
                    out.push(daily[di++]);
                    out.push(rsh[ri++]);
                }
                while (ri < rsh.length) out.push(rsh[ri++]);
                while (di < daily.length) out.push(daily[di++]);
                slides.length = 0;
                out.forEach(x => slides.push(x));
                return;
            }
            shuffleBannerArray(slides);
        }

        let __dailyBannerSlides = [];
        let __dailyBannerIndex = 0;
        let __dailyBannerTimer = null;

        function applyDailyBannerSlide(index) {
            const slides = __dailyBannerSlides;
            if (!slides || !slides.length) return;
            const s = slides[index % slides.length];
            const labelEl = document.getElementById('dailyRecLabel');
            const textEl = document.getElementById('dailyRecText');
            const mid = document.getElementById('dailyRecMid');
            const bar = document.getElementById('dailyRec');
            if (!labelEl || !textEl || !mid || !bar || !s) return;
            mid.classList.remove('daily-rec-mid--anim');
            void mid.offsetWidth;
            mid.classList.add('daily-rec-mid--anim');
            labelEl.textContent = s.label;
            textEl.textContent = s.text;
            bar.onclick = () => {
                triggerHaptic();
                s.action();
            };
        }

        function advanceDailyBanner() {
            if (!__dailyBannerSlides.length) return;
            __dailyBannerIndex = (__dailyBannerIndex + 1) % __dailyBannerSlides.length;
            applyDailyBannerSlide(__dailyBannerIndex);
        }

        function getBannerFeatureActions() {
            return {
                phone: () => { openToolbox(); switchTool(8); },
                tutorial: () => openUsageTutorial(),
                listenflow: () => { openToolbox(); switchTool(7); },
                backup: () => { openToolbox(); switchTool(9); },
                drill: () => startRandomDrill(),
                ai: () => {
                    toggleChat();
                    const body = document.getElementById('chatBody');
                    if (body && body.innerHTML.trim() === '') startAiSession();
                },
                emergency: () => toggleEmergency(),
                pron: () => { openToolbox(); switchTool(6); },
                search: () => document.getElementById('searchBox')?.focus(),
                stats: () => { openToolbox(); switchTool(3); },
                convert: () => { openToolbox(); switchTool(1); },
                tip: () => { openToolbox(); switchTool(2); },
                cheat: () => { openToolbox(); switchTool(0); },
                emgList: () => { openToolbox(); switchTool(4); },
                life: () => { openToolbox(); switchTool(5); },
            };
        }

        function buildBannerFeatureSlidesFromPool() {
            const V = window.BANNER_FEATURE_VARIANTS;
            if (!V) return [];
            const keys = Object.keys(V);
            shuffleBannerArray(keys);
            const out = [];
            const act = getBannerFeatureActions();
            keys.forEach(k => {
                const pool = V[k];
                const fn = act[k];
                if (!pool || !pool.length || !fn) return;
                const v = pool[Math.floor(Math.random() * pool.length)];
                out.push({ label: v.label, text: v.text, action: fn });
            });
            return out;
        }

        const DRILL_QUESTIONS = {
            1: [
                { cn: '嗨，我是你的新邻居，我住在302室。', en: 'Hi, I\'m your new neighbor. I live in Apt 302.', replies: ['Nice to meet you!', 'Welcome to the building!'] },
                { cn: '你好，我是刚搬进来的，住在这栋楼。', en: 'Hi, I\'m moving in. I live in this building.', replies: ['Welcome!', 'Good to meet you.'] },
            ],
            2: [
                { cn: '打扰一下，我在找收发室，能告诉我怎么走吗？', en: 'Excuse me, I\'m looking for the mailroom. Could you tell me where it is?', replies: ['Sure! It\'s right down the hall.', 'Sorry, I\'m not sure.'] },
                { cn: '打扰一下，电梯在哪里？', en: 'Excuse me, I\'m looking for the elevator. Could you tell me which way?', replies: ['It\'s around the corner.', 'Take a left.'] },
            ],
            3: [
                { cn: '你好，我能借用一下你的洗手间吗？真的很紧急。', en: 'Sorry to bother you, could I use your restroom? It\'s really urgent.', replies: ['Of course, go ahead!', 'Sorry, it\'s occupied right now.'] },
                { cn: '您好，能借用一下您的充电器吗？', en: 'Hi, could I use your charger? My phone is dying.', replies: ['Sure, no problem!', 'Sorry, I don\'t have one.'] },
            ],
            4: [
                { cn: '我想开一个账户，这是我的护照。', en: 'I\'d like to open an account. Here is my passport.', replies: ['Can I see your ID?', 'Please fill out this form.'] },
                { cn: '我想取钱，这是我的借记卡。', en: 'I\'d like to withdraw cash. Here is my debit card.', replies: ['How much would you like?', 'Please enter your PIN.'] },
            ],
            5: [
                { cn: '我想用信用卡支付，你们有收据吗？', en: 'I\'d like to pay by credit card. Do you offer a receipt?', replies: ['Credit or debit?', 'Do you have a rewards card?'] },
                { cn: '我想用Apple Pay，你们提供折扣吗？', en: 'I\'d like to pay by Apple Pay. Do you offer discounts?', replies: ['Yes, tap here!', 'No, sorry.'] },
            ],
            6: [
                { cn: '我想要一个汉堡，请不要洋葱。', en: 'I\'d like a burger. No onions please.', replies: ['How would you like that cooked?', 'Any allergies?'] },
                { cn: '我想要一份沙拉，请不要香菜。', en: 'I\'d like a salad. No cilantro please.', replies: ['Great choice!', 'Any dressing preference?'] },
            ],
            7: [
                { cn: '咱们AA制吧。', en: 'Let\'s split the bill.', replies: ['Sure, sounds good!', 'Actually, it\'s on me tonight!'] },
                { cn: '今晚我请客，不用AA了。', en: 'No need to split. It\'s on me tonight.', replies: ['Are you sure?', 'Thank you so much!'] },
            ],
            8: [
                { cn: '好久不见！工作怎么样？我们找时间喝杯咖啡吧。', en: 'Long time no see! How\'s work? We should grab coffee sometime.', replies: ['Great to see you!', 'Yes, let\'s plan something!'] },
                { cn: '好久不见！家人都好吗？', en: 'Long time no see! How\'s your family?', replies: ['They\'re great, thanks!', 'Good to hear from you!'] },
            ],
            9: [
                { cn: '我要去法拉盛，就在路口下。', en: 'I\'m going to Flushing. Drop me off at the corner.', replies: ['Got it.', 'That\'ll be about 20 minutes.'] },
                { cn: '我要去JFK机场，请在酒店门口下。', en: 'I\'m going to JFK Airport. Drop me off in front of the hotel.', replies: ['Sure thing.', 'Which terminal?'] },
            ],
            10: [
                { cn: '救命！我需要救护车，我无法呼吸！', en: 'Help! I need an ambulance. I can\'t breathe!', replies: ['Stay calm, help is on the way.', 'Can you describe the pain?'] },
                { cn: '我需要医生，我头晕。', en: 'I need a doctor. I feel dizzy.', replies: ['Let\'s get you checked.', 'Sit down, I\'ll call for help.'] },
            ],
            11: [
                { cn: '抱歉，我英语说得不好，能再说一遍吗？', en: 'Sorry, I don\'t speak English well. Could you say that again?', replies: ['Of course!', 'Sure, let me slow down.'] },
                { cn: '能写下来给我看吗？', en: 'Could you write it down?', replies: ['Sure, here you go.', 'No problem!'] },
            ],
            12: [
                { cn: '我想退这个，它坏了。', en: 'I\'d like to return this. It\'s broken.', replies: ['Do you have your receipt?', 'I\'ll get the manager.'] },
                { cn: '我想换货，尺码不对。', en: 'I\'d like to exchange this. It\'s the wrong size.', replies: ['What size do you need?', 'Let me check the stock.'] },
            ],
            13: [
                { cn: '我想预约，在下午2点可以吗？', en: 'I\'d like to make an appointment. At 2 PM, please.', replies: ['We have an opening then.', 'Let me check availability.'] },
                { cn: '我想改期，改到下周一可以吗？', en: 'I\'d like to reschedule. Next Monday please.', replies: ['Of course, what time works?', 'I\'ll put you down for then.'] },
            ],
            14: [
                { cn: '你好，暖气有问题，已经三天了，能派人来修吗？', en: 'Hi, there\'s a problem with the heating. It\'s been 3 days. Can you send someone?', replies: ['I\'ll send someone today.', 'Can you send a photo?'] },
                { cn: '水龙头漏水，已经一周了。', en: 'There\'s a problem with a leaky faucet. It\'s been more than a week.', replies: ['We\'ll fix it ASAP.', 'Is it an emergency?'] },
            ],
            15: [
                { cn: '你好，我来取一个包裹，单号在手机上，能让我给您看吗？', en: 'Hi, I\'m here to pick up a package. My tracking number is on my phone, can I show you?', replies: ['Sign here please.', 'Wait in line over there.'] },
                { cn: '我来取一封挂号信。', en: 'I\'m here to pick up a registered letter.', replies: ['ID please.', 'One moment.'] },
            ],
            16: [
                { cn: '我需要治头疼的药，这是不嗜睡的吗？', en: 'I need something for a headache. Is this non-drowsy?', replies: ['Yes, this one is popular.', 'Ask the pharmacist.'] },
                { cn: '我需要治感冒的药，有仿制药吗？', en: 'I need something for a cold. Do you have a generic version?', replies: ['Yes, it\'s right here.', 'Let me check.'] },
            ],
        };

        /** 不定时对话突袭题库：中文情境 + 对方英文问句 + 接话关键词（与场景卡片能力对应） */
        const AMBUSH_PROMPTS = [
            { uid: 1, situationCn: '你在楼道里见到新邻居：要主动打招呼并介绍自己。', botEn: 'Hi! I don\'t think we\'ve met. Which apartment are you in?', botCn: '嗨，我们好像没见过。你住哪一户？', userHints: ['live', 'apartment', 'apt', 'new', 'neighbor', 'floor', 'moved', '302', 'building'], sample: 'Hi! I just moved in. I live in Apt 302.' },
            { uid: 1, situationCn: '邻居问你从哪来，你想简单寒暄。', botEn: 'Nice to meet you! Where are you from originally?', botCn: '很高兴认识你！你老家是哪里的？', userHints: ['china', 'from', 'nice', 'meet', 'new', 'york', 'here'], sample: 'Nice to meet you too. I\'m from China, new to the city.' },
            { uid: 2, situationCn: '你在楼里迷路了，需要向路人问电梯或收发室怎么走。', botEn: 'Excuse me, do you know where the mailroom is?', botCn: '打扰一下，你知道收发室在哪吗？', userHints: ['yes', 'down', 'hall', 'left', 'right', 'corner', 'floor', 'there'], sample: 'Yes, it\'s down the hall, on the left.' },
            { uid: 2, situationCn: '你在户外问路，对方问你找什么地方。', botEn: 'Are you looking for the subway station?', botCn: '你在找地铁站吗？', userHints: ['yes', 'looking', 'station', 'subway', 'nearest', 'trying', 'find'], sample: 'Yes, I\'m looking for the nearest subway station.' },
            { uid: 3, situationCn: '你急需上洗手间，需要礼貌向住户开口。', botEn: 'Sorry to bother you — is your restroom available?', botCn: '抱歉打扰，你家洗手间现在方便用吗？', userHints: ['sorry', 'use', 'restroom', 'bathroom', 'urgent', 'minute', 'please', 'emergency'], sample: 'Sorry to bother you. Could I use your restroom? It\'s urgent.' },
            { uid: 4, situationCn: '你走进银行柜台，柜员问你办什么业务。', botEn: 'Good morning! How can I help you today?', botCn: '早上好，今天需要什么服务？', userHints: ['open', 'account', 'withdraw', 'deposit', 'cash', 'transfer', 'like', 'want'], sample: 'I\'d like to open an account, please.' },
            { uid: 4, situationCn: '柜员请你出示证件。', botEn: 'May I see your ID, please?', botCn: '能看一下您的证件吗？', userHints: ['yes', 'here', 'passport', 'license', 'sure', 'card'], sample: 'Yes, here is my passport.' },
            { uid: 5, situationCn: '你在超市结账，收银员问你找齐东西没有。', botEn: 'Did you find everything okay today?', botCn: '今天东西都找齐了吗？', userHints: ['yes', 'thank', 'found', 'everything', 'fine'], sample: 'Yes, thank you. I found everything.' },
            { uid: 6, situationCn: '你在餐厅坐下，服务员来点餐。', botEn: 'Hi! Are you ready to order?', botCn: '准备好点餐了吗？', userHints: ['yes', 'order', 'like', 'burger', 'coffee', 'water', 'please', 'ready'], sample: 'Yes, I\'d like the chicken sandwich, please.' },
            { uid: 6, situationCn: '服务员问你有没有过敏。', botEn: 'Any allergies or dietary restrictions?', botCn: '有过敏或饮食禁忌吗？', userHints: ['no', 'nuts', 'dairy', 'allergy', 'gluten', 'not'], sample: 'No nuts, please. That\'s it.' },
            { uid: 7, situationCn: '聚餐结束，朋友说大家分摊账单。', botEn: 'Should we split the bill?', botCn: '咱们要分摊账单吗？', userHints: ['yes', 'split', 'card', 'cash', 'separate', 'check'], sample: 'Yes, let\'s split the bill.' },
            { uid: 8, situationCn: '你遇到老朋友，对方寒暄问你近况。', botEn: 'Long time no see! How\'s work going?', botCn: '好久不见！工作怎么样？', userHints: ['good', 'busy', 'fine', 'great', 'new', 'job', 'same'], sample: 'It\'s going well, pretty busy lately.' },
            { uid: 9, situationCn: '你上了网约车，司机问你去哪儿。', botEn: 'Where are you headed today?', botCn: '今天去哪儿？', userHints: ['going', 'airport', 'hotel', 'station', 'downtown', 'address', 'street', 'drop'], sample: 'I\'m going to JFK Airport, please.' },
            { uid: 9, situationCn: '司机问你在哪下车。', botEn: 'Any specific drop-off point?', botCn: '有具体下车地点吗？', userHints: ['corner', 'front', 'hotel', 'here', 'light', 'main', 'street'], sample: 'Drop me off at the corner, please.' },
            { uid: 10, situationCn: '紧急情况，接线员或路人问你怎么了。', botEn: 'What\'s the emergency? Do you need an ambulance?', botCn: '什么紧急情况？需要叫救护车吗？', userHints: ['pain', 'help', 'ambulance', 'breathe', 'doctor', 'chest', 'call', 'cannot'], sample: 'Yes, I need an ambulance. I have chest pain.' },
            { uid: 11, situationCn: '对方说太快你没听懂，需要礼貌请对方重复。', botEn: 'Could you say that again?', botCn: '能再说一遍吗？', userHints: ['sorry', 'slowly', 'again', 'english', 'understand', 'repeat'], sample: 'Sorry, could you say that again more slowly?' },
            { uid: 12, situationCn: '你去商店退货，店员问你怎么帮你。', botEn: 'How can I help you today?', botCn: '今天怎么帮您？', userHints: ['return', 'refund', 'exchange', 'broken', 'wrong', 'like', 'want'], sample: 'I\'d like to return this item, please.' },
            { uid: 12, situationCn: '店员问退货原因。', botEn: 'What\'s the reason for the return?', botCn: '退货原因是什么？', userHints: ['broken', 'wrong', 'size', 'damaged', 'doesn', 'fit'], sample: 'It\'s broken. It doesn\'t work.' },
            { uid: 13, situationCn: '你身体不适，需要预约家庭医生或诊所。', botEn: 'Do you have an appointment with us today?', botCn: '您今天有预约吗？', userHints: ['yes', 'appointment', 'have', 'three', 'doctor', 'today', 'tomorrow', 'morning'], sample: 'Yes, I have an appointment at 3 PM.' },
            { uid: 13, situationCn: '前台问你想约什么时间。', botEn: 'What time works best for you?', botCn: '您哪个时间方便？', userHints: ['afternoon', 'morning', 'monday', 'tomorrow', 'three', 'available', 'time'], sample: 'Tomorrow afternoon works for me.' },
            { uid: 14, situationCn: '你要向物业报修暖气或漏水。', botEn: 'What seems to be the problem in your unit?', botCn: '您那边具体是什么问题？', userHints: ['heat', 'leak', 'water', 'broken', 'days', 'not', 'working'], sample: 'The heating hasn\'t worked for three days.' },
            { uid: 15, situationCn: '你去邮局或快递点取包裹。', botEn: 'Do you have a tracking number or ID?', botCn: '有追踪号或证件吗？', userHints: ['yes', 'phone', 'here', 'tracking', 'number', 'id', 'pick'], sample: 'Yes, the tracking number is on my phone.' },
            { uid: 16, situationCn: '你在药店想买感冒药或问药剂师。', botEn: 'Do you need the pharmacist for a consultation?', botCn: '需要药剂师咨询吗？', userHints: ['yes', 'cold', 'medicine', 'headache', 'help', 'need'], sample: 'Yes, I need something for a cold, please.' },
            { uid: 16, situationCn: '药剂师问你是否嗜睡。', botEn: 'Do you need non-drowsy medication?', botCn: '要不嗜睡的版本吗？', userHints: ['yes', 'non', 'drowsy', 'daytime', 'work', 'please'], sample: 'Yes, non-drowsy, please. I have to work.' },
        ];

        const LS_ACHIEVEMENTS = 'achievements_unlocked_v1';
        const LS_RAID_DRILL_OK = 'raid_drill_ok_total_v1';
        const LS_DRILL_MODE_PREF = 'drill_mode_pref_v1';
        const LS_AMBUSH_ENABLED = 'ambush_mode_enabled_v1';
        const LS_FAVORITE_UNITS = 'favorite_units_v1';
        const LS_STATS_LISTEN_TOTAL = 'stats_listen_play_total_v1';

        const SCENE_ACHIEVEMENTS = [
            { id: 'scene_u1', icon: '🏠', title: '睦邻初识', sceneName: '邻居' },
            { id: 'scene_u2', icon: '🧭', title: '问路有方', sceneName: '位置' },
            { id: 'scene_u3', icon: '🚻', title: '从容应急', sceneName: '洗手间' },
            { id: 'scene_u4', icon: '🏦', title: '银行起步', sceneName: '银行' },
            { id: 'scene_u5', icon: '🛒', title: '收银不慌', sceneName: '结账' },
            { id: 'scene_u6', icon: '🍽️', title: '点餐自如', sceneName: '点餐' },
            { id: 'scene_u7', icon: '🥂', title: '饭局有度', sceneName: '聚餐' },
            { id: 'scene_u8', icon: '☕', title: '老友重逢', sceneName: '叙旧' },
            { id: 'scene_u9', icon: '🚕', title: '出行有道', sceneName: '打车' },
            { id: 'scene_u10', icon: '🚑', title: '临危不乱', sceneName: '急救' },
            { id: 'scene_u11', icon: '👂', title: '听懂为止', sceneName: '没听懂' },
            { id: 'scene_u12', icon: '↩️', title: '退换有据', sceneName: '退货' },
            { id: 'scene_u13', icon: '📅', title: '预约有方', sceneName: '预约' },
            { id: 'scene_u14', icon: '🔧', title: '租房达人', sceneName: '报修' },
            { id: 'scene_u15', icon: '📦', title: '包裹必达', sceneName: '邮局' },
            { id: 'scene_u16', icon: '💊', title: '问药不慌', sceneName: '药店' },
        ];

        const ACHIEVEMENT_DEFS = (() => {
            const progressive = [
                { id: 'debut', icon: '🌱', title: '小白登场', desc: '首次完成任意一次成功跟读，开始场景练习' },
                { id: 'comm_novice', icon: '🎖️', title: '沟通新手', desc: '至少 1 个场景达成「听 · 点选词块 · 跟读」三项' },
                { id: 'comm_expert', icon: '🏅', title: '沟通高手', desc: '至少 8 个场景达成三项全满' },
            ];
            const scenes = SCENE_ACHIEVEMENTS.map(s => ({
                id: s.id,
                icon: s.icon,
                title: s.title,
                desc: `在「${s.sceneName}」场景达成听 · 点词 · 跟读全项`,
                sceneName: s.sceneName
            }));
            const finale = [{ id: 'grand_slam', icon: '🌟', title: '全场景达人', desc: '16 个场景全部达成三项全满' }];
            return progressive.concat(scenes).concat(finale);
        })();

        const EXIT_GOALS = [
            { id: 'travel7', title: '🛫 出国7天生存', blurb: '打车、点餐、结账、洗手间、银行——够应付日常', units: [9, 6, 5, 3, 4] },
            { id: 'hosp', title: '🏥 看病全流程', blurb: '预约 → 急救表达 → 药店取药', units: [13, 10, 16] },
            { id: 'school', title: '🏫 新环境落地', blurb: '认识邻居、办银行、听不懂也能应对', units: [1, 4, 11] },
        ];

        try {
            const v = localStorage.getItem(LS_DRILL_MODE_PREF);
            if (v === 'speed' || v === 'normal') drillMode = v;
            else if (v === 'raid') {
                drillMode = 'normal';
                localStorage.setItem(LS_DRILL_MODE_PREF, 'normal');
            }
        } catch (e) {}

        const EMERGENCY_CATEGORIES = {
            medical: {
                label: '医疗',
                phrases: [
                    { en: 'Help! Call 911!', cn: '救命！打911！', urgent: true },
                    { en: 'Please call an ambulance.', cn: '请叫救护车。' },
                    { en: 'I need a doctor right now.', cn: '我现在就需要医生。' },
                    { en: 'I cannot breathe.', cn: '我呼吸困难。' },
                    { en: 'I am having chest pain.', cn: '我胸口疼。' },
                    { en: 'I am allergic to this medication.', cn: '我对这个药过敏。' },
                    { en: 'I feel dizzy and sick.', cn: '我头晕恶心。' },
                    { en: 'Please take me to the emergency room.', cn: '请送我去急诊。' },
                ]
            },
            police: {
                label: '警察',
                phrases: [
                    { en: 'Please call the police.', cn: '请叫警察。' },
                    { en: 'I need to report a crime.', cn: '我要报案。' },
                    { en: 'Someone stole my bag.', cn: '有人偷了我的包。' },
                    { en: 'I need help. Someone is following me.', cn: '我需要帮助，有人跟着我。' },
                    { en: 'Here is my ID.', cn: '这是我的证件。' },
                    { en: 'I am not involved.', cn: '我没参与。' },
                ]
            },
            help: {
                label: '求助',
                phrases: [
                    { en: 'I need help!', cn: '我需要帮助！' },
                    { en: 'Please help me!', cn: '请帮帮我！' },
                    { en: 'I do not speak English well. Please use a translation app.', cn: '我英语不好，请用翻译软件。' },
                    { en: 'I need a translator.', cn: '我需要翻译。' },
                    { en: 'Can you call someone for me?', cn: '能帮我打个电话吗？' },
                    { en: 'This is an emergency.', cn: '这是紧急情况。' },
                ]
            },
            lost: {
                label: '迷路',
                phrases: [
                    { en: 'I am lost. Can you help me?', cn: '我迷路了，能帮我吗？' },
                    { en: 'I cannot find my hotel.', cn: '我找不到酒店。' },
                    { en: 'Where is the nearest subway station?', cn: '最近的地铁站在哪？' },
                    { en: 'How do I get to this address?', cn: '怎么去这个地址？' },
                    { en: 'The address is on my phone.', cn: '地址在我手机上。' },
                    { en: 'I need to meet my family here.', cn: '我要在这里和家人会合。' },
                ]
            }
        };
        function flattenEmergencyPhrases() {
            const out = [];
            Object.keys(EMERGENCY_CATEGORIES).forEach(k => {
                EMERGENCY_CATEGORIES[k].phrases.forEach(p => out.push(p));
            });
            return out;
        }

        const LIFE_DATA = [
            { section: '🚇 地铁 / 公交' },
            { en: 'MetroCard', cn: '地铁卡', speak: 'MetroCard' },
            { en: 'OMNY (tap to pay)', cn: '免接触支付', speak: 'OMNY' },
            { en: 'Uptown / Downtown', cn: '上城方向 / 下城方向', speak: 'Uptown. Downtown.' },
            { en: 'Transfer here', cn: '在这里换乘', speak: 'Transfer here' },
            { en: 'Express / Local', cn: '快车 / 慢车（停站多）', speak: 'Express train. Local train.' },
            { en: 'Last stop', cn: '终点站', speak: 'Last stop' },
            { section: '⏰ 时间表达' },
            { en: 'quarter past / quarter to', cn: '几点一刻 / 差一刻', speak: 'quarter past three. quarter to four.' },
            { en: 'half past', cn: '几点半', speak: 'half past two' },
            { en: 'AM / PM', cn: '上午 / 下午', speak: 'AM. PM.' },
            { en: 'in a bit / in a moment', cn: '等一下', speak: 'in a bit. in a moment.' },
            { en: 'ASAP', cn: '尽快（as soon as possible）', speak: 'as soon as possible' },
            { section: '🏠 租房常识' },
            { en: 'Security deposit', cn: '押金', speak: 'security deposit' },
            { en: 'Utilities included', cn: '水电费包含在内', speak: 'utilities included' },
            { en: 'Month-to-month lease', cn: '按月租约（随时可退）', speak: 'month to month lease' },
            { en: 'Landlord / Tenant', cn: '房东 / 租客', speak: 'landlord. tenant.' },
            { en: 'Notice to vacate', cn: '搬离通知', speak: 'notice to vacate' },
            { section: '🏥 医疗常识' },
            { en: 'Copay', cn: '自付部分（挂号费）', speak: 'copay' },
            { en: 'Deductible', cn: '免赔额（超过才报销）', speak: 'deductible' },
            { en: 'In-network / Out-of-network', cn: '在网络内 / 超出保险范围', speak: 'in network. out of network.' },
            { en: 'Primary care doctor', cn: '家庭医生', speak: 'primary care doctor' },
            { en: 'Walk-in clinic', cn: '无需预约的诊所', speak: 'walk in clinic' },
            { section: '📝 证件 / 法律' },
            { en: 'Social Security Number (SSN)', cn: '社会安全号', speak: 'social security number' },
            { en: 'Green card / EAD', cn: '绿卡 / 工卡', speak: 'green card. employment authorization document.' },
            { en: 'Notarized', cn: '公证过的', speak: 'notarized' },
            { en: 'Power of attorney', cn: '授权委托书', speak: 'power of attorney' },
        ];

        const DIALOG_SCRIPTS = {
            u6: [
                { role: 'bot', text: 'Hi! Are you ready to order?', cn: '你好，准备好点餐了吗？' },
                { role: 'user_prompt', hint: '说你想要什么（例：I\'d like the burger）' },
                { role: 'bot', text: 'Great choice! Any allergies or special requests?', cn: '好的！有过敏或特殊要求吗？' },
                { role: 'user_prompt', hint: '说你的忌口（例：No onions please）' },
                { role: 'bot', text: 'Got it. Anything to drink?', cn: '明白了。要来点喝的吗？' },
                { role: 'user_prompt', hint: '点饮料或拒绝（例：Just water, please / No thanks）' },
                { role: 'bot', text: 'Perfect. Your food will be out in about fifteen minutes.', cn: '好的，大约15分钟上菜。' },
                { role: 'user_prompt', hint: '道谢或追问（例：Thank you! / Can we get extra napkins?）' },
                { role: 'bot', text: 'Of course! I\'ll be right back.', cn: '当然！我马上拿来。' },
            ],
            u12: [
                { role: 'bot', text: 'Hi there! How can I help you today?', cn: '你好！今天怎么帮您？' },
                { role: 'user_prompt', hint: '说你要退货（例：I\'d like to return this）' },
                { role: 'bot', text: 'Oh I\'m sorry to hear that. What\'s the reason for the return?', cn: '很抱歉听到这个。退货原因是什么？' },
                { role: 'user_prompt', hint: '说原因（例：It\'s broken / too small）' },
                { role: 'bot', text: 'I understand. Do you have your receipt with you?', cn: '明白了。请问有收据吗？' },
                { role: 'user_prompt', hint: '回应（例：Yes, here it is）' },
            ],
            u9: [
                { role: 'bot', text: 'Hi, where are you headed today?', cn: '你好，今天去哪里？' },
                { role: 'user_prompt', hint: '说目的地（例：I\'m going to Flushing）' },
                { role: 'bot', text: 'Got it. Any specific drop-off point?', cn: '好的，有具体下车地点吗？' },
                { role: 'user_prompt', hint: '说下车点（例：Drop me off at the corner）' },
                { role: 'bot', text: 'No problem, we\'ll be there in about 15 minutes.', cn: '没问题，大约15分钟到。' },
            ],
            u4: [
                { role: 'bot', text: 'Good morning! How can I help you today?', cn: '早上好！今天有什么需要？' },
                { role: 'user_prompt', hint: '说你要做什么（例：I\'d like to open an account）' },
                { role: 'bot', text: 'Sure! Can I see your ID please?', cn: '好的！能看一下您的证件吗？' },
                { role: 'user_prompt', hint: '回应（例：Here is my passport）' },
                { role: 'bot', text: 'Perfect, please fill out this form.', cn: '好的，请填写这张表格。' },
            ],
            u14: [
                { role: 'bot', text: 'Hello, this is the property management.', cn: '你好，这里是物业管理处。' },
                { role: 'user_prompt', hint: '报告问题（例：There\'s a problem with the heating）' },
                { role: 'bot', text: 'How long has this been going on?', cn: '这个问题多久了？' },
                { role: 'user_prompt', hint: '说时间（例：It\'s been 3 days）' },
                { role: 'bot', text: 'I\'ll send someone over today. Is that okay?', cn: '我今天安排人过去，可以吗？' },
                { role: 'user_prompt', hint: '回应（例：Yes, please. Thank you）' },
            ],
        };
        Object.assign(DIALOG_SCRIPTS, {
            u3: [
                { role: 'bot', text: 'Hey, can I help you?', cn: '嗨，有什么需要吗？' },
                { role: 'user_prompt', hint: '礼貌请求（例：Sorry, could I use your restroom?）' },
                { role: 'bot', text: 'Of course! It\'s right down the hall on the left.', cn: '当然！走廊尽头左边就是。' },
                { role: 'user_prompt', hint: '道谢（例：Thank you so much!）' },
                { role: 'bot', text: 'No problem at all!', cn: '没问题！' },
            ],
            u5: [
                { role: 'bot', text: 'Hi there! Did you find everything okay?', cn: '你好！都找到了吗？' },
                { role: 'user_prompt', hint: '回应（例：Yes, thank you. I\'d like to pay by credit card.）' },
                { role: 'bot', text: 'Sure! Credit or debit?', cn: '好的！信用卡还是借记卡？' },
                { role: 'user_prompt', hint: '说明（例：Credit card, please.）' },
                { role: 'bot', text: 'Great, your total is $24.50. Please tap or insert your card.', cn: '好的，总共24.50美元，请刷卡。' },
                { role: 'user_prompt', hint: '询问收据（例：Can I have a receipt?）' },
                { role: 'bot', text: 'Of course! Here you go. Have a great day!', cn: '当然！给您。祝您愉快！' },
            ],
            u13: [
                { role: 'bot', text: "Good morning! This is Dr. Chen's office. How can I help you?", cn: '早上好！这里是陈医生诊所，有什么需要？' },
                { role: 'user_prompt', hint: '说你要预约（例：I\'d like to make an appointment.）' },
                { role: 'bot', text: "Sure! What's the reason for your visit?", cn: '好的！您来就诊的原因是什么？' },
                { role: 'user_prompt', hint: '说症状（例：I have a headache and a fever.）' },
                { role: 'bot', text: 'I see. We have an opening this Thursday at 2 PM. Does that work?', cn: '明白了。本周四下午2点有空档，可以吗？' },
                { role: 'user_prompt', hint: '确认（例：Yes, that works for me. Thank you.）' },
            ],
            u1: [
                { role: 'bot', text: "Hi! I'm Alex from 3B. Nice to meet you!", cn: '嗨！我是3B的Alex，很高兴认识你！' },
                { role: 'user_prompt', hint: '自我介绍（例：Hi, I\'m new here. I live in Apt 302.）' },
                { role: 'bot', text: "Welcome! If you need anything, just knock.", cn: '欢迎！有需要随时敲门。' },
                { role: 'user_prompt', hint: '客气回应（例：Thanks! Nice to meet you too.）' },
                { role: 'bot', text: "Great — see you around!", cn: '太好了，回头见！' },
            ],
            u2: [
                { role: 'bot', text: 'Hi! Are you looking for something?', cn: '你好！在找什么地方吗？' },
                { role: 'user_prompt', hint: '说目的地（例：I\'m looking for the mailroom.）' },
                { role: 'bot', text: "Oh, take the elevator — it's on the second floor.", cn: '哦，坐电梯去，在二楼。' },
                { role: 'user_prompt', hint: '追问（例：Could you tell me which way to the elevator?）' },
                { role: 'bot', text: "Sure — go straight, then turn left.", cn: '当然——直走然后左转。' },
            ],
            u7: [
                { role: 'bot', text: 'That was delicious! Should we split the bill?', cn: '真好吃！咱们要AA吗？' },
                { role: 'user_prompt', hint: '表态（例：Let\'s split the bill. / It\'s on me.）' },
                { role: 'bot', text: 'Sounds good. How much was your part?', cn: '行。你那部分大概多少？' },
                { role: 'user_prompt', hint: '补充（例：About twenty dollars. I can Venmo you.）' },
                { role: 'bot', text: "Perfect. Thanks for dinner!", cn: '好。谢谢请客（或分摊）！' },
            ],
            u8: [
                { role: 'bot', text: "Hey! Long time no see! How's everything?", cn: '嘿！好久不见！最近怎么样？' },
                { role: 'user_prompt', hint: '寒暄（例：Pretty good! How about you?）' },
                { role: 'bot', text: "Awesome. We should grab coffee sometime.", cn: '太好了。咱们该找时间喝杯咖啡。' },
                { role: 'user_prompt', hint: '约时间（例：Are you free this Saturday?）' },
                { role: 'bot', text: "Yes! I'll text you.", cn: '好啊！我给你发信息。' },
            ],
            u10: [
                { role: 'bot', text: '911, what is your emergency?', cn: '这里是911，什么紧急情况？' },
                { role: 'user_prompt', hint: '说明需求（例：I need an ambulance. My chest hurts.）' },
                { role: 'bot', text: 'Okay. What is your exact location?', cn: '好的。你的具体位置是？' },
                { role: 'user_prompt', hint: '说地址或标志（例：I am near the CVS on Main Street.）' },
                { role: 'bot', text: 'Help is on the way. Stay on the line.', cn: '救援已在路上，请别挂电话。' },
            ],
            u11: [
                { role: 'bot', text: 'I just need you to initial here and here — capisce?', cn: '我需要你在这儿和这儿签缩写——明白吗？' },
                { role: 'user_prompt', hint: '没听懂请对方重复（例：Sorry, could you say that again?）' },
                { role: 'bot', text: 'Sure — sign your initials on these two lines.', cn: '好的——在这两行签上你名字的缩写。' },
                { role: 'user_prompt', hint: '请对方写或说慢（例：Could you write it down, please?）' },
                { role: 'bot', text: 'No problem. Here is a pen.', cn: '没问题。给你笔。' },
            ],
            u15: [
                { role: 'bot', text: 'Hi! Pickup line is over here. Do you have ID?', cn: '你好！取件在这边。带证件了吗？' },
                { role: 'user_prompt', hint: '说明来意（例：I\'m here to pick up a package.）' },
                { role: 'bot', text: 'Tracking number, please.', cn: '请报一下追踪号。' },
                { role: 'user_prompt', hint: '回应（例：It\'s on my phone — here.）' },
                { role: 'bot', text: 'Got it. Sign here, please.', cn: '好的。请在这里签字。' },
            ],
            u16: [
                { role: 'bot', text: 'Hi! What symptoms are you having today?', cn: '你好！今天哪里不舒服？' },
                { role: 'user_prompt', hint: '说症状（例：I need something for a headache.）' },
                { role: 'bot', text: 'This brand works well for most people. Any allergies?', cn: '这个牌子多数人有效。有药物过敏吗？' },
                { role: 'user_prompt', hint: '确认或提问（例：Is this non-drowsy?）' },
                { role: 'bot', text: 'Yes — take one every six hours with food.', cn: '是的——每6小时随餐服一粒。' },
            ],
        });

        const PRONUNCIATION_WORDS = [
            { word: 'comfortable', tip: '只有3个音节：COM-fter-ble' },
            { word: 'sheet', tip: '注意 sh 的发音，不要拖长 s' },
            { word: 'beach', tip: '结尾 ch /tʃ/ 要发清楚' },
            { word: 'receipt', tip: 'p 不发音：re-SEET' },
            { word: 'restaurant', tip: 'RES-trant，中间 t 通常不发音' },
            { word: 'Wednesday', tip: 'WENZ-day，d 不发音' },
            { word: 'February', tip: 'FEB-yoo-ary 或 FEB-roo-ary 均可' },
            { word: 'ambulance', tip: 'AM-byoo-lanse，重音在前' },
            { word: 'pharmacy', tip: 'FAR-ma-see，重音在前' },
            { word: 'appointment', tip: 'a-POINT-ment，重音在中' },
        ];

        const DAILY_PHRASES = [
            { en: 'Excuse me, could you help me?', cn: '打扰一下，能帮我吗？' },
            { en: 'I\'m sorry, I don\'t understand.', cn: '抱歉，我不明白。' },
            { en: 'Could you say that again, please?', cn: '能再说一遍吗？' },
            { en: 'How much does this cost?', cn: '这个多少钱？' },
            { en: 'Where is the nearest subway?', cn: '最近的地铁站在哪？' },
            { en: 'Can I get the check, please?', cn: '麻烦买单。' },
            { en: 'I\'d like to return this item.', cn: '我想退这件商品。' },
            { en: 'Do you accept credit cards?', cn: '你们接受信用卡吗？' },
            { en: 'Is there a Chinese translator available?', cn: '有中文翻译吗？' },
            { en: 'Please call 911.', cn: '请打911。' },
            { en: 'I\'m looking for the elevator.', cn: '我在找电梯。' },
            { en: 'Could you speak more slowly, please?', cn: '能说慢一点吗？' },
            { en: 'Could you write that down?', cn: '能写下来给我看吗？' },
            { en: 'I\'d like to make an appointment.', cn: '我想预约。' },
            { en: 'There\'s a problem with my order.', cn: '我的订单有问题。' },
            { en: 'I don\'t speak English very well.', cn: '我英语说得不太好。' },
            { en: 'Do you have a restroom nearby?', cn: '附近有洗手间吗？' },
            { en: 'I\'d like to speak to a manager.', cn: '我想和经理谈谈。' },
            { en: 'Can you call an ambulance?', cn: '能叫救护车吗？' },
            { en: 'I\'m allergic to nuts.', cn: '我对坚果过敏。' },
            { en: 'What time does this close?', cn: '这里几点关门？' },
            { en: 'Is this seat taken?', cn: '这个座位有人吗？' },
            { en: 'Could I have a receipt?', cn: '能给我收据吗？' },
            { en: 'I\'ll pay by credit card.', cn: '我用信用卡付。' },
            { en: 'Can you drop me off here?', cn: '能在这里让我下车吗？' },
            { en: 'How long will it take?', cn: '要多久？' },
            { en: 'I\'d like to cancel my reservation.', cn: '我想取消预约。' },
            { en: 'There\'s a leak in my apartment.', cn: '我的公寓漏水了。' },
            { en: 'Where can I pick up my package?', cn: '我在哪里取包裹？' },
            { en: 'Do you have something for a cough?', cn: '有治咳嗽的药吗？' },
        ];

        const SITE_HELP_QA = [
            { q: ['怎么用', '如何使用', '教程', '说明'], a: '你可以：1️⃣ 滑动切换场景卡片；2️⃣ 点词块替换关键词；3️⃣ 点「练习」跟读（先播英文再开麦）；4️⃣ 右下角🎲随机挑战，🧰工具箱有换算/小费/发音等。更完整的说明请点页头「使用教程」按钮打开说明窗口。' },
            { q: ['弱点词', '哪里错了', '哪里不好'], a: '你的弱点词记录在 🧰工具箱 → 📊实战 标签里，每次跟读答错会自动记录。你可以点「开练」针对性训练，连对2次就标记为掌握！' },
            { q: ['遮挡', '测试', '自测'], a: '右下角👁️遮挡特训按钮，开启后英文会模糊，可以自测！旁边有「简单/困难」切换，简单只遮挡关键词，困难整句都遮挡。' },
            { q: ['应急', '紧急', '911'], a: '页头⚡红色闪电是应急模式！全屏显示医疗/警察/求助/迷路四类英文，点击即可朗读，还可以开启自动循环播放。部分设备支持摇手机快速进入！' },
            { q: ['保存', '备份', '换手机'], a: '🧰工具箱 → 💾备份与恢复标签，可以导出全部本地数据为JSON文件，换设备后导入即可恢复所有进度！' },
            { q: ['收藏', '置顶', '常用'], a: '场景标题栏右侧可点「收藏／取消收藏」；顶栏⭐可打开「我的收藏」列表并跳转。另可长按标题文字将场景置顶（最多 3 个），常用场景会靠前排序。' },
            { q: ['分享', '发给朋友', '二维码'], a: '场景标题旁有「扫码分享」按钮，可以生成扫码直达的二维码，扫码后直接跳转到这个场景！' },
        ];

        const ROBOT_BUBBLE_TIPS = [
            '嘿！想练练口语吗？点我就行～',
            '嘴闲着也是闲着，来两句？我陪你。',
            '别光看呀，小声说出来才记得住～',
            '有空不？帮你练几句更地道的说法。',
            '今天也想进步一点点？我在呢。',
            '敢不敢跟我练个三十秒？不丢人～',
            '假装人在国外，跟我说两句试试？',
            '心里那句英语，说出来我听听？',
            '刷了半天了，嘴巴要不要动一动？',
            '一句话就行，我陪你练到顺口。',
            '想不想测测发音哪儿还可以再顺一点？',
            '好久没见你开口啦，来一个？',
            '闲下来正好：练个短句热热身？',
            '英语要「说」出来才管用，来一句？',
            '别害羞，我就爱听初学者开口～',
            '今天的小目标：说满一句，点我开始。',
            '卡壳了也没关系，我等你慢慢说。',
            '想聊啥场景？点我，咱们边聊边练。',
            '悄悄练两句，别人听不见的～',
            '嘴皮子生了？来我这儿开开光～',
            '今日份口语小任务，要不要顺手完成？',
            '嘿，等你好久了，来练练？',
            '把那句说不出口的英文，交给我练。',
            '点我一下，从「会看」变成「会说」～',
            '就现在，说一句你最常用的英文？',
        ];
        let __robotBubbleLastTipIdx = -1;
        function pickRobotBubbleTip() {
            const tips = ROBOT_BUBBLE_TIPS;
            const n = tips.length;
            if (n === 0) return '';
            if (n === 1) return tips[0];
            let idx = Math.floor(Math.random() * n);
            let tries = 0;
            while (idx === __robotBubbleLastTipIdx && tries++ < 12) {
                idx = Math.floor(Math.random() * n);
            }
            if (idx === __robotBubbleLastTipIdx) idx = (idx + 1) % n;
            __robotBubbleLastTipIdx = idx;
            return tips[idx];
        }

        const PRONREF_DATA = [
            {
                wrongLabel: '拖长 "s" 在 sheet 里',
                wrongTip: '易听成别的词',
                rightWord: 'sheet /ʃiːt/',
                rightTip: '长元音，结尾轻',
                scene: '床单/表格',
                speak: 'sheet. A sheet of paper.'
            },
            {
                wrongLabel: "can't 读成英式 /kænt/",
                wrongTip: '重读 æ 听起来像骂人',
                rightWord: "can't（美式：短促鼻音）",
                rightTip: '快速收尾，不拖长',
                scene: '不能',
                speak: 'I cannot do that.'
            },
            {
                wrongLabel: 'beach 省略尾音 ch',
                wrongTip: '漏了结尾会变成另一个词',
                rightWord: 'beach /biːtʃ/',
                rightTip: '结尾 /tʃ/ 要到位',
                scene: '海滩',
                speak: 'Let us go to the beach.'
            },
            {
                wrongLabel: 'focus 加卷舌 r',
                wrongTip: '读成 fo-r-kus',
                rightWord: 'focus /ˈfoʊkəs/',
                rightTip: '不要卷舌',
                scene: '专注',
                speak: 'Please focus on this page.'
            },
            {
                wrongLabel: 'comfortable 四音节全念',
                wrongTip: 'com-for-ta-ble（太慢）',
                rightWord: 'comfortable → 3音节',
                rightTip: 'COM-fter-ble',
                scene: '舒适',
                speak: 'This chair is very comfortable.'
            },
            {
                wrongLabel: 'receipt 把 p 念出来',
                wrongTip: 're-SEET，p 是哑音',
                rightWord: 'receipt /rɪˈsiːt/',
                rightTip: 'p 不发音',
                scene: '收据',
                speak: 'Can I have a receipt please.'
            },
            {
                wrongLabel: 'restaurant 四音节',
                wrongTip: 'res-tau-rant（太正式）',
                rightWord: 'restaurant /ˈrɛstrənt/',
                rightTip: '中间 t 通常省略',
                scene: '餐厅',
                speak: 'Let us go to a restaurant.'
            },
            {
                wrongLabel: 'Wednesday 念成 Wed-nes-day',
                wrongTip: '三个音节，不要读出「nes」',
                rightWord: 'Wednesday /ˈwenzdeɪ/',
                rightTip: '常见读法：WENZ-day',
                scene: '星期三',
                speak: 'See you on Wednesday.'
            },
            {
                wrongLabel: 'three 发成「树」',
                wrongTip: '缺了气流摩擦的 th',
                rightWord: 'three /θriː/',
                rightTip: '舌尖轻咬舌间，送气',
                scene: '数字三',
                speak: 'I need three copies, please.'
            },
            {
                wrongLabel: 'ship / sheep 混读',
                wrongTip: '元音一短一长',
                rightWord: 'ship /ʃɪp/ · sheep /ʃiːp/',
                rightTip: 'ship 短 i；sheep 长元音',
                scene: '船 / 羊',
                speak: 'The ship is big. Those sheep are on the hill.'
            },
            {
                wrongLabel: 'world 加卷舌 r',
                wrongTip: '读成 wor-ld「儿」太重',
                rightWord: 'world /wɜːrld/',
                rightTip: '美式：or 一带而过，别拖长卷舌',
                scene: '世界',
                speak: 'Welcome to the world of science.'
            },
            {
                wrongLabel: 'desert 与 dessert 混',
                wrongTip: '重音与 s 读音不同',
                rightWord: 'desert /ˈdezərt/ · dessert /dɪˈzɜːrt/',
                rightTip: '沙漠重音在前；甜点重音在中间',
                scene: '沙漠 / 甜点',
                speak: 'This cake is my favorite dessert.'
            },
            {
                wrongLabel: 'February 每个音节都重读',
                wrongTip: 'Feb-ru-ary 念得太碎',
                rightWord: 'February /ˈfebjueri/',
                rightTip: '常见美式：FEB-yoo-werr-ee',
                scene: '二月',
                speak: 'My appointment is in February.'
            },
        ];

        function initDailyRec() {
            const slides = [];
            const h = new Date().getHours();
            const isPeakHour = (h >= 6 && h < 9) || (h >= 11 && h < 14) || (h >= 14 && h < 18) || (h >= 18 && h < 21);

            if (!isPeakHour) {
                const weak = JSON.parse(localStorage.getItem('weak_words') || '[]');
                const unmastered = weak.filter(w => !w.mastered);
                if (unmastered.length > 0) {
                    const top = unmastered[0];
                    const w = String(top.eng).trim().slice(0, 10);
                    const WV = window.BANNER_WEAK_VARIANTS;
                    let label;
                    let text;
                    if (WV && WV.labels && WV.templates && WV.labels.length && WV.templates.length) {
                        label = WV.labels[Math.floor(Math.random() * WV.labels.length)];
                        const tpl = WV.templates[Math.floor(Math.random() * WV.templates.length)];
                        text = tpl.replace(/\{w\}/g, w);
                    } else {
                        const wl = ['🎯 练弱点', '⚡ 请注意', '💪 开练', '✨ 今日加练'];
                        label = wl[Math.floor(Math.random() * wl.length)];
                        text = `弱词「${w}」→试实战`;
                    }
                    slides.push({
                        _bannerKind: 'weak',
                        label,
                        text,
                        action: () => {
                            openToolbox();
                            switchTool(3);
                            setTimeout(() => {
                                document.querySelector('#tool-stats .weak-item-first')?.scrollIntoView({ behavior: 'smooth' });
                            }, 300);
                        },
                    });
                }
            }

            const matched = DAILY_REC_RULES.find(([cond]) => cond()) || [null, 'u1', '点横幅练「邻居打招呼」开场白'];
            const uid = matched[1];
            const fallbackText = matched[2];
            const basePool = DAILY_REC_UNIT_VARIANTS[uid] || [];
            const extraPool = (window.BANNER_DAILY_EXTRA_VARIANTS && window.BANNER_DAILY_EXTRA_VARIANTS[uid]) || [];
            const mergedPool = [...basePool, ...extraPool];
            const pick = mergedPool.length
                ? mergedPool[Math.floor(Math.random() * mergedPool.length)]
                : { label: '💡 今日推荐', text: fallbackText };
            /** 时段场景条在池中的份数；过大则轮播里「场景推荐」占比过高（易隔一条就出现） */
            const DAILY_SCENE_BANNER_WEIGHT = 3;
            for (let i = 0; i < DAILY_SCENE_BANNER_WEIGHT; i++) {
                slides.push({
                    _bannerKind: 'dailyScene',
                    label: pick.label,
                    text: pick.text,
                    action: () => scrollToUnit(uid),
                });
            }

            const featureSlides = buildBannerFeatureSlidesFromPool();
            slides.push(...featureSlides);
            shuffleBannerNoAdjacentDailyScene(slides);

            __dailyBannerSlides = slides;
            __dailyBannerIndex = 0;
            applyDailyBannerSlide(0);
            if (__dailyBannerTimer) clearInterval(__dailyBannerTimer);
            __dailyBannerTimer = slides.length > 1 ? setInterval(advanceDailyBanner, 20000) : null;

            const bar = document.getElementById('dailyRec');
            if (bar && !bar.dataset.keysBound) {
                bar.dataset.keysBound = '1';
                bar.addEventListener('keydown', e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        bar.click();
                    }
                });
            }
        }

        function markUsedToday(unitNum, btn) {
            triggerHaptic();
            const key = `used_real_u${unitNum}`;
            let records = JSON.parse(localStorage.getItem(key) || '[]');
            records.push(Date.now());
            localStorage.setItem(key, JSON.stringify(records));

            btn.classList.add('tapped');
            btn.innerText = '🎉 已记录！';
            setTimeout(() => {
                btn.innerText = '✅ 我今天用上了这句';
                btn.classList.remove('tapped');
            }, 2000);

            renderUsedCount(unitNum);
            showToast(`💪 第 ${records.length} 次在现实中用上这个场景！`);
        }

        function renderUsedCount(unitNum) {
            const key = `used_real_u${unitNum}`;
            const records = JSON.parse(localStorage.getItem(key) || '[]');
            const el = document.getElementById(`used-count-${unitNum}`);
            if (!el) return;
            if (records.length === 0) { el.innerText = ''; return; }
            el.innerText = `已用过 ${records.length} 次`;
        }

        function recordWeakWord(eng, cn, unitNum, addedBy) {
            addedBy = addedBy || 'auto';
            let list = JSON.parse(localStorage.getItem('weak_words') || '[]');
            const key = (eng || '').trim();
            if (!key) return;
            const idx = list.findIndex(w => w.eng === key);
            if (idx > -1) {
                if (!list[idx].mastered) {
                    list[idx].count = (list[idx].count || 1) + 1;
                    list[idx].lastTime = Date.now();
                    list[idx].correctStreak = 0;
                    list[idx].nextReviewAt = startOfTomorrow();
                    if (cn) list[idx].cn = cn;
                    if (unitNum) list[idx].unitNum = unitNum;
                }
            } else {
                list.push({
                    eng: key, cn: cn || '', unitNum: unitNum || 0,
                    count: 1, correctStreak: 0, mastered: false,
                    addedBy, lastTime: Date.now(),
                    nextReviewAt: Date.now()
                });
            }
            list.sort((a, b) => (a.mastered ? 1 : 0) - (b.mastered ? 1 : 0) || b.count - a.count);
            list = list.slice(0, 80);
            localStorage.setItem('weak_words', JSON.stringify(list));
        }

        function markWeakWordCorrect(eng) {
            let list = JSON.parse(localStorage.getItem('weak_words') || '[]');
            const idx = list.findIndex(w => w.eng === eng && !w.mastered);
            if (idx === -1) return;
            list[idx].correctStreak = (list[idx].correctStreak || 0) + 1;
            if (list[idx].correctStreak >= 2) {
                list[idx].mastered = true;
                list[idx].nextReviewAt = null;
                showToast(`🎉 已掌握："${eng}"！`);
                triggerHaptic();
                if (navigator.vibrate) navigator.vibrate([50, 30, 80]);
            } else {
                const gaps = [86400000, 3 * 86400000, 7 * 86400000];
                const gi = Math.min(list[idx].correctStreak - 1, gaps.length - 1);
                list[idx].nextReviewAt = Date.now() + gaps[Math.max(0, gi)];
            }
            localStorage.setItem('weak_words', JSON.stringify(list));
            renderStatsPanel();
        }
        function clearWeakWords() {
            if (!confirm('确定清空所有弱点记录？')) return;
            localStorage.removeItem('weak_words');
            renderStatsPanel();
            showToast('已清空弱点记录');
        }
        function renderStatsPanel() {
            const el = document.getElementById('stats-content');
            if (!el) return;
            el.textContent = '';

            const realUseSection = document.createElement('div');
            realUseSection.style.cssText = 'margin-bottom:16px;';
            const realTitle = document.createElement('div');
            realTitle.style.cssText = 'font-weight:800;font-size:0.88em;color:var(--primary);margin-bottom:8px;';
            realTitle.textContent = '📌 实战使用记录';
            realUseSection.appendChild(realTitle);
            const lines = [];
            for (let i = 1; i <= 16; i++) {
                const card = document.getElementById(`u${i}`);
                if (!card) continue;
                const name = card.getAttribute('data-name');
                const count = JSON.parse(localStorage.getItem(`used_real_u${i}`) || '[]').length;
                if (count > 0) lines.push(`${name}：<strong>用过 ${count} 次</strong>`);
            }
            const realContent = document.createElement('div');
            realContent.style.cssText = 'font-size:0.88em;line-height:2;color:var(--text-sub);';
            realContent.innerHTML = lines.length ? lines.join('<br>') : '还没有实战记录，去生活中用用看！';
            realUseSection.appendChild(realContent);
            el.appendChild(realUseSection);

            const weakList = JSON.parse(localStorage.getItem('weak_words') || '[]');
            const unmastered = weakList.filter(w => !w.mastered).sort((a, b) => {
                const ta = a.nextReviewAt != null ? a.nextReviewAt : 0;
                const tb = b.nextReviewAt != null ? b.nextReviewAt : 0;
                return ta - tb;
            });
            const mastered = weakList.filter(w => w.mastered);

            const weakSection = document.createElement('div');
            weakSection.style.cssText = 'border-top:1px solid var(--border);padding-top:12px;';

            const weakHeader = document.createElement('div');
            weakHeader.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;';
            const weakTitle = document.createElement('div');
            weakTitle.style.cssText = 'font-weight:800;font-size:0.88em;color:var(--danger);';
            weakTitle.textContent = `⚡ 需要攻克的词 (${unmastered.length})`;
            const weakSub = document.createElement('div');
            weakSub.style.cssText = 'font-size:0.72em;color:var(--text-sub);font-weight:600;margin-top:4px;line-height:1.35;';
            weakSub.textContent = '🧠 智能复习：答错会排到明天优先；说对后按 1 天 → 3 天 → 7 天巩固，连对 2 次记为掌握。';
            const addWeakBtn = document.createElement('button');
            addWeakBtn.type = 'button';
            addWeakBtn.style.cssText = 'font-size:0.72em;padding:4px 10px;border-radius:10px;border:1px dashed var(--danger);background:transparent;color:var(--danger);cursor:pointer;';
            addWeakBtn.textContent = '＋ 手动添加';
            addWeakBtn.onclick = () => addWeakWordManually();
            weakHeader.appendChild(weakTitle);
            weakHeader.appendChild(addWeakBtn);
            weakSection.appendChild(weakHeader);
            weakSection.appendChild(weakSub);

            if (unmastered.length === 0) {
                const empty = document.createElement('div');
                empty.style.cssText = 'font-size:0.85em;color:var(--text-sub);text-align:center;padding:12px;background:var(--display-area);border-radius:10px;margin-bottom:10px;';
                empty.textContent = mastered.length > 0 ? '🎉 所有弱点词都已掌握！太棒了！' : '暂无弱点词，继续练习跟读来发现它们';
                weakSection.appendChild(empty);
            }

            unmastered.slice(0, 15).forEach((w, idx) => {
                weakSection.appendChild(createWeakWordRow(w, false, idx === 0));
            });

            if (mastered.length > 0) {
                const masteredToggleBtn = document.createElement('button');
                masteredToggleBtn.type = 'button';
                masteredToggleBtn.style.cssText = 'width:100%;padding:6px;border-radius:8px;border:1px solid var(--border);background:none;color:var(--text-sub);font-size:0.78em;cursor:pointer;margin-top:6px;';
                masteredToggleBtn.textContent = `▾ 已掌握 ${mastered.length} 个词`;
                const masteredList = document.createElement('div');
                masteredList.style.display = 'none';
                mastered.forEach(w => {
                    masteredList.appendChild(createWeakWordRow(w, true, false));
                });
                masteredToggleBtn.onclick = () => {
                    const hidden = masteredList.style.display === 'none';
                    masteredList.style.display = hidden ? 'block' : 'none';
                    masteredToggleBtn.textContent = hidden ? `▴ 已掌握 ${mastered.length} 个词` : `▾ 已掌握 ${mastered.length} 个词`;
                };
                weakSection.appendChild(masteredToggleBtn);
                weakSection.appendChild(masteredList);
            }

            if (weakList.length > 0) {
                const clearBtn = document.createElement('button');
                clearBtn.type = 'button';
                clearBtn.style.cssText = 'margin-top:10px;width:100%;padding:7px;border-radius:8px;border:1px solid var(--border);background:none;color:var(--text-sub);font-size:0.78em;cursor:pointer;';
                clearBtn.textContent = '清空全部弱点记录';
                clearBtn.onclick = clearWeakWords;
                weakSection.appendChild(clearBtn);
            }
            el.appendChild(weakSection);
        }

        function createWeakWordRow(w, isMastered, isFirst) {
            const row = document.createElement('div');
            if (isFirst) row.classList.add('weak-item-first');
            row.style.cssText = `display:flex;align-items:center;background:var(--display-area);border-radius:10px;padding:10px 12px;margin-bottom:8px;border-left:3px solid ${isMastered ? '#34c759' : 'var(--danger)'};gap:8px;`;

            const left = document.createElement('div');
            left.style.cssText = 'flex:1;min-width:0;';
            const enLine = document.createElement('div');
            enLine.style.cssText = `font-weight:700;font-size:0.9em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${isMastered ? 'color:var(--text-sub);text-decoration:line-through;' : ''}`;
            enLine.textContent = w.eng;
            left.appendChild(enLine);
            if (w.cn) {
                const cnLine = document.createElement('div');
                cnLine.style.cssText = 'font-size:0.75em;color:var(--text-sub);margin-top:2px;';
                cnLine.textContent = w.cn;
                left.appendChild(cnLine);
            }
            if (!isMastered) {
                const progressRow = document.createElement('div');
                progressRow.style.cssText = 'display:flex;align-items:center;gap:4px;margin-top:4px;';
                const streak = w.correctStreak || 0;
                for (let i = 0; i < 2; i++) {
                    const dot = document.createElement('div');
                    dot.style.cssText = `width:8px;height:8px;border-radius:50%;background:${i < streak ? '#34c759' : 'var(--border)'};transition:background 0.3s;`;
                    progressRow.appendChild(dot);
                }
                const streakLabel = document.createElement('span');
                streakLabel.style.cssText = 'font-size:0.7em;color:var(--text-sub);';
                streakLabel.textContent = streak === 0 ? '说对2次即可掌握' : `再说对${2 - streak}次就掌握了！`;
                progressRow.appendChild(streakLabel);
                left.appendChild(progressRow);
                if (w.nextReviewAt) {
                    const srs = document.createElement('div');
                    srs.style.cssText = 'font-size:0.68em;color:var(--accent);margin-top:3px;';
                    srs.textContent = '🧠 ' + formatWeakNextReview(w.nextReviewAt) + '（间隔复习 · 类似 Anki）';
                    left.appendChild(srs);
                }
            }
            row.appendChild(left);

            const right = document.createElement('div');
            right.style.cssText = 'display:flex;align-items:center;gap:6px;flex-shrink:0;';

            if (!isMastered) {
                const cnt = document.createElement('span');
                cnt.style.cssText = 'font-size:0.7em;color:var(--danger);font-weight:700;background:rgba(255,59,48,0.1);padding:2px 6px;border-radius:6px;';
                cnt.textContent = '✗' + (w.count || 1);
                right.appendChild(cnt);
            } else {
                const masteredBadge = document.createElement('span');
                masteredBadge.style.cssText = 'font-size:0.7em;color:#34c759;font-weight:700;background:rgba(52,199,89,0.1);padding:2px 6px;border-radius:6px;';
                masteredBadge.textContent = '✓ 已掌握';
                right.appendChild(masteredBadge);
            }

            const spBtn = document.createElement('button');
            spBtn.type = 'button';
            spBtn.style.cssText = 'background:none;border:1px solid var(--border);border-radius:50%;width:28px;height:28px;cursor:pointer;font-size:0.78em;display:flex;align-items:center;justify-content:center;';
            spBtn.textContent = '🔊';
            spBtn.onclick = () => speakDirect(w.eng, null, 'en');
            right.appendChild(spBtn);

            if (!isMastered) {
                const practiceBtn = document.createElement('button');
                practiceBtn.type = 'button';
                practiceBtn.style.cssText = 'background:var(--danger);color:white;border:none;border-radius:10px;padding:4px 8px;font-size:0.72em;cursor:pointer;font-weight:700;white-space:nowrap;';
                practiceBtn.textContent = '开练';
                practiceBtn.onclick = () => startWeakWordDrill(w.eng, w.cn);
                right.appendChild(practiceBtn);
            }

            const toggleBtn = document.createElement('button');
            toggleBtn.type = 'button';
            toggleBtn.style.cssText = 'background:none;border:1px solid var(--border);border-radius:8px;padding:3px 7px;font-size:0.68em;cursor:pointer;color:var(--text-sub);white-space:nowrap;';
            toggleBtn.textContent = isMastered ? '重练' : '标记掌握';
            toggleBtn.onclick = () => {
                let list = JSON.parse(localStorage.getItem('weak_words') || '[]');
                const idx = list.findIndex(ww => ww.eng === w.eng);
                if (idx > -1) {
                    list[idx].mastered = !isMastered;
                    if (!isMastered) {
                        list[idx].correctStreak = 2;
                        showToast(`✅ 已标记掌握："${w.eng}"`);
                    } else {
                        list[idx].correctStreak = 0;
                        showToast('🔄 已重新加入练习');
                    }
                    localStorage.setItem('weak_words', JSON.stringify(list));
                    renderStatsPanel();
                }
            };
            right.appendChild(toggleBtn);

            row.appendChild(right);
            return row;
        }

        function addWeakWordManually() {
            const eng = prompt('请输入要强化的英文词组：');
            if (!eng || !eng.trim()) return;
            const cn = prompt('对应的中文意思（可选）：') || '';
            recordWeakWord(eng.trim(), cn.trim(), 0, 'manual');
            renderStatsPanel();
            showToast('已添加到弱点词练习');
        }

        function startWeakWordDrill(eng, cn) {
            closeToolbox();
            toggleChat();
            if (!aiState.active) {
                document.getElementById('chatBody').innerHTML = '';
                aiState.active = true;
                aiState.score = 0;
                aiState.total = 0;
                updateChatProgress();
            }
            aiState.currentMode = 'weakword';
            aiState.currentTargetEng = eng;
            aiState.currentTargetCn = cn || '';
            addBotMsg(`专项练习弱点词！\n\n中文：${cn || '（请用英语说出这个词）'}\n\n请说英文 ↓`, [
                { text: '🔊 先听一遍', action: () => speakDirect(eng, null, 'en') },
            ], true);
            aiState.waitingForSpeech = true;
        }

        function initCultureTips() {
            document.querySelectorAll('.unit-card:not(.clone)').forEach(card => {
                const m = /^u(\d+)$/.exec(card.id);
                if (!m) return;
                const uid = parseInt(m[1], 10);
                if (uid > 16) return;
                const html = CULTURE_BY_UNIT[uid];
                if (!html || card.querySelector('.culture-tip')) return;
                const combo = card.querySelector('.combo-box');
                if (!combo) return;
                const wrap = document.createElement('div');
                wrap.className = 'culture-tip';
                wrap.innerHTML = '<button type="button" class="culture-toggle" onclick="this.nextElementSibling.classList.toggle(\'hidden\'); this.classList.toggle(\'open\')"><span class="fold-chevron" aria-hidden="true">▶</span><span class="toggle-label">⚠️ 文化提示（避免尴尬）</span></button><div class="culture-body hidden">' + html + '</div>';
                const anchor = card.querySelector('.reply-hint') || combo;
                anchor.insertAdjacentElement('afterend', wrap);
            });
        }

        function injectUsedTodayRows() {
            for (let n = 1; n <= 16; n++) {
                const card = document.getElementById(`u${n}`);
                if (!card) continue;
                const combo = card.querySelector('.combo-box');
                if (!combo || combo.querySelector('.used-today-row')) continue;
                const row = document.createElement('div');
                row.className = 'used-today-row';
                row.innerHTML = '<button type="button" class="used-today-btn" onclick="markUsedToday(' + n + ', this)">✅ 我今天用上了这句</button><span class="used-count" id="used-count-' + n + '"></span>';
                combo.appendChild(row);
            }
        }

        function initShakeDetect() {
            if (!window.DeviceMotionEvent) return;
            if (typeof DeviceMotionEvent.requestPermission === 'function') {
                document.addEventListener('click', function askPermission() {
                    DeviceMotionEvent.requestPermission()
                        .then(state => {
                            if (state === 'granted') attachShakeListener();
                        })
                        .catch(() => {});
                    document.removeEventListener('click', askPermission);
                }, { once: true });
            } else {
                attachShakeListener();
            }
        }

        function attachShakeListener() {
            let lastX = 0, lastY = 0, lastZ = 0;
            let lastShakeTime = 0;
            const THRESHOLD = 20;
            const COOLDOWN = 2000;

            window.addEventListener('devicemotion', (e) => {
                const acc = e.accelerationIncludingGravity;
                if (!acc) return;

                const deltaX = Math.abs(acc.x - lastX);
                const deltaY = Math.abs(acc.y - lastY);
                const deltaZ = Math.abs(acc.z - lastZ);
                lastX = acc.x; lastY = acc.y; lastZ = acc.z;

                const now = Date.now();
                if ((deltaX + deltaY + deltaZ) > THRESHOLD && (now - lastShakeTime) > COOLDOWN) {
                    lastShakeTime = now;
                    const overlay = document.getElementById('emergencyOverlay');
                    if (!overlay) return;
                    if (!overlay.classList.contains('active')) {
                        toggleEmergency();
                        triggerHaptic();
                        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
                    }
                }
            });
        }

        window.onload = function() {
            document.getElementById('year').innerText = new Date().getFullYear();
            loadTheme();
            if (localStorage.getItem('font_large')) {
                document.documentElement.style.fontSize = '20px';
                const fb = document.getElementById('fontSizeBtn');
                if (fb) fb.style.color = 'var(--primary)';
            }
            
            // 🚀 1. 界面文案更新
            updateUIStrings();
            initDailyRec();

            injectExtraChips();
            loadCustomChips();
            initChipCollapse();
            initReplyHints();
            initCultureTips();
            loadUsageData();
            recordDailyVisitOnLoad();
            injectSmartKeywords();
            injectShowCardDOM();
            injectChatDOM();
            injectToolboxDOM(); 
            initSpeechRecognition();
            checkMonthlyReport(); 
            
            // 🚀 2. 硬核注入喇叭 (保证克隆前有 onclick)
            injectLogicButtons();
            injectUsedTodayRows();
            for (let i = 1; i <= 16; i++) renderUsedCount(i);

            // 🚀 3. 例句区按钮结构（须在克隆循环前完成，避免 clone 仍是旧 DOM）
            rebuildActionButtons();

            // 🚀 4. 排序 + 无限循环
            autoSortUnits();

            for (let i = 1; i <= 16; i++) {
                if (document.getElementById(`u${i}`)) {
                    restoreSelectionRandom(i, 1);
                    restoreSelectionRandom(i, 2);
                }
            }
            refreshAllComboBoxes();

            setTimeout(() => { initBubbleTip(); }, 1000);
            initScrollHints();
            setTimeout(initFirstVisitOnboarding, 500);
            addFloatingControls(); 
            startSmartSearchAnimation();
            injectShareButtons();
            injectRecordingButtons();
            refreshInfiniteLoopClones();
            initNavInfiniteLoop();
            initPinHandlers();
            setAmbushEnabled(true);
            renderHeaderProgressBadges();
            initAmbushSystem();
            for (let i = 1; i <= 16; i++) renderProgressRing(i, true);
            evaluateSceneAchievements();
            initChipLongPress();
            initQuizModeGestures();

            handleSceneDeepLink();
            
            resetIdleTimer();
            document.addEventListener('touchstart', onUserActivityForIdleBubble, { passive: true });
            document.addEventListener('click', onUserActivityForIdleBubble);
            document.addEventListener('scroll', onUserActivityForIdleBubble, true);

            initShakeDetect();

            const searchBoxEl = document.getElementById('searchBox');
            if (searchBoxEl) {
                searchBoxEl.addEventListener('keydown', e => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        submitSearch();
                        return;
                    }
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        hideSearchHistoryDropdown();
                        if (searchBoxEl.value.trim()) {
                            clearSearchInputOnly();
                        } else {
                            searchBoxEl.blur();
                        }
                    }
                });
            }
            initSearchHistoryUi();
            updateCardNavButtons();
        };

        // --- 🚀 新功能：文案更新 ---
        function updateUIStrings() {
            document.querySelectorAll('.combo-title').forEach(el => {
                // 替换旧文案，保留小火箭
                el.innerHTML = el.innerHTML.replace('逻辑构造', '完整句子（示例）');
            });
        }

        function getStepSentenceEnglish(unitNum, stepNum) {
            const el = document.getElementById(`u${unitNum}-s${stepNum}-word`);
            if (!el) return '';
            const sent = el.closest('.english-sentence');
            if (!sent) return '';
            return sent.innerText.replace(/\s+/g, ' ').trim();
        }

        function buildFullComboEnglish(unitNum) {
            const s1 = getStepSentenceEnglish(unitNum, 1);
            const s2 = getStepSentenceEnglish(unitNum, 2);
            if (!s1 && !s2) return '';
            if (!s1) return s2;
            if (!s2) return s1;
            switch (unitNum) {
                case 1: {
                    const a = s1.replace(/\.$/, '');
                    const b = s2.replace(/\.$/, '');
                    return `${a}. ${b}, nice to meet you.`;
                }
                case 3:
                    return `Sorry to bother you, ${s1.charAt(0).toLowerCase()}${s1.slice(1)} ${s2}`;
                case 7: {
                    const on = s2.replace(/\.$/, '');
                    return `No need to split. ${on} tonight.`;
                }
                case 8: {
                    const m = s2.match(/^We should\s+(.+?)\s*\.?\s*$/i);
                    if (m) return `Long time no see! We should ${m[1]} sometime.`;
                    return `${s1.replace(/\.$/, '')}. ${s2}`;
                }
                case 10: {
                    let tail = s2.trim();
                    if (tail.endsWith('.')) tail = tail.slice(0, -1) + '!';
                    else if (!/[.!?]$/.test(tail)) tail += '!';
                    return `Help! ${s1.replace(/\.$/, '')}. ${tail}`;
                }
                case 11:
                    return `Sorry, ${s2.replace(/\.$/, '')}. ${s1}`;
                case 13: {
                    const a = s1.replace(/\.$/, '');
                    const t = s2.replace(/\.$/, '');
                    return `${a}. ${t}, please.`;
                }
                case 14: {
                    const a = s1.replace(/\.$/, '');
                    const open = a.charAt(0).toLowerCase() + a.slice(1);
                    const b = s2.replace(/\.$/, '');
                    return `Hi, ${open}. ${b}. Can you send someone to fix it?`;
                }
                case 15: {
                    const a = s1.replace(/\.$/, '');
                    const b = s2.replace(/\.$/, '');
                    return `Hi, ${a}. ${b}, can I show you?`;
                }
                case 16: {
                    const a = s1.replace(/\.$/, '');
                    return `Hi, ${a}. ${s2}`;
                }
                default:
                    return `${s1.replace(/\.$/, '')}. ${s2}`;
            }
        }

        function getStepSentenceChinese(unitNum, stepNum) {
            const el = document.getElementById(`u${unitNum}-s${stepNum}-trans`);
            if (!el) return '';
            return el.innerText.replace(/\s+/g, ' ').trim();
        }

        function stripCnSentenceEnd(s) {
            return String(s || '').replace(/[.。!！?？]\s*$/, '').trim();
        }

        function buildFullComboChinese(unitNum) {
            const s1 = getStepSentenceChinese(unitNum, 1);
            const s2 = getStepSentenceChinese(unitNum, 2);
            if (!s1 && !s2) return '';
            if (!s1) return s2;
            if (!s2) return s1;
            switch (unitNum) {
                case 1: {
                    const a = stripCnSentenceEnd(s1);
                    const b = stripCnSentenceEnd(s2);
                    return `${a}。${b}，很高兴认识你。`;
                }
                case 3: {
                    const mid = stripCnSentenceEnd(s1);
                    const punct = /吗$/.test(mid) ? '？' : '。';
                    return `抱歉打扰，${mid}${punct}${stripCnSentenceEnd(s2)}。`;
                }
                case 7: {
                    const on = stripCnSentenceEnd(s2);
                    return `不用分了，今晚${on}。`;
                }
                case 8: {
                    const m = s2.match(/^我们应该\s*(.+?)\s*[。.]?\s*$/);
                    if (m) return `好久不见！我们应该${m[1]}。`;
                    return `${stripCnSentenceEnd(s1)}。${s2}`;
                }
                case 10: {
                    let tail = s2.trim();
                    if (tail.endsWith('。')) tail = tail.slice(0, -1) + '！';
                    else if (!/[。！!？?]$/.test(tail)) tail += '！';
                    return `救命！${stripCnSentenceEnd(s1)}。${tail}`;
                }
                case 11:
                    return `抱歉，${stripCnSentenceEnd(s2)}。${s1}`;
                case 13: {
                    const a = stripCnSentenceEnd(s1);
                    const t = stripCnSentenceEnd(s2);
                    return `${a}。${t}，谢谢。`;
                }
                case 14: {
                    const a = stripCnSentenceEnd(s1);
                    const b = stripCnSentenceEnd(s2);
                    return `嗨，${a}。${b}。能派人来修吗？`;
                }
                case 15: {
                    const a = stripCnSentenceEnd(s1);
                    const b = stripCnSentenceEnd(s2);
                    return `嗨，${a}。${b}，能给你看一下吗？`;
                }
                case 16: {
                    const a = stripCnSentenceEnd(s1);
                    return `嗨，${a}。${s2}`;
                }
                default:
                    return `${stripCnSentenceEnd(s1)}。${s2}`;
            }
        }

        function formatComboDisplay(plain) {
            if (!plain) return '';
            if (plain.indexOf('"') >= 0) return plain;
            return `"${plain}"`;
        }

        function comboTextForSpeech(el) {
            let t = (el && el.innerText ? el.innerText : '').trim();
            if (t.length >= 2 && t[0] === '"' && t[t.length - 1] === '"') t = t.slice(1, -1).trim();
            return t;
        }

        function refreshComboBox(unitNum) {
            const card = document.getElementById(`u${unitNum}`);
            if (!card) return;
            const textEl = card.querySelector('.combo-text');
            if (!textEl) return;
            textEl.textContent = formatComboDisplay(buildFullComboEnglish(unitNum));
        }

        function refreshAllComboBoxes() {
            for (let i = 1; i <= 16; i++) refreshComboBox(i);
        }

        // --- 🚀 核心修复：硬核注入底部喇叭 ---
        function injectLogicButtons() {
            const boxes = document.querySelectorAll('.combo-box');
            boxes.forEach(box => {
                const oldBtn = box.querySelector('.combo-audio-btn');
                if (oldBtn) oldBtn.remove();
                const newBtn = document.createElement('button');
                newBtn.className = 'combo-audio-btn';
                newBtn.innerHTML = '🔊'; 
                newBtn.style.zIndex = "10"; 
                // 直接写入属性，克隆免疫
                newBtn.setAttribute('onclick', 'handleLogicClick(event, this)');
                box.appendChild(newBtn);
            });
        }

        // --- 🚀 全局处理函数 ---
        window.handleLogicClick = function(e, btn) {
            e.stopPropagation();
            if(navigator.vibrate) navigator.vibrate(15);
            btn.style.transform = "scale(0.9)";
            setTimeout(() => btn.style.transform = "scale(1)", 150);
            const container = btn.closest('.combo-box');
            if (container) {
                const card = container.closest('.unit-card');
                if (card && card.id && /^u\d+$/.test(card.id)) {
                    const un = parseInt(card.id.replace('u', ''), 10);
                    if (!isNaN(un)) {
                        incrementUsage(un);
                        bumpListenEngagement(un);
                    }
                }
                const textEl = container.querySelector('.combo-text');
                if (textEl) speakDirect(comboTextForSpeech(textEl), null, 'en');
            }
        }

        // --- 气泡逻辑 ---
        function initBubbleTip(targetCard) {
            if (!targetCard) targetCard = document.querySelector('#content-area .unit-card:not(.clone)');
            if (!targetCard) return;
            const wrapper = targetCard.querySelector('.step-container .chips-container .add-btn-wrapper');
            if (wrapper) {
                if(wrapper.querySelector('.bubble-tip')) return;
                const bubble = document.createElement('div');
                bubble.className = 'bubble-tip';
                bubble.innerText = '没找到你想要的？现在可以点击添加！';
                wrapper.appendChild(bubble);
                setTimeout(() => { dismissBubble(bubble); }, 15000);
            }
        }
        function dismissBubble(element) { if(element) { element.classList.add('fade-out'); setTimeout(() => { element.remove(); }, 600); } }

        // --- 场景搜索引导 ---
        function startSmartSearchAnimation() {
            const input = document.getElementById('searchBox');
            if (!input) return;

            const BASE_PROMPTS = [
                { t: "对方说了什么完全没懂？", k: "没听懂" },
                { t: "突然内急到处找厕所？", k: "内急" },
                { t: "买错了想退怎么开口？", k: "退货" },
                { t: "收到取件通知但不会说？", k: "快递" },
                { t: "在外面头疼发烧找药？", k: "头疼" },
                { t: "说英语老被人听错？", k: "发音" },
                { t: "房东电话你听不懂在说啥？", k: "报修" },
                { t: "AA还是请客，怎么提？", k: "买单" },
                { t: "需要帮助但慌了不知说啥？", k: "救命" }
            ];

            const HOUR_PROMPTS = {
                morning: [
                    { t: "上班地铁叫车不会跟司机说？", k: "打车" },
                    { t: "刚搬来还没跟邻居打过招呼？", k: "邻居" },
                    { t: "要去银行办事先练一遍？", k: "银行" }
                ],
                noon: [
                    { t: "对着菜单脑子空白怎么点？", k: "点餐" },
                    { t: "服务员来了不知道说啥？", k: "餐厅" },
                    { t: "和同事一起吃谁买单？", k: "AA" },
                    { t: "想续杯但不好意思开口？", k: "点餐" }
                ],
                afternoon: [
                    { t: "超市结账刷不了卡怎么说？", k: "结账" },
                    { t: "买的东西回家发现坏了？", k: "退货" },
                    { t: "想预约理发不知道打电话说啥？", k: "预约" },
                    { t: "银行柜员一开口就懵了？", k: "银行" }
                ],
                evening: [
                    { t: "晚上聚餐朋友找你AA？", k: "聚餐" },
                    { t: "偶遇老朋友叙旧怎么开场？", k: "叙旧" },
                    { t: "饭局上想说「我请」？", k: "请客" }
                ],
                night: [
                    { t: "深夜打Uber回家怎么跟司机说？", k: "打车" },
                    { t: "半夜身体不舒服找急救？", k: "救命" },
                    { t: "找不到路了怎么问人？", k: "问路" }
                ]
            };

            const WEEKDAY_PROMPTS = {
                0: { t: "周日去取了上周的包裹没？", k: "快递" },
                1: { t: "周一适合预约本周医生/理发", k: "预约" },
                5: { t: "周五聚餐季来了，AA还是请客？", k: "买单" },
                6: { t: "周六是购物日，结账英语备好了吗？", k: "结账" }
            };

            const hour = new Date().getHours();
            const day = new Date().getDay();

            let pool = [...BASE_PROMPTS];

            if (hour >= 5 && hour < 10) pool = [...HOUR_PROMPTS.morning, ...pool];
            else if (hour >= 11 && hour < 14) pool = [...HOUR_PROMPTS.noon, ...pool];
            else if (hour >= 14 && hour < 18) pool = [...HOUR_PROMPTS.afternoon, ...pool];
            else if (hour >= 18 && hour < 21) pool = [...HOUR_PROMPTS.evening, ...pool];
            else pool = [...HOUR_PROMPTS.night, ...pool];

            if (WEEKDAY_PROMPTS[day]) pool.unshift(WEEKDAY_PROMPTS[day]);

            const seen = new Set();
            pool = pool.filter(p => {
                if (seen.has(p.k)) return false;
                seen.add(p.k);
                return true;
            });
            const tutorialBoost = { t: '第一次使用本网站？', k: '使用教程' };
            for (let b = 0; b < 5; b++) pool.push({ t: tutorialBoost.t, k: tutorialBoost.k });
            pool.sort(() => Math.random() - 0.5);

            let idx = 0;
            updatePlaceholder();

            const timer = setInterval(() => {
                if (document.activeElement === input && input.value !== '') return;
                if (document.activeElement === input) return;
                input.classList.add('fade-text');
                setTimeout(() => {
                    idx = (idx + 1) % pool.length;
                    updatePlaceholder();
                    input.classList.remove('fade-text');
                }, 500);
            }, 60000);

            window.addEventListener('beforeunload', () => clearInterval(timer));

            function updatePlaceholder() {
                const item = pool[idx];
                input.setAttribute('placeholder', `${item.t}  → 搜「${item.k}」`);
            }
        }

        // --- 其他基础逻辑 ---
        function speakWholeSentence(wordId, p, x, opts) {
            opts = opts || {};
            const um = /^u(\d+)-s\d+-word$/.exec(wordId);
            if (um) {
                const un = parseInt(um[1], 10);
                incrementUsage(un);
                bumpListenEngagement(un);
            }
            const wordEl = document.getElementById(wordId);
            if (!wordEl) return;
            const textContent = wordEl.closest('.text-content');
            if (!textContent) return;
            const engEl = textContent.querySelector('.english-sentence');
            const cnEl = textContent.querySelector('.translation');
            const engText = engEl ? engEl.innerText : '';
            const cnText = cnEl ? cnEl.innerText : '';
            if (opts.englishOnly === false) {
                speakSequence(engText, cnText);
                return;
            }
            speakDirect(engText, null, 'en');
        }

        function getChipUpdateData(chip) {
            const attr = chip.getAttribute && chip.getAttribute('onclick');
            if (attr) {
                const re = /updateUnit\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*'((?:\\'|[^'])*)'\s*,\s*'((?:\\'|[^'])*)'\s*,\s*'((?:\\'|[^'])*)'\s*,\s*'((?:\\'|[^'])*)'\s*,\s*this\s*\)/;
                const m = attr.match(re);
                if (m) {
                    const uq = s => s.replace(/\\'/g, "'");
                    return { eng: uq(m[3]), cn: uq(m[4]), p: uq(m[5]), sf: uq(m[6]) };
                }
            }
            if (chip.dataset && chip.dataset.eng !== undefined) {
                return {
                    eng: chip.dataset.eng,
                    cn: chip.dataset.cn || '',
                    p: chip.dataset.prefix || '',
                    sf: chip.dataset.suffix || ''
                };
            }
            return null;
        }

        function initChipCollapse() {
            document.querySelectorAll('.chips-container').forEach(container => {
                reinitContainerCollapse(container);
            });
        }

        function reinitContainerCollapse(container) {
            if (!container) return;
            container.querySelectorAll('.chip-toggle-btn').forEach(b => b.remove());
            container.querySelectorAll('.chip:not(.add-chip-btn)').forEach(c => c.classList.remove('chip-hidden'));
            const chips = Array.from(container.querySelectorAll('.chip:not(.add-chip-btn)'));
            if (chips.length <= CHIP_DEFAULT_SHOW) return;
            chips.forEach((chip, idx) => { if (idx >= CHIP_DEFAULT_SHOW) chip.classList.add('chip-hidden'); });
            const toggleBtn = document.createElement('button');
            toggleBtn.type = 'button';
            toggleBtn.className = 'chip-toggle-btn';
            toggleBtn.innerText = `▾ 显示更多 (${chips.length - CHIP_DEFAULT_SHOW})`;
            toggleBtn.onclick = () => toggleChips(container, toggleBtn, chips);
            const wrapper = container.querySelector('.add-btn-wrapper');
            container.insertBefore(toggleBtn, wrapper || null);
        }

        function toggleChips(container, btn, chips) {
            const isExpanded = btn.dataset.expanded === '1';
            chips.forEach((chip, idx) => {
                if (idx >= CHIP_DEFAULT_SHOW) chip.classList.toggle('chip-hidden', isExpanded);
            });
            btn.dataset.expanded = isExpanded ? '' : '1';
            btn.innerText = isExpanded
                ? `▾ 显示更多 (${chips.length - CHIP_DEFAULT_SHOW})`
                : '▴ 收起';
        }

        const REPLY_HINTS_BY_UNIT = {
            1: [
                { en: 'Nice to meet you too!', cn: '我也很高兴认识你！', speak: 'Nice to meet you too!' },
                { en: 'Welcome to the building!', cn: '欢迎入住！', speak: 'Welcome to the building!' }
            ],
            2: [
                { en: 'Sure! It is right down the hall.', cn: '当然！就在走廊尽头。', speak: 'Sure! It is right down the hall.' },
                { en: 'Sorry, I am not sure.', cn: '抱歉我不太确定。', speak: 'Sorry, I am not sure.' }
            ],
            3: [
                { en: 'Of course, go ahead!', cn: '当然，请便！', speak: 'Of course, go ahead!' },
                { en: 'Sorry, it is occupied.', cn: '不好意思，有人用。', speak: 'Sorry, it is occupied.' }
            ],
            4: [
                { en: 'Can I see your ID?', cn: '能看一下您的证件吗？', speak: 'Can I see your ID?' },
                { en: 'Please fill out this form.', cn: '请填这张表。', speak: 'Please fill out this form.' }
            ],
            5: [
                { en: 'Credit or debit?', cn: '信用卡还是借记卡？', speak: 'Credit or debit?' },
                { en: 'Do you have a rewards card?', cn: '有会员卡吗？', speak: 'Do you have a rewards card?' }
            ],
            6: [
                { en: 'How would you like that cooked?', cn: '您要几分熟？', speak: 'How would you like that cooked?' },
                { en: 'Any allergies?', cn: '有过敏食物吗？', speak: 'Any allergies?' }
            ],
            7: [
                { en: 'Sounds good!', cn: '好啊！', speak: 'Sounds good!' },
                { en: 'Let me get the check.', cn: '我来买单。', speak: 'Let me get the check.' }
            ],
            8: [
                { en: 'Great to see you!', cn: '见到你真高兴！', speak: 'Great to see you!' },
                { en: 'We should catch up soon.', cn: '咱们该聚聚了。', speak: 'We should catch up soon.' }
            ],
            9: [
                { en: 'Got it.', cn: '好的。', speak: 'Got it.' },
                { en: 'That will be about 20 minutes.', cn: '大概要20分钟。', speak: 'That will be about 20 minutes.' }
            ],
            10: [
                { en: 'Stay calm, help is on the way.', cn: '别慌，帮助来了。', speak: 'Stay calm, help is on the way.' },
                { en: 'Can you describe the pain?', cn: '能描述一下疼痛吗？', speak: 'Can you describe the pain?' }
            ],
            11: [
                { en: 'Oh sure! Let me slow down.', cn: '当然！我说慢一点。', speak: 'Oh sure! Let me slow down.' },
                { en: 'No problem, here you go.', cn: '没问题，给你看。', speak: 'No problem, here you go.' }
            ],
            12: [
                { en: 'Do you have your receipt?', cn: '您有收据吗？', speak: 'Do you have your receipt?' },
                { en: 'I will get the manager.', cn: '我去叫经理。', speak: 'I will get the manager.' }
            ],
            13: [
                { en: 'We have an opening at 3 PM.', cn: '下午3点有空档。', speak: 'We have an opening at 3 PM.' },
                { en: 'I will put you down for Tuesday.', cn: '帮您定在周二。', speak: 'I will put you down for Tuesday.' }
            ],
            14: [
                { en: 'I will send someone today.', cn: '我今天安排人过去。', speak: 'I will send someone today.' },
                { en: 'Can you send a photo?', cn: '能发张照片吗？', speak: 'Can you send a photo?' }
            ],
            15: [
                { en: 'Sign here, please.', cn: '请在这里签字。', speak: 'Sign here, please.' },
                { en: 'Wait in line over there.', cn: '请在那边排队。', speak: 'Wait in line over there.' }
            ],
            16: [
                { en: 'This one is popular.', cn: '这个很常用。', speak: 'This one is popular.' },
                { en: 'Ask the pharmacist if unsure.', cn: '不确定可以问药剂师。', speak: 'Ask the pharmacist if you are unsure.' }
            ]
        };

        function initReplyHints() {
            document.querySelectorAll('.unit-card:not(.clone)').forEach(card => {
                const m = /^u(\d+)$/.exec(card.id);
                if (!m || card.querySelector('.reply-hint')) return;
                const uid = parseInt(m[1], 10);
                const items = REPLY_HINTS_BY_UNIT[uid];
                if (!items) return;
                const combo = card.querySelector('.combo-box');
                if (!combo) return;
                const wrap = document.createElement('div');
                wrap.className = 'reply-hint';
                wrap.style.marginTop = '10px';
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'reply-toggle';
                btn.innerHTML = '<span class="fold-chevron" aria-hidden="true">▶</span><span class="reply-toggle-label">对方可能回复</span>';
                const list = document.createElement('div');
                list.className = 'reply-list hidden';
                items.forEach(it => {
                    const row = document.createElement('div');
                    row.className = 'reply-item';
                    row.innerHTML = `<span class="reply-en"></span><span class="reply-cn"></span>`;
                    row.querySelector('.reply-en').innerText = it.en;
                    row.querySelector('.reply-cn').innerText = it.cn;
                    const sp = document.createElement('button');
                    sp.type = 'button';
                    sp.innerHTML = '🔊';
                    sp.onclick = () => speakDirect(it.speak || it.en, null, 'en');
                    row.appendChild(sp);
                    list.appendChild(row);
                });
                btn.onclick = () => {
                    list.classList.toggle('hidden');
                    btn.classList.toggle('open', !list.classList.contains('hidden'));
                };
                wrap.appendChild(btn);
                wrap.appendChild(list);
                combo.insertAdjacentElement('afterend', wrap);
            });
        }

        const LS_PROGRESS_META = 'progress_meta_v1';
        const LS_SCENE_MASTERY = 'scene_mastery_v1';

        function todayYMD() {
            const d = new Date();
            const p = n => (n < 10 ? '0' : '') + n;
            return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
        }

        function startOfTomorrow() {
            const d = new Date();
            d.setDate(d.getDate() + 1);
            d.setHours(6, 0, 0, 0);
            return d.getTime();
        }

        function formatWeakNextReview(ts) {
            if (ts == null) return '';
            const now = Date.now();
            if (ts <= now) return '今日可巩固';
            const d = new Date(ts);
            return `建议下次：${d.getMonth() + 1}/${d.getDate()}`;
        }

        function getAchievementsUnlocked() {
            try { return JSON.parse(localStorage.getItem(LS_ACHIEVEMENTS) || '{}'); } catch (e) { return {}; }
        }

        function unlockAchievement(id) {
            const o = getAchievementsUnlocked();
            if (o[id]) return false;
            o[id] = Date.now();
            try { localStorage.setItem(LS_ACHIEVEMENTS, JSON.stringify(o)); } catch (e) {}
            const def = ACHIEVEMENT_DEFS.find(a => a.id === id);
            showToast(`成就解锁：${def ? def.icon + ' ' + def.title : id}`);
            triggerHaptic();
            renderHeaderProgressBadges();
            return true;
        }

        function countUnitsFullyMastered() {
            const m = loadSceneMastery();
            let c = 0;
            for (let i = 1; i <= 16; i++) {
                const d = m[String(i)] || {};
                if (d.listen && d.chip && d.speak) c++;
            }
            return c;
        }

        function evaluateSceneAchievements() {
            const meta = loadProgressMeta();
            if ((meta.totalSpeakCompletions || 0) >= 1) unlockAchievement('debut');
            const n = countUnitsFullyMastered();
            if (n >= 1) unlockAchievement('comm_novice');
            if (n >= 8) unlockAchievement('comm_expert');
            if (n >= 16) unlockAchievement('grand_slam');
            const m = loadSceneMastery();
            for (let u = 1; u <= 16; u++) {
                const d = m[String(u)] || {};
                if (d.listen && d.chip && d.speak) unlockAchievement('scene_u' + u);
            }
        }

        function openAchievementsModal() {
            triggerHaptic();
            const modal = document.getElementById('achievementsModal');
            const body = document.getElementById('achievementsModalBody');
            if (!modal || !body) return;
            const ach = getAchievementsUnlocked();
            body.innerHTML = ACHIEVEMENT_DEFS.map(def => {
                const ok = !!ach[def.id];
                return `<div class="ach-row ${ok ? 'ach-unlocked' : 'ach-locked'}"><span class="ach-ico">${def.icon}</span><div class="ach-text"><div class="ach-title">${def.title}${ok ? ' ✓' : ''}</div><div class="ach-desc">${def.desc}</div></div></div>`;
            }).join('');
            modal.style.display = 'flex';
        }

        function closeAchievementsModal() {
            const modal = document.getElementById('achievementsModal');
            if (modal) modal.style.display = 'none';
        }

        function openStreakModal() {
            triggerHaptic();
            const modal = document.getElementById('streakModal');
            const body = document.getElementById('streakModalBody');
            if (!modal || !body) return;
            const streak = JSON.parse(localStorage.getItem('streak_data') || '{"lastDate":"","count":0,"best":0}');
            const c = streak.count || 0;
            const b = streak.best || 0;
            const meta = loadProgressMeta();
            const dc = meta.dailySpeakCompletions || 0;
            const tc = meta.totalSpeakCompletions || 0;
            const todayOk = dc >= 1;
            const todayBlock = todayOk
                ? `<div class="streak-modal-today streak-modal-today--ok"><span class="streak-modal-today-ic" aria-hidden="true">✓</span><div><strong>今日完成</strong><div class="streak-modal-today-sub">今日跟读 ${dc} 次 · 累计完成 ${tc} 次</div></div></div>`
                : `<div class="streak-modal-today streak-modal-today--no"><span class="streak-modal-today-ic" aria-hidden="true">○</span><div><strong>今日尚未完成</strong><div class="streak-modal-today-sub">完成至少 1 次成功跟读后，将显示「今日完成」并计入连续学习条件（同一天多次只计一次连续天）。</div></div></div>`;
            body.innerHTML = `${todayBlock}<p style="margin:0 0 10px;"><span class="streak-modal-inline-fire" aria-hidden="true">🔥</span> <strong>连续学习 ${c} 天</strong></p><p style="margin:0 0 10px;">🏆 历史最高：<strong>${b} 天</strong></p><p style="margin:0;color:var(--text-sub);font-size:0.92em;">每天打开应用并完成至少一次跟读即可累计连续天数（同一天多次练习只计一次）。</p>`;
            modal.style.display = 'flex';
        }

        function closeStreakModal() {
            const modal = document.getElementById('streakModal');
            if (modal) modal.style.display = 'none';
        }

        function escapeHtmlMessage(s) {
            const d = document.createElement('div');
            d.textContent = s == null ? '' : String(s);
            return d.innerHTML;
        }

        function openMessageModal(title, messageText) {
            const modal = document.getElementById('messageModal');
            const titleEl = document.getElementById('messageModalTitle');
            const body = document.getElementById('messageModalBody');
            if (!modal || !body) {
                triggerHaptic();
                showToast(messageText || title || '');
                return;
            }
            triggerHaptic();
            if (titleEl) titleEl.textContent = title || '提示';
            body.innerHTML = `<p style="margin:0;">${escapeHtmlMessage(messageText)}</p>`;
            modal.style.display = 'flex';
        }

        function closeMessageModal() {
            const m = document.getElementById('messageModal');
            if (m) m.style.display = 'none';
        }

        const MSG_SPEECH_UNSUPPORTED = '当前浏览器不支持语音识别，或未授予麦克风权限。请使用 Chrome / Edge 等浏览器，在地址栏旁允许麦克风，并尽量通过 https 或 localhost 访问本站。';
        const MSG_GEO_UNSUPPORTED = '当前浏览器不支持地理位置，或你拒绝了定位权限。若需使用「说出我的位置」类功能，请在浏览器设置中允许本站访问位置。';

        function openGoalsModal() {
            triggerHaptic();
            const modal = document.getElementById('goalsModal');
            const body = document.getElementById('goalsModalBody');
            if (!modal || !body) return;
            body.innerHTML = EXIT_GOALS.map(g => {
                const chips = g.units.map(u => {
                    const card = document.getElementById(`u${u}`);
                    const name = card ? card.getAttribute('data-name') : `场景${u}`;
                    return `<button type="button" class="exit-goal-chip" data-unit="${u}">${name}</button>`;
                }).join('');
                return `<div class="exit-goal-block"><div class="exit-goal-title">${g.title}</div><p class="exit-goal-blurb">${g.blurb}</p><div class="exit-goal-chips">${chips}</div></div>`;
            }).join('');
            body.querySelectorAll('.exit-goal-chip').forEach(btn => {
                btn.onclick = () => {
                    const u = btn.getAttribute('data-unit');
                    modal.style.display = 'none';
                    scrollToUnit('u' + u);
                };
            });
            modal.style.display = 'flex';
        }

        function closeGoalsModal() {
            const modal = document.getElementById('goalsModal');
            if (modal) modal.style.display = 'none';
        }

        function getFavoriteUnits() {
            try {
                const arr = JSON.parse(localStorage.getItem(LS_FAVORITE_UNITS) || '[]');
                if (!Array.isArray(arr)) return [];
                return [...new Set(arr.map(Number).filter(u => u >= 1 && u <= 16))].sort((a, b) => a - b);
            } catch (e) {
                return [];
            }
        }

        function setFavoriteUnits(arr) {
            const clean = [...new Set((arr || []).map(Number).filter(u => u >= 1 && u <= 16))].sort((a, b) => a - b);
            try { localStorage.setItem(LS_FAVORITE_UNITS, JSON.stringify(clean)); } catch (e) {}
        }

        function applyUnitFavoriteButtonState(btn, unitNum) {
            const on = getFavoriteUnits().includes(unitNum);
            btn.textContent = on ? '取消收藏' : '收藏';
            btn.classList.toggle('unit-favorited', on);
            btn.setAttribute('aria-pressed', on ? 'true' : 'false');
            btn.title = on ? '点击取消收藏' : '加入我的收藏';
        }

        function toggleFavoriteUnitFromScene(unitNum) {
            triggerHaptic();
            let arr = getFavoriteUnits();
            const was = arr.includes(unitNum);
            if (was) arr = arr.filter(x => x !== unitNum);
            else arr = [...arr, unitNum].sort((a, b) => a - b);
            setFavoriteUnits(arr);
            document.querySelectorAll(`.unit-fav-btn[data-unit-num="${unitNum}"]`).forEach(b => applyUnitFavoriteButtonState(b, unitNum));
            renderHeaderProgressBadges();
            showToast(was ? '已取消收藏' : '已加入收藏');
        }

        function openFavoritesModal() {
            triggerHaptic();
            const modal = document.getElementById('favoritesModal');
            const body = document.getElementById('favoritesModalBody');
            if (!modal || !body) return;
            const ids = getFavoriteUnits();
            if (!ids.length) {
                body.innerHTML = '<p style="margin:0;color:var(--text-sub);line-height:1.55;">暂未收藏场景。在任意场景卡片标题右侧点「收藏」即可加入。</p>';
            } else {
                const chips = ids.map(u => {
                    const card = document.getElementById(`u${u}`);
                    const name = card ? card.getAttribute('data-name') : `场景${u}`;
                    return `<button type="button" class="exit-goal-chip fav-modal-chip" data-unit="${u}">${name}</button>`;
                }).join('');
                body.innerHTML = `<div class="exit-goal-chips" style="margin-top:4px;">${chips}</div>`;
                body.querySelectorAll('.fav-modal-chip').forEach(btn => {
                    btn.onclick = () => {
                        const u = btn.getAttribute('data-unit');
                        modal.style.display = 'none';
                        scrollToUnit('u' + u);
                    };
                });
            }
            modal.style.display = 'flex';
        }

        function closeFavoritesModal() {
            const modal = document.getElementById('favoritesModal');
            if (modal) modal.style.display = 'none';
        }

        function loadProgressMeta() {
            try { return JSON.parse(localStorage.getItem(LS_PROGRESS_META) || '{}'); } catch (e) { return {}; }
        }
        function saveProgressMeta(o) {
            try { localStorage.setItem(LS_PROGRESS_META, JSON.stringify(o)); } catch (e) {}
        }

        function loadSceneMastery() {
            try { return JSON.parse(localStorage.getItem(LS_SCENE_MASTERY) || '{}'); } catch (e) { return {}; }
        }
        function saveSceneMastery(obj) {
            try { localStorage.setItem(LS_SCENE_MASTERY, JSON.stringify(obj)); } catch (e) {}
        }

        function recordDailyVisitOnLoad() {
            const t = todayYMD();
            const meta = loadProgressMeta();
            if (meta.visitYMD !== t) {
                meta.visitYMD = t;
                meta.dailySpeakCompletions = 0;
            }
            meta.lastVisitYMD = t;
            saveProgressMeta(meta);
        }

        function syncLegacyChipToMastery(unitNum) {
            const m = loadSceneMastery();
            const id = String(unitNum);
            const key = `unit_progress_${unitNum}`;
            const touched = JSON.parse(localStorage.getItem(key) || '{}');
            const has = (touched[1]?.length || 0) + (touched[2]?.length || 0) > 0;
            if (has) {
                if (!m[id]) m[id] = {};
                if (!m[id].chip) {
                    m[id].chip = true;
                    saveSceneMastery(m);
                }
            }
        }

        function bumpListenEngagement(unitNum) {
            try {
                const n = parseInt(localStorage.getItem(LS_STATS_LISTEN_TOTAL) || '0', 10) + 1;
                localStorage.setItem(LS_STATS_LISTEN_TOTAL, String(n));
            } catch (e) {}
            if (unitNum) recordSceneListen(unitNum);
        }

        function recordSceneListen(unitNum) {
            if (!unitNum) return;
            const m = loadSceneMastery();
            const id = String(unitNum);
            if (!m[id]) m[id] = {};
            if (m[id].listen) return;
            m[id].listen = true;
            saveSceneMastery(m);
            renderProgressRing(unitNum);
        }

        function recordSceneMasteryChip(unitNum) {
            const m = loadSceneMastery();
            const id = String(unitNum);
            if (!m[id]) m[id] = {};
            m[id].chip = true;
            saveSceneMastery(m);
        }

        function recordSceneMasterySpeak(unitNum) {
            const m = loadSceneMastery();
            const id = String(unitNum);
            if (!m[id]) m[id] = {};
            m[id].speak = true;
            saveSceneMastery(m);
        }

        function recordSpeakActionCompleted(unitNum) {
            const t = todayYMD();
            let meta = loadProgressMeta();
            if (meta.visitYMD !== t) {
                meta.visitYMD = t;
                meta.dailySpeakCompletions = 0;
            }
            meta.dailySpeakCompletions = (meta.dailySpeakCompletions || 0) + 1;
            meta.totalSpeakCompletions = (meta.totalSpeakCompletions || 0) + 1;
            saveProgressMeta(meta);
            recordSceneMasterySpeak(unitNum);
            updateStreakOnPractice();
            renderProgressRing(unitNum);
        }

        function getUnitNumFromElement(el) {
            const card = el && el.closest ? el.closest('.unit-card:not(.clone)') : null;
            if (!card || !card.id) return null;
            const m = /^u(\d+)$/.exec(card.id);
            return m ? parseInt(m[1], 10) : null;
        }

        function recordChipTouched(unitNum, stepNum, engWord) {
            const key = `unit_progress_${unitNum}`;
            let touched = JSON.parse(localStorage.getItem(key) || '{}');
            if (!touched[stepNum]) touched[stepNum] = [];
            if (!touched[stepNum].includes(engWord)) touched[stepNum].push(engWord);
            localStorage.setItem(key, JSON.stringify(touched));
            recordSceneMasteryChip(unitNum);
            renderProgressRing(unitNum);
        }

        function renderProgressRing(unitNum, skipAchievements) {
            const container = document.getElementById(`u${unitNum}`);
            if (!container) return;
            const header = container.querySelector('.unit-header');
            if (!header) return;
            header.querySelector('.progress-ring')?.remove();
            syncLegacyChipToMastery(unitNum);
            const m = loadSceneMastery();
            const d = m[String(unitNum)] || {};
            let n = 0;
            if (d.listen) n++;
            if (d.chip) n++;
            if (d.speak) n++;
            let starsEl = header.querySelector('.scene-mastery-stars');
            if (!starsEl) {
                starsEl = document.createElement('span');
                starsEl.className = 'scene-mastery-stars';
                const lead = header.querySelector('.unit-header-lead');
                if (lead) lead.appendChild(starsEl);
                else {
                    const qr = header.querySelector('.qr-share-btn');
                    if (qr) header.insertBefore(starsEl, qr);
                    else header.appendChild(starsEl);
                }
            }
            const parts = [];
            for (let i = 0; i < 3; i++) {
                const on = i < n;
                parts.push(`<span class="${on ? 'scene-star-on' : 'scene-star-off'}">${on ? '★' : '☆'}</span>`);
            }
            starsEl.innerHTML = parts.join('');
            starsEl.title = `掌握进度：听 ${d.listen ? '✓' : '—'} · 点选词块 ${d.chip ? '✓' : '—'} · 跟读 ${d.speak ? '✓' : '—'}`;
            if (!skipAchievements) evaluateSceneAchievements();
        }

        function restoreSelectionRandom(unitNum, stepNum) {
            const el = document.getElementById(`u${unitNum}-s${stepNum}-chips`);
            if (!el) return;
            const chips = Array.from(el.querySelectorAll('.chip:not(.add-chip-btn)'));
            if (!chips.length) return;
            const randomChip = chips[Math.floor(Math.random() * chips.length)];
            const d = getChipUpdateData(randomChip);
            if (!d) return;
            updateUnit(unitNum, stepNum, d.eng, d.cn, d.p, d.sf, randomChip, false, true);
        }

        function initChipLongPress() {
            document.addEventListener('pointerdown', e => {
                const chip = e.target.closest('.chip:not(.add-chip-btn)');
                if (!chip || !chip.closest('.chips-container')) return;
                chipLongPressSuppress = false;
                chipHoldTimer = window.setTimeout(() => {
                    chipLongPressSuppress = true;
                    const enEl = chip.querySelector('.chip-en');
                    const text = (enEl ? enEl.innerText : chip.innerText).trim();
                    if (text) {
                        speakDirect(text, null, 'en');
                        showToast(`🔊 "${text}"`);
                        triggerHaptic();
                        const ch = chip.closest('.chips-container');
                        if (ch && ch.id) {
                            const um = /u(\d+)-s\d+-chips/.exec(ch.id);
                            if (um) bumpListenEngagement(parseInt(um[1], 10));
                        }
                    }
                }, 600);
            }, true);
            const clearHold = () => { if (chipHoldTimer) { clearTimeout(chipHoldTimer); chipHoldTimer = null; } };
            ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => document.addEventListener(ev, clearHold, true));
            document.addEventListener('click', e => {
                if (!chipLongPressSuppress) return;
                e.preventDefault();
                e.stopPropagation();
                setTimeout(() => { chipLongPressSuppress = false; }, 0);
            }, true);
        }

        function injectExtraChips() {
            for (let u = 1; u <= 13; u++) {
                for (let s = 1; s <= 2; s++) {
                    const container = document.getElementById(`u${u}-s${s}-chips`);
                    if (!container || !extraVocab[u] || !extraVocab[u][s]) continue;
                    const existing = Array.from(container.querySelectorAll('.chip:not(.add-chip-btn)')).map(c => {
                        const en = c.querySelector('.chip-en');
                        return en ? en.innerText : c.innerText;
                    });
                    const wrapper = container.querySelector('.add-btn-wrapper');
                    extraVocab[u][s].forEach(item => {
                        if (existing.includes(item.e)) return;
                        const btn = document.createElement('div');
                        btn.className = 'chip';
                        btn.dataset.eng = item.e;
                        btn.dataset.cn = item.c;
                        btn.innerHTML = `<span class="chip-en">${item.e}</span><span class="chip-cn">${item.c}</span>`;
                        btn.onclick = function() { updateUnit(u, s, item.e, item.c, '', '', this); };
                        if (wrapper) container.insertBefore(btn, wrapper);
                        else container.appendChild(btn);
                    });
                }
            }
        }
        function getSpacedRepetitionBoost(unitNum) {
            const key = `study_time_u${unitNum}`;
            const times = JSON.parse(localStorage.getItem(key) || '[]');
            if (!times.length) return 0;
            const last = times[times.length - 1];
            const daysSince = (Date.now() - last) / 86400000;
            if (daysSince >= 7) return 80;
            if (daysSince >= 3) return 55;
            if (daysSince >= 1) return 30;
            return 0;
        }

        function autoSortUnits() {
            const container = document.getElementById('content-area');
            const cards = Array.from(container.querySelectorAll('.unit-card:not(.clone)'));
            const hour = new Date().getHours();
            let timeWeights = {};
            if (hour >= 5 && hour < 10) { timeWeights = { 1: 50, 9: 40, 4: 30 }; }
            else if (hour >= 11 && hour < 14) { timeWeights = { 6: 50, 7: 40, 5: 30 }; }
            else if (hour >= 17 && hour < 21) { timeWeights = { 8: 50, 7: 40, 6: 30 }; }
            else if (hour >= 21 || hour < 4) { timeWeights = { 9: 60, 10: 50, 3: 40 }; }
            cards.sort((a, b) => {
                const idA = parseInt(a.id.replace('u', ''), 10);
                const idB = parseInt(b.id.replace('u', ''), 10);
                const pinA = pinnedUnits.includes(idA) ? 1000 : 0;
                const pinB = pinnedUnits.includes(idB) ? 1000 : 0;
                let scoreA = (usageData[idA] || 0) + pinA + (timeWeights[idA] || 0) + getSpacedRepetitionBoost(idA);
                let scoreB = (usageData[idB] || 0) + pinB + (timeWeights[idB] || 0) + getSpacedRepetitionBoost(idB);
                return scoreB - scoreA;
            });
            container.innerHTML = '';
            cards.forEach(card => container.appendChild(card));
            initInfiniteLoop(container, cards);
            renderReviewBadges();
        }
        function initInfiniteLoop(container, cards, opts) {
            opts = opts || {};
            const resetScroll = opts.resetScroll !== false;
            const savedScroll = container.scrollLeft;
            const margin = window.innerWidth * 0.075;
            container.querySelectorAll('.snap-spacer, .unit-card.clone').forEach(el => el.remove());
            if (cards.length < 2) {
                container.onscroll = null;
                return;
            }
            const firstCard = cards[0];
            const lastCard = cards[cards.length - 1];
            setTimeout(() => initBubbleTip(firstCard), 500);
            const cloneFirst = firstCard.cloneNode(true);
            const cloneLast = lastCard.cloneNode(true);
            [cloneFirst, cloneLast].forEach(el => {
                el.classList.add('clone');
                el.id = '';
                el.querySelectorAll('[id]').forEach(c => c.removeAttribute('id'));
            });
            const spacerStart = document.createElement('div');
            spacerStart.className = 'snap-spacer';
            const spacerEnd = document.createElement('div');
            spacerEnd.className = 'snap-spacer';
            container.insertBefore(spacerStart, container.firstChild);
            container.insertBefore(cloneLast, container.firstChild.nextSibling);
            container.appendChild(cloneFirst);
            container.appendChild(spacerEnd);
            let contentLoopIgnore = false;
            container.onscroll = () => {
                if (contentLoopIgnore) return;
                const sl = container.scrollLeft;
                const sw = container.scrollWidth;
                const cw = container.clientWidth;
                const buf = Math.max(12, Math.round(cw * 0.02));
                const maxSl = Math.max(0, sw - cw);
                const nearLeft = sl < buf;
                const nearRight = maxSl - sl < buf;
                const jumpTo = (x) => {
                    contentLoopIgnore = true;
                    container.style.scrollBehavior = 'auto';
                    container.scrollLeft = x;
                    requestAnimationFrame(() => {
                        setTimeout(() => {
                            container.style.scrollBehavior = 'smooth';
                            contentLoopIgnore = false;
                        }, 50);
                    });
                };
                if (nearLeft) {
                    jumpTo(lastCard.offsetLeft - container.offsetLeft - margin);
                } else if (nearRight) {
                    jumpTo(firstCard.offsetLeft - container.offsetLeft - margin);
                }
            };
            requestAnimationFrame(() => {
                container.style.scrollBehavior = 'auto';
                if (resetScroll) {
                    container.scrollLeft = firstCard.offsetLeft - container.offsetLeft - margin;
                } else {
                    const maxSl = Math.max(0, container.scrollWidth - container.clientWidth);
                    container.scrollLeft = Math.min(savedScroll, maxSl);
                }
                setTimeout(() => { container.style.scrollBehavior = 'smooth'; }, 50);
            });
        }
        function refreshInfiniteLoopClones() {
            const container = document.getElementById('content-area');
            if (!container) return;
            const cards = Array.from(container.querySelectorAll('.unit-card:not(.clone)'));
            if (cards.length < 2) return;
            initInfiniteLoop(container, cards, { resetScroll: false });
        }
        function initNavInfiniteLoop(opts) {
            opts = opts || {};
            const resetScroll = opts.resetScroll !== false;
            const nav = document.getElementById('navScroll');
            if (!nav) return;
            const saved = nav.scrollLeft;
            nav.querySelectorAll('.nav-snap-spacer, a.nav-btn.nav-clone').forEach(el => el.remove());
            const btns = Array.from(nav.querySelectorAll('a.nav-btn:not(.nav-clone)'));
            if (btns.length < 2) return;
            const first = btns[0];
            const last = btns[btns.length - 1];
            const cloneFirst = first.cloneNode(true);
            const cloneLast = last.cloneNode(true);
            cloneFirst.classList.add('nav-clone');
            cloneLast.classList.add('nav-clone');
            const ss = document.createElement('div');
            ss.className = 'nav-snap-spacer';
            const se = document.createElement('div');
            se.className = 'nav-snap-spacer';
            nav.insertBefore(ss, nav.firstChild);
            nav.insertBefore(cloneLast, nav.firstChild.nextSibling);
            nav.appendChild(cloneFirst);
            nav.appendChild(se);
            const margin = window.innerWidth * 0.075;
            let navLoopIgnore = false;
            nav.onscroll = () => {
                if (navLoopIgnore) return;
                const sl = nav.scrollLeft;
                const sw = nav.scrollWidth;
                const cw = nav.clientWidth;
                const buf = Math.max(20, Math.round(cw * 0.03));
                const maxSl = Math.max(0, sw - cw);
                const nearLeft = sl < buf;
                const nearRight = maxSl - sl < buf;
                const jumpTo = (x) => {
                    navLoopIgnore = true;
                    nav.style.scrollBehavior = 'auto';
                    nav.scrollLeft = x;
                    requestAnimationFrame(() => {
                        setTimeout(() => {
                            nav.style.scrollBehavior = 'smooth';
                            navLoopIgnore = false;
                        }, 50);
                    });
                };
                if (nearLeft) {
                    jumpTo(last.offsetLeft - nav.offsetLeft - margin);
                } else if (nearRight) {
                    jumpTo(first.offsetLeft - nav.offsetLeft - margin);
                }
            };
            requestAnimationFrame(() => {
                nav.style.scrollBehavior = 'auto';
                if (resetScroll) {
                    nav.scrollLeft = first.offsetLeft - nav.offsetLeft - margin;
                } else {
                    const maxSl = Math.max(0, nav.scrollWidth - nav.clientWidth);
                    nav.scrollLeft = Math.min(saved, maxSl);
                }
                setTimeout(() => { nav.style.scrollBehavior = 'smooth'; }, 50);
            });
        }
        function rebuildActionButtons() {
            for (let i = 1; i <= 16; i++) {
                const card = document.getElementById(`u${i}`);
                if (!card) continue;
                const steps = card.querySelectorAll('.step-container');
                steps.forEach((step, index) => {
                    const displayArea = step.querySelector('.display-area');
                    if (!displayArea) return;
                    const s = index + 1;
                    displayArea.querySelectorAll('button, .scene-action-stack, .action-group').forEach(el => el.remove());
                    const stack = document.createElement('div');
                    stack.className = 'scene-action-stack';
                    const btnPlay = document.createElement('button');
                    btnPlay.type = 'button';
                    btnPlay.className = 'btn-scene-action';
                    btnPlay.textContent = '播放';
                    btnPlay.onclick = (e) => {
                        e.stopPropagation();
                        triggerHaptic();
                        const wordEl = document.getElementById(`u${i}-s${s}-word`);
                        if (wordEl) speakWholeSentence(wordEl.id, '', '');
                    };
                    if (i === 11 && s === 1) btnPlay.id = 'onboarding-step2-target';
                    const btnView = document.createElement('button');
                    btnView.type = 'button';
                    btnView.className = 'btn-scene-action';
                    btnView.textContent = '查看';
                    btnView.onclick = (e) => {
                        e.stopPropagation();
                        triggerHaptic();
                        const wordEl = document.getElementById(`u${i}-s${s}-word`);
                        const transEl = document.getElementById(`u${i}-s${s}-trans`);
                        if (wordEl && transEl) openShowCard(wordEl.parentElement.innerText, transEl.innerText);
                    };
                    stack.appendChild(btnPlay);
                    stack.appendChild(btnView);
                    const cta = document.createElement('button');
                    cta.type = 'button';
                    cta.className = 'btn-scene-action btn-speak-cta';
                    cta.textContent = '练习';
                    if (i === 11 && s === 1) cta.id = 'onboarding-step3-target';
                    cta.onclick = (e) => {
                        e.stopPropagation();
                        triggerHaptic();
                        const wordEl = document.getElementById(`u${i}-s${s}-word`);
                        if (!wordEl) return;
                        if (!recognition) { openMessageModal('无法使用语音识别', MSG_SPEECH_UNSUPPORTED); return; }
                        const engEl = wordEl.closest('.text-content')?.querySelector('.english-sentence');
                        const engText = engEl ? engEl.innerText : '';
                        window.speechSynthesis.cancel();
                        speakDirect(engText, () => {
                            startSimpleListening(cta, wordEl.parentElement.innerText, { skipIntroToast: true });
                        }, 'en');
                    };
                    stack.appendChild(cta);
                    displayArea.appendChild(stack);
                });
            }
        }
        function createMiniBtn(icon, onClick) { const btn = document.createElement('button'); btn.className = 'btn-mini'; btn.innerHTML = icon; btn.onclick = (e) => { e.stopPropagation(); triggerHaptic(); onClick.call(btn, e); }; return btn; }
        let simpleTarget = "";
        function startSimpleListening(btn, text, opts) {
            opts = opts || {};
            if (!recognition) { openMessageModal('无法使用语音识别', MSG_SPEECH_UNSUPPORTED); return; }
            triggerHaptic();
            simpleTarget = text.toLowerCase().replace(/[.,?!]/g, '').trim();
            const unitNum = getUnitNumFromElement(btn);
            recognition.onresult = (e) => {
                const spoken = e.results[e.results.length - 1][0].transcript;
                handleSimpleResult(spoken, unitNum);
                btn.classList.remove('listening');
            };
            recognition.onend = () => btn.classList.remove('listening');
            document.querySelectorAll('.btn-speak-cta').forEach(b => b.classList.remove('listening'));
            btn.classList.add('listening');
            try {
                recognition.start();
                if (!opts.skipIntroToast) showToast('请大声朗读这句话');
            } catch (e) {}
        }
        function handleSimpleResult(spoken, unitNum) {
            const cleanSpoken = spoken.toLowerCase().replace(/[.,?!]/g, '').trim();
            if (cleanSpoken.includes(simpleTarget) || simpleTarget.includes(cleanSpoken)) {
                showToast('读得很棒，继续保持');
                triggerHaptic();
                if (unitNum != null) recordSpeakActionCompleted(unitNum);
                markWeakWordCorrect(simpleTarget);
            } else {
                showToast('听起来不太对，请再试一次');
                recordWeakWord(simpleTarget, '', unitNum || 0);
            }
        }
        function updateChatProgress() {
            const el = document.getElementById('chatProgress');
            if (!el) return;
            if (aiState.total === 0) { el.innerText = ''; return; }
            el.innerText = `${aiState.score}/${aiState.total}`;
        }
        function addBotMsg(text, chips = [], autoMic = false, callback = null, opts) {
            opts = opts || {};
            const silent = opts.silent === true;
            const body = document.getElementById('chatBody');
            const d = document.createElement('div');
            d.className = 'msg bot';
            d.innerText = text;
            body.appendChild(d);
            if (chips.length > 0) {
                const g = document.createElement('div');
                g.className = 'msg-btn-group';
                chips.forEach(c => {
                    const b = document.createElement('div');
                    b.className = 'msg-chip';
                    b.innerText = c.text;
                    b.onclick = () => c.action();
                    g.appendChild(b);
                });
                body.appendChild(g);
            }
            body.scrollTop = body.scrollHeight;
            updateChatProgress();
            if (silent) {
                if (callback) callback();
                if (autoMic) setTimeout(() => startChatListening(), 400);
                return;
            }
            const hasChinese = /[\u4e00-\u9fa5]/.test(text);
            const lang = hasChinese ? 'zh' : 'en';
            speakDirect(text, () => {
                if (autoMic) startChatListening();
                if (callback) callback();
            }, lang);
        }
        function processAnswer(spokenText) {
            aiState.waitingForSpeech = false;
            if (aiState.silenceTimer) clearTimeout(aiState.silenceTimer);
            addUserMsg(`🗣️ "${spokenText}"`);

            if (aiState.currentMode === 'weakword') {
                const target = (aiState.currentTargetEng || '').toLowerCase().replace(/[^a-z ]/g, '');
                const spoken = spokenText.toLowerCase().replace(/[^a-z ]/g, '');
                const tWords = target.split(' ').filter(w => w.length > 1);
                const hit = tWords.filter(w => spoken.includes(w)).length;
                const ok = tWords.length > 0 && hit / tWords.length >= 0.6;
                if (ok) {
                    markWeakWordCorrect(aiState.currentTargetEng);
                    const streak = (() => {
                        const list = JSON.parse(localStorage.getItem('weak_words') || '[]');
                        const w = list.find(x => x.eng === aiState.currentTargetEng);
                        return w ? (w.correctStreak || 0) : 0;
                    })();
                    if (streak >= 2) {
                        addBotMsg('🏆 完美！这个词你已经掌握了！', [
                            { text: '继续练其他弱点词', action: () => { openToolbox(); switchTool(3); } },
                            { text: '返回主界面', action: () => toggleChat() },
                        ]);
                    } else {
                        addBotMsg(`✅ 说对了！再说对 ${2 - streak} 次就能完全掌握！`, [], true);
                        aiState.waitingForSpeech = true;
                    }
                } else {
                    speakDirect(aiState.currentTargetEng, null, 'en');
                    addBotMsg(`🔄 再试一次！\n答案是："${aiState.currentTargetEng}"`, [
                        { text: '🔊 听示范', action: () => speakDirect(aiState.currentTargetEng, null, 'en') },
                    ], true);
                    aiState.waitingForSpeech = true;
                }
                aiState.total++;
                updateChatProgress();
                return;
            }

            if (aiState.currentMode === 'sitehelp') {
                const spoken = spokenText.toLowerCase();
                const matched = SITE_HELP_QA.find(item => item.q.some(q => spoken.includes(q)));
                if (matched) {
                    addBotMsg(matched.a, [
                        { text: '还有其他问题', action: () => { addBotMsg('说吧！', [], true); aiState.waitingForSpeech = true; } },
                        { text: '返回练习', action: startAiSession },
                    ]);
                } else {
                    addBotMsg('没听清楚，可以换个方式说说看，或者点页头「使用教程」查看完整说明。', [
                        { text: '打开教程', action: () => { toggleChat(); openUsageTutorial(); } },
                        { text: '再问一次', action: () => { addBotMsg('说吧！', [], true); aiState.waitingForSpeech = true; } },
                    ]);
                }
                aiState.total++;
                updateChatProgress();
                return;
            }

            if (aiState.currentMode === 'dialog') {
                const cheers = ['答得不错！', '很棒！', 'Nice!', 'Good job!'];
                showToast(cheers[Math.floor(Math.random() * cheers.length)]);
                triggerHaptic();
                const cb = aiState.dialogCallback;
                aiState.dialogCallback = null;
                if (cb) setTimeout(cb, 450);
                aiState.total++;
                updateChatProgress();
                return;
            }

            if (aiState.currentMode === 'pronunciation') {
                const target = aiState.currentTargetEng.toLowerCase().replace(/[^a-z]/g, '');
                const spoken = spokenText.toLowerCase().replace(/[^a-z]/g, '');
                if (spoken === target || spoken.includes(target) || target.includes(spoken)) {
                    markWeakWordCorrect(aiState.currentTargetEng);
                    addBotMsg('🎉 发音准确！', [
                        { text: '继续练下一个', action: () => { pronIdx++; askPronunciation(); } },
                        { text: '换个模式', action: () => startModeSelect('translate') },
                    ]);
                } else {
                    recordWeakWord(aiState.currentTargetEng, '', 0);
                    addBotMsg(`听起来像 "${spokenText}"，再试一次！`, [
                        { text: '🔊 听示范', action: () => speakDirect(aiState.currentTargetEng, null, 'en') },
                        { text: '跳过这个', action: () => { pronIdx++; askPronunciation(); } },
                    ]);
                    aiState.waitingForSpeech = true;
                }
                aiState.total++;
                updateChatProgress();
                return;
            }

            if (aiState.currentMode === 'daily') {
                const target = aiState.currentTargetEng.toLowerCase().replace(/[^a-z ]/g, '');
                const spoken = spokenText.toLowerCase().replace(/[^a-z ]/g, '');
                const words = target.split(' ').filter(w => w.length > 2);
                const matched = words.filter(w => spoken.includes(w)).length;
                const ok = words.length > 0 && matched / words.length >= 0.5;
                if (!ok) {
                    recordWeakWord(aiState.currentTargetEng, aiState.currentTargetCn || '', 0);
                } else {
                    markWeakWordCorrect(aiState.currentTargetEng);
                }
                addBotMsg(ok ? '✅ 正确！' : `答案是：\n"${aiState.currentTargetEng}"`, [], false, () => {
                    if (ok) aiState.score++;
                    dailyPhraseIdx++;
                    setTimeout(askDailyPhrase, 1500);
                });
                if (!ok) speakDirect(aiState.currentTargetEng, null, 'en');
                aiState.total++;
                updateChatProgress();
                return;
            }

            const target = aiState.currentTargetEng.toLowerCase().replace(/[^a-z ]/g, '');
            const spoken = spokenText.toLowerCase().replace(/[^a-z ]/g, '');
            let targetWords = target.split(' ').filter(w => w.length > 2);
            if (targetWords.length === 0) targetWords = target.split(' ').filter(w => w.length > 0);
            let matchCount = 0;
            targetWords.forEach(w => { if (spoken.includes(w)) matchCount++; });
            const accuracy = targetWords.length > 0 ? matchCount / targetWords.length : 0;

            if (accuracy >= 0.5) {
                aiState.score++;
                triggerHaptic();
                markWeakWordCorrect(aiState.currentTargetEng);
                const praise = ['✅ 太棒了！', '✅ 很好！完全正确！', '✅ 不错！继续保持！'][Math.floor(Math.random() * 3)];
                addBotMsg(praise, [], false, () => {
                    setTimeout(() => { aiState.currentStep++; askQuestion(); }, 1800);
                });
            } else {
                triggerHaptic();
                if (navigator.vibrate) navigator.vibrate(100);
                recordWeakWord(aiState.currentTargetEng, aiState.currentTargetCn, aiState.currentUnit || 0);
                addBotMsg(
                    `🔄 再想想！\n正确答案是：\n"${aiState.currentTargetEng}"`,
                    [{ text: '🔊 听一遍', action: () => speakDirect(aiState.currentTargetEng, null, 'en') }],
                    false,
                    () => {
                        speakDirect(aiState.currentTargetEng, () => {
                            setTimeout(() => { aiState.currentStep++; askQuestion(); }, 2500);
                        }, 'en');
                    }
                );
            }
            aiState.total++;
            updateChatProgress();
        }
        function endChat(completed) {
            aiState.active = false;
            if (aiState.silenceTimer) clearTimeout(aiState.silenceTimer);
            if (recognition) try { recognition.abort(); } catch (e) {}
            const mic = document.getElementById('chatMicBtn');
            if (mic) mic.classList.remove('active');
            const ci = document.getElementById('chatTextInput');
            if (ci) ci.value = '';
            let msg = '练习结束，下次继续！';
            if (completed && aiState.total > 0) {
                const pct = Math.round((aiState.score / aiState.total) * 100);
                msg = `练习完成！🎉\n正确率 ${pct}%。继续加油！`;
            }
            updateChatProgress();
            addBotMsg(msg, [], false, () => {
                setTimeout(() => {
                    const overlay = document.getElementById('chatOverlay');
                    if (overlay) overlay.style.display = 'none';
                }, 6000);
            });
        }
        function askQuestion() {
            if (!aiState.active || aiState.currentMode !== 'translate') return;
            const u = aiState.currentUnit;
            const s = aiState.currentStep;
            const wordEl = document.getElementById(`u${u}-s${s}-word`);
            const transEl = document.getElementById(`u${u}-s${s}-trans`);
            if (!wordEl || s > 2) { endChat(true); return; }
            const targetEng = wordEl.parentElement.innerText;
            aiState.currentTargetEng = targetEng;
            let targetCn = transEl.innerText;
            const savedData = JSON.parse(localStorage.getItem(`u${u}-s${s}`));
            if (savedData) targetCn = getFullChineseSentence(u, s, savedData.cnWord, savedData.suffix);
            aiState.currentTargetCn = targetCn;
            addBotMsg(`请翻译：\n"${targetCn}"`, [], true);
            aiState.waitingForSpeech = true;
            if (aiState.silenceTimer) clearTimeout(aiState.silenceTimer);
            aiState.silenceTimer = setTimeout(() => {
                if (aiState.waitingForSpeech && aiState.active) {
                    speakDirect('Are you there?', () => { startChatListening(); }, 'en');
                }
            }, 20000);
        }
        function manualMicClick() { if(aiState.waitingForSpeech) startChatListening(); else showToast('等机器人提问后再用麦克风哦'); }
        function submitChatText() {
            const inp = document.getElementById('chatTextInput');
            if (!inp) return;
            const text = inp.value.trim();
            if (!text) {
                showToast('请先输入内容');
                return;
            }
            if (!aiState.active) {
                showToast('请先打开 AI 陪练');
                return;
            }
            if (!aiState.waitingForSpeech) {
                showToast('等机器人问完再回答');
                return;
            }
            inp.value = '';
            try { inp.blur(); } catch (e) {}
            processAnswer(text);
        }
        function initSpeechRecognition() { if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) { const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition; recognition = new SpeechRecognition(); recognition.lang = 'en-US'; recognition.interimResults = false; recognition.maxAlternatives = 1; recognition.onresult = (e) => { console.log(e.results[0][0].transcript); }; } }
        function cleanForSpeech(text) {
            if (!text) return '';
            let s = String(text).replace(/\n+/g, '。');
            try {
                s = s.replace(/[\u{1F300}-\u{1FFFF}]/gu, '');
            } catch (e) {
                s = s.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '');
            }
            s = s.replace(/[\u2600-\u27FF]/g, '')
                .replace(/（[^）]{1,20}）/g, '')
                .replace(/[「」【】《》『』]/g, '')
                .replace(/。{2,}/g, '。')
                .trim();
            return s;
        }
        function speakDirect(text, callback, lang) {
            window.speechSynthesis.cancel();
            const cleaned = cleanForSpeech(text);
            if (!cleaned) {
                if (callback) callback();
                return;
            }
            function detectLang(t) {
                const chineseCount = (t.match(/[\u4e00-\u9fa5]/g) || []).length;
                const totalAlpha = (t.match(/[a-zA-Z\u4e00-\u9fa5]/g) || []).length;
                if (totalAlpha === 0) return 'en';
                return chineseCount / totalAlpha >= 0.35 ? 'zh' : 'en';
            }
            const useLang = lang || detectLang(cleaned);
            const utter = new SpeechSynthesisUtterance(cleaned);
            utter.lang = useLang === 'zh' ? 'zh-CN' : 'en-US';
            utter.rate = useLang === 'zh' ? 0.92 : 0.85;
            utter.pitch = 1;
            if (callback) {
                utter.onend = callback;
                utter.onerror = callback;
            }
            window.speechSynthesis.speak(utter);
        }
        function speakSequence(engText, cnText, onComplete, order) {
            window.speechSynthesis.cancel();
            const cleanEng = cleanForSpeech(engText);
            const cleanCn = cleanForSpeech(cnText);
            const cnFirst = order === 'cn-first' || order === 'cn';
            let doneCalled = false;
            const done = () => {
                if (doneCalled) return;
                doneCalled = true;
                if (onComplete) onComplete();
            };
            if (!cnFirst) {
                if (!cleanEng) {
                    if (onComplete) onComplete();
                    return;
                }
                const est = cleanEng.length * 70 + (cleanCn ? cleanCn.length * 60 : 0) + 5000;
                const safetyTimer = setTimeout(done, Math.min(90000, Math.max(6000, est)));
                const engUtter = new SpeechSynthesisUtterance(cleanEng);
                engUtter.lang = 'en-US';
                engUtter.rate = 0.85;
                engUtter.onerror = () => { clearTimeout(safetyTimer); done(); };
                if (cleanCn) {
                    engUtter.onend = () => {
                        setTimeout(() => {
                            const cnUtter = new SpeechSynthesisUtterance(cleanCn);
                            cnUtter.lang = 'zh-CN';
                            cnUtter.rate = 0.92;
                            cnUtter.onend = () => { clearTimeout(safetyTimer); done(); };
                            cnUtter.onerror = () => { clearTimeout(safetyTimer); done(); };
                            window.speechSynthesis.speak(cnUtter);
                        }, 380);
                    };
                } else {
                    engUtter.onend = () => { clearTimeout(safetyTimer); done(); };
                }
                window.speechSynthesis.speak(engUtter);
                return;
            }
            if (!cleanCn && !cleanEng) {
                if (onComplete) onComplete();
                return;
            }
            const est = (cleanEng ? cleanEng.length * 70 : 0) + (cleanCn ? cleanCn.length * 60 : 0) + 5000;
            const safetyTimer = setTimeout(done, Math.min(90000, Math.max(6000, est)));
            if (cleanCn && cleanEng) {
                const cnUtter = new SpeechSynthesisUtterance(cleanCn);
                cnUtter.lang = 'zh-CN';
                cnUtter.rate = 0.92;
                cnUtter.onerror = () => { clearTimeout(safetyTimer); done(); };
                cnUtter.onend = () => {
                    setTimeout(() => {
                        const engUtter = new SpeechSynthesisUtterance(cleanEng);
                        engUtter.lang = 'en-US';
                        engUtter.rate = 0.85;
                        engUtter.onend = () => { clearTimeout(safetyTimer); done(); };
                        engUtter.onerror = () => { clearTimeout(safetyTimer); done(); };
                        window.speechSynthesis.speak(engUtter);
                    }, 380);
                };
                window.speechSynthesis.speak(cnUtter);
            } else if (cleanCn) {
                const cnOnly = new SpeechSynthesisUtterance(cleanCn);
                cnOnly.lang = 'zh-CN';
                cnOnly.rate = 0.92;
                cnOnly.onerror = () => { clearTimeout(safetyTimer); done(); };
                cnOnly.onend = () => { clearTimeout(safetyTimer); done(); };
                window.speechSynthesis.speak(cnOnly);
            } else {
                const engOnly = new SpeechSynthesisUtterance(cleanEng);
                engOnly.lang = 'en-US';
                engOnly.rate = 0.85;
                engOnly.onerror = () => { clearTimeout(safetyTimer); done(); };
                engOnly.onend = () => { clearTimeout(safetyTimer); done(); };
                window.speechSynthesis.speak(engOnly);
            }
        }
        function injectChatDOM() {
            const div = document.createElement('div');
            div.id = 'chatOverlay';
            div.className = 'chat-overlay';
            div.innerHTML = `
<div class="chat-header">
  <span>🤖 AI 口语教练</span>
  <span id="chatProgress" style="font-size:0.8em;color:var(--primary);"></span>
  <span onclick="toggleChat()" style="cursor:pointer;font-size:1.2em;">✕</span>
</div>
<div class="chat-body" id="chatBody"></div>
<div class="chat-footer">
  <div class="chat-input-row">
    <input type="text" id="chatTextInput" class="chat-text-input" placeholder="输入英语作答 / 网站问题（可不使用麦克风）" autocomplete="off" enterkeyhint="send" onkeydown="if(event.key==='Enter'){event.preventDefault();submitChatText();}" />
    <button type="button" id="chatSendBtn" class="chat-send-btn" onclick="submitChatText()">发送</button>
  </div>
  <div class="chat-mic-row">
    <button id="chatMicBtn" class="mic-wave" onclick="manualMicClick()" title="麦克风作答">🎙️</button>
    <button class="nav-btn" onclick="endChat(false)" style="background:#ff3b30;color:white;border:none;padding:8px 12px;border-radius:12px;">结束</button>
  </div>
</div>`;
            document.body.appendChild(div);
        }
        function addUserMsg(text) { const b=document.getElementById('chatBody'); const d=document.createElement('div'); d.className='msg user'; d.innerText=text; b.appendChild(d); b.scrollTop=b.scrollHeight; }
        function startChatListening() { if (!recognition) return; if (!aiState.active) return; const btn = document.getElementById('chatMicBtn'); btn.classList.add('active'); try { recognition.start(); } catch(e) {} recognition.onresult = (event) => { const last = event.results.length - 1; const text = event.results[last][0].transcript; processAnswer(text); }; recognition.onend = () => { btn.classList.remove('active'); }; }

        function translateU6Step1(cw) {
            const m = {
                '一些水': '我想要点水。',
                '自来水': '我想要自来水就行。',
                '今日例汤': '我想要今日例汤。',
                '外带咖啡': '我想要外带咖啡。'
            };
            return m[cw] || `我想要${cw}。`;
        }
        function translateU6Step2(cw) {
            const exact = {
                '洋葱': '请不要放洋葱。',
                '香菜': '请不要放香菜。',
                '辣': '请不要加辣。',
                '冰': '请不要加冰。',
                '糖': '请不要加糖。',
                '味精': '请不要加味精。',
                '奶制品': '请不要含奶制品。',
                '坚果': '请不要含坚果。',
                '麸质': '请不要含麸质。',
                '额外酱汁': '请不要加额外酱汁。',
                '加糖': '请不要加糖。',
                '放香菜': '请不要放香菜。',
                '快一点': '请快一点。',
                '加辣': '请不要做太辣。',
                '加冰': '请不要加冰。'
            };
            if (exact[cw]) return exact[cw];
            if (/放香菜|香菜/.test(cw) && cw.length < 8) return '请不要放香菜。';
            if (/rush|快一点/.test(cw) && !/加辣|辣/.test(cw)) return '请快一点。';
            if (/辣|spice/i.test(cw) && cw.length <= 4) return '请不要加辣。';
            if (cw === '冰' || /^加冰/.test(cw) || cw === '加冰') return '请不要加冰。';
            if ((/^糖|加糖/.test(cw) || cw === '糖') && cw.length <= 6) return '请不要加糖。';
            if (/洋葱|香菜|坚果/.test(cw)) return `请不要放${cw}。`;
            return `请不要放${cw}。`;
        }
        function translateU10Step2(cw) {
            const exact = {
                '头晕': '我头晕。',
                '胸痛': '我胸口疼。',
                '出血了': '我在流血。',
                '过敏反应': '我有过敏反应。',
                '很恶心': '我很想吐。',
                '恶心': '我有点恶心。',
                '走路有困难': '我走路有困难。',
                '发烧': '我有点发烧。',
                '很糟': '我感觉很糟。',
                '虚弱': '我很虚弱。',
                '头疼': '我头疼。'
            };
            if (exact[cw]) return exact[cw];
            if (/出血|流血/.test(cw)) return '我在流血。';
            if (/过敏反应|过敏/.test(cw)) return '我有过敏反应。';
            if (/胸痛/.test(cw)) return '我胸口疼。';
            if (/恶心|想吐/.test(cw)) return '我有点恶心。';
            return `我感到${cw}。`;
        }
        function translateU11Step1(cw) {
            const exact = {
                '再说一遍': '能再说一遍吗？',
                '说慢点': '能说慢一点吗？',
                '写下来': '能写下来吗？',
                '指给我看': '能指给我看一下吗？',
                '翻译一下': '能帮我翻译一下吗？',
                '用简单的词': '能说简单一点吗？',
                '一个词一个词说': '能一个字一个字说吗？',
                '打出来给我看': '能打字打出来给我看吗？',
                '用谷歌翻译': '能用谷歌翻译吗？',
                '跟上你说的': '能再说得明白一点吗？',
                '打字打出来给我看': '能打字发给我看一下吗？',
                '用更简单的词': '能说更简单一点吗？'
            };
            if (exact[cw]) return exact[cw];
            return `能${cw}吗？`;
        }
        function translateU12Step2(cw) {
            const exact = {
                '坏了': '它坏了。',
                '太小了': '太小了。',
                '尺码不对': '尺码不合适。',
                '坏了/不工作': '它坏了/不能用了。',
                '过期了': '过期了。',
                '颜色不对': '颜色不对。',
                '有损坏': '有损坏。',
                '缺配件': '缺配件。',
                '和图片不一样': '和图片不一样。',
                '全新没用过': '这是全新的，没用过。',
                '不合身': '不合身。',
                '颜色错了': '颜色发错了。'
            };
            if (exact[cw]) return exact[cw];
            if (cw.includes('/') && cw.length > 10) return `情况说明：${cw}。`;
            return `它${cw}。`;
        }
        function translateU13Step2(cw) {
            if (/下午|点|中午|早上|晚上|AM|PM/i.test(cw)) return `约在${cw}。`;
            if (/周|星期|明天|今天|下周|月底/.test(cw)) return `约在${cw}。`;
            return `在${cw}。`;
        }
        function translateU15Step2(cw) {
            if (/手机|在我手机|phone/i.test(cw)) return '单号在我手机上。';
            if (/这里|这儿/.test(cw)) return '单号在这儿。';
            if (/通知/.test(cw)) return '我有取件通知单。';
            const t = String(cw).trim();
            if (/[\d…]{4,}/.test(t) || /^[\d\s…·]+$/.test(t)) return `单号是${cw}。`;
            return `单号信息：${cw}。`;
        }

        function translateU3Step1(cw, sfx) {
            if (cw === '笔' || (cw.includes('笔') && cw.length < 8)) return '能借我用一下笔吗？';
            if (/^wifi$/i.test(String(cw).trim())) return '我能借用一下您的 WiFi 吗？';
            return `我能借用一下您的${cw}${sfx}`;
        }
        function translateU1Step1(cw) {
            const m = {
                '你的新邻居': '嗨，我是你的新邻居。',
                '（你的名字）': '嗨，我是（说你的名字）。',
                '刚搬进来': '嗨，我刚搬来。',
                '住隔壁的': '嗨，我就住隔壁。',
                '新来的': '嗨，我是新来的。'
            };
            return m[cw] || `嗨，我是${cw}。`;
        }
        function translateU1Step2(cw) {
            const m = {
                '302室': '我住在302室。',
                '隔壁': '我住在隔壁。',
                '楼下': '我住在楼下。',
                '楼上': '我住在楼上。',
                '这栋楼': '我住在这栋楼里。'
            };
            return m[cw] || `我住在${cw}。`;
        }
        function translateU2Step1(cw) {
            return `打扰一下，我在找${cw}。`;
        }
        function translateU2Step2(cw, sfx) {
            const m = {
                '怎么走': '能告诉我怎么走吗？',
                '它在哪': '能告诉我它在哪儿吗？',
                '哪边走': '能告诉我往哪边走吗？',
                '具体地址': '能告诉我具体地址吗？',
                '远不远': '能告诉我远不远吗？',
                '有多远': '能告诉我有多远吗？',
                '坐哪部电梯': '能告诉我该坐哪部电梯吗？',
                '是否在这层': '能告诉我在不在这层吗？',
                '最快的路': '能告诉我最快的路怎么走吗？',
                '方向': '能告诉我方向吗？'
            };
            if (m[cw]) return m[cw];
            return `能告诉我${cw}${sfx}`;
        }
        function translateU4Step1(cw) {
            const m = {
                '开个账户': '我想开个账户。',
                '存钱': '我想存钱。',
                '取钱': '我想取现金。',
                '换汇': '我想换汇。',
                '汇款': '我想汇款。',
                '查余额': '我想查余额。',
                '挂失': '我想挂失银行卡。',
                '注销账户': '我想注销账户。',
                '存现金': '我想存现金。',
                '改密码': '我想改密码。',
                '申请信用卡': '我想申请信用卡。',
                '设置自动存款': '我想设置工资自动入账。'
            };
            return m[cw] || `我想${cw}。`;
        }
        function translateU4Step2(cw) {
            const m = {
                '身份证': '这是我的身份证。',
                '护照': '这是我的护照。',
                '借记卡': '这是我的借记卡。',
                '支票': '这是我的支票。',
                '申请表': '这是我的申请表。',
                '社会安全卡': '这是我的社会安全卡。',
                '驾照': '这是我的驾照。',
                '绿卡': '这是我的绿卡。',
                '租约': '这是我的租约。',
                '水电账单': '这是我的水电账单。',
                '账号': '这是我的账号。'
            };
            return m[cw] || `这是我的${cw}。`;
        }
        function translateU5Step2(cw, sfx) {
            const m = {
                '塑料袋': '你们提供塑料袋吗？',
                '收据': '你们能提供收据吗？',
                '现金返还': '你们能返现吗？',
                '礼品包装': '你们提供礼品包装吗？',
                '折扣': '你们有折扣吗？',
                '纸袋': '你们提供纸袋吗？',
                '老人折扣': '你们有老人折扣吗？',
                '会员卡': '你们有会员卡吗？',
                '价格匹配': '你们做价格匹配吗？',
                '店内积分': '能退成店内积分吗？',
                '袋子': '你们有袋子吗？',
                '零钱': '你们能找零吗？'
            };
            if (m[cw]) return m[cw];
            return `你们提供${cw}${sfx}`;
        }
        function translateU8Step2(cw) {
            const m = {
                '叙叙旧': '我们应该好好叙叙旧。',
                '聚聚': '我们应该找时间聚聚。',
                '喝杯咖啡': '我们应该一起喝杯咖啡。',
                '常联系': '我们应该常联系。',
                '互换号码': '我们应该互留一下电话。',
                '加个微信': '我们加个微信吧。',
                '找时间见个面': '我们应该找时间见个面。',
                '一起计划旅行': '我们可以一起计划旅行。'
            };
            return m[cw] || `我们应该${cw}。`;
        }
        function translateU9Step1(cw) {
            return `我要去${cw}。`;
        }
        function translateU9Step2(cw) {
            const m = {
                '就在这': '就在这儿下车。',
                '在这儿': '就在这儿下车。',
                '这儿': '就在这儿下车。',
                '在路口': '请在路口让我下车。',
                '红绿灯旁': '请在红绿灯旁边让我下车。',
                '街对面': '请在街对面让我下车。',
                '酒店门口': '请在酒店门口让我下车。',
                '消防栓旁边': '请在消防栓旁边让我下车。',
                '方便停就行': '方便停哪儿都行。',
                '就在那栋楼前面': '请在那栋楼前让我下车。'
            };
            return m[cw] || `就在${cw}下车。`;
        }
        function translateU10Step1(cw) {
            const m = {
                '医生': '我需要医生。',
                '救护车': '我需要叫救护车。',
                '帮助': '我需要帮助。',
                '急救': '我需要急救。',
                '胰岛素': '我需要胰岛素。',
                '止痛药': '我需要止痛药。',
                '冰块': '我需要冰块。',
                '水（紧急）': '我急需水。',
                '口译员': '我需要口译员。',
                '联系我家人': '我需要联系我家人。',
                '翻译': '我需要翻译。'
            };
            return m[cw] || `我需要${cw}。`;
        }
        function translateU12Step1(cw) {
            const m = {
                '退货': '我想退货。',
                '换货': '我想换货。',
                '退款': '我想退款。',
                '试穿': '我想试穿一下。',
                '取消这个': '我想取消这笔订单。',
                '退这个': '我想退这件。',
                '换这个': '我想换这件。',
                '投诉': '我要投诉。',
                '退网购商品': '我想退网购的商品。',
                '找经理': '我想找经理。'
            };
            return m[cw] || `我想${cw}。`;
        }
        function translateU13Step1(cw) {
            const m = {
                '预约': '我想预约。',
                '改期': '我想改期。',
                '取消': '我想取消预约。',
                '确认': '我想确认一下预约。',
                '订位(吃饭)': '我想订位吃饭。'
            };
            return m[cw] || `我想${cw}。`;
        }
        function translateU14Step1(cw) {
            if (/漏水|坏了|窗户|水龙头/.test(cw)) return `${cw}。`;
            return `${cw}有问题。`;
        }
        function translateU15Step1(cw) {
            const m = {
                '一个包裹': '我来取一个包裹。',
                '挂号信': '我来取一封挂号信。',
                '我的邮件': '我来取我的邮件。',
                '认证信': '我来取认证信。',
                '国际包裹': '我来取国际包裹。'
            };
            return m[cw] || `我来取${cw}。`;
        }
        function translateU11Step2(cw) {
            if (cw === '英语说得不好') return '我英语说得不好。';
            if (cw === '听清') return '我没听清。';
            const m = {
                '明白': '我不明白。',
                '知道': '我不知道。',
                '懂': '我不懂。',
                '跟上你说的': '我跟不上你说的。',
                '听懂你的口音': '我听不太懂你的口音。'
            };
            return m[cw] || `我不${cw}。`;
        }
        function translateU16Step1(cw) {
            const m = {
                '感冒': '我想买点感冒药。',
                '头疼': '我想买点治头疼的药。',
                '胃痛': '我想买点治胃痛的药。',
                '过敏': '我想买点抗过敏的药。',
                '咳嗽': '我想买点止咳的药。',
                '发烧': '我想买点退烧药。',
                '嗓子疼': '我想买点治嗓子疼的药。'
            };
            return m[cw] || `我想买点治${cw}的药。`;
        }
        function translateU16Step2(cw) {
            const m = {
                '不嗜睡': '这是吃了不会犯困的吗？',
                '非处方': '这是非处方药吗？',
                '儿童可用': '儿童能吃吗？',
                '仿制药': '这是仿制药吗？'
            };
            return m[cw] || `这是${cw}的吗？`;
        }

        function getFullChineseSentence(u, s, cnWord, suffix) {
            let cw = cnWord;
            let sfx = suffix || '。';
            let full = '';
            if (sfx === '吗' || sfx === '?') sfx = '吗？';
            switch (u) {
                case 1: full = (s === 1) ? translateU1Step1(cw) : translateU1Step2(cw); break;
                case 2: full = (s === 1) ? translateU2Step1(cw) : translateU2Step2(cw, sfx); break;
                case 3:
                    if (s === 1) {
                        full = translateU3Step1(cw, sfx);
                    } else {
                        // 含「快没电」等：「快」字会误触下面的「很快就好」，必须先判断电量
                        if (/快没电|要没电|没电|电量低|低电量|^电量$/i.test(cw) || (/没电/.test(cw) && !/太快/.test(cw))) {
                            full = '快没电了，挺急的。';
                        } else if (cw === '急事' || /^an emergency$/i.test(cw)) {
                            full = '真的是急事。';
                        } else if (/紧急|urgent/i.test(cw) || cw === '急') {
                            full = '真的很紧急。';
                        } else if (/不会太/.test(cw)) {
                            full = '不会太久的。';
                        } else if (/就一秒|就一会儿/.test(cw)) {
                            full = '就一会儿的事。';
                        } else if (/真的是紧急情况|紧急情况/.test(cw)) {
                            full = '真的是紧急情况。';
                        } else if (/^快$|^迅速$|^quick$/i.test(cw) || (/马上就好/.test(cw) && !/没电/.test(cw))) {
                            full = '很快的，马上就好。';
                        } else if (/重要|important/i.test(cw)) {
                            full = '真的很重要。';
                        } else if (/必要|necessary/i.test(cw)) {
                            full = '确实有必要。';
                        } else full = `真的很${cw}。`;
                    }
                    break;
                case 4: full = (s === 1) ? translateU4Step1(cw) : translateU4Step2(cw); break;
                case 5:
                    if (s === 1) {
                        if (/Zelle|Venmo|Pay|支付宝|AliPay|Samsung|Google/i.test(cw)) full = `我想用${cw}付款。`;
                        else full = `我想用${cw}支付。`;
                    } else full = translateU5Step2(cw, sfx);
                    break;
                case 6: full = (s === 1) ? translateU6Step1(cw) : translateU6Step2(cw); break;
                case 7:
                    if (s === 1) {
                        const u7s1 = { '平摊': '咱们平摊吧。', 'AA制': '咱们AA制吧。', '叫单': '咱们叫单（买单）吧。', '分担费用': '咱们一起分担吧。', '请你': '这次我请你吧。' };
                        full = u7s1[cw] || `咱们${cw}吧。`;
                    } else {
                        const u72 = {
                            '我请客': '我请客。',
                            '我买单': '我买单。',
                            '我包了': '这次我包了吧。',
                            '轮到我了': '这次轮到我请。',
                            '他今晚请': '今晚算他请客。',
                            '这次她请': '这次算她请客。',
                            '寿星（免单）': '寿星免单吧。',
                            '店家请客': '店家请客。'
                        };
                        if (u72[cw]) full = u72[cw];
                        else if (/我.*请客|^me$/i.test(cw) || cw === 'me') full = '我请客。';
                        else if (/house|免单|老板\(免单\)/.test(cw)) full = '店家请客。';
                        else if (/老板|报销/.test(cw)) full = '算我老板报销。';
                        else if (/公司/.test(cw)) full = '走公司报销。';
                        else full = `算${cw}。`;
                    }
                    break;
                case 8:
                    if (s === 1) {
                        const u8s1 = {
                            '一切': '好久不见！一切都好吗？',
                            '家人': '好久不见！家人都还好吗？',
                            '工作': '好久不见！最近工作怎么样？',
                            '生活': '好久不见！最近生活怎么样？',
                            '你的狗': '好久不见！你的狗还好吗？',
                            '没见': '好久不见！好久没见了！',
                            '没聊': '好久不见！好久没聊了！',
                            '大学后': '好久不见！大学毕业之后还好吗？',
                            '去年后': '好久不见！去年一别还好吗？',
                            '工作怎么样': '好久不见！工作最近怎么样？',
                            '新工作怎样': '好久不见！新工作怎么样？',
                            '孩子们好吗': '好久不见！孩子们还好吗？',
                            '你妈妈还好吗': '好久不见！阿姨还好吗？',
                            '婚后生活': '好久不见！婚后生活怎么样？'
                        };
                        full = u8s1[cw] || `好久不见！${cw}还好吗？`;
                    } else full = translateU8Step2(cw);
                    break;
                case 9: full = (s === 1) ? translateU9Step1(cw) : translateU9Step2(cw); break;
                case 10: full = (s === 1) ? translateU10Step1(cw) : translateU10Step2(cw); break;
                case 11:
                    if (s === 1) full = translateU11Step1(cw);
                    else full = translateU11Step2(cw);
                    break;
                case 12: full = (s === 1) ? translateU12Step1(cw) : translateU12Step2(cw); break;
                case 13: full = (s === 1) ? translateU13Step1(cw) : translateU13Step2(cw); break;
                case 14:
                    if (s === 1) full = translateU14Step1(cw);
                    else if (cw === '一周多') full = '已经超过一周了。';
                    else if (cw === '好几天' || cw === '好些天') full = `已经${cw}了。`;
                    else full = `已经${cw}了。`;
                    break;
                case 15: full = (s === 1) ? translateU15Step1(cw) : translateU15Step2(cw); break;
                case 16: full = (s === 1) ? translateU16Step1(cw) : translateU16Step2(cw); break;
                default: full = cw + sfx;
            }
            return full;
        }
        function buildScenarioChips() {
            const groups = [
                { label: '🏠 日常生活', ids: [1, 3, 8, 9] },
                { label: '🏪 购物服务', ids: [5, 6, 7, 12, 16] },
                { label: '🏢 事务办理', ids: [4, 13, 14, 15] },
                { label: '🆘 紧急求助', ids: [2, 10, 11] },
            ];
            const ops = [];
            groups.forEach(g => {
                ops.push({ text: `── ${g.label} ──`, action: () => {} });
                g.ids.forEach(i => {
                    const c = document.getElementById(`u${i}`);
                    if (c) ops.push({ text: c.getAttribute('data-name'), action: () => startUnitPractice(i) });
                });
            });
            return ops;
        }
        function buildDialogChips() {
            const out = [];
            for (let i = 1; i <= 16; i++) {
                const uid = `u${i}`;
                if (!DIALOG_SCRIPTS[uid] || !DIALOG_SCRIPTS[uid].length) continue;
                const card = document.getElementById(uid);
                const name = card ? card.getAttribute('data-name') : uid;
                out.push({ text: name, action: () => startDialogMode(uid) });
            }
            return out;
        }
        function startSiteHelpMode() {
            addUserMsg('🌐 网站使用问题');
            aiState.currentMode = 'sitehelp';
            addBotMsg('好的！有什么关于网站使用的问题？直接说给我听！', [], true);
            aiState.waitingForSpeech = true;
        }

        function startAiSession() {
            aiState.active = true;
            aiState.score = 0;
            aiState.total = 0;
            aiState.currentMode = 'translate';
            document.getElementById('chatBody').innerHTML = '';
            updateChatProgress();
            addBotMsg('你好！我是你的AI英语口语教练 🎓\n今天想练什么？', [
                { text: '🎯 场景翻译练习', action: () => startModeSelect('translate') },
                { text: '💬 模拟真实对话', action: () => startModeSelect('dialog') },
                { text: '🔤 单词发音检测', action: () => startModeSelect('pronunciation') },
                { text: '📋 每日必备短句', action: () => startDailyPhrases() },
                { text: '🌐 网站使用问题', action: () => startSiteHelpMode() },
                { text: '不练了', action: () => { toggleChat(); aiState.active = false; } },
            ]);
        }
        function startModeSelect(mode) {
            practiceMode = mode;
            addUserMsg(mode === 'translate' ? '🎯 场景翻译练习' : mode === 'dialog' ? '💬 模拟真实对话' : '🔤 单词发音检测');
            if (mode === 'translate') {
                addBotMsg('好！先选一个你最近会遇到的场景：', buildScenarioChips());
            } else if (mode === 'dialog') {
                addBotMsg('我会扮演美国人，你用英语回答我。\n选一个场景开始：', buildDialogChips());
            } else if (mode === 'pronunciation') {
                startPronunciationDrill();
            }
        }
        function startDialogMode(uid) {
            addUserMsg(document.getElementById(uid)?.getAttribute('data-name') || uid);
            dialogScript = DIALOG_SCRIPTS[uid] || [];
            dialogStep = 0;
            aiState.currentMode = 'dialog';
            runDialogStep();
        }
        function runDialogStep() {
            if (dialogStep >= dialogScript.length) {
                addBotMsg('🎉 对话完成！你表现得很好！\n想再练一次，还是换个场景？', [
                    { text: '再来一次', action: () => { dialogStep = 0; runDialogStep(); } },
                    { text: '换场景', action: () => startModeSelect('dialog') },
                    { text: '结束', action: () => endChat(true) },
                ]);
                return;
            }
            const step = dialogScript[dialogStep];
            if (step.role === 'bot') {
                const body = document.getElementById('chatBody');
                const d = document.createElement('div');
                d.className = 'msg bot';
                d.innerText = `${step.text}\n（${step.cn}）`;
                body.appendChild(d);
                body.scrollTop = body.scrollHeight;
                updateChatProgress();
                speakSequence(step.text, step.cn, () => {
                    dialogStep++;
                    runDialogStep();
                });
            } else if (step.role === 'user_prompt') {
                aiState.waitingForSpeech = true;
                aiState.dialogCallback = () => {
                    dialogStep++;
                    setTimeout(runDialogStep, 900);
                };
                addBotMsg(`💬 轮到你回答了\n提示：${step.hint}`, [], false, null, { silent: true });
            }
        }
        function startPronunciationDrill() {
            pronIdx = Math.floor(Math.random() * PRONUNCIATION_WORDS.length);
            askPronunciation();
        }
        function askPronunciation() {
            const item = PRONUNCIATION_WORDS[pronIdx % PRONUNCIATION_WORDS.length];
            addBotMsg(
                `请跟读这个词：\n\n"${item.word}"\n\n💡 提示：${item.tip}`,
                [{ text: '🔊 先听示范', action: () => speakDirect(item.word, null, 'en') }],
                true
            );
            aiState.waitingForSpeech = true;
            aiState.currentTargetEng = item.word;
            aiState.currentMode = 'pronunciation';
        }
        function startDailyPhrases() {
            addUserMsg('📋 每日必备短句');
            dailyPhraseIdx = 0;
            aiState.currentMode = 'daily';
            askDailyPhrase();
        }
        function askDailyPhrase() {
            if (dailyPhraseIdx >= DAILY_PHRASES.length) {
                addBotMsg('🏆 全部短句练完了！今天的口语练习很棒！', [
                    { text: '重新来一遍', action: () => { dailyPhraseIdx = 0; askDailyPhrase(); } },
                    { text: '换个模式', action: startAiSession },
                ]);
                return;
            }
            const item = DAILY_PHRASES[dailyPhraseIdx];
            addBotMsg(
                `第 ${dailyPhraseIdx + 1}/${DAILY_PHRASES.length} 句\n\n中文：${item.cn}\n\n请用英语说出来 ↓`,
                [{ text: '🔊 听答案', action: () => speakDirect(item.en, null, 'en') }],
                true
            );
            aiState.waitingForSpeech = true;
            aiState.currentTargetEng = item.en;
            aiState.currentTargetCn = item.cn;
            aiState.currentMode = 'daily';
        }
        function startUnitPractice(uid) {
            addUserMsg(document.getElementById(`u${uid}`)?.getAttribute('data-name') || `Unit ${uid}`);
            aiState.currentUnit = uid;
            aiState.currentStep = 1;
            aiState.currentMode = 'translate';
            practiceMode = 'translate';
            addBotMsg('好选择！我们开始吧！');
            setTimeout(askQuestion, 1500);
        }
        function hideRobotBubbleVisual() {
            const bubble = document.getElementById('robotBubble');
            if (bubble) bubble.classList.remove('visible');
            const badge = document.getElementById('robotBadge');
            if (badge) badge.style.display = 'none';
        }
        function onUserActivityForIdleBubble(ev) {
            if (ev.type === 'touchstart' && ev.target && ev.target.closest) {
                if (ev.target.closest('#content-area') || ev.target.closest('#navScroll')) return;
            }
            resetIdleTimer();
        }
        function resetIdleTimer() {
            if (aiState.active) return;
            if (aiState.idleTimer) clearTimeout(aiState.idleTimer);
            aiState.idleTimer = setTimeout(triggerIdleAlert, ROBOT_BUBBLE_IDLE_MS);
        }
        function dismissRobotBubbleClick(ev) {
            if (ev) ev.stopPropagation();
            hideRobotBubbleVisual();
            if (aiState.active) return;
            if (aiState.idleTimer) clearTimeout(aiState.idleTimer);
            aiState.idleTimer = setTimeout(triggerIdleAlert, ROBOT_BUBBLE_IDLE_MS);
        }
        function triggerIdleAlert() {
            if (aiState.active) return;
            const bubble = document.getElementById('robotBubble');
            if (bubble && bubble.classList.contains('visible')) return;
            const badge = document.getElementById('robotBadge');
            if (badge) badge.style.display = 'block';
            const bubbleText = document.getElementById('robotBubbleText');
            if (bubbleText) bubbleText.textContent = pickRobotBubbleTip();
            if (bubble) {
                bubble.classList.add('visible');
                triggerHaptic();
            }
        }
        function isChatOverlayHidden() {
            const el = document.getElementById('chatOverlay');
            if (!el) return true;
            const d = el.style.display;
            if (d === 'flex') return false;
            if (d === 'none') return true;
            return window.getComputedStyle(el).display === 'none';
        }
        function addFloatingControls() {
            const c = document.querySelector('.float-controls');
            if (!c || c.querySelector('.fab-tools')) return;
            const w = document.createElement('div');
            w.className = 'robot-wrap';
            w.style.position = 'relative';
            const b = document.createElement('div');
            b.id = 'robotBubble';
            b.className = 'robot-speech-bubble';
            b.innerHTML = '<button type="button" class="robot-bubble-close" onclick="dismissRobotBubbleClick(event)" aria-label="关闭提示">✕</button><span id="robotBubbleText" class="robot-bubble-text"></span>';
            const bt = b.querySelector('#robotBubbleText');
            if (bt) bt.textContent = pickRobotBubbleTip();
            w.appendChild(b);
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'fab-robot';
            btn.innerHTML = '🤖<div class="robot-badge" id="robotBadge"></div>';
            btn.title = 'AI 陪练';
            btn.setAttribute('aria-label', 'AI 陪练');
            btn.onclick = () => {
                triggerHaptic();
                resetIdleTimer();
                const opening = isChatOverlayHidden();
                toggleChat();
                if (opening) {
                    const body = document.getElementById('chatBody');
                    if (body && body.innerHTML.trim() === '') startAiSession();
                }
            };
            w.appendChild(btn);
            c.insertBefore(w, c.firstChild);
            const t = document.createElement('button');
            t.type = 'button';
            t.className = 'fab-tools';
            t.innerHTML = '🧰';
            t.title = '工具箱';
            t.setAttribute('aria-label', '工具箱');
            t.onclick = openToolbox;
            c.insertBefore(t, c.firstChild);
        }
        function toggleChat() {
            const el = document.getElementById('chatOverlay');
            if (!el) return;
            const isHidden = isChatOverlayHidden();
            el.style.display = isHidden ? 'flex' : 'none';
            const badge = document.getElementById('robotBadge');
            if (badge) badge.style.display = 'none';
            if (isHidden) {
                hideRobotBubbleVisual();
                const body = document.getElementById('chatBody');
                if (body) body.scrollTop = body.scrollHeight;
            }
        }
        function injectToolboxDOM() {
            if (document.getElementById('toolOverlay')) return;
            const d = document.createElement('div');
            d.id = 'toolOverlay';
            d.className = 'tool-overlay';
            d.onclick = (e) => {
                if (e.target === d) {
                    if (typeof hideListenflowHelpTip === 'function') hideListenflowHelpTip();
                    d.style.display = 'none';
                }
            };
            d.innerHTML = `
    <div class="tool-card">
        <div class="tool-tabs">
            <div class="tool-tab active" onclick="switchTool(0)">🔢 速查</div>
            <div class="tool-tab" onclick="switchTool(1)">🌡️ 换算</div>
            <div class="tool-tab" onclick="switchTool(2)">💵 小费</div>
            <div class="tool-tab" onclick="switchTool(3)">📊 实战</div>
            <div class="tool-tab" onclick="switchTool(4)">🚨 急用</div>
            <div class="tool-tab" onclick="switchTool(5)">📅 生活</div>
            <div class="tool-tab" onclick="switchTool(6)">🗣️ 发音</div>
            <div class="tool-tab" onclick="switchTool(7)">▶️ 听读</div>
            <div class="tool-tab" onclick="switchTool(8)">📞 打电话</div>
            <div class="tool-tab" onclick="switchTool(9)">💾 备份与恢复</div>
        </div>

        <div class="tool-section active" id="tool-cheat" style="max-height: 40vh; overflow-y: auto;">
            <style>
                .cheat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; text-align: left; }
                .cheat-item { background: var(--display-area); padding: 9px 12px; border-radius: 8px; font-size: 0.98em; display:flex; justify-content:space-between; align-items:center; gap:6px; border: 1px solid var(--border); }
                .cheat-eng { font-weight: bold; color: var(--primary); }
                .cheat-cn { color: var(--text-sub); font-size: 0.86em; }
                .cheat-header { grid-column: span 2; font-weight: 800; margin-top: 10px; color: var(--text-main); border-bottom: 1px solid var(--border); padding-bottom:4px; }
            </style>
            <div class="cheat-grid">
                <div class="cheat-header">🗓️ 星期 (Week)</div>
                <div class="cheat-item"><span class="cheat-eng">Mon</span><span class="cheat-cn">周一</span><button type="button" onclick="speakDirect('Monday', null, 'en')" style="background:none;border:none;cursor:pointer;font-size:0.8em;flex-shrink:0;">🔊</button></div>
                <div class="cheat-item"><span class="cheat-eng">Tue</span><span class="cheat-cn">周二</span><button type="button" onclick="speakDirect('Tuesday', null, 'en')" style="background:none;border:none;cursor:pointer;font-size:0.8em;flex-shrink:0;">🔊</button></div>
                <div class="cheat-item"><span class="cheat-eng">Wed</span><span class="cheat-cn">周三</span><button type="button" onclick="speakDirect('Wednesday', null, 'en')" style="background:none;border:none;cursor:pointer;font-size:0.8em;flex-shrink:0;">🔊</button></div>
                <div class="cheat-item"><span class="cheat-eng">Thu</span><span class="cheat-cn">周四</span><button type="button" onclick="speakDirect('Thursday', null, 'en')" style="background:none;border:none;cursor:pointer;font-size:0.8em;flex-shrink:0;">🔊</button></div>
                <div class="cheat-item"><span class="cheat-eng">Fri</span><span class="cheat-cn">周五</span><button type="button" onclick="speakDirect('Friday', null, 'en')" style="background:none;border:none;cursor:pointer;font-size:0.8em;flex-shrink:0;">🔊</button></div>
                <div class="cheat-item"><span class="cheat-eng">Sat / Sun</span><span class="cheat-cn">周末</span><button type="button" onclick="speakDirect('Saturday. Sunday.', null, 'en')" style="background:none;border:none;cursor:pointer;font-size:0.8em;flex-shrink:0;">🔊</button></div>
                <div class="cheat-header">🧭 方向 (Direction)</div>
                <div class="cheat-item"><span class="cheat-eng">Left</span><span class="cheat-cn">左 ⬅️</span><button type="button" onclick="speakDirect('Left', null, 'en')" style="background:none;border:none;cursor:pointer;font-size:0.8em;flex-shrink:0;">🔊</button></div>
                <div class="cheat-item"><span class="cheat-eng">Right</span><span class="cheat-cn">右 ➡️</span><button type="button" onclick="speakDirect('Right', null, 'en')" style="background:none;border:none;cursor:pointer;font-size:0.8em;flex-shrink:0;">🔊</button></div>
                <div class="cheat-item"><span class="cheat-eng">Straight</span><span class="cheat-cn">直走 ⬆️</span><button type="button" onclick="speakDirect('Go straight', null, 'en')" style="background:none;border:none;cursor:pointer;font-size:0.8em;flex-shrink:0;">🔊</button></div>
                <div class="cheat-item"><span class="cheat-eng">Cross</span><span class="cheat-cn">过马路</span><button type="button" onclick="speakDirect('Cross the street', null, 'en')" style="background:none;border:none;cursor:pointer;font-size:0.8em;flex-shrink:0;">🔊</button></div>
                <div class="cheat-header">🔢 关键数字 (Numbers)</div>
                <div class="cheat-item"><span class="cheat-eng">11 / 12</span><span class="cheat-cn">十一/十二</span><button type="button" onclick="speakDirect('eleven. twelve.', null, 'en')" style="background:none;border:none;cursor:pointer;font-size:0.8em;flex-shrink:0;">🔊</button></div>
                <div class="cheat-item"><span class="cheat-eng">13 / 30</span><span class="cheat-cn">十三/三十</span><button type="button" onclick="speakDirect('thirteen. thirty.', null, 'en')" style="background:none;border:none;cursor:pointer;font-size:0.8em;flex-shrink:0;">🔊</button></div>
                <div class="cheat-item"><span class="cheat-eng">14 / 40</span><span class="cheat-cn">十四/四十</span><button type="button" onclick="speakDirect('fourteen. forty.', null, 'en')" style="background:none;border:none;cursor:pointer;font-size:0.8em;flex-shrink:0;">🔊</button></div>
                <div class="cheat-item"><span class="cheat-eng">15 / 50</span><span class="cheat-cn">十五/五十</span><button type="button" onclick="speakDirect('fifteen. fifty.', null, 'en')" style="background:none;border:none;cursor:pointer;font-size:0.8em;flex-shrink:0;">🔊</button></div>
                <div class="cheat-item"><span class="cheat-eng">Hundred</span><span class="cheat-cn">百 (100)</span><button type="button" onclick="speakDirect('one hundred', null, 'en')" style="background:none;border:none;cursor:pointer;font-size:0.8em;flex-shrink:0;">🔊</button></div>
                <div class="cheat-item"><span class="cheat-eng">Thousand</span><span class="cheat-cn">千 (1k)</span><button type="button" onclick="speakDirect('one thousand', null, 'en')" style="background:none;border:none;cursor:pointer;font-size:0.8em;flex-shrink:0;">🔊</button></div>
            </div>
        </div>

        <div class="tool-section" id="tool-calc">
            <div class="calc-row"><input type="number" inputmode="decimal" class="calc-input" id="inp-f" placeholder="点此处输入" aria-label="华氏度" oninput="convert('f')"><span class="calc-label">华氏度</span><span class="calc-eq">⇌</span><input type="number" inputmode="decimal" class="calc-input" id="inp-c" placeholder="点此处输入" aria-label="摄氏度" oninput="convert('c')"><span class="calc-label">摄氏度</span></div>
            <div class="calc-row"><input type="number" inputmode="decimal" class="calc-input" id="inp-lb" placeholder="点此处输入" aria-label="磅" oninput="convert('lb')"><span class="calc-label">磅</span><span class="calc-eq">⇌</span><input type="number" inputmode="decimal" class="calc-input" id="inp-kg" placeholder="点此处输入" aria-label="公斤" oninput="convert('kg')"><span class="calc-label">公斤</span></div>
            <div class="calc-row"><input type="number" inputmode="decimal" class="calc-input" id="inp-oz" placeholder="点此处输入" aria-label="液体盎司" oninput="convert('oz')"><span class="calc-label" title="美制液体盎司，与毫升为近似换算">液体盎司</span><span class="calc-eq">⇌</span><input type="number" inputmode="decimal" class="calc-input" id="inp-ml" placeholder="点此处输入" aria-label="毫升" oninput="convert('ml')"><span class="calc-label">毫升</span></div>
        </div>

        <div class="tool-section" id="tool-tip">
            <div class="calc-row" style="justify-content:center;"><span style="font-weight:bold;">账单（美元）</span><input type="number" class="calc-input" id="inp-bill" placeholder="0.00" style="flex:1 1 140px;max-width:180px;" oninput="calcTip()"></div>
            <div class="tip-grid">
                <div class="tip-box"><span class="tip-pct">15%</span><span class="tip-val" id="tip-15">$0</span></div>
                <div class="tip-box"><span class="tip-pct">18%</span><span class="tip-val" id="tip-18">$0</span></div>
                <div class="tip-box"><span class="tip-pct">20%</span><span class="tip-val" id="tip-20">$0</span></div>
            </div>
        </div>

        <div class="tool-section" id="tool-stats">
            <div id="stats-content" style="font-size:0.98em; line-height:2;"></div>
        </div>

        <div class="tool-section" id="tool-emergency">
            <style>
                .emg-item { display:flex; justify-content:space-between; align-items:center;
                  background:var(--display-area); border-radius:10px; padding:10px 12px;
                  margin-bottom:8px; border-left:3px solid var(--danger); gap:8px; }
                .emg-text { flex:1; }
                .emg-en { font-weight:700; font-size:0.98em; color:var(--text-main); }
                .emg-cn { font-size:0.86em; color:var(--text-sub); margin-top:2px; }
                .emg-speak { background:var(--danger); color:white; border:none;
                  border-radius:50%; width:32px; height:32px; font-size:0.9em;
                  cursor:pointer; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
            </style>
            <p style="font-size:0.88em;color:var(--text-sub);margin:0 0 10px;">点 🔊 大声朗读给对方听</p>
            <div id="emg-list"></div>
        </div>

        <div class="tool-section" id="tool-life" style="max-height:45vh;overflow-y:auto;">
            <style>
                .life-section-title { font-weight:800; font-size:0.92em; color:var(--primary);
                  margin:12px 0 6px; padding-bottom:4px; border-bottom:1px solid var(--border); }
                .life-item { display:flex; justify-content:space-between; align-items:center;
                  padding:8px 10px; border-radius:8px; background:var(--display-area);
                  margin-bottom:6px; gap:8px; border:1px solid var(--border); }
                .life-en { font-weight:600; font-size:0.95em; flex:1; }
                .life-cn { color:var(--text-sub); font-size:0.86em; text-align:right; }
                .life-speak { background:none; border:1px solid var(--border); border-radius:50%;
                  width:26px; height:26px; font-size:0.75em; cursor:pointer; flex-shrink:0;
                  display:flex; align-items:center; justify-content:center; }
            </style>
            <div id="life-content"></div>
        </div>

        <div class="tool-section" id="tool-pronunciation-ref" style="max-height:45vh;overflow-y:auto;"></div>

        <div class="tool-section" id="tool-listenflow">
            <div class="listenflow-top">
                <p style="font-size:0.9em;color:var(--text-sub);margin:0 0 10px;line-height:1.5;">按列表顺序朗读：每个步骤会依次读出各选项对应的整句（先中文再英文）。句式不可在此编辑；仅可调整场景顺序与是否加入列表。</p>
                <div class="listenflow-toggles">
                    <div class="listenflow-toggle-item">
                        <label for="listenflowBg"><input type="checkbox" id="listenflowBg"><span>后台播放</span></label>
                        <button type="button" class="listenflow-help-btn" aria-label="后台播放说明" onclick="toggleListenflowHelpTip(event, 'bg')">?</button>
                    </div>
                    <div class="listenflow-toggle-item">
                        <label for="listenflowWake"><input type="checkbox" id="listenflowWake"><span>播放时常亮</span></label>
                        <button type="button" class="listenflow-help-btn" aria-label="播放时常亮说明" onclick="toggleListenflowHelpTip(event, 'wake')">?</button>
                    </div>
                </div>
                <div class="listenflow-gap-wrap">
                    <div class="listenflow-gap-head">
                        <span>句间停顿（上一句中文、英文都读完后）</span>
                        <span id="listenflowGapValue" style="color:var(--primary);font-weight:700;">5 秒</span>
                    </div>
                    <input type="range" id="listenflowGap" min="0" max="2" step="1" value="1" aria-label="听读句间停顿时长" />
                    <div class="listenflow-gap-ticks"><span>3 秒</span><span>5 秒</span><span>8 秒</span></div>
                </div>
                <div id="listenflowProgress" style="font-size:0.8em;color:var(--primary);min-height:1.4em;margin-bottom:8px;"></div>
                <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
                    <button type="button" class="backup-btn backup-btn-export" style="flex:1;min-width:120px;" onclick="startListenflowPlaylist()">▶ 按列表播放</button>
                    <button type="button" class="backup-btn" style="flex:1;min-width:100px;background:var(--display-area);color:var(--text-main);border:1px solid var(--border);" onclick="stopListenflow()">⏹ 停止</button>
                </div>
            </div>
            <div id="listenflowQueueScroll">
                <div id="listenflowQueueUi"></div>
                <div class="listenflow-add-row">
                    <select id="listenflowAddSelect" aria-label="加入场景"></select>
                    <button type="button" onclick="listenflowAddSelected()">加入列表</button>
                </div>
                <button type="button" class="backup-btn" style="width:100%;margin-top:10px;background:var(--display-area);color:var(--text-main);border:1px solid var(--border);" onclick="resetListenflowQueue()">恢复默认（16 场景顺序）</button>
            </div>
        </div>

        <div class="tool-section" id="tool-phone">
            <div id="phone-tool-root"></div>
        </div>

        <div class="tool-section" id="tool-backup" style="max-height:45vh;overflow-y:auto;">
            <div class="backup-dope-card">
                <div class="backup-dope-left" aria-hidden="true">💾</div>
                <div class="backup-dope-right">
                    <div class="backup-panel">
                        <h4>备份与恢复</h4>
                        <p>导出会打包<strong>本站点在浏览器中的全部本地数据</strong>（学习进度、主题、生词、打卡、自定义短语等），保存为一个小 JSON 文件。请勿把备份文件发给不信任的人。</p>
                        <div class="backup-warn-box">
                            <strong>恢复前必读：</strong>从文件恢复会用备份里的内容<strong>完全替换</strong>当前本站点的本地数据，无法撤销。建议先导出一份当前数据再恢复。
                        </div>
                        <div class="backup-actions">
                            <button type="button" class="backup-btn backup-btn-export" onclick="exportUserBackup()">导出全部数据…</button>
                            <button type="button" class="backup-btn backup-btn-import" onclick="triggerRestoreBackupPick()">从文件恢复…</button>
                        </div>
                    </div>
                    <input type="file" id="backupFileInput" accept="application/json,.json" style="display:none" onchange="onRestoreBackupFileInput(event)">
                </div>
            </div>
        </div>
    </div>`;
            const tipPop = document.createElement('div');
            tipPop.id = 'listenflowTipPop';
            tipPop.className = 'listenflow-tip-pop';
            tipPop.style.display = 'none';
            tipPop.setAttribute('role', 'tooltip');
            tipPop.innerHTML = '<p class="listenflow-tip-text"></p>';
            document.body.appendChild(d);
            document.body.appendChild(tipPop);
        }
        function ensureListenflowTipPopOnBody() {
            const pop = document.getElementById('listenflowTipPop');
            if (pop && pop.parentElement && pop.parentElement.id === 'toolOverlay') {
                document.body.appendChild(pop);
            }
        }
        const LISTENFLOW_HELP_TEXT = {
            bg: '切到后台或锁屏时尽量继续朗读；部分机型或浏览器仍会暂停。',
            wake: '播放时使用系统「保持亮屏」。若关屏且未开启后台播放，系统可能停止朗读。',
            rec: '录下你对「底部完整句」的跟读，用来和手机的标准英文朗读对比。下方列表会记下录制时的中英文；换词块或刷新页面后，点某条仍会先播当时那句英文，再播你的录音。'
        };
        let listenflowTipOpenKey = null;
        let listenflowTipDocHandler = null;
        function hideListenflowHelpTip() {
            const pop = document.getElementById('listenflowTipPop');
            if (pop) {
                pop.style.display = 'none';
                pop.hidden = true;
            }
            listenflowTipOpenKey = null;
            if (listenflowTipDocHandler) {
                document.removeEventListener('click', listenflowTipDocHandler, true);
                listenflowTipDocHandler = null;
            }
        }
        function toggleListenflowHelpTip(ev, key) {
            ev.preventDefault();
            ev.stopPropagation();
            ensureListenflowTipPopOnBody();
            const pop = document.getElementById('listenflowTipPop');
            const btn = ev.currentTarget;
            if (!pop || !btn) return;
            const text = LISTENFLOW_HELP_TEXT[key];
            if (!text) return;
            if (listenflowTipOpenKey === key && pop.style.display === 'block') {
                hideListenflowHelpTip();
                return;
            }
            listenflowTipOpenKey = key;
            const pEl = pop.querySelector('.listenflow-tip-text');
            if (pEl) pEl.textContent = text;
            pop.hidden = false;
            pop.style.display = 'block';
            requestAnimationFrame(() => {
                const r = btn.getBoundingClientRect();
                const pw = pop.offsetWidth;
                const ph = pop.offsetHeight;
                const vw = window.innerWidth;
                const vh = window.innerHeight;
                const pad = 8;
                let left = r.left + r.width / 2 - pw / 2;
                let top = r.bottom + pad;
                if (left + pw > vw - pad) left = vw - pad - pw;
                if (left < pad) left = pad;
                if (top + ph > vh - pad) top = r.top - ph - pad;
                if (top < pad) top = pad;
                pop.style.left = left + 'px';
                pop.style.top = top + 'px';
            });
            if (listenflowTipDocHandler) document.removeEventListener('click', listenflowTipDocHandler, true);
            listenflowTipDocHandler = (e) => {
                if (pop.contains(e.target) || btn.contains(e.target)) return;
                hideListenflowHelpTip();
            };
            setTimeout(() => document.addEventListener('click', listenflowTipDocHandler, true), 0);
        }
        const PRONREF_RENDER_VER = '2';
        function renderPronRef() {
            const el = document.getElementById('tool-pronunciation-ref');
            if (!el) return;
            if (el.dataset.pronrefVer !== PRONREF_RENDER_VER) {
                el.innerHTML = '';
                el.removeAttribute('data-rendered');
                el.dataset.pronrefVer = PRONREF_RENDER_VER;
            }
            if (el.dataset.rendered) return;
            el.dataset.rendered = '1';
            const hint = document.createElement('p');
            hint.style.cssText = 'font-size:0.92em;color:var(--text-sub);margin:0 0 12px 0;line-height:1.5;';
            hint.textContent = '左侧为常见误区，右侧为推荐说法与要点。点 🔊 听示范。';
            el.appendChild(hint);
            PRONREF_DATA.forEach(item => {
                const pair = document.createElement('div');
                pair.className = 'pron-ref-pair';
                const wrong = document.createElement('div');
                wrong.className = 'pron-ref-wrong';
                const wl = document.createElement('div');
                wl.className = 'pron-ref-word';
                wl.style.color = 'var(--danger)';
                wl.textContent = '❌ ' + item.wrongLabel;
                const wt = document.createElement('div');
                wt.className = 'pron-ref-tip';
                wt.textContent = item.wrongTip;
                const ws = document.createElement('div');
                ws.className = 'pron-ref-tip';
                ws.style.marginTop = '3px';
                ws.textContent = '场景：' + item.scene;
                wrong.appendChild(wl);
                wrong.appendChild(wt);
                wrong.appendChild(ws);
                const right = document.createElement('div');
                right.className = 'pron-ref-right';
                const rw = document.createElement('div');
                rw.className = 'pron-ref-word';
                rw.style.color = '#34c759';
                rw.textContent = '✅ ' + item.rightWord;
                const rt = document.createElement('div');
                rt.className = 'pron-ref-tip';
                rt.textContent = item.rightTip;
                const act = document.createElement('div');
                act.className = 'pron-ref-actions';
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.style.cssText = 'background:none;border:1px solid var(--border);border-radius:20px;padding:4px 10px;font-size:0.82em;cursor:pointer;';
                btn.textContent = '🔊 听示范';
                btn.onclick = () => speakDirect(item.speak, null, 'en');
                act.appendChild(btn);
                right.appendChild(rw);
                right.appendChild(rt);
                right.appendChild(act);
                pair.appendChild(wrong);
                pair.appendChild(right);
                el.appendChild(pair);
            });
        }

        const LS_LISTENFLOW = 'listenflow_queue_v1';
        const LS_LISTENFLOW_PREFS = 'listenflow_prefs_v1';
        const LISTENFLOW_GAP_MS = [3000, 5000, 8000];
        const LISTENFLOW_GAP_LABELS = ['3 秒', '5 秒', '8 秒'];
        function getAllUnitIds() {
            return Array.from({ length: 16 }, (_, i) => 'u' + (i + 1));
        }
        function getListenflowQueue() {
            try {
                const raw = localStorage.getItem(LS_LISTENFLOW);
                if (raw) {
                    const arr = JSON.parse(raw);
                    if (Array.isArray(arr) && arr.length) {
                        const valid = new Set(getAllUnitIds());
                        const filtered = arr.filter(id => valid.has(id));
                        if (filtered.length) return filtered;
                    }
                }
            } catch (e) {}
            return getAllUnitIds();
        }
        function saveListenflowQueue(arr) {
            localStorage.setItem(LS_LISTENFLOW, JSON.stringify(arr));
        }
        function getUnitCardTitle(unitId) {
            const card = document.getElementById(unitId);
            if (card && card.dataset && card.dataset.name) return card.dataset.name;
            return unitId;
        }
        function parseStepWordIds(step) {
            const hl = step.querySelector('.highlight[id$="-word"]');
            if (!hl || !hl.id) return null;
            const m = /^u(\d+)-s(\d+)-word$/.exec(hl.id);
            if (!m) return null;
            return { unitNum: parseInt(m[1], 10), stepNum: parseInt(m[2], 10) };
        }
        function listenflowPreviewFullEnglish(unitNum, stepNum, engWord, engSentenceEl) {
            if (!engSentenceEl) return '';
            const clone = engSentenceEl.cloneNode(true);
            const wid = `u${unitNum}-s${stepNum}-word`;
            const wordEl = clone.querySelector('#' + wid) || clone.querySelector('.highlight');
            if (unitNum === 14 && stepNum === 2 && wordEl) {
                if (engWord === 'more than a week') {
                    clone.innerHTML = 'It\'s been <span class="highlight" id="u14-s2-word">more than a week</span>.';
                } else {
                    const safe = String(engWord).replace(/</g, '');
                    clone.innerHTML = 'It\'s been <span class="highlight" id="u14-s2-word">' + safe + '</span> days.';
                }
            } else if (wordEl) {
                wordEl.textContent = engWord;
            }
            return clone.innerText.replace(/\s+/g, ' ').trim();
        }
        function collectUnitListenLines(unitId) {
            const card = document.getElementById(unitId);
            if (!card) return [];
            const out = [];
            card.querySelectorAll('.step-container').forEach(step => {
                const textContent = step.querySelector('.display-area .text-content');
                if (!textContent) return;
                const engEl = textContent.querySelector('.english-sentence');
                if (!engEl) return;
                const ids = parseStepWordIds(step);
                const chips = step.querySelectorAll('.chips-container .chip:not(.add-chip-btn)');
                if (ids && chips.length) {
                    chips.forEach(chip => {
                        const data = getChipUpdateData(chip);
                        if (!data) return;
                        const eng = listenflowPreviewFullEnglish(ids.unitNum, ids.stepNum, data.eng, engEl);
                        const cn = getFullChineseSentence(ids.unitNum, ids.stepNum, data.cn, data.sf);
                        if (eng) out.push({ eng, cn: cn || '' });
                    });
                } else {
                    const cnEl = textContent.querySelector('.translation');
                    const eng = engEl.innerText.replace(/\s+/g, ' ').trim();
                    const cn = cnEl ? cnEl.innerText.replace(/\s+/g, ' ').trim() : '';
                    if (eng) out.push({ eng, cn });
                }
            });
            return out;
        }

        let listenflowAbort = false;
        let listenflowPlaying = false;
        let listenflowWakeLock = null;
        let listenflowVisHandler = null;

        async function releaseListenflowWakeLock() {
            if (listenflowWakeLock) {
                try {
                    await listenflowWakeLock.release();
                } catch (e) {}
                listenflowWakeLock = null;
            }
        }
        async function requestListenflowWakeLock() {
            await releaseListenflowWakeLock();
            if (!document.getElementById('listenflowWake')?.checked) return;
            if (!('wakeLock' in navigator)) return;
            try {
                if (document.visibilityState === 'visible') {
                    listenflowWakeLock = await navigator.wakeLock.request('screen');
                }
            } catch (e) {}
        }

        function loadListenflowPrefs() {
            try {
                const raw = localStorage.getItem(LS_LISTENFLOW_PREFS);
                if (raw) return JSON.parse(raw);
            } catch (e) {}
            return { bg: false, wake: false, gapIdx: 1 };
        }
        function clampListenflowGapIdx(v) {
            let n = typeof v === 'number' ? v : parseInt(v, 10);
            if (Number.isNaN(n) || n < 0 || n > 2) return 1;
            return n;
        }
        function saveListenflowPrefs() {
            const bg = document.getElementById('listenflowBg');
            const wake = document.getElementById('listenflowWake');
            const gap = document.getElementById('listenflowGap');
            if (!bg || !wake) return;
            const gapIdx = gap ? clampListenflowGapIdx(gap.value) : 1;
            localStorage.setItem(LS_LISTENFLOW_PREFS, JSON.stringify({ bg: bg.checked, wake: wake.checked, gapIdx }));
        }
        function updateListenflowGapDisplay() {
            const el = document.getElementById('listenflowGap');
            const val = document.getElementById('listenflowGapValue');
            if (!el || !val) return;
            const idx = clampListenflowGapIdx(el.value);
            el.value = String(idx);
            val.textContent = LISTENFLOW_GAP_LABELS[idx];
            el.setAttribute('aria-valuetext', LISTENFLOW_GAP_LABELS[idx]);
        }
        function getListenflowGapMs() {
            const el = document.getElementById('listenflowGap');
            const idx = el ? clampListenflowGapIdx(el.value) : 1;
            return LISTENFLOW_GAP_MS[idx];
        }
        async function listenflowGapWait() {
            let left = getListenflowGapMs();
            while (left > 0 && !listenflowAbort) {
                const step = Math.min(left, 120);
                await new Promise(r => setTimeout(r, step));
                left -= step;
            }
        }
        function wireListenflowPrefsOnce() {
            const bg = document.getElementById('listenflowBg');
            const wake = document.getElementById('listenflowWake');
            const gap = document.getElementById('listenflowGap');
            if (!bg || bg.dataset.wired) return;
            bg.dataset.wired = '1';
            wake.dataset.wired = '1';
            const p = loadListenflowPrefs();
            bg.checked = !!p.bg;
            wake.checked = !!p.wake;
            if (gap) {
                gap.value = String(clampListenflowGapIdx(p.gapIdx));
                updateListenflowGapDisplay();
                gap.addEventListener('input', () => { updateListenflowGapDisplay(); saveListenflowPrefs(); });
                gap.addEventListener('change', saveListenflowPrefs);
            }
            bg.addEventListener('change', saveListenflowPrefs);
            wake.addEventListener('change', saveListenflowPrefs);
        }

        function renderListenflowPanel() {
            wireListenflowPrefsOnce();
            const wrap = document.getElementById('listenflowQueueUi');
            const sel = document.getElementById('listenflowAddSelect');
            if (!wrap || !sel) return;
            const q = getListenflowQueue();
            const inSet = new Set(q);
            wrap.innerHTML = '';
            q.forEach((uid, idx) => {
                const row = document.createElement('div');
                row.className = 'listenflow-row';
                const name = document.createElement('div');
                name.className = 'lf-name';
                name.textContent = (idx + 1) + '. ' + getUnitCardTitle(uid);
                const bPlay = document.createElement('button');
                bPlay.type = 'button';
                bPlay.textContent = '▶本场景';
                bPlay.title = '只播放该场景';
                bPlay.onclick = () => startListenflowSingle(uid);
                const bUp = document.createElement('button');
                bUp.type = 'button';
                bUp.textContent = '↑';
                bUp.disabled = idx === 0;
                bUp.onclick = () => { listenflowMove(idx, -1); };
                const bDn = document.createElement('button');
                bDn.type = 'button';
                bDn.textContent = '↓';
                bDn.disabled = idx === q.length - 1;
                bDn.onclick = () => { listenflowMove(idx, 1); };
                const bRm = document.createElement('button');
                bRm.type = 'button';
                bRm.textContent = '✕';
                bRm.title = '从列表移除';
                bRm.onclick = () => { listenflowRemove(idx); };
                row.appendChild(name);
                row.appendChild(bPlay);
                row.appendChild(bUp);
                row.appendChild(bDn);
                row.appendChild(bRm);
                wrap.appendChild(row);
            });
            sel.innerHTML = '';
            const opt0 = document.createElement('option');
            opt0.value = '';
            opt0.textContent = '选择要加入的场景…';
            sel.appendChild(opt0);
            getAllUnitIds().forEach(uid => {
                if (inSet.has(uid)) return;
                const o = document.createElement('option');
                o.value = uid;
                o.textContent = getUnitCardTitle(uid);
                sel.appendChild(o);
            });
        }
        function listenflowMove(idx, delta) {
            const q = getListenflowQueue().slice();
            const j = idx + delta;
            if (j < 0 || j >= q.length) return;
            const t = q[idx];
            q[idx] = q[j];
            q[j] = t;
            saveListenflowQueue(q);
            renderListenflowPanel();
        }
        function listenflowRemove(idx) {
            const q = getListenflowQueue().slice();
            q.splice(idx, 1);
            if (q.length === 0) {
                showToast('至少保留一个场景');
                return;
            }
            saveListenflowQueue(q);
            renderListenflowPanel();
        }
        function listenflowAddSelected() {
            const sel = document.getElementById('listenflowAddSelect');
            if (!sel || !sel.value) {
                showToast('请先选择场景');
                return;
            }
            const uid = sel.value;
            const q = getListenflowQueue().slice();
            if (q.includes(uid)) return;
            q.push(uid);
            saveListenflowQueue(q);
            renderListenflowPanel();
        }
        function resetListenflowQueue() {
            triggerHaptic();
            saveListenflowQueue(getAllUnitIds());
            renderListenflowPanel();
            showToast('已恢复默认顺序');
        }

        function listenflowShouldPauseOnHide() {
            const el = document.getElementById('listenflowBg');
            return el && !el.checked;
        }
        function attachListenflowVisibility() {
            detachListenflowVisibility();
            listenflowVisHandler = () => {
                if (document.visibilityState === 'visible') {
                    if (listenflowPlaying && document.getElementById('listenflowWake')?.checked) {
                        requestListenflowWakeLock();
                    }
                    return;
                }
                if (listenflowPlaying && listenflowShouldPauseOnHide()) {
                    listenflowAbort = true;
                    try { window.speechSynthesis.cancel(); } catch (e) {}
                }
            };
            document.addEventListener('visibilitychange', listenflowVisHandler);
        }
        function detachListenflowVisibility() {
            if (listenflowVisHandler) {
                document.removeEventListener('visibilitychange', listenflowVisHandler);
                listenflowVisHandler = null;
            }
        }

        function speakSequenceAsync(eng, cn, order) {
            return new Promise(resolve => {
                speakSequence(eng, cn, resolve, order);
            });
        }

        async function runListenflowForUnits(unitIds) {
            if (listenflowPlaying) {
                showToast('请先停止当前播放');
                return;
            }
            if (!unitIds || unitIds.length === 0) {
                showToast('列表为空');
                return;
            }
            listenflowAbort = false;
            listenflowPlaying = true;
            triggerHaptic();
            await requestListenflowWakeLock();
            attachListenflowVisibility();
            const prog = document.getElementById('listenflowProgress');
            try {
                outer: for (let ui = 0; ui < unitIds.length; ui++) {
                    if (listenflowAbort) break;
                    const uid = unitIds[ui];
                    const title = getUnitCardTitle(uid);
                    const lines = collectUnitListenLines(uid);
                    if (!lines.length) {
                        if (prog) prog.textContent = '跳过（无句式）: ' + title;
                        continue;
                    }
                    for (let li = 0; li < lines.length; li++) {
                        if (listenflowAbort) break outer;
                        if (prog) {
                            prog.textContent = '「' + title + '」 ' + (li + 1) + '/' + lines.length;
                        }
                        await speakSequenceAsync(lines[li].eng, lines[li].cn, 'cn-first');
                        if (listenflowAbort) break outer;
                        const hasMore = li < lines.length - 1 || ui < unitIds.length - 1;
                        if (hasMore) await listenflowGapWait();
                    }
                }
            } finally {
                listenflowPlaying = false;
                detachListenflowVisibility();
                await releaseListenflowWakeLock();
                if (prog && !listenflowAbort) prog.textContent = '播放结束';
                if (prog && listenflowAbort) prog.textContent = '已停止';
                if (!listenflowAbort && unitIds.length) showToast('本轮播放结束');
                else if (listenflowAbort) showToast('已停止');
            }
        }

        function startListenflowPlaylist() {
            triggerHaptic();
            runListenflowForUnits(getListenflowQueue());
        }
        function startListenflowSingle(unitId) {
            triggerHaptic();
            runListenflowForUnits([unitId]);
        }
        function stopListenflow() {
            triggerHaptic();
            listenflowAbort = true;
            try { window.speechSynthesis.cancel(); } catch (e) {}
        }

        function renderEmergencyList() {
            const el = document.getElementById('emg-list');
            if (!el || el.children.length > 0) return;
            flattenEmergencyPhrases().forEach(item => {
                const row = document.createElement('div');
                row.className = 'emg-item';
                row.innerHTML = `
      <div class="emg-text">
        <div class="emg-en"></div>
        <div class="emg-cn"></div>
      </div>
      <button type="button" class="emg-speak" aria-label="朗读">🔊</button>`;
                row.querySelector('.emg-en').textContent = item.en;
                row.querySelector('.emg-cn').textContent = item.cn;
                row.querySelector('.emg-speak').onclick = () => speakDirect(item.en, null, 'en');
                el.appendChild(row);
            });
        }
        function renderLifeContent() {
            const el = document.getElementById('life-content');
            if (!el || el.children.length > 0) return;
            LIFE_DATA.forEach(item => {
                if (item.section) {
                    const title = document.createElement('div');
                    title.className = 'life-section-title';
                    title.innerText = item.section;
                    el.appendChild(title);
                } else {
                    const row = document.createElement('div');
                    row.className = 'life-item';
                    const speakStr = item.speak || item.en;
                    row.innerHTML = `
        <span class="life-en"></span>
        <span class="life-cn"></span>
        <button type="button" class="life-speak" aria-label="朗读">🔊</button>`;
                    row.querySelector('.life-en').textContent = item.en;
                    row.querySelector('.life-cn').textContent = item.cn;
                    row.querySelector('.life-speak').onclick = () => speakDirect(speakStr, null, 'en');
                    el.appendChild(row);
                }
            });
        }

        let phoneToolboxLastId = 'universal';
        function showPhoneScriptCard(id) {
            const scripts = window.PHONE_SCRIPTS;
            const anchor = window.PHONE_ANCHOR_PHRASES;
            if (!scripts || !anchor) return;
            const script = scripts.find(s => s.id === id);
            if (!script) return;
            phoneToolboxLastId = id;
            const wrap = document.getElementById('phoneCardWrap');
            if (!wrap) return;
            document.querySelectorAll('.phone-scenario-btn').forEach(b => {
                b.classList.toggle('active', b.getAttribute('data-phone-id') === id);
            });
            wrap.innerHTML = '';
            const head = document.createElement('div');
            head.className = 'phone-card-head';
            head.style.borderLeftColor = script.color || 'var(--primary)';
            const t1 = document.createElement('div');
            t1.className = 'phone-card-title';
            t1.textContent = script.title;
            const t2 = document.createElement('div');
            t2.className = 'phone-card-sub';
            t2.textContent = script.subtitle || '';
            head.appendChild(t1);
            head.appendChild(t2);
            wrap.appendChild(head);
            const ah = document.createElement('div');
            ah.className = 'phone-subhead';
            ah.textContent = '最常说的几句英文（能少说就少说）';
            wrap.appendChild(ah);
            anchor.forEach(a => {
                const row = document.createElement('div');
                row.className = 'phone-phrase-row';
                const main = document.createElement('div');
                main.className = 'phone-phrase-main';
                const tag = document.createElement('div');
                tag.className = 'phone-phrase-tag';
                tag.textContent = a.tag;
                const enLine = document.createElement('div');
                enLine.className = 'phone-phrase-en';
                enLine.textContent = a.en;
                const cnLine = document.createElement('div');
                cnLine.className = 'phone-phrase-cn';
                cnLine.textContent = a.cn;
                main.appendChild(tag);
                main.appendChild(enLine);
                main.appendChild(cnLine);
                const sp = document.createElement('button');
                sp.type = 'button';
                sp.className = 'phone-phrase-speak';
                sp.setAttribute('aria-label', '朗读这句英文');
                sp.textContent = '🔊';
                sp.onclick = () => {
                    triggerHaptic();
                    speakDirect(a.en, null, 'en');
                };
                row.appendChild(main);
                row.appendChild(sp);
                wrap.appendChild(row);
            });
            const sh = document.createElement('div');
            sh.className = 'phone-subhead';
            sh.textContent = '按你的事选句子（中文是意思对照）';
            wrap.appendChild(sh);
            script.sections.forEach(sec => {
                const lab = document.createElement('div');
                lab.className = 'phone-sec-label';
                lab.textContent = sec.label;
                wrap.appendChild(lab);
                sec.phrases.forEach(p => {
                    const row = document.createElement('div');
                    row.className = 'phone-phrase-row';
                    const main = document.createElement('div');
                    main.className = 'phone-phrase-main';
                    const enLine = document.createElement('div');
                    enLine.className = 'phone-phrase-en';
                    enLine.textContent = p.en;
                    const cnLine = document.createElement('div');
                    cnLine.className = 'phone-phrase-cn';
                    cnLine.textContent = p.cn || '';
                    main.appendChild(enLine);
                    main.appendChild(cnLine);
                    const sp = document.createElement('button');
                    sp.type = 'button';
                    sp.className = 'phone-phrase-speak';
                    sp.setAttribute('aria-label', '朗读这句英文');
                    sp.textContent = '🔊';
                    sp.onclick = () => {
                        triggerHaptic();
                        speakDirect(p.en, null, 'en');
                    };
                    row.appendChild(main);
                    row.appendChild(sp);
                    wrap.appendChild(row);
                });
            });
        }
        function renderPhoneToolbox() {
            const root = document.getElementById('phone-tool-root');
            const scripts = window.PHONE_SCRIPTS;
            if (!root || !scripts || !scripts.length) return;
            if (root.dataset.rendered === '1') {
                showPhoneScriptCard(phoneToolboxLastId || 'universal');
                return;
            }
            root.dataset.rendered = '1';
            root.innerHTML = '';
            const hint = document.createElement('p');
            hint.className = 'phone-tool-hint';
            hint.textContent = '写给英语很吃力的人：能找中文客服或请人帮听，就优先用中文。这里只在不得不用英文时，给你最短句子；点 🔊 听手机念英文，你跟着说。';
            root.appendChild(hint);
            const grid = document.createElement('div');
            grid.className = 'phone-scenario-grid';
            scripts.forEach(sc => {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'phone-scenario-btn';
                b.setAttribute('data-phone-id', sc.id);
                b.textContent = sc.title;
                b.style.borderLeft = '3px solid ' + (sc.color || '#888');
                b.onclick = () => {
                    triggerHaptic();
                    showPhoneScriptCard(sc.id);
                };
                grid.appendChild(b);
            });
            root.appendChild(grid);
            const cardScroll = document.createElement('div');
            cardScroll.className = 'phone-card-scroll';
            const cardInner = document.createElement('div');
            cardInner.id = 'phoneCardWrap';
            cardScroll.appendChild(cardInner);
            root.appendChild(cardScroll);
            showPhoneScriptCard('universal');
        }
        function switchTool(idx) {
            triggerHaptic();
            hideListenflowHelpTip();
            document.querySelectorAll('.tool-tab').forEach((t, i) => t.classList.toggle('active', i === idx));
            document.querySelectorAll('.tool-section').forEach((s, i) => s.classList.toggle('active', i === idx));
            if (idx === 3) renderStatsPanel();
            if (idx === 4) renderEmergencyList();
            if (idx === 5) renderLifeContent();
            if (idx === 6) renderPronRef();
            if (idx === 7) renderListenflowPanel();
            if (idx === 8) renderPhoneToolbox();
        }

        const USER_BACKUP_FORMAT = 'xyy-user-backup';
        const USER_BACKUP_VERSION = 1;

        function collectLocalStorageDump() {
            const o = {};
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k !== null) o[k] = localStorage.getItem(k);
            }
            return o;
        }

        async function exportUserBackup() {
            triggerHaptic();
            const dump = collectLocalStorageDump();
            const payload = {
                format: USER_BACKUP_FORMAT,
                version: USER_BACKUP_VERSION,
                exportedAt: new Date().toISOString(),
                origin: location.origin + location.pathname,
                localStorage: dump
            };
            const text = JSON.stringify(payload, null, 2);
            const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
            const stamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '-');
            const baseName = '生存英语备份-' + stamp + '.json';

            try {
                if (window.showSaveFilePicker) {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: baseName,
                        types: [{ description: 'JSON 备份', accept: { 'application/json': ['.json'] } }]
                    });
                    const writable = await handle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                    showToast('备份已保存到所选位置');
                    return;
                }
            } catch (e) {
                if (e && e.name === 'AbortError') return;
            }

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = baseName;
            a.rel = 'noopener';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            showToast('已开始下载备份文件');
        }

        function triggerRestoreBackupPick() {
            triggerHaptic();
            const inp = document.getElementById('backupFileInput');
            if (inp) {
                inp.value = '';
                inp.click();
            }
        }

        function extractLocalStorageFromBackup(parsed) {
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
            if (typeof parsed.format === 'string' && parsed.format !== USER_BACKUP_FORMAT) return null;
            if (parsed.format === USER_BACKUP_FORMAT) {
                if (parsed.localStorage && typeof parsed.localStorage === 'object' && !Array.isArray(parsed.localStorage))
                    return parsed.localStorage;
                return null;
            }
            const reserved = { format: 1, version: 1, exportedAt: 1, origin: 1, localStorage: 1 };
            const out = {};
            Object.keys(parsed).forEach(function (k) {
                if (reserved[k]) return;
                const v = parsed[k];
                if (v !== null && v !== undefined && (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'))
                    out[k] = v;
            });
            return Object.keys(out).length > 0 ? out : null;
        }

        function onRestoreBackupFileInput(ev) {
            const f = ev.target && ev.target.files && ev.target.files[0];
            if (!f) return;
            const reader = new FileReader();
            reader.onload = function () {
                try {
                    const parsed = JSON.parse(String(reader.result || ''));
                    applyBackupAfterConfirm(parsed);
                } catch (err) {
                    showToast('无法解析文件：' + (err && err.message ? err.message : String(err)));
                }
            };
            reader.onerror = function () {
                showToast('读取文件失败');
            };
            reader.readAsText(f);
        }

        function applyBackupAfterConfirm(parsed) {
            const data = extractLocalStorageFromBackup(parsed);
            if (!data || typeof data !== 'object' || Array.isArray(data)) {
                showToast('备份格式无法识别，请使用本页导出的 JSON');
                return;
            }
            const incomingKeys = Object.keys(data);
            if (incomingKeys.length === 0) {
                showToast('备份里没有可用的数据');
                return;
            }
            const currentCount = localStorage.length;
            const sample = incomingKeys.slice(0, 6).join('、') + (incomingKeys.length > 6 ? '…' : '');
            const warn =
                '即将用备份【完全覆盖】本站点的本地存储。\n\n' +
                '• 当前约有 ' + currentCount + ' 条键；备份中有 ' + incomingKeys.length + ' 条。\n' +
                '• 部分键示例：' + sample + '\n' +
                '• 主题、学习进度、生词本、打卡、自定义内容等都会替换。\n' +
                '• 此操作不可撤销（可先导出当前数据再操作）。\n\n' +
                '确定要恢复吗？';
            if (!confirm(warn)) return;

            try {
                localStorage.clear();
                incomingKeys.forEach(function (k) {
                    const v = data[k];
                    if (v === null || v === undefined) return;
                    localStorage.setItem(k, typeof v === 'string' ? v : String(v));
                });
            } catch (e) {
                showToast('写入失败：' + (e && e.message ? e.message : String(e)));
                return;
            }
            showToast('已恢复，页面即将刷新…');
            setTimeout(function () { location.reload(); }, 500);
        }
        function convert(t){const f=document.getElementById('inp-f'),c=document.getElementById('inp-c'),lb=document.getElementById('inp-lb'),kg=document.getElementById('inp-kg'),oz=document.getElementById('inp-oz'),ml=document.getElementById('inp-ml');if(t==='f')c.value=f.value?((f.value-32)*5/9).toFixed(1):'';if(t==='c')f.value=c.value?((c.value*9/5)+32).toFixed(1):'';if(t==='lb')kg.value=lb.value?(lb.value*0.453).toFixed(1):'';if(t==='kg')lb.value=kg.value?(kg.value/0.453).toFixed(1):'';if(t==='oz')ml.value=oz.value?(oz.value*29.57).toFixed(1):'';if(t==='ml')oz.value=ml.value?(ml.value/29.57).toFixed(1):'';}
        function calcTip(){const b=parseFloat(document.getElementById('inp-bill').value)||0;document.getElementById('tip-15').innerText='$'+(b*1.15).toFixed(2);document.getElementById('tip-18').innerText='$'+(b*1.18).toFixed(2);document.getElementById('tip-20').innerText='$'+(b*1.20).toFixed(2);}
        function openToolbox() {
            triggerHaptic();
            hideListenflowHelpTip();
            hideRobotBubbleVisual();
            const ov = document.getElementById('toolOverlay');
            if (!ov) return;
            ov.style.display = 'flex';
        }
        function closeToolbox(){document.getElementById('toolOverlay').style.display='none';}
        function injectSmartKeywords(){/*...*/}
        function showToast(m){let t=document.getElementById('speechToast');if(!t){t=document.createElement('div');t.id='speechToast';t.className='speech-result-toast';document.body.appendChild(t);}t.innerText=m;t.style.display='block';setTimeout(()=>{t.style.display='none';},3000);}
       // 优化后的触感反馈，模拟 iOS 的 Taptic Engine
function triggerHaptic() {
    if (navigator.vibrate) {
        // 安卓机通常支持数组模式：[震动时长, 暂停时长, 震动时长]
        // 这里设置为极其短促的一下，类似机械按键
        navigator.vibrate(10); 
    }
}
        function initScrollHints(){const cards=document.querySelectorAll('.unit-card');cards.forEach(card=>{if(card.scrollHeight>card.clientHeight)card.querySelector('.scroll-hint')?.classList.add('visible');card.addEventListener('scroll',function(){this.querySelector('.scroll-hint')?.classList.remove('visible');});});}
        function dismissBubble(e){if(e){e.classList.add('fade-out');setTimeout(()=>{e.remove();},1000);}}
        function addCustomChip(u,s,p,x){triggerHaptic();const e=prompt("English:");if(!e)return;const c=prompt("Chinese:");if(!c)return;const d={unitNum:u,stepNum:s,eng:e,cn:c,prefix:p,suffix:x};const k=`custom_chips_u${u}_s${s}`;let l=JSON.parse(localStorage.getItem(k)||"[]");l.push(d);localStorage.setItem(k,JSON.stringify(l));renderAndClickChip(d,true);}
        let emergencyCurrentCategory = 'medical';
        let emergencyAutoplayTimer = null;
        let emergencyAutoplayIdx = -1;

        function stopEmergencyAutoplay() {
            if (emergencyAutoplayTimer) {
                clearInterval(emergencyAutoplayTimer);
                emergencyAutoplayTimer = null;
            }
            document.querySelectorAll('.emergency-phrase-active').forEach(el => el.classList.remove('emergency-phrase-active'));
        }

        function playEmergencyPhraseEn(p) {
            if (!p || !p.en) return;
            try { window.speechSynthesis.cancel(); } catch (e) {}
            speakDirect(p.en, null, 'en');
        }

        function renderEmergencyOverlayPhrases() {
            const list = document.getElementById('emergencyPhraseList');
            if (!list) return;
            const cat = EMERGENCY_CATEGORIES[emergencyCurrentCategory];
            list.innerHTML = '';
            if (!cat) return;
            cat.phrases.forEach((p, idx) => {
                const card = document.createElement('div');
                card.className = 'emergency-phrase-card' + (p.urgent ? ' emergency-urgent' : '');
                card.dataset.index = String(idx);
                const en = document.createElement('div');
                en.className = 'emergency-phrase-en';
                en.textContent = p.en;
                card.appendChild(en);
                if (p.cn) {
                    const cn = document.createElement('div');
                    cn.className = 'emergency-phrase-cn';
                    cn.textContent = p.cn;
                    card.appendChild(cn);
                }
                card.onclick = () => playEmergencyPhraseEn(p);
                list.appendChild(card);
            });
        }

        function setEmergencyCategory(cat) {
            triggerHaptic();
            if (!EMERGENCY_CATEGORIES[cat]) return;
            emergencyCurrentCategory = cat;
            document.querySelectorAll('#emergencyCatTabs .emergency-cat-tab').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.cat === cat);
            });
            renderEmergencyOverlayPhrases();
            const chk = document.getElementById('emergencyAutoplayChk');
            if (chk && chk.checked) restartEmergencyAutoplay();
        }

        function restartEmergencyAutoplay() {
            stopEmergencyAutoplay();
            const cat = EMERGENCY_CATEGORIES[emergencyCurrentCategory];
            if (!cat || !cat.phrases.length) return;
            emergencyAutoplayIdx = -1;
            const tick = () => {
                const ov = document.getElementById('emergencyOverlay');
                if (!ov || !ov.classList.contains('active')) {
                    stopEmergencyAutoplay();
                    const c = document.getElementById('emergencyAutoplayChk');
                    if (c) c.checked = false;
                    return;
                }
                emergencyAutoplayIdx = (emergencyAutoplayIdx + 1) % cat.phrases.length;
                const p = cat.phrases[emergencyAutoplayIdx];
                playEmergencyPhraseEn(p);
                document.querySelectorAll('#emergencyPhraseList .emergency-phrase-card').forEach((el, j) => {
                    el.classList.toggle('emergency-phrase-active', j === emergencyAutoplayIdx);
                });
                const activeEl = document.querySelector('#emergencyPhraseList .emergency-phrase-card.emergency-phrase-active');
                if (activeEl && activeEl.scrollIntoView) activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            };
            tick();
            emergencyAutoplayTimer = setInterval(tick, 3000);
        }

        function onEmergencyAutoplayChange() {
            const chk = document.getElementById('emergencyAutoplayChk');
            if (chk && chk.checked) restartEmergencyAutoplay();
            else stopEmergencyAutoplay();
        }

        function toggleEmergency() {
            triggerHaptic();
            const el = document.getElementById('emergencyOverlay');
            if (!el) return;
            const nowActive = !el.classList.contains('active');
            el.classList.toggle('active', nowActive);
            if (nowActive) {
                hideRobotBubbleVisual();
                renderEmergencyOverlayPhrases();
                const chk = document.getElementById('emergencyAutoplayChk');
                if (chk && chk.checked) restartEmergencyAutoplay();
            } else {
                stopEmergencyAutoplay();
                if (document.getElementById('emergencyAutoplayChk')) document.getElementById('emergencyAutoplayChk').checked = false;
            }
        }
        function loadUsageData(){usageData=JSON.parse(localStorage.getItem('unit_usage')||"{}");}
        function incrementUsage(u) {
            usageData[u] = (usageData[u] || 0) + 1;
            localStorage.setItem('unit_usage', JSON.stringify(usageData));
        }
        function checkMonthlyReport(){/*...*/ }
        function showMonthlySummary(m){/*...*/ }
        function startRandomDrill() {
            triggerHaptic();
            hideRobotBubbleVisual();
            const modal = document.getElementById('randomModal');
            if (!modal) return;
            if (modal.style.display === 'flex') return;
            speedDrillSessionData = [];
            modal.style.display = 'flex';
            loadNewDrillQuestion();
        }
        function updateDrillStreakDisplay() {
            const el = document.getElementById('drillStreak');
            if (!el) return;
            let n = 0;
            try { n = parseInt(localStorage.getItem(DRILL_STREAK_KEY) || '0', 10); } catch (e) {}
            el.textContent = `连续答对 ${n} 题 🔥`;
        }
        function stopDrillTimer() {
            if (drillTimerInterval) {
                clearInterval(drillTimerInterval);
                drillTimerInterval = null;
            }
        }
        function updateDrillPreStartHelpText() {
            const el = document.getElementById('drillPreStartHelpText');
            if (!el) return;
            const intro = '准备好后再开始：点「开始测试」后才会倒计时，麦克风会自动打开，无需再点别的按钮。';
            if (drillMode === 'speed') {
                el.innerHTML = `${intro}<br><br>⚡ <strong>速度挑战</strong>：节奏更紧，本局没有「看答案」。`;
            } else {
                el.innerHTML = `${intro}<br><br>🎯 <strong>普通模式</strong>：时间相对宽裕，可随时点「看答案」提前看参考答案（本局点「看答案」会让连胜清零）。`;
            }
        }

        function setDrillMode(mode) {
            drillMode = mode;
            try { localStorage.setItem(LS_DRILL_MODE_PREF, mode); } catch (e) {}
            const nb = document.getElementById('drillModeNormal');
            const sb = document.getElementById('drillModeSpeed');
            if (nb) {
                nb.style.background = mode === 'normal' ? 'var(--primary)' : 'var(--display-area)';
                nb.style.borderColor = mode === 'normal' ? 'var(--primary)' : 'var(--border)';
                nb.style.color = mode === 'normal' ? 'white' : 'var(--text-sub)';
            }
            if (sb) {
                sb.style.background = mode === 'speed' ? 'var(--danger)' : 'var(--display-area)';
                sb.style.borderColor = mode === 'speed' ? 'var(--danger)' : 'var(--border)';
                sb.style.color = mode === 'speed' ? 'white' : 'var(--text-sub)';
            }
            const revealBtn = document.getElementById('drillRevealBtn');
            if (revealBtn) {
                if (drillRoundPhase === 'ready') revealBtn.style.display = 'none';
                else revealBtn.style.display = (mode === 'speed') ? 'none' : '';
            }
            if (drillRoundPhase === 'playing') {
                stopDrillTimer();
                beginDrillTimer();
            }
            updateDrillPreStartHelpText();
        }

        function beginDrillTimer() {
            stopDrillTimer();
            const seconds = drillMode === 'speed' ? SPEED_DRILL_SECONDS : DRILL_SECONDS;
            let secondsLeft = seconds;
            const numEl = document.getElementById('drillTimerNum');
            const ring = document.getElementById('drillTimerRing');
            if (numEl) numEl.textContent = String(secondsLeft);
            if (ring) ring.classList.toggle('urgent', secondsLeft <= 2);
            drillTimerInterval = setInterval(() => {
                if (drillRoundPhase !== 'playing') return;
                secondsLeft--;
                if (numEl) numEl.textContent = String(Math.max(0, secondsLeft));
                if (ring) ring.classList.toggle('urgent', secondsLeft <= 2 && secondsLeft > 0);
                if (secondsLeft <= 0) {
                    stopDrillTimer();
                    drillTimeUp();
                }
            }, 1000);
        }
        function cleanDrillTextForMatch(s) {
            if (!s) return '';
            return String(s).toLowerCase().replace(/['"]/g, ' ').replace(/[.,?!]/g, ' ').replace(/\s+/g, ' ').trim();
        }
        function ambushPhraseGradeMatch(spoken, q) {
            const utter = cleanDrillTextForMatch(spoken);
            if (!utter) return false;
            const hints = q.userHints || [];
            if (!hints.length) return false;
            let hit = 0;
            hints.forEach(h => {
                const t = String(h).toLowerCase().trim();
                if (t.length > 1 && utter.includes(t)) hit++;
            });
            const need = Math.max(2, Math.ceil(hints.length * 0.22));
            return hit >= Math.min(need, hints.length);
        }
        function drillGradeMatch(spoken) {
            if (!currentDrillData || !currentDrillData.q) return false;
            const target = cleanDrillTextForMatch(currentDrillData.q.en);
            const utter = cleanDrillTextForMatch(spoken);
            if (!target || !utter) return false;
            if (utter.includes(target) || target.includes(utter)) return true;
            const tWords = target.split(/\s+/).filter(w => w.length > 2);
            if (!tWords.length) return false;
            const hit = tWords.filter(w => utter.includes(w));
            return hit.length >= Math.max(1, Math.ceil(tWords.length * 0.45));
        }
        function beginDrillRound() {
            if (!recognition) {
                openMessageModal('无法使用语音识别', MSG_SPEECH_UNSUPPORTED);
                return;
            }
            if (drillRoundPhase !== 'ready') return;
            triggerHaptic();
            const pre = document.getElementById('drillPreStart');
            if (pre) pre.style.display = 'none';
            const tr = document.getElementById('drillTimerRow');
            const hint = document.getElementById('drillGameHint');

            if (tr) tr.style.display = 'flex';
            if (hint) {
                hint.style.display = 'block';
                hint.innerText = drillMode === 'speed'
                    ? '⚡ 速度模式：倒计时内用英语说出口（麦克风已开）。'
                    : '🎤 倒计时内用英语说出口，或点「看答案」（麦克风已开）。';
            }
            const revealBtn = document.getElementById('drillRevealBtn');
            if (revealBtn) revealBtn.style.display = drillMode === 'speed' ? 'none' : '';
            drillRoundPhase = 'playing';
            beginDrillTimer();
            startDrillListening();
        }

        function startDrillListening() {
            if (!recognition) { openMessageModal('无法使用语音识别', MSG_SPEECH_UNSUPPORTED); return; }
            if (drillRoundPhase !== 'playing') return;
            recognition.onresult = (e) => {
                const spoken = e.results[e.results.length - 1][0].transcript;
                if (drillGradeMatch(spoken)) {
                    completeDrillWithSuccess();
                } else {
                    showToast('再试一次 🔁');
                }
            };
            recognition.onend = () => {
                if (drillRoundPhase !== 'playing') return;
                setTimeout(() => {
                    if (drillRoundPhase === 'playing') {
                        try { recognition.start(); } catch (err) {}
                    }
                }, 200);
            };
            try { recognition.start(); } catch (err) {}
        }
        function completeDrillWithSuccess() {
            if (drillRoundPhase !== 'playing') return;
            drillRoundPhase = 'revealed';
            try { if (recognition) recognition.abort(); } catch (e) {}
            stopDrillTimer();
            if (currentDrillData && currentDrillData.q) {
                speedDrillSessionData.push({ eng: currentDrillData.q.en, correct: true });
                markWeakWordCorrect(currentDrillData.q.en);
            }
            try {
                const n = parseInt(localStorage.getItem(DRILL_STREAK_KEY) || '0', 10) + 1;
                localStorage.setItem(DRILL_STREAK_KEY, String(n));
            } catch (e) {}
            updateDrillStreakDisplay();
            showDrillAnswerUI(true);
        }
        function revealDrillAnswer(isGiveUp) {
            if (drillRoundPhase !== 'playing') return;
            drillRoundPhase = 'revealed';
            try { if (recognition) recognition.abort(); } catch (e) {}
            stopDrillTimer();
            if (currentDrillData && currentDrillData.q) {
                speedDrillSessionData.push({ eng: currentDrillData.q.en, correct: false });
            }
            if (isGiveUp) {
                try { localStorage.setItem(DRILL_STREAK_KEY, '0'); } catch (e) {}
                updateDrillStreakDisplay();
            }
            showDrillAnswerUI(false);
        }
        function drillTimeUp() {
            if (drillRoundPhase !== 'playing') return;
            drillRoundPhase = 'revealed';
            try { if (recognition) recognition.abort(); } catch (e) {}
            if (currentDrillData && currentDrillData.q) {
                speedDrillSessionData.push({ eng: currentDrillData.q.en, correct: false });
            }
            try { localStorage.setItem(DRILL_STREAK_KEY, '0'); } catch (e) {}
            updateDrillStreakDisplay();
            showDrillAnswerUI(false);
        }
        function showDrillAnswerUI(wasCorrect) {
            drillRoundPhase = 'revealed';
            const ans = document.getElementById('drillAnswer');
            if (ans) ans.style.display = 'block';
            const tr = document.getElementById('drillTimerRow');
            if (tr) tr.style.display = 'none';
            const hint = document.getElementById('drillGameHint');
            if (hint) hint.style.display = 'none';
            const play = document.getElementById('drillActionsPlay');
            if (play) play.style.display = 'none';
            const post = document.getElementById('drillActionsPost');
            if (post) post.style.display = 'flex';
            try { if (recognition) recognition.abort(); } catch (e) {}
            if (wasCorrect) showToast('答对了！');
            if (currentDrillData && currentDrillData.q) speakDirect(currentDrillData.q.en, null, 'en');
        }
        function loadNewDrillQuestion() {
            stopDrillTimer();
            try { if (recognition) recognition.abort(); } catch (e) {}
            drillRoundPhase = 'ready';
            setDrillMode(drillMode);

            const unitIds = Object.keys(DRILL_QUESTIONS).map(Number);
            const uid = unitIds[Math.floor(Math.random() * unitIds.length)];
            const questions = DRILL_QUESTIONS[uid];
            const q = questions[Math.floor(Math.random() * questions.length)];
            currentDrillData = { uid, q };

            const card = document.getElementById(`u${uid}`);
            const sceneName = card ? card.getAttribute('data-name') : `场景 ${uid}`;
            const sceneEl = document.getElementById('drillSceneLabel');
            if (sceneEl) {
                sceneEl.innerText = `📂 ${sceneName}`;
            }
            const dq = document.getElementById('drillQuestion');
            if (dq) {
                let line = String(q.cn || '').trim();
                if (line.startsWith('请说：')) line = line.slice(3).trim();
                dq.innerText = '请说：' + line;
            }
            const answerBlock = document.getElementById('drillAnswer');
            if (answerBlock) answerBlock.style.display = 'none';
            const at = document.getElementById('drillAnswerText');
            if (at) at.innerText = q.en;
            const pre = document.getElementById('drillPreStart');
            if (pre) pre.style.display = 'block';
            const tr = document.getElementById('drillTimerRow');
            if (tr) tr.style.display = 'none';
            const hint = document.getElementById('drillGameHint');
            if (hint) {
                hint.style.display = 'block';
                hint.innerText = '点「开始测试」后将开始倒计时并自动打开麦克风。';
            }
            const revealBtn = document.getElementById('drillRevealBtn');
            if (revealBtn) revealBtn.style.display = 'none';
            const play = document.getElementById('drillActionsPlay');
            if (play) play.style.display = 'flex';
            const post = document.getElementById('drillActionsPost');
            if (post) post.style.display = 'none';
            const ring = document.getElementById('drillTimerRing');
            if (ring) ring.classList.remove('urgent');

            updateDrillStreakDisplay();

            const repliesEl = document.getElementById('drillReplies');
            if (repliesEl) {
                repliesEl.innerHTML = '';
                (q.replies || []).forEach(r => {
                    const row = document.createElement('div');
                    row.style.cssText = 'background:var(--display-area);border-radius:8px;padding:8px 12px;border-left:3px solid var(--accent);display:flex;justify-content:space-between;align-items:center;';
                    const span = document.createElement('span');
                    span.style.fontSize = '0.88em';
                    span.textContent = r;
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:0.9em;';
                    btn.innerText = '🔊';
                    btn.onclick = () => speakDirect(r, null, 'en');
                    row.appendChild(span);
                    row.appendChild(btn);
                    repliesEl.appendChild(row);
                });
            }
        }
        function speakDrillAnswer() {
            if (!currentDrillData || !currentDrillData.q) return;
            speakDirect(currentDrillData.q.en, null, 'en');
        }
        function nextRandomDrill() {
            triggerHaptic();
            loadNewDrillQuestion();
        }

        function getAmbushEnabled() {
            try { return localStorage.getItem(LS_AMBUSH_ENABLED) !== '0'; } catch (e) { return true; }
        }
        function setAmbushEnabled(v) {
            try { localStorage.setItem(LS_AMBUSH_ENABLED, v ? '1' : '0'); } catch (e) {}
        }
        function clearAmbushListenTimer() {
            if (ambushCountdownInterval) {
                clearInterval(ambushCountdownInterval);
                ambushCountdownInterval = null;
            }
        }
        function clearAmbushSchedule() {
            if (ambushTimerId) {
                clearTimeout(ambushTimerId);
                ambushTimerId = null;
            }
        }
        function shouldBlockAmbushPopup() {
            if (document.hidden) return true;
            if (ambushOverlayActive) return true;
            const modals = ['randomModal', 'achievementsModal', 'goalsModal', 'favoritesModal', 'streakModal', 'messageModal', 'reportModal', 'usageTutorialModal', 'ambushExplainModal'];
            for (const id of modals) {
                const el = document.getElementById(id);
                if (el && el.style.display === 'flex') return true;
            }
            const ob = document.getElementById('onboarding-layer');
            if (ob && ob.classList.contains('onboarding-layer--visible')) return true;
            const em = document.getElementById('emergencyOverlay');
            if (em && em.classList.contains('active')) return true;
            const chat = document.getElementById('chatOverlay');
            if (chat && chat.style.display === 'flex') return true;
            const tool = document.getElementById('toolOverlay');
            if (tool && tool.style.display === 'flex') return true;
            const sc = document.querySelector('.show-card-overlay');
            if (sc && sc.style.display === 'flex') return true;
            return false;
        }
        function scheduleNextAmbush() {
            clearAmbushSchedule();
            if (!getAmbushEnabled()) return;
            const delay = 180000 + Math.random() * 300000;
            ambushTimerId = setTimeout(() => {
                ambushTimerId = null;
                tryLaunchAmbush();
            }, delay);
        }
        function tryLaunchAmbush() {
            if (!getAmbushEnabled()) return;
            if (shouldBlockAmbushPopup()) {
                scheduleNextAmbush();
                return;
            }
            const p = AMBUSH_PROMPTS[Math.floor(Math.random() * AMBUSH_PROMPTS.length)];
            showAmbushOverlay(p);
        }
        function showAmbushOverlay(p) {
            const ov = document.getElementById('ambushOverlay');
            if (!ov) return;
            hideRobotBubbleVisual();
            try { if (recognition) recognition.abort(); } catch (e) {}
            ambushOverlayActive = true;
            ambushListenPhase = 'prep';
            ambushCurrentPrompt = p;
            ambushRoundSettled = false;

            ov.innerHTML = '';
            ov.style.display = 'flex';
            ov.setAttribute('aria-hidden', 'false');

            const card = document.createElement('div');
            card.className = 'ambush-card';
            card.innerHTML = `
                <button type="button" class="ambush-close-x" aria-label="关闭">✕</button>
                <div id="ambushOverlayTitle" style="font-weight:900;font-size:1.15em;margin-bottom:12px;padding-right:28px;">🎭 对话突袭！</div>
                <div id="ambushSituation" style="font-size:0.95em;line-height:1.5;margin-bottom:12px;color:var(--text-main);"></div>
                <div style="font-size:0.78em;color:var(--text-sub);margin-bottom:4px;">对方说（点「开始回答」后自动朗读）：</div>
                <div id="ambushBotEn" style="font-weight:800;font-size:1.02em;line-height:1.35;margin-bottom:6px;"></div>
                <div id="ambushBotCn" style="font-size:0.86em;color:var(--text-sub);margin-bottom:14px;"></div>
                <div id="ambushPhasePrep">
                    <button type="button" id="ambushBtnStart" class="modal-btn btn-reveal" style="width:100%;padding:12px;font-weight:800;">🎙️ 点按开始回答</button>
                </div>
                <div id="ambushPhaseListen" style="display:none;margin-top:12px;">
                    <div style="display:flex;align-items:center;gap:10px;justify-content:center;margin-bottom:8px;">
                        <div class="drill-timer-ring" id="ambushRing"><span id="ambushNum">7</span></div>
                        <span style="font-size:0.85em;color:var(--text-sub);">秒内用英语接话</span>
                    </div>
                    <p style="font-size:0.8em;color:var(--text-sub);text-align:center;margin:0;">麦克风已开，说出来即可</p>
                </div>
                <div id="ambushPhaseResult" style="display:none;margin-top:12px;">
                    <div id="ambushResultMsg" style="font-weight:800;margin-bottom:8px;"></div>
                    <div style="font-size:0.78em;color:var(--text-sub);margin-bottom:4px;">参考接法：</div>
                    <div id="ambushSample" style="background:var(--primary-light);border-radius:10px;padding:10px;font-weight:600;color:var(--primary);"></div>
                    <button type="button" id="ambushBtnDone" class="modal-btn" style="width:100%;margin-top:12px;background:var(--primary);color:white;">知道了</button>
                </div>
                <label style="display:flex;align-items:flex-start;gap:8px;margin-top:16px;font-size:0.78em;color:var(--text-sub);cursor:pointer;">
                    <input type="checkbox" id="ambushPauseChk" style="margin-top:3px;flex-shrink:0;" />
                    <span>关闭本弹窗并暂时关闭突袭模式（可点顶栏 🎭 重新开启并阅读说明）</span>
                </label>
            `;
            ov.appendChild(card);

            card.querySelector('#ambushSituation').textContent = (p.situationCn || '').trim();
            card.querySelector('#ambushBotEn').textContent = p.botEn;
            card.querySelector('#ambushBotCn').textContent = p.botCn || '';

            card.querySelector('.ambush-close-x').onclick = () => closeAmbushOverlay();
            card.querySelector('#ambushBtnStart').onclick = () => onAmbushStartAnswer();
            card.querySelector('#ambushBtnDone').onclick = () => closeAmbushOverlay();
            triggerHaptic();
        }
        function onAmbushStartAnswer() {
            if (!ambushCurrentPrompt) return;
            triggerHaptic();
            const prep = document.getElementById('ambushPhasePrep');
            if (prep) prep.style.display = 'none';
            ambushListenPhase = 'tts';
            speakDirect(ambushCurrentPrompt.botEn, () => {
                if (!ambushOverlayActive || ambushListenPhase !== 'tts') return;
                ambushListenPhase = 'listen';
                const pl = document.getElementById('ambushPhaseListen');
                if (pl) pl.style.display = 'block';
                let sec = AMBUSH_RESPONSE_SECONDS;
                const numEl = document.getElementById('ambushNum');
                const ring = document.getElementById('ambushRing');
                if (numEl) numEl.textContent = String(sec);
                clearAmbushListenTimer();
                ambushCountdownInterval = setInterval(() => {
                    sec--;
                    if (numEl) numEl.textContent = String(Math.max(0, sec));
                    if (ring) ring.classList.toggle('urgent', sec <= 2 && sec > 0);
                    if (sec <= 0) {
                        clearAmbushListenTimer();
                        ambushFinishRound(false);
                    }
                }, 1000);
                startAmbushRecognition();
            }, 'en');
        }
        function startAmbushRecognition() {
            if (!recognition) {
                showToast('当前浏览器不支持语音识别');
                ambushFinishRound(false);
                return;
            }
            try { recognition.abort(); } catch (e) {}
            recognition.onresult = (e) => {
                if (ambushListenPhase !== 'listen' || ambushRoundSettled) return;
                const spoken = e.results[e.results.length - 1][0].transcript;
                if (ambushPhraseGradeMatch(spoken, ambushCurrentPrompt)) {
                    ambushFinishRound(true);
                } else {
                    showToast('再试一次 🔁');
                }
            };
            recognition.onend = () => {
                if (ambushListenPhase !== 'listen' || ambushRoundSettled) return;
                setTimeout(() => {
                    if (ambushListenPhase === 'listen' && ambushOverlayActive && !ambushRoundSettled) {
                        try { recognition.start(); } catch (err) {}
                    }
                }, 200);
            };
            try { recognition.start(); } catch (e) {}
        }
        function ambushFinishRound(ok) {
            if (ambushRoundSettled) return;
            ambushRoundSettled = true;
            ambushListenPhase = 'result';
            clearAmbushListenTimer();
            try { if (recognition) recognition.abort(); } catch (e) {}
            const listen = document.getElementById('ambushPhaseListen');
            if (listen) listen.style.display = 'none';
            const res = document.getElementById('ambushPhaseResult');
            if (res) res.style.display = 'block';
            const rm = document.getElementById('ambushResultMsg');
            if (rm) rm.textContent = ok ? '✅ 接得不错！' : '⏱ 时间到或未听清，可参考下面说法再说一次。';
            const sp = document.getElementById('ambushSample');
            if (sp && ambushCurrentPrompt) sp.textContent = ambushCurrentPrompt.sample;
            if (ok) {
                try {
                    const n = parseInt(localStorage.getItem(LS_RAID_DRILL_OK) || '0', 10) + 1;
                    localStorage.setItem(LS_RAID_DRILL_OK, String(n));
                } catch (e) {}
                showToast('答对了！');
            } else if (ambushCurrentPrompt) {
                const hint = '[对话突袭] ' + (ambushCurrentPrompt.situationCn || '');
                recordWeakWord(ambushCurrentPrompt.sample, hint, ambushCurrentPrompt.uid || 0, 'ambush_fail');
                const sc = document.getElementById('stats-content');
                if (sc) renderStatsPanel();
            }
            if (ambushCurrentPrompt) speakDirect(ambushCurrentPrompt.sample, null, 'en');
        }
        function closeAmbushOverlay() {
            const chk = document.getElementById('ambushPauseChk');
            if (chk && chk.checked) {
                setAmbushEnabled(false);
                showToast('突袭模式已关闭，可点顶栏 🎭 重新开启');
                renderHeaderProgressBadges();
            }
            clearAmbushListenTimer();
            try { if (recognition) recognition.abort(); } catch (e) {}
            const ov = document.getElementById('ambushOverlay');
            if (ov) {
                ov.style.display = 'none';
                ov.innerHTML = '';
                ov.setAttribute('aria-hidden', 'true');
            }
            ambushOverlayActive = false;
            ambushListenPhase = 'idle';
            ambushCurrentPrompt = null;
            ambushRoundSettled = false;
            scheduleNextAmbush();
        }
        function confirmAmbushExplain() {
            triggerHaptic();
            setAmbushEnabled(true);
            const m = document.getElementById('ambushExplainModal');
            if (m) m.style.display = 'none';
            showToast('突袭模式已开启');
            renderHeaderProgressBadges();
            scheduleNextAmbush();
        }
        function closeAmbushExplainModal() {
            const m = document.getElementById('ambushExplainModal');
            if (m) m.style.display = 'none';
        }
        function toggleAmbushFromHeader() {
            triggerHaptic();
            if (getAmbushEnabled()) {
                setAmbushEnabled(false);
                clearAmbushSchedule();
                showToast('突袭模式已关闭');
                renderHeaderProgressBadges();
            } else {
                const m = document.getElementById('ambushExplainModal');
                if (m) m.style.display = 'flex';
            }
        }
        function initAmbushSystem() {
            if (!ambushVisibilityHooked) {
                ambushVisibilityHooked = true;
                document.addEventListener('visibilitychange', () => {
                    if (document.hidden) clearAmbushSchedule();
                    else if (getAmbushEnabled()) scheduleNextAmbush();
                });
            }
            if (getAmbushEnabled()) scheduleNextAmbush();
        }

        function generateSessionRecap() {
            if (speedDrillSessionData.length === 0) return;
            const correct = speedDrillSessionData.filter(d => d.correct).length;
            const total = speedDrillSessionData.length;
            const pct = Math.round(correct / total * 100);

            const recap = document.createElement('div');
            recap.id = 'session-recap-card';
            recap.style.cssText = 'position:fixed;bottom:max(90px,env(safe-area-inset-bottom)+20px);left:50%;transform:translateX(-50%);width:min(92vw,380px);background:var(--bg-card);border-radius:20px;padding:16px;box-shadow:0 8px 32px rgba(0,0,0,0.25);z-index:4000;border:1px solid var(--border);animation:modalIn 0.25s ease-out;';

            const head = document.createElement('div');
            head.style.cssText = 'font-weight:800;font-size:1em;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;';
            const ht = document.createElement('span');
            ht.textContent = '📋 本次练习小结';
            const hx = document.createElement('button');
            hx.type = 'button';
            hx.style.cssText = 'background:none;border:none;font-size:1.2em;cursor:pointer;color:var(--text-sub);';
            hx.textContent = '✕';
            hx.onclick = () => recap.remove();
            head.appendChild(ht);
            head.appendChild(hx);
            recap.appendChild(head);

            const stats = document.createElement('div');
            stats.style.cssText = 'display:flex;gap:10px;margin-bottom:12px;';
            [[String(total), '练习题数', 'var(--primary)'], [String(correct), '答对', '#34c759'], [`${pct}%`, '正确率', pct >= 70 ? '#34c759' : 'var(--danger)']].forEach(([num, label, color]) => {
                const cell = document.createElement('div');
                cell.style.cssText = 'flex:1;background:var(--display-area);border-radius:12px;padding:10px;text-align:center;';
                const nEl = document.createElement('div');
                nEl.style.cssText = `font-size:1.6em;font-weight:900;color:${color};`;
                nEl.textContent = num;
                const lEl = document.createElement('div');
                lEl.style.cssText = 'font-size:0.72em;color:var(--text-sub);';
                lEl.textContent = label;
                cell.appendChild(nEl);
                cell.appendChild(lEl);
                stats.appendChild(cell);
            });
            recap.appendChild(stats);

            const listLabel = document.createElement('div');
            listLabel.style.cssText = 'font-size:0.78em;color:var(--text-sub);margin-bottom:10px;';
            listLabel.textContent = '本次练习的句子：';
            recap.appendChild(listLabel);

            const listWrap = document.createElement('div');
            listWrap.style.cssText = 'display:flex;flex-direction:column;gap:5px;max-height:120px;overflow-y:auto;';
            speedDrillSessionData.forEach(d => {
                const row = document.createElement('div');
                row.style.cssText = `display:flex;align-items:center;gap:8px;font-size:0.82em;padding:5px 8px;background:var(--display-area);border-radius:8px;border-left:3px solid ${d.correct ? '#34c759' : 'var(--danger)'};`;
                const ic = document.createElement('span');
                ic.textContent = d.correct ? '✅' : '❌';
                const tx = document.createElement('span');
                tx.style.cssText = 'flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
                tx.textContent = d.eng;
                const sp = document.createElement('button');
                sp.type = 'button';
                sp.style.cssText = 'background:none;border:none;cursor:pointer;font-size:0.9em;';
                sp.textContent = '🔊';
                sp.onclick = () => speakDirect(d.eng, null, 'en');
                row.appendChild(ic);
                row.appendChild(tx);
                row.appendChild(sp);
                listWrap.appendChild(row);
            });
            recap.appendChild(listWrap);

            document.body.appendChild(recap);
            speedDrillSessionData = [];
            setTimeout(() => { if (recap.parentNode) recap.remove(); }, 30000);
        }

        function closeDrillModal() {
            stopDrillTimer();
            drillRoundPhase = 'idle';
            try { if (recognition) recognition.abort(); } catch (e) {}
            closeModal('randomModal');
            if (speedDrillSessionData.length >= 2) {
                setTimeout(generateSessionRecap, 400);
            }
        }
        function closeModal(id){document.getElementById(id).style.display='none';}
        function openUsageTutorial() {
            triggerHaptic();
            hideRobotBubbleVisual();
            const m = document.getElementById('usageTutorialModal');
            const b = document.getElementById('usageTutorialBody');
            if (m) m.style.display = 'flex';
            if (b) b.scrollTop = 0;
        }
        function closeUsageTutorial() {
            triggerHaptic();
            const m = document.getElementById('usageTutorialModal');
            if (m) m.style.display = 'none';
        }
        function scrollTutorialSection(id) {
            triggerHaptic();
            const tocBtn = document.querySelector(`#usageTutorialToc button[data-tutorial-target="${id}"]`);
            if (tocBtn) tocBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        let onboardingResizeHandler = null;
        function initFirstVisitOnboarding() {
            try {
                if (localStorage.getItem('seen_onboarding') === 'true') return;
            } catch (e) { return; }
            const step1 = document.getElementById('onboarding-step1-target');
            const step2 = document.getElementById('onboarding-step2-target');
            const step3 = document.getElementById('onboarding-step3-target');
            if (!step1 || !step2 || !step3) return;

            const texts = [
                '点击句子学习最常用表达',
                '点「播放」只听英文整句',
                '点「练习」跟读这一句'
            ];
            const targets = [step1, step2, step3];

            const layer = document.createElement('div');
            layer.id = 'onboarding-layer';
            layer.innerHTML = '<div class="onboarding-spotlight" id="onboarding-spotlight" aria-hidden="true"></div><div class="onboarding-card" role="dialog" aria-modal="true" aria-labelledby="onboarding-text"><button type="button" class="onboarding-skip" id="onboarding-skip">跳过</button><p class="onboarding-text" id="onboarding-text"></p><button type="button" class="onboarding-next" id="onboarding-next">下一步</button></div>';
            document.body.appendChild(layer);

            const spotlight = document.getElementById('onboarding-spotlight');
            const textEl = document.getElementById('onboarding-text');
            const btnNext = document.getElementById('onboarding-next');
            const btnSkip = document.getElementById('onboarding-skip');

            let stepIndex = 0;

            function applySpotlight(el) {
                const pad = 10;
                const r = el.getBoundingClientRect();
                if (r.width < 2 && r.height < 2) return;
                spotlight.style.top = (r.top - pad) + 'px';
                spotlight.style.left = (r.left - pad) + 'px';
                spotlight.style.width = (r.width + pad * 2) + 'px';
                spotlight.style.height = (r.height + pad * 2) + 'px';
            }

            function positionSpotlight(el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
                applySpotlight(el);
                requestAnimationFrame(() => applySpotlight(el));
                setTimeout(() => applySpotlight(el), 350);
            }

            function showStep(idx) {
                stepIndex = idx;
                textEl.textContent = texts[idx];
                btnNext.textContent = idx === texts.length - 1 ? '完成' : '下一步';
                positionSpotlight(targets[idx]);
            }

            function finish() {
                try { localStorage.setItem('seen_onboarding', 'true'); } catch (e) {}
                layer.classList.remove('onboarding-layer--visible');
                if (onboardingResizeHandler) {
                    window.removeEventListener('resize', onboardingResizeHandler);
                    onboardingResizeHandler = null;
                }
                setTimeout(() => { layer.remove(); }, 400);
            }

            function onNext() {
                if (stepIndex >= texts.length - 1) finish();
                else showStep(stepIndex + 1);
            }

            btnNext.onclick = () => { triggerHaptic(); onNext(); };
            btnSkip.onclick = () => { triggerHaptic(); finish(); };

            onboardingResizeHandler = () => applySpotlight(targets[stepIndex]);
            window.addEventListener('resize', onboardingResizeHandler);

            scrollToUnit('u11');
            requestAnimationFrame(() => {
                layer.classList.add('onboarding-layer--visible');
                showStep(0);
            });
        }
        function scrollToUnit(id){document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});}
        function getVisibleUnitCards() {
            return Array.from(document.querySelectorAll('#content-area .unit-card:not(.clone)')).filter(c => {
                if (!c.id || !/^u\d+$/.test(c.id)) return false;
                return c.style.display !== 'none';
            });
        }
        function updateCardNavButtons() {
            const prev = document.getElementById('cardNavPrev');
            const next = document.getElementById('cardNavNext');
            const n = getVisibleUnitCards().length;
            const dis = n < 2;
            if (prev) prev.disabled = dis;
            if (next) next.disabled = dis;
        }
        function scrollToAdjacentCard(delta) {
            triggerHaptic();
            const cards = getVisibleUnitCards();
            if (cards.length < 2) return;
            const container = document.getElementById('content-area');
            if (!container) return;
            const mid = container.getBoundingClientRect().left + container.clientWidth / 2;
            let bestIdx = 0;
            let bestD = Infinity;
            cards.forEach((c, i) => {
                const r = c.getBoundingClientRect();
                const cx = (r.left + r.right) / 2;
                const d = Math.abs(cx - mid);
                if (d < bestD) {
                    bestD = d;
                    bestIdx = i;
                }
            });
            const nextIdx = (bestIdx + delta + cards.length) % cards.length;
            scrollToUnit(cards[nextIdx].id);
        }
        function toggleTheme(){triggerHaptic();const h=document.documentElement;const n=h.getAttribute('data-theme')==='light'?'dark':'light';h.setAttribute('data-theme',n);localStorage.setItem('theme',n);setThemeColorMeta();}
        function setThemeColorMeta() {
            const tc = document.querySelector('meta[name="theme-color"]');
            if (!tc) return;
            const t = document.documentElement.getAttribute('data-theme');
            tc.setAttribute('content', t === 'light' ? '#fee12b' : '#1c1c1e');
        }
        function loadTheme(){const s=localStorage.getItem('theme');if(s)document.documentElement.setAttribute('data-theme',s);setThemeColorMeta();}
        function toggleFontSize() {
            const isLarge = document.documentElement.style.fontSize === '20px';
            document.documentElement.style.fontSize = isLarge ? '' : '20px';
            const b = document.getElementById('fontSizeBtn');
            if (b) b.style.color = isLarge ? '' : 'var(--primary)';
            localStorage.setItem('font_large', isLarge ? '' : '1');
        }
        function recordStudyTime(unitNum) {
            const key = `study_time_u${unitNum}`;
            const existing = JSON.parse(localStorage.getItem(key) || '[]');
            existing.push(Date.now());
            localStorage.setItem(key, JSON.stringify(existing.slice(-5)));
        }
        function renderReviewBadges() {
            document.querySelectorAll('.spaced-rep-banner').forEach(b => b.remove());
            for (let i = 1; i <= 16; i++) {
                const card = document.getElementById(`u${i}`);
                if (!card) continue;
                const boost = getSpacedRepetitionBoost(i);
                if (boost === 0) continue;
                const label = boost >= 80 ? '⏰ 7天前学过，是时候复习了' :
                    boost >= 55 ? '⏰ 3天了，趁热巩固一下' :
                        '⏰ 昨天学过，复习加深印象';
                const banner = document.createElement('div');
                banner.className = 'spaced-rep-banner';
                banner.textContent = label;
                card.insertBefore(banner, card.firstChild);
            }
        }
        function updateStreakOnPractice() {
            const today = new Date().toDateString();
            let data = JSON.parse(localStorage.getItem('streak_data') || '{"lastDate":"","count":0,"best":0}');
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yStr = yesterday.toDateString();
            if (data.lastDate === today) {
                /* already logged today */
            } else if (data.lastDate === yStr) {
                data.count = (data.count || 0) + 1;
                data.lastDate = today;
            } else {
                data.count = 1;
                data.lastDate = today;
            }
            data.best = Math.max(data.best || 0, data.count || 0);
            localStorage.setItem('streak_data', JSON.stringify(data));
            renderHeaderProgressBadges();
        }
        function renderHeaderProgressBadges() {
            const ha = document.querySelector('.header-actions');
            if (!ha) return;
            document.getElementById('streakBadge')?.remove();
            document.getElementById('headerGoalBtn')?.remove();
            document.getElementById('headerFavBtn')?.remove();
            document.getElementById('headerAchBtn')?.remove();
            document.getElementById('headerAmbushBtn')?.remove();
            const achUnlocked = getAchievementsUnlocked();
            const achCount = ACHIEVEMENT_DEFS.filter(d => achUnlocked[d.id]).length;
            const favCount = getFavoriteUnits().length;
            const streak = JSON.parse(localStorage.getItem('streak_data') || '{"lastDate":"","count":0,"best":0}');
            const meta = loadProgressMeta();
            const todayDone = (meta.dailySpeakCompletions || 0) >= 1;
            const badge = document.createElement('div');
            badge.id = 'streakBadge';
            badge.className = 'header-streak-badge' + (todayDone ? ' header-streak-badge--done' : ' header-streak-badge--pending');
            badge.style.cssText = 'font-size:0.78em;font-weight:800;display:flex;align-items:center;gap:2px;cursor:pointer;flex-shrink:0;';
            badge.innerHTML = `<span class="header-streak-fire" aria-hidden="true">🔥</span><span>${streak.count || 0}天</span>`;
            badge.title = `连续 ${streak.count || 0} 天 · 最高 ${streak.best || 0} 天 · ${todayDone ? '今日已完成跟读（点按看详情）' : '今日尚未完成跟读（点按看详情）'}`;
            badge.onclick = () => openStreakModal();
            ha.prepend(badge);

            const achBtn = document.createElement('button');
            achBtn.id = 'headerAchBtn';
            achBtn.type = 'button';
            achBtn.className = 'header-hub-btn';
            achBtn.textContent = '🏆';
            achBtn.title = `成就 ${achCount}/${ACHIEVEMENT_DEFS.length} · 按场景进度解锁徽章式成就`;
            achBtn.setAttribute('aria-label', '成就');
            achBtn.onclick = () => openAchievementsModal();

            const favHubBtn = document.createElement('button');
            favHubBtn.id = 'headerFavBtn';
            favHubBtn.type = 'button';
            favHubBtn.className = 'header-hub-btn' + (favCount ? ' header-fav-on' : '');
            favHubBtn.textContent = '⭐';
            favHubBtn.title = favCount ? `我的收藏（${favCount}）· 点按跳转` : '我的收藏 · 在场景卡片上点「收藏」';
            favHubBtn.setAttribute('aria-label', '我的收藏');
            favHubBtn.onclick = () => openFavoritesModal();

            const goalBtn = document.createElement('button');
            goalBtn.id = 'headerGoalBtn';
            goalBtn.type = 'button';
            goalBtn.className = 'header-hub-btn';
            goalBtn.textContent = '🎯';
            goalBtn.title = '出口目标：出国生存、看病、落地沟通等任务清单';
            goalBtn.setAttribute('aria-label', '出口目标');
            goalBtn.onclick = () => openGoalsModal();

            const ambushBtn = document.createElement('button');
            ambushBtn.id = 'headerAmbushBtn';
            ambushBtn.type = 'button';
            ambushBtn.className = 'header-hub-btn' + (getAmbushEnabled() ? ' header-ambush-on' : ' header-ambush-off');
            ambushBtn.textContent = '🎭';
            ambushBtn.title = getAmbushEnabled()
                ? '对话突袭：已开启（浏览时会不定时弹出；点按关闭）'
                : '对话突袭：已关闭（点按开启并查看说明）';
            ambushBtn.setAttribute('aria-label', '对话突袭模式');
            ambushBtn.onclick = () => toggleAmbushFromHeader();

            const fontBtn = document.getElementById('fontSizeBtn');
            ha.insertBefore(achBtn, fontBtn);
            ha.insertBefore(favHubBtn, achBtn);
            ha.insertBefore(goalBtn, favHubBtn);
            ha.insertBefore(ambushBtn, fontBtn);
        }
        function togglePin(unitNum) {
            const idx = pinnedUnits.indexOf(unitNum);
            if (idx > -1) pinnedUnits.splice(idx, 1);
            else {
                if (pinnedUnits.length >= 3) { showToast('最多置顶3个场景'); return; }
                pinnedUnits.push(unitNum);
            }
            localStorage.setItem('pinned_units', JSON.stringify(pinnedUnits));
            autoSortUnits();
            rebuildActionButtons();
            injectLogicButtons();
            injectShareButtons();
            injectRecordingButtons();
            refreshInfiniteLoopClones();
            initPinHandlers();
            initChipCollapse();
        }
        function initPinHandlers() {
            document.querySelectorAll('.unit-card:not(.clone)').forEach(card => {
                if (card._pinBound) return;
                const m = /^u(\d+)$/.exec(card.id);
                if (!m) return;
                const uid = parseInt(m[1], 10);
                const header = card.querySelector('.unit-header');
                if (!header) return;
                card._pinBound = true;
                header.addEventListener('contextmenu', (e) => {
                    if (e.target.closest('.qr-share-btn') || e.target.closest('.unit-fav-btn')) return;
                    e.preventDefault();
                    togglePin(uid);
                    showToast(pinnedUnits.includes(uid) ? '📌 已置顶' : '已取消置顶');
                });
            });
        }
        function showQRCode(unitNum) {
            const card = document.getElementById(`u${unitNum}`);
            if (!card) return;
            const sceneName = card.getAttribute('data-name');
            const url = `${location.origin}${location.pathname}?scene=u${unitNum}`;

            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:11000;display:flex;align-items:center;justify-content:center;';
            overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

            const box = document.createElement('div');
            box.style.cssText = 'background:var(--bg-card);border-radius:24px;padding:24px;text-align:center;width:260px;';
            const t1 = document.createElement('div');
            t1.style.cssText = 'font-weight:800;font-size:1em;margin-bottom:4px;';
            t1.textContent = `📷 扫码直达「${sceneName}」`;
            const t2 = document.createElement('div');
            t2.style.cssText = 'font-size:0.78em;color:var(--text-sub);margin-bottom:16px;';
            t2.textContent = '用通讯软件扫码 → 直接打开这个场景';
            const qc = document.createElement('div');
            qc.id = 'qrcode-container';
            qc.style.cssText = 'display:flex;justify-content:center;margin-bottom:16px;';
            const closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.style.cssText = 'width:100%;padding:10px;border-radius:12px;border:none;background:var(--primary);color:white;font-weight:700;cursor:pointer;';
            closeBtn.textContent = '关闭';
            closeBtn.onclick = () => overlay.remove();
            box.appendChild(t1);
            box.appendChild(t2);
            box.appendChild(qc);
            box.appendChild(closeBtn);
            overlay.appendChild(box);
            document.body.appendChild(overlay);

            setTimeout(() => {
                try {
                    if (typeof QRCode === 'undefined') throw new Error('no QR');
                    new QRCode(qc, {
                        text: url, width: 160, height: 160,
                        colorDark: '#1c1c1e', colorLight: '#ffffff',
                        correctLevel: QRCode.CorrectLevel.M
                    });
                } catch (e) {
                    qc.textContent = '二维码生成失败，请检查网络';
                }
            }, 100);
        }

        function handleSceneDeepLink() {
            const params = new URLSearchParams(location.search);
            const scene = params.get('scene');
            if (scene && document.getElementById(scene)) {
                setTimeout(() => scrollToUnit(scene), 800);
                history.replaceState(null, '', location.pathname);
            }
        }

        const RECORDING_MAX_PER_CARD = 2;

        const RecordingDB = {
            dbName: 'SurvivalEnglishRecordings',
            storeName: 'recordings',
            dbVersion: 2,
            db: null,
            open() {
                if (this.db) return Promise.resolve(this.db);
                return new Promise((resolve, reject) => {
                    const req = indexedDB.open(this.dbName, this.dbVersion);
                    req.onupgradeneeded = e => {
                        const db = e.target.result;
                        if (!db.objectStoreNames.contains(this.storeName)) {
                            db.createObjectStore(this.storeName, { keyPath: 'unitNum' });
                        }
                        if (e.oldVersion < 2) {
                            const tx = e.target.transaction(this.storeName, 'readwrite');
                            const store = tx.objectStore(this.storeName);
                            store.openCursor().onsuccess = ev => {
                                const cur = ev.target.result;
                                if (!cur) return;
                                const v = cur.value;
                                if (v && v.blob && !Array.isArray(v.records)) {
                                    const sid = v.savedAt || Date.now();
                                    cur.update({
                                        unitNum: v.unitNum,
                                        records: [{ id: sid, blob: v.blob, eng: '', cn: '', savedAt: sid }]
                                    });
                                }
                                cur.continue();
                            };
                        }
                    };
                    req.onsuccess = e => { this.db = e.target.result; resolve(this.db); };
                    req.onerror = () => reject(req.error);
                });
            },
            normalizeRow(v) {
                if (!v) return null;
                if (Array.isArray(v.records)) return v;
                if (v.blob) {
                    const sid = v.savedAt || Date.now();
                    return { unitNum: v.unitNum, records: [{ id: sid, blob: v.blob, eng: '', cn: '', savedAt: sid }] };
                }
                return v;
            },
            get(unitNum) {
                return this.open().then(db => new Promise((res, rej) => {
                    const tx = db.transaction(this.storeName, 'readonly');
                    const r = tx.objectStore(this.storeName).get(unitNum);
                    r.onsuccess = () => res(RecordingDB.normalizeRow(r.result || null));
                    r.onerror = () => rej(r.error);
                }));
            },
            putRow(row) {
                return this.open().then(db => new Promise((res, rej) => {
                    const tx = db.transaction(this.storeName, 'readwrite');
                    tx.objectStore(this.storeName).put(row);
                    tx.oncomplete = () => res();
                    tx.onerror = () => rej(tx.error);
                }));
            },
            async addRecord(unitNum, blob, eng, cn) {
                const prev = await this.get(unitNum);
                const records = (prev && prev.records) ? prev.records.slice() : [];
                const id = Date.now();
                records.unshift({ id, blob, eng: eng || '', cn: cn || '', savedAt: id });
                while (records.length > RECORDING_MAX_PER_CARD) records.pop();
                await this.putRow({ unitNum, records });
            },
            async deleteRecord(unitNum, recId) {
                const prev = await this.get(unitNum);
                if (!prev || !prev.records) return;
                const next = prev.records.filter(r => r.id !== recId);
                if (!next.length) {
                    await this.delete(unitNum);
                    return;
                }
                await this.putRow({ unitNum, records: next });
            },
            delete(unitNum) {
                return this.open().then(db => new Promise((res, rej) => {
                    const tx = db.transaction(this.storeName, 'readwrite');
                    tx.objectStore(this.storeName).delete(unitNum);
                    tx.oncomplete = () => res();
                    tx.onerror = () => rej(tx.error);
                }));
            }
        };

        let mediaRecorder = null;
        let recordingChunks = [];
        let recordingUnitNum = null;

        function playRecordingCompare(rec, orderMode) {
            const url = URL.createObjectURL(rec.blob);
            const audio = new Audio(url);
            const eng = (rec.eng || '').trim();
            const refFirst = orderMode === 'ref-first';
            const cleanup = () => { try { URL.revokeObjectURL(url); } catch (e) {} };
            const playBlob = () => {
                audio.onended = cleanup;
                audio.onerror = cleanup;
                audio.play().catch(() => { cleanup(); showToast('无法播放录音'); });
            };
            if (refFirst) {
                if (!eng) {
                    showToast('▶ 播放你的录音…');
                    playBlob();
                    return;
                }
                window.speechSynthesis.cancel();
                showToast('先听录制时的完整句（英文）…');
                speakDirect(eng, () => {
                    showToast('▶ 播放你的录音…');
                    playBlob();
                }, 'en');
                return;
            }
            showToast('▶ 播放你的录音…');
            audio.onended = () => {
                cleanup();
                if (eng) {
                    setTimeout(() => {
                        showToast('🔊 对比标准读法（录制时的完整句）');
                        speakDirect(eng, null, 'en');
                    }, 450);
                }
            };
            audio.onerror = cleanup;
            audio.play().catch(() => { cleanup(); showToast('无法播放录音'); });
        }

        async function renderRecordingList(unitNum) {
            const card = document.getElementById(`u${unitNum}`);
            if (!card) return;
            const list = card.querySelector('.recording-history-list');
            if (!list) return;
            const doc = await RecordingDB.get(unitNum);
            list.innerHTML = '';
            if (!doc || !doc.records || !doc.records.length) return;
            doc.records.forEach(rec => {
                const item = document.createElement('div');
                item.className = 'recording-history-item';
                item.setAttribute('role', 'button');
                item.tabIndex = 0;
                const del = document.createElement('button');
                del.type = 'button';
                del.className = 'recording-history-del';
                del.textContent = '×';
                del.title = '删除这条录音';
                del.onclick = async (e) => {
                    e.stopPropagation();
                    await RecordingDB.deleteRecord(unitNum, rec.id);
                    renderRecordingList(unitNum);
                };
                const body = document.createElement('div');
                body.className = 'recording-history-body';
                const en = document.createElement('div');
                en.className = 'recording-item-en';
                en.textContent = rec.eng || '（无英文快照）';
                const cn = document.createElement('div');
                cn.className = 'recording-item-cn';
                cn.textContent = rec.cn || '—';
                body.appendChild(en);
                body.appendChild(cn);
                item.appendChild(del);
                item.appendChild(body);
                item.onclick = (e) => {
                    if (e.target.closest('.recording-history-del')) return;
                    triggerHaptic();
                    playRecordingCompare(rec, 'ref-first');
                };
                list.appendChild(item);
            });
        }

        async function startCustomRecording(unitNum, btn) {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                showToast('浏览器不支持录音功能');
                return;
            }
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                recordingChunks = [];
                recordingUnitNum = unitNum;
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordingChunks.push(e.data); };
                mediaRecorder.onstop = async () => {
                    const blob = new Blob(recordingChunks, { type: 'audio/webm' });
                    const card = document.getElementById(`u${unitNum}`);
                    const comboTextEl = card && card.querySelector('.combo-text');
                    const engSnap = comboTextEl ? comboTextForSpeech(comboTextEl) : '';
                    const cnSnap = buildFullComboChinese(unitNum);
                    await RecordingDB.addRecord(unitNum, blob, engSnap, cnSnap);
                    stream.getTracks().forEach(t => t.stop());
                    btn.textContent = '🎙️ 录音';
                    btn.title = '录制当前完整句并对比';
                    btn.style.background = 'none';
                    btn.style.color = '';
                    btn.onclick = (e) => { e.stopPropagation(); startCustomRecording(unitNum, btn); };
                    await renderRecordingList(unitNum);
                    showToast('录音已保存');
                    triggerHaptic();
                    playRecordingCompare({ blob, eng: engSnap, cn: cnSnap }, 'rec-first');
                };
                mediaRecorder.start();
                btn.textContent = '⏹';
                btn.title = '点击停止录音';
                btn.style.background = 'var(--danger)';
                btn.style.color = 'white';
                showToast('🔴 录音中...（点⏹停止）');
                setTimeout(() => { if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop(); }, 10000);
                btn.onclick = (e) => {
                    e.stopPropagation();
                    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
                };
            } catch (err) {
                showToast('无法访问麦克风，请检查权限');
            }
        }

        function ensureRecordingRowHelp(combo) {
            const row = combo.querySelector('.recording-row');
            if (!row || row.querySelector('.recording-help-btn')) return;
            const hint = row.querySelector('.recording-hint');
            if (hint && hint.closest('.recording-row-lead')) return;
            const oldSpan = row.querySelector(':scope > span');
            if (!oldSpan) return;
            oldSpan.classList.add('recording-hint');
            const wrap = document.createElement('div');
            wrap.className = 'recording-row-lead';
            oldSpan.parentNode.insertBefore(wrap, oldSpan);
            wrap.appendChild(oldSpan);
            const helpBtn = document.createElement('button');
            helpBtn.type = 'button';
            helpBtn.className = 'listenflow-help-btn recording-help-btn';
            helpBtn.textContent = '?';
            helpBtn.setAttribute('aria-label', '录音功能说明');
            helpBtn.onclick = (e) => { e.stopPropagation(); toggleListenflowHelpTip(e, 'rec'); };
            wrap.appendChild(helpBtn);
        }

        function injectRecordingButtons() {
            for (let n = 1; n <= 16; n++) {
                const card = document.getElementById(`u${n}`);
                if (!card) continue;
                const combo = card.querySelector('.combo-box');
                if (!combo) continue;
                if (!combo.querySelector('.recording-row')) {
                    const row = document.createElement('div');
                    row.className = 'recording-row';
                    const lead = document.createElement('div');
                    lead.className = 'recording-row-lead';
                    const label = document.createElement('span');
                    label.className = 'recording-hint';
                    label.textContent = '🎙️ 录底部整句，点记录听对比';
                    const helpBtn = document.createElement('button');
                    helpBtn.type = 'button';
                    helpBtn.className = 'listenflow-help-btn recording-help-btn';
                    helpBtn.textContent = '?';
                    helpBtn.setAttribute('aria-label', '录音功能说明');
                    helpBtn.onclick = (e) => { e.stopPropagation(); toggleListenflowHelpTip(e, 'rec'); };
                    lead.appendChild(label);
                    lead.appendChild(helpBtn);
                    const recBtn = document.createElement('button');
                    recBtn.type = 'button';
                    recBtn.textContent = '🎙️ 录音';
                    recBtn.title = '录制当前完整句并对比';
                    recBtn.onclick = (e) => { e.stopPropagation(); startCustomRecording(n, recBtn); };
                    row.appendChild(lead);
                    row.appendChild(recBtn);
                    const hist = document.createElement('div');
                    hist.className = 'recording-history-list';
                    hist.setAttribute('aria-label', '本卡片录音记录');
                    combo.appendChild(row);
                    combo.appendChild(hist);
                } else if (!combo.querySelector('.recording-history-list')) {
                    combo.querySelector('.recording-play-btn')?.remove();
                    const hist = document.createElement('div');
                    hist.className = 'recording-history-list';
                    hist.setAttribute('aria-label', '本卡片录音记录');
                    combo.appendChild(hist);
                    const label = combo.querySelector('.recording-row .recording-hint') || combo.querySelector('.recording-row > span');
                    if (label) label.textContent = '🎙️ 录底部整句，点记录听对比';
                }
                ensureRecordingRowHelp(combo);
                renderRecordingList(n);
            }
        }

        function injectShareButtons() {
            document.querySelectorAll('.unit-card:not(.clone)').forEach(card => {
                const mr = /^u(\d+)$/.exec(card.id);
                if (!mr) return;
                const n = parseInt(mr[1], 10);
                const header = card.querySelector('.unit-header');
                if (!header || header.querySelector('.unit-fav-btn')) return;

                const appendFav = (actionsWrap) => {
                    const favBtn = document.createElement('button');
                    favBtn.type = 'button';
                    favBtn.className = 'unit-fav-btn';
                    favBtn.dataset.unitNum = String(n);
                    favBtn.onclick = (ev) => { ev.stopPropagation(); toggleFavoriteUnitFromScene(n); };
                    applyUnitFavoriteButtonState(favBtn, n);
                    actionsWrap.appendChild(favBtn);
                };

                if (header.querySelector('.qr-share-btn')) {
                    const qr = header.querySelector('.qr-share-btn');
                    if (qr.parentElement && qr.parentElement.classList.contains('unit-header-actions')) {
                        appendFav(qr.parentElement);
                        return;
                    }
                    const wrap = document.createElement('div');
                    wrap.className = 'unit-header-actions';
                    qr.replaceWith(wrap);
                    wrap.appendChild(qr);
                    appendFav(wrap);
                    return;
                }

                const lead = document.createElement('div');
                lead.className = 'unit-header-lead';
                while (header.firstChild) {
                    lead.appendChild(header.firstChild);
                }
                const qrBtn = document.createElement('button');
                qrBtn.type = 'button';
                qrBtn.className = 'qr-share-btn';
                qrBtn.innerHTML = '<span class="unit-share-ic" aria-hidden="true">▣</span><span class="unit-share-txt">扫码分享本卡片</span>';
                qrBtn.title = '生成本卡片场景的二维码（扫码直达）';
                qrBtn.onclick = (ev) => { ev.stopPropagation(); showQRCode(n); };
                const actionsWrap = document.createElement('div');
                actionsWrap.className = 'unit-header-actions';
                actionsWrap.appendChild(qrBtn);
                appendFav(actionsWrap);
                header.appendChild(lead);
                header.appendChild(actionsWrap);
            });
        }
        function speakMyLocation() {
            incrementUsage(9);
            if (!navigator.geolocation) { openMessageModal('无法定位', MSG_GEO_UNSUPPORTED); return; }
            showToast('📍 正在获取位置...');
            navigator.geolocation.getCurrentPosition(async pos => {
                const { latitude, longitude } = pos.coords;
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=en`, { headers: { 'Accept': 'application/json' } });
                    const data = await res.json();
                    const addr = (data.display_name || '').split(',').slice(0, 3).join(',');
                    speakDirect(`I am currently at ${addr}. Can you pick me up here?`, null, 'en');
                    showToast(`✅ 正在朗读：${addr}`);
                } catch (e) {
                    showToast('❌ 地址解析失败');
                }
            }, () => showToast('❌ 无法获取位置，请检查权限'), { enableHighAccuracy: true, timeout: 15000 });
        }
        const LS_SEARCH_HISTORY = 'search_history_v1';

        function getSearchHistory() {
            try {
                const arr = JSON.parse(localStorage.getItem(LS_SEARCH_HISTORY) || '[]');
                return Array.isArray(arr) ? arr.filter(x => typeof x === 'string') : [];
            } catch (e) {
                return [];
            }
        }

        function saveSearchHistory(arr) {
            try {
                localStorage.setItem(LS_SEARCH_HISTORY, JSON.stringify(arr.slice(0, 30)));
            } catch (e) {}
        }

        function addSearchHistory(q) {
            const t = String(q).trim();
            if (!t || t.length > 100) return;
            let arr = getSearchHistory().filter(x => x !== t);
            arr.unshift(t);
            saveSearchHistory(arr);
        }

        function removeSearchHistoryItem(term) {
            saveSearchHistory(getSearchHistory().filter(x => x !== term));
        }

        function clearAllSearchHistory() {
            saveSearchHistory([]);
        }

        function hideSearchHistoryDropdown() {
            const drop = document.getElementById('searchHistoryDropdown');
            if (drop) drop.hidden = true;
        }

        function renderSearchHistoryDropdown() {
            const drop = document.getElementById('searchHistoryDropdown');
            if (!drop) return;
            drop.innerHTML = '';
            const items = getSearchHistory().slice(0, 5);
            if (!items.length) {
                const hint = document.createElement('div');
                hint.className = 'search-history-hint';
                hint.textContent = '暂无搜索历史，输入关键词后点「搜索」';
                drop.appendChild(hint);
            } else {
                const list = document.createElement('div');
                list.className = 'search-history-list';
                items.forEach(term => {
                    const row = document.createElement('div');
                    row.className = 'search-history-row';
                    const tb = document.createElement('button');
                    tb.type = 'button';
                    tb.className = 'search-history-text';
                    tb.textContent = term;
                    tb.onclick = () => {
                        const inp = document.getElementById('searchBox');
                        if (inp) inp.value = term;
                        toggleSearchClear();
                        hideSearchHistoryDropdown();
                        submitSearch();
                    };
                    const del = document.createElement('button');
                    del.type = 'button';
                    del.className = 'search-history-del';
                    del.title = '删除';
                    del.textContent = '✕';
                    del.onclick = e => {
                        e.stopPropagation();
                        removeSearchHistoryItem(term);
                        renderSearchHistoryDropdown();
                    };
                    row.appendChild(tb);
                    row.appendChild(del);
                    list.appendChild(row);
                });
                drop.appendChild(list);
            }
            const foot = document.createElement('div');
            foot.className = 'search-history-footer';
            const cab = document.createElement('button');
            cab.type = 'button';
            cab.className = 'search-history-clear-all';
            cab.textContent = '清空搜索历史';
            cab.disabled = getSearchHistory().length === 0;
            cab.onclick = () => {
                clearAllSearchHistory();
                renderSearchHistoryDropdown();
            };
            foot.appendChild(cab);
            drop.appendChild(foot);
            drop.hidden = false;
        }

        function showSearchHistoryDropdown() {
            renderSearchHistoryDropdown();
        }

        let searchBlurHideTimer = null;

        function initSearchHistoryUi() {
            const inp = document.getElementById('searchBox');
            const drop = document.getElementById('searchHistoryDropdown');
            if (!inp || !drop) return;
            if (drop.dataset.bound) return;
            drop.dataset.bound = '1';
            drop.addEventListener('mousedown', e => e.preventDefault());
            inp.addEventListener('focus', () => {
                clearTimeout(searchBlurHideTimer);
                showSearchHistoryDropdown();
            });
            inp.addEventListener('blur', () => {
                searchBlurHideTimer = setTimeout(() => hideSearchHistoryDropdown(), 220);
            });
        }

        function submitSearch() {
            triggerHaptic();
            hideSearchHistoryDropdown();
            const inp = document.getElementById('searchBox');
            if (!inp) return;
            const raw = inp.value.trim();
            if (raw) addSearchHistory(raw);
            filterUnits();
        }

        function toggleSearchClear() {
            const val = document.getElementById('searchBox').value;
            const btn = document.getElementById('searchClearBtn');
            if (btn) btn.classList.toggle('visible', !!val);
        }

        function clearSearchInputOnly() {
            const inp = document.getElementById('searchBox');
            if (inp) inp.value = '';
            toggleSearchClear();
            hideSearchHistoryDropdown();
            filterUnits();
        }

        function clearSearch() {
            document.getElementById('searchBox').value = '';
            toggleSearchClear();
            document.querySelectorAll('.search-match-tag').forEach(t => t.remove());
            hideSearchHistoryDropdown();
            filterUnits();
            document.getElementById('searchBox').focus();
        }

        function updateSearchCount(count) {
            let el = document.getElementById('searchCountTip');
            if (!el) {
                el = document.createElement('div');
                el.id = 'searchCountTip';
                el.style.cssText = `
                    font-size: 0.75em; color: var(--text-sub);
                    padding: 2px 15px 4px; max-width: 650px; margin: 0 auto;
                `;
                const searchPanel = document.getElementById('searchPanel');
                if (searchPanel) searchPanel.insertAdjacentElement('afterend', el);
            }
            if (count === null) {
                el.innerText = '';
            } else {
                el.innerText = count === 0 ? '' : `找到 ${count} 个相关场景`;
            }
        }

        function showSearchEmptyState(keyword) {
            removeSearchEmptyState();
            const el = document.createElement('div');
            el.id = 'searchEmptyState';
            el.style.cssText = `
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                text-align: center; color: var(--text-sub); pointer-events: none; z-index: 10;
            `;
            el.innerHTML = `
                <div style="font-size:2.5em; margin-bottom:12px;">🔍</div>
                <div style="font-weight:700; font-size:1em; margin-bottom:6px;">没找到"${keyword}"相关场景</div>
                <div style="font-size:0.85em;">试试：银行、退货、打车、点餐、急救</div>
            `;
            const contentArea = document.getElementById('content-area');
            if (contentArea) {
                contentArea.style.position = 'relative';
                contentArea.appendChild(el);
            }
        }

        function removeSearchEmptyState() {
            document.getElementById('searchEmptyState')?.remove();
        }

        function filterUnits() {
            const raw = document.getElementById('searchBox').value.trim();
            if (raw === '使用教程' || raw === '网站教程' || raw === '网站使用教程') {
                document.getElementById('searchBox').value = '';
                toggleSearchClear();
                openUsageTutorial();
                return filterUnits();
            }
            const filter = raw.toLowerCase();
            const contentArea = document.getElementById('content-area');

            document.querySelectorAll('.unit-card.clone, .snap-spacer').forEach(el => {
                el.style.display = filter ? 'none' : '';
            });
            document.querySelectorAll('#navScroll .nav-snap-spacer, #navScroll a.nav-btn.nav-clone').forEach(el => {
                el.style.display = filter ? 'none' : '';
            });

            if (!filter) {
                document.querySelectorAll('.unit-card:not(.clone)').forEach(card => {
                    card.style.display = '';
                    card.style.opacity = '';
                    card.querySelector('.search-match-tag')?.remove();
                });
                removeSearchEmptyState();
                updateSearchCount(null);
                if (contentArea) contentArea.scrollTo({ left: 0, behavior: 'auto' });
                updateCardNavButtons();
                return;
            }

            const aliasHits = new Set();
            Object.entries(SEARCH_ALIASES).forEach(([keyword, unitIds]) => {
                const kw = keyword.toLowerCase();
                if (filter.includes(kw) || kw.includes(filter)) {
                    unitIds.forEach(id => aliasHits.add(id));
                }
            });

            const textHits = new Set();
            document.querySelectorAll('.unit-card:not(.clone)').forEach(card => {
                const cardId = card.id;
                if (!cardId) return;
                const text = card.innerText.toLowerCase();
                const keys = (card.getAttribute('data-keywords') || '').toLowerCase();
                const name = (card.getAttribute('data-name') || '').toLowerCase();
                if (text.includes(filter) || keys.includes(filter) || name.includes(filter)) {
                    textHits.add(cardId);
                }
            });

            const hits = new Set([...aliasHits, ...textHits]);

            let shownCount = 0;
            document.querySelectorAll('.unit-card:not(.clone)').forEach(card => {
                card.querySelector('.search-match-tag')?.remove();
                const show = hits.has(card.id);
                card.style.display = show ? '' : 'none';
                card.style.opacity = show ? '1' : '';
                if (show && card.id) {
                    shownCount++;
                    if (filter.length >= 2) {
                        const header = card.querySelector('.unit-header');
                        if (header && !header.querySelector('.search-match-tag')) {
                            const tag = document.createElement('span');
                            tag.className = 'search-match-tag';
                            tag.style.cssText = 'font-size:0.6em;background:var(--primary);color:white;padding:2px 6px;border-radius:8px;margin-left:6px;font-weight:600;';
                            tag.innerText = '匹配';
                            const lead = header.querySelector('.unit-header-lead');
                            (lead || header).appendChild(tag);
                        }
                    }
                }
            });

            updateSearchCount(shownCount);

            if (shownCount === 0) {
                showSearchEmptyState(raw);
            } else {
                removeSearchEmptyState();
                if (shownCount === 1) {
                    const found = [...hits][0];
                    if (found) setTimeout(() => scrollToUnit(found), 200);
                } else if (contentArea) {
                    contentArea.scrollTo({ left: 0, behavior: 'smooth' });
                }
            }
            updateCardNavButtons();
        }
        function loadCustomChips(){for(let u=1;u<=16;u++)for(let s=1;s<=2;s++)JSON.parse(localStorage.getItem(`custom_chips_u${u}_s${s}`)||"[]").forEach(d=>renderAndClickChip(d,false));}
        function renderAndClickChip(d, t) {
            const c = document.getElementById(`u${d.unitNum}-s${d.stepNum}-chips`);
            if (!c) return;
            const b = document.createElement('div');
            b.className = 'chip';
            b.dataset.eng = d.eng;
            b.dataset.cn = d.cn;
            b.dataset.prefix = d.prefix;
            b.dataset.suffix = d.suffix;
            b.innerHTML = `<span class="chip-en"></span><span class="chip-cn"></span>`;
            b.querySelector('.chip-en').textContent = d.eng;
            b.querySelector('.chip-cn').textContent = d.cn;
            b.onclick = () => { updateUnit(d.unitNum, d.stepNum, d.eng, d.cn, d.prefix, d.suffix, b); };
            const w = c.querySelector('.add-btn-wrapper');
            c.insertBefore(b, w || c.firstChild);
            reinitContainerCollapse(c);
            if (t) b.click();
        }
        function updateCustomChipInStorage(d,n){const k=`custom_chips_u${d.unitNum}_s${d.stepNum}`;let l=JSON.parse(localStorage.getItem(k)||"[]");if(n==="")l=l.filter(i=>i.eng!==d.eng);else{const i=l.findIndex(x=>x.eng===d.eng);if(i>-1)l[i].eng=n;}localStorage.setItem(k,JSON.stringify(l));}
        const QUIZ_DIFFICULTY_KEY = 'quiz_difficulty_v1';
        function getQuizDifficulty() {
            try {
                const v = localStorage.getItem(QUIZ_DIFFICULTY_KEY);
                return v === 'hard' ? 'hard' : 'easy';
            } catch (e) { return 'easy'; }
        }
        function setQuizDifficulty(level) {
            triggerHaptic();
            const d = level === 'hard' ? 'hard' : 'easy';
            try { localStorage.setItem(QUIZ_DIFFICULTY_KEY, d); } catch (e) {}
            if (!document.body.classList.contains('quiz-mode')) return;
            applyQuizDifficultyClass(d);
            syncQuizDifficultyButtons();
            clearQuizPeekStates();
        }
        function applyQuizDifficultyClass(d) {
            document.body.classList.remove('quiz-difficulty-easy', 'quiz-difficulty-hard');
            document.body.classList.add(d === 'hard' ? 'quiz-difficulty-hard' : 'quiz-difficulty-easy');
        }
        function syncQuizDifficultyButtons() {
            const hardOn = document.body.classList.contains('quiz-difficulty-hard');
            const eBtn = document.getElementById('quizDiffEasy');
            const hBtn = document.getElementById('quizDiffHard');
            if (eBtn) eBtn.classList.toggle('active', !hardOn);
            if (hBtn) hBtn.classList.toggle('active', hardOn);
        }
        function clearQuizPeekStates() {
            document.querySelectorAll('.quiz-peek, .quiz-peek-line, .quiz-peek-combo').forEach(el => {
                el.classList.remove('quiz-peek', 'quiz-peek-line', 'quiz-peek-combo');
            });
        }
        function toggleQuizMode() {
            triggerHaptic();
            const on = !document.body.classList.contains('quiz-mode');
            document.body.classList.toggle('quiz-mode', on);
            const bar = document.getElementById('quizDifficultyBar');
            if (bar) bar.setAttribute('aria-hidden', on ? 'false' : 'true');
            if (on) {
                applyQuizDifficultyClass(getQuizDifficulty());
                syncQuizDifficultyButtons();
                clearQuizPeekStates();
            } else {
                document.body.classList.remove('quiz-difficulty-easy', 'quiz-difficulty-hard');
                clearQuizPeekStates();
            }
        }
        let quizLpTimer = null;
        let quizLpSuppressClick = false;
        function initQuizModeGestures() {
            document.addEventListener('pointerdown', (e) => {
                if (!document.body.classList.contains('quiz-mode')) return;
                if (e.target.closest('.float-controls')) return;
                if (e.target.closest('.combo-audio-btn') || e.target.closest('.quiz-difficulty-bar') || e.target.closest('.fab-quiz') || e.target.closest('.fab-random')) return;
                if (e.target.closest('.recording-row') || e.target.closest('.recording-history-list')) return;
                const combo = e.target.closest('.combo-box .combo-text');
                const hl = e.target.closest('.english-sentence .highlight');
                const sent = e.target.closest('.display-area .english-sentence');
                if (!combo && !hl && !sent) return;
                quizLpSuppressClick = false;
                quizLpTimer = window.setTimeout(() => {
                    quizLpSuppressClick = true;
                    triggerHaptic();
                    if (combo) {
                        let t = combo.innerText.replace(/^[\s"']+|[\s"']+$/g, '').trim();
                        if (t) speakDirect(t, null, 'en');
                        return;
                    }
                    const w = (hl && hl.id) ? hl : (sent && sent.querySelector('.highlight[id]'));
                    if (w && w.id) speakWholeSentence(w.id, '', '');
                }, 550);
            }, true);
            const clearLp = () => {
                if (quizLpTimer) {
                    clearTimeout(quizLpTimer);
                    quizLpTimer = null;
                }
            };
            document.addEventListener('pointerup', clearLp, true);
            document.addEventListener('pointercancel', clearLp, true);
            document.addEventListener('click', (e) => {
                if (!document.body.classList.contains('quiz-mode')) return;
                if (e.target.closest('.float-controls')) return;
                if (quizLpSuppressClick) {
                    quizLpSuppressClick = false;
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                if (e.target.closest('.combo-audio-btn') || e.target.closest('.quiz-difficulty-bar')) return;
                const combo = e.target.closest('.combo-box .combo-text');
                if (combo) {
                    e.preventDefault();
                    e.stopPropagation();
                    combo.classList.toggle('quiz-peek-combo');
                    return;
                }
                const hl = e.target.closest('.english-sentence .highlight');
                if (hl && document.body.classList.contains('quiz-difficulty-easy')) {
                    e.preventDefault();
                    e.stopPropagation();
                    hl.classList.toggle('quiz-peek');
                    return;
                }
                const sent = e.target.closest('.english-sentence');
                if (sent && document.body.classList.contains('quiz-difficulty-hard') && sent.contains(e.target)) {
                    e.preventDefault();
                    e.stopPropagation();
                    sent.classList.toggle('quiz-peek-line');
                }
            }, true);
        }
        function updateUnit(unitNum,stepNum,engWord,cnWord,prefixEng,suffixCn,element,playSound=true,skipStats=false){
            triggerHaptic();
            if (!skipStats) incrementUsage(unitNum);
            const wordId = `u${unitNum}-s${stepNum}-word`;
            const displayEl = document.getElementById(wordId);
            if (displayEl) {
                if (unitNum === 14 && stepNum === 2) {
                    const sentence = displayEl.closest('.english-sentence');
                    if (sentence) {
                        if (engWord === 'more than a week') {
                            sentence.innerHTML = `It's been <span class="highlight" id="u14-s2-word">more than a week</span>.`;
                        } else {
                            sentence.innerHTML = `It's been <span class="highlight" id="u14-s2-word">${engWord}</span> days.`;
                        }
                    }
                } else {
                    displayEl.innerText = engWord;
                }
            }
            const fullCn = getFullChineseSentence(unitNum, stepNum, cnWord, suffixCn);
            const transEl = document.getElementById(`u${unitNum}-s${stepNum}-trans`);
            if (transEl) transEl.innerText = fullCn;
            let container = element.parentElement;
            container.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            if (element.classList.contains('chip')) element.classList.add('active');
            localStorage.setItem(`u${unitNum}-s${stepNum}`, JSON.stringify({ engWord, cnWord, prefix: prefixEng, suffix: suffixCn }));
            if (!skipStats) recordStudyTime(unitNum);
            if (!skipStats) recordChipTouched(unitNum, stepNum, engWord);
            else renderProgressRing(unitNum);
            refreshComboBox(unitNum);
            if (playSound) speakDirect(engWord, null, 'en');
        }
        function restoreSelection(unitNum, stepNum) {
            const savedData = localStorage.getItem(`u${unitNum}-s${stepNum}`);
            const container = document.getElementById(`u${unitNum}-s${stepNum}-chips`);
            if (!container) return;
            if (savedData) {
                const data = JSON.parse(savedData);
                const chips = container.querySelectorAll('.chip:not(.add-chip-btn)');
                for (let chip of chips) {
                    const enEl = chip.querySelector('.chip-en');
                    const chipText = enEl ? enEl.innerText : chip.innerText;
                    if (chipText === data.engWord) {
                        updateUnit(unitNum, stepNum, data.engWord, data.cnWord, data.prefix, data.suffix, chip, false, true);
                        break;
                    }
                }
            } else {
                restoreSelectionRandom(unitNum, stepNum);
            }
        }
