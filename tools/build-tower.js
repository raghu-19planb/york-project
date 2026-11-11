// Writes data/tower.js: the pages of the CN Tower scrapbook, each with its picture's credit.
//
//   node tools/build-tower.js
//
// The words are here; the credits come from images/tower/src/credits.json, which was written when the pictures
// were fetched from Wikimedia Commons (photographer, licence, the page each came from). Every figure in the text
// is from Wikipedia's CN Tower article unless the page says otherwise; the photographs' own descriptions on
// Commons say what each one shows.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), credits = JSON.parse(fs.readFileSync(path.join(root, 'images', 'tower', 'src', 'credits.json'), 'utf8'));
const TOP = 553.3; // metres, the height it was topped out at
const PAGES = [
  { id: '01-lands-1970', when: 'August 1970', title: 'Nothing but tracks', level: 0, mark: '0 m',
    text: 'This is the Railway Lands, a switching yard beside Union Station. A new yard north of the city had made it redundant in 1965. In 1968 Canadian National began to think about a tall mast here for television and radio.',
    shows: 'CP Rail’s train The Canadian leaving Union Station.' },
  { id: '02-skyline-1973', when: 'July 1973', title: 'The skyline without it', level: 0, mark: 'not yet above the rooftops',
    text: 'New office towers were the reason for the tower: they got in the way of television signals, and broadcasters needed antennas at least 300 m up. Work had begun that February, but from the Toronto Islands there is nothing to see yet.',
    shows: 'The skyline from the Toronto Islands. The first scan of this slide was mirrored; this is the corrected one.' },
  { id: '03-footings-1973', when: 'July 1973', title: 'A hole, then a foundation', level: 0.02, mark: 'ground level',
    text: 'Construction began on 6 February 1973. Crews took out 56,000 tonnes of earth and shale, 15 m deep at the centre, and poured a foundation 6.7 m thick. It took about four months.',
    shows: 'The footings in place and the form for the shaft starting up, with the roundhouses behind.' },
  { id: '04-base-1973', when: '1973', title: 'The form goes up', level: 0.1, mark: 'rising about 6 m a day',
    text: 'The shaft is hollow concrete on three legs. It was poured in a slipform, a mould that is jacked upward as the concrete under it sets. Here it rose about 6 m a day.',
    shows: 'Building the base of the tower.' },
  { id: '06-shaft-1974', when: 'May 1974', title: 'Canada’s tallest, and not finished', level: 381 / TOP, mark: 'over 381 m',
    text: 'Concrete was poured Monday to Friday until 22 February 1974: 40,500 cubic metres of it, mixed on the site. The shaft was already the tallest structure in Canada, and it stood out of true by only 29 mm.',
    shows: 'The finished shaft, with a crane on top ready to build the pod.' },
  { id: '07-concrete-1974', when: 'July 1974', title: 'The same skyline, a year on', level: 381 / TOP, mark: 'over 381 m',
    text: 'Turn back three pages and compare. That August work began on the main level: 45 hydraulic jacks raised twelve great bracket forms into place, which took about a week.',
    shows: 'The skyline from Ward’s Island, the yacht club in front.' },
  { id: '08-skycrane-1975', when: 'April 1975', title: 'Olga lifts the antenna', level: 0.93, mark: 'the antenna going on',
    text: 'The antenna was built on the ground in sections. A Sikorsky Skycrane helicopter nicknamed Olga first took down the crane, then carried the antenna up piece by piece. It took three and a half weeks. By crane it was planned to take six months.',
    shows: 'Olga coming in with another section.' },
  { id: '09-pod-1975', when: 'April 1975', title: 'Topped out', level: 1, mark: '553.3 m',
    text: 'On 31 March 1975 it became the tallest free-standing structure in the world. On 2 April it was topped out at 553.3 m, twenty-six months after work began.',
    shows: 'The main pod under construction.' },
  { id: '10-complete-1975', when: 'December 1975', title: 'Done outside, empty inside', level: 1, mark: '553.3 m',
    text: 'By December the outside was finished. Fitting out the inside took until the next summer.',
    shows: 'The tower with its outside complete.' },
  { id: '11-open-1976', when: 'August 1976', title: 'Open', level: 1, mark: '553.3 m',
    text: 'The tower opened to the public on 26 June 1976. It cost about 63 million dollars, repaid in fifteen years.',
    shows: 'The tower in its first summer.' },
  { id: '12-today', when: 'January 2023', title: 'Today', level: 1, mark: '553.3 m',
    text: 'It held the height record until 2007. A glass floor went in at 342 m in 1994, and the EdgeWalk round the outside of the pod opened in 2011. The railway lands are towers now, but trains still run past its foot.',
    shows: 'The tower from above the rail yard near Bathurst Street.' }
];
// One thing on each page that few visitors know. All from Wikipedia's CN Tower article.
const FACTS = {
  '01-lands-1970': 'CN stands for Canadian National, the railway that built it. Before the railway was privatised in 1995 it sold the tower to a federal Crown corporation, and the official name became Canada’s National Tower.',
  '02-skyline-1973': 'The first plan was not one tower but a tripod: three separate pillars joined together.',
  '03-footings-1973': 'It was meant to stand in the middle of a new downtown called Metro Centre. That plan was scrapped two years into the build, and the tower was left on its own.',
  '04-base-1973': 'The core is a hexagon, and the glass-fronted elevators run up its angles.',
  '06-shaft-1974': 'All the way up, the builders checked it against true vertical with massive plumb bobs.',
  '07-concrete-1974': 'The restaurant floor inside the pod turns all the way round once every 72 minutes.',
  '08-skycrane-1975': 'Olga had belonged to the US Army. Her flying times were printed in the Toronto papers, so people could come and watch.',
  '09-pod-1975': 'In 1995 the American Society of Civil Engineers named it one of the seven wonders of the modern world.',
  '10-complete-1975': 'There are 1,776 steps to the main deck and 2,579 to the top. The fastest climb on record is 7 minutes 52 seconds, by a police officer, Brendan Keenoy, in 1989.',
  '11-open-1976': 'In 1979 a stuntman, Dar Robinson, jumped off it for a film and was paid 250,000 dollars. In 1986 Dan Goodwin climbed the outside with his hands and feet, twice in one day.',
  '12-today': 'It makes its own winter hazard. In 2007 ice blown off the tower broke a taxi window about 490 m away. In 2018 falling ice went through the stadium roof next door, and a Blue Jays game was put off to the next day.'
};
for (const p of PAGES) { p.fact = FACTS[p.id]; if (!p.fact) throw new Error('no fact for ' + p.id); }
const pages = PAGES.map(p => {
  const c = credits.find(x => x.id === p.id); if (!c) throw new Error('no credit for ' + p.id);
  return Object.assign({}, p, { file: c.file, width: c.width, height: c.height, by: c.by, licence: c.licence, licenceUrl: c.licenceUrl, source: c.page, original: c.title });
});
const out = `// Generated by tools/build-tower.js. Do not edit by hand.
// The pages of the CN Tower scrapbook. Figures: Wikipedia, CN Tower. Pictures: Wikimedia Commons, each under the
// licence given with it; the sketches made from them on the page carry the same licence.
window.YP = window.YP || {};
YP.TOWER = ${JSON.stringify({ top: TOP, source: { title: 'Wikipedia, CN Tower', url: 'https://en.wikipedia.org/wiki/CN_Tower' }, pages }, null, 1)};
`;
fs.writeFileSync(path.join(root, 'data', 'tower.js'), out);
console.log('wrote data/tower.js:', pages.length, 'pages');
