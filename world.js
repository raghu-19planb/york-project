// The world in progress. The landing page is rendered from this file, so
// growing the project means adding an entry here, not redesigning a page.
//
// PIECES: the parts of the world. status is 'live', 'building' or 'planned'.
// LOG:    dated notes on what was added, newest first.
window.YP = window.YP || {};

YP.PIECES = [
  {
    id: 'carrying-place',
    kind: 'Play',
    status: 'live',
    title: 'Next Stop, Toronto',
    line: 'A one-button ride from the portage trail to the subway.',
    body: 'Paddle, then ride, through three centuries of Toronto. Punch a transfer for every record you catch, or take Explore mode and stop to read each one.',
    href: 'game.html',
    cta: 'Play Next Stop, Toronto'
  },
  {
    id: 'the-record',
    kind: 'Read',
    status: 'live',
    title: 'The record',
    line: 'Every card in the game, with the source it came from.',
    body: 'Twenty-one entries so far. Each was checked against the page it links to before it went in.',
    href: '#record',
    cta: 'Read the record'
  },
  {
    id: 'world-1700',
    kind: 'Walk',
    status: 'building',
    title: 'Toronto, c.1680 and c.1700',
    line: 'The ground before the town, as a 3D world: the bay, the sandbar, the trail, and the Seneca village on it.',
    body: 'Built on real ground and the oldest shoreline the maps give. Teiaiagon stands as it might have about 1680, from the record and from Seneca towns of those years, and is gone by 1700. A recording moves through six views, each explained.',
    href: 'world.html',
    cta: 'Open the c.1700 world'
  },
  {
    id: 'town-1850',
    kind: 'Watch',
    status: 'building',
    title: 'A city taking shape, 1800 to 2025',
    line: 'A drawn time lapse of the harbour and downtown: forest, a town, a city of brick and rail, then towers, in blue ink like an architect’s sketch.',
    body: 'One fixed view and 225 years. The ground, the shores of 1802, 1834 and today, today’s buildings and fifteen dated landmarks are from records. The year each ordinary building appears is worked out from where it stands and how tall it is, and the page says so.',
    href: 'town.html',
    cta: 'Play the timelapse'
  },
  {
    id: 'tower-scrapbook',
    kind: 'Watch',
    status: 'live',
    title: 'How a tower went up',
    line: 'A scrapbook of the CN Tower, from railway tracks in 1970 to today: eleven archive photographs redrawn as sketches.',
    body: 'Each page is a photograph taken at the time, turned into a pencil-and-wash sketch in the browser, with the date, what was happening, how high the tower stood, and one thing few visitors know. Every picture is credited and can be seen as it was taken.',
    href: 'tower.html',
    cta: 'Open the scrapbook'
  },
  {
    id: 'shoreline',
    kind: 'Walk',
    status: 'building',
    title: 'The shoreline, today',
    line: 'Layer 01 of a 3D world: the lake edge near downtown, as it is mapped now.',
    body: 'The mainland shore, the islands and the harbour at true scale, with about 9,000 downtown buildings, all from OpenStreetMap. Building heights are marked as recorded, estimated or unknown. The land is still flat.',
    href: 'shore.html',
    cta: 'Open the 3D shoreline'
  },
  {
    id: 'redrawn',
    kind: 'Watch',
    status: 'live',
    title: 'Toronto, redrawn',
    line: 'One unbroken line, drawn by a maple leaf: the shore of 1802, the city of 1834, every annexation, the shape Toronto has now. With sound.',
    body: 'The leaf is the pen. It draws the shore and creeks of 1802, the first city limits, each annexation in the order it happened, then the six municipalities that became one city, and last the shore as it is today. Every solid line is a mapped line; nothing is erased.',
    href: 'film.html',
    cta: 'Watch the map change'
  },
  {
    id: 'york-1813',
    kind: 'Walk',
    status: 'planned',
    title: 'York, 1813',
    line: 'The town and the fort on the morning of the battle.',
    body: 'A reconstruction from maps and records, built slowly and corrected in the open. Not started.'
  }
];

