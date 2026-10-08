// Site taxonomy and page definitions. Restaurant facts live in data/restaurants.json.

export const SITE = {
  name: 'Restaurant Honolulu',
  url: 'https://restauranthonolulu.com',
  phone: '1-800-481-8638',
  phoneHref: 'tel:+18004818638',
  formAction: 'https://formsubmit.co/info@eyetoad.com',
  thanks: 'https://restauranthonolulu.com/advertise/thanks/',
  gsv: 'icW4qYCnlgvHEoVnnSu2Kq708ajPRLDUub723g8njgQ',
  tz: 'Pacific/Honolulu',
};

// Pop-up Domination intro offer. The struck price is the regular price.
export const PROMO = {
  regular: 2500,
  intro: 250,
  ends: '2026-12-31',
  endsLabel: 'December 31, 2026',
};

export const PLANS = [
  { id: 'claim', name: 'Claim', price: 0, per: 'free', points: ['Confirm your hours, phone and address', 'Fix mistakes on your page', 'Get an email when a visitor reports a change'] },
  { id: 'verified', name: 'Verified', price: 25, per: '/mo', points: ['“Verified by owner” badge', 'Your link, menu link and reservations link', 'Hours updates within one business day', 'Same $25 listing we have always offered'] },
  { id: 'featured', name: 'Featured', price: 75, per: '/mo', hi: true, points: ['Everything in Verified', 'Featured slot on your neighborhood and cuisine pages (labeled Sponsored)', 'Highlighted card in the directory'] },
  { id: 'premium', name: 'Premium', price: 150, per: '/mo', points: ['Everything in Featured', 'Photo gallery and full menu on your page', 'Deals and happy-hour specials box', 'Quarterly listing review'] },
];

export const SEO_ADDON = {
  name: 'SEO optimization add-on',
  price: 199, per: '/mo',
  points: ['Google Business Profile tune-up and monthly posts', 'Restaurant schema and menu markup on your own site', 'Citation cleanup (Yelp, Apple Maps, Bing, TripAdvisor)', 'Monthly ranking report for your top searches'],
};

