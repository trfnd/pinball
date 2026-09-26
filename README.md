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
| `site/` | Public website for Paw Tap Pinball (pawtappinball.com) |
| `tools/site/` | The generator for `site/index.html`: page template, traced cat artwork, Indiana map data |

## Website

`site/` holds everything that gets published: `index.html` (text, styles, the animated cat and the script in one file), the playfield photos in `img/`, icons and the share image. `.github/workflows/pages.yml` publishes the folder with GitHub Pages whenever `site/` changes on `main`.

**Editing.** Change `tools/site/template.html`, then run `python3 tools/site/build.py`, which writes `site/index.html`. Don't edit `site/index.html` directly: the next build overwrites it. The build fills in the cat artwork (`parts.json`, traced from the A1 logo by `trace.py`), the paw-to-ball contact table for the tap animation (`paw_pts.json`), and the Indiana map (`indiana.json`).

**Before publishing: this repository is public.** Anyone can read the project brief, the finance notes, the venue agenda and the proposal draft. GitHub Pages on a free plan only publishes from public repositories. Either make this repository private and publish the site from a separate public repository that holds only `site/` and the workflow, or keep the site here and move the private notes out.

**Going live on pawtappinball.com (one-time).** The domain is registered at Porkbun and currently points to another host, a ChatGPT site behind Cloudflare, with `www` on a separate CNAME. Email for the domain runs on Google Workspace.

1. In the GitHub repository that will publish the site: **Settings → Pages → Build and deployment → Source: GitHub Actions**, then run the workflow once from the Actions tab.
2. Same page: **Custom domain: `pawtappinball.com`**. (With Actions deployments GitHub ignores the `site/CNAME` file, so this setting is what counts.)
3. Remove `pawtappinball.com` from the custom-domain settings of the current ChatGPT site.
4. In Porkbun DNS, **replace** the web records:
   - Delete the current `A` records for `@` and the `CNAME` for `www`.
   - Add four `A` records for `@`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`.
   - Add a `CNAME` for `www` pointing to `<github-user>.github.io` (for this repository, `trfnd.github.io`).
   - **Leave the `MX` and `TXT` records alone.** They carry the Google Workspace email and domain verification.
5. When the certificate is issued (minutes to a day), turn on **Enforce HTTPS** on the Pages settings page. Check that both `pawtappinball.com` and `www.pawtappinball.com` load the new site.

## Conventions

- Label every number as **confirmed**, **quote**, **assumption** or **open**.
- A proposal or conversation is never recorded as an agreement.
- In the finance models, keep these separate: new cash spent, value of machines already owned, operating cash, owner time, net resale proceeds, and exit costs.
