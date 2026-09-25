"""Lucky Pigeon scenario model, per venue.

Run:  python3 finance/model.py

Reads every venues/<slug>/finance-inputs.json (folders starting with "_" are skipped)
and writes:
  finance/comparison.md       side-by-side view of all venues
  finance/venues/<slug>.md    full results for one venue
  finance/scenarios.csv       every result, one row per venue x lineup x scenario x exit

Shared inputs (machines, resale, costs that don't depend on the venue) live in this file.
Venue inputs (deal terms, traffic, distance, space) live in the venue's JSON file and
override the defaults below. Every input carries a label: confirmed, quote, assumption or open.
Change inputs there or here, never in the generated files.
"""

import csv
import json
from pathlib import Path

HERE = Path(__file__).parent
ROOT = HERE.parent
VENUES_DIR = ROOT / "venues"
LABELS = {"confirmed", "quote", "assumption", "open"}

# ---------------------------------------------------------------------------
# Shared inputs: the same wherever the machines go. Each entry: (value, label, note)
# ---------------------------------------------------------------------------

SHARED = {
    "refund_rate": (0.02, "assumption", "Refunds and chargebacks, share of gross"),
    "cashless_fee": (0.06, "assumption", "Percent fee on cashless revenue (small-ticket rate); provider not chosen"),
    "entity_per_year": (150, "open", "Annual entity fees; entity type and state not decided"),
    "reader_fee_per_month": (12, "assumption", "Cashless reader service fee, per reader"),
    "mileage_rate": (0.70, "assumption", "Cost per mile driven for service visits"),
    "admin_per_month": (10, "assumption", "Bookkeeping / software"),
    "bill_acceptor_each": (400, "assumption", "$300 (brief) + $100 accessories/shipping"),
    "reader_each": (350, "assumption", "Cashless reader hardware"),
    "sales_tax": (0.07, "assumption", "On purchases; state not confirmed"),
    "entity_setup": (300, "open", "Formation cost; depends on entity and state"),
    "startup_supplies": (400, "assumption", "Spares kit, signs, locks, pricing cards"),
    "equipment_resale_rate": (0.40, "assumption", "Payment equipment sold at exit, share of cost"),
    "new_premium_price": (9_699, "quote", "New Pokemon Premium, pre-tax: Stern MSRP / dealer list price, 2026-09-25"),
    "pokemon_used_price": (9_100, "assumption", "Used Pokemon Premium: Pinside median asking, past year, via search results 2026-09-25; asking prices run above sale prices (44 listings)"),
    "pokemon_pro_price": (6_999, "quote", "New Pokemon Pro, pre-tax: dealer list price 2026-09-25 (owner's $7,500 is about this plus tax)"),
    "new_shipping": (400, "assumption", "Freight for a new machine"),
    "replacement_price": (7_000, "open", "Each purchased replacement, assumed bought used. Titles not chosen"),
    "used_shipping": (300, "assumption", "Pickup/delivery for a used machine"),
    "selling_cost_rate": (0.03, "assumption", "Listing/payment costs when selling a purchased machine"),
    "value_sw": (9_000, "assumption", "SW: Fall of the Empire Premium: Pinside median asking, past year, via search results 2026-09-25; asking prices run above sale prices ($8,999, 37 listings). Topper/upgrades not included"),
    "value_transformers": (4_900, "assumption", "Transformers LE: Pinside median asking, past year, via search results 2026-09-25; asking prices run above sale prices. Topper not included"),
    "value_dune": (13_400, "assumption", "Dune LE (Barrels of Fun): Pinside median asking, past year, via search results 2026-09-25; asking prices run above sale prices (66 listings). New price $11,599"),
    "value_metallica": (14_500, "assumption", "Metallica Remastered LE: Pinside median asking, past year, via search results 2026-09-25; asking prices run above sale prices. Guest game"),
    "value_bonjovi": (12_000, "open", "Bon Jovi LE: one used listing at $12,000; new LE $11,999. Guest game"),
    "rotation_month": (4, "assumption", "Guest games or replacements go in ~4 months after opening"),
    "setup_hours": (24, "assumption", "Team hours: install, payment setup, venue onboarding"),
    "rotation_hours": (8, "assumption", "Swap two machines"),
    "exit_hours": (12, "assumption", "Remove machines, sell purchased ones"),
    "loss_tolerance": (5_000, "assumption", "Working tolerance after exit (brief). Not a budget"),
}