// Neighborhoods. `legacy` = existing URL that stays the canonical page.
export const NEIGHBORHOODS = [
  { slug: 'waikiki', name: 'Waikīkī', legacy: '/waikiki-restaurants/', lat: 21.2793, lng: -157.8292, area: 'town', blurb: 'Hotel restaurants, beachfront bars and the densest walkable dining on Oʻahu.', tips: ['Sunset tables at beachfront rooms book out a week or more ahead.', 'Kalākaua and Kūhiō avenues have the walk-in breakfast and ramen spots.', 'Most hotel restaurants validate parking; street parking is scarce after 5 pm.'] },
  { slug: 'kapahulu', name: 'Kapahulu', lat: 21.2780, lng: -157.8150, area: 'town', blurb: 'The avenue just past Waikīkī: malasadas, poke, plate lunch and shave ice within a mile.', tips: ['A 10–15 minute walk from the Diamond Head end of Waikīkī.', 'Small lots fill at lunch; side streets have free parking.'] },
  { slug: 'kaimuki', name: 'Kaimukī', lat: 21.2810, lng: -157.8000, area: 'town', blurb: 'Waiʻalae Avenue is Honolulu’s chef-driven restaurant row.', tips: ['Metered street parking along Waiʻalae Ave; free after 6 pm on side streets.', 'Many dinner spots close Sunday or Monday.'] },
  { slug: 'kahala', name: 'Kāhala', lat: 21.2700, lng: -157.7730, area: 'town', blurb: 'The Kāhala Hotel and Kāhala Mall, ten minutes east of Waikīkī.', tips: [] },
  { slug: 'diamond-head', name: 'Diamond Head', lat: 21.2610, lng: -157.8060, area: 'town', blurb: 'Oceanfront rooms on the quiet side of Kapiʻolani Park.', tips: [] },
  { slug: 'moiliili', name: 'Mōʻiliʻili', lat: 21.2930, lng: -157.8230, area: 'town', blurb: 'Near UH Mānoa: cheap Japanese, Korean and okazuya.', tips: [] },
  { slug: 'mccully', name: 'McCully', lat: 21.2920, lng: -157.8330, area: 'town', blurb: 'Strip-mall Korean, Japanese and Vietnamese between Waikīkī and Mōʻiliʻili.', tips: [] },
  { slug: 'manoa', name: 'Mānoa', lat: 21.3070, lng: -157.8100, area: 'town', blurb: 'Valley neighborhood near the university and the Mānoa Falls trail.', tips: [] },
  { slug: 'ala-moana', name: 'Ala Moana', legacy: '/ala-moana-restaurants/', lat: 21.2911, lng: -157.8434, area: 'town', blurb: 'Ala Moana Center and the blocks around it — the biggest food court and sit-down cluster in town.', tips: ['Ala Moana Center parking is free.', 'The Lanai food hall and Shirokiya Japan Village Walk are the quick-lunch options.'] },
  { slug: 'kakaako', name: 'Kakaʻako', legacy: '/kakaako-restaurants/', includes: ['ward'], lat: 21.2960, lng: -157.8600, area: 'town', blurb: 'Former warehouse district between Ala Moana and Downtown: breweries, bars and Ward Village.', tips: ['SALT at Our Kakaʻako has a paid garage; Ward Village garages validate.'] },
  { slug: 'ward', name: 'Ward Village', parent: 'kakaako', lat: 21.2945, lng: -157.8550, area: 'town', blurb: 'Ward Village blocks, part of Kakaʻako.', tips: [] },
  { slug: 'downtown', name: 'Downtown', lat: 21.3070, lng: -157.8620, area: 'town', blurb: 'Weekday lunch counters and the Aloha Tower cruise pier.', tips: ['Many downtown lunch spots close by 2 pm and on weekends.'] },
  { slug: 'chinatown', name: 'Chinatown', legacy: '/chinatown-honolulu/', lat: 21.3115, lng: -157.8625, area: 'town', blurb: 'Dim sum, noodle houses, fish markets and Honolulu’s best cocktail bars in a few blocks.', tips: ['Municipal garages on Smith and Beretania streets are the easy parking.', 'Go early for dim sum and the morning fish markets on Kekaulike St.'] },
  { slug: 'kalihi', name: 'Kalihi', lat: 21.3290, lng: -157.8710, area: 'town', blurb: 'Working neighborhood with old-school Hawaiian food, Filipino spots and plate lunch.', tips: [] },
  { slug: 'liliha', name: 'Liliha', lat: 21.3220, lng: -157.8560, area: 'town', blurb: 'Home of Liliha Bakery and neighborhood diners.', tips: [] },
  { slug: 'nuuanu', name: 'Nuʻuanu', lat: 21.3200, lng: -157.8480, area: 'town', blurb: 'Valley road above Chinatown.', tips: [] },
  { slug: 'makiki', name: 'Makiki', lat: 21.3040, lng: -157.8350, area: 'town', blurb: 'Residential Honolulu above Ala Moana.', tips: [] },
  { slug: 'salt-lake', name: 'Salt Lake', lat: 21.3500, lng: -157.9100, area: 'town', blurb: 'Neighborhood above the airport.', tips: [] },
  { slug: 'airport', name: 'Airport & Iwilei', lat: 21.3330, lng: -157.9000, area: 'town', blurb: 'Nimitz Highway, Māpunapuna and Iwilei — the last good meals before a flight.', tips: [] },
  { slug: 'aiea-pearl-city', name: 'ʻAiea & Pearl City', lat: 21.3870, lng: -157.9420, area: 'central', blurb: 'Pearl Harbor’s neighbors: Pearlridge, local diners and plate lunch.', tips: [] },
  { slug: 'waipahu', name: 'Waipahu', lat: 21.3870, lng: -158.0090, area: 'west', blurb: 'Filipino food and plantation-town local spots.', tips: [] },
  { slug: 'kapolei', name: 'Kapolei & Ko Olina', lat: 21.3360, lng: -158.0800, area: 'west', blurb: 'Ko Olina resorts and Kapolei’s growing west-side dining.', tips: [] },
  { slug: 'ewa', name: 'ʻEwa', lat: 21.3330, lng: -158.0400, area: 'west', blurb: 'ʻEwa Beach and Hoakalei.', tips: [] },
  { slug: 'waianae', name: 'Waiʻanae', lat: 21.4440, lng: -158.1860, area: 'west', blurb: 'Leeward coast local food.', tips: [] },
  { slug: 'hawaii-kai', name: 'Hawaiʻi Kai', lat: 21.2870, lng: -157.7040, area: 'east', blurb: 'Marina-side dining on the way to Hanauma Bay and Makapuʻu.', tips: [] },
  { slug: 'kailua', name: 'Kailua', legacy: '/kailua-restaurants/', lat: 21.3970, lng: -157.7390, area: 'windward', blurb: 'Beach town 25 minutes from Waikīkī: breakfast spots, poke and acai near Kailua Beach.', tips: ['Breakfast lines are longest 8–10 am on weekends.', 'Parking at Kailua Town lots is free but tight on weekends.'] },
  { slug: 'kaneohe', name: 'Kāneʻohe', lat: 21.4100, lng: -157.8000, area: 'windward', blurb: 'Windward local spots below the Koʻolau cliffs.', tips: [] },
  { slug: 'waimanalo', name: 'Waimānalo', lat: 21.3420, lng: -157.7160, area: 'windward', blurb: 'Farm-town food stops near Waimānalo Beach.', tips: [] },
  { slug: 'north-shore', name: 'North Shore', lat: 21.5930, lng: -158.1030, area: 'north', blurb: 'Haleʻiwa town, shrimp trucks in Kahuku and shave ice — the classic day-trip loop.', tips: ['Shrimp trucks are cash-friendly but most take cards now; lines peak noon–2 pm.', 'Haleʻiwa traffic is heaviest on winter weekends during big surf.'] },
  { slug: 'wahiawa', name: 'Wahiawā', lat: 21.5030, lng: -158.0240, area: 'central', blurb: 'Central Oʻahu stop between town and the North Shore.', tips: [] },
  { slug: 'mililani', name: 'Mililani', lat: 21.4510, lng: -158.0150, area: 'central', blurb: 'Central Oʻahu suburb.', tips: [] },
];

