// Design state, defaults, and URL (hash) encoding so a link restores a design.
import { BLOCKS, PAVERS, FENCES, REELS, PRICE_BY_ID } from './catalog.js';

export const LIMITS = {
  L: { min: 6, max: 14, step: 0.5 },
  D: { min: 4, max: 9, step: 0.5 },
  drop: { min: 0, max: 48, step: 1 },
  fh: { min: 3, max: 4, step: 0.5 },
  tax: { min: 0, max: 12, step: 0.05 },
};

export function defaultState() {
  return {
    name: '',
    L: 10, // pad length along the house (ft)
    D: 7, // pad depth out from the house (ft)
    drop: 30, // lawn drop at the far end (in); same next to the house
    block: 'rockwall',
    blockColor: 'yukon',
    paver: 'patio',
    paverColor: 'grayblend',
    fence: 'cedar',
    fenceColor: FENCES.cedar.defaultColor, // hex for picker materials, id for fixed
    fh: 4,
    gate: 4, // 3 or 4 ft
    gatePos: 'outer', // 'outer' corner or 'house' side of the driveway end
    reel: 'wall',
    reelEnd: 'far', // 'far' end or 'drive' end
    auger: false,
    bothFaces: false, // siding screen: clad both faces
    tax: 7.25,
    prices: {}, // overrides only: { id: number }
  };
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const snap = (v, step) => Math.round(v / step) * step;
const num = (s, lim, fallback) => {
  const v = parseFloat(s);
  if (!Number.isFinite(v)) return fallback;
  return clamp(snap(v, lim.step), lim.min, lim.max);
};
const isHex = (s) => /^[0-9a-f]{6}$/i.test(s || '');

export function fenceColorHex(state) {
  const f = FENCES[state.fence];
  if (f.colorMode === 'picker') return state.fenceColor;
  return (f.colors.find((c) => c.id === state.fenceColor) || f.colors[0]).hex;
}

// Make sure dependent choices are valid (e.g. color belongs to the chosen product).
export function normalize(s) {
  if (!BLOCKS[s.block]) s.block = 'rockwall';
  if (!BLOCKS[s.block].colors.some((c) => c.id === s.blockColor)) s.blockColor = BLOCKS[s.block].colors[0].id;
  if (!PAVERS[s.paver]) s.paver = 'patio';
  if (!PAVERS[s.paver].colors.some((c) => c.id === s.paverColor)) s.paverColor = PAVERS[s.paver].colors[0].id;
  if (!FENCES[s.fence]) s.fence = 'cedar';
  const f = FENCES[s.fence];
  if (f.colorMode === 'picker') {
    if (!/^#[0-9a-f]{6}$/i.test(s.fenceColor)) s.fenceColor = f.defaultColor;
  } else if (!f.colors.some((c) => c.id === s.fenceColor)) {
    s.fenceColor = f.colors[0].id;
  }
  if (s.gate !== 3 && s.gate !== 4) s.gate = 4;
  if (s.gatePos !== 'house') s.gatePos = 'outer';
  if (!REELS[s.reel]) s.reel = 'wall';
  if (s.reelEnd !== 'drive') s.reelEnd = 'far';
  return s;
}

const fmt = (v) => String(Math.round(v * 100) / 100);

export function encode(s) {
  const d = defaultState();
  const p = new URLSearchParams();
  p.set('v', '1');
  if (s.name) p.set('n', s.name.slice(0, 60));
  p.set('L', fmt(s.L));
  p.set('D', fmt(s.D));
  p.set('dr', fmt(s.drop));
  p.set('bk', s.block);
  p.set('bc', s.blockColor);
  p.set('pv', s.paver);
  p.set('pc', s.paverColor);
  p.set('fm', s.fence);
  p.set('fc', s.fenceColor.replace('#', ''));
  p.set('fh', fmt(s.fh));
  p.set('gw', String(s.gate));
  if (s.gatePos !== d.gatePos) p.set('gp', s.gatePos);
  p.set('hr', s.reel);
  if (s.reelEnd !== d.reelEnd) p.set('re', s.reelEnd);
  if (s.auger) p.set('au', '1');
  if (s.bothFaces) p.set('bf', '1');
  if (s.tax !== d.tax) p.set('tx', fmt(s.tax));
  const ov = Object.entries(s.prices)
    .filter(([id, v]) => PRICE_BY_ID[id] && Number.isFinite(v) && v !== PRICE_BY_ID[id].price)
    .map(([id, v]) => `${id}:${fmt(v)}`);
  if (ov.length) p.set('p', ov.join(','));
  return p.toString();
}

export function decode(hash) {
  const s = defaultState();
  const p = new URLSearchParams((hash || '').replace(/^#/, ''));
  if (!p.has('v')) return null;
  if (p.has('n')) s.name = p.get('n').slice(0, 60);
  s.L = num(p.get('L'), LIMITS.L, s.L);
  s.D = num(p.get('D'), LIMITS.D, s.D);
  s.drop = num(p.get('dr'), LIMITS.drop, s.drop);
  s.block = p.get('bk') || s.block;
  s.blockColor = p.get('bc') || s.blockColor;
  s.paver = p.get('pv') || s.paver;
  s.paverColor = p.get('pc') || s.paverColor;
  s.fence = p.get('fm') || s.fence;
  const fc = p.get('fc');
  if (fc) s.fenceColor = isHex(fc) && FENCES[s.fence]?.colorMode === 'picker' ? '#' + fc.toLowerCase() : fc;
  s.fh = num(p.get('fh'), LIMITS.fh, s.fh);
  s.gate = parseInt(p.get('gw'), 10) || s.gate;
  s.gatePos = p.get('gp') || s.gatePos;
  s.reel = p.get('hr') || s.reel;
  s.reelEnd = p.get('re') || s.reelEnd;
  s.auger = p.get('au') === '1';
  s.bothFaces = p.get('bf') === '1';
  s.tax = num(p.get('tx'), LIMITS.tax, s.tax);
  for (const pair of (p.get('p') || '').split(',')) {
    const [id, v] = pair.split(':');
    const n = parseFloat(v);
    if (PRICE_BY_ID[id] && Number.isFinite(n) && n >= 0) s.prices[id] = n;
  }
  return normalize(s);
}