# ---------------------------------------------------------------------------
# Venue inputs: defaults used when a venue file doesn't give a value.
# ---------------------------------------------------------------------------

VENUE_DEFAULTS = {
    "lp_share": (0.70, "assumption", "Lucky Pigeon share after fees, refunds, chargebacks (brief). Not agreed"),
    "rent_per_month": (0, "assumption", "Fixed rent to venue"),
    "venue_minimum_per_month": (0, "assumption", "Guaranteed monthly minimum to venue; Lucky Pigeon tops up any shortfall"),
    "electricity_per_month": (0, "open", "Paid by Lucky Pigeon; 0 means the venue covers it"),
    "insurance_per_year": (900, "open", "Liability + property; venue may require additional-insured status"),
    "license_per_machine_year": (50, "open", "Local amusement-device licensing; unknown if required"),
    "round_trip_miles": (12, "open", "Home to venue and back"),
    "visits_per_week": (2, "assumption", "Brief: about 2 visits/week"),
    "machine_slots": (4, "assumption", "Machines the space can hold"),
    "moving_per_machine": (150, "assumption", "Each move, per machine; stairs or tight doors raise it"),
    "cashless_share": (0.50, "assumption", "Share of gross paid cashless"),
    "games_per_machine_week": ({"weak": 25, "middle": 55, "strong": 110}, "assumption",
                               "Paid games per machine per week. Replace with venue traffic data"),
    "price_per_game": ({"weak": 0.67, "middle": 0.75, "strong": 0.85}, "assumption",
                       "Blended price per paid game ($1 single, 3 for $2)"),
}

# Scenario inputs that don't depend on the venue. All are assumptions.
SCENARIOS = {
    "weak": {
        "maintenance_per_machine_month": 68.75,   # brief's $200/4 machines, plus overruns
        "owner_hours_week": 8,
        "new_retention": {1: 0.75, 2: 0.67, 3: 0.60},  # resale / pre-tax price
        "used_retention_per_year": 0.88,
        "owned_wear_per_year": 0.07,              # extra value lost from public play
    },
    "middle": {
        "maintenance_per_machine_month": 50,      # brief: $200/month for four
        "owner_hours_week": 6,
        "new_retention": {1: 0.85, 2: 0.77, 3: 0.70},  # Pokemon asks ~91-94% of new after 7 months
        "used_retention_per_year": 0.93,
        "owned_wear_per_year": 0.04,
    },
    "strong": {
        "maintenance_per_machine_month": 56.25,   # more play, more parts
        "owner_hours_week": 7,
        "new_retention": {1: 0.92, 2: 0.85, 3: 0.79},
        "used_retention_per_year": 0.97,
        "owned_wear_per_year": 0.03,
    },
}

EXIT_YEARS = (1, 2, 3)
COMPARE_COLS = (("O", 1), ("O", 3), ("P", 1), ("P", 3), ("Pu", 1), ("Pp", 1))
POKEMON_LINEUPS = ("P", "Pu", "Pp")
WEEKS_PER_MONTH = 52 / 12


def sv(key):
    return SHARED[key][0]


# ---------------------------------------------------------------------------
# Lineups. Owned (confirmed): SW Premium, Transformers LE, Dune LE, Metallica Remastered LE,
# Bon Jovi LE. Pokemon Premium is not owned and would have to be bought.
# kind: owned | new | used ; months are [in, out); out=None means until exit.
# slot: machines in slots beyond the venue's machine_slots are left out.
# ---------------------------------------------------------------------------

def owned(name, key, slot, start=0, end=None):
    return {"name": name, "slot": slot, "kind": "owned", "value": sv(key), "in": start, "out": end}


def bought(name, kind, price_key, slot, start=0):
    return {"name": name, "slot": slot, "kind": kind, "value": sv(price_key), "in": start, "out": None}


