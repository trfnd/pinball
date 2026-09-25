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
- **Lineups** (all confirmed owned except Pokémon): O = all four from the collection (Star Wars, Transformers, Dune, Metallica); O+G = Bon Jovi replaces Transformers after 4 months; P = the proposal lineup with Pokémon Premium bought new; Pu = the same with Pokémon bought used; P+G = Metallica and Bon Jovi replace Transformers and Dune after 4 months; P+R = two purchased used machines replace them instead. If a venue has fewer than four slots, the last machines are dropped.
- **Kept separate:** new cash spent, market value of owned machines placed, operating cash, what the venue receives, net resale proceeds, exit costs, team hours (Ibrahim + Amy), and wear on owned machines (a real cost, but not cash).
- **Venue minimum:** if a venue wants a guaranteed monthly amount, Lucky Pigeon pays any shortfall between that and the venue's share.

## What the placeholder numbers suggest

These are not forecasts. Machine ownership is confirmed. Machine values, prices, venue terms and play volume are not. Figures are for Westfield, which currently uses only default venue inputs.

1. **Operating break-even is about 7 paid games per machine per day** (about $435/month in costs at about $0.50 net per game). The middle scenario (7.9/day) only just clears it. Whether a venue works depends on play volume, which is unmeasured.
2. **Buying Pokémon is what breaks the $5,000 tolerance.** In the middle case, the all-owned lineup (O) loses about $2,500–$3,400 in cash. Buying Pokémon new (P) makes that about $6,800–$7,200, and buying it used (Pu) about $5,000. Counting wear on owned machines makes each case about $1,000–$1,500 a year worse.
3. **Rent or a monthly minimum hurts quickly.** In a test, $50 rent plus a $150 minimum on three machines raised operating break-even from 7.2 to 9.2 games per machine per day.
4. **Rotating with owned guest games costs far less than buying replacements.** In the middle case, guest games cost about $350–$1,200 (extra moves plus wear) versus $2,500–$4,700 and about $15,600 of new cash for purchased replacements. The model doesn't count any extra play from fresh games.
5. **Wear on owned machines** (4% a year in the middle case) is about $1,500 a year on the all-owned lineup. That's roughly three times the middle-case operating surplus.

## Fill these in first

- **Shared:** market values of the owned machines, Pokémon Premium quotes (new and used) and resale listings, an insurance quote, and how much wear on collection machines is acceptable.
- **Per venue:** play volume (traffic data), terms (split, rent, minimum), and machine slots.
