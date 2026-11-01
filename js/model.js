// Pure geometry + quantity + cost model. No DOM, so it can be unit-tested in Node.
//
// Coordinates (feet): x runs along the house from the driveway edge (x = 0) to the far
// end (x = L). z runs out from the house wall (z = 0) to the front of the pad (z = D).
// The pad surface is y = 0 and sits flush with the driveway.
//
// Grade: the lawn falls only along the length. It is level with the driveway at x = 0
// and `drop` inches below the pad at x = L, both next to the house and at the far
// corner. So the far-end wall is full height across, and the front wall tapers.
import { BLOCKS, PAVERS, FENCES, REELS, CART, PRICE_BY_ID } from './catalog.js';
import { fenceColorHex } from './state.js';

export const CONST = {
  wasteBlocks: 0.05,
  wastePavers: 0.1,
  wasteCaps: 0.05,
  baseMinIn: 6, // minimum compacted #304 under the pad and wall
  stripIn: 4, // topsoil stripped before fill
  sandIn: 1, // bedding sand
  compact304: 1.15, // loose-to-compacted factor for crushed stone
  compact57: 1.05,
  trenchW: 2, // ft, wall trench width
  drainW: 1, // ft, clean stone zone behind the wall
  frostIn: 36, // post holes go this deep below grade
  bagYield: 0.375, // cu ft per 50 lb bag of concrete
  maxBay: 8, // ft between fence posts
  pickerIn: 5.5, // picket / board width
  houseGap: 0.35, // ft from siding to the center of the end posts
  itemGap: 0.25, // ft finger room between carts / reel
};

const ceil = (v) => Math.ceil(v - 1e-9);
const roundUp = (v, step) => Math.ceil(v / step - 1e-9) * step;

export function priceOf(state, id) {
  const o = state.prices[id];
  return Number.isFinite(o) ? o : PRICE_BY_ID[id].price;
}

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

// First-fit decreasing: how many 8 ft panels/kits are needed when bays can be cut from them.
export function packBays(bays, cap = CONST.maxBay) {
  const bins = [];
  for (const b of [...bays].sort((a, c) => c - a)) {
    const bin = bins.find((r) => r + b <= cap + 1e-6);
    if (bin !== undefined) bins[bins.indexOf(bin)] += b;
    else bins.push(b);
  }
  return bins.length;
}