def lineup(pokemon=None, rotate=None):
    """pokemon: None (all owned), "new", "used" or "pro" (new Pro). rotate: None, "G" (owned guest games) or "R" (buy two used)."""
    r = sv("rotation_month")
    machines = [owned("Star Wars Premium", "value_sw", 1)]
    if pokemon is None:
        machines += [
            owned("Transformers LE", "value_transformers", 2, end=r if rotate == "G" else None),
            owned("Dune LE", "value_dune", 3),
            owned("Metallica Remastered LE", "value_metallica", 4),
        ]
        if rotate == "G":
            machines.append(owned("Bon Jovi LE", "value_bonjovi", 2, start=r))
        return machines
    price_key, kind, label = {"new": ("new_premium_price", "new", "Pokemon Premium (new)"),
                              "used": ("pokemon_used_price", "used", "Pokemon Premium (used)"),
                              "pro": ("pokemon_pro_price", "new", "Pokemon Pro (new)")}[pokemon]
    temp_out = r if rotate else None
    machines += [
        bought(label, kind, price_key, 2),
        owned("Transformers LE", "value_transformers", 3, end=temp_out),
        owned("Dune LE", "value_dune", 4, end=temp_out),
    ]
    if rotate == "G":
        machines += [owned("Metallica Remastered LE", "value_metallica", 3, start=r),
                     owned("Bon Jovi LE", "value_bonjovi", 4, start=r)]
    if rotate == "R":
        machines += [bought(f"Replacement (slot {slot})", "used", "replacement_price", slot, start=r)
                     for slot in (3, 4)]
    return machines


LINEUPS = {
    "O":   ("All owned: SW, Transformers, Dune, Metallica", lineup()),
    "O+G": ("O, then Bon Jovi (owned) replaces Transformers after 4 months", lineup(rotate="G")),
    "P":   ("Proposal lineup: SW, Pokemon Premium bought new, Transformers, Dune", lineup("new")),
    "Pu":  ("P, but Pokemon Premium bought used", lineup("used")),
    "Pp":  ("P, but Pokemon Pro bought new instead of Premium", lineup("pro")),
    "P+G": ("P, then Metallica and Bon Jovi (owned) replace Transformers and Dune after 4 months",
            lineup("new", "G")),
    "P+R": ("P, then two purchased used machines replace Transformers and Dune after 4 months",
            lineup("new", "R")),
}


# ---------------------------------------------------------------------------
# Venues
# ---------------------------------------------------------------------------

def load_venues():
    venues = []
    for path in sorted(VENUES_DIR.glob("*/finance-inputs.json")):
        if path.parent.name.startswith("_"):
            continue
        data = json.loads(path.read_text())
        inputs = {}
        for key, default in VENUE_DEFAULTS.items():
            given = data.get("inputs", {}).get(key)
            if given is None:
                inputs[key] = (default[0], default[1], default[2] + " (model default)")
            else:
                if given["label"] not in LABELS:
                    raise ValueError(f"{path}: {key} has unknown label {given['label']!r}")
                inputs[key] = (given["value"], given["label"], given.get("note", ""))
        unknown = set(data.get("inputs", {})) - set(VENUE_DEFAULTS)
        if unknown:
            raise ValueError(f"{path}: unknown inputs {sorted(unknown)}")
        venues.append({"slug": path.parent.name, "name": data["name"], "status": data.get("status", ""),
                       "notes": data.get("notes", []), "inputs": inputs, "file": path.relative_to(ROOT)})
    return venues


# ---------------------------------------------------------------------------
# Model
# ---------------------------------------------------------------------------

def params(venue, sk):
    p = {k: val[0] for k, val in venue["inputs"].items()}
    p["games_per_machine_week"] = p["games_per_machine_week"][sk]
    p["price_per_game"] = p["price_per_game"][sk]
    p.update(SCENARIOS[sk])
    return p


def lp_net_per_game(p):
    pool = p["price_per_game"] * (1 - sv("refund_rate") - p["cashless_share"] * sv("cashless_fee"))
    return pool * p["lp_share"]


def monthly_fixed_costs(p):
    slots = p["machine_slots"]
    travel = p["visits_per_week"] * WEEKS_PER_MONTH * p["round_trip_miles"] * sv("mileage_rate")
    return (p["maintenance_per_machine_month"] * slots
            + p["insurance_per_year"] / 12
            + sv("entity_per_year") / 12
            + p["license_per_machine_year"] * slots / 12
            + sv("reader_fee_per_month") * slots
            + travel
            + sv("admin_per_month")
            + p["electricity_per_month"]
            + p["rent_per_month"])


