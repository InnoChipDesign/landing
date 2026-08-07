# Open Questions

Everything in sections A–C is a **fact only you can supply** — none of it is a design decision I can
make. The architecture is complete without these answers; the site cannot launch without them.

**How to use this file:** type your answers directly into the `> ` blocks under each question, then
tell me it's updated. Leave `—` where you don't know yet or want me to choose. Change `[ ]` to `[x]`
on a section when it's fully answered.

Status legend: `[ ]` unanswered · `[~]` partially answered · `[x]` done

---

## A. Blocks Phase 1 (foundations) — needed first

### A1. Club identity

**Full official name:**
> InnoChipDesign (full: Innopolis Chip Design Club)

**One-sentence pitch:**
> Innopolis Chip Design club is a student, scientific and engineering community at Innopolis University that aims to learn and practice the art of hardware desing

OR

> Innopolis Community dedicated to the FPGA and ASIC + RISC-V

**University**:
> Innopolis University, Innopolis city, Tatarstan Republic, Russia

**Founding year:**
> 2023

**Logo:**
> JPG image will be supplied before the implementation stage

---

### A2. Domain

**Final public URL** (base domain):
> innochipdesign.campus.innopolis.university

AND

> www.innochipdesign.ru

**Is it a subpath** (e.g. `university.edu/club`)? Yes/No — this changes Astro's `base` config and
every asset URL, so it must be decided before Phase 1.
> Yes, it's subpath /club

**Placeholder to build against until the real domain exists** (optional):
> -

> ⚠️ This value is baked in at build time (`08-deployment.md` §2). A wrong value silently breaks link
> previews and the sitemap.

---

### `[ ]` A3. The two header services (D16)

1) Service 1 ("VCD") redirects to vcd.innochipdesign.ru
2) Service 2 ("HW")  redirects to homework.innochipdesign.ru

No any other info needed.

**Any other club-built services** for the `/resources` section? (name · URL · one line · status)
> Contact details:
> Club chat:
> https://t.me/InnoChipDesign
> Leader email:
> m.kuskov@innopolis.university
> 
> Student FPGA projects:
> General list https://github.com/orgs/InnoChipDesign/repositories?q=project-
> 
> Examples:
> https://github.com/InnoChipDesign/project-schoolRISCV
> https://github.com/InnoChipDesign/project-Game2048_FPGA
> https://github.com/InnoChipDesign/RiverRaidFPGA
> https://github.com/InnoChipDesign/project-DCD_MultiBankMemory

---

## B. Blocks Phase 2 (content model)

### B1. Tag vocabulary

The list in `02-content-model.md` §3 is a placeholder. What are your club's actual focus areas?
Aim for **5–12**. Worth ten minutes of thought — it's the primary way visitors navigate, and changing
it later means editing every project.

> Generate minimal set automatically based on description. Will be filled and updated later.

### B2. Project volume

**How many projects exist to publish now?**
> Around 20, but will be growing

**Roughly how many per year going forward?**
> 8

> Under ~20 total, some of the pagination and facet-count machinery is over-engineering and I'd
> simplify it. Over ~100, we should revisit the grid layout.

Due to static nature, paging is not necessary.

---

### `[ ]` B3. Semesters

Does your institution use spring/fall, or something else (trimesters, numbered semesters)?
The `semester` enum is currently `spring | fall`.
> The basic track has sprint and fall semesters. Advanced students trimesters including `summer`.

---

### B4. People and consent ⚠️

This is a public page listing real students by name and photo.

**Who goes on the roster** — all members, or only project participants and officers?
> need to be clarified, question is unclear

**How will consent be recorded** for each person's name, photo and links?
> by hand in person

**Process when someone asks to be removed:**
> up to the instructor, university staff and maintainer to update the code.

**Does your university have a rule about publishing student names or photos?** 
> legal sites are solved by me with my sole responsibility, do not bother

> `photo` and `links` are optional in the schema for exactly this reason, but the policy is yours.

Photo and links should be optional. Everything except name should be optional.

---

### B5. Video provider

**Which single provider are all videos on?** (YouTube / Rutube / VK Video / Dzen / other)
Determines the CSP `frame-src` and which parser gets exercised first.
>

**Do demo videos already exist, or is that still to do?**
> already exist.

---

## C. Blocks Phase 5 (pages) and Phase 8 (launch)

### C1. Meeting logistics

Appears on the homepage CTA, `/join` and `/events`.

**Day / time:**
> Every saturday during spring and fall semester, 12 o'clock, 

**Room / building:**
> location TBA each time 

---

### `[ ]` C2. Join flow (D18)

**Application form URL** (Google Forms / Yandex Forms / other):
> https://engineer.yadro.com/chip-design-school/#applicationForm

**Chat platform and invite link** (Telegram / Discord / other):
> t.me/innochipdesign

**Is there a selection process, or is everyone welcome?** This changes the tone of `/join`
substantially — say which you want.
> everyone is welcome

---

### C3. Contact

**Public email address:**
> provided

