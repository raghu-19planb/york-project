// What the game's landscape is built from. Two kinds of thing live here:
//
// 1. SOURCED: YP.POPULATION and YP.SCENERY. Each entry has a source that was
//    read. Population drives how built-up the city is drawn in a given year;
//    scenery entries appear in the landscape in the year they are dated to.
// 2. ILLUSTRATIVE: everything else landscape.js draws (ordinary houses, the
//    people, carts, cars and ships, the style of each decade). Those are an
//    impression of the period, not records, and are not listed here.
window.YP = window.YP || {};

YP.POPULATION = {
  source: 'Wikipedia, Demographics of Toronto (historical populations table)',
  url: 'https://en.wikipedia.org/wiki/Demographics_of_Toronto',
  // The table does not state its boundary; early rows are the old city and later
  // rows a larger area. Good enough to pace growth, not to compare decades exactly.
  note: 'Counts as tabulated; the area counted changes over time.',
  counts: [
    [1834, 9252], [1861, 65085], [1871, 75903], [1881, 113128], [1891, 165740],
    [1901, 238080], [1911, 409992], [1921, 611483], [1931, 818348], [1941, 909928],
    [1951, 1117470], [1956, 1358028], [1961, 1618787], [1966, 1881691], [1971, 2089729],
    [1976, 2124291], [1981, 2137395], [1986, 2192721], [1991, 2275771], [1996, 2385421],
    [2001, 2481494], [2006, 2503281], [2011, 2615060], [2016, 2731571], [2021, 2794356]
  ]
};

const TORONTO_HYDRO = 'https://www.toronto.ca/explore-enjoy/history-art-culture/online-exhibits/web-exhibits/web-exhibits-local-government/turning-on-toronto-a-history-of-toronto-hydro/turning-on-toronto-setting-the-scene';

YP.SCENERY = [
  {
    id: 'fort', at: 1793, label: '1793', title: 'The garrison',
    text: 'John Graves Simcoe ordered a garrison built on the site of Fort York.',
    source: 'The Friends of Fort York, History', url: 'https://friendsoffortyork.ca/history/'
  },
  {
    id: 'windmill', at: 1833, label: '1830s', title: 'Worts’s windmill',
    text: 'James Worts moved to Toronto in 1831 and built a prominent windmill on the waterfront. The business expanded into distilling in 1837.',
    source: 'Wikipedia, Gooderham and Worts', url: 'https://en.wikipedia.org/wiki/Gooderham_and_Worts'
  },
  {
    id: 'gaslamps', at: 1841, label: '1841', title: 'Gas lamps',
    text: 'The streets of Toronto were first lit with gas lamps in December 1841.',
    source: 'City of Toronto Archives, Turning on Toronto', url: TORONTO_HYDRO
  },
  {
    id: 'train', at: 1853, label: '1853', title: 'The first train',
    text: 'On 16 May the first train from Toronto reached Machell’s Corners, today’s Aurora, on the Ontario, Simcoe and Huron Railway.',
    source: 'Wikipedia, Northern Railway of Canada', url: 'https://en.wikipedia.org/wiki/Northern_Railway_of_Canada'
  },
  {
    id: 'arclamps', at: 1883, label: '1883', title: 'Electric street lights',
    text: 'Fifty arc lamps were put up along King, Queen and Yonge streets to show what electric light could do. In 1884 council split the street-lighting contract between gas and electricity.',
    source: 'City of Toronto Archives, Turning on Toronto', url: TORONTO_HYDRO
  },
  {
    id: 'oldcityhall', at: 1899, label: '1899', title: 'Old City Hall',
    text: 'Opened on 18 September. E. J. Lennox’s building has a clock tower 103.64 m tall.',
    source: 'Wikipedia, Old City Hall (Toronto)', url: 'https://en.wikipedia.org/wiki/Old_City_Hall_(Toronto)'
  },
  {
    id: 'royalyork', at: 1929, label: '1929', title: 'The Royal York',
    text: 'The hotel opened on 11 June and was the tallest building in the British Empire until 1931.',
    source: 'Wikipedia, Fairmont Royal York', url: 'https://en.wikipedia.org/wiki/Fairmont_Royal_York'
  },
  {
    id: 'commerce', at: 1931, label: '1931', title: 'The Bank of Commerce tower',
    text: 'Opened as the Canadian Bank of Commerce headquarters, 34 floors. It was the tallest building in the British Empire and Commonwealth until 1962.',
    source: 'Wikipedia, Commerce Court', url: 'https://en.wikipedia.org/wiki/Commerce_Court'
  },
  {
    id: 'cityhall', at: 1965, label: '1965', title: 'New City Hall',
    text: 'Opened on 13 September, to Viljo Revell’s competition-winning design.',
    source: 'Wikipedia, Toronto City Hall', url: 'https://en.wikipedia.org/wiki/Toronto_City_Hall'
  },
  {
    id: 'td', at: 1967, label: '1967', title: 'The TD tower',
    text: 'The Toronto-Dominion Bank Tower was completed, 222.8 m tall, designed in consultation with Ludwig Mies van der Rohe.',
    source: 'Wikipedia, Toronto-Dominion Centre', url: 'https://en.wikipedia.org/wiki/Toronto-Dominion_Centre'
  },
  {
    id: 'cntower', at: 1976, label: '1976', title: 'The CN Tower',
    text: 'Opened to the public on 26 June, standing 553.33 m.',
    source: 'The Canadian Encyclopedia, CN Tower', url: 'https://thecanadianencyclopedia.ca/en/article/cn-tower'
  },
  {
    id: 'skydome', at: 1989, label: '1989', title: 'SkyDome',
    text: 'The stadium opened on 3 June with a fully retractable roof. It was renamed Rogers Centre in 2005.',
    source: 'Wikipedia, Rogers Centre', url: 'https://en.wikipedia.org/wiki/Rogers_Centre'
  }
];
