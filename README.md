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
- `favicon.svg`, `favicon-32.png`, `favicon-192.png`, `apple-touch-icon.png` – the icon in the browser tab: the leaf beside the site's name, same outline, same red (`#b8232f`), same 24° tilt. The PNGs are drawn from the SVG for browsers and phones that do not take an SVG icon; redraw them if the SVG changes.
- `short.js`, `stories.js`, `film.html` – **story mode and the story player**. A page opened with `?short` shows only its animation, filling the window (`short.js`, loaded in the head of `tower.html`, `town.html`, `world.html` and `film.html`). `stories.js` opens a home-page story card in a 9:16 frame holding that page, with Maximize and a link to the full page. `film.html` is the leaf-drawn film on a page of its own.
- `subway.js`, `data/subway.js` – **Ride the lines**, a section of the home page: the TTC's rapid transit lines from OpenStreetMap, shown as an in-car strip of station lights over a map of Toronto (limits, old municipalities, lake, rivers, main roads) so each stop is located in the city. `subway.html` is the same thing as a story for the Stories row: `data-story` on the root makes `subway.js` ride every line in turn, quicker, with the map closing in on each. Rebuild the data with `node tools/build-subway.js <overpass answer>`; the query is at the top of that file.
- `notes.html` – **Behind the project**: the working notes that used to sit at the foot of the home page (the world so far, the record, what the years bring, drawn from the archive, the log). Filled by `site.js` from `records.js`, `world.js`, `scenery.js` and `references.js`; linked from every footer.
- `tower.html`, `tower.js`, `data/tower.js`, `sketch.js` – **How a tower went up**, the first of the site's stories: a scrapbook of the CN Tower in eleven pages that turn themselves. The words are in `tools/build-tower.js` (run it to rewrite `data/tower.js`); the pictures and their credits are in `images/tower/src/`. `sketch.js` turns a photograph into a pencil-and-wash sketch in the browser and is also used by the story card on the home page.
- `assets/polyhaven/` – photographed surfaces (sand, forest floor, bark) and a scanned fern from Poly Haven, CC0, used by `world1700.js`; sources are in `references.js`. About 6.8 MB, loaded only by the 3D world pages. Adding `?full` to a world page's address shows the full version (all trees, scanned ferns) on a small or touch screen.
- `paint.js` – the painted look shared by the game (`scene3d.js`) and the 3D worlds (`world1700.js`): the 3D picture is drawn off-screen and repainted in flat dabs (a Kuwahara filter), with the film curve applied there for the worlds. Each engine loads it with its own `?v=` stamp, so bumping the stamp in the pages is still enough.
- `sound.js` – the game's sound: a fiddle reel in D written for the game, and a few effects, all synthesized with Web Audio (no recordings; not a period tune). `YP.sound.level()` is a test hook that reads how loud it is.
- `leafline.js` – **Toronto, redrawn**, the film on the home page: a maple leaf is the pen, and one unbroken line draws the 1802 shore and creeks, the 1834 limits, every annexation, the six municipalities and today’s shore, as a function of time, with a few notes. Plain 2D canvas.
- `hero3d.js` – the picture behind the home page title: downtown from the lake at dusk, built from `data/shoreline.js` and `data/buildings.js`. It is drawn small and repainted by a filter (Kuwahara, plus canvas weave and varnish) so it reads as an old oil painting. That look, the sky, the light and the blowing leaves are invented; no period painting was copied.
- `data/history.js` – generated shore, marsh and creek lines from nine maps, 1802 to 1886. Rebuild with `node tools/build-history.js <folder>`; the script header says what to download (U of T Historical Hydrography of Toronto, CC BY-SA 4.0, so this one file is CC BY-SA 4.0 too).
- `data/today.js` – generated rivers, main roads and railways for the whole city, from OpenStreetMap (ODbL). Rebuild with `node tools/build-today.js`.
- `data/boundaries.js` – generated boundary geometry for the film. Rebuild with `node tools/build-boundaries.js <folder>`; the script header says which two files to download (U of T annexation boundaries, CC BY 4.0; City of Toronto former municipalities, OGL-Toronto).
- `draw.js` – canvas drawing for the four rides, shared by the game and the landing page.

