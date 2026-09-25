"""Lucky Pigeon scenario model.

Run:  python3 finance/model.py
Writes finance/scenarios.md and finance/scenarios.csv.

Every input carries a label: confirmed, quote, assumption or open.
Change inputs here, never in the generated files.
"""

import csv
from pathlib import Path

HERE = Path(__file__).parent

# ---------------------------------------------------------------------------
# Inputs. Each entry: (value, label, note)
# ---------------------------------------------------------------------------

INPUTS = {
    # Deal and pricing
    "lp_share": (0.70, "assumption", "Lucky Pigeon share after fees, refunds, chargebacks (brief). Not agreed."),
    "refund_rate": (0.02, "assumption", "Refunds and chargebacks, share of gross"),
    "cashless_share": (0.50, "assumption", "Share of gross paid cashless"),
    "cashless_fee": (0.06, "assumption", "Percent fee on cashless revenue (small-ticket rate); provider not chosen"),
    # Fixed monthly operating costs (Lucky Pigeon)
    "insurance_per_year": (900, "open", "Liability + property for machines on location. Needs a quote"),
    "entity_per_year": (150, "open", "Annual entity fees; entity type and state not decided"),
    "license_per_machine_year": (50, "open", "Local amusement-device licensing; unknown if required"),
    "reader_fee_per_month": (12, "assumption", "Cashless reader service fee, per reader"),
    "travel_per_month": (73, "assumption", "2 visits/wk x 12 mi round trip x $0.70/mi; distance open"),
    "admin_per_month": (10, "assumption", "Bookkeeping / software"),
    "electricity_per_month": (0, "open", "Assumed paid by venue; not agreed"),
    # Setup
    "bill_acceptor_each": (400, "assumption", "$300 (brief) + $100 accessories/shipping"),
    "reader_each": (350, "assumption", "Cashless reader hardware"),
    "sales_tax": (0.07, "assumption", "On purchases; state not confirmed"),
    "moving_per_machine": (150, "assumption", "Each move, per machine (trailer/helpers)"),
    "entity_setup": (300, "open", "Formation cost; depends on entity and state"),
    "startup_supplies": (400, "assumption", "Spares kit, signs, locks, pricing cards"),
    "equipment_resale_rate": (0.40, "assumption", "Payment equipment sold at exit, share of cost"),
    # Machines: purchase
    "new_premium_price": (10_500, "open", "New Stern Premium, pre-tax. Needs a distributor quote"),
    "new_shipping": (400, "assumption", "Freight for a new machine"),
    "sw_upgrades_cost": (1_500, "assumption", "Topper + LE-level upgrades, only if SW is bought for this venture"),
    "upgrade_recovery": (0.30, "assumption", "Share of upgrade cost recovered at resale"),
    "replacement_price": (7_000, "open", "Each Feb/Mar 2027 replacement, assumed bought used. Titles not chosen"),
    "replacement_shipping": (300, "assumption", "Pickup/delivery for a used machine"),
    "selling_cost_rate": (0.03, "assumption", "Listing/payment costs when selling a purchased machine"),
    # Machines: owned (market value, not cash)
    "value_sw": (10_000, "open", "Star Wars: Fall of the Empire Premium with topper/upgrades, if owned"),
    "value_pokemon": (9_500, "open", "Pokemon Premium, if owned"),
    "value_transformers": (8_500, "open", "Transformers LE with topper (confirmed owned)"),
    "value_dune": (8_000, "open", "Dune (confirmed owned)"),
    # Timing and owner time
    "rotation_month": (4, "assumption", "Replacements go in ~March 2027 if opening is Dec 2026 (not set)"),
    "setup_hours": (24, "assumption", "Install, payment setup, venue onboarding"),
    "rotation_hours": (8, "assumption", "Swap two machines"),
    "exit_hours": (12, "assumption", "Remove machines, sell purchased ones"),
    "loss_tolerance": (5_000, "assumption", "Working tolerance after exit (brief). Not a budget"),
}

