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
    line: 'The city\u2019s limits from 1834 to 1998, laid down in maple leaves, in 3D, with sound.',
    body: 'The shore and creeks of seven old maps, fifty annexations in the order they happened, then thirteen municipalities, then six, then one. Every outline is a mapped boundary.',
    href: '#redrawn',
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