def run(machines, p, exit_year, games_override=None):
    months = 12 * exit_year
    games_wk = p["games_per_machine_week"] if games_override is None else games_override
    tax = sv("sales_tax")
    slots = p["machine_slots"]
    move = p["moving_per_machine"]

    equipment = slots * (sv("bill_acceptor_each") + sv("reader_each")) * (1 + tax)
    new_cash = equipment + sv("entity_setup") + sv("startup_supplies")
    exit_costs = 0.0
    resale = equipment / (1 + tax) * sv("equipment_resale_rate")
    owned_value = 0.0
    wear = 0.0
    hours = sv("setup_hours") + sv("exit_hours")
    rotation_moves = 0.0

    for m in machines:
        if m["slot"] > slots:
            continue
        start, end = m["in"], (m["out"] if m["out"] is not None else months)
        if start >= months:
            continue
        end = min(end, months)
        years_on = (end - start) / 12
        if start > 0:
            hours += sv("rotation_hours") / 2
        if m["kind"] == "owned":
            if start > 0:
                rotation_moves += move                 # to venue at rotation
            else:
                new_cash += move                       # to venue at opening
            if m["out"] is not None and m["out"] < months:
                rotation_moves += move                 # home at rotation
            else:
                exit_costs += move                     # home at exit
            owned_value += m["value"]
            wear += m["value"] * p["owned_wear_per_year"] * years_on
        elif m["kind"] == "new":
            new_cash += m["value"] * (1 + tax) + sv("new_shipping")
            sale = m["value"] * p["new_retention"][exit_year]
            resale += sale * (1 - sv("selling_cost_rate"))
            exit_costs += move
        else:  # bought used
            new_cash += m["value"] * (1 + tax) + sv("used_shipping")
            sale = m["value"] * p["used_retention_per_year"] ** years_on
            resale += sale * (1 - sv("selling_cost_rate"))
            exit_costs += move

    games_month = games_wk * WEEKS_PER_MONTH * slots
    gross_month = games_month * p["price_per_game"]
    pool_month = gross_month * (1 - sv("refund_rate") - p["cashless_share"] * sv("cashless_fee"))
    venue_share_month = pool_month * (1 - p["lp_share"])
    top_up_month = max(0.0, p["venue_minimum_per_month"] - venue_share_month)

    lp_income = pool_month * p["lp_share"] * months
    op_costs = (monthly_fixed_costs(p) + top_up_month) * months + rotation_moves
    operating_cash = lp_income - op_costs
    hours += p["owner_hours_week"] * 52 * exit_year

    cash_result = -new_cash + operating_cash + resale - exit_costs
    return {
        "new_cash": new_cash,
        "owned_value": owned_value,
        "gross": gross_month * months,
        "venue_receives": (venue_share_month + top_up_month) * months + p["rent_per_month"] * months,
        "lp_income": lp_income,
        "op_costs": op_costs,
        "operating_cash": operating_cash,
        "resale": resale,
        "exit_costs": exit_costs,
        "cash_result": cash_result,
        "wear": wear,
        "result_incl_wear": cash_result - wear,
        "team_hours": hours,
    }


def games_needed(machines, p, exit_year, target, key="result_incl_wear"):
    """Games per machine per week at which `key` reaches target. Bisection: a venue minimum makes it non-linear."""
    f = lambda g: run(machines, p, exit_year, g)[key] - target
    lo, hi = 0.0, 5000.0
    if f(lo) >= 0:
        return 0.0
    if f(hi) < 0:
        return float("inf")
    for _ in range(60):
        mid = (lo + hi) / 2
        lo, hi = (mid, hi) if f(mid) < 0 else (lo, mid)
    return hi


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------

def money(x):
    sign = "−" if x < -0.5 else ""
    return f"{sign}${abs(x):,.0f}"


PERCENT_KEYS = {"lp_share", "cashless_share", "refund_rate", "cashless_fee", "sales_tax",
                "equipment_resale_rate", "selling_cost_rate"}
PLAIN_KEYS = {"round_trip_miles", "visits_per_week", "machine_slots", "games_per_machine_week",
              "rotation_month", "setup_hours", "rotation_hours", "exit_hours"}


def fmt_value(key, val):
    if isinstance(val, dict):
        return " / ".join(fmt_value(key, x) for x in val.values())
    if key in PERCENT_KEYS:
        return f"{val:.0%}"
    if key in PLAIN_KEYS:
        return f"{val:,}"
    return f"${val:,.2f}" if isinstance(val, float) and val < 10 else f"${val:,.0f}"


