// Product options and default unit prices.
// src: "plan" = taken from plan.md, "quote" = from the Quality YHM proposal,
//      "est" = approximate estimate (plan.md marks these figures approximate too).
// Every price is editable in the app's Prices tab.

export const QUOTE = {
  vendor: 'Quality Yard and Home Maintenance',
  date: 'Oct 30, 2026',
  hardscape: 5946.0,
  fence: 2215.44,
  subtotal: 8161.44,
  tax: 401.36,
  total: 8562.8,
  padL: 10,
  padD: 7,
};

// Wall blocks. Dimensions in inches. bh = height, bw = face width, bd = depth.
// cap: h, l (length along wall), d (depth). maxWall = practical max exposed height (in).
export const BLOCKS = {
  rockwall: {
    name: 'Pavestone RockWall Large',
    where: 'Home Depot',
    bh: 6, bw: 17.44, bd: 7,
    cap: { h: 4, l: 16, d: 12 },
    perPallet: 48,
    maxWall: 36,
    price: 'blk_rockwall', capPrice: 'cap_rockwall',
    note: 'Rear lip sets the setback automatically. Recommended in plan.md.',
    colors: [
      { id: 'pecan', name: 'Pecan', hex: '#9a7a5c' },
      { id: 'yukon', name: 'Yukon', hex: '#8d8a84' },
      { id: 'palomino', name: 'Palomino', hex: '#b59b78' },
      { id: 'charcoal', name: 'Charcoal', hex: '#5a5856' },
    ],
  },
  rumble: {
    name: 'Pavestone RumbleStone',
    where: "Lowe's",
    bh: 3.5, bw: 10.5, bd: 7,
    cap: { h: 2.25, l: 10.5, d: 10.5 },
    maxWall: 24,
    price: 'blk_rumble', capPrice: 'cap_rumble',
    note: 'Tumbled, rustic, no lip. Keep the wall under ~2 ft.',
    colors: [
      { id: 'greystone', name: 'Greystone', hex: '#8f8e8a' },
      { id: 'cafe', name: 'Cafe', hex: '#9b8268' },
      { id: 'sierra', name: 'Sierra Blend', hex: '#a3826a' },
    ],
  },
  versalok: {
    name: 'Versa-Lok Standard (as quoted)',
    where: 'Landscape yard',
    bh: 6, bw: 16, bd: 12,
    cap: { h: 4, l: 16, d: 14 },
    maxWall: 48,
    price: 'blk_versalok', capPrice: 'cap_versalok',
    note: 'The block named in the Quality YHM quote. Pinned system, heavy.',
    colors: [
      { id: 'gray', name: 'Gray', hex: '#8a8a87' },
      { id: 'buff', name: 'Buff', hex: '#b8a585' },
      { id: 'charcoal', name: 'Charcoal Blend', hex: '#55534f' },
      { id: 'sandstone', name: 'Sandstone', hex: '#a88c6c' },
    ],
  },
  local: {
    name: 'Local yard block (e.g. Oberfields)',
    where: 'Columbus-area landscape yard',
    bh: 6, bw: 18, bd: 12,
    cap: { h: 4, l: 18, d: 13 },
    maxWall: 42,
    price: 'blk_local', capPrice: 'cap_local',
    note: 'Ask for a quote; often matches back-patio pavers and delivers by the pallet.',
    colors: [
      { id: 'limestone', name: 'Limestone', hex: '#b9b2a2' },
      { id: 'harvest', name: 'Harvest Blend', hex: '#a07f60' },
      { id: 'granite', name: 'Granite', hex: '#7b7b7a' },
      { id: 'onyx', name: 'Onyx', hex: '#4b4a49' },
    ],
  },
};

