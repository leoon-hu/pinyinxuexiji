# 离线音频包

这个目录里的 mp3 是学习机的全部发音（约 3700 个），`src/services/audio.ts` 会优先播放这里的录音，找不到的 key 才退回浏览器 TTS。
全部文件由 `scripts/build-audio.py` 生成，**不要手改**；来源与许可见 `CREDITS.md`。

## 命名规则

文件名 = key + `.mp3`，key 由 `data/pinyin.ts` 的 `toKey()` 得出：拼音字母 + 声调数字（1–4），不带调就不加数字，**ü 写作 v**。

| 内容 | key | 备注 |
|---|---|---|
| 声母 b | `b` | 23 个，呼读音 |
| 韵母 a / ü | `a` / `v` | 24 个，呼读音 |
| 韵母 a 第二声 / ü 第三声 | `a2` / `v3` | 24 × 4 |
| 整体认读音节 zhi | `zhi` | 16 个，按一声呼读 |
| 整体认读音节 zhì | `zhi4` | 16 × 4 |
| 音节 bā / lǜ / nüè | `ba1` / `lv4` / `nve4` | 普通话全部音节 × 四声 |
| 音节 jù / quē / yuán | `ju4` / `que1` / `yuan2` | j q x y 后的 ü 写 u，与 `compose()` 一致 |
| 引导语「答对了，真棒！」 | `p-correct` | 旁白，见脚本里的 PROMPTS 表 |
| 例字词语：bà 爸 的第 1 / 2 个词「爸爸」「爸妈」 | `w-ba4-1` / `w-ba4-2` | 见 `src/data/words.ts`，脚本直接读那张表 |

`manifest.json`：`{"version":1,"keys":{"<key>":<时长毫秒>,…}}`，列出全部 key 及时长，可用来预加载或判断某个 key 是否有录音。

所有文件统一为 24kHz 单声道 48kbps，响度归一到 -20 dBFS RMS（峰值不超过 -1 dBFS），头尾静音已按噪声自适应阈值裁掉：
起音前是 40ms 数字静音 + 10ms 淡入，尾音后是 30ms 淡出 + 60ms 数字静音（按 -45 dBFS 量，起音前留白 40–50ms、
尾音后 80–100ms；起音后的第一个 10ms 保证高于 -43 dBFS，b/d/g/p/t/k 的爆破起音与弱送气都保留）。

## 重新生成

原始录音里只有 audio-cmn（`audio-src/cmn/`）和个别覆盖随项目保存；来源 A / B 许可未明确，**不在仓库里**，要先按下表下载到 `audio-src/teacher/` 与 `audio-src/yinjie/`，然后 `npm run audio`。

```bash
npm run audio                                                       # = python3 scripts/build-audio.py --teacher audio-src/teacher --syllables audio-src/yinjie --cmn audio-src/cmn
npm run audio -- --skip-prompts                                     # 断网时跳过引导语 / 词语合成（已有的 p-*.mp3、w-*.mp3 原样保留）
python3 scripts/build-audio.py --help                               # 其他参数
```

依赖：python3 + numpy，ffmpeg（系统 ffmpeg 或 `pip install imageio-ffmpeg`），引导语与词语需要 `pip install edge-tts` 并联网。

源音频不在仓库里，也没有默认路径，换机器要先把两个源包下载到本地再用 `--teacher` / `--cmn` 指定（缺省时脚本会报错并给出提示）：

| 来源 | 内容 | 如何获取 |
|---|---|---|
| A 教材呼读音（du.hanyupinyin.cn） | 216 个 mp3，文件名就是 key | 逐个下载 `http://du.hanyupinyin.cn/du/pinyin/<key>.mp3`（key 列表：`python3 scripts/build-audio.py --list-teacher-keys`），例如 `mkdir -p ~/pinyin-src/teacher && cd ~/pinyin-src/teacher && python3 …/build-audio.py --list-teacher-keys \| xargs -I{} curl -fsSLO "http://du.hanyupinyin.cn/du/pinyin/{}.mp3"` |
| B 音节表录音（yinjie.hanyupinyin.cn） | 1674 个 mp3，文件名就是 key（音节 + 声调，ü 写 v） | 逐个下载 `http://yinjie.hanyupinyin.cn/duyinjie/<key>.mp3` 到 `audio-src/yinjie/`（key 列表 = manifest.json 里不带 `p-` / `w-` 前缀、带声调数字且不是韵母 / 整体认读的项） |
| D hugolpz/audio-cmn（CC-BY-SA-3.0） | `64k/syllabs/cmn-*.mp3` 约 1.7k 个，已随项目放在 `audio-src/cmn/` | `git clone --filter=blob:none --sparse https://github.com/hugolpz/audio-cmn.git ~/pinyin-src/audio-cmn && git -C ~/pinyin-src/audio-cmn sparse-checkout set 64k/syllabs`（本包用的是 2021-03-30 的 ff9ed3d 提交） |
| C 引导语与例字词语 | 引导语 43 条 `p-*.mp3`，词语 1887 条 `w-*.mp3` | 不用下载：`pip install edge-tts` 后联网运行脚本会自动合成（6 路并行，几分钟），原始合成结果缓存在系统临时目录的 `pinyinxuexiji-tts-cache/` |