export const AREAS = { town: 'Honolulu', east: 'East Honolulu', windward: 'Windward side', north: 'North Shore', central: 'Central Oʻahu', west: 'West Oʻahu' };

// Cuisines. `legacy` = existing URL that stays canonical.
export const CUISINES = [
  { slug: 'hawaiian', name: 'Hawaiian food', legacy: '/hawaiian-food-honolulu/', photo: 'hawaiian', blurb: 'Kalua pig, laulau, poi, lomi salmon, squid lūʻau and haupia.' },
  { slug: 'local-plate-lunch', name: 'Plate lunch & local food', photo: 'plate-lunch', blurb: 'Two scoops rice, mac salad and a main: loco moco, chicken katsu, garlic chicken.' },
  { slug: 'poke', name: 'Poke', legacy: '/poke-honolulu/', photo: 'poke', blurb: 'Cubed raw fish — usually ahi — sold by the pound or as a bowl.' },
  { slug: 'seafood', name: 'Seafood', photo: 'seafood', blurb: 'Fish markets, garlic shrimp and fresh catch.' },
  { slug: 'sushi', name: 'Sushi', legacy: '/sushi-honolulu/', photo: 'sushi', blurb: 'From conveyor belts and lunch nigiri to omakase counters.' },
  { slug: 'japanese', name: 'Japanese', photo: 'japanese', blurb: 'Tonkatsu, izakaya, udon, okazuya and Japanese chains.' },
  { slug: 'ramen', name: 'Ramen', photo: 'ramen', blurb: 'Tonkotsu, shoyu and Honolulu-born oxtail ramen.' },
  { slug: 'udon-noodles', name: 'Udon & noodles', photo: 'udon', blurb: 'Udon, saimin and noodle houses.' },
  { slug: 'izakaya', name: 'Izakaya', photo: 'japanese', blurb: 'Japanese pubs with small plates and late kitchens.' },
  { slug: 'korean', name: 'Korean', photo: 'korean', blurb: 'Korean BBQ, kalbi plates and tofu soup.' },
  { slug: 'chinese', name: 'Chinese', photo: 'dim-sum', blurb: 'Cantonese seafood, roast meats and noodle shops.' },
  { slug: 'dim-sum', name: 'Dim sum', photo: 'dim-sum', blurb: 'Dumplings, char siu bao and cart-style mornings.' },
  { slug: 'vietnamese', name: 'Vietnamese', photo: 'pho', blurb: 'Pho, bánh mì and Chinatown noodle houses.' },
  { slug: 'thai', name: 'Thai', photo: 'thai', blurb: 'Curries, noodles and Thai street food.' },
  { slug: 'filipino', name: 'Filipino', photo: 'plate-lunch', blurb: 'Adobo, pancit, lechon and halo-halo.' },
  { slug: 'mexican', name: 'Mexican & tacos', photo: 'tacos', blurb: 'Tacos, burritos and taquerias.' },
  { slug: 'italian', name: 'Italian', photo: 'pasta', blurb: 'Pasta, pizza and trattorias.' },
  { slug: 'pizza', name: 'Pizza', photo: 'pasta', blurb: 'Neapolitan, New York and local-style pies.' },
  { slug: 'french', name: 'French', photo: 'fine-dining', blurb: 'Bistros and classic French dining rooms.' },
  { slug: 'american', name: 'American', photo: 'burger', blurb: 'Diners, grills and family restaurants.' },
  { slug: 'burgers', name: 'Burgers', photo: 'burger', blurb: 'Smash burgers to grass-fed Big Island beef.' },
  { slug: 'steakhouse', name: 'Steakhouses', legacy: '/steakhouse-honolulu/', photo: 'steak', blurb: 'Dry-aged steaks, prime rib and kiawe-grilled cuts.' },
  { slug: 'breakfast-brunch', name: 'Breakfast & brunch', photo: 'breakfast', blurb: 'Pancakes, loco moco, eggs benedict and acai.' },
  { slug: 'bakery', name: 'Bakeries & malasadas', photo: 'malasadas', blurb: 'Malasadas, coco puffs, butter mochi and pastries.' },
  { slug: 'coffee', name: 'Coffee', photo: 'coffee', blurb: 'Kona and Kaʻū coffee bars and cafés.' },
  { slug: 'shave-ice-dessert', name: 'Shave ice & dessert', photo: 'shave-ice', blurb: 'Shave ice, gelato and Hawaiian desserts.' },
  { slug: 'hawaii-regional', name: 'Hawaiʻi Regional', photo: 'fine-dining', blurb: 'The chef-led cooking that put local fish, beef and produce on fine-dining menus.' },
  { slug: 'farm-to-table', name: 'Farm-to-table', photo: 'vegan', blurb: 'Menus built from Oʻahu farms and fishermen.' },
  { slug: 'fine-dining', name: 'Fine dining', photo: 'fine-dining', blurb: 'Tasting menus and special-occasion rooms.' },
  { slug: 'pacific-rim', name: 'Pacific Rim', photo: 'seafood', blurb: 'Asian-Pacific fusion menus.' },
  { slug: 'fusion', name: 'Fusion', photo: 'tacos', blurb: 'Mash-ups of island, Asian and American cooking.' },
  { slug: 'mediterranean', name: 'Mediterranean', photo: 'mediterranean', blurb: 'Mezze, grilled meats and seafood.' },
  { slug: 'turkish', name: 'Turkish', photo: 'mediterranean', blurb: 'Pide, kebabs and mezze.' },
  { slug: 'middle-eastern', name: 'Middle Eastern', photo: 'mediterranean', blurb: 'Shawarma, falafel and mezze.' },
  { slug: 'indian', name: 'Indian', photo: 'thai', blurb: 'Curries, tandoor and biryani.' },
  { slug: 'vegan-vegetarian', name: 'Vegan & vegetarian', photo: 'vegan', blurb: 'Plant-based restaurants (see also the vegan filter in the directory).' },
  { slug: 'bar-pub', name: 'Bars & pubs', photo: 'cocktails', blurb: 'Pubs and bars with real kitchens.' },
  { slug: 'cocktail-bar', name: 'Cocktail bars', photo: 'cocktails', blurb: 'Craft cocktail bars with food.' },
  { slug: 'brewery', name: 'Breweries', photo: 'beer', blurb: 'Local breweries and taprooms that serve food.' },
  { slug: 'food-truck', name: 'Food trucks', legacy: '/best-food-trucks/', photo: 'food-truck', blurb: 'Shrimp trucks, plate-lunch wagons and taco trucks.' },
];