# Scenario inputs vary only play, wear and resale. All are assumptions.
SCENARIOS = {
    "weak": {
        "games_per_machine_week": 25,   # about 3.6/day
        "price_per_game": 0.67,         # nearly everyone buys 3 for $2
        "maintenance_per_month": 275,   # brief's $200 plus overruns
        "owner_hours_week": 8,
        "new_retention": {1: 0.70, 2: 0.62, 3: 0.55},  # resale / pre-tax price
        "used_retention_per_year": 0.88,
        "owned_wear_per_year": 0.07,    # extra value lost from public play
    },
    "middle": {
        "games_per_machine_week": 55,   # about 7.9/day
        "price_per_game": 0.75,         # blend of $1 singles and 3 for $2
        "maintenance_per_month": 200,   # brief
        "owner_hours_week": 6,
        "new_retention": {1: 0.80, 2: 0.72, 3: 0.66},
        "used_retention_per_year": 0.93,
        "owned_wear_per_year": 0.04,
    },
    "strong": {
        "games_per_machine_week": 110,  # about 15.7/day
        "price_per_game": 0.85,
        "maintenance_per_month": 225,   # more play, more parts
        "owner_hours_week": 7,
        "new_retention": {1: 0.90, 2: 0.83, 3: 0.77},
        "used_retention_per_year": 0.97,
        "owned_wear_per_year": 0.03,
    },
}

EXIT_YEARS = (1, 2, 3)
MACHINE_SLOTS = 4
WEEKS_PER_MONTH = 52 / 12


def v(key):
    return INPUTS[key][0]


# ---------------------------------------------------------------------------
# Lineups. Ownership of SW and Pokemon is open, so each case is modeled.
# kind: owned | new | used ; months are [in, out); out=None means until exit.
# ---------------------------------------------------------------------------

def lineup(sw_owned, pokemon_owned, rotate):
    r = v("rotation_month")
    temp_out = r if rotate else None
    machines = [
        {"name": "Star Wars Premium", "kind": "owned" if sw_owned else "new",
         "value": v("value_sw"), "upgrades": 0 if sw_owned else v("sw_upgrades_cost"), "in": 0, "out": None},
        {"name": "Pokemon Premium", "kind": "owned" if pokemon_owned else "new",
         "value": v("value_pokemon"), "upgrades": 0, "in": 0, "out": None},
        {"name": "Transformers LE", "kind": "owned", "value": v("value_transformers"),
         "upgrades": 0, "in": 0, "out": temp_out},
        {"name": "Dune", "kind": "owned", "value": v("value_dune"), "upgrades": 0, "in": 0, "out": temp_out},
    ]
    if rotate:
        for i in (1, 2):
            machines.append({"name": f"Replacement {i}", "kind": "used", "value": v("replacement_price"),
                             "upgrades": 0, "in": r, "out": None})
    return machines


LINEUPS = {
    "A":  ("Owned only: SW and Pokemon already owned", lineup(True, True, False)),
    "A+R": ("A, plus two used replacements in Mar 2027", lineup(True, True, True)),
    "B":  ("Buy Pokemon new; SW owned", lineup(True, False, False)),
    "B+R": ("B, plus two used replacements in Mar 2027", lineup(True, False, True)),
    "C":  ("Buy SW (with upgrades) and Pokemon new", lineup(False, False, False)),
    "C+R": ("C, plus two used replacements in Mar 2027", lineup(False, False, True)),
}


# ---------------------------------------------------------------------------
# Model
# ---------------------------------------------------------------------------

def monthly_fixed_costs(s):
    readers = MACHINE_SLOTS
    return (s["maintenance_per_month"]
            + v("insurance_per_year") / 12
            + v("entity_per_year") / 12
            + v("license_per_machine_year") * MACHINE_SLOTS / 12
            + v("reader_fee_per_month") * readers
            + v("travel_per_month")
            + v("admin_per_month")
            + v("electricity_per_month"))


def lp_net_per_game(s):
    p = s["price_per_game"]
    pool = p * (1 - v("refund_rate") - v("cashless_share") * v("cashless_fee"))
    return pool * v("lp_share")