- `world.html`, `world1700.js` – **Toronto, c.1700**, layer 02 of the 3D world and section 03 of the home page: the ground before the town. Real: the shape of the ground (`data/terrain.js`), the shore, marsh and creeks from the earliest maps, the site of Teiaiagon. Not real: the trees, the trail's exact line, where each person and canoe is. Heights are stretched 2.5 times. It has two moments, switched on the picture: about 1680, with the Seneca village of Teiaiagon modelled from the record and from Seneca towns of those years (where each house stood is invented; no plan survives), and about 1700, after it was left. The people's dress follows portraits of 1710 and written accounts. `references.js` lists what each was taken from and what is still a guess. No one from the Seneca Nation or the Mississaugas of the Credit has reviewed it.
- `data/terrain.js` – generated ground heights and a land / water / marsh mask. Rebuild with `node tools/build-terrain.js`; the script header explains how today's ground is corrected with the 1802, 1834 and 1851 maps. Adapted in part from CC BY-SA 4.0 data, so this file is CC BY-SA 4.0.
- `town.html` – **A town taking shape, 1700 to 1850**: a timelapse on the same engine (`world1700.js`, switched by `data-world="town"` on the body). Real: dates, population counts, the sites of the forts and the lighthouse. Drawn: every ordinary house and street, the clearing, wharves and ships. `images/town/town-1850.jpg` is the picture on its story card, taken with the same `tools/shoot-world.js` (it accepts `town-YYYY.jpg`).
- `gallery.js`, `images/world1700/` – six snapshots of the c.1700 world and the dialog that shows them. The pictures are taken from the live model: run `node tools/shoot-world.js` and follow what it prints. Retake them whenever the model changes.
- `shore.html`, `shore.js` – **The shoreline, today**, layer 01 of the 3D world (three.js, loaded from a CDN). Scene units are metres.
- `data/buildings.js` – generated downtown building footprints and heights. Rebuild with `node tools/build-buildings.js`. Each building records whether its height is a recorded value, an estimate from storeys, or unknown.
- `data/shoreline.js` – generated shoreline geometry. Rebuild with `node tools/build-shoreline.js`, which fetches the Lake Ontario outline from OpenStreetMap's Overpass API for the box set at the top of that script. Map data © OpenStreetMap contributors, ODbL.

## Adding to the world

- **A new 3D layer** (buildings, terrain, an older shoreline): add a build script in `tools/` that writes a data file in `data/` using the same origin and projection as `shoreline.js`, then add it to the scene in `shore.js`. Say on the page what is real and what is not.

- **A new record:** add an entry to `YP.RECORDS` in `records.js`, in date order. It appears in the game, on the end-of-run transfer and on the landing page. Nothing goes in without a source that was actually read.
- **A new dated landmark or moment in the game's landscape:** add a sourced entry to `YP.SCENERY` in `scenery.js` and a drawing for it in `landscape.js`.
- **A new piece** (a film, a map, a reconstruction): add an entry to `YP.PIECES` in `world.js`, or change an existing one's `status` and give it an `href`.
- **Every addition:** add a dated line to the top of `YP.LOG` in `world.js`.

## Reuse

You are welcome to draw inspiration from this site, but please do not copy it directly. Its design, words, drawings and code are © 2026 Raghu Devaguptapu, all rights reserved. The generated files in `data/` are adapted from open sources and keep those licences (CC BY 4.0, CC BY-SA 4.0, Open Government Licence - Toronto, ODbL); each file’s header names its source.

## Cache stamp

Every page loads its stylesheet and scripts with the same `?v=` stamp (for example `style.css?v=20261111e`). When any of those files changes, change the stamp in all eight pages together (`index.html`, `game.html`, `shore.html`, `world.html`, `town.html`, `tower.html`, `notes.html`, `film.html`). Without it a phone can pair a cached page with a newer stylesheet and lay the page out wrongly.

## Running it

Open `index.html` directly, or serve the folder: `node .claude/server.js` then visit http://127.0.0.1:5180.

## Source notes

Records were checked on 2026-11-10. Most were read on the linked page itself. Three were confirmed from search summaries of the linked page rather than a full read, and are worth a second look: the 1954 subway opening, the 1976 CN Tower figures, and the Toronto Purchase entries (1787 and 2010).