// Geographic anchors for distance-based guides.
export const ANCHORS = {
  airport: { name: 'Daniel K. Inouye International Airport (HNL)', lat: 21.3245, lng: -157.9251 },
  cruise: { name: 'Aloha Tower cruise terminal (Piers 10/11, with Pier 2 nearby)', lat: 21.3069, lng: -157.8664 },
  pearl: { name: 'Pearl Harbor National Memorial visitor center', lat: 21.3678, lng: -157.9390 },
  alamoana: { name: 'Ala Moana Center', lat: 21.2911, lng: -157.8434 },
};

// "Best of" pages. `path` keeps legacy URLs; `match(r)` selects restaurants.
// Each page shows its picks ranked by score (awards, longevity, verification).
const has = (r, ...c) => r.cuisines.some((x) => c.includes(x));
const dish = (r, re) => r.dishes.some((d) => re.test(d)) || re.test(r.summary || '');
export const BEST = [
  { slug: 'breakfast-waikiki', path: '/breakfast-waikiki/', title: 'Best breakfast in Waikīkī', h1: 'Breakfast in Waikīkī', photo: 'breakfast', intro: 'Walkable from Waikīkī hotels. Lines are shortest before 8 am.', match: (r) => ['waikiki', 'kapahulu'].includes(r.neighborhood) && (has(r, 'breakfast-brunch', 'bakery', 'coffee') || opensBy(r, '09:00')) },
  { slug: 'brunch', path: '/brunch-honolulu/', title: 'Best brunch in Honolulu', h1: 'Brunch in Honolulu', photo: 'breakfast', intro: 'Weekend brunch around town, from Kaimukī cafés to Kailua.', match: (r) => has(r, 'breakfast-brunch') },
  { slug: 'dinner-waikiki', path: '/dinner-waikiki/', title: 'Best dinner in Waikīkī', h1: 'Dinner in Waikīkī', photo: 'sunset', intro: 'Sit-down dinner within walking distance of Waikīkī hotels.', match: (r) => r.neighborhood === 'waikiki' && r.price >= 2 && servesDinner(r) },
  { slug: 'beach-dining', path: '/beach-dining-waikiki/', title: 'Oceanfront & beach dining in Waikīkī', h1: 'Beach dining in Waikīkī', photo: 'sunset', intro: 'Tables with a view of the water in and around Waikīkī. Book sunset seatings ahead.', match: (r) => r.tags.ocean_view && ['waikiki', 'diamond-head', 'kahala'].includes(r.neighborhood) },
  { slug: 'ocean-view', title: 'Ocean-view restaurants on Oʻahu', h1: 'Ocean-view restaurants', photo: 'beach', intro: 'Every restaurant in the guide with a water view, island-wide.', match: (r) => r.tags.ocean_view },
  { slug: 'fine-dining', path: '/five-star-dining/', title: 'Fine dining in Honolulu', h1: 'Fine dining in Honolulu', photo: 'fine-dining', intro: 'Tasting menus and special-occasion rooms. Most need a reservation.', match: (r) => r.price >= 4 || has(r, 'fine-dining') },
  { slug: 'local-favorites', path: '/hidden-gems/', title: 'Local favorites outside Waikīkī', h1: 'Local favorites', photo: 'plate-lunch', intro: 'Long-running neighborhood places, mostly under $30 a person, outside the Waikīkī strip.', match: (r) => r.neighborhood !== 'waikiki' && r.price <= 2 && (+String(r.opened || '9999').slice(0, 4) <= 2010) },
  { slug: 'tacos', path: '/best-tacos/', title: 'Best tacos in Honolulu', h1: 'Tacos in Honolulu', photo: 'tacos', intro: 'Taquerias, taco trucks and fusion tacos.', match: (r) => has(r, 'mexican') || dish(r, /taco/i) },
  { slug: 'plate-lunch', title: 'Best plate lunch in Honolulu', h1: 'Plate lunch', photo: 'plate-lunch', intro: 'Two scoops rice, mac salad and a main.', match: (r) => has(r, 'local-plate-lunch') },
  { slug: 'ramen', title: 'Best ramen in Honolulu', h1: 'Ramen', photo: 'ramen', intro: 'Ramen shops, several open late.', match: (r) => has(r, 'ramen') || dish(r, /ramen/i) },
  { slug: 'shave-ice', title: 'Best shave ice on Oʻahu', h1: 'Shave ice', photo: 'shave-ice', intro: 'Ask for a snow cap (sweetened condensed milk) and azuki beans at the bottom.', match: (r) => has(r, 'shave-ice-dessert') || dish(r, /shave ice/i) },
  { slug: 'malasadas-bakeries', title: 'Best malasadas & bakeries', h1: 'Malasadas & bakeries', photo: 'malasadas', intro: 'Malasadas, coco puffs and butter mochi. Go early; popular items sell out.', match: (r) => has(r, 'bakery') },
  { slug: 'dim-sum', title: 'Best dim sum in Honolulu', h1: 'Dim sum', photo: 'dim-sum', intro: 'Dim sum houses, mostly in Chinatown. Weekend mornings are busiest.', match: (r) => has(r, 'dim-sum') },
  { slug: 'korean', title: 'Best Korean food in Honolulu', h1: 'Korean food', photo: 'korean', intro: 'Korean BBQ and kalbi plates.', match: (r) => has(r, 'korean') },
  { slug: 'garlic-shrimp', title: 'Best garlic shrimp on Oʻahu', h1: 'Garlic shrimp', photo: 'shrimp', intro: 'Shrimp trucks and plates, mostly on the North Shore.', match: (r) => dish(r, /shrimp/i) && (has(r, 'food-truck', 'seafood')) },
  { slug: 'coffee', title: 'Best coffee in Honolulu', h1: 'Coffee', photo: 'coffee', intro: 'Cafés pouring Hawaiʻi-grown coffee.', match: (r) => has(r, 'coffee') },
  { slug: 'date-night', title: 'Date-night restaurants in Honolulu', h1: 'Date night', photo: 'cocktails', intro: 'Reservable dinner rooms at $30+ a person.', match: (r) => r.price >= 3 && r.tags.reservations && servesDinner(r) },
  { slug: 'kid-friendly', title: 'Kid-friendly restaurants in Honolulu', h1: 'Kid-friendly restaurants', photo: 'shave-ice', intro: 'Casual places that welcome families.', match: (r) => r.tags.kid_friendly },
  { slug: 'vegan', title: 'Vegan-friendly restaurants in Honolulu', h1: 'Vegan-friendly', photo: 'vegan', intro: 'Fully plant-based restaurants and places with real vegan dishes.', match: (r) => r.tags.vegan_options || has(r, 'vegan-vegetarian') },
  { slug: 'mai-tais', title: 'Where to drink a mai tai in Waikīkī', h1: 'Mai tais & sunset drinks', photo: 'cocktails', intro: 'Ocean-view bars and restaurants with a bar program.', match: (r) => r.tags.ocean_view && (r.happy_hour || has(r, 'bar-pub', 'cocktail-bar')) },
];