**Social accounts to link:**
> provided

**Physical location** for `/contact`:
> Universitetskaya Street, 1, Innopolis, Verkhneuslonsky District, Republic of Tatarstan, 420500

**Want a static map image?** (Yes/No — an embedded map would be a third-party tracker, see D-i)
> yes, embed yandex map dynamic map with location shown as a red dot

**Faculty advisor** — name, and should they be listed?
> Mikhail Kuskov, Senior Instructor

---

### C4. Events

**Past events worth listing** (date · kind · title · photos yes/no):
```
To be filled, generate 3 examples on your own.
```

**Who will keep the "next meeting" banner current?**
> nobody

> If the honest answer is "nobody", say so — I'll drop the banner rather than ship something that
> goes stale and makes the site look abandoned.

---

### C5. Resources

**Equipment to publish** (item · notes · how to book):
```

```

**Curated links you already share with new members:**
```

```

---

### `[ ]` C6. About page

**Mission, in your own words** — 2–3 paragraphs:
```
generate based on a websearch and provided info
```

**History worth a timeline** (founding, notable wins, milestones):
```

```

**Awards and competition results:**
```
search about and insert short info
https://edu.yadro.com/soc-design-challenge/

We have participated in 2023, 2024, 2025, 2026.
Won prices in 2024.

```

**Sponsors or partners to credit:**
> None, ADV-T LLC.

---

## D. Things I decided so you don't have to — veto if you disagree

Each was a judgement call within your stated direction. All are cheap to change now, more expensive
after the phase in brackets. **Mark `KEEP` or `CHANGE` in the last column.**

| # | Decision | Reasoning | Cost to change | KEEP / CHANGE |
|---|---|---|---|---|
| D-a | **`MobileNav` is not a React island** | Otherwise React loads on all 9 routes for a menu toggle | Free [ph.1] | true (keep it static) |
| D-b | **Team chips link to `/projects?team=<id>`** | Gives members a shareable "my work" URL with no person pages | Free [ph.3] | no need. There is no uniform teams. Team is just a collection of it's participants and each team unique to the project. |
| D-c | **Controlled tag vocabulary, build-time validated** | Free-text tags fragment within a semester and ruin the facet UI | Low [ph.2] | true, predefined set of tags |
| D-d | **`cover` + `coverAlt` required on every project** | A grid with some cards image-less looks broken | Low [ph.2] | projects without photos should use stub (default) image, everything should look uniform. |
| D-e | **Homepage stats derived from content, never typed** | Hardcoded counts go stale and cost credibility | Free [ph.5] | true |
| D-f | **Pagination, not infinite scroll** | Back button, deep links, and a visible total | Low [ph.4] | okay, but page size is huge, 100 projects per page |
| D-g | **Lightbox state not in the URL** | Would collide with the `/projects` back-button semantics | Free [ph.3] | need to be clarified |
| D-h | **`Contact` in the footer, not the header** | Header already carries 5 nav items + 2 service buttons | Free [ph.1] | ok |
| D-i | **Static map image on `/contact`, not an embed** | An embedded map is a third-party tracker on a site with no analytics | Free [ph.5] | okay, but image should be clickable redirect to ya maps |
| D-j | **Light theme default, dark as a toggle** | Follows your "light, bright & academic" choice | Free [ph.1] | okay |
| D-k | **CSP ships report-only for one week** | An untested enforced CSP breaks pages in hard-to-attribute ways | Free [ph.7] | need to be clarified |
| D-l | **`draft: true` projects get no URL at all** | A draft with a live URL will be found and shared | Free [ph.2] | ok |

**Anything else you want changed:**
> Project page has a list of projects with photo on left and project details in center and right. With margins on sides. No grid.

> Project statuses: Draft, Idea, Work in progress, Completed. Could be improved if any suggestions

---

## E. Two things worth reconsidering

Not objections — you decided both explicitly and I've specced them as chosen. Recorded so the
trade-off stays visible. **Answer `KEEP` or `SWITCH`.**

### E1. React for three islands

`ProjectExplorer` is genuinely stateful and benefits from React; the lightbox and menu do not. The
cost is ~45 KB gzipped on `/projects` and `/projects/<slug>`. Preact via `@astrojs/preact` is
API-compatible for what we're writing and would cut that to ~4 KB — a one-line config change plus an
alias, no component rewrites. Entirely reasonable to keep React for contributor familiarity.

**Decision (KEEP React / SWITCH to Preact):**
> Switch to preact, okay

### E2. Direct video iframes

The provider sees every visitor's IP and can set storage the moment a project page loads — on a site
that otherwise makes zero third-party requests and needs no cookie banner. A click-to-load poster
facade would preserve that property for the cost of one poster image per project. Contained to
`<VideoEmbed>` plus one schema field (`04-media.md` §B2).

**Decision (KEEP direct iframes / SWITCH to facade):**
> switch to clickable preview

---

## F. Anything I haven't asked about

Constraints, preferences, university requirements, things you've seen on other club sites that you
want or specifically don't want:

```

```