def table(headers, rows, align=None):
    align = align or ["---"] + ["---:"] * (len(headers) - 1)
    out = ["| " + " | ".join(headers) + " |", "|" + "|".join(align) + "|"]
    out += ["| " + " | ".join(str(c) for c in r) + " |" for r in rows]
    return "\n".join(out)


def per_day(g_week):
    return "never" if g_week == float("inf") else f"{g_week / 7:.1f}"


def flag(x, tol):
    return money(x) + (" ⚠" if x < -tol else "")


def venue_report(venue, results):
    tol = sv("loss_tolerance")
    lines = []
    w = lines.append
    w(f"# {venue['name']}: scenario results")
    w("")
    w(f"_Generated by `finance/model.py` from `{venue['file']}`. Do not edit by hand._")
    w("")
    if venue["status"]:
        w(f"**Status:** {venue['status']}")
        w("")
    open_count = sum(1 for val in venue["inputs"].values() if val[1] == "open")
    confirmed = sum(1 for val in venue["inputs"].values() if val[1] in ("confirmed", "quote"))
    w(f"**Venue inputs:** {confirmed} confirmed or quoted, {open_count} open, "
      f"{len(venue['inputs']) - confirmed - open_count} assumed. Treat results as placeholders until "
      "the deal terms and play volume are confirmed.")
    w("")
    for n in venue["notes"]:
        w(f"- {n}")
    if venue["notes"]:
        w("")

    w("## Result including wear on owned machines")
    w("")
    w("Cash result (−new cash + operating cash + net resale − exit costs) minus value lost on owned "
      f"machines. ⚠ = worse than the {money(-tol)} working loss tolerance.")
    w("")
    hdr = ["Lineup"] + [f"{sk} {y}y" for sk in SCENARIOS for y in EXIT_YEARS]
    for key, title in (("result_incl_wear", None), ("cash_result", "## Cash result only (excludes wear)")):
        if title:
            w(title)
            w("")
        rows = []
        for lk, (desc, _) in LINEUPS.items():
            row = [f"**{lk}** {desc}"]
            for sk in SCENARIOS:
                for y in EXIT_YEARS:
                    row.append(flag(results[(venue["slug"], lk, sk, y)][key], tol))
            rows.append(row)
        w(table(hdr, rows))
        w("")

    p = params(venue, "middle")
    fixed = monthly_fixed_costs(p)
    w("## Break-even play (middle-scenario prices, costs and resale)")
    w("")
    w(f"Lucky Pigeon nets about ${lp_net_per_game(p):.2f} per paid game at a ${p['price_per_game']:.2f} blended "
      f"price. Monthly operating costs: {money(fixed)} for {p['machine_slots']} machines"
      + (f", plus any shortfall against the {money(p['venue_minimum_per_month'])} venue minimum"
         if p["venue_minimum_per_month"] else "") + ".")
    w("")
    ops = games_needed(LINEUPS["O"][1], p, 1, 0, key="operating_cash")
    w(f"- Covering operating costs only takes **{per_day(ops)} games per machine per day**. "
      f"This venue's scenarios assume " + ", ".join(
          f"{sk} {params(venue, sk)['games_per_machine_week'] / 7:.1f}" for sk in SCENARIOS) + ".")
    w("")
    hdr2 = ["Lineup"] + [f"Break even, {y}y" for y in EXIT_YEARS] + [f"Lose {money(tol)}, {y}y" for y in EXIT_YEARS]
    rows = []
    for lk, (_, machines) in LINEUPS.items():
        rows.append([f"**{lk}**"] + [per_day(games_needed(machines, p, y, t)) for t in (0, -tol) for y in EXIT_YEARS])
    w(table(hdr2, rows))
    w("")
    w("Games per machine per day, results including wear.")
    w("")

    w("## What Pokémon has to bring in")
    w("")
    base = p["games_per_machine_week"] / 7 * p["machine_slots"]
    w("The model gives every lineup the same play. If Pokémon draws families who would not otherwise play, "
      "the Pokémon lineups earn more. This is the extra play needed for each Pokémon lineup to end up level "
      f"with the all-owned lineup (O), in the middle scenario, including wear. Middle play here is {base:.0f} paid "
      "games a day across the whole venue.")
    w("")
    hdr4 = ["Lineup"] + [f"{y}y exit" for y in EXIT_YEARS]
    rows = []
    for lk in POKEMON_LINEUPS:
        row = [f"**{lk}** {LINEUPS[lk][0]}"]
        for y in EXIT_YEARS:
            gap = results[(venue["slug"], "O", "middle", y)]["result_incl_wear"] - \
                results[(venue["slug"], lk, "middle", y)]["result_incl_wear"]
            extra = gap / (lp_net_per_game(p) * 365 * y)
            row.append(f"+{extra:.1f} games/day (+{extra / base:.0%})")
        rows.append(row)
    w(table(hdr4, rows))
    w("")
    w("Extra paid games per day across the venue, on any machine. The uplift is a test to measure in the pilot, "
      "not an assumption built into the results above.")
    w("")

    w("## Detail")
    w("")
    for lk, (desc, machines) in LINEUPS.items():
        w(f"### {lk}: {desc}")
        w("")
        w("Machines: " + "; ".join(
            f"{m['name']} ({m['kind']}" + (f", from month {m['in']}" if m["in"] else "")
            + (f", until month {m['out']}" if m["out"] is not None else "") + ")"
            for m in machines if m["slot"] <= p["machine_slots"]))
        w("")
        hdr3 = ["Scenario", "Exit", "New cash", "Owned value placed", "Gross play", "Venue receives",
                "Operating cash", "Net resale", "Exit costs", "Cash result", "Owned-machine wear",
                "Result incl. wear", "Team hours"]
        rows = []
        for sk in SCENARIOS:
            for y in EXIT_YEARS:
                r = results[(venue["slug"], lk, sk, y)]
                rows.append([sk, f"{y}y", money(-r["new_cash"]), money(r["owned_value"]), money(r["gross"]),
                             money(r["venue_receives"]), money(r["operating_cash"]), money(r["resale"]),
                             money(-r["exit_costs"]), money(r["cash_result"]), money(-r["wear"]),
                             flag(r["result_incl_wear"], tol), f"{r['team_hours']:,.0f}"])
        w(table(hdr3, rows, ["---", "---"] + ["---:"] * 11))
        w("")

    w("## Venue inputs")
    w("")
    rows = [[f"`{k}`", fmt_value(k, val), f"**{label}**", note] for k, (val, label, note) in venue["inputs"].items()]
    w(table(["Input", "Value (weak / middle / strong where given)", "Label", "Note"], rows,
            ["---", "---:", "---", "---"]))
    w("")
    w("Shared inputs (machines, resale, equipment, scenario settings) are listed in `finance/comparison.md`.")
    w("")
    return "\n".join(lines) + "\n"