function toMin(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
export function opensBy(r, t) { return !!r.hours && Object.values(r.hours).some((d) => d.some(([o]) => toMin(o) <= toMin(t))); }
export function servesDinner(r) { if (!r.hours) return r.price >= 3; return Object.values(r.hours).some((d) => d.some(([o, c]) => { const cm = toMin(c) <= toMin(o) ? toMin(c) + 1440 : toMin(c); return cm >= toMin('20:00'); })); }

// Guides (new + rewritten legacy). `pick` selects restaurants; `extra` adds hand-written notes.
export const GUIDES = [
  { slug: 'near-honolulu-airport', path: '/guides/near-honolulu-airport/', title: 'Where to eat near Honolulu Airport (HNL)', h1: 'Near the airport', photo: 'plate-lunch', anchor: 'airport', radius: 4, intro: 'Good meals within about 4 miles of HNL, for arrivals, layovers and the last lunch before a flight.', tips: ['Allow 20–40 minutes from these spots to the terminal at rush hour (Nimitz and H-1 back up 3–6 pm).', 'Agricultural inspection applies to some fruit and plants when flying to the mainland; cooked food is fine.'] },
  { slug: 'near-cruise-pier', path: '/guides/near-cruise-pier/', title: 'Where to eat near the Honolulu cruise pier', h1: 'Near the cruise pier', photo: 'harbor', anchor: 'cruise', radius: 1.6, intro: 'Restaurants within walking distance or a short ride of the Aloha Tower cruise terminal and Pier 2.', tips: ['Chinatown is about a 10-minute walk from Aloha Tower; Kakaʻako is a 5-minute ride.', 'Downtown lunch counters often close by 2 pm and on weekends — check hours on each page.'] },
  { slug: 'near-pearl-harbor', path: '/guides/near-pearl-harbor/', title: 'Where to eat near Pearl Harbor', h1: 'Near Pearl Harbor', photo: 'plate-lunch', anchor: 'pearl', radius: 4.5, intro: 'Meals within a short drive of the Pearl Harbor National Memorial. Bags are not allowed at the memorial, so eat before or after.', tips: ['The memorial has a small snack bar only; plan a real meal before or after.', 'Pearlridge Center and ʻAiea have the closest sit-down options.'] },
  { slug: 'ala-moana', path: '/guides/ala-moana-center/', title: 'Where to eat at and around Ala Moana Center', h1: 'Ala Moana Center', photo: 'shopping', anchor: 'alamoana', radius: 1, intro: 'Restaurants in and within a mile of Ala Moana Center, the walkable area between Waikīkī and Kakaʻako.', tips: ['Mall parking is free; the Ewa-side decks fill first on weekends.'] },
  { slug: 'eats-under-15', path: '/guides/eats-under-15/', title: 'Honolulu eats under $15', h1: 'Eats under $15', photo: 'musubi', intro: 'Places where a full meal is about $15 or less per person.', tips: ['Plate lunch, poke by the pound, musubi and bakery runs are the budget staples.', 'Prices change often; the $ rating means under about $15 per person.'] },
];

// Search keyword aliases (helps queries like "kalua" find Hawaiian, "hh" find happy hour).
export const ALIASES = {
  hawaiian: ['kalua pig', 'laulau', 'poi', 'lomi', 'pipikaula', 'haupia', 'luau'],
  'local-plate-lunch': ['loco moco', 'katsu', 'mac salad', 'musubi', 'spam'],
  'shave-ice-dessert': ['shave ice', 'shaved ice', 'snow cone'],
  bakery: ['malasada', 'malasadas', 'donut', 'coco puff', 'butter mochi'],
};
