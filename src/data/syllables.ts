/**
 * 音节 → 四个声调的例字。用来：① 高级测验出题（只出「有例字」的音节 + 声调）并在听题时显示例字
 * ② 拼读 / 点读结果显示例字 ③ 录音缺失时给 TTS 兜底。例字的词语在 words.ts（按音节 + 声调对应，改字要同步改那边）。
 * 每行：音节 一声 二声 三声 四声，「-」表示该调没有合适的字。
 * 选字原则：孩子认识或日常听得到的常用字优先，宁缺毋滥；不收生僻字和不宜给孩子看的字（脏话、暴力、疾病、死亡之类）。
 * 尽量不用多音字（TTS 兜底会读错调）；实在没有别的字时可用它最常见的那个读音（发 干 折 落 …）。
 */
const TABLE = `
a 阿 - - -
o 噢 - - -
e 婀 鹅 - 饿
ai 哀 - 矮 爱
ei 欸 - - -
ao 凹 熬 袄 傲
ou 欧 - 偶 沤
an 安 - 俺 暗
en 恩 - - 摁
ang 肮 昂 - 盎
eng 鞥 - - -
er - 儿 耳 二

ba 八 拔 把 爸
bo 波 伯 - -
bai 掰 白 百 拜
bei 杯 - 北 贝
bao 包 雹 宝 抱
ban 班 - 板 办
ben 奔 - 本 笨
bang 帮 - 榜 棒
beng 崩 甭 - 蹦
bi 逼 鼻 比 必
bie 憋 别 瘪 -
biao 标 - 表 -
bian 边 - 扁 变
bin 宾 - - -
bing 冰 - 饼 病
bu - - 补 布

pa 趴 爬 - 怕
po 坡 婆 - 破
pai 拍 排 - 派
pei - 陪 - 配
pao 抛 袍 跑 炮
pou - - - -
pan 攀 盘 - 判
pen 喷 盆 - -
pang 乓 旁 - 胖
peng 砰 朋 捧 碰
pi 批 皮 匹 屁
pie - - 撇 -
piao 飘 瓢 - 票
pian 篇 - - 片
pin 拼 频 品 -
ping 乒 平 - -
pu 扑 葡 普 瀑

ma 妈 麻 马 蚂
mo 摸 魔 - 墨
mai - 埋 买 卖
mei - 梅 美 妹
mao 猫 毛 - 帽
mou - - 某 -
man - 馒 满 慢
men - 门 - 闷
mang - 忙 蟒 -
meng - 萌 猛 梦
mi 眯 迷 米 蜜
mie 咩 - - 灭
miao 喵 苗 秒 妙
miu - - - -
mian - 棉 免 面
min - 民 敏 -
ming - 明 - 命
mu - - 母 木

fa 发 罚 法 发
fo - 佛 - -
fei 飞 肥 - 费
fou - - 否 -
fan 帆 凡 反 饭
fen 分 - 粉 奋
fang 方 房 访 放
feng 风 缝 - 凤
fu 夫 福 斧 父

da 搭 答 打 大
de - 德 - -
dai 呆 - 逮 带
dao 刀 - 岛 到
dou 兜 - 抖 豆
dan 丹 - 胆 蛋
dang 当 - 挡 荡
deng 灯 - 等 凳
di 低 笛 底 弟
die 爹 蝶 - -
diao 叼 - - 吊
diu 丢 - - -
dian 颠 - 点 电
ding 丁 - 顶 定
du 嘟 读 肚 度
duo 多 夺 朵 跺
dui 堆 - - 对
duan 端 - 短 段
dun 蹲 - 盹 顿
dong 东 - 懂 动

ta 他 - 塔 踏
te - - - 特
tai 胎 台 - 太
tao 掏 桃 讨 套
tou 偷 头 - 透
tan 贪 谈 坦 叹
tang 汤 糖 躺 烫
teng - 疼 - -
ti 梯 题 体 替
tie 贴 - 铁 -
tiao 挑 条 - 跳
tian 天 田 舔 -
ting 听 停 挺 -
tu 突 图 土 兔
tuo 拖 驼 妥 -
tui 推 - 腿 退
tuan - 团 - -
tun 吞 - - -
tong 通 同 桶 痛

na - 拿 哪 那
ne - - - -
nai - - 奶 耐
nei - - - 内
nao - 挠 脑 闹
nan - 男 - -
nen - - - 嫩
nang - - - -
neng - 能 - -
ni - 泥 你 逆
nie 捏 - - -
niao - - 鸟 尿
niu - 牛 扭 -
nian - 年 - 念
nin - 您 - -
niang - 娘 - -
ning - 宁 - -
nu - - 努 怒
nuo - 挪 - 诺
nuan - - 暖 -
nong - 农 - 弄
nü - - 女 -
nüe - - - -

la 拉 - 喇 辣
le - - - 乐
lai - 来 - 赖
lei - 雷 垒 泪
lao 捞 劳 老 烙
lou - 楼 搂 漏
lan - 蓝 懒 烂
lang - 狼 朗 浪
leng - - 冷 愣
li - 梨 里 力
lia - - 俩 -
lie - - - 列
liao - 聊 - 料
liu 溜 流 柳 六
lian - 连 脸 练
lin - 林 - -
liang - 良 两 亮
ling - 零 领 另
lu - 炉 - 路
luo - 萝 - 落
luan - - - 乱
lun - 轮 - 论
long - 龙 拢 -
lü - 驴 旅 绿
lüe - - - 略

ga 嘎 - - -
ge 哥 格 - 个
gai 该 - 改 盖
gei - - 给 -
gao 高 - 搞 告
gou 沟 - 狗 够
gan 甘 - 敢 干
gen 根 - - -
gang 刚 - 港 杠
geng 耕 - - -
gu 姑 - 古 故
gua 瓜 - - 挂
guo 锅 国 果 过
guai 乖 - 拐 怪
gui 规 - 鬼 贵
guan 关 - 馆 惯
gun - - 滚 棍
guang 光 - 广 逛
gong 工 - - 共

ka 咖 - 卡 -
ke 科 咳 可 课
kai 开 - 凯 -
kao - - 考 靠
kou - - 口 扣
kan - - 砍 看
ken - - 肯 -
kang 康 扛 - 抗
keng 坑 - - -
ku 哭 - 苦 库
kua 夸 - 垮 跨
kuo - - - 阔
kuai - - - 快
kui 亏 葵 - 愧
kuan 宽 - - -
kun 昆 - 捆 困
kuang 筐 狂 - 矿
kong 空 - 孔 控

ha 哈 - - -
he 喝 河 - 贺
hai - 孩 海 害
hei 黑 - - -
hao - 豪 好 号
hou - 猴 吼 后
han 憨 含 喊 汉
hen - 痕 很 -
hang - 杭 - -
heng 哼 恒 - -
hu 呼 湖 虎 户
hua 花 滑 - 话
huo - 活 火 货
huai - 怀 - 坏
hui 灰 回 悔 慧
huan 欢 环 缓 换
hun 昏 浑 - 混
huang 荒 黄 谎 -
hong 轰 红 - -

ji 机 集 己 记
jia 家 - 甲 价
jie 街 节 姐 借
jiao 交 - 脚 叫
jiu 揪 - 九 旧
jian 尖 - 剪 见
jin 金 - 紧 近
jiang 江 - 讲 酱
jing 京 - 井 净
jiong - - - -
ju 居 局 举 句
jue 撅 决 - -
juan 捐 - 卷 倦
jun 军 - - 俊

qi 七 齐 起 气
qia 掐 - - 恰
qie 切 茄 且 怯
qiao 敲 桥 巧 翘
qiu 秋 球 - -
qian 千 钱 浅 欠
qin 亲 琴 - -
qiang 枪 墙 抢 呛
qing 青 晴 请 庆
qiong - 穷 - -
qu 区 渠 取 去
que 缺 - - 雀
quan - 全 犬 劝
qun - 群 - -

xi 西 习 洗 细
xia 虾 侠 - 下
xie 些 鞋 写 谢
xiao 消 - 小 笑
xiu 修 - - 秀
xian 先 闲 显 现
xin 心 - - 信
xiang 香 详 想 向
xing 星 形 醒 姓
xiong 兄 雄 - -
xu 虚 徐 许 续
xue 靴 学 雪 -
xuan 宣 旋 选 -
xun - 寻 - 训

zha 渣 闸 眨 榨
zhe 遮 折 者 这
zhi 之 直 纸 志
zhai 摘 宅 窄 -
zhao 招 - 找 照
zhou 周 轴 肘 皱
zhan 沾 - 展 站
zhen 真 - 枕 阵
zhang 张 - 掌 丈
zheng 争 - 整 正
zhu 猪 竹 主 住
zhua 抓 - - -
zhuo 桌 啄 - -
zhuai - - - 拽
zhui 追 - - 坠
zhuan 专 - 转 赚
zhun - - 准 -
zhuang 装 - - 壮
zhong 中 - 肿 众

cha 插 茶 - 岔
che 车 - 扯 彻
chi 吃 池 尺 翅
chai 拆 柴 - -
chao 超 潮 炒 -
chou 抽 愁 丑 臭
chan 搀 缠 产 颤
chen - 尘 - 趁
chang - 常 厂 唱
cheng 撑 成 - 秤
chu 出 除 楚 触
chuo 戳 - - 绰
chuai - - - -
chui 吹 垂 - -
chuan 川 船 喘 串
chun 春 唇 - -
chuang 窗 床 闯 创
chong 冲 虫 宠 -

sha 沙 - 傻 -
she - 舌 - 射
shi 诗 十 使 是
shai 筛 - - 晒
shao 烧 勺 少 哨
shou 收 - 手 瘦
shan 山 - 闪 善
shen 身 神 婶 -
shang 伤 - 赏 上
sheng 生 绳 省 胜
shu 书 熟 鼠 树
shua 刷 - 耍 -
shuo 说 - - -
shuai 摔 - 甩 帅
shui - 谁 水 睡
shuan 拴 - - 涮
shun - - 吮 顺
shuang 双 - 爽 -

re - - 惹 热
ri - - - 日
rao - - 扰 绕
rou - 柔 - 肉
ran - 然 染 -
ren - 人 忍 认
rang - 瓤 嚷 让
reng 扔 仍 - -
ru - 如 乳 入
ruo - - - 弱
rui - - 蕊 锐
ruan - - 软 -
run - - - 润
rong - 容 - -

za - 杂 - -
ze - 责 - -
zi 资 - 子 字
zai 灾 - - 在
zei - - - -
zao 糟 凿 早 造
zou - - 走 奏
zan - 咱 攒 赞
zen - - 怎 -
zang 脏 - - -
zeng 增 - - 赠
zu 租 足 组 -
zuo - 昨 左 坐
zui - - 嘴 最
zuan 钻 - - 攥
zun 尊 - - -
zong 棕 - 总 粽

ca 擦 - - -
ce - - - 册
ci 疵 词 此 次
cai 猜 才 采 菜
cao 操 槽 草 -
cou - - - 凑
can 餐 蚕 - 灿
cen - - - -
cang 仓 藏 - -
ceng - 层 - 蹭
cu 粗 - - 醋
cuo 搓 - - 错
cui 催 - - 脆
cuan - - - 窜
cun 村 存 - 寸
cong 聪 从 - -

sa - - 洒 萨
se - - - 色
si 思 - 死 四
sai 腮 - - 赛
sao - - 嫂 -
sou 搜 - - 嗽
san 三 - 伞 -
sen 森 - - -
sang 桑 - 嗓 -
seng - - - -
su 苏 俗 - 素
suo 缩 - 所 -
sui 虽 随 - 岁
suan 酸 - - 算
sun 孙 - 损 -
song 松 - 耸 送

yi 衣 姨 椅 意
ya 压 牙 雅 亚
yo 哟 - - -
ye 椰 爷 也 夜
yao 腰 摇 咬 药
you 优 油 有 右
yan 烟 严 眼 燕
yin 音 银 引 印
yang 央 羊 养 样
ying 英 赢 影 硬
yu 迂 鱼 雨 玉
yue 约 - - 月
yuan 冤 元 远 院
yun 晕 云 允 运
yong 拥 - 永 用

wu 乌 无 五 物
wa 挖 娃 瓦 袜
wo 窝 - 我 卧
wai 歪 - - 外
wei 威 围 伟 未
wan 弯 完 晚 万
wen 温 文 稳 问
wang 汪 王 网 忘
weng 翁 - - -
`

/** 音节 → [一声, 二声, 三声, 四声]，没有字的位置为空串 */
export const SYLLABLES: Record<string, [string, string, string, string]> = {}

for (const line of TABLE.split('\n')) {
  const parts = line.trim().split(/\s+/)
if (parts.length !== 5) continue
const [syl, ...chars] = parts
  SYLLABLES[syl!] = chars.map((c) => (c === '-' ? '' : c)) as [string, string, string, string]
}

/** 该书写形式是否是普通话里存在的音节 */
export function syllableExists(written: string): boolean {
  return written in SYLLABLES
}

/** 某音节某个声调的例字；没有则返回空串 */
export function exampleChar(written: string, tone: 1 | 2 | 3 | 4): string {
  return SYLLABLES[written]?.[tone - 1] ?? ''
}
