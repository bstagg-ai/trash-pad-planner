// Top-down plan as SVG. House along the top, driveway on the left.
import { BLOCKS, PAVERS } from './catalog.js';

const S = 40; // SVG units per foot
const f = (v) => (v * S).toFixed(1);
const inch = (ft) => {
  const totalIn = Math.round(ft * 12);
  const ftPart = Math.floor(totalIn / 12);
  const inPart = totalIn % 12;
  return inPart ? `${ftPart}′ ${inPart}″` : `${ftPart}′`;
};
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  const r = ch((n >> 16) & 255), g = ch((n >> 8) & 255), b = ch(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function dim(x1, y1, x2, y2, label, side = 1) {
  // dimension line between two points (ft) with end ticks; label at middle
  const horiz = Math.abs(y1 - y2) < 1e-6;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const t = 0.18;
  const ticks = horiz
    ? `<line x1="${f(x1)}" y1="${f(y1 - t)}" x2="${f(x1)}" y2="${f(y1 + t)}"/><line x1="${f(x2)}" y1="${f(y2 - t)}" x2="${f(x2)}" y2="${f(y2 + t)}"/>`
    : `<line x1="${f(x1 - t)}" y1="${f(y1)}" x2="${f(x1 + t)}" y2="${f(y1)}"/><line x1="${f(x2 - t)}" y1="${f(y2)}" x2="${f(x2 + t)}" y2="${f(y2)}"/>`;
  const text = horiz
    ? `<text x="${f(mx)}" y="${f(my + 0.42 * side)}" text-anchor="middle" dominant-baseline="middle" class="dimt">${esc(label)}</text>`
    : `<text x="${f(mx + 0.42 * side)}" y="${f(my)}" text-anchor="middle" dominant-baseline="middle" class="dimt" transform="rotate(-90 ${f(mx + 0.42 * side)} ${f(my)})">${esc(label)}</text>`;
  return `<g class="dim"><line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>${ticks}${text}</g>`;
}

export function renderPlan(svgHost, state, m) {
  const blk = BLOCKS[state.block];
  const blockHex = blk.colors.find((c) => c.id === state.blockColor).hex;
  const pav = PAVERS[state.paver];
  const paverHex = pav.colors.find((c) => c.id === state.paverColor).hex;
  const { L, D } = m;
  const W = m.wall, F = m.fenceLayout;

  const vx0 = -Math.max(3.2, F.gate.width + 1.1), vx1 = L + 2.6, vz0 = -1.5, vz1 = D + 2.9;
  const parts = [];

  // defs: paver pattern
  const pw = (pav.w || 12) / 12, pl = (pav.l || 18) / 12;
  let pattern;
  if (pav.pattern === 'flag') {
    pattern = `<pattern id="pv" width="${f(2)}" height="${f(2)}" patternUnits="userSpaceOnUse">
      <rect width="${f(2)}" height="${f(2)}" fill="${paverHex}"/>
      <path d="M0 ${f(1)}H${f(2)}M${f(1)} 0V${f(1)}M${f(0.5)} ${f(1)}V${f(2)}M${f(1.5)} ${f(1)}V${f(2)}M${f(1)} ${f(1.5)}H${f(1.5)}" stroke="${shade(paverHex, 0.72)}" stroke-width="1.2" fill="none"/>
      <rect x="${f(1.05)}" y="${f(0.05)}" width="${f(0.9)}" height="${f(0.9)}" fill="${shade(paverHex, 0.93)}"/></pattern>`;
  } else if (pav.pattern === 'running') {
    pattern = `<pattern id="pv" width="${f(pl)}" height="${f(pw * 2)}" patternUnits="userSpaceOnUse">
      <rect width="${f(pl)}" height="${f(pw * 2)}" fill="${paverHex}"/>
      <path d="M0 ${f(pw)}H${f(pl)}M0 ${f(pw * 2)}H${f(pl)}M${f(pl)} 0V${f(pw)}M${f(pl / 2)} ${f(pw)}V${f(pw * 2)}" stroke="${shade(paverHex, 0.72)}" stroke-width="1.2" fill="none"/></pattern>`;
  } else {
    pattern = `<pattern id="pv" width="${f(pl)}" height="${f(pw)}" patternUnits="userSpaceOnUse">
      <rect width="${f(pl)}" height="${f(pw)}" fill="${paverHex}"/>
      <path d="M0 ${f(pw)}H${f(pl)}M${f(pl)} 0V${f(pw)}" stroke="${shade(paverHex, 0.72)}" stroke-width="1.2" fill="none"/></pattern>`;
  }
  parts.push(`<defs>${pattern}
    <pattern id="hatch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="12" height="12" fill="#7e8781"/><line x1="0" y1="0" x2="0" y2="12" stroke="#6b746e" stroke-width="5"/></pattern>
    <marker id="arr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#2c3a33"/></marker>
  </defs>`);

  // context
  parts.push(`<rect x="${f(vx0)}" y="${f(vz0)}" width="${f(vx1 - vx0)}" height="${f(vz1 - vz0)}" fill="#d5e6c4"/>`);
  parts.push(`<rect x="${f(vx0)}" y="0" width="${f(-vx0)}" height="${f(vz1)}" fill="#55585a"/>`);
  parts.push(`<text x="${f(vx0 + 0.45)}" y="${f(D + 1.6)}" class="ctx light" text-anchor="middle" transform="rotate(-90 ${f(vx0 + 0.45)} ${f(D + 1.6)})">DRIVEWAY</text>`);
  parts.push(`<rect x="${f(vx0)}" y="${f(vz0)}" width="${f(vx1 - vx0)}" height="${f(-vz0)}" fill="url(#hatch)"/>`);
  parts.push(`<text x="${f(L / 2)}" y="${f(vz0 / 2)}" class="ctx light" text-anchor="middle" dominant-baseline="middle">HOUSE WALL</text>`);
  // lawn falls arrow
  parts.push(`<g class="fall"><line x1="${f(L * 0.2)}" y1="${f(D + 2.6)}" x2="${f(L * 0.8)}" y2="${f(D + 2.6)}" marker-end="url(#arr)"/><text x="${f(L * 0.5)}" y="${f(D + 2.4)}" text-anchor="middle" class="ctx">lawn falls ${m.drop}″ over ${inch(L)}</text></g>`);

  // pavers
  parts.push(`<rect x="0" y="0" width="${f(m.pad.x)}" height="${f(m.pad.z)}" fill="url(#pv)"/>`);

  // wall caps (top view)
  const capHex = shade(blockHex, 1.08), capLine = shade(blockHex, 0.7);
  const ov = 1 / 12;
  const cd = W.capD;
  parts.push(`<rect x="0" y="${f(D - cd + ov)}" width="${f(L + ov)}" height="${f(cd)}" fill="${capHex}" stroke="${capLine}" stroke-width="1.5"/>`);
  parts.push(`<rect x="${f(L - cd + ov)}" y="0" width="${f(cd)}" height="${f(D - cd + ov)}" fill="${capHex}" stroke="${capLine}" stroke-width="1.5"/>`);
  const cl = blk.cap.l / 12;
  let joints = '';
  for (let x = cl; x < L; x += cl) joints += `M${f(x)} ${f(D - cd + ov)}V${f(D + ov)}`;
  for (let z = cl; z < D - cd; z += cl) joints += `M${f(L - cd + ov)} ${f(z)}H${f(L + ov)}`;
  parts.push(`<path d="${joints}" stroke="${capLine}" stroke-width="1"/>`);

  // fence segments
  const fh = m.fenceHex, fo = shade(fh, 0.6);
  const fw = Math.max(0.12, F.ps * 0.55);
  for (const sg of F.segs) {
    if (sg.kind !== 'fence') continue;
    parts.push(`<line x1="${f(sg.a[0])}" y1="${f(sg.a[1])}" x2="${f(sg.b[0])}" y2="${f(sg.b[1])}" stroke="${fo}" stroke-width="${f(fw + 0.06)}" stroke-linecap="butt"/>`);
    parts.push(`<line x1="${f(sg.a[0])}" y1="${f(sg.a[1])}" x2="${f(sg.b[0])}" y2="${f(sg.b[1])}" stroke="${fh}" stroke-width="${f(fw)}" stroke-linecap="butt"/>`);
  }
  // gate (closed leaf + swing arc out toward the driveway)
  const G = F.gate;
  const gl = Math.abs(G.latch[1] - G.hinge[1]);
  const dir = Math.sign(G.latch[1] - G.hinge[1]);
  const hx = G.hinge[0], hz = G.hinge[1];
  parts.push(`<line x1="${f(hx)}" y1="${f(hz)}" x2="${f(G.latch[0])}" y2="${f(G.latch[1])}" stroke="${fo}" stroke-width="${f(fw * 0.8)}" stroke-dasharray="8 5"/>`);
  parts.push(`<path d="M${f(G.latch[0])} ${f(G.latch[1])} A${f(gl)} ${f(gl)} 0 0 ${dir > 0 ? 1 : 0} ${f(hx - gl)} ${f(hz)}" fill="none" stroke="#2c3a33" stroke-width="1.2" stroke-dasharray="4 4"/>`);
  parts.push(`<line x1="${f(hx)}" y1="${f(hz)}" x2="${f(hx - gl)}" y2="${f(hz)}" stroke="${fh}" stroke-width="${f(fw * 0.8)}" opacity="0.55"/>`);

  // posts
  for (const p of F.posts) {
    parts.push(`<rect x="${f(p.x - F.ps / 2)}" y="${f(p.z - F.ps / 2)}" width="${f(F.ps)}" height="${f(F.ps)}" fill="#3b2f25" stroke="#fff" stroke-width="1"><title>${esc(p.role)} post · ${p.stock}′ stock (needs ${(p.lenIn / 12).toFixed(1)}′: ${state.fh}′ above pad + ${p.grade.toFixed(0)}″ fill + 36″ below grade)</title></rect>`);
  }

  // carts + reel
  for (const it of m.items) {
    const w = it.x1 - it.x0, h = it.z1 - it.z0;
    if (it.kind === 'cart') {
      const c = it.label === 'Trash' ? '#2f3336' : '#1f4fa3';
      parts.push(`<g><rect x="${f(it.x0)}" y="${f(it.z0)}" width="${f(w)}" height="${f(h)}" rx="6" fill="${c}" stroke="#111" stroke-width="1"/>
        <rect x="${f(it.x0 + 0.15)}" y="${f(it.z1 - 0.32)}" width="${f(w - 0.3)}" height="${f(0.14)}" rx="2" fill="#111" opacity=".6"/>
        <text x="${f(it.x0 + w / 2)}" y="${f(it.z0 + h / 2 - 0.15)}" text-anchor="middle" class="item">${it.label}</text>
        <text x="${f(it.x0 + w / 2)}" y="${f(it.z0 + h / 2 + 0.3)}" text-anchor="middle" class="item sm">96 gal</text></g>`);
    } else {
      parts.push(`<g><rect x="${f(it.x0)}" y="${f(it.z0)}" width="${f(w)}" height="${f(h)}" rx="4" fill="#2f7d4f" stroke="#174a2d" stroke-width="1"/>
        <circle cx="${f(it.x0 + w / 2)}" cy="${f(it.z0 + h / 2)}" r="${f(Math.min(w, h) * 0.32)}" fill="none" stroke="#bfe5c9" stroke-width="2"/>
        <text x="${f(it.x0 + w / 2)}" y="${f(it.z1 + 0.32)}" text-anchor="middle" class="ctx">Reel</text></g>`);
    }
  }

  // dimensions
  parts.push(dim(0, D + 0.95, L, D + 0.95, `${inch(L)} along house`, 1));
  parts.push(dim(L + 0.85, 0, L + 0.85, D, `${inch(D)} out`, 1));
  parts.push(dim(-0.55, G.hinge[1], -0.55, G.latch[1], `${inch(G.width)} gate`, -1));
  // clear interior
  parts.push(`<g class="clear"><line x1="${f(m.clear.x0)}" y1="${f(F.fz1 - 0.55)}" x2="${f(m.clear.x1)}" y2="${f(F.fz1 - 0.55)}"/><text x="${f((m.clear.x0 + m.clear.x1) / 2)}" y="${f(F.fz1 - 0.72)}" text-anchor="middle">${inch(m.clear.len)} clear inside fence</text></g>`);

  // wall heights at corners (ground to top of cap)
  const tag = (x, z, txt) => `<g class="htag"><rect x="${f(x) - 30}" y="${f(z) - 13}" width="60" height="26" rx="13"/><text x="${f(x)}" y="${f(z) + 1}" text-anchor="middle" dominant-baseline="middle">${txt}</text></g>`;
  parts.push(tag(0.5, D + 0.38, '0″'));
  parts.push(tag(L / 2, D + 0.38, `${Math.round(m.dropAt(L / 2))}″`));
  parts.push(tag(L + 0.1, D + 0.38, `${Math.round(m.drop)}″`));
  parts.push(tag(L + 0.55, 0.45, `${Math.round(m.drop)}″`));

  svgHost.innerHTML = `<svg viewBox="${f(vx0)} ${f(vz0)} ${f(vx1 - vx0)} ${f(vz1 - vz0)}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Top-down plan, ${inch(L)} by ${inch(D)}">${parts.join('')}</svg>`;
}
