// The record: every card in the game and on the landing page comes from here.
// Rule: nothing goes in this file without a source that was actually read.
// `at` is where the card sits on the game's timeline; `label` is what is shown.
window.YP = window.YP || {};

// One <li> for a record, used by the landing page and the game's end screen.
YP.recordItem = function (r) {
  const li = document.createElement('li');
  const yr = document.createElement('div');
  yr.className = 'yr';
  yr.textContent = r.label;
  const body = document.createElement('div');
  const h = document.createElement('h3');
  h.textContent = r.title;
  const p = document.createElement('p');
  p.textContent = r.text;
  const src = document.createElement('div');
  src.className = 'src';
  const a = document.createElement('a');
  a.href = r.url; a.target = '_blank'; a.rel = 'noopener';
  a.textContent = r.source;
  src.append('Source: ', a);
  body.append(h, p, src);
  li.append(yr, body);
  return li;
};

YP.RECORDS = [
  {
    at: 1715, label: 'Before York',
    title: 'The Carrying Place',
    text: 'A portage trail ran north from Lake Ontario by the Humber toward Lake Simcoe, about 80 km. First Nations travellers used it for centuries before French and English fur traders followed.',
    source: 'Wikipedia, Toronto Carrying-Place Trail',
    url: 'https://en.wikipedia.org/wiki/Toronto_Carrying-Place_Trail'
  },
  {
    at: 1787, label: '1787',
    title: 'The Toronto Purchase',
    text: 'British officials and the Mississaugas of the Credit made a land agreement. Its terms were disputed, and a second indenture in 1805 tried to confirm it. Both are registered as Treaty 13.',
    source: 'The Canadian Encyclopedia, Toronto Purchase (Treaty 13)',
    url: 'https://thecanadianencyclopedia.ca/en/article/toronto-purchase-treaty-13'
  },
  {
    at: 1793, label: '1793',
    title: 'A garrison at York',
    text: 'Lieutenant Governor John Graves Simcoe ordered a garrison built where Fort York stands. He wanted a naval base to control Lake Ontario.',
    source: 'The Friends of Fort York, History',
    url: 'https://friendsoffortyork.ca/history/'
  },
  {
    at: 1813, label: '1813',
    title: 'The Battle of York',
    text: 'On 27 April about 2,700 American troops on fourteen vessels attacked the town. The retreating British blew up the fort’s gunpowder magazine; the blast killed or wounded 250 Americans.',
    source: 'The Friends of Fort York, History',
    url: 'https://friendsoffortyork.ca/history/'
  },
  {
    at: 1834, label: '1834',
    title: 'York becomes Toronto',
    text: 'On 6 March the Town of York was incorporated as the City of Toronto. William Lyon Mackenzie became its first mayor.',
    source: 'Wikipedia, History of Toronto',
    url: 'https://en.wikipedia.org/wiki/History_of_Toronto'
  },
  {
    at: 1837, label: '1837',
    title: 'Rebellion on Yonge Street',
    text: 'On 7 December about a thousand government troops and militia marched up Yonge Street and scattered the rebels gathered at Montgomery’s Tavern. The tavern was burned on the lieutenant governor’s order.',
    source: 'Wikipedia, Battle of Montgomery’s Tavern',
    url: 'https://en.wikipedia.org/wiki/Battle_of_Montgomery%27s_Tavern'
  },
  {
    at: 1849, label: '1849',
    title: 'The omnibus',
    text: 'Public transportation in Toronto started with H.B. Williams’s horse-drawn omnibus, running between Yorkville and the market.',
    source: 'City of Toronto Archives, The TTC: 100 Years of Moving Toronto',
    url: 'https://www.toronto.ca/explore-enjoy/history-art-culture/online-exhibits/web-exhibits/web-exhibits-transportation/the-ttc-100-years-of-moving-toronto/setting-the-scene/'
  },
  {
    at: 1858, label: '1858',
    title: 'The peninsula becomes an island',
    text: 'On 13 April a violent storm cut a channel about 150 m wide through the sand peninsula that sheltered the harbour. It has been an island ever since.',
    source: 'Wikipedia, Toronto Islands',
    url: 'https://en.wikipedia.org/wiki/Toronto_Islands'
  },
  {
    at: 1861, label: '1861',
    title: 'Rails on Yonge Street',
    text: 'The Toronto Street Railway, holding a 30-year franchise from the city, opened its horse-drawn Yonge line on 11 September.',
    source: 'City of Toronto Archives, The TTC: 100 Years of Moving Toronto',
    url: 'https://www.toronto.ca/explore-enjoy/history-art-culture/online-exhibits/web-exhibits/web-exhibits-transportation/the-ttc-100-years-of-moving-toronto/setting-the-scene/'
  },
  {
    at: 1892, label: '1892',
    title: 'Electric cars',
    text: 'The Toronto Railway Company’s first electric car made a trial run on 10 August. Scheduled electric service began on Church Street five days later. The last horsecar ran in 1894.',
    source: 'Wikipedia, Toronto Railway Company',
    url: 'https://en.wikipedia.org/wiki/Toronto_Railway_Company'
  },
  {
    at: 1904, label: '1904',
    title: 'The Great Fire',
    text: 'On the evening of 19 April a fire began on Wellington Street west of Bay. No one died, but damage was put at $10 million and about 5,000 people lost their jobs.',
    source: 'City of Toronto Archives, The Great Fire of 1904',
    url: 'https://www.toronto.ca/city-government/accountability-operations-customer-service/access-city-information-or-records/city-of-toronto-archives/whats-online/web-exhibits/the-great-fire-of-1904/'
  },
  {
    at: 1918, label: '1918',
    title: 'A bridge over the Don',
    text: 'The Prince Edward Viaduct opened on 18 October, carrying Bloor Street 40 m above the Don Valley to Danforth Avenue. It was built with a lower deck for trains; the subway did not use it until 1966.',
    source: 'Wikipedia, Prince Edward Viaduct',
    url: 'https://en.wikipedia.org/wiki/Prince_Edward_Viaduct'
  },
  {
    at: 1921, label: '1921',
    title: 'The TTC takes over',
    text: 'On 1 September the city handed the private Toronto Railway Company and its own Civic Railways to the new Toronto Transportation Commission.',
    source: 'City of Toronto Archives, The TTC: 100 Years of Moving Toronto',
    url: 'https://www.toronto.ca/explore-enjoy/history-art-culture/online-exhibits/web-exhibits/web-exhibits-transportation/the-ttc-100-years-of-moving-toronto/setting-the-scene/'
  },
  {
    at: 1927, label: '1927',
    title: 'Union Station opens',
    text: 'The Prince of Wales opened the station on 6 August, cutting a ribbon with gold scissors. Building had begun in 1914, and the train shed was not finished until 1930.',
    source: 'Wikipedia, Union Station (Toronto)',
    url: 'https://en.wikipedia.org/wiki/Union_Station_(Toronto)'
  },
  {
    at: 1954, label: '1954',
    title: 'Canada’s first subway',
    text: 'The Yonge line opened on 30 March between Union Station and Eglinton. The first train rolled out of Davisville station.',
    source: 'Archives of Ontario, Toronto’s subway milestones',
    url: 'https://www.archives.gov.on.ca/en/explore/online/subway/milestones.aspx'
  },
  {
    at: 1965, label: '1965',
    title: 'New City Hall',
    text: 'Opened on 13 September. Viljo Revell’s design was picked from 540 entries in an international competition held in 1958.',
    source: 'Wikipedia, Toronto City Hall',
    url: 'https://en.wikipedia.org/wiki/Toronto_City_Hall'
  },
  {
    // Placed at 1968 so its card does not land on the 1965 one; the label carries the real year.
    at: 1968, label: '1967',
    title: 'Caribana',
    text: 'The first Caribana was held in 1967, organised by Toronto’s West Indian community to mark Canada’s centennial. It became the Toronto Caribbean Carnival.',
    source: 'Wikipedia, Toronto Caribbean Carnival',
    url: 'https://en.wikipedia.org/wiki/Toronto_Caribbean_Carnival'
  },
  {
    at: 1971, label: '1971',
    title: 'The expressway is stopped',
    text: 'On 3 June the Ontario government withdrew its support for the Spadina Expressway. Residents had campaigned against it since 1969. A subway line was built along part of its route instead and opened in 1978.',
    source: 'Wikipedia, Spadina Expressway',
    url: 'https://en.wikipedia.org/wiki/Spadina_Expressway'
  },
  {
    at: 1976, label: '1976',
    title: 'The CN Tower',
    text: 'Opened to the public on 26 June, standing 553.33 m.',
    source: 'The Canadian Encyclopedia, CN Tower',
    url: 'https://thecanadianencyclopedia.ca/en/article/cn-tower'
  },
  {
    at: 1998, label: '1998',
    title: 'One city from six',
    text: 'On 1 January Metropolitan Toronto and its six municipalities (Toronto, East York, Etobicoke, North York, Scarborough and York) were merged into a single City of Toronto.',
    source: 'Wikipedia, Amalgamation of Toronto',
    url: 'https://en.wikipedia.org/wiki/Amalgamation_of_Toronto'
  },
  {
    at: 2010, label: '2010',
    title: 'The claim is settled',
    text: 'On 8 June the Government of Canada agreed to pay $145 million to the Mississaugas of the Credit to settle the Toronto Purchase claim.',
    source: 'Toronto Public Library, Remembering the Toronto Purchase and its Settlement',
    url: 'https://tpl.ca/blogs/post/remembering-the-toronto-purchase-and-its-settlement-june-8-snapshots-in-history/'
  }
];
