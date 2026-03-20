'use strict';
// ══════════════════════════════════════════════════════════════
// ONE-TIME ROUTE SEED — Sets day assignments and route order
// from the printed route sheets. Safe to re-run (idempotent).
// Remove this file after confirming routes are correct.
// ══════════════════════════════════════════════════════════════

const _ROUTE_SEED = {
  wA0: [ // Week A - Monday
    'EXPERTS CAFE',
    'TOP CHEF CAFE',
    'MARMARIS CAFE (ELTHAM)',
    'ELTHAM CAFE & RESTAURANT',
    'THE MANOR CAFE',
    'STATION CAFE (LEWISHAM)',
    "KEM'S CAFE",
    'THE DOG & BELL',
    'CAFFE PISTACHIO LTD',
    "ROSE'S CAFE (BERMONDSEY)"
  ],
  wA1: [ // Week A - Tuesday
    'BLACK BULL CAFE',
    'PALACE AMUSEMENTS',
    'THE BEANO CAFE',
    'THE GORGE',
    'JIMMY GS AMUSEMENTS',
    'SORBETTO',
    'YEOMAN BEARSTEAD REST.',
    'GOOD VIBES',
    "FRANCO'S",
    "LEAH'S BISTRO LTD",
    'CAFE ROSE (MAIDSTONE)',
    'OLD POST OFFICE COFFEE'
  ],
  wA2: [ // Week A - Wednesday
    'CAFE EXPRESS (ORPINGTON)',
    'CARLTON PARADE CAFE',
    'SWELL CAFE',
    'TWINS CAFE',
    'LITTLE BIG TREATS LTD',
    'NONAME CAFE',
    'THE BANK RESTAURANT',
    'PIE & MASH',
    'TROY RESTAURANT',
    "CHAPLIN'S CAFE"
  ],
  wA3: [ // Week A - Thursday
    'THE TRAM STOP',
    'GOLDEN CHEFS CAFE',
    'MARTIL CAFE (CROYDON)',
    'ADAMS CAFE',
    "ELLY'S CAFE",
    'EATWELL CAFE (WALLINGTON)',
    'SASSI IN THE GROVE',
    "H'S CAFE",
    'THE COSY CAFE',
    'THE CLASS CAFE',
    "RHONA'S CAFE",
    'BANSTEAD CAFE LTD',
    'DOOLALIS BAR & RESTAURANT',
    'THE OLIVE BRANCH'
  ],
  wA4: [ // Week A - Friday
    "BEANO'S CAFE (BEXLEY)",
    'LONG LANE CAFE',
    'SUNSHINE CAFE (BELVEDERE)',
    'ABBEY CAFE',
    'ROYAL CAFE (ABBEY WOOD)',
    'KAZ CAFE',
    'OXLEAS WOOD CAFE'
  ],
  wB0: [ // Week B - Monday
    'MOTTIES',
    'HONEYDALE FARM',
    'VILLAGE CAFE (BEXLEY)',
    'CAFFE CINOS (BEXLEY)',
    'BAGZIES',
    'COAST BAR & GRILL',
    'STAR CAFE (SIDCUP)',
    'THE PLAZA CAFE',
    'NENE CAFE & BISTRO',
    'CACIO E PEPE'
  ],
  wB1: [ // Week B - Tuesday
    'SUNRISE CAFE (CANTERBURY)',
    'BEANOS CAFE (HERNE BAY)',
    'KARDELEN CAFE',
    "LEAH'S BISTRO 2",
    "HENRY'S BAR",
    'ERNESTOS',
    'THE QUILLS',
    "J.K'S CAFE",
    'KINGS DINER CAFE',
    'CAFE INN',
    'C BARISTA'
  ],
  wB2: [ // Week B - Wednesday
    "GEORGE'S CAFE LTD",
    'CAFFE CINOS (BROMLEY)',
    'COSY CAFETERIA',
    'LOVE DULWICH BISTRO',
    'EMA 68 LTD',
    'MARTIL CAFE (NORWOOD)',
    'BELLA ROMA BECKENHAM',
    'SUNRISE CAFE (BECKENHAM)',
    'ELMERS END BAKERY',
    'FIRIN',
    'CAFE DE NIRO'
  ],
  wB3: [ // Week B - Thursday
    'BLUE CAFE',
    'CASA VOSTRA',
    "CHEF'S DELIGHT",
    'RIALTO',
    'BLUEBELLS CAFE',
    'ANDIAMO',
    'TULLEYS TEA ROOM',
    'WOODHATCH CAFE LTD',
    'VILLAGE CAFE (GRAYSHOTT)',
    'PORTOVENERE'
  ],
  wB4: [ // Week B - Friday
    'CROSSWAYS CAFE',
    'BRITANNIA CAFE RAINHAM',
    'PARK SIDE CAFE',
    'POPLAR CAFE',
    "ARAN'S CAFE",
    'POPULAR TWO CAFE',
    "DOLLY'S DINER",
    "NANCY'S SANDWICH BAR"
  ]
};

async function runRouteSeed() {
  if (!STOPS || STOPS.length === 0) return;

  // Check if routes already seeded (more than 50% assigned)
  const assignedCount = Object.keys(S.assign).length;
  if (assignedCount > STOPS.length * 0.5) {
    console.log('Route seed: skipped — routes already assigned (' + assignedCount + '/' + STOPS.length + ')');
    return;
  }

  console.log('Route seed: starting...');

  // Build name→id lookup (normalize: uppercase, trim)
  const nameToId = {};
  STOPS.forEach(s => {
    const key = s.n.trim().toUpperCase();
    nameToId[key] = s.id;
  });

  let matched = 0, unmatched = 0;
  const unmatchedNames = [];

  Object.entries(_ROUTE_SEED).forEach(([dayId, names]) => {
    const orderedIds = [];
    names.forEach(name => {
      const key = name.trim().toUpperCase();
      const id = nameToId[key];
      if (id != null) {
        S.assign[id] = dayId;
        orderedIds.push(id);
        matched++;
      } else {
        // Try fuzzy match: check if any STOP name contains or is contained by seed name
        let found = false;
        for (const stop of STOPS) {
          const stopKey = stop.n.trim().toUpperCase();
          if (stopKey.includes(key) || key.includes(stopKey)) {
            S.assign[stop.id] = dayId;
            orderedIds.push(stop.id);
            matched++;
            found = true;
            break;
          }
        }
        if (!found) {
          unmatched++;
          unmatchedNames.push(name + ' (' + dayId + ')');
        }
      }
    });
    S.routeOrder[dayId] = orderedIds;
  });

  console.log('Route seed: matched ' + matched + ', unmatched ' + unmatched);
  if (unmatchedNames.length > 0) {
    console.warn('Route seed: unmatched customers:', unmatchedNames);
  }

  // Save to Supabase
  await Promise.allSettled([save.assign(), save.routeOrder()]);

  if (typeof showToast === 'function') {
    showToast('Routes set: ' + matched + ' customers assigned' + (unmatched > 0 ? ', ' + unmatched + ' not found' : ''), unmatched > 0 ? 'warning' : 'success', 5000);
  }

  // Re-render if on route page
  if (curPage === 'route') renderRoute();
}
