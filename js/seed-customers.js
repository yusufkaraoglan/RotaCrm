'use strict';
// ═══════════════════════════════════════════════════════════
// ONE-TIME CUSTOMER SEED — 103 customers
// This script runs once on app load, adds missing customers,
// then marks itself as done so it won't run again.
// Safe to remove this file + script tag after first run.
// ═══════════════════════════════════════════════════════════

(function seedCustomers() {
  const SEED_KEY = 'cr5_seed_customers_done';
  if (localStorage.getItem(SEED_KEY) === '1') return;

  const newCustomers = [
    {n:"ABBEY CAFE",a:"183 Abbey Wood Road",c:"Abbey Wood",p:"SE2 9DZ"},
    {n:"ADAMS CAFE",a:"152 London Road",c:"Croydon",p:"CR0 2TD"},
    {n:"ANDIAMO",a:"174A London Road",c:"East Grinstead",p:"RH19 1ES"},
    {n:"ARAN'S CAFE",a:"268 Stamford Hill",c:"Stoke Newington",p:"N16 6TU"},
    {n:"BAGZIES",a:"2 Sidcup Hill",c:"Sidcup",p:"DA14 6HH"},
    {n:"BANSTEAD CAFE LTD",a:"6 High Street",c:"Banstead",p:"SM7 2LJ"},
    {n:"BEANO CAFE (RAMSGATE)",a:"118 Newington Road",c:"Ramsgate",p:"CT12 6PP"},
    {n:"BEANO'S CAFE (BEXLEY)",a:"164 Mayplace Road East",c:"Bexleyheath",p:"DA7 6EJ"},
    {n:"BEANOS CAFE (HERNE BAY)",a:"150 Mortimer Street",c:"Herne Bay",p:"CT6 5DX"},
    {n:"BELLA ROMA BECKENHAM LTD",a:"141-143 Croydon Road",c:"Beckenham",p:"BR3 3RB"},
    {n:"BIGGIN CAFE",a:"TN16 3JP",c:"Biggin Hill",p:"TN16 3JP"},
    {n:"BLACK BULL CAFE & COFFEE SHOP",a:"49 Black Bull Road",c:"Folkestone",p:"CT19 5QT"},
    {n:"BLUE CAFE",a:"52-56 Church Street",c:"Leatherhead",p:"KT22 8DW"},
    {n:"BLUEBELLS CAFE",a:"110 London Road",c:"East Grinstead",p:"RH19 1EP"},
    {n:"BRITANNIA CAFE RAINHAM",a:"53 Upminster Road South",c:"Rainham",p:"RM13 9YS"},
    {n:"C BARISTA",a:"57-58 High Street",c:"Gravesend",p:"DA11 0BB"},
    {n:"CACIO E PEPE",a:"160 Halfway Street",c:"Sidcup",p:"DA15 8DG"},
    {n:"CAFE DENIRO",a:"SE25 6DP",c:"South Norwood",p:"SE25 6DP"},
    {n:"CAFE EXPRESS (ORPINGTON)",a:"365 Chipperfield Road, St Paul's Cray",c:"Orpington",p:"BR5 2LJ"},
    {n:"CAFE INN",a:"66-67 New Road",c:"Gravesend",p:"DA11 0AE"},
    {n:"CAFE ROSE (MAIDSTONE)",a:"51-52 Church Street",c:"Maidstone",p:"ME14 1DS"},
    {n:"CAFFE CINOS (BEXLEY)",a:"34B Steynton Avenue",c:"Bexley",p:"DA5 3HG"},
    {n:"CAFFE CINOS (BROMLEY)",a:"5 Old Bromley Road",c:"Bromley",p:"BR1 4LB"},
    {n:"CAFFE PISTACHIO LTD",a:"239 Lower Road",c:"Rotherhithe",p:"SE16 2LW"},
    {n:"CARLTON CAFE",a:"12 Carlton Parade",c:"Orpington",p:"BR6 0JB"},
    {n:"CASA VOSTRA",a:"91 High Street",c:"Edenbridge",p:"TN8 5AU"},
    {n:"CHAPLIN'S CAFE",a:"171 Widmore Road",c:"Bromley",p:"BR1 3AX"},
    {n:"COAST BAR & GRILL",a:"12 Sidcup High Street",c:"Sidcup",p:"DA14 6EZ"},
    {n:"COSY CAFETERIA",a:"24 Randlesdown Road",c:"Bellingham",p:"SE6 3BT"},
    {n:"CROSSWAYS CAFE",a:"101 Regus House, Victory Way",c:"Dartford",p:"DA2 6QD"},
    {n:"DELIGHT CAFE (RAINHAM)",a:"24 Upminster Road South",c:"Rainham",p:"RM13 9YX"},
    {n:"DOLLY'S DINER",a:"81 Station Road",c:"Longfield",p:"DA3 7QA"},
    {n:"DOOLALIS BAR & RESTAURANT",a:"318 Limpsfield Road",c:"Hamsey Green",p:"CR2 9BX"},
    {n:"EATWELL CAFE (WALLINGTON)",a:"169 Stafford Road",c:"Wallington",p:"SM6 9BT"},
    {n:"ELLY'S CAFE",a:"288A Brighton Road",c:"South Croydon",p:"CR2 6AG"},
    {n:"ELMERS END BAKERY",a:"125 Croydon Road",c:"Elmers End",p:"BR3 3RA"},
    {n:"ELTHAM CAFE & RESTAURANT",a:"61 Well Hall Road",c:"Eltham",p:"SE9 6SZ"},
    {n:"EMA 68 LTD",a:"95 Rosendale Road",c:"West Dulwich",p:"SE21 8EZ"},
    {n:"ERNESTOS",a:"Unit 60-61, Dockside Outlet Centre, Maritime Way, Chatham Maritime",c:"Chatham",p:"ME4 3ED"},
    {n:"EXPERTS CAFE",a:"162 Bexley Road",c:"Eltham",p:"SE9 2PH"},
    {n:"FIRIN",a:"179 High Street",c:"Penge",p:"SE20 7PF"},
    {n:"FRANCO'S",a:"362 Dukes Walk, The Mall",c:"Maidstone",p:"ME15 6AS"},
    {n:"GEORGE'S CAFE LTD",a:"491A Bromley Road",c:"Bromley",p:"BR1 4PQ"},
    {n:"GOLDEN CHEFS CAFE",a:"18 London Road",c:"Croydon",p:"CR0 2TA"},
    {n:"GOOD VIBES FOOD AND DRINKS",a:"13 Mill Street",c:"Maidstone",p:"ME15 6XW"},
    {n:"HENRY'S BAR AT HENRY SHEIN DENTAL/MEDICAL",a:"Medcare North, Gillingham Business Park",c:"Gillingham",p:"ME8 0SB"},
    {n:"HONEYDALE FARM TEA ROOM",a:"217 Maidstone Road",c:"Sidcup",p:"DA14 5AW"},
    {n:"H'S CAFE",a:"111 Wrythe Lane",c:"Carshalton",p:"SM5 2RR"},
    {n:"J.K'S CAFE",a:"1 The Alma, Leander Drive",c:"Gravesend",p:"DA12 4NG"},
    {n:"JIMMY GS AMUSEMENTS (LEYSDOWN ON SEA)",a:"Unit H, Concept Court",c:"Folkestone",p:"CT19 4RG"},
    {n:"KARDELEN CAFE & RESTAURANT",a:"103 Mortimer Street",c:"Herne Bay",p:"CT6 5ER"},
    {n:"KAZ CAFE",a:"85 Woolwich New Road",c:"Woolwich",p:"SE18 6ED"},
    {n:"KEM'S CAFE",a:"398 Lewisham High Street",c:"Lewisham",p:"SE13 6LJ"},
    {n:"KINGS DINER CAFE",a:"193A Parrock Street",c:"Gravesend",p:"DA12 1EW"},
    {n:"LEAH'S BISTRO 2",a:"20 Rainham Shopping Centre",c:"Gillingham",p:"ME8 7HW"},
    {n:"LEAH'S BISTRO LTD",a:"18 High Street",c:"Maidstone",p:"ME14 1HT"},
    {n:"LITTLE BIG TREATS LTD",a:"23 Windsor Drive",c:"Orpington",p:"BR6 6EY"},
    {n:"LONG LANE CAFE",a:"142 Long Lane",c:"Bexleyheath",p:"DA7 5AH"},
    {n:"LOVE DULWICH BISTRO",a:"89 Lordship Lane",c:"Dulwich",p:"SE22 8EP"},
    {n:"MARTIL CAFE (CROYDON)",a:"273 Morland Road",c:"Croydon",p:"CR0 6HE"},
    {n:"MARTIL CAFE (NORWOOD)",a:"280 Norwood Road",c:"West Norwood",p:"SE27 9AJ"},
    {n:"MOTTIES",a:"34 Swanley Lane",c:"Swanley",p:"BR8 7TL"},
    {n:"NANCY'S SANDWICH BAR",a:"37A Station Road",c:"Longfield",p:"DA3 7QD"},
    {n:"NENE CAFE & BISTRO",a:"111 High Street",c:"Chislehurst",p:"BR7 5AG"},
    {n:"NONAME CAFE",a:"4 Crescent Way",c:"Orpington",p:"BR6 9LP"},
    {n:"OXLEAS WOOD CAFE",a:"Crown Woods Lane",c:"Shooters Hill",p:"SE18 3JA"},
    {n:"PALACE AMUSEMENTS (RAMSGATE)",a:"Unit H, Concept Court",c:"Folkestone",p:"CT19 4RG"},
    {n:"PARK SIDE CAFE",a:"127 High Street South",c:"East Ham",p:"E6 3PA"},
    {n:"PIE & MASH",a:"139 Hastings Road",c:"Bromley",p:"BR2 8NQ"},
    {n:"POPLAR CAFE",a:"251-253 Poplar High Street",c:"Poplar",p:"E14 0BE"},
    {n:"PORTOVENERE",a:"1 Godstone Road",c:"Caterham",p:"CR3 6RE"},
    {n:"RHONA'S CAFE & RESTAURANT",a:"KT9 1QL",c:"Chessington",p:"KT9 1QL"},
    {n:"RIALTO",a:"31 High Street",c:"East Grinstead",p:"RH19 3AF"},
    {n:"ROSE'S CAFE (BERMONDSEY)",a:"SE16 4SH",c:"Bermondsey",p:"SE16 4SH"},
    {n:"ROYAL CAFE (ABBEY WOOD)",a:"261 Wickham Lane",c:"Plumstead",p:"SE2 0NX"},
    {n:"SASSI IN THE GROVE",a:"Grove Park, 1 High Street",c:"Carshalton",p:"SM5 3BB"},
    {n:"SORBETTO",a:"Unit H, Concept Court",c:"Folkestone",p:"CT19 4RG"},
    {n:"STAR CAFE (SIDCUP)",a:"13 Sidcup High Street",c:"Sidcup",p:"DA14 6EN"},
    {n:"STATION CAFE (LEWISHAM)",a:"23 Staplehurst Road",c:"Lewisham",p:"SE13 5ND"},
    {n:"SUNRISE CAFE (BECKENHAM)",a:"115 Croydon Road",c:"Beckenham",p:"BR3 3RA"},
    {n:"SUNRISE CAFE (CANTERBURY)",a:"256 Sturry Road",c:"Canterbury",p:"CT1 1HQ"},
    {n:"SUNSHINE CAFE (BELVEDERE)",a:"104A Parsonage Manorway",c:"Belvedere",p:"DA17 6LY"},
    {n:"SUNSHINE CAFE (WORCESTER PARK)",a:"KT4 8DY",c:"Worcester Park",p:"KT4 8DY"},
    {n:"SWELL CAFE",a:"162 High Street",c:"Orpington",p:"BR6 0JR"},
    {n:"THE BANK RESTAURANT",a:"354 Crofton Road",c:"Orpington",p:"BR6 8NN"},
    {n:"THE BEANO CAFE",a:"372 Cheriton Road",c:"Folkestone",p:"CT19 4DX"},
    {n:"THE CLASS CAFE",a:"48 High Street",c:"Purley",p:"CR8 2AA"},
    {n:"THE COSY CAFE",a:"696 London Road, North Cheam",c:"Sutton",p:"SM3 9BY"},
    {n:"THE DOG & BELL",a:"116 Prince Street",c:"Deptford",p:"SE8 3JD"},
    {n:"THE GORGE",a:"19 High Street",c:"Ashford",p:"TN24 8TH"},
    {n:"THE OLD POST OFFICE COFFEE HOUSE",a:"Unit 2, High Street",c:"Marden",p:"TN12 9DP"},
    {n:"THE OLIVE BRANCH",a:"324 Limpsfield Road",c:"Warlingham",p:"CR6 9BX"},
    {n:"THE PANINI BROTHERS CATERING LTD",a:"Gillingham Business Park",c:"Gillingham",p:"ME8 0SB"},
    {n:"THE PLAZA CAFE",a:"109 Station Road",c:"Sidcup",p:"DA15 7ES"},
    {n:"THE QUILLS",a:"30-32 High Street",c:"Rochester",p:"ME1 1LD"},
    {n:"THE TRAM STOP",a:"231 Lower Addiscombe Road",c:"Croydon",p:"CR0 6RD"},
    {n:"TOP CHEF CAFE",a:"28 Eltham High Street",c:"Eltham",p:"SE9 1DA"},
    {n:"TROY  RESTAURANT",a:"101 Queensway",c:"Petts Wood",p:"BR5 1DQ"},
    {n:"TULLEYS TEA ROOM",a:"Tulley Farm, Turners Hill Road",c:"Crawley",p:"RH10 4PE"},
    {n:"TWINS CAFE",a:"328 Court Road",c:"Orpington",p:"BR6 9DA"},
    {n:"VILLAGE CAFE",a:"GU26 6LQ",c:"Haslemere",p:"GU26 6LQ"},
    {n:"VILLAGE CAFE (BEXLEY)",a:"70 Bexley High Street",c:"Bexley",p:"DA5 1AJ"},
    {n:"WOODHATCH CAFE LTD",a:"4 Dovers Green Road",c:"Reigate",p:"RH2 8BS"},
    {n:"YEOMAN BEARSTEAD RESTAURANT",a:"139 Ashford Road",c:"Maidstone",p:"ME14 4BT"}
  ];

  // Wait for app to initialize STOPS
  function doSeed() {
    if (typeof STOPS === 'undefined' || typeof save === 'undefined') {
      setTimeout(doSeed, 500);
      return;
    }

    const existingNames = new Set(STOPS.map(s => s.n.toUpperCase()));
    const maxId = STOPS.length > 0 ? STOPS.reduce((m, s) => Math.max(m, s.id), 0) : 0;
    let added = 0;

    newCustomers.forEach(c => {
      if (existingNames.has(c.n.toUpperCase())) return;
      const id = maxId + 1 + added;
      STOPS.push({ id, n: c.n, a: c.a, c: c.c, p: c.p, cn: '', ph: '', em: '' });
      added++;
    });

    if (added > 0) {
      save.stops();
      console.log(`[seed-customers] Added ${added} new customers (IDs ${maxId+1}–${maxId+added})`);
      if (typeof showToast === 'function') {
        showToast(`${added} new customers imported!`, 'success');
      }
      // Re-render if on customers page
      if (typeof curPage !== 'undefined' && curPage === 'customers' && typeof renderCustomers === 'function') {
        renderCustomers();
      }
    } else {
      console.log('[seed-customers] All customers already exist, nothing to add.');
    }

    localStorage.setItem(SEED_KEY, '1');
  }

  doSeed();
})();
