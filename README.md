# The York Project

Toronto, a world in progress. A static site (plain HTML, CSS and JS, no build step) that keeps being added to.

## What's here

- `index.html` – landing page. Rendered from the two data files below.
- `game.html`, `game.js` – **Carrying Place**, a one-button ride from the portage trail to the subway. Rush mode has obstacles and three lives; Explore stops at every record.
- `records.js` – the record: every history card, with the source it was checked against.
- `world.js` – the pieces of the world (live / building / planned) and the dated world log.
- `scenery.js` – what the game's landscape is built from: census counts that pace the city's growth, and dated landmarks and moments, each with a source.
- `landscape.js` – draws the landscape for any given year. Ordinary buildings, people, carts, cars and ships are illustrative; anything with a caption comes from `scenery.js`.
- `scene3d.js` – the 3D renderer for the game (three.js from a CDN). `game.js` owns the rules; if WebGL is unavailable the 2D drawings in `landscape.js` and `game.js` are used instead, so a new landmark needs a drawing in both.
- `references.js` – the period pictures each model was built from, and the list of things not yet checked. **Rule: look at a period source before drawing anything historical, and record it here.**
- `redrawn.js` – **Toronto, redrawn**, the film on the home page: the city limits from 1834 to 1998, drawn on a canvas as a function of time, with a few Web Audio notes.
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

## Running it

Open `index.html` directly, or serve the folder: `node .claude/server.js` then visit http://127.0.0.1:5180.

## Source notes

Records were checked on 2026-11-10. Most were read on the linked page itself. Three were confirmed from search summaries of the linked page rather than a full read, and are worth a second look: the 1954 subway opening, the 1976 CN Tower figures, and the Toronto Purchase entries (1787 and 2010).
