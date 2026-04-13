(function () {
    'use strict';
    /** 面向几乎零基础：英文尽量短；中文写清「你要表达什么」。能找中文客服就优先找中文。 */
    window.PHONE_ANCHOR_PHRASES = [
        { tag: '开场', en: 'Hello. I need help with...', cn: '先打招呼，再把「……」换成你要说的事。' },
        { tag: '没听清', en: 'Sorry. Say again, please.', cn: '对方太快或你没听懂时用。' },
        { tag: '要人工', en: 'I need a real person.', cn: '不要机器菜单、想转真人时。' },
        { tag: '记下来', en: 'Please spell it.', cn: '请对方把名字、号码等一个个字母拼给你。' },
        { tag: '结束', en: 'Thank you. Bye.', cn: '说完谢谢就可以挂电话。' },
    ];
    window.PHONE_SCRIPTS = [
        {
            id: 'universal',
            title: '🔄 万能电话句',
            subtitle: '听不懂英文也能先撑住：这几句最常用',
            color: '#636e72',
            sections: [
                {
                    label: '听不清怎么办',
                    phrases: [
                        { en: 'Sorry. Say again, please.', cn: '请再说一遍。' },
                        { en: 'Slowly, please.', cn: '请说慢一点。' },
                        { en: 'Please spell it.', cn: '请帮我拼一下（字母）。' },
                        { en: 'Sorry, my English is not good.', cn: '我英语不好，请慢一点。' },
                        { en: 'Any Chinese speaker?', cn: '有没有会说中文的工作人员？' },
                    ],
                },
                {
                    label: '等待、转接',
                    phrases: [
                        { en: 'I need a supervisor.', cn: '我要找上级/主管。' },
                        { en: 'How long to wait?', cn: '大概要等多久？' },
                        { en: 'I can wait.', cn: '我可以等。' },
                        { en: 'I call back later.', cn: '我稍后再打。' },
                        { en: 'Please call me back.', cn: '请回拨我这个号码。' },
                    ],
                },
                {
                    label: '核对信息',
                    phrases: [
                        { en: 'Let me repeat.', cn: '我重复一下，看对不对。' },
                        { en: 'What is the case number?', cn: '单号/案件号是多少？' },
                        { en: 'Send me an email, please.', cn: '请发一封邮件给我确认。' },
                        { en: 'What is your name?', cn: '请问您叫什么名字？' },
                        { en: 'One moment, please.', cn: '请稍等。' },
                    ],
                },
                {
                    label: '说完挂电话',
                    phrases: [
                        { en: 'Thank you for your help.', cn: '谢谢你的帮助。' },
                        { en: 'That is all. Thank you.', cn: '我要问的就这些，谢谢。' },
                        { en: 'Have a good day.', cn: '再见，祝你顺利。' },
                    ],
                },
            ],
        },
        {
            id: 'doctor',
            title: '🏥 预约医生',
            subtitle: '看病、体检、转诊：能说清这几句就够开头',
            color: '#00b894',
            sections: [
                {
                    label: '开头怎么说',
                    phrases: [
                        { en: 'I need a doctor visit.', cn: '我想看医生 / 预约。' },
                        { en: 'I was here before. My name is [name].', cn: '我是老病人，我叫……' },
                        { en: 'I am new here.', cn: '我是第一次来。' },
                        { en: 'My doctor is Dr. [name].', cn: '我是某某医生介绍来的。' },
                    ],
                },
                {
                    label: '哪里不舒服',
                    phrases: [
                        { en: 'I have a cough and fever.', cn: '我咳嗽、发烧。' },
                        { en: 'My chest hurts.', cn: '我胸口疼。' },
                        { en: 'I need a check-up.', cn: '我要体检。' },
                        { en: 'I need a specialist.', cn: '我要看专科。' },
                        { en: 'I need more medicine.', cn: '我要续药。' },
                        { en: 'It is urgent.', cn: '比较急。' },
                    ],
                },
                {
                    label: '时间',
                    phrases: [
                        { en: 'When is the first open time?', cn: '最早什么时候能看？' },
                        { en: 'Any time this week?', cn: '这周有空吗？' },
                        { en: 'Phone visit OK?', cn: '可以电话/视频看吗？' },
                        { en: 'I need to change the time.', cn: '我要改时间。' },
                        { en: 'I need to cancel.', cn: '我要取消预约。' },
                    ],
                },
                {
                    label: '保险、钱',
                    phrases: [
                        { en: 'Do you take [insurance name]?', cn: '你们收不收某某保险？' },
                        { en: 'How much do I pay today?', cn: '我今天自己要付多少钱？' },
                        { en: 'Does insurance pay for this?', cn: '保险报不报这次？' },
                    ],
                },
            ],
        },
        {
            id: 'insurance_claim',
            title: '🚗 保险报案',
            subtitle: '车险、家财险、健康险：先报案再说细节',
            color: '#0984e3',
            sections: [
                {
                    label: '开头',
                    phrases: [
                        { en: 'I need to report a claim.', cn: '我要报案。' },
                        { en: 'My policy number is [number].', cn: '我的保单号是……' },
                        { en: 'My name is [name]. My birthday is [date].', cn: '我叫……，生日是……' },
                    ],
                },
                {
                    label: '车祸',
                    phrases: [
                        { en: 'I had a car accident.', cn: '我出了车祸。' },
                        { en: 'It was on [date] at [place].', cn: '出事时间是……地点是……' },
                        { en: 'No one hurt. Only car damage.', cn: '人没事，只有车坏了。' },
                        { en: 'Someone got hurt.', cn: '有人受伤。' },
                        { en: 'Another car hit me.', cn: '别的车撞了我。' },
                        { en: 'I have the other driver info.', cn: '我有对方司机信息。' },
                        { en: 'I have the police report number.', cn: '我有警察报告号码。' },
                    ],
                },
                {
                    label: '别的情况',
                    phrases: [
                        { en: 'Someone broke into my car.', cn: '我车被撬了。' },
                        { en: 'My car was stolen.', cn: '我的车被偷了。' },
                        { en: 'My home had a flood.', cn: '我家淹水了。' },
                        { en: 'My home had a fire.', cn: '我家着火了。' },
                    ],
                },
                {
                    label: '问接下来',
                    phrases: [
                        { en: 'What papers do I need?', cn: '我要交什么材料？' },
                        { en: 'What is my deductible?', cn: '免赔额是多少？' },
                        { en: 'How long does it take?', cn: '大概要办多久？' },
                        { en: 'Do I get a rental car?', cn: '修车期间有没有代步车？' },
                        { en: 'What is my claim number?', cn: '我的报案号是多少？' },
                    ],
                },
            ],
        },
        {
            id: 'utility',
            title: '💡 水电煤气',
            subtitle: '停电停水、账单、搬家开户：对着念就行',
            color: '#e17055',
            sections: [
                {
                    label: '开头',
                    phrases: [
                        { en: 'Hello. It is about my bill.', cn: '你好，我打电话问账单/账户。' },
                        { en: 'My account number is [number].', cn: '我的账户号是……' },
                        { en: 'My address is [address].', cn: '我家地址是……' },
                    ],
                },
                {
                    label: '停电、停水、停气',
                    phrases: [
                        { en: 'No power since [time].', cn: '从几点开始没电。' },
                        { en: 'No water.', cn: '没水了。' },
                        { en: 'No gas.', cn: '没煤气了。' },
                        { en: 'When will it be back?', cn: '什么时候能恢复？' },
                        { en: 'Is there a power outage here?', cn: '这片是不是停电了？' },
                    ],
                },
                {
                    label: '账单',
                    phrases: [
                        { en: 'I have a question about my bill.', cn: '我对账单有疑问。' },
                        { en: 'My bill looks wrong.', cn: '我觉得账单不对。' },
                        { en: 'This bill is too high.', cn: '这个月比以前贵很多。' },
                        { en: 'I want auto-pay.', cn: '我想自动扣款。' },
                        { en: 'Can I pay in parts?', cn: '能不能分期付？' },
                    ],
                },
                {
                    label: '搬家',
                    phrases: [
                        { en: 'I need new service at my home.', cn: '新家要开通。' },
                        { en: 'I move out. Please stop service.', cn: '我要搬走，请停掉。' },
                        { en: 'I move to a new address.', cn: '我要转到新地址。' },
                        { en: 'My move date is [date].', cn: '我搬家日期是……' },
                    ],
                },
            ],
        },
        {
            id: 'delivery',
            title: '📦 快递客服',
            subtitle: '包裹没到、送错、坏了：先说单号',
            color: '#a29bfe',
            sections: [
                {
                    label: '开头',
                    phrases: [
                        { en: 'Hello. It is about a package.', cn: '你好，我问包裹。' },
                        { en: 'The tracking number is [number].', cn: '追踪号是……' },
                        { en: 'My name is [name]. My address is [address].', cn: '我叫……，地址是……' },
                    ],
                },
                {
                    label: '包裹有问题',
                    phrases: [
                        { en: 'My package is late.', cn: '包裹还没到。' },
                        { en: 'It says delivered. I did not get it.', cn: '显示送达了，但我没收到。' },
                        { en: 'The box was damaged.', cn: '包裹坏了。' },
                        { en: 'Wrong item.', cn: '东西不对。' },
                        { en: 'I think it is lost.', cn: '可能丢了，我要报案。' },
                    ],
                },
                {
                    label: '改时间、去取',
                    phrases: [
                        { en: 'I need a new delivery time.', cn: '我要改送货时间。' },
                        { en: 'I missed it. Where do I pick up?', cn: '我没接到，去哪取？' },
                        { en: 'Hold it at your store, please.', cn: '请放在你们店里我去取。' },
                        { en: 'Wrong address. Can you change it?', cn: '地址错了，能改吗？' },
                    ],
                },
            ],
        },
        {
            id: 'bank',
            title: '🏦 银行客服',
            subtitle: '卡丢了、看不懂扣款：慢慢说清名字和卡号后四位',
            color: '#00b5b0',
            sections: [
                {
                    label: '开头',
                    phrases: [
                        { en: 'Hello. I need help with my account.', cn: '你好，我账户有问题。' },
                        { en: 'My name is [name]. Last four digits [4 numbers].', cn: '我叫……，卡号后四位是……' },
                        { en: 'My birthday is [date].', cn: '我生日是……' },
                    ],
                },
                {
                    label: '卡丢了',
                    phrases: [
                        { en: 'I lost my debit card.', cn: '借记卡丢了。' },
                        { en: 'I lost my credit card.', cn: '信用卡丢了。' },
                        { en: 'Please stop the card now.', cn: '请马上停卡。' },
                        { en: 'Please send a new card.', cn: '请寄一张新卡。' },
                        { en: 'When will the new card come?', cn: '新卡多久能到？' },
                    ],
                },
                {
                    label: '扣款不对',
                    phrases: [
                        { en: 'I do not know this charge.', cn: '有一笔扣款我不认识。' },
                        { en: 'This charge is wrong.', cn: '这笔扣款不对。' },
                        { en: 'I did not buy this.', cn: '我没买过这个。' },
                        { en: 'Someone stole my card.', cn: '我觉得卡被盗刷了。' },
                        { en: 'Please remove the late fee.', cn: '滞纳金能不能免掉？' },
                    ],
                },
                {
                    label: '其他',
                    phrases: [
                        { en: 'I cannot log in online.', cn: '我网上银行登不进去。' },
                        { en: 'I want a higher limit.', cn: '我想提高额度。' },
                        { en: 'What is my balance?', cn: '余额是多少？' },
                    ],
                },
            ],
        },
        {
            id: 'internet',
            title: '📡 网络/手机公司',
            subtitle: '网慢、断网、话费：说清楚家里有问题',
            color: '#6c5ce7',
            sections: [
                {
                    label: '开头',
                    phrases: [
                        { en: 'Hello. My internet is not working.', cn: '你好，我家网有问题。' },
                        { en: 'Hello. My phone is not working.', cn: '你好，我手机套餐有问题。' },
                        { en: 'My account number is [number].', cn: '我的账号是……' },
                    ],
                },
                {
                    label: '网不好',
                    phrases: [
                        { en: 'The internet is very slow.', cn: '网速很慢。' },
                        { en: 'It keeps cutting off.', cn: '老是断线。' },
                        { en: 'No internet at all.', cn: '完全没网。' },
                        { en: 'I restarted the router.', cn: '我已经重启过路由器了。' },
                        { en: 'Can someone come to my home?', cn: '能派人上门吗？' },
                        { en: 'When can you come?', cn: '最早什么时候能来？' },
                    ],
                },
                {
                    label: '套餐、钱、取消',
                    phrases: [
                        { en: 'I want to change my plan.', cn: '我想换套餐。' },
                        { en: 'I want to cancel.', cn: '我要取消服务。' },
                        { en: 'Is there a cancel fee?', cn: '取消费要多少钱？' },
                        { en: 'I did not order this charge.', cn: '这笔费用我没订过。' },
                        { en: 'I want to keep my phone number.', cn: '我要保留这个手机号。' },
                    ],
                },
            ],
        },
        {
            id: 'school',
            title: '🏫 孩子学校',
            subtitle: '给孩子请假、找老师：先把孩子名字说清楚',
            color: '#fd79a8',
            sections: [
                {
                    label: '请假',
                    phrases: [
                        { en: 'Hello. My child cannot go to school today.', cn: '你好，我孩子今天不能上学。' },
                        { en: 'The name is [child name].', cn: '孩子名字是……' },
                        { en: 'He is sick.', cn: '他生病了。' },
                        { en: 'She has a doctor visit.', cn: '她要看医生。' },
                        { en: 'He will come back tomorrow.', cn: '他明天来上学。' },
                        { en: 'She will be out for [number] days.', cn: '她要请假几天。' },
                    ],
                },
                {
                    label: '找老师',
                    phrases: [
                        { en: 'I need to talk to the teacher.', cn: '我想和老师谈谈。' },
                        { en: 'I worry about my child at school.', cn: '我有点担心孩子在学校的情况。' },
                        { en: 'I want to talk about behavior.', cn: '我想谈谈孩子表现。' },
                        { en: 'When is the parent meeting?', cn: '家长会什么时候？' },
                    ],
                },
                {
                    label: '其他',
                    phrases: [
                        { en: 'Is there school tomorrow?', cn: '明天上课吗？' },
                        { en: 'Any school event this week?', cn: '这周学校有活动吗？' },
                        { en: 'My child left [item] at school.', cn: '孩子把东西忘在学校了，我能去取吗？' },
                        { en: 'Which bus for my child?', cn: '孩子坐哪路校车？' },
                    ],
                },
            ],
        },
        {
            id: 'landlord',
            title: '🏠 房东/物业',
            subtitle: '漏水、没热水、要退押金：先说房号和什么事',
            color: '#55efc4',
            sections: [
                {
                    label: '报修',
                    phrases: [
                        { en: 'Hello. I live in unit [number]. My name is [name].', cn: '你好，我住几号房，我叫……' },
                        { en: 'Something is broken in my home.', cn: '我家有东西坏了。' },
                        { en: 'No heat.', cn: '暖气坏了。' },
                        { en: 'No AC.', cn: '空调坏了。' },
                        { en: 'Water is leaking.', cn: '漏水。' },
                        { en: 'No hot water.', cn: '没有热水。' },
                        { en: 'This problem is [X] days already.', cn: '这个问题已经好几天了。' },
                        { en: 'This is urgent. Please come soon.', cn: '很急，请尽快来人。' },
                    ],
                },
                {
                    label: '押金、租房',
                    phrases: [
                        { en: 'I need my deposit back.', cn: '我要谈退押金。' },
                        { en: 'I will move out in 30 days.', cn: '我要提前30天说搬走。' },
                        { en: 'I move out on [date].', cn: '我哪天搬出去。' },
                        { en: 'I want to renew the lease.', cn: '我想续租。' },
                        { en: 'How much is the new rent?', cn: '新房租多少钱？' },
                    ],
                },
            ],
        },
        {
            id: 'dmv',
            title: '🚦 DMV / 政府机构',
            subtitle: '驾照、车牌、办事预约：一次说清要办哪一件',
            color: '#ff7675',
            sections: [
                {
                    label: '预约、办事',
                    phrases: [
                        { en: 'Hello. I need an appointment.', cn: '你好，我要预约。' },
                        { en: 'I need to renew my license.', cn: '我要换驾照。' },
                        { en: 'I need car registration.', cn: '我要办车辆登记。' },
                        { en: 'I need a Real ID.', cn: '我要办Real ID。' },
                        { en: 'I need a driving test.', cn: '我要考路考。' },
                        { en: 'What papers do I bring?', cn: '我要带什么材料？' },
                        { en: 'What time are you open?', cn: '你们几点上班？' },
                    ],
                },
                {
                    label: '别的',
                    phrases: [
                        { en: 'I lost my license. How to get a new one?', cn: '驾照丢了怎么补？' },
                        { en: 'I got a ticket. How do I pay?', cn: '我收到罚单怎么交？' },
                        { en: 'I want to fight this ticket.', cn: '这张罚单我想申诉。' },
                        { en: 'What is the status of my case?', cn: '我的申请办到哪一步了？' },
                    ],
                },
            ],
        },
        {
            id: 'pharmacy',
            title: '💊 药房续药',
            subtitle: '续处方、取药、问怎么吃：报名字和生日',
            color: '#fd6b6b',
            sections: [
                {
                    label: '续药',
                    phrases: [
                        { en: 'Hello. I need a refill.', cn: '你好，我要续药。' },
                        { en: 'The Rx number is [number].', cn: '处方号是……' },
                        { en: 'My name is [name]. My birthday is [date].', cn: '我叫……，生日是……' },
                        { en: 'When is it ready?', cn: '什么时候能取？' },
                    ],
                },
                {
                    label: '取药、问药',
                    phrases: [
                        { en: 'I pick up medicine.', cn: '我来取药。' },
                        { en: 'Does my insurance pay?', cn: '保险报不报？' },
                        { en: 'Is there a cheaper generic?', cn: '有没有更便宜的仿制药？' },
                        { en: 'What are the side effects?', cn: '这药有什么副作用？' },
                        { en: 'Can I talk to the pharmacist?', cn: '我想找药剂师。' },
                    ],
                },
            ],
        },
        {
            id: 'complaint',
            title: '📢 投诉 / 维权',
            subtitle: '东西不好、服务差、房子有问题：说清楚你很生气但要什么',
            color: '#d63031',
            sections: [
                {
                    label: '开头',
                    phrases: [
                        { en: 'Hello. I have a complaint.', cn: '你好，我要投诉。' },
                        { en: 'I am not happy with the service.', cn: '我对服务很不满意。' },
                        { en: 'I need to talk to the manager.', cn: '我要找经理。' },
                    ],
                },
                {
                    label: '说什么问题',
                    phrases: [
                        { en: 'You charged me wrong.', cn: '你们收错钱了。' },
                        { en: 'The product is bad.', cn: '东西有问题。' },
                        { en: 'The service was very bad.', cn: '服务太差了。' },
                        { en: 'This is not safe for living.', cn: '房子住得不安全/不合规定。' },
                        { en: 'I have photos.', cn: '我拍了照片留证据。' },
                    ],
                },
                {
                    label: '你要什么结果',
                    phrases: [
                        { en: 'I want my money back.', cn: '我要退款。' },
                        { en: 'Fix it now, please.', cn: '请马上修好。' },
                        { en: 'I will report to consumer office.', cn: '我会去消费者部门投诉。' },
                        { en: 'I need a safe home.', cn: '我有权住得安全。' },
                    ],
                },
            ],
        },
    ];
})();