def run(machines, s, exit_year, games_override=None):
    months = 12 * exit_year
    games_wk = s["games_per_machine_week"] if games_override is None else games_override
    tax = v("sales_tax")

    # New cash: payment equipment and startup, then machine purchases
    equipment = MACHINE_SLOTS * (v("bill_acceptor_each") + v("reader_each")) * (1 + tax)
    new_cash = equipment + v("entity_setup") + v("startup_supplies")
    exit_costs = 0.0
    resale = equipment / (1 + tax) * v("equipment_resale_rate")
    owned_value = 0.0
    wear = 0.0
    hours = v("setup_hours") + v("exit_hours")
    rotation_moves = 0.0

    for m in machines:
        start, end = m["in"], (m["out"] if m["out"] is not None else months)
        if start >= months:
            continue
        end = min(end, months)
        years_on = (end - start) / 12
        if m["kind"] == "owned":
            new_cash += v("moving_per_machine")          # to venue
            if m["out"] is not None and m["out"] < months:
                rotation_moves += v("moving_per_machine")  # home at rotation
            else:
                exit_costs += v("moving_per_machine")    # home at exit
            owned_value += m["value"]
            wear += m["value"] * s["owned_wear_per_year"] * years_on
        elif m["kind"] == "new":
            new_cash += (m["value"] + m["upgrades"]) * (1 + tax) + v("new_shipping")
            sale = m["value"] * s["new_retention"][exit_year] + m["upgrades"] * v("upgrade_recovery")
            resale += sale * (1 - v("selling_cost_rate"))
            exit_costs += v("moving_per_machine")
        else:  # used replacement
            new_cash += m["value"] * (1 + tax) + v("replacement_shipping")
            sale = m["value"] * s["used_retention_per_year"] ** years_on
            resale += sale * (1 - v("selling_cost_rate"))
            exit_costs += v("moving_per_machine")
        if m["kind"] == "used" and start > 0:
            hours += v("rotation_hours") / 2

    games_month = games_wk * WEEKS_PER_MONTH * MACHINE_SLOTS
    lp_income = games_month * lp_net_per_game(s) * months
    op_costs = monthly_fixed_costs(s) * months + rotation_moves
    operating_cash = lp_income - op_costs
    hours += s["owner_hours_week"] * 52 * exit_year

    cash_result = -new_cash + operating_cash + resale - exit_costs
    return {
        "new_cash": new_cash,
        "owned_value": owned_value,
        "gross": games_month * s["price_per_game"] * months,
        "lp_income": lp_income,
        "op_costs": op_costs,
        "operating_cash": operating_cash,
        "resale": resale,
        "exit_costs": exit_costs,
        "cash_result": cash_result,
        "wear": wear,
        "result_incl_wear": cash_result - wear,
        "owner_hours": hours,
    }


def games_needed(machines, s, exit_year, target):
    """Games per machine per week for result_incl_wear == target (result is linear in games)."""
    r0 = run(machines, s, exit_year, 0)["result_incl_wear"]
    r1 = run(machines, s, exit_year, 1)["result_incl_wear"]
    return (target - r0) / (r1 - r0)


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------

def money(x):
    sign = "−" if x < -0.5 else ""
    return f"{sign}${abs(x):,.0f}"


def table(headers, rows, align=None):
    align = align or ["---"] + ["---:"] * (len(headers) - 1)
    out = ["| " + " | ".join(headers) + " |", "|" + "|".join(align) + "|"]
    out += ["| " + " | ".join(str(c) for c in r) + " |" for r in rows]
    return "\n".join(out)


