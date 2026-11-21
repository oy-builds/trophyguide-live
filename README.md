# Leonida Legend — GTA VI Trophy Guide & Tracker

An offline guide and tracker for the 55 PlayStation 5 trophies of **Grand Theft Auto VI**, built as a make.fun `gta6-trophy-guide-01` entry.

## What it is

- **Checklist** of all 55 official trophies — 1 platinum, 2 gold, 6 silver, 46 bronze — each with its official name, description and grade as PlayStation publishes them.
- **A guide for every trophy**, written for this entry from the official descriptions, with its sources named beside it (the official PS5 trophy list as listed by Exophase, and the PSNProfiles trophy list).
- **Tracker**: mark trophies earned, keep numeric progress on the 21 count-based trophies (reaching the target marks the trophy earned), watch overall and per-grade progress, and **export / import** your progress as JSON. Everything is stored in the browser's localStorage; nothing leaves the machine.
- **Filters** by kind (story, missable, collectibles, activities, online) and by grade, plus text search.
- **Spoiler shield**: the 28 hidden trophies stay shielded — name and description hidden — until you turn on "Reveal hidden trophies" or earn them.
- **Platinum roadmap** in five stages, ordered from the official descriptions: story first, the sensitive middle, the finale, then the cleanup.
- **Missables view**: five trophies flagged as possibly missable, each honestly labelled as an *inference from its official description* — no trophy on the official list is labelled missable, and this guide does not pretend otherwise.

## Running it

Serve the `app/` folder with any static file server and open `index.html` in a desktop browser. With the kit's helper from the repository root:

```
node serve.ts        # if you keep the kit's serve script beside it
```

Or any equivalent, e.g. `python3 -m http.server --directory app`. The app loads only its own files and works with the network off.

## Handing it in

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the kit's `vendor/makefun-frontend.ts` library, byte for byte as the scorer rebuilds it.

## Layout

- `app/index.html`, `app/style.css`, `app/app.js` — the app (vanilla JS, no libraries).
- `app/data/trophies.json` — the trophy data: official names, descriptions and grades, plus this entry's guides, sources, kinds, hidden flags, count targets, roadmap stages and missable flags.
- `screenshots/` — three renders of the app: checklist with a guide open, the platinum roadmap, and the missables view.
- `smoke.test.mjs` — structural and data checks (`node smoke.test.mjs`).

## License

MIT — see `LICENSE`.