YP.LOG = [
  {
    date: '2026-11-13',
    text: 'The time lapse is a new film. It ran from 1700 to 1850 as a live 3D model; it is now a drawing in blue ink on old paper that runs from 1800 to 2025: one fixed view over the lake, across the islands to downtown, 72 seconds for the 225 years and then a rise to a plan of the city today. Forest is cut back, small houses spread, the shore is filled, the railway and the subway arrive, and fifteen landmarks go up in their true years. Under it is a timeline in seven periods, every entry from a named source. The year each ordinary building appears is a model, not a record, and the page says how it is worked out.'
  },
  {
    date: '2026-11-13',
    text: 'Scrolling with a finger: on a phone, a finger on any of the 3D models now always scrolls the page, whichever way the swipe starts. Before, a swipe that began a little sideways turned the model and the page stayed put, and while a model was still loading the page could not be moved from it at all. To turn a model by touch, press Turn with a finger on it; it lets go again when you press Done or scroll on. Held sideways, a phone no longer gives the whole screen to the model, and sliders let an up-or-down swipe through.'
  },
  {
    date: '2026-11-13',
    text: 'Section 3 of the home page, Reconstructing Toronto, is now three short recordings and six pictures from a new, more lifelike model built in Blender: above the bay and its sand bar, down onto the beach where bark canoes are drawn up, and along the lane between the longhouses of Teiaiagon. The ground, sand and bark are photographs; the trees have real branches and leaves. What rests on the record and what is our drawing is said under each picture, in plain words. The live 3D world you can walk around is still on the Explore page.'
  },
  {
    date: '2026-11-12',
    text: 'Next Stop, Toronto is now painted from end to end. The last stretch, 1954 to today, opens in the rain of Hurricane Hazel. The subway runs in an open cut in front of the street, as the Yonge line does north of Bloor, first in the red cars of 1954 and from 1990 in silver ones. Behind it the street changes from buff brick to concrete grids, sheer glass and balconied flats, with taller towers rising behind, street trees from the 1970s, and a sky that clears from the smoke of the coal years to blue. Seven more landmarks stand along it as small models: New City Hall, the TD tower, Ontario Place, the CN Tower, the Eaton Centre, SkyDome and the Crystal at the ROM. Every picture in the game is now made in Blender; the older 3D view remains only as a fallback.'
  },
  {
    date: '2026-11-12',
    text: 'Next Stop, Toronto: the streetcar\u2019s years, 1892 to 1954, are painted. The street grows up: brick shops give way to taller office blocks and then to stepped fronts with lit signs; the road goes from earth to asphalt; motor cars appear at the kerb, few and black at first; the tangle of wires thins. Eight landmarks stand along it as small models of themselves: the Legislative Building, Old City Hall, Casa Loma, the Prince Edward Viaduct, Union Station, the Royal York, the Bank of Commerce tower and Maple Leaf Gardens. They are far smaller than life and never stood on one street; only their dates are sourced. The streetcar runs under its wire with a spark at the pole. The game is now drawn from pictures up to 1954.'
  },
  {
    date: '2026-11-12',
    text: 'Next Stop, Toronto: the horsecar\u2019s years, 1861 to 1892, are painted too. The ride comes ashore onto a dirt street with the street railway\u2019s rails, a plank sidewalk and a row of brick shops that grow taller and gain mansard roofs as the years pass, with people on the sidewalk, telegraph and then telephone wires, factory chimneys and a smoky sky. Gas lamps give way to electric arc lamps in 1883, the one sourced thing in the scene. The horsecar is drawn by a trotting horse through eight moments of a stride. The game is now drawn from pictures up to 1892; after that it still uses its older 3D view.'
  },
  {
    date: '2026-11-12',
    text: 'Next Stop, Toronto, repainted: the canoe\u2019s years, 1690 to 1861, are now drawn from pictures made in Blender and no longer from blocks. One long picture of the north shore slides by: unbroken forest, then the garrison of 1793, cabins and a first church, frame houses, Worts\u2019s windmill, Montgomery\u2019s Tavern, gas lamps, St. Lawrence Hall, the first train and University College, with schooners and a steamer at the wharves. The canoe carries three paddlers through eight moments of a stroke. Only the six dated things are sourced, and only that they existed by their year; how everything looks is drawing. After 1861 the game still uses its older 3D view, until those years are painted too.'
  },
  {
    date: '2026-11-12',
    text: 'Same place, three moments is now three rendered pictures. The harbour was built as a 3D scene in Blender, free and open-source software, from the site\u2019s own data, and rendered from one camera at c.1700, 1834 and today, with a painted finish: forest and reeds, shallows, today\u2019s buildings to their heights, and the made land in orange. The slider and Play button fade between them. It is the first use of Blender on this site.'
  },
  {
    date: '2026-11-11',
    text: 'Same place, three moments: a new section on the c.1700 page. One view of the harbour is held still while a slider swaps the shore under it: as first mapped (Chewett, 1802 and 1834, standing in for c.1700), the city of 1834 with its limits, and today with its buildings. Land that was water or marsh on the first maps is hatched and sized. Also: every page that takes a fact from Wikipedia now says in its footer that those facts are not independently fact-checked.'
  },
  {
    date: '2026-11-11',
    text: 'Fixed on phones: a finger on a 3D model could only turn the model, so once it filled the screen the page could not be scrolled past it. An up-or-down swipe now moves the page; a sideways swipe turns the model and two fingers tilt and zoom it. Reported by a visitor.'
  },
  {
    date: '2026-11-11',
    text: 'Next Stop, Toronto: the rides come alive. The canoe now carries three paddlers who lean into each stroke on alternate sides. The horsecar\u2019s horse gallops, legs, neck and tail, with a faint beat of hooves under the fiddle. The streetcar and the subway sway a little and knock over the rail joints. The figures and the sounds are drawings made in code, not records of a crew, a horse or a TTC vehicle.'
  },
  {
    date: '2026-11-11',
    text: 'Five lines, one city: Ride the lines as a story in the Stories row. All five rapid transit lines are ridden one after another in about a minute; a title comes up for each line, the map of Toronto closes in on it, and its stations light one by one on the strip and on the map. It ends with every line on the whole city. Same OpenStreetMap data as the section on the home page; the pace is quicker than the section\u2019s and is a drawing, not a timetable.'
  },
  {
    date: '2026-11-11',
    text: 'Ride the lines: a new section on the home page. Pick one of the TTC\u2019s five rapid transit lines and its stations light up one by one on a strip like the map above a subway car\u2019s doors, while the same light moves across a map of Toronto (the city\u2019s limits, its six old municipalities, the lake, rivers and main roads), so each stop is shown where it is in the city. Choose any station, on the strip or on the map, to light it. Lines and stations are from OpenStreetMap; it is a drawing, not a timetable.'
  },
  {
    date: '2026-11-11',
    text: 'Every page now closes with a band above its footer: Toronto has more stories on the left and Many places. One Toronto. on the right, with links to the stories made so far and to this log.'
  },
  {
    date: '2026-11-11',
    text: 'The words in the stories were too small to read. The scrapbook had been drawn wide and shrunk to fit the tall frame, which took its text under 11 pixels on a phone and its labels to 6. It is now drawn at the width it is read, so on a phone the story text is about 15 pixels and nothing is under 11; on a desktop the page is enlarged. The captions over the timelapse, the village and the film are larger too, and on a phone the frame takes the whole width.'
  },
  {
    date: '2026-11-11',
    text: 'The five still pictures of the timelapse are gone from the home page and from its own page. The timelapse itself shows the change better, and the Play button on the home page now opens it in the story frame.'
  },
  {
    date: '2026-11-11',
    text: 'Stories now play in a tall frame, nine wide to sixteen high, the shape of a short video on a phone. A card on the home page opens its story in that frame; Maximize makes it as tall as the screen. The scrapbook sits in the same frame on its own page. The leaf-drawn film has a page of its own so it can be a story too.'
  },
  {
    date: '2026-11-11',
    text: 'The home page is now only the things to play, watch and explore. The working notes that sat below them (the world so far, the record behind the game, what the years bring, what it was drawn from, and this log) have moved to their own page, Behind the project, linked from the foot of every page.'
  },
  {
    date: '2026-11-11',
    text: 'A new kind of piece: stories. The first is a scrapbook of the CN Tower going up, in eleven pages that turn themselves. The pictures are archive photographs from Wikimedia Commons, most by Robert Taylor, redrawn in the browser as pencil-and-wash sketches; a button shows each as it was taken. Every page carries its date, what was being built, how high the tower stood and one thing few visitors know. The home page now has a row of stories, with the timelapse, the leaf-drawn film and the village on the trail beside it.'
  },
  {
    date: '2026-11-11',
    text: 'The timelapse now names eight buildings you can still visit, each going up in its year at its address: The Grange (1817), the Bank of Upper Canada (1827), Osgoode Hall (1832), Little Trinity (1843), the city hall on Front Street (1844), Holy Trinity (1847), St Michael\u2019s (1848) and St Lawrence Hall (1850).'
  },
  {
    date: '2026-11-11',
    text: 'The c.1700 world has real surfaces for the first time: photographed sand and forest floor on the ground, photographed bark on the trunks, a scanned fern in the undergrowth, and leaves at the edge of every broadleaf crown instead of a smooth lump. All are public-domain stand-ins from Poly Haven, not evidence of what grew here, and the page says so. The canoes, the conifers and the people are still simple shapes.'
  },
  {
    date: '2026-11-11',
    text: 'The game and both 3D worlds are now painted: each picture is drawn in 3D and then laid down again in flat dabs of colour, like gouache. In the timelapse the camera no longer sits still. It goes down to Fort Rouillé while it stands and burns, to the first ten blocks as they are laid out, to the garrison and the parliament in 1813, along the wharves in the 1840s and to the market block for the fire of 1849. The first town now shows its houses: early on, one drawn house stands for fewer people than it does by 1850, and the page gives the figures.'
  },
  {
    date: '2026-11-11',
    text: 'Next Stop, Toronto has a new start, a new finish and sound. The start screen tells the ride in two lines and shows how to play. Holding the button now carries a jump higher. The end screen shows how far you rode and which records you caught along the line. The music is a fiddle reel written for the game and played in the browser; it is not a period tune.'
  },
  {
    date: '2026-11-11',
    text: 'A second layer of the 3D world: a timelapse of the harbour from 1700 to 1850. The forest is cut back, Fort Rouillé stands and burns, York is laid out in 1793 and grows to a city of about thirty thousand. Dates and populations are from sources; the houses, streets, wharves and ships are drawn to match them. Five pictures from one fixed camera show the change.'
  },
  {
    date: '2026-11-11',
    text: 'Toronto, redrawn is drawn again, this time by a maple leaf rather than in maple leaves. The leaf is the pen: one unbroken line through the shore of 1802, the city of 1834, each annexation, the six municipalities and today\u2019s shore, ending as the outline of the city. In the 3D world the people are rebuilt as jointed bodies: they stand with their weight on one leg, bend to the corn, and walk the trail, the village and the beach. The light is warmer and hazier. They are still shapes made in code, not modelled or scanned people.'
  },
  {
    date: '2026-11-11',
    text: 'The 3D world now has two moments. About 1680 the Seneca village of Teiaiagon stands on its bluff above the Humber: longhouses of bark inside a palisade, corn round them, people at the doors and in the fields. About 1700 it is gone and the clearing is going back to brush. The houses follow what is recorded of Haudenosaunee longhouses and the one rebuilt at Ganondagan; the people\u2019s dress follows portraits painted in 1710. Where each house stood is invented, because no plan survives, and the page says so. The world was also redrawn with sunlight and shadow, water with shallows and foam, and trees with leaves, and every view now explains what it shows.'
  },
  {
    date: '2026-11-11',
    text: 'A second layer of the 3D world: Toronto around 1700, before the town. The ground is today\u2019s elevation model, the shore, marsh and creeks are from the earliest maps (1802, 1834, 1851), and land made since has been taken back out so the bay sits behind its sandbar again. The trail up the Humber and the place where Teiaiagon stood are marked. The trees are an impression, the canoes and people are for scale, and nobody\u2019s home is modelled, because nothing read so far says what stood here. Six snapshots from it are on the home page.'
  },
  {
    date: '2026-11-11',
    text: 'Next Stop, Toronto has more to see and more to catch. Six new records, from the 1837 rebellion on Yonge Street to the stopping of the Spadina Expressway in 1971, bring the count to twenty-one. Thirteen more dated things are in the landscape: eleven landmarks modelled in 3D, from Montgomery\u2019s Tavern (which burns in December 1837) to the Crystal at the ROM, and two storms, the one that made the peninsula an island in 1858 and Hurricane Hazel in 1954. The new models were built from written descriptions and are listed as not yet checked against a picture.'
  },
  {
    date: '2026-11-11',
    text: 'The game has a new name: Next Stop, Toronto. It was Carrying Place, and older notes below still call it that. The picture behind the title is now painted: the live 3D skyline and the maple leaves go through a filter that makes them read as oil on canvas. It is a painted look, not a period painting.'
  },
  {
    date: '2026-11-11',
    text: 'Toronto, redrawn is now drawn in 3D and in maple leaves: a leaf for each patch of ground, falling when that ground joined the city. Under it are the shore, marsh and creeks from seven maps of 1802 to 1878 (University of Toronto Map & Data Library), today\u2019s rivers and main roads, a timeline of every annexation, and a last scene showing the land made since 1834. The home page was rebuilt around three bands (play, watch, explore), with a live 3D skyline behind the title and the 3D shoreline on the page itself.'
  },
  {
    date: '2026-11-11',
    text: 'Toronto, redrawn: a 41-second film in code and sound of the city\u2019s limits from 1834 to 1998, drawn from the University of Toronto\u2019s annexation boundaries and the City\u2019s former-municipality boundaries. It replaces the planned film "Lines". The site also now works on phones, and the home page title sits on a red band.'
  },
  {
    date: '2026-11-10',
    text: 'Carrying Place is now drawn in 3D, and a new rule comes with it: models are built from period pictures. The four rides and the arc lamps were remodelled from archival photographs and a painting; everything else is listed as not yet checked.'
  },
  {
    date: '2026-11-10',
    text: 'The landscape in Carrying Place now changes with the year. Twelve dated landmarks and moments appear when they happened, from the 1793 garrison to SkyDome in 1989, and the city grows at the pace of its census counts.'
  },
  {
    date: '2026-11-10',
    text: 'Downtown buildings join the 3D shoreline: 9,155 footprints from OpenStreetMap. 1,010 use a recorded height, 3,973 are estimated from storey counts, and 4,172 have no height data and are drawn low and grey.'
  },
  {
    date: '2026-11-10',
    text: 'The 3D world begins with its first layer: the present-day Lake Ontario shoreline near downtown, 1,130 points of mainland shore and 18 island outlines from OpenStreetMap, with the CN Tower as a height marker.'
  },
  {
    date: '2026-11-10',
    text: 'The project starts. Carrying Place is playable with fifteen sourced records, from the portage trail to the 2010 settlement of the Toronto Purchase claim.'
  }
];
