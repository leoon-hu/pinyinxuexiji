/**
 * 例字 → 词语。高级测验答对（或揭晓）后显示并朗读，让孩子把刚拼出的音节和自己认识的词连起来。
 * 每行：音节+声调 例字 词语 [词语]，例字必须与 syllables.ts 里同一「音节 + 声调」的例字一致（有测试保证），
 * 词语里必须含这个例字且读的就是这个音；一个或两个，先常用的。没有合适词语的例字不写（高级测验会考的例字必须有）。
 * 词语录音是 public/audio/w-<音节><声调>-<序号>.mp3（scripts/build-audio.py 读这张表合成），改表要重跑 npm run audio。
 */
const TABLE = `
a1 阿 阿姨
e2 鹅 天鹅 白鹅
e4 饿 饿了 饥饿
ai3 矮 矮小 高矮
ai4 爱 爱心 可爱
ao1 凹 凹凸
ao2 熬 熬粥 熬夜
ao3 袄 棉袄
ao4 傲 骄傲
ou1 欧 欧洲
ou3 偶 木偶 玩偶
an1 安 安全 平安
an4 暗 黑暗 暗处
en1 恩 恩人 感恩
en4 摁 摁住
ang1 肮 肮脏
ang2 昂 昂头 昂贵
er2 儿 儿子 女儿
er3 耳 耳朵 木耳
er4 二 二十 十二

ba1 八 八个 八岁
ba2 拔 拔河 拔草
ba3 把 把手 一把
ba4 爸 爸爸 爸妈
bo1 波 波浪 水波
bo2 伯 伯伯 大伯
bai1 掰 掰开 掰手腕
bai2 白 白色 白天
bai3 百 一百 百分
bai4 拜 拜年 拜拜
bei1 杯 杯子 水杯
bei3 北 北方 北京
bei4 贝 贝壳 宝贝
bao1 包 书包 面包
bao2 雹 冰雹
bao3 宝 宝贝 宝宝
bao4 抱 拥抱 抱抱
ban1 班 班级 上班
ban3 板 黑板 木板
ban4 办 办法 办公
ben1 奔 奔跑 飞奔
ben3 本 本子 课本
ben4 笨 笨重 笨鸟先飞
bang1 帮 帮忙 帮助
bang3 榜 榜样 光荣榜
bang4 棒 棒棒糖 很棒
beng1 崩 崩塌
beng2 甭 甭管
beng4 蹦 蹦跳 蹦蹦跳跳
bi1 逼 逼真 逼近
bi2 鼻 鼻子 鼻涕
bi3 比 比赛 比一比
bi4 必 必须 必要
bie1 憋 憋气 憋住
bie2 别 别人 别的
bie3 瘪 干瘪 瘪了
biao1 标 标准 目标
biao3 表 手表 表哥
bian1 边 旁边 边上
bian3 扁 扁平 压扁
bian4 变 变化 变成
bin1 宾 宾客 来宾
bing1 冰 冰块 冰淇淋
bing3 饼 饼干 月饼
bing4 病 生病 病人
bu3 补 补丁 补课
bu4 布 花布 布娃娃

pa1 趴 趴下 趴着
pa2 爬 爬山 爬行
pa4 怕 害怕 可怕
po1 坡 山坡 上坡
po2 婆 婆婆 外婆
po4 破 破了 打破
pai1 拍 拍手 拍照
pai2 排 排队 排球
pai4 派 派对 派出所
pei2 陪 陪伴 陪着
pei4 配 配合 搭配
pao1 抛 抛球 抛开
pao2 袍 袍子 长袍
pao3 跑 跑步 赛跑
pao4 炮 鞭炮 花炮
pan1 攀 攀爬 攀登
pan2 盘 盘子 光盘
pan4 判 判断 裁判
pen1 喷 喷水 喷泉
pen2 盆 花盆 脸盆
pang1 乓 乒乓球 乒乓
pang2 旁 旁边 一旁
pang4 胖 胖乎乎 长胖
peng1 砰 砰砰 砰的一声
peng2 朋 朋友 小朋友
peng3 捧 捧着 捧起
peng4 碰 碰到 碰碰车
pi1 批 批评 批改
pi2 皮 皮肤 皮球
pi3 匹 一匹 马匹
pi4 屁 屁股
pie3 撇 一撇 撇嘴
piao1 飘 飘扬 飘落
piao2 瓢 瓢虫 水瓢
piao4 票 车票 门票
pian1 篇 一篇 篇章
pian4 片 卡片 一片
pin1 拼 拼音 拼图
pin2 频 频道 频繁
pin3 品 品尝 食品
ping1 乒 乒乓球 乒乓
ping2 平 平安 平地
pu1 扑 扑克 扑通
pu2 葡 葡萄
pu3 普 普通 普通话
pu4 瀑 瀑布

ma1 妈 妈妈 姑妈
ma2 麻 麻雀 芝麻
ma3 马 马路 小马
ma4 蚂 蚂蚱
mo1 摸 摸摸 抚摸
mo2 魔 魔法 魔术
mo4 墨 墨水 墨汁
mai2 埋 埋藏 埋头
mai3 买 买菜 买东西
mai4 卖 卖东西 卖菜
mei2 梅 梅花 杨梅
mei3 美 美丽 美好
mei4 妹 妹妹 姐妹
mao1 猫 小猫 猫咪
mao2 毛 毛巾 羽毛
mao4 帽 帽子 草帽
mou3 某 某个 某天
man2 馒 馒头
man3 满 满意 满分
man4 慢 慢慢 慢跑
men2 门 门口 大门
men4 闷 闷闷不乐 纳闷
mang2 忙 帮忙 忙碌
mang3 蟒 蟒蛇
meng2 萌 萌芽 萌发
meng3 猛 猛烈 凶猛
meng4 梦 做梦 梦想
mi1 眯 眯眼 眯眯笑
mi2 迷 迷路 迷宫
mi3 米 大米 米饭
mi4 蜜 蜂蜜 蜜蜂
mie1 咩 咩咩
mie4 灭 灭火 熄灭
miao1 喵 喵喵 喵喵叫
miao2 苗 树苗 幼苗
miao3 秒 一秒 秒钟
miao4 妙 奇妙 美妙
mian2 棉 棉花 棉袄
mian3 免 免费 避免
mian4 面 面条 面包
min2 民 人民 农民
min3 敏 敏捷 灵敏
ming2 明 明天 明亮
ming4 命 生命 命令
mu3 母 母亲 母鸡
mu4 木 木头 树木

fa1 发 发现 出发
fa2 罚 罚站 惩罚
fa3 法 办法 魔法
fa4 发 头发 理发
fo2 佛 佛像
fei1 飞 飞机 飞行
fei2 肥 肥皂 肥料
fei4 费 花费 浪费
fou3 否 是否 否则
fan1 帆 帆船 风帆
fan2 凡 平凡 凡是
fan3 反 反面 相反
fan4 饭 米饭 吃饭
fen1 分 分钟 分开
fen3 粉 粉色 粉笔
fen4 奋 兴奋 奋斗
fang1 方 方向 地方
fang2 房 房子 房间
fang3 访 访问 拜访
fang4 放 放学 放心
feng1 风 风筝 大风
feng2 缝 缝衣服 缝补
feng4 凤 凤凰 龙凤
fu1 夫 农夫 夫人
fu2 福 幸福 福气
fu3 斧 斧头
fu4 父 父亲 父母

da1 搭 搭积木 搭配
da2 答 回答 答案
da3 打 打球 打开
da4 大 大人 大小
de2 德 道德 品德
dai1 呆 发呆 呆住
dai3 逮 逮住
dai4 带 带来 皮带
dao1 刀 小刀 菜刀
dao3 岛 小岛 海岛
dao4 到 到了 迟到
dou1 兜 兜风 衣兜
dou3 抖 发抖 抖动
dou4 豆 豆子 豆浆
dan1 丹 牡丹 丹顶鹤
dan3 胆 胆子 胆小
dan4 蛋 鸡蛋 蛋糕
dang1 当 当心 当然
dang3 挡 挡住 阻挡
dang4 荡 荡秋千 飘荡
deng1 灯 电灯 灯光
deng3 等 等待 等等
deng4 凳 凳子 板凳
di1 低 低头 高低
di2 笛 笛子 竹笛
di3 底 底下 海底
di4 弟 弟弟 兄弟
die1 爹 爹爹
die2 蝶 蝴蝶
diao1 叼 叼着 叼走
diao4 吊 吊车 吊桥
diu1 丢 丢了 丢失
dian1 颠 颠倒
dian3 点 点心 一点
dian4 电 电话 电视
ding1 丁 布丁 园丁
ding3 顶 头顶 山顶
ding4 定 一定 决定
du1 嘟 嘟嘴 嘟嘟
du2 读 读书 朗读
du3 肚 肚子 肚皮
du4 度 温度 度过
duo1 多 多少 很多
duo2 夺 夺冠 争夺
duo3 朵 花朵 一朵
duo4 跺 跺脚
dui1 堆 堆雪人 一堆
dui4 对 对错 对不起
duan1 端 端午节 端正
duan3 短 长短 短裤
duan4 段 一段 段落
dun1 蹲 蹲下 蹲着
dun3 盹 打盹
dun4 顿 一顿 停顿
dong1 东 东西 东方
dong3 懂 懂了 听懂
dong4 动 动物 运动

ta1 他 他们 其他
ta3 塔 宝塔 铁塔
ta4 踏 踏板 踏步
te4 特 特别 特点
tai1 胎 轮胎
tai2 台 台阶 阳台
tai4 太 太阳 太多
tao1 掏 掏出
tao2 桃 桃子 桃花
tao3 讨 讨论 讨厌
tao4 套 手套 一套
tou1 偷 偷偷 偷懒
tou2 头 头发 石头
tou4 透 透明 透气
tan1 贪 贪吃 贪玩
tan2 谈 谈话 交谈
tan3 坦 坦克 平坦
tan4 叹 叹气 感叹
tang1 汤 汤圆 喝汤
tang2 糖 糖果 白糖
tang3 躺 躺下 躺着
tang4 烫 烫手 滚烫
teng2 疼 心疼 疼痛
ti1 梯 梯子 楼梯
ti2 题 题目 问题
ti3 体 身体 体育
ti4 替 代替 替换
tie1 贴 贴纸 贴画
tie3 铁 铁路 钢铁
tiao1 挑 挑选 挑食
tiao2 条 一条 面条
tiao4 跳 跳舞 跳绳
tian1 天 天空 今天
tian2 田 田地 稻田
tian3 舔 舔一舔
ting1 听 听话 听见
ting2 停 停车 停止
ting3 挺 挺好 挺直
tu1 突 突然 突出
tu2 图 图画 地图
tu3 土 土地 泥土
tu4 兔 兔子 白兔
tuo1 拖 拖鞋 拖地
tuo2 驼 骆驼
tuo3 妥 妥当
tui1 推 推车 推开
tui3 腿 大腿 腿脚
tui4 退 后退 退步
tuan2 团 团圆 团结
tun1 吞 吞下 吞咽
tong1 通 通过 交通
tong2 同 同学 相同
tong3 桶 水桶 木桶
tong4 痛 疼痛 痛快

na2 拿 拿着 拿来
na3 哪 哪里 哪个
na4 那 那里 那个
nai3 奶 奶奶 牛奶
nai4 耐 耐心 忍耐
nei4 内 内容 室内
nao2 挠 挠痒痒
nao3 脑 大脑 电脑
nao4 闹 热闹 闹钟
nan2 男 男孩 男生
nen4 嫩 嫩绿 鲜嫩
neng2 能 能干 可能
ni2 泥 泥土 泥巴
ni3 你 你们 你好
ni4 逆 逆风
nie1 捏 捏泥人 捏住
niao3 鸟 小鸟 鸟儿
niao4 尿 尿布
niu2 牛 牛奶 奶牛
niu3 扭 扭动 扭头
nian2 年 新年 年级
nian4 念 想念 念书
nin2 您 您好
niang2 娘 姑娘 新娘
ning2 宁 宁静 安宁
nu3 努 努力
nu4 怒 发怒 愤怒
nuo2 挪 挪动 挪开
nuo4 诺 承诺 诺言
nuan3 暖 温暖 暖和
nong2 农 农民 农村
nong4 弄 弄坏 摆弄
nü3 女 女孩 女儿

la1 拉 拉手 拉开
la3 喇 喇叭
la4 辣 辣椒 麻辣
le4 乐 快乐 乐园
lai2 来 来了 回来
lai4 赖 赖床 耍赖
lei2 雷 打雷 雷雨
lei3 垒 堡垒
lei4 泪 眼泪 泪水
lao1 捞 捞鱼 打捞
lao2 劳 劳动 勤劳
lao3 老 老师 老虎
lao4 烙 烙饼
lou2 楼 楼梯 高楼
lou3 搂 搂住 搂抱
lou4 漏 漏水 漏了
lan2 蓝 蓝色 蓝天
lan3 懒 懒惰 懒洋洋
lan4 烂 灿烂 烂了
lang2 狼 大灰狼 狼群
lang3 朗 朗读 晴朗
lang4 浪 海浪 浪花
leng3 冷 冷水 寒冷
leng4 愣 发愣 愣住
li2 梨 梨子 鸭梨
li3 里 里面 公里
li4 力 力气 用力
lia3 俩 咱俩
lie4 列 排列 列车
liao2 聊 聊天 无聊
liao4 料 材料 饮料
liu1 溜 溜冰 溜走
liu2 流 流水 流星
liu3 柳 柳树 柳条
liu4 六 六个 六岁
lian2 连 连接 连忙
lian3 脸 脸蛋 洗脸
lian4 练 练习 训练
lin2 林 森林 树林
liang2 良 善良 良好
liang3 两 两个 两边
liang4 亮 明亮 月亮
ling2 零 零食 零下
ling3 领 带领 衣领
ling4 另 另外 另一个
lu2 炉 火炉 炉子
lu4 路 马路 走路
luo2 萝 萝卜 菠萝
luo4 落 落叶 落下
luan4 乱 乱跑 乱七八糟
lun2 轮 车轮 轮子
lun4 论 讨论 议论
long2 龙 龙舟 恐龙
long3 拢 合拢 靠拢
lü2 驴 毛驴
lü3 旅 旅游 旅行
lü4 绿 绿色 绿叶
lüe4 略 省略

ga1 嘎 嘎嘎
ge1 哥 哥哥 大哥
ge2 格 格子 方格
ge4 个 个子 一个
gai1 该 应该
gai3 改 改正 修改
gai4 盖 盖子 盖住
gei3 给 给我 送给
gao1 高 高山 高兴
gao3 搞 搞定 搞笑
gao4 告 告诉 报告
gou1 沟 水沟 山沟
gou3 狗 小狗 狗狗
gou4 够 足够 够了
gan1 甘 甘蔗 甘甜
gan3 敢 勇敢 敢于
gan4 干 干活 能干
gen1 根 树根 根本
gang1 刚 刚才 刚刚
gang3 港 港口 香港
gang4 杠 单杠 双杠
geng1 耕 耕地
gu1 姑 姑姑 姑娘
gu3 古 古代 古老
gu4 故 故事 故乡
gua1 瓜 西瓜 南瓜
gua4 挂 挂钟 挂着
guo1 锅 铁锅 火锅
guo2 国 中国 国家
guo3 果 水果 苹果
guo4 过 过去 过来
guai1 乖 乖乖 乖巧
guai3 拐 拐弯 拐杖
guai4 怪 奇怪 怪物
gui1 规 规矩 规则
gui3 鬼 鬼脸
gui4 贵 贵重 珍贵
guan1 关 关门 关心
guan3 馆 图书馆 博物馆
guan4 惯 习惯
gun3 滚 滚动 打滚
gun4 棍 棍子 木棍
guang1 光 阳光 光明
guang3 广 广场 广播
guang4 逛 逛街 逛公园
gong1 工 工人 工作
gong4 共 一共 公共

ka1 咖 咖啡 咖喱
ka3 卡 卡片 卡车
ke1 科 科学 科目
ke2 咳 咳嗽
ke3 可 可以 可爱
ke4 课 上课 课本
kai1 开 开门 打开
kai3 凯 凯旋
kao3 考 考试 思考
kao4 靠 靠近 依靠
kou3 口 口水 门口
kou4 扣 扣子 纽扣
kan3 砍 砍柴
kan4 看 看书 看见
ken3 肯 肯定 肯干
kang1 康 健康 康复
kang2 扛 扛起 扛着
kang4 抗 抵抗
keng1 坑 水坑 土坑
ku1 哭 哭了 哭鼻子
ku3 苦 辛苦 苦瓜
ku4 库 仓库 车库
kua1 夸 夸奖 夸张
kua3 垮 垮掉
kua4 跨 跨过 跨越
kuo4 阔 宽阔 辽阔
kuai4 快 快乐 快慢
kui1 亏 吃亏 幸亏
kui2 葵 葵花 向日葵
kui4 愧 惭愧
kuan1 宽 宽广 宽阔
kun1 昆 昆虫 昆明
kun3 捆 一捆 捆住
kun4 困 困了 困难
kuang1 筐 竹筐 篮筐
kuang2 狂 疯狂 狂风
kuang4 矿 矿石 矿泉水
kong1 空 天空 空气
kong3 孔 孔雀 鼻孔
kong4 控 控制 遥控

ha1 哈 哈哈 哈欠
he1 喝 喝水 喝茶
he2 河 小河 河水
he4 贺 祝贺 贺卡
hai2 孩 孩子 小孩
hai3 海 大海 海边
hai4 害 害怕 厉害
hei1 黑 黑色 黑板
hao2 豪 自豪
hao3 好 好人 好看
hao4 号 号码 口号
hou2 猴 猴子 小猴
hou3 吼 吼叫 大吼
hou4 后 后面 后来
han1 憨 憨厚
han2 含 包含 含着
han3 喊 喊叫 呼喊
han4 汉 汉字 汉语
hen2 痕 痕迹
hen3 很 很好 很多
hang2 杭 杭州
heng1 哼 哼歌 哼唱
heng2 恒 恒星 永恒
hu1 呼 呼吸 呼叫
hu2 湖 湖水 西湖
hu3 虎 老虎 虎头
hu4 户 窗户 户外
hua1 花 花朵 开花
hua2 滑 滑梯 滑冰
hua4 话 说话 电话
huo2 活 生活 活动
huo3 火 火车 火苗
huo4 货 货车 百货
huai2 怀 怀抱 怀念
huai4 坏 坏了 破坏
hui1 灰 灰色 灰尘
hui2 回 回家 回来
hui3 悔 后悔
hui4 慧 智慧 聪慧
huan1 欢 欢乐 喜欢
huan2 环 环境 环保
huan3 缓 缓慢 缓缓
huan4 换 交换 更换
hun1 昏 黄昏 昏暗
hun2 浑 浑身 浑水
hun4 混 混合 混乱
huang1 荒 荒地 荒岛
huang2 黄 黄色 黄瓜
huang3 谎 谎话 撒谎
hong1 轰 轰隆隆 轰轰
hong2 红 红色 红旗

ji1 机 飞机 机器
ji2 集 集合 集中
ji3 己 自己
ji4 记 记住 日记
jia1 家 家人 回家
jia3 甲 甲虫 指甲
jia4 价 价格 价钱
jie1 街 街道 大街
jie2 节 节日 春节
jie3 姐 姐姐 小姐姐
jie4 借 借书 借用
jiao1 交 交通 交朋友
jiao3 脚 脚步 小脚
jiao4 叫 叫声 大叫
jiu1 揪 揪住
jiu3 九 九个 九月
jiu4 旧 新旧 旧书
jian1 尖 笔尖 尖尖的
jian3 剪 剪刀 剪纸
jian4 见 见面 看见
jin1 金 金色 金鱼
jin3 紧 紧张 抓紧
jin4 近 附近 远近
jiang1 江 长江 江水
jiang3 讲 讲话 讲故事
jiang4 酱 酱油 果酱
jing1 京 北京 京剧
jing3 井 水井 井口
jing4 净 干净 净水
ju1 居 居住 邻居
ju2 局 邮局 结局
ju3 举 举手 举起
ju4 句 句子 一句
jue1 撅 撅嘴
jue2 决 决定 解决
juan1 捐 捐款
juan3 卷 蛋卷 卷起来
juan4 倦 疲倦
jun1 军 军人 军队
jun4 俊 英俊

qi1 七 七个 七月
qi2 齐 整齐 齐全
qi3 起 起床 起来
qi4 气 天气 生气
qia1 掐 掐住
qia4 恰 恰好 恰恰
qie1 切 切菜 切开
qie2 茄 茄子 番茄
qie3 且 而且 并且
qie4 怯 胆怯
qiao1 敲 敲门 敲打
qiao2 桥 大桥 小桥
qiao3 巧 巧克力 巧妙
qiao4 翘 翘起 翘尾巴
qiu1 秋 秋天 秋千
qiu2 球 皮球 足球
qian1 千 一千 千万
qian2 钱 零钱 钱包
qian3 浅 深浅 浅蓝
qian4 欠 哈欠 欠缺
qin1 亲 亲人 母亲
qin2 琴 钢琴 弹琴
qiang1 枪 水枪
qiang2 墙 墙壁 围墙
qiang3 抢 抢答 抢先
qiang4 呛 呛水
qing1 青 青蛙 青草
qing2 晴 晴天 晴朗
qing3 请 请问 请客
qing4 庆 庆祝 国庆
qiong2 穷 无穷
qu1 区 小区 地区
qu2 渠 水渠
qu3 取 取出 取名
qu4 去 去年 出去
que1 缺 缺少 缺口
que4 雀 麻雀 孔雀
quan2 全 全部 安全
quan3 犬 警犬 猎犬
quan4 劝 劝说
qun2 群 一群 羊群

xi1 西 西瓜 东西
xi2 习 学习 练习
xi3 洗 洗手 洗澡
xi4 细 细心 仔细
xia1 虾 大虾 龙虾
xia2 侠 大侠 侠客
xia4 下 下雨 下面
xie1 些 一些 有些
xie2 鞋 鞋子 皮鞋
xie3 写 写字 写作业
xie4 谢 谢谢 感谢
xiao1 消 消失 消息
xiao3 小 小狗 小鸟
xiao4 笑 微笑 笑话
xiu1 修 修理 修好
xiu4 秀 优秀 秀丽
xian1 先 先生 首先
xian2 闲 空闲 悠闲
xian3 显 显得 明显
xian4 现 现在 发现
xin1 心 开心 小心
xin4 信 写信 相信
xiang1 香 香蕉 香味
xiang2 详 详细
xiang3 想 想念 想要
xiang4 向 方向 向前
xing1 星 星星 星期
xing2 形 形状 圆形
xing3 醒 醒来 提醒
xing4 姓 姓名 百姓
xiong1 兄 兄弟 兄妹
xiong2 雄 雄鹰 英雄
xu1 虚 虚心
xu2 徐 徐徐
xu3 许 许多 也许
xu4 续 继续 陆续
xue1 靴 靴子 雨靴
xue2 学 学校 上学
xue3 雪 下雪 雪花
xuan1 宣 宣布 宣传
xuan2 旋 旋转 旋风
xuan3 选 选择 挑选
xun2 寻 寻找 寻宝
xun4 训 训练 教训

zha1 渣 面包渣
zha2 闸 闸门
zha3 眨 眨眼 眨眼睛
zha4 榨 榨汁 榨汁机
zhe1 遮 遮住 遮挡
zhe2 折 折纸 折叠
zhe3 者 记者 作者
zhe4 这 这里 这个
zhi1 之 之前 之后
zhi2 直 一直 直线
zhi3 纸 纸张 白纸
zhi4 志 志向 志气
zhai1 摘 摘花 采摘
zhai2 宅 住宅
zhai3 窄 狭窄 宽窄
zhao1 招 招手 招呼
zhao3 找 找到 寻找
zhao4 照 照片 照相
zhou1 周 周末 一周
zhou2 轴 车轴
zhou3 肘 手肘
zhou4 皱 皱眉 皱纹
zhan1 沾 沾水 沾湿
zhan3 展 展开 展览
zhan4 站 车站 站立
zhen1 真 真的 认真
zhen3 枕 枕头 枕着
zhen4 阵 一阵 阵雨
zhang1 张 一张 张开
zhang3 掌 手掌 鼓掌
zhang4 丈 丈夫 丈量
zheng1 争 争取 争先
zheng3 整 整齐 整理
zheng4 正 正确 正在
zhu1 猪 小猪 猪肉
zhu2 竹 竹子 竹笋
zhu3 主 主人 主要
zhu4 住 住在 居住
zhua1 抓 抓住 抓紧
zhuo1 桌 桌子 书桌
zhuo2 啄 啄木鸟 啄食
zhuai4 拽 拽住
zhui1 追 追赶 追逐
zhui4 坠 坠落
zhuan1 专 专心 专门
zhuan3 转 转身 转弯
zhuan4 赚 赚钱
zhun3 准 准备 准时
zhuang1 装 服装 装扮
zhuang4 壮 壮观 强壮
zhong1 中 中间 中国
zhong3 肿 红肿
zhong4 众 观众 众多

cha1 插 插花 插座
cha2 茶 茶叶 喝茶
cha4 岔 岔路
che1 车 汽车 火车
che3 扯 拉扯 扯断
che4 彻 彻底
chi1 吃 吃饭 吃东西
chi2 池 池塘 水池
chi3 尺 尺子 直尺
chi4 翅 翅膀 鸡翅
chai1 拆 拆开 拆掉
chai2 柴 柴火 火柴
chao1 超 超市 超过
chao2 潮 潮水 涨潮
chao3 炒 炒菜 炒饭
chou1 抽 抽屉 抽出
chou2 愁 发愁 忧愁
chou3 丑 小丑 丑小鸭
chou4 臭 臭味 臭豆腐
chan1 搀 搀扶
chan2 缠 缠绕
chan3 产 生产 产品
chan4 颤 颤抖
chen2 尘 灰尘 尘土
chen4 趁 趁早 趁机
chang2 常 经常 常常
chang3 厂 工厂 厂房
chang4 唱 唱歌 歌唱
cheng1 撑 撑伞 撑住
cheng2 成 成功 完成
cheng4 秤 磅秤
chu1 出 出门 出来
chu2 除 除了 除法
chu3 楚 清楚
chu4 触 接触 触摸
chuo1 戳 戳破
chuo4 绰 绰号
chui1 吹 吹气 吹泡泡
chui2 垂 垂下 下垂
chuan1 川 四川 山川
chuan2 船 小船 轮船
chuan3 喘 喘气 气喘
chuan4 串 一串 羊肉串
chun1 春 春天 春节
chun2 唇 嘴唇
chuang1 窗 窗户 窗外
chuang2 床 小床 起床
chuang3 闯 闯关
chuang4 创 创造 创新
chong1 冲 冲刺 冲浪
chong2 虫 虫子 昆虫
chong3 宠 宠物 宠爱

sha1 沙 沙子 沙滩
sha3 傻 傻笑 傻乎乎
she2 舌 舌头
she4 射 发射 射箭
shi1 诗 古诗 诗歌
shi2 十 十个 十月
shi3 使 使用 使劲
shi4 是 是的 不是
shai1 筛 筛子
shai4 晒 晒太阳 晾晒
shao1 烧 烧水 烧烤
shao2 勺 勺子 汤勺
shao3 少 多少 很少
shao4 哨 口哨 哨子
shou1 收 收拾 收到
shou3 手 小手 手指
shou4 瘦 瘦小 瘦长
shan1 山 高山 山上
shan3 闪 闪电 闪光
shan4 善 善良 友善
shen1 身 身体 身上
shen2 神 神奇 精神
shen3 婶 婶婶
shang1 伤 受伤 伤心
shang3 赏 欣赏 奖赏
shang4 上 上面 上学
sheng1 生 生日 学生
sheng2 绳 绳子 跳绳
sheng3 省 节省 省下
sheng4 胜 胜利 获胜
shu1 书 书包 看书
shu2 熟 成熟 熟悉
shu3 鼠 老鼠 松鼠
shu4 树 大树 树叶
shua1 刷 刷牙 牙刷
shua3 耍 玩耍 耍赖
shuo1 说 说话 说明
shuai1 摔 摔倒 摔跤
shuai3 甩 甩开 甩手
shuai4 帅 帅气 元帅
shui2 谁 是谁 谁的
shui3 水 喝水 水果
shui4 睡 睡觉 睡着
shuan1 拴 拴住
shuan4 涮 涮火锅
shun3 吮 吮吸
shun4 顺 顺利 顺便
shuang1 双 双手 一双
shuang3 爽 凉爽 爽快

re3 惹 招惹
re4 热 热水 炎热
ri4 日 日子 生日
rao3 扰 打扰 干扰
rao4 绕 绕圈 缠绕
rou2 柔 柔软 温柔
rou4 肉 猪肉 肉丸
ran2 然 然后 突然
ran3 染 染色 染料
ren2 人 大人 人们
ren3 忍 忍住 忍耐
ren4 认 认真 认识
rang2 瓤 西瓜瓤
rang3 嚷 嚷嚷
rang4 让 让开 谦让
reng1 扔 扔球 扔掉
reng2 仍 仍然 仍旧
ru2 如 如果 比如
ru3 乳 乳牙 乳牛
ru4 入 进入 入口
ruo4 弱 弱小 强弱
rui3 蕊 花蕊
rui4 锐 尖锐
ruan3 软 柔软 软糖
run4 润 湿润 滋润
rong2 容 容易 容器

za2 杂 杂技 复杂
ze2 责 责任 负责
zi1 资 资料 资源
zi3 子 儿子 孩子
zi4 字 汉字 写字
zai1 灾 火灾 灾害
zai4 在 在家 现在
zao1 糟 糟糕 一团糟
zao2 凿 凿子
zao3 早 早上 早安
zao4 造 制造 造句
zou3 走 走路 走开
zou4 奏 演奏 奏乐
zan2 咱 咱们 咱俩
zan3 攒 攒钱 积攒
zan4 赞 赞美 称赞
zen3 怎 怎么 怎样
zang1 脏 弄脏 脏兮兮
zeng1 增 增加 增长
zeng4 赠 赠送
zu1 租 出租车 房租
zu2 足 足球 满足
zu3 组 小组 组合
zuo2 昨 昨天 昨晚
zuo3 左 左边 左手
zuo4 坐 坐下 坐车
zui3 嘴 嘴巴 张嘴
zui4 最 最好 最大
zuan1 钻 钻洞 钻进去
zuan4 攥 攥紧
zun1 尊 尊重 尊敬
zong1 棕 棕色 棕熊
zong3 总 总是 总共
zong4 粽 粽子

ca1 擦 擦桌子 擦干净
ce4 册 画册 一册
ci2 词 词语 歌词
ci3 此 此时 因此
ci4 次 一次 次数
cai1 猜 猜谜 猜一猜
cai2 才 刚才 人才
cai3 采 采花 采摘
cai4 菜 青菜 蔬菜
cao1 操 做操 体操
cao2 槽 水槽
cao3 草 小草 草地
cou4 凑 凑齐 凑热闹
can1 餐 早餐 午餐
can2 蚕 蚕宝宝 蚕丝
can4 灿 灿烂
cang1 仓 仓库 粮仓
cang2 藏 躲藏 捉迷藏
ceng2 层 一层 楼层
ceng4 蹭 磨蹭
cu1 粗 粗细 粗心
cu4 醋 米醋
cuo1 搓 搓手 搓澡
cuo4 错 错误 对错
cui1 催 催促
cui4 脆 香脆 清脆
cuan4 窜 乱窜
cun1 村 村子 农村
cun2 存 保存 存钱
cun4 寸 一寸
cong1 聪 聪明
cong2 从 从前 从来

sa3 洒 洒水 洒落
sa4 萨 披萨 菩萨
se4 色 颜色 红色
si1 思 思考 意思
si4 四 四个 四季
sai1 腮 腮帮子
sai4 赛 比赛 赛跑
sao3 嫂 嫂子
sou1 搜 搜索 搜寻
sou4 嗽 咳嗽
san1 三 三个 三角形
san3 伞 雨伞 打伞
sen1 森 森林
sang1 桑 桑叶 桑树
sang3 嗓 嗓子 嗓门
su1 苏 苏醒 苏州
su2 俗 风俗
su4 素 素菜 朴素
suo1 缩 缩小 收缩
suo3 所 所以 厕所
sui1 虽 虽然
sui2 随 跟随 随便
sui4 岁 几岁 岁数
suan1 酸 酸奶 酸甜
suan4 算 算术 计算
sun1 孙 孙子 孙女
sun3 损 损坏
song1 松 松树 松鼠
song3 耸 耸肩
song4 送 送给 送礼

yi1 衣 衣服 大衣
yi2 姨 阿姨 姨妈
yi3 椅 椅子 桌椅
yi4 意 意思 注意
ya1 压 压住 压力
ya2 牙 牙齿 刷牙
ya3 雅 优雅 文雅
ya4 亚 亚洲 亚军
yo1 哟 哎哟
ye1 椰 椰子 椰树
ye2 爷 爷爷 老爷爷
ye3 也 也许 也是
ye4 夜 夜晚 黑夜
yao1 腰 弯腰 腰带
yao2 摇 摇头 摇晃
yao3 咬 咬住 咬一口
yao4 药 吃药 药水
you1 优 优秀 优点
you2 油 油菜 汽油
you3 有 有趣 没有
you4 右 右边 右手
yan1 烟 烟花 炊烟
yan2 严 严格 严肃
yan3 眼 眼睛 眼镜
yan4 燕 燕子 小燕子
yin1 音 声音 音乐
yin2 银 银色 银行
yin3 引 吸引 引路
yin4 印 脚印 印章
yang1 央 中央
yang2 羊 山羊 小羊
yang3 养 养鱼 养成
yang4 样 样子 一样
ying1 英 英雄 英语
ying2 赢 赢了 输赢
ying3 影 影子 电影
ying4 硬 坚硬 硬币
yu2 鱼 小鱼 金鱼
yu3 雨 下雨 雨伞
yu4 玉 玉米 宝玉
yue1 约 约定 大约
yue4 月 月亮 月饼
yuan1 冤 冤枉
yuan2 元 一元 元旦
yuan3 远 远方 远处
yuan4 院 院子 医院
yun1 晕 头晕 晕车
yun2 云 白云 云朵
yun3 允 允许
yun4 运 运动 幸运
yong1 拥 拥抱 拥挤
yong3 永 永远
yong4 用 用心 有用

wu1 乌 乌鸦 乌龟
wu2 无 无数 无聊
wu3 五 五个 五月
wu4 物 动物 礼物
wa1 挖 挖土 挖洞
wa2 娃 娃娃 洋娃娃
wa3 瓦 瓦片 瓦房
wa4 袜 袜子
wo1 窝 鸟窝 被窝
wo3 我 我们 我的
wo4 卧 卧室 卧倒
wai1 歪 歪头 歪歪扭扭
wai4 外 外面 外公
wei1 威 威风 威武
wei2 围 围巾 围墙
wei3 伟 伟大
wei4 未 未来
wan1 弯 弯曲 弯腰
wan2 完 完成 完了
wan3 晚 晚上 晚安
wan4 万 一万 千万
wen1 温 温暖 温度
wen2 文 文字 语文
wen3 稳 站稳 平稳
wen4 问 问题 请问
wang1 汪 汪汪 汪洋
wang2 王 国王 王子
wang3 网 上网 蜘蛛网
wang4 忘 忘记 难忘
weng1 翁 渔翁
`

/** key（音节 + 声调，ü 写作 ü 与 syllables.ts 一致）→ [例字, 词语列表] */
const WORDS: Record<string, { char: string; words: string[] }> = {}

for (const line of TABLE.split('\n')) {
  const parts = line.trim().split(/\s+/)
  if (parts.length < 3) continue
  const [key, char, ...words] = parts
  WORDS[key!] = { char: char!, words }
}

/** 某「音节 + 声调」例字的词语（一个或两个）；没有则返回空数组 */
export function wordsFor(written: string, tone: 1 | 2 | 3 | 4): string[] {
  return WORDS[written + tone]?.words ?? []
}

/** 全表（测试与音频脚本核对用） */
export const WORD_TABLE: ReadonlyArray<{ key: string; char: string; words: string[] }> = Object.entries(WORDS).map(
  ([key, v]) => ({ key, char: v.char, words: v.words }),
)
