// Visual references. The rule for this project: anything historical that is
// drawn or modelled should be based on a period source that was actually
// looked at (a painting, a plan, an archival photograph), and listed here.
// Anything not yet checked is listed under UNCHECKED so it is never mistaken
// for an accurate depiction.
window.YP = window.YP || {};

const COMMONS = 'https://commons.wikimedia.org/wiki/File:';

YP.REFERENCES = [
  {
    item: 'Toronto, redrawn (the boundaries)',
    refs: [
      { title: 'City of Toronto Historical Annexation Boundaries, 1834-1967 (Marcel Fortin, University of Toronto Map & Data Library, CC BY 4.0)', url: 'https://doi.org/10.5683/SP3/XN2NRW' },
      { title: 'Former Municipality Boundaries (City of Toronto Open Data)', url: 'https://open.toronto.ca/dataset/former-municipality-boundaries/' }
    ],
    took: 'Every outline, its name, its number and its date, unchanged apart from simplifying the lines to about 15 m.',
    caveat: 'The thirteen municipalities of 1954 are not drawn individually; the six shown are as they stood from 1967. The maple leaves, their colours and the terrace heights are a way of drawing the outlines, not data.'
  },
  {
    item: 'Toronto, redrawn (the old shore, marsh and creeks)',
    refs: [
      { title: 'Historical Hydrography of Toronto, 1802-1886 (Marcel Fortin, University of Toronto Map & Data Library, CC BY-SA 4.0)', url: 'https://doi.org/10.5683/SP2/IYS0K9' }
    ],
    took: 'The shoreline, marsh and creeks as traced by the library from seven georeferenced maps: William Chewett 1802 and 1834, James Cane 1842, J.O. Browne 1851, Waterlow & Sons 1857, Wadsworth & Unwin 1872, Hart & Rawlinson 1878. Lines simplified to about 8 m.',
    caveat: 'The tracings were used, not the map sheets themselves, which have not been looked at here. Each map covers a different area, so the film cannot show when a creek was buried. Three more tracings in the data file (Fleming 1853, Cotterell 1878, Speight & Van Nostrand 1886) are not in the film.'
  },
  {
    item: 'Toronto, redrawn (land made since 1834)',
    refs: [
      { title: 'Historical Hydrography of Toronto: Chewett’s 1834 map', url: 'https://doi.org/10.5683/SP2/IYS0K9' },
      { title: 'Lake Ontario shoreline today (OpenStreetMap relation 1206310, ODbL)', url: 'https://www.openstreetmap.org/relation/1206310' }
    ],
    took: 'Ground inside the 1834 limits that the 1834 tracing shows as water and today’s shoreline shows as land.',
    caveat: 'Only the two ends are compared, sampled on a coarse grid, between about Bathurst Street and the Don. The film does not say when any of it was filled.'
  },
  {
    item: 'The canoe',
    refs: [
      { title: 'Birchbark canoe, Abbe Museum, Bar Harbor, Maine (photograph)', url: COMMONS + 'Birchbark_canoe,_Abbe_Museum,_Bar_Harbor,_ME_IMG_2301.JPG' },
      { title: 'Frances Anne Hopkins, Shooting the Rapids (painting, 1879)', url: COMMONS + 'FAHopkins_Shooting_Rapids.jpg' }
    ],
    took: 'Pale bark hull, upswept pointed ends, dark gunwales, thwarts across the top.',
    caveat: 'These show the birchbark canoe as a type. Neither is a documented canoe of the Mississaugas at Toronto; a local reference is still needed.'
  },
  {
    item: 'The horsecar',
    refs: [
      { title: 'Toronto Street Railway Co. horse-car 145 on King Street, from Church Street (photograph)', url: COMMONS + 'Toronto_Street_Railway_Co._horse-car_145_on_King_street._View_from_Church_street.jpg' }
    ],
    took: 'Short enclosed body, clerestory roof carried over open end platforms, driver standing at the front.',
    caveat: 'Black-and-white photograph: the red and yellow paint is a guess.'
  },
  {
    item: 'The electric streetcar',
    refs: [
      { title: 'Toronto Railway Company, group D-2, car 718 (photograph)', url: COMMONS + 'Toronto_Railway_Company,_group_D-2,_car_718.jpg' },
      { title: 'Single-truck open car on the Dovercourt route, 1899 (City of Toronto Archives, Series 71, item 3372)', url: COMMONS + 'A_streetcar_on_Dovercourt_in_1899.jpg' }
    ],
    took: 'Single truck with the wheels close together, clerestory roof, large windows, end platforms, trolley pole.',
    caveat: 'Black-and-white photographs: the red and cream paint is a guess. One car type stands in for 1892 to 1953.'
  },
  {
    item: 'The subway car',
    refs: [
      { title: 'A G-series train at Rosedale station, about 1971 (colour photograph)', url: COMMONS + 'The_Red_Rocket_(1).jpg' }
    ],
    took: 'Red sides, thin yellow lines at the belt and under the roof, grey roof, paired windows, flat end with three windows and a destination sign.',
    caveat: 'The 1954 cars stand in for every year to 2026.'
  },
  {
    item: 'Electric arc street lamps',
    refs: [
      { title: 'Toronto Street Railway Co. horse-car 145 on King Street (the lamp in the foreground)', url: COMMONS + 'Toronto_Street_Railway_Co._horse-car_145_on_King_street._View_from_Church_street.jpg' }
    ],
    took: 'Tall wooden pole, long bracket arm, globe hanging from the end of the arm.',
    caveat: ''
  }
];

YP.UNCHECKED = [
  'The landmarks: the garrison, Worts’s windmill, Old City Hall, the Royal York, the Bank of Commerce tower, New City Hall, the TD tower, the CN Tower, SkyDome',
  'The landmarks added on 2026-11-11, which were modelled from written descriptions on the pages they cite and not from pictures: Montgomery’s Tavern, St. Lawrence Hall, University College, the Legislative Building, Casa Loma, the Prince Edward Viaduct, Union Station, Maple Leaf Gardens, Ontario Place, the Eaton Centre, the Crystal at the ROM. Their colours, and any detail the page does not describe, are guesses',
  'Ordinary buildings of every period',
  'People and their clothing',
  'Carts, cars, bicycles, ships and the 1853 train',
  'Gas lamps and modern street lights',
  'Obstacles on the track',
  'The 2D fallback drawings',
  'The home page picture: the footprints and recorded heights are real, but the oil-painting look is a filter and no period painting was consulted for its sky, light or colour; the blowing leaves are decoration'
];
