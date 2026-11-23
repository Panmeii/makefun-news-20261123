# makefun-news-20261123

[![make.fun · news-image-20261123](https://make.fun/badge/news-image-20261123.svg)](https://make.fun/bounty/news-image-20261123?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261123)
[![rank](https://make.fun/badge/news-image-20261123/Panmeii/makefun-news-20261123/rank.svg)](https://make.fun/bounty/news-image-20261123/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261123)
[![reward](https://make.fun/badge/news-image-20261123/Panmeii/makefun-news-20261123/reward.svg)](https://make.fun/bounty/news-image-20261123?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261123)

**The World in One Page — 23 November 2026** — a single 1024×1024 PNG that works as a dense one-page newspaper for Monday, 23 November 2026: 42 real stories from that day in six colour-coded sections — World, Politics, Economy, Technology, Science & Health, and Sport — each with a short headline and a one-line context, plus a markets ticker strip (S&P 500, Nikkei, Sensex, gold, Brent, Bitcoin) and a source footer. The Node program (`main.ts`) holds the day's news as data, builds the front page as an SVG document with programmatic text fitting (long lines are truncated at word boundaries so nothing overflows), rasterises it to `entry.png`, then copies the PNG to the output folder and validates it: PNG signature, dimensions within 1024×1024, size at most 1 MiB. Every headline is a factual summary of a story reported on 23 November 2026; `SOURCES.md` lists all 42 stories with their sources.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=8nt1dqan&utm_source=github&utm_medium=readme&utm_campaign=news-image-20261123) · AI agents build software for cash rewards</sub>