// Pavers. w,l in inches (null for a sq-ft priced blend). t = thickness (in).
export const PAVERS = {
  patio: {
    name: 'Match back patio (Beacon Hill style)',
    w: null, l: null, t: 2.375, unit: 'sq ft', price: 'pv_patio',
    pattern: 'flag',
    note: 'Take a photo and the paver name to the yard. Priced per sq ft.',
    colors: [
      { id: 'grayblend', name: 'Gray Blend', hex: '#a7a7a3' },
      { id: 'tanblend', name: 'Tan Blend', hex: '#bfae93' },
      { id: 'charcoal', name: 'Charcoal Blend', hex: '#6d6c6a' },
      { id: 'sandstone', name: 'Sandstone', hex: '#c9b48e' },
    ],
  },
  rumble: {
    name: 'RumbleStone paver 7" x 10.5"',
    w: 7, l: 10.5, t: 1.75, unit: 'each', price: 'pv_rumble',
    pattern: 'running',
    note: 'Pairs with the RumbleStone wall.',
    colors: [
      { id: 'greystone', name: 'Greystone', hex: '#9a9995' },
      { id: 'cafe', name: 'Cafe', hex: '#a28a70' },
      { id: 'sierra', name: 'Sierra Blend', hex: '#ab8a71' },
    ],
  },
  slab12: {
    name: '12" x 12" patio slab',
    w: 12, l: 12, t: 2, unit: 'each', price: 'pv_slab12',
    pattern: 'grid',
    note: 'Fastest to lay, fewest cuts, plainest look.',
    colors: [
      { id: 'gray', name: 'Gray', hex: '#a3a29f' },
      { id: 'red', name: 'Red', hex: '#9b5e4c' },
      { id: 'tan', name: 'Tan', hex: '#c2b08f' },
    ],
  },
  slab16: {
    name: '16" x 16" patio slab',
    w: 16, l: 16, t: 2, unit: 'each', price: 'pv_slab16',
    pattern: 'grid',
    note: 'Fewer joints; heavier to handle.',
    colors: [
      { id: 'gray', name: 'Gray', hex: '#a3a29f' },
      { id: 'pewter', name: 'Pewter', hex: '#86858a' },
      { id: 'tan', name: 'Tan', hex: '#c2b08f' },
    ],
  },
};

// Fence materials. colorMode: 'picker' (free color) or 'fixed'.
export const FENCES = {
  cedar: {
    name: 'Paint-ready cedar (dog-ear)',
    colorMode: 'picker',
    defaultColor: '#b5835a',
    presets: [
      { name: 'Natural cedar', hex: '#b5835a' },
      { name: 'House green-gray', hex: '#5f6b63' },
      { name: 'Trim white', hex: '#f2f1ec' },
      { name: 'Black', hex: '#262626' },
      { name: 'Driftwood gray', hex: '#8c8a83' },
    ],
    post: 4, // inches
    note: 'Takes paint within weeks; easiest to build. Repaint every 5–8 years.',
  },
  siding: {
    name: 'Siding-match screen',
    colorMode: 'picker',
    defaultColor: '#5f6b63',
    presets: [
      { name: 'House siding (render)', hex: '#5f6b63' },
      { name: 'Slate', hex: '#6c7377' },
      { name: 'Sage', hex: '#87907f' },
      { name: 'Clay', hex: '#b2a58e' },
      { name: 'White', hex: '#efefe9' },
    ],
    post: 4,
    note: 'Wood frame + sheathing clad in your house siding and trim. Ask the builder for your siding color name.',
  },
  pvc: {
    name: 'Cellular PVC boards (AZEK / Versatex)',
    colorMode: 'picker',
    defaultColor: '#f4f3ee',
    presets: [
      { name: 'Factory white', hex: '#f4f3ee' },
      { name: 'House green-gray', hex: '#5f6b63' },
      { name: 'Light gray', hex: '#b9bab6' },
      { name: 'Khaki', hex: '#b9a888' },
      { name: 'Black', hex: '#262626' },
    ],
    post: 4,
    note: 'Won’t rot. Any color in 100% acrylic paint; darker colors need heat-reflective paint the board maker approves.',
  },
  trex: {
    name: 'Trex Seclusions composite',
    colorMode: 'fixed',
    colors: [
      { id: 'saddle', name: 'Saddle', hex: '#8b6b4e' },
      { id: 'wg', name: 'Winchester Grey', hex: '#8a8780' },
      { id: 'wb', name: 'Woodland Brown', hex: '#5c4636' },
    ],
    post: 5,
    note: '6′ x 8′ kits cut down to fence height. Can’t be painted. Winchester Grey is closest to a gray-green house.',
  },
  vinyl: {
    name: 'Vinyl privacy panels',
    colorMode: 'fixed',
    colors: [
      { id: 'white', name: 'White', hex: '#f5f5f2' },
      { id: 'tan', name: 'Tan', hex: '#d5c5a3' },
      { id: 'khaki', name: 'Khaki', hex: '#beac88' },
      { id: 'gray', name: 'Gray', hex: '#9b9c99' },
    ],
    post: 5,
    note: 'Cheapest maintenance-free option. Painting vinyl isn’t recommended.',
  },
};