def main():
    results = {}
    for lk, (_, machines) in LINEUPS.items():
        for sk, s in SCENARIOS.items():
            for y in EXIT_YEARS:
                results[(lk, sk, y)] = run(machines, s, y)

    tol = v("loss_tolerance")
    lines = []
    w = lines.append

    w("# Scenario results")
    w("")
    w("_Generated by `finance/model.py`. Do not edit by hand; change the inputs in the script and rerun._")
    w("")
    w("**Every number here is an assumption or a placeholder.** No venue terms, purchase quotes, resale "
      "listings or play counts exist yet. Use this to see which inputs matter and what to find out first, "
      "not as a forecast.")
    w("")

    w("## How to read this")
    w("")
    w("- **Scenarios** (weak / middle / strong) vary play volume, price mix, maintenance, resale values and "
      "wear together. Deal terms and fixed costs are the same in all three.")
    w("- **Lineups** cover the open question of what is already owned. Transformers and Dune are confirmed "
      "owned. Whether Star Wars and Pokémon are owned is **open**. `+R` adds the proposed Feb/Mar 2027 "
      "replacement of Transformers and Dune with two purchased machines.")
    w("- **Cash result** = −new cash + operating cash + net resale − exit costs. This is what the bank account "
      "shows after exit.")
    w("- **Incl. wear** also subtracts value lost on owned collection machines from public play. That isn't "
      "cash, but it is a real cost.")
    w(f"- ⚠ marks a result worse than the {money(-tol)} working loss tolerance.")
    w("")

    w("## Summary: result including wear, by exit year")
    w("")
    hdr = ["Lineup"] + [f"{sk} {y}y" for sk in SCENARIOS for y in EXIT_YEARS]
    rows = []
    for lk, (desc, _) in LINEUPS.items():
        row = [f"**{lk}** {desc}"]
        for sk in SCENARIOS:
            for y in EXIT_YEARS:
                r = results[(lk, sk, y)]["result_incl_wear"]
                row.append(money(r) + (" ⚠" if r < -tol else ""))
        rows.append(row)
    w(table(hdr, rows))
    w("")

    w("## Summary: cash result only (excludes wear on owned machines)")
    w("")
    rows = []
    for lk, (desc, _) in LINEUPS.items():
        row = [f"**{lk}**"]
        for sk in SCENARIOS:
            for y in EXIT_YEARS:
                r = results[(lk, sk, y)]["cash_result"]
                row.append(money(r) + (" ⚠" if r < -tol else ""))
        rows.append(row)
    w(table(hdr, rows))
    w("")

    w("## Summary: new cash required up front and in total")
    w("")
    rows = []
    for lk, (desc, machines) in LINEUPS.items():
        r3 = results[(lk, "middle", 3)]
        upfront = run([m for m in machines if m["in"] == 0], SCENARIOS["middle"], 1)["new_cash"]
        rows.append([f"**{lk}**", money(upfront), money(r3["new_cash"]), money(r3["owned_value"])])
    w(table(["Lineup", "New cash at opening", "New cash incl. rotation",
             "Owned machines placed (market value, not cash)"], rows))
    w("")
    w("Net of resale, most of the new cash comes back. The loss is the gap between what is paid "
      "(price + tax + freight + upgrades) and what the machine sells for later.")
    w("")

    w("## Break-even play")
    w("")
    ms = SCENARIOS["middle"]
    w(f"Games per machine per **day** needed, using middle-scenario prices, costs and resale "
      f"(Lucky Pigeon nets about ${lp_net_per_game(ms):.2f} per paid game at a ${ms['price_per_game']:.2f} "
      f"blended price). Results include wear. For comparison, the scenarios assume "
      + ", ".join(f"{sk} {s['games_per_machine_week'] / 7:.1f}" for sk, s in SCENARIOS.items()) + " per day.")
    w("")
    fixed = monthly_fixed_costs(ms)
    ops_be = fixed / (lp_net_per_game(ms) * WEEKS_PER_MONTH * MACHINE_SLOTS) / 7
    w(f"- To cover monthly operating costs only ({money(fixed)}/month): **{ops_be:.1f} games per machine per day**.")
    w("")
    hdr = ["Lineup"] + [f"Break even, {y}y exit" for y in EXIT_YEARS] + [f"Lose {money(tol)}, {y}y exit" for y in EXIT_YEARS]
    rows = []
    for lk, (_, machines) in LINEUPS.items():
        row = [f"**{lk}**"]
        for target in (0, -tol):
            for y in EXIT_YEARS:
                g = games_needed(machines, ms, y, target) / 7
                row.append(f"{max(g, 0):.1f}" + (" (any)" if g <= 0 else ""))
        rows.append(row)
    w(table(hdr, rows))
    w("")
    if any("(any)" in c for r in rows for c in r):
        w("\"(any)\" means the result stays within the target even with zero play.")
        w("")

    w("## Detail")
    w("")
    for lk, (desc, machines) in LINEUPS.items():
        w(f"### {lk}: {desc}")
        w("")
        w("Machines: " + "; ".join(
            f"{m['name']} ({m['kind']}" + (f", from month {m['in']}" if m['in'] else "")
            + (f", until month {m['out']}" if m['out'] is not None else "") + ")"
            for m in machines))
        w("")
        hdr = ["Scenario", "Exit", "New cash", "Owned value placed", "Gross play", "Operating cash",
               "Net resale", "Exit costs", "Cash result", "Owned-machine wear", "Result incl. wear", "Owner hours"]
        rows = []
        for sk in SCENARIOS:
            for y in EXIT_YEARS:
                r = results[(lk, sk, y)]
                rows.append([sk, f"{y}y", money(-r["new_cash"]), money(r["owned_value"]), money(r["gross"]),
                             money(r["operating_cash"]), money(r["resale"]), money(-r["exit_costs"]),
                             money(r["cash_result"]), money(-r["wear"]),
                             money(r["result_incl_wear"]) + (" ⚠" if r["result_incl_wear"] < -tol else ""),
                             f"{r['owner_hours']:,.0f}"])
        w(table(hdr, rows, ["---", "---"] + ["---:"] * 10))
        w("")

    w("## Inputs")
    w("")
    w("### Scenario inputs (all **assumption**)")
    w("")
    hdr = ["Input"] + list(SCENARIOS)
    rows = [
        ["Games per machine per week"] + [str(s["games_per_machine_week"]) for s in SCENARIOS.values()],
        ["Blended price per paid game"] + [f"${s['price_per_game']:.2f}" for s in SCENARIOS.values()],
        ["Maintenance per month (4 machines)"] + [money(s["maintenance_per_month"]) for s in SCENARIOS.values()],
        ["Owner hours per week"] + [str(s["owner_hours_week"]) for s in SCENARIOS.values()],
        ["New machine resale / pre-tax price, 1/2/3y"] + ["/".join(f"{x:.0%}" for x in s["new_retention"].values()) for s in SCENARIOS.values()],
        ["Used replacement value kept per year"] + [f"{s['used_retention_per_year']:.0%}" for s in SCENARIOS.values()],
        ["Extra wear on owned machines per year"] + [f"{s['owned_wear_per_year']:.0%}" for s in SCENARIOS.values()],
    ]
    w(table(hdr, rows))
    w("")
    w("### Shared inputs")
    w("")
    rows = []
    for k, (val, label, note) in INPUTS.items():
        shown = f"{val:.0%}" if isinstance(val, float) and val < 1 else (f"${val:,}" if isinstance(val, int) and val >= 10 else str(val))
        rows.append([f"`{k}`", shown, f"**{label}**", note])
    w(table(["Input", "Value", "Label", "Note"], rows, ["---", "---:", "---", "---"]))
    w("")

    w("## Not modeled")
    w("")
    w("- Rent, minimum payments or revenue guarantees to the venue. Any of these would make every scenario worse.")
    w("- Novelty spikes, seasonality and events. Play is flat month to month.")
    w("- Income tax, depreciation deductions, and the cost of capital tied up in machines.")
    w("- Theft, vandalism or a major failure beyond the maintenance allowance.")
    w("- Keeping purchased machines at exit instead of selling them (that turns resale into collection value, not cash).")
    w("- Owner time is counted in hours and not given a dollar value.")
    w("")

    (HERE / "scenarios.md").write_text("\n".join(lines) + "\n")

    with open(HERE / "scenarios.csv", "w", newline="") as f:
        cols = ["new_cash", "owned_value", "gross", "lp_income", "op_costs", "operating_cash", "resale",
                "exit_costs", "cash_result", "wear", "result_incl_wear", "owner_hours"]
        wr = csv.writer(f)
        wr.writerow(["lineup", "scenario", "exit_years"] + cols)
        for (lk, sk, y), r in results.items():
            wr.writerow([lk, sk, y] + [round(r[c]) for c in cols])


if __name__ == "__main__":
    main()
