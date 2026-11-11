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
    title: 'A town taking shape, 1700 to 1850',
    line: 'A 3D timelapse of the same ground: forest, Fort Rouillé, York, the battle of 1813, the city of 1834, and thirty thousand people by 1850.',
    body: 'One camera and a hundred and fifty years. The dates, the counts of people and the places of the forts, parliament, market, church and lighthouse are from sources. Every ordinary house and street is drawn to keep pace with them, and the page says so.',
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
