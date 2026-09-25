# Finance

_Last updated: 2026-09-25_

| File | What it is |
|---|---|
| `model.py` | The scenario model. All inputs live at the top, each labeled confirmed / quote / assumption / open |
| `scenarios.md` | Generated results: summaries, break-even play, detail per lineup, full input list |
| `scenarios.csv` | Same results, one row per lineup × scenario × exit year |

Regenerate after changing any input:

```
python3 finance/model.py
```

## Structure

- **Scenarios:** weak, middle and strong. Each varies play, price mix, maintenance, resale values and wear on owned machines together. The middle scenario uses a $0.75 blended price, not the $1 upper bound.
- **Exits:** after 1, 2 and 3 years.
- **Lineups:** A = all four machines already owned; B = buy Pokémon new; C = buy Star Wars (with upgrades) and Pokémon new. `+R` adds two used replacements in March 2027. The lineups exist because whether Star Wars and Pokémon are already owned is still **open**.
- **Kept separate:** new cash spent, market value of owned machines placed, operating cash, owner hours, net resale proceeds, exit costs, and wear on owned machines (a real cost, but not cash).

## What the placeholder numbers suggest

These are not forecasts. No input is confirmed yet.

1. **Operating break-even is about 7 paid games per machine per day** (about $435/month in costs at about $0.50 net per game). The middle scenario (7.9/day) only just clears it, so operating cash stays near zero. Whether the pilot works depends on play volume, which is unmeasured.
2. **Buying machines is what breaks the $5,000 tolerance.** Only lineup A stays within it in the middle case, and only on a cash basis. Each new Premium adds roughly $3,000–$4,000 of loss (the gap between purchase and resale) at a one-year exit.
3. **The March 2027 rotation makes the middle case about $2,500–$4,700 worse**, depending on the exit year and whether wear is counted. It also adds about $15,600 of new cash before any data on how the venue performs.
4. **Wear on owned machines matters in lineup A.** At 4% a year on $36,000 of machines, it's about $1,400 a year, roughly three times the middle-case operating surplus (about $480 a year).
5. **Owner time is about 350 hours a year** in the middle case.

## Fill these in first (largest effect on results)

1. Whether Star Wars and Pokémon are already owned (decides the lineup).
2. Venue terms: split, and whether there's any rent or minimum payment.
3. Real play data: the venue's hourly traffic, or earnings reports from comparable locations.
4. Purchase quotes and current resale listings for anything to be bought.
5. An insurance quote.
