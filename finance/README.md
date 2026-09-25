# Finance

_Last updated: 2026-09-25_

One model, run separately for each venue. Shared inputs cover things that don't depend on the venue: machines, resale values, equipment and maintenance. Each venue has its own inputs file for things that do: terms, traffic, space and distance.

| File | What it is |
|---|---|
| `model.py` | The model, plus the shared inputs, each labeled confirmed / quote / assumption / open |
| `../venues/<venue>/finance-inputs.json` | One venue's inputs: split, rent or minimum, electricity, insurance, licensing, distance, machine slots, moving, payment mix, play volume, price mix |
| `../venues/_template/finance-inputs.json` | Blank copy for a new venue |
| `comparison.md` | Generated: all venues side by side (middle scenario), what to collect from every venue, shared inputs |
| `venues/<venue>.md` | Generated: one venue's full results (every lineup, scenario and exit year, break-even play, inputs) |
| `scenarios.csv` | Generated: every result, one row per venue × lineup × scenario × exit year |

## Adding or updating a venue

1. Copy `venues/_template/finance-inputs.json` to `venues/<venue-slug>/finance-inputs.json`.
2. Fill in what you know. Relabel each input as it firms up: open → assumption → quote/confirmed. Record a proposal as an assumption, never as confirmed.
3. Run `python3 finance/model.py`.

## Structure

- **Scenarios:** weak, middle and strong. Play volume and price mix come from the venue file. Maintenance, resale values, wear on owned machines and team hours are shared.
- **Exits:** after 1, 2 and 3 years.
- **Lineups:** A = all four machines already owned; B = buy Pokémon Premium new; C = buy Star Wars (with upgrades) and Pokémon Premium new. `+G` swaps Transformers and Dune LE for owned guest games (Metallica Remastered LE, Bon Jovi LE) after 4 months. `+R` buys two used replacements instead. The lineups exist because whether Star Wars and Pokémon are already owned is still **open**. If a venue has fewer than four slots, the last machines are dropped.
- **Kept separate:** new cash spent, market value of owned machines placed, operating cash, what the venue receives, net resale proceeds, exit costs, team hours (Ibrahim + Amy), and wear on owned machines (a real cost, but not cash).
- **Venue minimum:** if a venue wants a guaranteed monthly amount, Lucky Pigeon pays any shortfall between that and the venue's share.

## What the placeholder numbers suggest

These are not forecasts. No input is confirmed yet. Figures are for Westfield, which currently uses only default inputs.

1. **Operating break-even is about 7 paid games per machine per day** (about $435/month in costs at about $0.50 net per game). The middle scenario (7.9/day) only just clears it. Whether a venue works depends on play volume, which is unmeasured.
2. **Buying machines is what breaks the $5,000 tolerance.** In the middle case only lineup A stays within it, and only on a cash basis. Each new Premium adds roughly $3,000–$4,000 of loss at a one-year exit.
3. **Rent or a monthly minimum hurts quickly.** In a test, $50 rent plus a $150 minimum on three machines raised operating break-even from 7.2 to 9.2 games per machine per day.
4. **Rotating with owned guest games costs far less than buying replacements.** In the middle case, `+G` costs about $750–$1,200 (extra moves plus wear on the LEs) versus $2,500–$4,700 and about $15,600 of new cash for `+R`. The model doesn't count any extra play from fresh games.
5. **Wear on owned machines** is about $1,400 a year in lineup A. That's roughly three times the middle-case operating surplus.

## Fill these in first

- **Shared:** whether Star Wars and Pokémon are already owned, purchase quotes and resale listings, and an insurance quote.
- **Per venue:** play volume (traffic data), terms (split, rent, minimum), and machine slots.