export function buildModel(state) {
  const s = state;
  const L = s.L, D = s.D, drop = s.drop;
  const blk = BLOCKS[s.block];
  const pav = PAVERS[s.paver];
  const fen = FENCES[s.fence];
  const reel = REELS[s.reel];
  const warnings = [];
  const notes = [];

  const dropAt = (x) => (drop * Math.min(L, Math.max(0, x))) / L; // inches below pad
  const coursesFor = (h) => 1 + Math.max(0, ceil((h - blk.cap.h) / blk.bh));

  // ---------- Retaining wall ----------
  const bwFt = blk.bw / 12, bdFt = blk.bd / 12;
  const front = [];
  for (let x0 = 0; x0 < L - 1e-6; x0 += bwFt) {
    const x1 = Math.min(L, x0 + bwFt);
    const h = dropAt(x1);
    front.push({ x0, x1, h, courses: coursesFor(h) });
  }
  const farLen = Math.max(0, D - bdFt);
  const far = [];
  for (let z0 = 0; z0 < farLen - 1e-6; z0 += bwFt) {
    const z1 = Math.min(farLen, z0 + bwFt);
    far.push({ z0, z1, h: drop, courses: coursesFor(drop) });
  }
  const blocksRaw = front.reduce((a, r) => a + r.courses, 0) + far.reduce((a, r) => a + r.courses, 0);
  const faceArea =
    front.reduce((a, r) => a + (r.x1 - r.x0) * r.courses * (blk.bh / 12), 0) +
    far.reduce((a, r) => a + (r.z1 - r.z0) * r.courses * (blk.bh / 12), 0);
  const blocks = ceil(blocksRaw * (1 + CONST.wasteBlocks));
  const capRunFt = L + Math.max(0, D - blk.cap.d / 12);
  const caps = ceil(((capRunFt * 12) / blk.cap.l) * (1 + CONST.wasteCaps));
  const wallLen = L + farLen;
  const farCourses = coursesFor(drop);
  const wallDepthIn = blk.cap.h + farCourses * blk.bh; // pad top to bottom of block at far end

  if (drop > blk.maxWall) {
    warnings.push(`${blk.name} is meant for walls up to about ${blk.maxWall}". Your far end is ${drop}" tall: pick a larger block or a shallower pad.`);
  }
  if (drop > 36) {
    warnings.push(`Above about 3 ft, block makers usually call for geogrid or an engineered design. Check the block's install guide and ask Pickerington whether the wall needs a permit.`);
  }

  // ---------- Pad / pavers ----------
  const capIn = (blk.cap.d - 1) / 12; // cap overhangs the face by 1"
  const padX = Math.max(0, L - capIn);
  const padZ = Math.max(0, D - capIn);
  const paverArea = padX * padZ;
  const paverAreaOrder = paverArea * (1 + CONST.wastePavers);
  const paverCount = pav.w ? ceil(paverAreaOrder / ((pav.w * pav.l) / 144)) : ceil(paverAreaOrder);

  // ---------- Stone ----------
  const fillX = Math.max(0, L - bdFt - CONST.drainW);
  const fillZ = Math.max(0, D - bdFt - CONST.drainW);
  const N = 400;
  let integral = 0; // ∫ thickness(in) dx over fillX
  for (let i = 0; i < N; i++) {
    const x = ((i + 0.5) / N) * fillX;
    const t = Math.max(CONST.baseMinIn, dropAt(x) + CONST.stripIn - pav.t - CONST.sandIn);
    integral += (t * fillX) / N;
  }
  const cf304 = (integral / 12) * fillZ + wallLen * CONST.trenchW * (CONST.baseMinIn / 12);
  const cf57 =
    front.reduce((a, r) => a + (r.x1 - r.x0) * r.courses * (blk.bh / 12) * CONST.drainW, 0) +
    far.reduce((a, r) => a + (r.z1 - r.z0) * r.courses * (blk.bh / 12) * CONST.drainW, 0);
  const cy304 = (cf304 * CONST.compact304) / 27;
  const cy57 = (cf57 * CONST.compact57) / 27;
  const cySand = (paverArea * (CONST.sandIn / 12) * 1.1) / 27;
  const order304 = roundUp(cy304, 0.25);
  const order57 = roundUp(cy57, 0.25);
  const orderSand = Math.max(0.25, roundUp(cySand, 0.25));

  // ---------- Fence layout ----------
  const ps = fen.post / 12;
  const off = Math.max(1, (blk.bd + 5) / 12); // posts ~12" behind the wall face, clear of the block
  const fx0 = 0.25; // driveway-side fence line (no wall on that side)
  const fx1 = L - off; // far fence line
  const fz1 = D - off; // front fence line
  const z0 = CONST.houseGap;
  const gateSpan = s.gate + ps; // post center to post center
  const driveLen = fz1 - z0;
  let fixedLen = driveLen - gateSpan;
  const gateFits = fixedLen >= 0;
  // A sliver of fence beside the gate is harder to build than none: if less than 9"
  // would be left, the gate spans the whole driveway side and that post goes away.
  const fullGate = gateFits && fixedLen < 0.75;
  if (fullGate) fixedLen = 0;
  if (!gateFits) {
    warnings.push(`A ${s.gate}′ gate doesn’t fit on a ${D}′-deep pad (only ${driveLen.toFixed(1)}′ between the house post and the corner post).${s.gate === 4 ? ' Use the 3′ gate' : ' Make the pad deeper'}.`);
  }

  // Posts: [x, z, role]
  const posts = [];
  const addPost = (x, z, role) => {
    if (posts.some((p) => Math.abs(p.x - x) < 0.05 && Math.abs(p.z - z) < 0.05)) return;
    posts.push({ x, z, role });
  };
  const bays = []; // fixed (non-gate) bay lengths
  const segs = []; // drawable fence segments {a:[x,z], b:[x,z], kind:'fence'|'gate'}

  // Driveway end, with gate
  let gate = null;
  const gz = Math.max(0, gateFits && !fullGate ? gateSpan : driveLen);
  if (s.gatePos === 'outer') {
    gate = { hinge: [fx0, fz1], latch: [fx0, fz1 - gz], width: gz - ps };
  } else {
    gate = { hinge: [fx0, z0], latch: [fx0, z0 + gz], width: gz - ps };
  }
  addPost(fx0, z0, s.gatePos === 'house' ? 'gate hinge (house end)' : 'house end');
  addPost(fx0, fz1, s.gatePos === 'outer' ? 'corner / gate hinge' : 'corner');
  addPost(gate.latch[0], gate.latch[1], 'gate latch');
  const fixedA = s.gatePos === 'outer' ? z0 : z0 + gz;
  const fixedB = s.gatePos === 'outer' ? fz1 - gz : fz1;
  if (fixedB - fixedA > 0.05) {
    const n = ceil((fixedB - fixedA) / CONST.maxBay);
    for (let i = 0; i < n; i++) {
      const a = fixedA + ((fixedB - fixedA) * i) / n;
      const b = fixedA + ((fixedB - fixedA) * (i + 1)) / n;
      if (i > 0) addPost(fx0, a, 'line');
      bays.push(b - a);
      segs.push({ a: [fx0, a], b: [fx0, b], kind: 'fence' });
    }
  }
  segs.push({ a: gate.hinge, b: gate.latch, kind: 'gate' });

  // Front run and far run
  const runs = [
    { name: 'front', a: [fx0, fz1], b: [fx1, fz1] },
    { name: 'far', a: [fx1, fz1], b: [fx1, z0] },
  ];
  for (const r of runs) {
    const len = Math.hypot(r.b[0] - r.a[0], r.b[1] - r.a[1]);
    const n = Math.max(1, ceil(len / CONST.maxBay));
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      const a = [r.a[0] + (r.b[0] - r.a[0]) * t0, r.a[1] + (r.b[1] - r.a[1]) * t0];
      const b = [r.a[0] + (r.b[0] - r.a[0]) * t1, r.a[1] + (r.b[1] - r.a[1]) * t1];
      addPost(a[0], a[1], i === 0 ? 'corner' : 'line');
      bays.push(len / n);
      segs.push({ a, b, kind: 'fence' });
    }
  }
  addPost(fx1, z0, 'house end');

  for (const p of posts) {
    p.grade = dropAt(p.x); // inches the lawn sits below the pad here
    p.lenIn = s.fh * 12 + 1 + p.grade + CONST.frostIn;
    p.stock = p.lenIn <= 96 ? 8 : p.lenIn <= 120 ? 10 : 12;
    if (p.lenIn > 144) warnings.push('A post would need to be longer than 12 ft; the drop is very large for this layout.');
  }
  const fenceLF = bays.reduce((a, b) => a + b, 0);
  const holeR = (fen.post === 5 ? 10 : 8) / 24; // ft
  const holeVol = Math.PI * holeR * holeR * (CONST.frostIn / 12) - ps * ps * (CONST.frostIn / 12);
  const concreteBags = ceil((holeVol * posts.length) / CONST.bagYield);
  const longSystemPosts = (s.fence === 'trex' || s.fence === 'vinyl') ? posts.filter((p) => p.lenIn > 96).length : 0;
  if (longSystemPosts) {
    warnings.push(`${longSystemPosts} post${longSystemPosts > 1 ? 's' : ''} on the low side need more than 8′ of length (${s.fh}′ of fence + the fill + 36″ below grade). Standard ${s.fence === 'trex' ? 'Trex' : 'vinyl'} posts are 8′, so set those over a PT 4x4 core or on a taller concrete pier.`);
  }

  // ---------- Carts + reel along the house ----------
  const clearX0 = fx0 + ps / 2 + 0.05;
  const clearX1 = fx1 - ps / 2 - 0.05;
  const clearZ1 = fz1 - ps / 2 - 0.05;
  const clearLen = clearX1 - clearX0;
  const clearDep = clearZ1 - 0.25;
  const cart = { len: CART.w / 12, dep: CART.d / 12 };
  const items = [
    { kind: 'cart', label: 'Trash', len: cart.len, dep: cart.dep, h: CART.h / 12 },
    { kind: 'cart', label: 'Recycling', len: cart.len, dep: cart.dep, h: CART.h / 12 },
  ];
  if (s.reel !== 'none') {
    const r = { kind: 'reel', type: s.reel, label: 'Hose reel', len: reel.len, dep: reel.dep, h: reel.h, onFence: !!reel.onFence };
    if (s.reelEnd === 'drive') items.unshift(r);
    else items.push(r);
  }
  const needLen = items.reduce((a, it) => a + it.len, 0) + CONST.itemGap * (items.length - 1);
  // Place: carts pack from one end, reel sits against its end fence.
  let cursor = clearX0;
  for (const it of items) {
    it.x0 = cursor;
    it.x1 = cursor + it.len;
    it.z0 = 0.25;
    it.z1 = 0.25 + it.dep;
    cursor = it.x1 + CONST.itemGap;
  }
  if (s.reel !== 'none' && s.reelEnd === 'far' && needLen <= clearLen) {
    const r = items[items.length - 1];
    r.x1 = clearX1;
    r.x0 = clearX1 - r.len;
  }
  const fitsLen = needLen <= clearLen + 1e-6;
  const fitsDep = Math.max(...items.map((i) => i.dep)) <= clearDep + 1e-6;
  const spare = clearLen - needLen;
  if (!fitsLen) warnings.push(`Two carts${s.reel !== 'none' ? ' and the reel' : ''} need ${needLen.toFixed(1)}′ along the house, but there’s only ${clearLen.toFixed(1)}′ inside the fence. Lengthen the pad or pick a wall-mount reel.`);
  if (!fitsDep) warnings.push(`Carts are ${(CART.d / 12).toFixed(1)}′ deep but there’s only ${clearDep.toFixed(1)}′ between the siding and the front fence. Make the pad deeper.`);
  if (s.reel === 'wall' && s.reelEnd === 'drive') {
    if (s.gatePos === 'house') warnings.push('The wall-mount reel would hang on the gate. Move the reel to the far end or the gate to the outer corner.');
    else if (fixedLen < reel.dep - 0.3) warnings.push(`The fixed panel beside the gate is only ${(fixedLen * 12).toFixed(0)}" wide, too narrow for a wall-mount reel. Put the reel on the far end.`);
  }
  if (fitsLen && spare >= cart.len + CONST.itemGap) notes.push(`There’s room for a third cart or yard-waste bags (${spare.toFixed(1)}′ spare along the house).`);

  // ---------- Bill of materials ----------
  const lines = [];
  const add = (group, priceId, qty, extra = {}) => {
    if (!(qty > 0)) return;
    const p = PRICE_BY_ID[priceId];
    const unitPrice = priceOf(s, priceId);
    lines.push({ group, priceId, label: extra.label || p.label, qty, unit: p.unit, unitPrice, total: qty * unitPrice, note: extra.note || '', src: p.src });
  };

  add('Wall & caps', blk.price, blocks, {
    label: `${blk.name} block`,
    note: `${faceArea.toFixed(0)} sq ft of face incl. 1 buried course, +5%${blk.perPallet ? ` · ${(blocks / blk.perPallet).toFixed(2)} pallets of ${blk.perPallet}` : ''}`,
  });
  add('Wall & caps', blk.capPrice, caps, { note: `${capRunFt.toFixed(1)}′ of cap, +5%` });

  add('Pavers', pav.price, paverCount, {
    label: pav.name,
    note: `${paverArea.toFixed(0)} sq ft inside the caps +10% waste${pav.w ? ` = ${paverAreaOrder.toFixed(0)} sq ft` : ''}`,
  });

  add('Stone & base', 'st_304', order304, { note: `${cy304.toFixed(2)} cu yd: pad fill + 6" base + wall trench, compacted in 2–3" lifts` });
  add('Stone & base', 'st_57', order57, { note: `${cy57.toFixed(2)} cu yd: 12" behind the wall, full height` });
  add('Stone & base', 'st_sand', orderSand, { note: `${cySand.toFixed(2)} cu yd at 1"` });
  add('Stone & base', 'st_delivery', 1, { note: 'Ask the yard for a split load' });

  add('Drainage & finishing', 'dr_pipe', ceil(wallLen + 10), { note: 'Wall run + ~10′ to daylight' });
  add('Drainage & finishing', 'dr_fabric', Math.max(1, ceil((wallLen * ((drop + 12) / 12 + 2)) / 150)));
  add('Drainage & finishing', 'dr_edge', Math.max(1, ceil(D / 8)), { note: 'Along the driveway edge' });
  add('Drainage & finishing', 'dr_adhesive', Math.max(1, ceil(capRunFt / 10)));
  add('Drainage & finishing', 'dr_polysand', Math.max(1, ceil(paverArea / 40)));

  const postCounts = { 8: 0, 10: 0, 12: 0 };
  posts.forEach((p) => postCounts[p.stock]++);
  const ptPosts = () => {
    for (const len of [8, 10, 12]) add('Fence & gate', `fn_post${len}`, postCounts[len]);
  };
  const gateW = gate.width;
  const gateBoards = ceil((gateW * 12) / CONST.pickerIn);
  const fenceArea = (fenceLF + gateW) * s.fh; // one face, sq ft
  const nBays = bays.length;

  if (s.fence === 'cedar') {
    ptPosts();
    add('Fence & gate', 'fn_cedar_picket', bays.reduce((a, b) => a + ceil((b * 12) / CONST.pickerIn), 0) + gateBoards, { note: 'Tight dog-ear privacy, incl. gate' });
    add('Fence & gate', 'fn_rail', nBays * 2, { note: '2 rails per bay' });
    add('Fence & gate', 'fn_hardware', 1);
    add('Fence & gate', 'fn_gate_frame', 1);
    add('Fence & gate', 'fn_gate_hw', 1);
    add('Fence & gate', 'fn_primer', Math.max(1, ceil((fenceArea * 2) / 300)));
    add('Fence & gate', 'fn_paint', Math.max(1, ceil((fenceArea * 2 * 2) / 350)), { note: '2 coats, both faces' });
  } else if (s.fence === 'siding') {
    ptPosts();
    add('Fence & gate', 'fn_siding_lf', Math.round((fenceLF + gateW) * (s.bothFaces ? 1.7 : 1) * 10) / 10, { note: s.bothFaces ? 'Both faces clad' : 'One face clad; framed side toward the cans' });
    add('Fence & gate', 'fn_gate_frame', 1);
    add('Fence & gate', 'fn_gate_hw', 1);
  } else if (s.fence === 'pvc') {
    ptPosts();
    const per = Math.max(1, Math.floor(8 / s.fh));
    const pick = bays.reduce((a, b) => a + ceil((b * 12) / CONST.pickerIn), 0) + gateBoards;
    add('Fence & gate', 'fn_pvc_board', ceil(pick / per), { note: `${pick} boards cut ${per} per 8′ board` });
    add('Fence & gate', 'fn_rail', nBays * 2, { note: 'Frame rails' });
    add('Fence & gate', 'fn_pvc_sleeve', posts.length);
    add('Fence & gate', 'fn_hardware', 1);
    add('Fence & gate', 'fn_gate_frame', 1);
    add('Fence & gate', 'fn_gate_hw', 1);
    if (luminance(s.fenceColor) < 0.88) {
      add('Fence & gate', 'fn_paint', Math.max(1, ceil((fenceArea * 2 * 2) / 400)), { note: '100% acrylic; heat-reflective for dark colors' });
    }
  } else if (s.fence === 'trex') {
    add('Fence & gate', 'fn_trex_post', posts.length);
    add('Fence & gate', 'fn_trex_kit', packBays(bays), { note: `${nBays} bays; boards cut down to ${s.fh}′` });
    add('Fence & gate', 'fn_trex_gate', 1);
    add('Fence & gate', 'fn_gate_hw', 1, { label: 'Self-closing hinges, latch, cane bolt' });
  } else if (s.fence === 'vinyl') {
    add('Fence & gate', 'fn_vinyl_post', posts.length);
    add('Fence & gate', 'fn_vinyl_panel', packBays(bays), { note: `${nBays} bays; panels cut to width` });
    add('Fence & gate', 'fn_vinyl_gate', 1);
  }
  add('Fence & gate', 'fn_concrete', concreteBags, { note: `${posts.length} posts, ${fen.post === 5 ? 10 : 8}" holes ${CONST.frostIn}" below grade` });

  if (s.reel === 'wall') {
    add('Hose reel', 'rl_wall', 1);
    add('Hose reel', 'rl_backer', 1);
  } else if (s.reel === 'box') add('Hose reel', 'rl_box', 1);
  else if (s.reel === 'cart') add('Hose reel', 'rl_cart', 1);
  if (s.reel !== 'none') add('Hose reel', 'rl_leader', 1);

  add('Tool rentals', 'rn_compactor', 2, { note: '2 days' });
  add('Tool rentals', 'rn_saw', 1, { note: '1 day' });
  if (s.auger) add('Tool rentals', 'rn_auger', 1, { note: '1 day' });

  // ---------- Totals ----------
  const groups = {};
  for (const l of lines) groups[l.group] = (groups[l.group] || 0) + l.total;
  const HARD = ['Wall & caps', 'Pavers', 'Stone & base', 'Drainage & finishing', 'Tool rentals'];
  const hardscape = HARD.reduce((a, g) => a + (groups[g] || 0), 0);
  const fence = groups['Fence & gate'] || 0;
  const extras = groups['Hose reel'] || 0;
  const subtotal = hardscape + fence + extras;
  const taxRate = s.tax / 100;
  const tax = subtotal * taxRate;

  return {
    L, D, drop, blk, pav, fen, reel,
    fenceHex: fenceColorHex(s),
    dropAt,
    wall: { front, far, farLen, blocks, blocksRaw, caps, capRunFt, faceArea, wallLen, farCourses, wallDepthIn, bdFt, capH: blk.cap.h / 12, capD: blk.cap.d / 12 },
    pad: { x: padX, z: padZ, area: paverArea, order: paverAreaOrder, count: paverCount },
    stone: { cy304, cy57, cySand, order304, order57, orderSand, total: order304 + order57 + orderSand },
    fenceLayout: { ps, off, fx0, fx1, fz1, z0, posts, bays, segs, gate, fixedLen, gateFits, fullGate, fenceLF, concreteBags, postCounts },
    items, clear: { x0: clearX0, x1: clearX1, z1: clearZ1, len: clearLen, dep: clearDep, need: needLen, fitsLen, fitsDep },
    lines,
    totals: { groups, hardscape, fence: fence, extras, subtotal, tax, taxRate, total: subtotal + tax },
    warnings, notes,
  };
}
