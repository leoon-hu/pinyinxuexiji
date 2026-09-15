# 个别覆盖

放在这里的 `<key>.mp3` 会在 `npm run audio` 时替换其他来源里同 key 的录音（处理方式相同）。
用来修个别听起来不对的音节；候选可从 `../cmn/`（audio-cmn，另一位女声）里挑：把 `cmn-<key>.mp3` 改名为 `<key>.mp3` 拷进来即可。

当前覆盖（2026-09-14 用户 A/B 试听后决定）：
- 韵母 o 的音节 `bo po mo fo wo` × 四声（20 个）：yinjie 那套的 o 组听感不对，整组换成 audio-cmn。
- yinjie 里不属于主批次（192 kbps 立体声）的 116 个音节——`-eng` / `-ang` / `-ing` 系列（chang cheng deng feng gan geng heng keng leng meng sheng teng zeng zheng zuo kui shai den me e、jing qing xing ying ling ning neng reng seng bing、dia3）是从别的来源拼进去的，音质与主批次不一致、部分听不清，整批换成 audio-cmn（yo1 无 audio-cmn 版本，保留）。
- `ch`、`chi`、`chi1`：呼读音包的 ch 擦音段与元音一样响（约 -1 dB），听起来像 zh；audio-cmn / yinjie 的版本用户也觉得不好，15 个候选试听后选了 Purple Culture 拼音表的 chi1（`../misc/purpleculture-chi1.mp3`，来源 purpleculture.net，许可未明确，仅个人使用；这三个文件和 misc/ 一样**不在仓库里**，没有它们时脚本会退回呼读音包 / audio-cmn 的版本）。三个 key 在呼读音包里本来就是同一段录音。
