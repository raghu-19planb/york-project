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
    id: 'tavern', at: 1837, label: '1837', title: 'Montgomery’s Tavern',
    text: 'The rebels of 1837 gathered at this inn on Yonge Street. After they were scattered on 7 December, the lieutenant governor ordered it burned down.',
    source: 'Wikipedia, Battle of Montgomery’s Tavern', url: 'https://en.wikipedia.org/wiki/Battle_of_Montgomery%27s_Tavern'
  },
  {
    id: 'gaslamps', at: 1841, label: '1841', title: 'Gas lamps',
    text: 'The streets of Toronto were first lit with gas lamps in December 1841.',
    source: 'City of Toronto Archives, Turning on Toronto', url: TORONTO_HYDRO
  },
  {
    id: 'stlawrence', at: 1850, label: '1850', title: 'St. Lawrence Hall',
    text: 'Built in 1850 and 1851 to William Thomas’s design, as a public hall with a thousand-seat ballroom under a cupola.',
    source: 'Wikipedia, St. Lawrence Hall', url: 'https://en.wikipedia.org/wiki/St._Lawrence_Hall'
  },
  {
    id: 'train', at: 1853, label: '1853', title: 'The first train',
    text: 'On 16 May the first train from Toronto reached Machell’s Corners, today’s Aurora, on the Ontario, Simcoe and Huron Railway.',
    source: 'Wikipedia, Northern Railway of Canada', url: 'https://en.wikipedia.org/wiki/Northern_Railway_of_Canada'
  },
  {
    id: 'island', at: 1858, label: '1858', title: 'The peninsula becomes an island',
    text: 'On 13 April a violent storm cut a channel about 150 m wide through the peninsula that sheltered the harbour, and destroyed two hotels on it.',
    source: 'Wikipedia, Toronto Islands', url: 'https://en.wikipedia.org/wiki/Toronto_Islands'
  },
  {
    id: 'uc', at: 1859, label: '1859', title: 'University College',
    text: 'The college’s building was finished in 1859, in a Norman Romanesque style by Frederick Cumberland and William Storm. A fire gutted its east wing in 1890.',
    source: 'Wikipedia, University College, Toronto', url: 'https://en.wikipedia.org/wiki/University_College,_Toronto'
  },
  {
    id: 'arclamps', at: 1883, label: '1883', title: 'Electric street lights',
    text: 'Fifty arc lamps were put up along King, Queen and Yonge streets to show what electric light could do. In 1884 council split the street-lighting contract between gas and electricity.',
    source: 'City of Toronto Archives, Turning on Toronto', url: TORONTO_HYDRO
  },
  {
    id: 'queenspark', at: 1893, label: '1893', title: 'The Legislative Building',
    text: 'Opened on 4 April at Queen’s Park, built of pink Ontario sandstone to Richard Waite’s design.',
    source: 'Wikipedia, Ontario Legislative Building', url: 'https://en.wikipedia.org/wiki/Ontario_Legislative_Building'
  },
  {
    id: 'oldcityhall', at: 1899, label: '1899', title: 'Old City Hall',
    text: 'Opened on 18 September. E. J. Lennox’s building has a clock tower 103.64 m tall.',
    source: 'Wikipedia, Old City Hall (Toronto)', url: 'https://en.wikipedia.org/wiki/Old_City_Hall_(Toronto)'
  },
  {
    id: 'casaloma', at: 1914, label: '1914', title: 'Casa Loma',
    text: 'Built from 1911 to 1914 for the financier Sir Henry Pellatt, to E. J. Lennox’s design: 98 rooms, the largest private house in Canada at the time.',
    source: 'Wikipedia, Casa Loma', url: 'https://en.wikipedia.org/wiki/Casa_Loma'
  },
  {
    id: 'viaduct', at: 1918, label: '1918', title: 'The Prince Edward Viaduct',
    text: 'Opened on 18 October, carrying Bloor Street 40 m above the Don Valley to Danforth Avenue. Its lower deck was built for trains that did not come until 1966.',
    source: 'Wikipedia, Prince Edward Viaduct', url: 'https://en.wikipedia.org/wiki/Prince_Edward_Viaduct'
  },
  {
    id: 'union', at: 1927, label: '1927', title: 'Union Station',
    text: 'Opened on 6 August by the Prince of Wales. Its Front Street face has 22 limestone columns, each about 12 m high.',
    source: 'Wikipedia, Union Station (Toronto)', url: 'https://en.wikipedia.org/wiki/Union_Station_(Toronto)'
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
    id: 'gardens', at: 1931, label: '1931', title: 'Maple Leaf Gardens',
    text: 'Opened on 12 November at Carlton and Church streets, built in five months and two weeks.',
    source: 'Wikipedia, Maple Leaf Gardens', url: 'https://en.wikipedia.org/wiki/Maple_Leaf_Gardens'
  },
  {
    id: 'hazel', at: 1954, label: '1954', title: 'Hurricane Hazel',
    text: 'The storm reached Toronto on the evening of 15 October. Eighty-one people died in Canada, 35 of them on Raymore Drive beside the Humber. Flooded valley land was later made parkland.',
    source: 'Wikipedia, Effects of Hurricane Hazel in Canada', url: 'https://en.wikipedia.org/wiki/Effects_of_Hurricane_Hazel_in_Canada'
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
    id: 'ontarioplace', at: 1971, label: '1971', title: 'Ontario Place',
    text: 'Opened on 22 May: pavilions on columns over the lake, and the Cinesphere, the first permanent IMAX theatre.',
    source: 'Wikipedia, Ontario Place', url: 'https://en.wikipedia.org/wiki/Ontario_Place'
  },
  {
    id: 'cntower', at: 1976, label: '1976', title: 'The CN Tower',
    text: 'Opened to the public on 26 June, standing 553.33 m.',
    source: 'The Canadian Encyclopedia, CN Tower', url: 'https://thecanadianencyclopedia.ca/en/article/cn-tower'
  },
  {
    id: 'eaton', at: 1977, label: '1977', title: 'The Eaton Centre',
    text: 'The first phase opened in 1977: a galleria under a vaulted glass roof, modelled on the Galleria Vittorio Emanuele II in Milan.',
    source: 'Wikipedia, Toronto Eaton Centre', url: 'https://en.wikipedia.org/wiki/Toronto_Eaton_Centre'
  },
  {
    id: 'skydome', at: 1989, label: '1989', title: 'SkyDome',
    text: 'The stadium opened on 3 June with a fully retractable roof. It was renamed Rogers Centre in 2005.',
    source: 'Wikipedia, Rogers Centre', url: 'https://en.wikipedia.org/wiki/Rogers_Centre'
  },
  {
    id: 'crystal', at: 2007, label: '2007', title: 'The Crystal at the ROM',
    text: 'Daniel Libeskind’s addition to the Royal Ontario Museum opened in June, clad in aluminium and glass. The museum itself had opened in 1914.',
    source: 'Wikipedia, Royal Ontario Museum', url: 'https://en.wikipedia.org/wiki/Royal_Ontario_Museum'
  }
];
