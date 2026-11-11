# The York Project

Toronto, a world in progress. A static site (plain HTML, CSS and JS, no build step) that keeps being added to.

## What's here

- `index.html` – landing page: three full-width bands (01 play, 02 watch, 03 explore), then the record. Lists are rendered from the data files below. The Motion button stops everything that moves on its own.
- `game.html`, `game.js` – **Next Stop, Toronto** (first called Carrying Place), a one-button ride from the portage trail to the subway. Rush mode has obstacles and three lives; Explore stops at every record.
- `records.js` – the record: every history card, with the source it was checked against.
- `world.js` – the pieces of the world (live / building / planned) and the dated world log.
- `scenery.js` – what the game's landscape is built from: census counts that pace the city's growth, and dated landmarks and moments, each with a source.
- `landscape.js` – draws the landscape for any given year. Ordinary buildings, people, carts, cars and ships are illustrative; anything with a caption comes from `scenery.js`.
- `scene3d.js` – the 3D renderer for the game (three.js from a CDN). `game.js` owns the rules; if WebGL is unavailable the 2D drawings in `landscape.js` and `game.js` are used instead, so a new landmark needs a drawing in both.
- `references.js` – the period pictures each model was built from, and the list of things not yet checked. **Rule: look at a period source before drawing anything historical, and record it here.**
- `redrawn3d.js` – **Toronto, redrawn**, the film on the home page, in 3D (three.js): the city limits from 1834 to 1998 laid down in maple leaves, over the shore and creeks of seven old maps, as a function of time, with a few Web Audio notes. One leaf stands for a patch of ground inside a mapped limit; its colour is the year that ground joined. The leaves, colours and terrace heights are drawing; every line is data.
- `redrawn.js` – the flat 2D version of the film, used only if WebGL or the 3D library is unavailable.
- `hero3d.js` – the picture behind the home page title: downtown from the lake at dusk, built from `data/shoreline.js` and `data/buildings.js`. It is drawn small and repainted by a filter (Kuwahara, plus canvas weave and varnish) so it reads as an old oil painting. That look, the sky, the light and the blowing leaves are invented; no period painting was copied.
- `data/history.js` – generated shore, marsh and creek lines from nine maps, 1802 to 1886. Rebuild with `node tools/build-history.js <folder>`; the script header says what to download (U of T Historical Hydrography of Toronto, CC BY-SA 4.0, so this one file is CC BY-SA 4.0 too).
- `data/today.js` – generated rivers, main roads and railways for the whole city, from OpenStreetMap (ODbL). Rebuild with `node tools/build-today.js`.
- `data/boundaries.js` – generated boundary geometry for the film. Rebuild with `node tools/build-boundaries.js <folder>`; the script header says which two files to download (U of T annexation boundaries, CC BY 4.0; City of Toronto former municipalities, OGL-Toronto).
- `draw.js` – canvas drawing for the four rides, shared by the game and the landing page.

- `shore.html`, `shore.js` – **The shoreline, today**, layer 01 of the 3D world (three.js, loaded from a CDN). Scene units are metres.
- `data/buildings.js` – generated downtown building footprints and heights. Rebuild with `node tools/build-buildings.js`. Each building records whether its height is a recorded value, an estimate from storeys, or unknown.
- `data/shoreline.js` – generated shoreline geometry. Rebuild with `node tools/build-shoreline.js`, which fetches the Lake Ontario outline from OpenStreetMap's Overpass API for the box set at the top of that script. Map data © OpenStreetMap contributors, ODbL.

## Adding to the world

- **A new 3D layer** (buildings, terrain, an older shoreline): add a build script in `tools/` that writes a data file in `data/` using the same origin and projection as `shoreline.js`, then add it to the scene in `shore.js`. Say on the page what is real and what is not.

- **A new record:** add an entry to `YP.RECORDS` in `records.js`, in date order. It appears in the game, on the end-of-run transfer and on the landing page. Nothing goes in without a source that was actually read.
- **A new dated landmark or moment in the game's landscape:** add a sourced entry to `YP.SCENERY` in `scenery.js` and a drawing for it in `landscape.js`.
- **A new piece** (a film, a map, a reconstruction): add an entry to `YP.PIECES` in `world.js`, or change an existing one's `status` and give it an `href`.
- **Every addition:** add a dated line to the top of `YP.LOG` in `world.js`.

## Cache stamp

Every page loads its stylesheet and scripts with the same `?v=` stamp (for example `style.css?v=20261111e`). When any of those files changes, change the stamp in `index.html`, `game.html` and `shore.html` together. Without it a phone can pair a cached page with a newer stylesheet and lay the page out wrongly.

## Running it

Open `index.html` directly, or serve the folder: `node .claude/server.js` then visit http://127.0.0.1:5180.

## Source notes

Records were checked on 2026-11-10. Most were read on the linked page itself. Three were confirmed from search summaries of the linked page rather than a full read, and are worth a second look: the 1954 subway opening, the 1976 CN Tower figures, and the Toronto Purchase entries (1787 and 2010).
