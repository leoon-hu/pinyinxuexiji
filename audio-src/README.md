# 原始录音（scripts/build-audio.py 的输入）

**`teacher/`、`yinjie/`、`misc/` 许可未明确，不在仓库里**（.gitignore），要重新生成音频包得先自己下载到这几个目录：

- `teacher/`：教材配套呼读音录音包，216 个（声母、韵母、韵母×四声、整体认读×四声），来自 du.hanyupinyin.cn/du/pinyin/<key>.mp3（key 列表：`python3 scripts/build-audio.py --list-teacher-keys`）。许可未明确，仅个人使用。
- `yinjie/`：汉语拼音音节表录音，1674 个（普通话全部音节×四声），来自 yinjie.hanyupinyin.cn/duyinjie/<key>.mp3，与 teacher 同一站群。**音节的首选来源**（用户试听后认为比 audio-cmn 更清晰、声调更准）。许可未明确，仅个人使用。
- `cmn/`：hugolpz/audio-cmn 的 `64k/syllabs/`（CC BY-SA 3.0，Chen Wang 王琛录音），1707 个。现在只用来补 teacher / yinjie 都没有的生僻音节（lo、dia），
  重新获取：`git clone --depth 1 --filter=blob:none --sparse https://github.com/hugolpz/audio-cmn && cd audio-cmn && git sparse-checkout set 64k/syllabs`。
- `misc/`：零散来源的单个录音（目前只有 Purple Culture 拼音表的 chi1，purpleculture.net），供 overrides 引用。
- `overrides/`：个别覆盖，见那里的 README（其中 `ch` `chi` `chi1` 三个是 misc 那条录音的拷贝，同样不在仓库里）。

这里的文件不会被应用直接使用，只用于重新生成 `public/audio/`（`npm run audio`）。
