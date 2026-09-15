#!/usr/bin/env python3
"""
生成离线音频包 public/audio/ 。

把几个来源的原始录音 / 合成语音统一处理成「裁静音 → 响度归一 → 24kHz 单声道 48kbps mp3」，
文件名即 services/audio.ts 里的 key（data/pinyin.ts 的 toKey：ü 写作 v），并写出 manifest.json 与 CREDITS.md。
源音频不进项目，只输出处理后的文件；重复运行结果一致（幂等）。

来源与取用规则
  A. 教材配套「呼读音」真人包（du.hanyupinyin.cn，单一女声，--teacher / --extra）
     声母 23、韵母 24、韵母×四声 96、整体认读音节×四声 64，共 207 个 key，文件名就是 key。
     包里多余的 ma0–ma4、xi1–xi4 不用。--extra 是可选的补充目录（同名文件优先级低于 --teacher）。
     整体认读音节不带调的 key（zhi、chi …）包里没有，按课本「整体认读音节表按一声呼读」的习惯取一声文件生成。
  B. 汉语拼音音节表录音（yinjie.hanyupinyin.cn，与 A 同一站群，--syllables）
     普通话全部音节×四声约 1.7k 个：<key>.mp3，文件名就是 key（ü 写作 v，j/q/x/y 后的 ü 已写作 u）。
     与 A 重合的 key 以 A 为准。用户 A/B 试听后认为这套比 audio-cmn 更清晰、更准（audio-cmn 的录音者在 w/y 滑音处
     起音偏低，如 wā 从 250 Hz 升到 307 Hz），所以它是音节的首选来源。
  D. hugolpz/audio-cmn（CC-BY-SA-3.0，Chen Wang 王琛 女声，--cmn，可选）
     只用来补 A / B 都没有的 key（目前是 lo1–4 和 dia1/2/4 这类生僻音节）：cmn-<拼音><调>.mp3 去掉 cmn- 前缀即 key；
     只取 1–4 声（跳过 *5 轻声与 _m/_n/_ng 等下划线开头的鼻音节）；cmn-jv4 改名 ju4。
  O. 覆盖目录（--overrides，默认 audio-src/overrides）：里面的 <key>.mp3 替换 A / B / D 里同 key 的文件，
     用来修个别录音（例如某个音节听起来调不对）。处理方式相同。
  C. 引导语（旁白，key 形如 p-xxx）与例字词语（key 形如 w-ba4-1）：Microsoft Edge 神经语音 zh-CN-XiaoyiNeural
     （edge-tts，--rate=-10%）合成。引导语文本见下方 PROMPTS；词语从 src/data/words.ts 的表里读（每行「音节+声调 例字 词语…」，
     第 n 个词语 → w-<音节><声调>-<n>，ü 写作 v）。原始合成结果缓存在 --tts-cache（默认系统临时目录），
     --skip-prompts 可跳过合成（跳过时输出目录里已有的 p-*.mp3 / w-*.mp3 及其 manifest 条目原样保留）。

源包如何（重新）获取 —— 源目录不在仓库里，也没有默认路径，换机器要先下载再用参数指定
  A. 216 个文件，URL 形如 http://du.hanyupinyin.cn/du/pinyin/<key>.mp3（key 见下方 INITIALS / FINALS / WHOLES ×
     声调，例如 b.mp3、a1.mp3、zhi4.mp3；ü 写作 v，如 v.mp3、ve4.mp3、vn2.mp3），逐个下载到一个目录：
       mkdir -p ~/pinyin-src/teacher && cd ~/pinyin-src/teacher
       python3 scripts/build-audio.py --list-teacher-keys | xargs -I{} curl -fsSLO "http://du.hanyupinyin.cn/du/pinyin/{}.mp3"
     然后 --teacher ~/pinyin-src/teacher 。许可未明确，仅供个人 / 家庭学习使用。
  B. URL 形如 http://yinjie.hanyupinyin.cn/duyinjie/<key>.mp3（key = 音节 + 声调，ü 写 v），页面
     http://yinjie.hanyupinyin.cn/ 的播放器 JS 里就是这个规则。逐个下载到 audio-src/yinjie/（不在仓库里）。
     许可未明确，仅供个人 / 家庭学习使用。
  D. 只取仓库里的 64k/syllabs 目录（约 1.7k 个小文件，稀疏检出即可）：
       git clone --filter=blob:none --sparse https://github.com/hugolpz/audio-cmn.git ~/pinyin-src/audio-cmn
       cd ~/pinyin-src/audio-cmn && git sparse-checkout set 64k/syllabs
     然后 --cmn ~/pinyin-src/audio-cmn/64k/syllabs 。（本包生成时用的是 2021-03-30 的 ff9ed3d 提交。）
  C. 不用下载：pip install edge-tts，联网运行脚本时会自动合成并缓存到 --tts-cache。

每个文件的处理
  1. ffmpeg 解码为 24000Hz 单声道 float32 PCM，经管道读进 numpy；
  2. 裁静音（噪声自适应，见 find_voiced）：
     - 10ms 窗按 2.5ms 步长滑动算 RMS，先找「核心」（比最响窗低不到 20dB 的窗）；
     - 估计底噪上沿：文件头段 / 尾段远离核心那一半窗的 90 分位，取两侧较低者（这样一侧的长擦音起音或结尾换气
       不会把估计带高）；
     - 两个阈值都按增益后的电平定（先算增益，再判静音，迭代到稳定），并且都不低于底噪上沿 + 6 dB，所以来源 B
       那种 -40 dBFS 的连续底噪不会被当成声音顺着延伸到文件头尾：
         连接阈值 = 归一后 -50 dBFS：高于它的窗算作与核心相连的语音；
         起音阈值 = 归一后 -43 dBFS：起音后第一个 10ms 窗、结束前最后一个 10ms 窗都要高于它；
     - 从核心两端向外延伸，并入所有高于连接阈值的窗，容忍 ≤50ms 的缺口（b/d/g/p/t/k 的除阻爆破与元音之间常隔着
       30–50ms 的弱送气或介音，不容忍缺口就会把爆破丢掉；滑动窗则保证跨在 10ms 边界上的短爆破也能接住；
       连接阈值比起音阈值低，是为了让 p/t/k 那种很弱的长送气也连得上）；起音点 = 这段里最早高于起音阈值的窗的
       起点，结束点 = 最晚高于起音阈值的窗的终点；两端在起音阈值之下的部分（归一后本来就低于 -45 dBFS）舍掉；
     - 输出 = 40ms 数字静音 + 10ms 淡入（起音前那 10ms 的源音频，在阈值之下） + 有声段 + 30ms 淡出 + 60ms 数字静音，
       头尾不够的部分补零。按 -45 dBFS 量，起音前留白 40–50ms，尾音后 80–100ms；
     - 整段都低于起音阈值的文件报错；
  3. 响度归一：有声窗的 K 加权 RMS（≈ LUFS）增益到 -18 dB，峰值不超过 -1 dBFS（超过则按峰值缩放，不用压缩 / 限幅器）；
     用 K 加权而不是纯 RMS，是因为两套录音的频谱不同，纯 RMS 对齐后音节听起来比呼读音小一截；
  4. libmp3lame 48kbps CBR，写 Xing 头，不写 ID3。

用法
  npm run audio   # = python3 scripts/build-audio.py --teacher audio-src/teacher --syllables audio-src/yinjie --cmn audio-src/cmn
  python3 scripts/build-audio.py --teacher DIR --syllables DIR [--cmn DIR] --skip-prompts   # 断网时先出录音部分（引导语 / 词语保留旧文件）
  python3 scripts/build-audio.py ... --audition x.html              # 顺便生成一个本地试听页（不进项目）
  python3 scripts/build-audio.py ... --prune                        # 顺便删掉输出目录里不再属于本包的 mp3
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import statistics
import subprocess
import sys
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np

# ---------------------------------------------------------------------------
# 路径：源目录没有默认值（源包不在仓库里，获取方法见文件头注释），输出与 TTS 缓存有默认值
# ---------------------------------------------------------------------------
DEFAULT_OUT = Path(__file__).resolve().parent.parent / "public" / "audio"
DEFAULT_OVERRIDES = Path(__file__).resolve().parent.parent / "audio-src" / "overrides"
DEFAULT_TTS_CACHE = Path(tempfile.gettempdir()) / "pinyinxuexiji-tts-cache"
WORDS_TS = Path(__file__).resolve().parent.parent / "src" / "data" / "words.ts"
SOURCE_HELP = """源目录不在仓库里，需要先下载再用参数指定（详见脚本头部注释）：
  --teacher DIR   来源 A：http://du.hanyupinyin.cn/du/pinyin/<key>.mp3 共 216 个，文件名就是 key（ü 写作 v）
                  key 列表：python3 scripts/build-audio.py --list-teacher-keys
  --syllables DIR 来源 B：http://yinjie.hanyupinyin.cn/duyinjie/<key>.mp3（音节 + 声调，ü 写 v），下载到 audio-src/yinjie/（不在仓库里）
  --cmn DIR       来源 D（可选，只补 A / B 没有的 key）：git clone --filter=blob:none --sparse https://github.com/hugolpz/audio-cmn.git
                  && git -C audio-cmn sparse-checkout set 64k/syllabs，DIR 指向 audio-cmn/64k/syllabs
  引导语与例字词语（来源 C）由脚本用 edge-tts 联网合成，不用下载。"""

# ---------------------------------------------------------------------------
# key 表（与 src/data/pinyin.ts 一致）
# ---------------------------------------------------------------------------
INITIALS = "b p m f d t n l g k h j q x zh ch sh r z c s y w".split()
FINALS = "a o e i u v ai ei ui ao ou iu ie ve er an en in un vn ang eng ing ong".split()
WHOLES = "zhi chi shi ri zi ci si yi wu yu ye yue yuan yin yun ying".split()
TONES = ("1", "2", "3", "4")

# 引导语：key → 文本
PROMPTS: Dict[str, str] = {
    "p-welcome": "欢迎来到拼音学习机！",
    "p-mode-read": "点读模式。点一点按键，听一听拼音。",
    "p-mode-spell": "拼读模式。先选声母，再选韵母和声调，然后按确定。",
    "p-mode-basic": "听音找拼音。听一听，点出你听到的拼音。",
    "p-mode-advanced": "听音拼音节。听一听，拼出你听到的音节，再按确定。",
    "p-listen": "请听。",
    "p-again": "再听一遍。",
    "p-correct": "答对了，真棒！",
    "p-wrong": "不对哦，再试一次。",
    "p-answer": "正确答案是这个，听一听。",
    "p-tap-this": "来，点一下这个。",
    "p-pick-final": "先选一个韵母吧。",
    "p-pick-tone": "再选一个声调。",
    "p-jqx": "小迂见了基、欺、希，脱帽敬个礼，摘了帽子还是迂。",
    "p-no-such": "普通话里没有这个音节，换一个试试。",
    "p-whole": "这是整体认读音节，不用拼，直接读。",
    "p-sanpin": "这是三拼音节，声轻介快韵母响。",
    "p-echo-you": "该你读了。",
    "p-echo-done": "这一组跟读完成，真棒！",
    "p-round-perfect": "全部答对，太厉害了！",
    "p-round-done": "这一轮完成了，继续加油！",
    "p-first-round": "今天的第一轮完成，奖励十个金币！",
    "p-try-spell": "试试拼读吧。",
    "p-parent": "请爸爸妈妈来确认。",
    "p-locked": "这里是给爸爸妈妈用的哦。",
    "p-press-next": "按绿色的确定键，下一题。",
    "p-gift-done": "换好了！去找爸爸妈妈领礼物吧。",
    "p-not-enough": "金币还不够，再去做题赚一些吧。",
    "p-pick-unit": "请爸爸妈妈先选一下，学到第几课了。",
    "p-unit-set": "好，就从这一课开始。",
    "p-tap-lit": "点亮着的键。",
    "p-quit-round": "不做这一轮了吗？",
    "p-next-round": "下一轮，开始！",
    "p-which-tone": "听一听，是第几声？",
    "p-which-initial": "听一听，这个音节的声母是哪一个？",
    "p-which-final": "听一听，这个音节的韵母是哪一个？",
    "p-listen-first": "先听一听，再点。",
    "p-coins-cap": "今天的金币赚够啦，明天再来吧。",
    "p-four-tones": "听听四个声调。",
    "p-tone-song": "一声平，二声扬，三声拐弯，四声降。",
    "p-tasks-intro": "今天的任务：点一点，听一听，拼一拼，考一考。",
    "p-task-done": "这一项做完了，真棒！",
    "p-tasks-done": "今天的任务都做完了，太棒了！明天再来。",
}
TTS_VOICE = "zh-CN-XiaoyiNeural"
TTS_RATE = "-10%"
TTS_JOBS = 6                 # edge-tts 并行合成数（两千个词语串行要一个小时）

# 音频处理参数
SR = 24000
WIN = SR // 100              # 10ms 分析窗
HOP = SR // 400              # 10ms 窗的滑动步长（2.5ms），整个裁静音分析都在这个滑动 RMS 序列上做
EDGE_OUT_DB = -43.0          # 起音 / 结束阈值（输出域）：起音后第一个 10ms 窗、结束前最后一个 10ms 窗都要高于它
                             # （核查按 -45 dBFS 量起音 / 尾音，留 2dB 余量抵消 mp3 量化误差）
CONNECT_OUT_DB = -50.0       # 连接阈值（输出域）：高于它的窗算作与核心相连的语音（弱送气、擦音起始、元音衰减）
NOISE_MARGIN_DB = 6.0        # 两个阈值都至少比底噪上沿高这么多
CORE_DROP_DB = 20.0          # 「核心」= 比最响窗低不到 20dB 的窗
GAP_MS = 50                  # 向外延伸时容忍的静音缺口（爆破音的除阻与元音之间可能隔着 30–50ms 的弱送气 / 介音）
LEAD_SILENCE_MS, LEAD_RAMP_MS = 40, 10    # 起音前：数字静音 + 淡入
TAIL_FADE_MS, TAIL_SILENCE_MS = 30, 60    # 结束后：淡出 + 数字静音
TARGET_RMS_DB = -18.0        # 有声段的 K 加权 RMS（≈ LUFS，见 kweight）目标；不同来源按响度对齐，而不是按原始 RMS
GROUP_GAIN_DB = {"音节": 1.5}  # 音节比呼读音短，同样响度听起来偏小，再补一点
PEAK_LIMIT_DB = -1.0
BITRATE = "48k"

# 分组名（统计 / 试听页共用），顺序即展示顺序
G_INITIAL, G_FINAL, G_FINAL4, G_WHOLE, G_WHOLE4, G_SYL, G_PROMPT, G_WORD = (
    "声母", "韵母", "韵母×四声", "整体认读", "整体认读×四声", "音节", "引导语", "词语",
)
ALL_GROUPS = (G_INITIAL, G_FINAL, G_FINAL4, G_WHOLE, G_WHOLE4, G_SYL, G_PROMPT, G_WORD)


class Item:
    """一个待输出的 key：来源文件 + 分组 + 处理结果。"""

    def __init__(self, key: str, src: Path, group: str, origin: str, note: str = ""):
        self.key = key
        self.src = src
        self.group = group
        self.origin = origin        # A 呼读音包 / B 音节表 / D audio-cmn 补缺 / O 覆盖 / C 引导语
        self.note = note            # 特殊处理说明（如「由 zhi1 派生」）
        self.duration_ms = 0
        self.rms_db = 0.0           # 归一后的有声段 RMS
        self.peak_db = 0.0
        self.peak_limited = False
        self.floor_db = 0.0         # 源文件的底噪上沿（头尾远端窗的 90 分位，见 noise_ceiling）
        self.threshold_db = 0.0     # 最终采用的起音阈值（源电平）
        self.connect_db = 0.0       # 最终采用的连接阈值（源电平）
        self.trimmed_ms = (0, 0)    # 起音点之前 / 结束点之后被去掉的源音频长度
        self.size = 0
        self.error: Optional[str] = None


# ---------------------------------------------------------------------------
# 工具
# ---------------------------------------------------------------------------
def find_ffmpeg(explicit: Optional[str]) -> str:
    if explicit:
        return explicit
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    try:
        import imageio_ffmpeg  # type: ignore

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        sys.exit("找不到 ffmpeg：请安装系统 ffmpeg，或 pip install imageio-ffmpeg，或用 --ffmpeg 指定")


def db(x: float) -> float:
    return 20.0 * np.log10(max(float(x), 1e-12))


def decode(ffmpeg: str, src: Path) -> np.ndarray:
    """ffmpeg 解码为 24k 单声道 float32。"""
    cmd = [ffmpeg, "-v", "error", "-nostdin", "-i", str(src),
           "-f", "f32le", "-acodec", "pcm_f32le", "-ac", "1", "-ar", str(SR), "pipe:1"]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    if res.returncode != 0:
        raise RuntimeError(f"解码失败：{res.stderr.decode('utf-8', 'replace').strip()}")
    return np.frombuffer(res.stdout, dtype=np.float32).astype(np.float64)


def encode(ffmpeg: str, pcm: np.ndarray, dst: Path) -> None:
    tmp = dst.with_suffix(".mp3.part")
    cmd = [ffmpeg, "-v", "error", "-nostdin", "-y",
           "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "pipe:0",
           "-map_metadata", "-1",
           "-c:a", "libmp3lame", "-b:a", BITRATE, "-ar", str(SR), "-ac", "1",
           "-write_xing", "1", "-id3v2_version", "0",
           "-f", "mp3", str(tmp)]
    res = subprocess.run(cmd, input=pcm.astype(np.float32).tobytes(),
                         stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    if res.returncode != 0:
        tmp.unlink(missing_ok=True)
        raise RuntimeError(f"编码失败：{res.stderr.decode('utf-8', 'replace').strip()}")
    os.replace(tmp, dst)


def win_levels(pcm: np.ndarray, w: int, hop: Optional[int] = None) -> Tuple[np.ndarray, np.ndarray]:
    """
    w 个采样一窗的 RMS（线性）与 dB。hop=None：不重叠切块，不足一窗的尾巴补零后一起算；
    hop=h：窗按 h 采样滑动（前缀和实现），最后一个窗是最后一个完整落在 pcm 里的窗。
    """
    if hop is None:
        n = (pcm.size + w - 1) // w
        padded = np.zeros(n * w)
        padded[: pcm.size] = pcm
        rms = np.sqrt(np.mean(padded.reshape(n, w) ** 2, axis=1))
    else:
        cs = np.concatenate([[0.0], np.cumsum(pcm ** 2)])
        starts = np.arange(0, max(1, pcm.size - w + 1), hop)
        rms = np.sqrt(np.maximum(cs[np.minimum(starts + w, pcm.size)] - cs[starts], 0.0) / w)
    return rms, 20.0 * np.log10(np.maximum(rms, 1e-12))


def noise_ceiling(win_db: np.ndarray, c0: int, c1: int, skip_head: int, skip_tail: int) -> float:
    """
    底噪上沿：文件头段 [0, c0) 里远离核心的前一半窗、尾段 (c1, end] 里远离核心的后一半窗，各取 90 分位，
    返回两者较低者。跳过最前 skip_head 窗（编码器起始斜坡）与最后 skip_tail 窗（可能是补零）。
    「远离核心的一半」避开了紧挨核心的起音辅音 / 衰减尾；两侧取低者是为了让一侧的长擦音（f、h…）或结尾换气
    最多只污染一侧的估计。头尾都不足 30ms（源已裁得很紧）时返回 -inf，阈值就完全由输出域电平决定。
    """
    head = win_db[skip_head:c0]
    tail = win_db[c1 + 1 : len(win_db) - skip_tail]
    need = 3 * (WIN // HOP)
    ests = []
    for far in (head[: len(head) // 2], tail[len(tail) - len(tail) // 2 :]):
        if far.size >= need:
            ests.append(float(np.percentile(far, 90)))
    return min(ests) if ests else float("-inf")


def extend_run(above: np.ndarray, first: int, last: int, gap_ok: int) -> Tuple[int, int]:
    """
    从 [first, last]（两端都须为 above）向两端延伸：above 的位置并入，容忍 ≤gap_ok 个连续不 above 的位置。
    等价于：above 位置序列里相邻两点距离 > gap_ok + 1 处断开，取包含 first / last 的那一段的两端。
    """
    idx = np.flatnonzero(above)
    breaks = np.flatnonzero(np.diff(idx) > gap_ok + 1)          # idx[k] 与 idx[k+1] 之间断开
    i0 = int(np.searchsorted(idx, first))
    i1 = int(np.searchsorted(idx, last))
    left = breaks[breaks < i0]
    right = breaks[breaks >= i1]
    start = int(idx[left[-1] + 1]) if left.size else int(idx[0])
    stop = int(idx[right[0]]) if right.size else int(idx[-1])
    return start, stop


def _biquad(b: Tuple[float, float, float], a: Tuple[float, float, float], x: np.ndarray) -> np.ndarray:
    """直接 II 型双二阶滤波（纯 numpy / python 循环太慢，用 scipy 不在依赖里，这里用递推的向量化近似：逐样本循环）。"""
    b0, b1, b2 = b
    a0, a1, a2 = a
    b0, b1, b2, a1, a2 = b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0
    y = np.empty_like(x)
    x1 = x2 = y1 = y2 = 0.0
    for i in range(x.size):
        xi = x[i]
        yi = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        y[i] = yi
        x2, x1, y2, y1 = x1, xi, y1, yi
    return y


def kweight(pcm: np.ndarray) -> np.ndarray:
    """
    ITU-R BS.1770 的 K 加权（高架 +4 dB @ ~1.68 kHz + 高通 @ ~38 Hz），系数按本采样率用 RBJ 公式推出。
    在它上面算的 RMS 与 LUFS 只差一个常数，用来让不同录音来源的「听感响度」对齐（纯 RMS 会被低频 / 底噪带偏）。
    """
    import math

    def shelf(f0: float, gain_db: float, q: float):
        a_ = 10 ** (gain_db / 40)
        w0 = 2 * math.pi * f0 / SR
        cos, sin = math.cos(w0), math.sin(w0)
        alpha = sin / (2 * q)
        sq = 2 * math.sqrt(a_) * alpha
        b = (a_ * ((a_ + 1) + (a_ - 1) * cos + sq), -2 * a_ * ((a_ - 1) + (a_ + 1) * cos), a_ * ((a_ + 1) + (a_ - 1) * cos - sq))
        a = ((a_ + 1) - (a_ - 1) * cos + sq, 2 * ((a_ - 1) - (a_ + 1) * cos), (a_ + 1) - (a_ - 1) * cos - sq)
        return b, a

    def highpass(f0: float, q: float):
        w0 = 2 * math.pi * f0 / SR
        cos, sin = math.cos(w0), math.sin(w0)
        alpha = sin / (2 * q)
        b = ((1 + cos) / 2, -(1 + cos), (1 + cos) / 2)
        a = (1 + alpha, -2 * cos, 1 - alpha)
        return b, a

    y = _biquad(*shelf(1681.974, 3.99984, 0.7071752), pcm)
    return _biquad(*highpass(38.13547, 0.5003270), y)


def voiced_rms(pcm: np.ndarray, t0: int, t1: int, th_db: float, weighted: Optional[np.ndarray] = None) -> float:
    """
    [t0, t1) 里按 10ms 不重叠切窗，取（按原信号）高于阈值的窗算 RMS（句中停顿等静音窗不计入）。
    给了 weighted（K 加权后的信号）就在它上面算 RMS，窗的取舍仍按原信号判。
    """
    rms, wdb = win_levels(pcm[t0:t1], WIN)
    if weighted is None:
        v = rms[wdb > th_db]
        return float(np.sqrt(np.mean(v ** 2))) if v.size else float(np.sqrt(np.mean(rms ** 2)))
    wr, _ = win_levels(weighted[t0:t1], WIN)
    v = wr[wdb > th_db]
    return float(np.sqrt(np.mean(v ** 2))) if v.size else float(np.sqrt(np.mean(wr ** 2)))


def find_voiced(pcm: np.ndarray, weighted: Optional[np.ndarray] = None, target_db: float = TARGET_RMS_DB) -> dict:
    """
    噪声自适应裁静音 + 响度增益，返回 dict：
      t0 / t1        有声段在 pcm 里的起 / 止采样位置（t1 为开区间）
      gain           线性增益（有声窗 RMS → TARGET_RMS_DB，峰值不超过 PEAK_LIMIT_DB）
      peak_limited   是否因峰值限制而没达到目标 RMS
      th / connect   采用的起音阈值 / 连接阈值，noise 底噪上沿（都是源电平 dB）
    全部在「10ms 窗按 2.5ms 步长滑动」的 RMS 序列上进行：
      1. 核心 = 比最响窗低不到 CORE_DROP_DB 的窗；
      2. 底噪上沿 = 头 / 尾远端窗的 90 分位（见 noise_ceiling）；
      3. 两个阈值都按增益后的电平定：连接阈值 = max(CONNECT_OUT_DB - gain_dB, 底噪 + NOISE_MARGIN_DB)，
         起音阈值 = max(EDGE_OUT_DB - gain_dB, 连接阈值)。增益取决于有声区间、区间又取决于阈值，迭代到稳定；
      4. 从核心两端向外延伸，并入所有高于连接阈值的窗，容忍 ≤GAP_MS 的缺口：b/d/g/p/t/k 的除阻爆破与元音之间常隔着
         30–50ms 的弱送气或介音，缺口容忍保证爆破不被丢掉；滑动窗保证跨在 10ms 边界上的短爆破也能被接住；
         连接阈值比起音阈值低 7dB，是为了让 p/t/k 那种很弱的长送气（归一后 -45 dBFS 上下）也连得上；
      5. t0 = 这段里最早高于起音阈值的窗的起点，t1 = 最晚高于起音阈值的窗的终点（段两端低于起音阈值的部分
         归一后本来就在 -45 dBFS 以下，舍掉）。于是输出里起音后的第一个 10ms、结束前的最后一个 10ms 都高于
         起音阈值，起音前那 10ms（淡入区）在其之下。
    """
    per = WIN // HOP
    rms, sdb = win_levels(pcm, WIN, HOP)
    if sdb.max() <= EDGE_OUT_DB:
        raise RuntimeError(f"整个文件都低于 {EDGE_OUT_DB:g} dBFS（最大 10ms 窗 RMS {sdb.max():.1f} dBFS）")
    core = np.flatnonzero(sdb >= sdb.max() - CORE_DROP_DB)
    c0, c1 = int(core[0]), int(core[-1])
    noise = noise_ceiling(sdb, c0, c1, skip_head=2 * per, skip_tail=per)
    core_peak = float(np.max(np.abs(pcm[c0 * HOP : c1 * HOP + WIN])))
    peak_lin = 10 ** (PEAK_LIMIT_DB / 20)
    gap_ok = GAP_MS * SR // 1000 // HOP

    def bounds(th_connect: float, th_edge: float) -> Tuple[int, int]:
        first, last = extend_run(sdb > th_connect, c0, c1, gap_ok)
        edge = np.flatnonzero(sdb[first : last + 1] > th_edge) + first    # 核心本身高于 th_edge，非空
        return int(edge[0]), int(edge[-1])

    gain_db = 0.0
    connect = max(CONNECT_OUT_DB, noise + NOISE_MARGIN_DB)
    th = max(EDGE_OUT_DB, connect)
    limited = False
    for _ in range(10):
        first, last = bounds(connect, th)
        g = 10 ** (target_db / 20) / max(voiced_rms(pcm, first * HOP, last * HOP + WIN, th, weighted), 1e-9)
        limited = core_peak * g > peak_lin
        gain = peak_lin / core_peak if limited else g
        gain_db = 20.0 * np.log10(gain)
        connect_new = max(CONNECT_OUT_DB - gain_db, noise + NOISE_MARGIN_DB)
        th_new = max(EDGE_OUT_DB - gain_db, connect_new)
        done = abs(th_new - th) < 0.05 and abs(connect_new - connect) < 0.05
        connect, th = connect_new, th_new
        if done:
            break
    first, last = bounds(connect, th)
    return {"t0": first * HOP, "t1": min(pcm.size, last * HOP + WIN), "gain": gain,
            "peak_limited": limited, "th": th, "connect": connect, "noise": noise}


def take(pcm: np.ndarray, start: int, stop: int) -> np.ndarray:
    """pcm[start:stop]，越界部分补零（保证长度恒为 stop - start）。"""
    out = np.zeros(stop - start)
    a, b = max(0, start), min(pcm.size, stop)
    if b > a:
        out[a - start : b - start] = pcm[a:b]
    return out


def process(ffmpeg: str, item: Item, dst: Path) -> None:
    """解码 → 裁静音 → 归一 → 编码，结果写回 item。"""
    pcm = decode(ffmpeg, item.src)
    if pcm.size == 0:
        raise RuntimeError("解码得到 0 个采样")
    weighted = kweight(pcm)
    v = find_voiced(pcm, weighted, TARGET_RMS_DB + GROUP_GAIN_DB.get(item.group, 0.0))
    t0, t1 = v["t0"], v["t1"]
    item.floor_db, item.threshold_db, item.connect_db = v["noise"], v["th"], v["connect"]
    item.peak_limited = v["peak_limited"]
    item.trimmed_ms = (t0 * 1000 // SR, (pcm.size - t1) * 1000 // SR)

    ms = lambda n: n * SR // 1000  # noqa: E731
    ramp = take(pcm, t0 - ms(LEAD_RAMP_MS), t0) * np.linspace(0.0, 1.0, ms(LEAD_RAMP_MS), endpoint=False)
    n_fade = ms(TAIL_FADE_MS)
    fade = take(pcm, t1, t1 + n_fade) * (0.5 + 0.5 * np.cos(np.pi * np.arange(n_fade) / n_fade))
    seg = np.concatenate([np.zeros(ms(LEAD_SILENCE_MS)), ramp, pcm[t0:t1], fade, np.zeros(ms(TAIL_SILENCE_MS))])

    gain = v["gain"]
    peak = float(np.max(np.abs(seg)))
    if peak * gain > 10 ** (PEAK_LIMIT_DB / 20):     # 核心之外还有更高的峰（极少见）
        gain = 10 ** (PEAK_LIMIT_DB / 20) / peak
        item.peak_limited = True
    seg = seg * gain
    item.rms_db = db(voiced_rms(pcm, t0, t1, v["th"], weighted) * gain)
    item.peak_db = db(peak * gain)
    item.duration_ms = int(round(seg.size * 1000 / SR))

    encode(ffmpeg, seg, dst)
    item.size = dst.stat().st_size


# ---------------------------------------------------------------------------
# 收集三个来源的 key
# ---------------------------------------------------------------------------
def teacher_keys() -> List[str]:
    """来源 A 需要下载的 216 个文件名（不含 .mp3）：包里的全部内容，含本包不用的 ma0–ma4、xi1–xi4。"""
    keys = list(INITIALS)
    for f in FINALS:
        keys += [f] + [f + t for t in TONES]
    for w in WHOLES:
        keys += [w + t for t in TONES]
    keys += ["ma0", "ma1", "ma2", "ma3", "ma4", "xi1", "xi2", "xi3", "xi4"]
    return sorted(keys)


def collect_teacher(teacher: Path, extra: Optional[Path], problems: List[str]) -> Dict[str, Item]:
    items: Dict[str, Item] = {}
    dirs = [d for d in (teacher, extra) if d is not None]

    def pick(key: str, group: str, want: Optional[str] = None, note: str = "") -> None:
        fname = (want or key) + ".mp3"
        for d in dirs:
            p = d / fname
            if p.is_file():
                items[key] = Item(key, p, group, "A", note)
                return
        problems.append(f"来源 A 缺少 {fname}（key {key}）")

    for k in INITIALS:
        pick(k, G_INITIAL)
    for f in FINALS:
        pick(f, G_FINAL)
        for t in TONES:
            pick(f + t, G_FINAL4)
    for w in WHOLES:
        pick(w, G_WHOLE, want=w + "1", note=f"由 {w}1 派生（整体认读音节表按一声呼读）")
        for t in TONES:
            pick(w + t, G_WHOLE4)

    # 包里多出来、本包不用的文件，提示一下
    known = {it.src.name for it in items.values()}
    unused = sorted(p.name for p in teacher.glob("*.mp3") if p.name not in known)
    if unused:
        problems.append(f"来源 A 有 {len(unused)} 个文件未使用（按规则忽略）：{' '.join(unused)}")
    return items


KEY_RE = re.compile(r"^([a-z]+)([1-4])\.mp3$")


def collect_syllables(syl_dir: Path, taken: Dict[str, Item], problems: List[str]) -> Dict[str, Item]:
    """来源 B：<key>.mp3，文件名就是 key；与 A 重合的以 A 为准。"""
    items: Dict[str, Item] = {}
    skipped_overlap = 0
    for p in sorted(syl_dir.glob("*.mp3")):
        m = KEY_RE.match(p.name)
        if not m:
            problems.append(f"来源 B 文件名不识别，已跳过：{p.name}")
            continue
        key = p.stem
        if key in taken:
            skipped_overlap += 1
            continue
        items[key] = Item(key, p, G_SYL, "B")
    print(f"来源 B：取用 {len(items)}，与 A 重合 {skipped_overlap}")
    return items


CMN_RE = re.compile(r"^cmn-([a-z]+)([1-5])\.mp3$")


def collect_cmn(cmn: Path, taken: Dict[str, Item], problems: List[str]) -> Dict[str, Item]:
    """来源 D：只补 A / B 都没有的 key。"""
    items: Dict[str, Item] = {}
    skipped_tone5 = skipped_nasal = skipped_overlap = 0
    for p in sorted(cmn.glob("*.mp3")):
        m = CMN_RE.match(p.name)
        if not m:
            if p.name.startswith("cmn-_"):
                skipped_nasal += 1
            else:
                problems.append(f"来源 D 文件名不识别，已跳过：{p.name}")
            continue
        syl, tone = m.group(1), m.group(2)
        if tone == "5":
            skipped_tone5 += 1
            continue
        # j/q/x/y 后的 ü 写 u（包里只有 jv4 一个例外拼法）
        if syl[0] in "jqxy" and "v" in syl:
            syl = syl.replace("v", "u")
        key = syl + tone
        if key in taken:
            skipped_overlap += 1
            continue
        if key in items:
            problems.append(f"来源 D 重复 key {key}：{items[key].src.name} 与 {p.name}，保留前者")
            continue
        items[key] = Item(key, p, G_SYL, "D", note="A / B 都没有，用 audio-cmn 补")
    print(f"来源 D：补缺 {len(items)}（{' '.join(sorted(items)) or '无'}），跳过轻声 {skipped_tone5}、鼻音节 {skipped_nasal}、已有 {skipped_overlap}")
    return items


def collect_overrides(overrides: Optional[Path], items: Dict[str, Item], problems: List[str]) -> int:
    """覆盖目录里的 <key>.mp3 替换同 key 的 A / B / D 文件；key 不存在的也接受（当作音节）。"""
    if overrides is None or not overrides.is_dir():
        return 0
    n = 0
    for p in sorted(overrides.glob("*.mp3")):
        key = p.stem
        if not re.fullmatch(r"[a-z]+[1-4]?", key):
            problems.append(f"覆盖目录文件名不合规，已跳过：{p.name}")
            continue
        old = items.get(key)
        group = old.group if old else G_SYL
        note = f"覆盖了来源 {old.origin} 的 {old.src.name}" if old else "覆盖目录新增"
        items[key] = Item(key, p, group, "O", note)
        n += 1
    return n


def load_words(path: Path = WORDS_TS) -> Dict[str, str]:
    """
    读 src/data/words.ts 里的词语表：每行「音节+声调 例字 词语 [词语]」（模板字符串里，空行 / 其它行跳过），
    第 n 个词语的 key = w-<音节><声调>-<n>（ü 写作 v，与 toKey 一致）。返回 key → 词语。
    """
    src = path.read_text(encoding="utf-8")
    m = re.search(r"const TABLE = `(.*?)`", src, re.S)
    if not m:
        sys.exit(f"读不到词语表：{path}")
    words: Dict[str, str] = {}
    for line in m.group(1).splitlines():
        parts = line.split()
        if len(parts) < 3 or not re.fullmatch(r"[a-zü]+[1-4]", parts[0]):
            continue
        key = parts[0].replace("ü", "v")
        for n, word in enumerate(parts[2:], 1):
            words[f"w-{key}-{n}"] = word
    return words


def synth_tts(texts: Dict[str, Tuple[str, str]], cache: Path, problems: List[str], jobs: int = TTS_JOBS) -> Dict[str, Item]:
    """
    edge-tts 合成到缓存目录（按 音色+语速+文本 的哈希命名，已有则复用；相同文本的不同 key 共用一个缓存文件），
    失败重试 3 次，jobs 路并行。texts：key → (文本, 分组)。
    """
    cache.mkdir(parents=True, exist_ok=True)
    items: Dict[str, Item] = {}
    todo: List[Tuple[str, str, str, Path]] = []
    for key, (text, group) in texts.items():
        digest = hashlib.sha1(f"{TTS_VOICE}|{TTS_RATE}|{text}".encode("utf-8")).hexdigest()[:12]
        p = cache / f"tts-{digest}.mp3"
        legacy = cache / f"{key}-{digest}.mp3"      # 旧版缓存按 key 命名
        if not p.is_file() and legacy.is_file() and legacy.stat().st_size > 0:
            p = legacy
        if p.is_file() and p.stat().st_size > 0:
            items[key] = Item(key, p, group, "C")
        else:
            todo.append((key, text, group, p))
    # 同一文本只合成一次
    by_path: Dict[Path, List[Tuple[str, str, str]]] = {}
    for key, text, group, p in todo:
        by_path.setdefault(p, []).append((key, text, group))

    def synth(p: Path, text: str) -> str:
        last = ""
        for attempt in range(1, 4):
            tmp = p.with_suffix(".part.mp3")
            cmd = [sys.executable, "-m", "edge_tts", "--voice", TTS_VOICE, f"--rate={TTS_RATE}",
                   "--text", text, "--write-media", str(tmp)]
            try:
                res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60, check=False)
                last = res.stderr.decode("utf-8", "replace").strip()[-300:]
                if res.returncode == 0 and tmp.is_file() and tmp.stat().st_size > 0:
                    os.replace(tmp, p)
                    return ""
            except subprocess.TimeoutExpired:
                last = "超时"
            tmp.unlink(missing_ok=True)
            time.sleep(2 * attempt)
        return last or "未知错误"

    if by_path:
        print(f"来源 C：合成 {len(by_path)} 条（{jobs} 并行）…")
        t0 = time.time()
        done = 0
        with ThreadPoolExecutor(max_workers=max(1, jobs)) as ex:
            futures = {ex.submit(synth, p, entries[0][1]): (p, entries) for p, entries in by_path.items()}
            for fut in futures:
                p, entries = futures[fut]
                err = fut.result()
                done += 1
                if done % 100 == 0 or done == len(by_path):
                    print(f"  合成 {done}/{len(by_path)}  {time.time() - t0:.0f}s")
                for key, text, group in entries:
                    if err:
                        problems.append(f"来源 C 合成失败 {key}「{text}」：{err}")
                    else:
                        items[key] = Item(key, p, group, "C")
    return items


def keep_existing_prompts(ffmpeg: str, out: Path, problems: List[str]) -> List[Item]:
    """
    --skip-prompts：不合成，但输出目录里已有的 p-*.mp3 / w-*.mp3 要保留下来并继续出现在 manifest / CREDITS 里。
    时长优先取旧 manifest 里的值，没有的（或旧 manifest 缺失）解码一次算出来。
    """
    old_ms: Dict[str, int] = {}
    mf = out / "manifest.json"
    if mf.is_file():
        try:
            old_ms = {k: int(v) for k, v in json.loads(mf.read_text(encoding="utf-8")).get("keys", {}).items()}
        except (ValueError, AttributeError, TypeError) as e:
            problems.append(f"旧 manifest.json 无法解析（{e}），引导语时长改为重新解码计算")
    kept: List[Item] = []
    for p in sorted([*out.glob("p-*.mp3"), *out.glob("w-*.mp3")]):
        it = Item(p.stem, p, G_PROMPT if p.name.startswith("p-") else G_WORD, "C", note="--skip-prompts 保留的已有文件")
        it.size = p.stat().st_size
        if p.stem in old_ms:
            it.duration_ms = old_ms[p.stem]
        else:
            try:
                it.duration_ms = int(round(decode(ffmpeg, p).size * 1000 / SR))
            except RuntimeError as e:
                problems.append(f"保留的 {p.name} 无法解码，已忽略：{e}")
                continue
        kept.append(it)
    return kept


# ---------------------------------------------------------------------------
# 输出：manifest / CREDITS / 试听页
# ---------------------------------------------------------------------------
def write_manifest(out: Path, items: List[Item]) -> None:
    data = {"version": 1, "keys": {it.key: it.duration_ms for it in sorted(items, key=lambda i: i.key)}}
    (out / "manifest.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_credits(out: Path, counts: Dict[str, int], items: List[Item]) -> None:
    by_origin: Dict[str, List[Item]] = {}
    for it in items:
        by_origin.setdefault(it.origin, []).append(it)
    n_b = len(by_origin.get("B", []))
    fill = by_origin.get("D", [])
    over = by_origin.get("O", [])
    fill_text = ""
    if fill:
        fill_text = f"""
