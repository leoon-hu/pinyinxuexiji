# 音频来源与许可

本目录的 mp3 由 `scripts/build-audio.py` 从下面几个来源统一处理（噪声自适应裁静音、响度归一到 -20 dBFS RMS、
24kHz 单声道 48kbps）生成，文件名即播放 key（ü 写作 v）。

## A. 教材配套「呼读音」真人录音

- 内容：声母 23、韵母 24、韵母×四声 96、整体认读音节×四声 64
  （不带调的整体认读音节 16 个由对应一声文件派生），单一女声。
- 来源：du.hanyupinyin.cn（汉语拼音学习网）。
- 许可：**未明确**。仅供个人 / 家庭学习使用，请勿再分发或用于商业用途。

## B. 汉语拼音音节表录音：普通话全部音节×四声

- 内容：音节 1386 个（与 A 重合的以 A 为准），主体为同一女声。
- 来源：yinjie.hanyupinyin.cn（汉语拼音学习网音节表，与 A 同一站群）。
- 许可：**未明确**。仅供个人 / 家庭学习使用，请勿再分发或用于商业用途。

## D. audio-cmn：补 A / B 都没有的生僻音节

- 内容：35 个 key：cei1 cei2 cei3 cei4 dia1 dia2 dia4 fe1 fe2 fe3 fe4 fiao1 fiao2 fiao3 fiao4 lo1 lo2 lo3 lo4 nun1 nun2 nun3 nun4 tei1 tei2 tei3 tei4 yai1 yai2 yai3 yai4 yong1 yong2 yong3 yong4
- 作者：录音 Chen Wang（王琛）；项目整理 / 压缩 Hugo Lopez（PLIDAM, INALCO）；录音软件与技术支持 Nicolas Vion。
- 仓库：<https://github.com/hugolpz/audio-cmn>
- 许可：[CC-BY-SA-3.0](https://creativecommons.org/licenses/by-sa/3.0/)。这部分文件是其派生作品，依许可须以相同方式共享并保留署名。

## C. 引导语（p-*.mp3）与例字词语（w-*.mp3）

- 内容：引导语 44 条；例字词语 1887 条（高级测验答对后朗读，文本见 src/data/words.ts）。
- 来源：Microsoft Edge 神经语音合成（edge-tts，音色 zh-CN-XiaoyiNeural，语速 -10%）。
- 许可：合成语音，使用需遵守 Microsoft 相关服务条款。

## O. 个别覆盖（audio-src/overrides）

- 内容：140 个 key 用别的录音替换了上面来源里的版本（听感有问题时的个别修正）：bing3 bo1 bo2 bo3 bo4 ceng1 ceng2 ceng3 ceng4 ch chang1 chang2 chang3 chang4 cheng1 cheng2 cheng3 cheng4 chi chi1 den1 den2 den3 den4 deng1 deng2 deng3 deng4 dia3 e1 e2 e3 e4 feng1 feng2 feng3 feng4 fo1 fo2 fo3 fo4 gan1 gan2 gan3 gan4 geng1 geng2 geng3 geng4 heng1 heng2 heng3 heng4 jing1 jing2 jing3 jing4 keng1 keng2 keng3 keng4 kui1 kui2 kui3 kui4 leng1 leng2 leng3 leng4 ling1 ling3 me1 me2 me3 me4 meng1 meng2 meng3 meng4 mo1 mo2 mo3 mo4 neng1 neng2 neng3 neng4 ning1 ning3 po1 po2 po3 po4 qing1 qing2 qing3 qing4 reng1 reng2 reng3 reng4 seng1 seng2 seng3 seng4 shai1 shai2 shai3 shai4 sheng1 sheng2 sheng3 sheng4 teng1 teng2 teng3 teng4 wo1 wo2 wo3 wo4 xing1 xing3 yi2 ying1 ying2 ying3 ying4 zeng1 zeng2 zeng3 zeng4 zheng1 zheng2 zheng3 zheng4 zuo1 zuo2 zuo3 zuo4
- 许可：与其来源相同；来源不明的仅供个人 / 家庭学习使用。
