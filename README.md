# Lucky Pigeon

A proposed small pinball business: about four machines placed in an existing venue, funded, operated and maintained by Lucky Pigeon, with a share of play revenue to the venue.

**Status (2026-09-25):** Concept stage. No machines ordered or installed for this venture. No venue agreement signed. Early conversations only, with Westfield Collective (GM: Angie) and a few local breweries.

## Goals

- Create enjoyable, shared experiences through pinball for families, kids and teens, casual players and enthusiasts.
- Cover operating costs, recover the investment over time, and ideally leave a modest surplus.
- It does not need to replace medical income, but losses should not be subsidized indefinitely.

## Layout

| Folder | Contents |
|---|---|
| `project-brief.md` | Current facts, preferences, modeling assumptions and open questions, kept separate |
| `research/` | Assessments and research notes |
| `venues/` | One folder per candidate venue: meeting notes, site observations, terms discussed |
| `finance/` | Scenario models (weak / middle / strong; 1-, 2- and 3-year exits) |
| `site/` | Public website for Paw Tap Pinball (pawtappinball.com), published by GitHub Pages |

## Website

`site/index.html` is the whole page: text, styles, the animated cat and the script live in one file, so copy edits happen there. `.github/workflows/pages.yml` publishes the `site/` folder whenever it changes on `main`.

To put it on pawtappinball.com (one-time):

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. Same page, **Custom domain: `pawtappinball.com`**, then **Enforce HTTPS** once the certificate is issued.
3. At the domain registrar, add DNS records: four `A` records for `@` pointing to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`, and a `CNAME` for `www` pointing to `trfnd.github.io`.
4. Merge the site to `main` (or run the workflow from the Actions tab).

## Conventions

- Label every number as **confirmed**, **quote**, **assumption** or **open**.
- A proposal or conversation is never recorded as an agreement.
- In the finance models, keep these separate: new cash spent, value of machines already owned, operating cash, owner time, net resale proceeds, and exit costs.