## D. audio-cmn：补 A / B 都没有的生僻音节

- 内容：{len(fill)} 个 key：{' '.join(sorted(it.key for it in fill))}
- 作者：录音 Chen Wang（王琛）；项目整理 / 压缩 Hugo Lopez（PLIDAM, INALCO）；录音软件与技术支持 Nicolas Vion。
- 仓库：<https://github.com/hugolpz/audio-cmn>
- 许可：[CC-BY-SA-3.0](https://creativecommons.org/licenses/by-sa/3.0/)。这部分文件是其派生作品，依许可须以相同方式共享并保留署名。
"""
    over_text = ""
    if over:
        over_text = f"""
## O. 个别覆盖（audio-src/overrides）

- 内容：{len(over)} 个 key 用别的录音替换了上面来源里的版本（听感有问题时的个别修正）：{' '.join(sorted(it.key for it in over))}
- 许可：与其来源相同；来源不明的仅供个人 / 家庭学习使用。
"""
    text = f"""# 音频来源与许可

本目录的 mp3 由 `scripts/build-audio.py` 从下面几个来源统一处理（噪声自适应裁静音、响度归一到 -20 dBFS RMS、
24kHz 单声道 48kbps）生成，文件名即播放 key（ü 写作 v）。

## A. 教材配套「呼读音」真人录音

- 内容：声母 {counts.get(G_INITIAL, 0)}、韵母 {counts.get(G_FINAL, 0)}、韵母×四声 {counts.get(G_FINAL4, 0)}、整体认读音节×四声 {counts.get(G_WHOLE4, 0)}
  （不带调的整体认读音节 {counts.get(G_WHOLE, 0)} 个由对应一声文件派生），单一女声。
- 来源：du.hanyupinyin.cn（汉语拼音学习网）。
- 许可：**未明确**。仅供个人 / 家庭学习使用，请勿再分发或用于商业用途。

## B. 汉语拼音音节表录音：普通话全部音节×四声

- 内容：音节 {n_b} 个（与 A 重合的以 A 为准），主体为同一女声。
- 来源：yinjie.hanyupinyin.cn（汉语拼音学习网音节表，与 A 同一站群）。
- 许可：**未明确**。仅供个人 / 家庭学习使用，请勿再分发或用于商业用途。
{fill_text}
## C. 引导语（p-*.mp3）与例字词语（w-*.mp3）

- 内容：引导语 {counts.get(G_PROMPT, 0)} 条；例字词语 {counts.get(G_WORD, 0)} 条（高级测验答对后朗读，文本见 src/data/words.ts）。
- 来源：Microsoft Edge 神经语音合成（edge-tts，音色 zh-CN-XiaoyiNeural，语速 -10%）。
- 许可：合成语音，使用需遵守 Microsoft 相关服务条款。
{over_text}"""
    (out / "CREDITS.md").write_text(text, encoding="utf-8")


AUDITION_FIRST = (
    "b p m f d t n l zh ch sh r z c s y w a o e i u v er ong eng a1 a2 a3 a4 "
    "ba1 lv4 nve4 zhuang4 p-correct p-wrong"
).split()


def syllable_sort_key(key: str) -> Tuple[int, str, str]:
    """音节按 声母表顺序 → 韵母 → 声调 排序；零声母排最前。"""
    m = re.match(r"^([a-z]+?)([1-4])$", key)
    body, tone = (m.group(1), m.group(2)) if m else (key, "")
    for ini in sorted(INITIALS, key=len, reverse=True):
        if body.startswith(ini) and len(body) > len(ini):
            return (INITIALS.index(ini) + 1, body[len(ini):], tone)
    return (0, body, tone)


def write_audition(path: Path, out: Path, items: List[Item]) -> None:
    import html

    by_group: Dict[str, List[Item]] = {}
    for it in items:
        by_group.setdefault(it.group, []).append(it)
    order = list(ALL_GROUPS)
    by_key = {it.key: it for it in items}
    words = load_words() if WORDS_TS.is_file() else {}

    def btn(it: Item) -> str:
        title = f"{it.origin} · {it.duration_ms}ms · RMS {it.rms_db:.1f} dBFS · 峰 {it.peak_db:.1f}"
        if it.note:
            title += " · " + it.note
        cls = " lim" if it.peak_limited else ""
        return f'<button class="k{cls}" data-key="{html.escape(it.key)}" title="{html.escape(title)}">{html.escape(it.key)}</button>'

    sections = []
    first = [by_key[k] for k in AUDITION_FIRST if k in by_key]
    sections.append(f"<section><h2>建议先听（{len(first)}）</h2><div class=grid>{''.join(btn(i) for i in first)}</div></section>")
    for g in order:
        lst = by_group.get(g, [])
        if not lst:
            continue
        if g == G_SYL:
            lst = sorted(lst, key=lambda i: syllable_sort_key(i.key))
            parts: List[str] = []
            cur = None
            for it in lst:
                ini = syllable_sort_key(it.key)[0]
                if ini != cur:
                    if cur is not None:
                        parts.append("</div>")
                    cur = ini
                    parts.append(f"<h3>{'零声母' if ini == 0 else INITIALS[ini - 1]}</h3><div class=grid>")
                parts.append(btn(it))
            parts.append("</div>")
            body = "".join(parts)
        elif g in (G_PROMPT, G_WORD):
            texts = PROMPTS if g == G_PROMPT else words
            body = "<div class=grid>" + "".join(
                btn(it).replace("</button>", f' <small>{html.escape(texts.get(it.key, ""))}</small></button>') for it in lst
            ) + "</div>"
        else:
            body = "<div class=grid>" + "".join(btn(it) for it in lst) + "</div>"
        sections.append(f"<section><h2>{g}（{len(lst)}）</h2>{body}</section>")

    page = f"""<!doctype html>
<meta charset="utf-8">
<title>拼音音频包试听</title>
<style>
  body {{ font: 14px/1.5 -apple-system, "PingFang SC", sans-serif; margin: 20px; max-width: 1200px; }}
  h2 {{ margin: 24px 0 8px; }} h3 {{ margin: 12px 0 4px; font-size: 13px; color: #666; }}
  .grid {{ display: flex; flex-wrap: wrap; gap: 6px; }}
  .k {{ font: inherit; padding: 4px 10px; border: 1px solid #bbb; border-radius: 6px; background: #fff; cursor: pointer; }}
  .k:hover {{ background: #eef; }} .k.playing {{ background: #fd6; }} .k.lim {{ border-color: #e80; }}
  .k small {{ color: #888; }}
  #bar {{ position: sticky; top: 0; background: #fffc; padding: 8px 0; border-bottom: 1px solid #ddd; }}
</style>
<div id=bar>
  <b>拼音音频包试听</b> · 共 {len(items)} 个文件 · 目录 <code>{html.escape(str(out))}</code>
  · <label><input type=checkbox id=auto> 顺序连播</label> · 橙框 = 峰值限制过（RMS 低于 -20）· 鼠标悬停看时长 / 响度
  <audio id=a controls style="vertical-align:middle;height:28px"></audio>
</div>
{''.join(sections)}
<script>
  const a = document.getElementById('a'), dir = {json.dumps('file://' + str(out) + '/')};
  let cur = null;
  function play(b) {{
    if (cur) cur.classList.remove('playing');
    cur = b; b.classList.add('playing');
    a.src = dir + b.dataset.key + '.mp3'; a.play();
  }}
  document.querySelectorAll('button.k').forEach(b => b.addEventListener('click', () => play(b)));
  a.addEventListener('ended', () => {{
    if (!document.getElementById('auto').checked || !cur) return;
    const all = [...document.querySelectorAll('button.k')], i = all.indexOf(cur);
    if (i >= 0 && i + 1 < all.length) setTimeout(() => play(all[i + 1]), 250);
  }});
</script>
"""
    path.write_text(page, encoding="utf-8")


# ---------------------------------------------------------------------------
# 主流程
# ---------------------------------------------------------------------------
def main() -> int:
    ap = argparse.ArgumentParser(description="生成拼音学习机离线音频包", epilog=SOURCE_HELP,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--teacher", type=Path, help="来源 A 目录（呼读音真人包，必填）")
    ap.add_argument("--extra", type=Path, help="来源 A 可选补充目录（同名文件以 --teacher 为准）")
    ap.add_argument("--syllables", type=Path, help="来源 B 目录（音节表录音 <key>.mp3，必填）")
    ap.add_argument("--cmn", type=Path, help="来源 D 目录（audio-cmn/64k/syllabs，可选，只补 A / B 没有的 key）")
    ap.add_argument("--overrides", type=Path, default=DEFAULT_OVERRIDES,
                    help="覆盖目录：<key>.mp3 替换 A / B 里同 key 的录音（默认 audio-src/overrides，不存在则忽略）")
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT, help="输出目录（public/audio）")
    ap.add_argument("--skip-prompts", action="store_true",
                    help="不合成引导语与词语（离线时用；输出目录里已有的 p-*.mp3 / w-*.mp3 保留）")
    ap.add_argument("--list-teacher-keys", action="store_true", help="只打印来源 A 要下载的 216 个文件名后退出")
    ap.add_argument("--tts-cache", type=Path, default=DEFAULT_TTS_CACHE, help="edge-tts 原始输出缓存目录")
    ap.add_argument("--ffmpeg", help="ffmpeg 路径（默认 PATH → imageio_ffmpeg）")
    ap.add_argument("--jobs", type=int, default=os.cpu_count() or 4, help="并行处理数")
    ap.add_argument("--tts-jobs", type=int, default=TTS_JOBS, help="edge-tts 并行合成数")
    ap.add_argument("--prune", action="store_true", help="删除输出目录里不属于本包的 mp3")
    ap.add_argument("--audition", type=Path, help="生成本地试听页到该路径（不要放进项目）")
    ap.add_argument("--report", type=Path, help="把统计结果另存为 JSON")
    args = ap.parse_args()
    if args.list_teacher_keys:
        print("\n".join(teacher_keys()))
        return 0

    missing = [f"{name} 未指定" if d is None else f"{name} 目录不存在：{d}"
               for name, d in (("--teacher", args.teacher), ("--syllables", args.syllables)) if d is None or not d.is_dir()]
    for name, d in (("--extra", args.extra), ("--cmn", args.cmn)):
        if d is not None and not d.is_dir():
            missing.append(f"{name} 目录不存在：{d}")
    if missing:
        sys.exit("错误：" + "；".join(missing) + "\n" + SOURCE_HELP)
    ffmpeg = find_ffmpeg(args.ffmpeg)
    out: Path = args.out
    out.mkdir(parents=True, exist_ok=True)
    print(f"ffmpeg：{ffmpeg}\n输出：{out}")

    problems: List[str] = []
    items: Dict[str, Item] = collect_teacher(args.teacher, args.extra, problems)
    print(f"来源 A：取用 {len(items)}")
    items.update(collect_syllables(args.syllables, items, problems))
    if args.cmn is not None:
        items.update(collect_cmn(args.cmn, items, problems))
    n_over = collect_overrides(args.overrides, items, problems)
    if n_over:
        print(f"覆盖目录：替换 {n_over} 个 key（{args.overrides}）")
    words = load_words()
    kept: List[Item] = []       # --skip-prompts 时输出目录里原样保留的 p-*.mp3 / w-*.mp3
    if args.skip_prompts:
        kept = keep_existing_prompts(ffmpeg, out, problems)
        print(f"来源 C：已按 --skip-prompts 跳过合成，保留输出目录里已有的 {len(kept)} 条引导语 / 词语")
    else:
        texts: Dict[str, Tuple[str, str]] = {k: (t, G_PROMPT) for k, t in PROMPTS.items()}
        texts.update({k: (t, G_WORD) for k, t in words.items()})
        items.update(synth_tts(texts, args.tts_cache, problems, args.tts_jobs))

    todo = sorted(items.values(), key=lambda i: i.key)
    print(f"共 {len(todo)} 个 key，开始处理（{args.jobs} 并行）…")
    t0 = time.time()
    done = 0

    def work(it: Item) -> Item:
        try:
            process(ffmpeg, it, out / f"{it.key}.mp3")
        except Exception as e:  # noqa: BLE001
            it.error = str(e)
        return it

    with ThreadPoolExecutor(max_workers=max(1, args.jobs)) as ex:
        for it in ex.map(work, todo):
            done += 1
            if done % 200 == 0 or done == len(todo):
                print(f"  {done}/{len(todo)}  {time.time() - t0:.0f}s")

    ok = [it for it in todo if not it.error]
    failed = [it for it in todo if it.error]
    for it in failed:
        problems.append(f"处理失败 {it.key}（{it.src.name}）：{it.error}")

    listed = ok + kept          # 进 manifest / CREDITS / 试听页的全部条目
    write_manifest(out, listed)
    counts: Dict[str, int] = {}
    for it in listed:
        counts[it.group] = counts.get(it.group, 0) + 1
    write_credits(out, counts, listed)

    # 输出目录里多出来的 mp3
    keys = {it.key for it in listed}
    stale = sorted(p.name for p in out.glob("*.mp3") if p.stem not in keys)
    if stale:
        if args.prune:
            for name in stale:
                (out / name).unlink()
            print(f"已删除 {len(stale)} 个不属于本包的 mp3：{' '.join(stale)}")
        else:
            problems.append(f"输出目录有 {len(stale)} 个不属于本包的 mp3（--prune 可删）：{' '.join(stale)}")

    if args.audition:
        write_audition(args.audition, out, listed)
        print(f"试听页：{args.audition}")

    # ---- 统计 ----
    expected = {G_INITIAL: 23, G_FINAL: 24, G_FINAL4: 96, G_WHOLE: 16, G_WHOLE4: 64, G_PROMPT: len(PROMPTS), G_WORD: len(words)}
    print("\n== 统计 ==")
    for g in ALL_GROUPS:
        n = counts.get(g, 0)
        exp = expected.get(g)
        flag = "" if exp is None or n == exp else f"  ← 应为 {exp}"
        print(f"  {g}：{n}{flag}")
    total_bytes = sum(it.size for it in listed)
    print(f"  总文件数 {len(listed)}（本次处理 {len(ok)}，保留 {len(kept)}），总大小 {total_bytes / 1024 / 1024:.2f} MiB（{total_bytes} B）"
          + f"，manifest.json {(out / 'manifest.json').stat().st_size} B")
    if ok:
        durs = sorted(it.duration_ms for it in ok)
        rmss = [it.rms_db for it in ok]
        peaks = [it.peak_db for it in ok]
        limited = [it for it in ok if it.peak_limited]
        buckets = [(0, 500), (500, 800), (800, 1100), (1100, 1500), (1500, 3000), (3000, 10 ** 9)]
        hist = "  ".join(f"{lo}–{hi if hi < 10**9 else '∞'}ms: {sum(lo <= d < hi for d in durs)}" for lo, hi in buckets)
        print(f"  时长 ms：min {durs[0]}  中位 {int(statistics.median(durs))}  max {durs[-1]}   分布 {hist}")
        print(f"  有声段 RMS dBFS：min {min(rmss):.2f}  max {max(rmss):.2f}   峰值 dBFS：min {min(peaks):.2f}  max {max(peaks):.2f}")
        print(f"  峰值限制（RMS 未达 -20）：{len(limited)} 个" + (f"：{' '.join(i.key for i in limited)}" if limited else ""))
        floors = sorted(ok, key=lambda i: -i.floor_db)[:5]
        print("  底噪上沿最高 5 个：" + "  ".join(f"{i.key} {i.floor_db:.0f}dB" for i in floors))
        ths = sorted(ok, key=lambda i: -i.threshold_db)[:5]
        print("  起音阈值最高 5 个（源电平）：" + "  ".join(f"{i.key} {i.threshold_db:.0f}dB" for i in ths))
        trims = [it.trimmed_ms for it in ok]
        print(f"  去掉的源头 / 尾 ms：头 中位 {int(statistics.median(t[0] for t in trims))} max {max(t[0] for t in trims)}"
              f"，尾 中位 {int(statistics.median(t[1] for t in trims))} max {max(t[1] for t in trims)}")
        longest = sorted(ok, key=lambda i: -i.duration_ms)[:5]
        shortest = sorted(ok, key=lambda i: i.duration_ms)[:5]
        print("  最长 5 个：" + "  ".join(f"{i.key} {i.duration_ms}" for i in longest))
        print("  最短 5 个：" + "  ".join(f"{i.key} {i.duration_ms}" for i in shortest))
    if problems:
        print("\n== 缺失 / 异常 ==")
        for p in problems:
            print("  - " + p)
    else:
        print("\n无缺失 / 异常")

    if args.report:
        report = {
            "counts": counts, "total_files": len(ok), "total_bytes": total_bytes,
            "duration_ms": {"min": durs[0], "median": int(statistics.median(durs)), "max": durs[-1]} if ok else None,
            "rms_dbfs": {"min": round(min(rmss), 2), "max": round(max(rmss), 2)} if ok else None,
            "peak_limited": [it.key for it in ok if it.peak_limited],
            "problems": problems,
            "kept": [it.key for it in kept],
            "items": {it.key: {"src": str(it.src), "origin": it.origin, "group": it.group, "ms": it.duration_ms,
                               "rms": round(it.rms_db, 2), "peak": round(it.peak_db, 2),
                               "floor": round(it.floor_db, 1) if it.floor_db > -1e9 else None,
                               "threshold": round(it.threshold_db, 1), "connect": round(it.connect_db, 1),
                               "trimmed": it.trimmed_ms, "size": it.size, "note": it.note} for it in ok},
        }
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