def comparison_report(venues, results):
    tol = sv("loss_tolerance")
    lines = []
    w = lines.append
    w("# Venue comparison")
    w("")
    w("_Generated by `finance/model.py`. Do not edit by hand. Add a venue by copying "
      "`venues/_template/finance-inputs.json` into `venues/<venue>/` and rerunning._")
    w("")
    w("**Every number here is an assumption or a placeholder** until the venue's terms and play volume are "
      "confirmed. The comparison shows which venue facts matter most, not which venue will win.")
    w("")

    w("## Side by side: middle scenario")
    w("")
    hdr = ["Venue", "Inputs open / confirmed", "Split (LP)", "Rent + minimum /mo", "Operating costs /mo",
           "Ops break-even (games/machine/day)", "Assumed play (middle)",
           ] + [f"{lk}, {y}y" for lk, y in COMPARE_COLS]
    rows = []
    for v in venues:
        p = params(v, "middle")
        inp = v["inputs"]
        n_open = sum(1 for val in inp.values() if val[1] == "open")
        n_conf = sum(1 for val in inp.values() if val[1] in ("confirmed", "quote"))
        ops = games_needed(LINEUPS["O"][1], p, 1, 0, key="operating_cash")
        rows.append([f"[{v['name']}](venues/{v['slug']}.md)", f"{n_open} / {n_conf}", f"{p['lp_share']:.0%}",
                     f"{money(p['rent_per_month'])} + {money(p['venue_minimum_per_month'])}",
                     money(monthly_fixed_costs(p)), per_day(ops), f"{p['games_per_machine_week'] / 7:.1f}"]
                    + [flag(results[(v["slug"], lk, "middle", y)]["result_incl_wear"], tol)
                       for lk, y in COMPARE_COLS])
    w(table(hdr, rows))
    w("")
    w("Results include wear on owned machines. O = all four machines from the collection; P = proposal lineup "
      "with Pokémon Premium bought new; Pu = Pokémon Premium bought used; Pp = Pokémon Pro bought new. "
      "See each venue's page for every lineup, scenario and exit year.")
    w("")

    w("## What to collect from every venue")
    w("")
    w("These are the venue inputs, in rough order of effect on the result:")
    w("")
    w("1. **Play volume**: hourly traffic, dwell time, age mix and hours for minors. Sets `games_per_machine_week`.")
    w("2. **Terms**: split, any rent or monthly minimum, who pays electricity. Any rent or minimum raises break-even play for every lineup.")
    w("3. **Space**: how many machines fit (`machine_slots`), power, delivery access (`moving_per_machine`).")
    w("4. **Insurance**: requirements such as additional-insured status (`insurance_per_year`).")
    w("5. **Local rules**: amusement-device licensing (`license_per_machine_year`).")
    w("6. **Distance**: round trip from home (`round_trip_miles`).")
    w("7. **Price mix**: a family crowd buying 3 for $2 pulls `price_per_game` toward $0.67.")
    w("")

    w("## Shared inputs (same for every venue)")
    w("")
    w("### Scenario settings (all **assumption**)")
    w("")
    hdr = ["Input"] + list(SCENARIOS)
    rows = [
        ["Maintenance per machine per month"] + [money(s["maintenance_per_machine_month"]) for s in SCENARIOS.values()],
        ["Team hours per week (Ibrahim + Amy)"] + [str(s["owner_hours_week"]) for s in SCENARIOS.values()],
        ["New machine resale / pre-tax price, 1/2/3y"] + ["/".join(f"{x:.0%}" for x in s["new_retention"].values()) for s in SCENARIOS.values()],
        ["Used machine value kept per year"] + [f"{s['used_retention_per_year']:.0%}" for s in SCENARIOS.values()],
        ["Extra wear on owned machines per year"] + [f"{s['owned_wear_per_year']:.0%}" for s in SCENARIOS.values()],
    ]
    w(table(hdr, rows))
    w("")
    w("### Other shared inputs")
    w("")
    rows = [[f"`{k}`", fmt_value(k, val), f"**{label}**", note] for k, (val, label, note) in SHARED.items()]
    w(table(["Input", "Value", "Label", "Note"], rows, ["---", "---:", "---", "---"]))
    w("")
    w("## Not modeled")
    w("")
    w("- Novelty spikes, seasonality and events. Play is flat month to month.")
    w("- Guest games are modeled as one swap at month 4. Repeated short runs would add a move and a few team hours per swap.")
    w("- Income tax, depreciation deductions, and the cost of capital tied up in machines.")
    w("- Theft, vandalism or a major failure beyond the maintenance allowance.")
    w("- Keeping purchased machines at exit instead of selling them (collection value, not cash).")
    w("- Team time (Ibrahim and Amy) is counted in hours, not split between them, and not given a dollar value.")
    w("")
    return "\n".join(lines) + "\n"


def main():
    venues = load_venues()
    if not venues:
        raise SystemExit("No venues found. Copy venues/_template/finance-inputs.json into venues/<venue>/.")

    results = {}
    for v in venues:
        for sk in SCENARIOS:
            p = params(v, sk)
            for lk, (_, machines) in LINEUPS.items():
                for y in EXIT_YEARS:
                    results[(v["slug"], lk, sk, y)] = run(machines, p, y)

    out_dir = HERE / "venues"
    out_dir.mkdir(exist_ok=True)
    for v in venues:
        (out_dir / f"{v['slug']}.md").write_text(venue_report(v, results))
    (HERE / "comparison.md").write_text(comparison_report(venues, results))

    with open(HERE / "scenarios.csv", "w", newline="") as f:
        cols = ["new_cash", "owned_value", "gross", "venue_receives", "lp_income", "op_costs", "operating_cash",
                "resale", "exit_costs", "cash_result", "wear", "result_incl_wear", "team_hours"]
        wr = csv.writer(f)
        wr.writerow(["venue", "lineup", "scenario", "exit_years"] + cols)
        for (slug, lk, sk, y), r in results.items():
            wr.writerow([slug, lk, sk, y] + [round(r[c]) for c in cols])


if __name__ == "__main__":
    main()