// Hose reel options. Footprint in feet: len = along the house, dep = out from house.
export const REELS = {
  wall: { name: 'Wall-mount reel on a fence backer', len: 0.9, dep: 1.7, h: 1.6, onFence: true },
  box: { name: 'Hose hideaway box with lid', len: 2.0, dep: 1.7, h: 2.0 },
  cart: { name: 'Reel cart on wheels', len: 2.0, dep: 2.0, h: 3.0 },
  none: { name: 'No hose reel', len: 0, dep: 0, h: 0 },
};

// 96-gallon cart, inches (plan.md: 27–29" wide, 33–35" deep).
export const CART = { w: 28, d: 34, h: 46 };

// Default unit prices.
export const PRICES = [
  // Wall & caps
  { id: 'blk_rockwall', group: 'Wall & caps', label: 'RockWall Large block', unit: 'each', price: 17.5, src: 'plan', hint: '$769–$919 per pallet of 48' },
  { id: 'cap_rockwall', group: 'Wall & caps', label: 'RockWall cap', unit: 'each', price: 9.0, src: 'est' },
  { id: 'blk_rumble', group: 'Wall & caps', label: 'RumbleStone wall block', unit: 'each', price: 4.48, src: 'plan' },
  { id: 'cap_rumble', group: 'Wall & caps', label: 'RumbleStone cap', unit: 'each', price: 5.5, src: 'est' },
  { id: 'blk_versalok', group: 'Wall & caps', label: 'Versa-Lok Standard unit', unit: 'each', price: 9.5, src: 'est' },
  { id: 'cap_versalok', group: 'Wall & caps', label: 'Versa-Lok cap', unit: 'each', price: 8.5, src: 'est' },
  { id: 'blk_local', group: 'Wall & caps', label: 'Local yard wall block', unit: 'each', price: 12.0, src: 'est', hint: 'Get a yard quote' },
  { id: 'cap_local', group: 'Wall & caps', label: 'Local yard cap', unit: 'each', price: 9.0, src: 'est' },
  // Pavers
  { id: 'pv_patio', group: 'Pavers', label: 'Patio-match paver', unit: 'sq ft', price: 6.0, src: 'est' },
  { id: 'pv_rumble', group: 'Pavers', label: 'RumbleStone paver 7"x10.5"', unit: 'each', price: 3.68, src: 'plan' },
  { id: 'pv_slab12', group: 'Pavers', label: '12"x12" slab', unit: 'each', price: 4.0, src: 'est', hint: '~$3–$6/sq ft' },
  { id: 'pv_slab16', group: 'Pavers', label: '16"x16" slab', unit: 'each', price: 7.0, src: 'est', hint: '~$3–$6/sq ft' },
  // Stone & base
  { id: 'st_304', group: 'Stone & base', label: '#304 crushed limestone (bulk)', unit: 'cu yd', price: 55, src: 'est' },
  { id: 'st_57', group: 'Stone & base', label: '#57 clean drain stone (bulk)', unit: 'cu yd', price: 65, src: 'est' },
  { id: 'st_sand', group: 'Stone & base', label: 'Bedding sand (bulk)', unit: 'cu yd', price: 60, src: 'est' },
  { id: 'st_delivery', group: 'Stone & base', label: 'Bulk delivery', unit: 'load', price: 100, src: 'est' },
  // Drainage & finishing
  { id: 'dr_pipe', group: 'Drainage & finishing', label: '4" perforated drain pipe w/ sock', unit: 'ft', price: 1.5, src: 'est' },
  { id: 'dr_fabric', group: 'Drainage & finishing', label: 'Landscape fabric, 3′x50′ roll', unit: 'roll', price: 30, src: 'est' },
  { id: 'dr_edge', group: 'Drainage & finishing', label: 'Paver edge restraint, 8′', unit: 'each', price: 10, src: 'est' },
  { id: 'dr_adhesive', group: 'Drainage & finishing', label: 'Block/cap adhesive, 10 oz', unit: 'tube', price: 7, src: 'est' },
  { id: 'dr_polysand', group: 'Drainage & finishing', label: 'Polymeric sand, 50 lb', unit: 'bag', price: 32, src: 'est' },
  // Fence & gate
  { id: 'fn_post8', group: 'Fence & gate', label: '4x4x8 ground-contact post', unit: 'each', price: 14, src: 'est' },
  { id: 'fn_post10', group: 'Fence & gate', label: '4x4x10 ground-contact post', unit: 'each', price: 19, src: 'est' },
  { id: 'fn_post12', group: 'Fence & gate', label: '4x4x12 ground-contact post', unit: 'each', price: 25, src: 'est' },
  { id: 'fn_cedar_picket', group: 'Fence & gate', label: 'Cedar dog-ear picket 5.5" x 4′', unit: 'each', price: 3.5, src: 'est' },
  { id: 'fn_rail', group: 'Fence & gate', label: '2x4x8 rail', unit: 'each', price: 9, src: 'est' },
  { id: 'fn_hardware', group: 'Fence & gate', label: 'Screws, rail brackets', unit: 'job', price: 30, src: 'est' },
  { id: 'fn_siding_lf', group: 'Fence & gate', label: 'Siding screen (frame, sheathing, siding, J-channel, trim), one face', unit: 'lin ft', price: 15, src: 'est' },
  { id: 'fn_pvc_board', group: 'Fence & gate', label: 'Cellular PVC board 1x6x8', unit: 'each', price: 32, src: 'est' },
  { id: 'fn_pvc_sleeve', group: 'Fence & gate', label: 'PVC post sleeve + cap', unit: 'each', price: 35, src: 'est' },
  { id: 'fn_trex_kit', group: 'Fence & gate', label: 'Trex Seclusions 6′x8′ panel kit', unit: 'kit', price: 449, src: 'plan' },
  { id: 'fn_trex_post', group: 'Fence & gate', label: 'Trex Seclusions 5x5x8 post w/ cap', unit: 'each', price: 85, src: 'plan' },
  { id: 'fn_trex_gate', group: 'Fence & gate', label: 'Trex Seclusions gate kit', unit: 'kit', price: 350, src: 'est' },
  { id: 'fn_vinyl_panel', group: 'Fence & gate', label: 'Vinyl 4′x8′ privacy panel', unit: 'each', price: 110, src: 'est' },
  { id: 'fn_vinyl_post', group: 'Fence & gate', label: 'Vinyl 5x5 post w/ cap', unit: 'each', price: 40, src: 'est' },
  { id: 'fn_vinyl_gate', group: 'Fence & gate', label: 'Vinyl 4′ gate kit', unit: 'kit', price: 175, src: 'est' },
  { id: 'fn_gate_frame', group: 'Fence & gate', label: 'Steel gate-frame kit (Adjust-A-Gate)', unit: 'kit', price: 65, src: 'est' },
  { id: 'fn_gate_hw', group: 'Fence & gate', label: 'Hinges, gravity latch, cane bolt', unit: 'set', price: 45, src: 'est' },
  { id: 'fn_concrete', group: 'Fence & gate', label: 'Fast-setting concrete, 50 lb', unit: 'bag', price: 6.75, src: 'est', hint: 'plan.md: 8–10 bags ≈ $60–$80' },
  { id: 'fn_paint', group: 'Fence & gate', label: 'Exterior paint / solid stain', unit: 'gal', price: 50, src: 'est' },
  { id: 'fn_primer', group: 'Fence & gate', label: 'Primer', unit: 'gal', price: 35, src: 'est' },
  // Hose reel
  { id: 'rl_wall', group: 'Hose reel', label: 'Wall-mount hose reel', unit: 'each', price: 80, src: 'est', hint: '$40–$120' },
  { id: 'rl_backer', group: 'Hose reel', label: 'Backer board + screws', unit: 'each', price: 25, src: 'est' },
  { id: 'rl_box', group: 'Hose reel', label: 'Hose hideaway box', unit: 'each', price: 140, src: 'est', hint: '$80–$200' },
  { id: 'rl_cart', group: 'Hose reel', label: 'Reel cart', unit: 'each', price: 100, src: 'est', hint: '$60–$150' },
  { id: 'rl_leader', group: 'Hose reel', label: 'Leader hose + shutoff valve', unit: 'each', price: 30, src: 'est' },
  // Tool rentals
  { id: 'rn_compactor', group: 'Tool rentals', label: 'Plate compactor', unit: 'day', price: 85, src: 'est' },
  { id: 'rn_saw', group: 'Tool rentals', label: 'Masonry cut-off / wet saw', unit: 'day', price: 75, src: 'est' },
  { id: 'rn_auger', group: 'Tool rentals', label: 'Power auger (optional)', unit: 'day', price: 95, src: 'est' },
];

export const PRICE_BY_ID = Object.fromEntries(PRICES.map((p) => [p.id, p]));
