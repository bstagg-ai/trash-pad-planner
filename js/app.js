import { BLOCKS, PAVERS, FENCES, REELS, PRICES, PRICE_BY_ID, QUOTE } from './catalog.js';
import { defaultState, normalize, encode, decode, LIMITS } from './state.js';
import { buildModel, priceOf } from './model.js';
import { renderPlan } from './plan2d.js';

const $ = (sel) => document.querySelector(sel);
const money = (v) => '$' + Math.round(v).toLocaleString('en-US');
const money2 = (v) => '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qtyFmt = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, ''));
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

let state = decode(location.hash) || defaultState();
let model = null;
let scene = null;
let view = '3d';

// ---------- 3D (lazy, with graceful failure) ----------
async function initScene() {
  try {
    const c = document.createElement('canvas');
    if (!(c.getContext('webgl2') || c.getContext('webgl'))) throw new Error('no webgl');
    const { createScene } = await import('./scene3d.js');
    scene = createScene($('#three'));
    scene.update(state, model);
  } catch (e) {
    console.warn('3D unavailable', e);
    $('#glFail').hidden = false;
    $('#tools3d').hidden = true;
  }
}

// ---------- UI builders ----------
function cards(host, entries, current, onPick) {
  host.innerHTML = '';
  host.setAttribute('role', 'radiogroup');
  for (const [value, label, sub] of entries) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'opt';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(value === current));
    b.innerHTML = `<b>${esc(label)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}`;
    b.onclick = () => onPick(value);
    host.appendChild(b);
  }
}

function seg(host, entries, current, onPick) {
  host.innerHTML = '';
  host.setAttribute('role', 'radiogroup');
  for (const [value, label, sub] of entries) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(value === current));
    b.innerHTML = esc(label) + (sub ? `<small>${esc(sub)}</small>` : '');
    b.onclick = () => onPick(value);
    host.appendChild(b);
  }
}

function swatches(host, colors, current, onPick) {
  host.innerHTML = '';
  host.setAttribute('role', 'radiogroup');
  for (const c of colors) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sw';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(c.id === current));
    b.innerHTML = `<i style="background:${c.hex}"></i>${esc(c.name)}`;
    b.onclick = () => onPick(c.id);
    host.appendChild(b);
  }
}

function set(patch) {
  Object.assign(state, patch);
  normalize(state);
  renderAll();
}

// ---------- range + number pairs ----------
function bindRange(key) {
  const lim = LIMITS[key];
  const r = $(`#${key}-r`), n = $(`#${key}-n`);
  for (const el of [r, n]) Object.assign(el, { min: lim.min, max: lim.max, step: lim.step });
  r.addEventListener('input', () => set({ [key]: parseFloat(r.value) }));
  n.addEventListener('change', () => {
    let v = parseFloat(n.value);
    if (!Number.isFinite(v)) v = state[key];
    v = Math.min(lim.max, Math.max(lim.min, Math.round(v / lim.step) * lim.step));
    set({ [key]: v });
  });
}
function syncRange(key) {
  const r = $(`#${key}-r`), n = $(`#${key}-n`);
  r.value = state[key];
  if (document.activeElement !== n) n.value = state[key];
}

// ---------- render: design controls ----------
function renderDesign() {
  ['L', 'D', 'drop', 'tax'].forEach(syncRange);
  if (document.activeElement !== $('#name')) $('#name').value = state.name;

  const blk = BLOCKS[state.block];
  cards($('#blockCards'), Object.entries(BLOCKS).map(([k, b]) => [k, b.name, `${b.bh}"×${b.bw}" face · ${b.where}`]), state.block, (v) => set({ block: v }));
  swatches($('#blockSwatches'), blk.colors, state.blockColor, (v) => set({ blockColor: v }));
  $('#blockNote').textContent = blk.note;

  const pav = PAVERS[state.paver];
  cards($('#paverCards'), Object.entries(PAVERS).map(([k, p]) => [k, p.name, money2(priceOf(state, p.price)) + ' / ' + PRICE_BY_ID[p.price].unit]), state.paver, (v) => set({ paver: v }));
  swatches($('#paverSwatches'), pav.colors, state.paverColor, (v) => set({ paverColor: v }));
  $('#paverNote').textContent = pav.note;

  const fen = FENCES[state.fence];
  cards(
    $('#fenceCards'),
    Object.entries(FENCES).map(([k, f]) => [k, f.name, f.colorMode === 'picker' ? 'Any color' : f.colors.map((c) => c.name).join(' · ')]),
    state.fence,
    (v) => set({ fence: v, fenceColor: FENCES[v].colorMode === 'picker' ? FENCES[v].defaultColor : FENCES[v].colors[0].id }),
  );
  const fc = $('#fenceColor');
  if (fen.colorMode === 'fixed') {
    fc.className = 'swatches';
    swatches(fc, fen.colors, state.fenceColor, (v) => set({ fenceColor: v }));
  } else {
    fc.className = '';
    fc.removeAttribute('role');
    fc.innerHTML = `<div class="picker"><input type="color" id="fcPick" value="${state.fenceColor}" aria-label="Fence color" /><span class="hex">${state.fenceColor}</span></div><div class="swatches" id="fcPresets"></div>`;
    const pick = $('#fcPick');
    pick.addEventListener('input', () => {
      state.fenceColor = pick.value;
      fc.querySelector('.hex').textContent = pick.value;
      softRender();
    });
    pick.addEventListener('change', () => set({ fenceColor: pick.value }));
    swatches(
      $('#fcPresets'),
      fen.presets.map((p) => ({ id: p.hex, name: p.name, hex: p.hex })),
      state.fenceColor,
      (v) => set({ fenceColor: v }),
    );
  }
  $('#fenceNote').textContent = fen.note;
  $('#bothFacesRow').hidden = state.fence !== 'siding';
  $('#bothFaces').checked = state.bothFaces;

  seg($('#fhSeg'), [[3, '3′'], [3.5, '3½′'], [4, '4′']], state.fh, (v) => set({ fh: v }));
  seg($('#gateSeg'), [[3, '3′', 'lighter, tighter'], [4, '4′', 'standard kit size']], state.gate, (v) => set({ gate: v }));
  seg($('#gatePosSeg'), [['outer', 'Outer corner'], ['house', 'Next to house']], state.gatePos, (v) => set({ gatePos: v }));
  seg($('#reelSeg'), Object.entries(REELS).map(([k, r]) => [k, { wall: 'Wall-mount', box: 'Hideaway box', cart: 'Reel cart', none: 'None' }[k]]), state.reel, (v) => set({ reel: v }));
  seg($('#reelEndSeg'), [['far', 'Far end'], ['drive', 'Driveway end']], state.reelEnd, (v) => set({ reelEnd: v }));
  $('#reelEndSeg').closest('.field').hidden = state.reel === 'none';
  $('#auger').checked = state.auger;

  const m = model;
  const F = m.fenceLayout;
  $('#gateNote').textContent = F.gateFits
    ? `Hinged on the ${state.gatePos === 'outer' ? 'corner post' : 'post by the house'}, swings out over the driveway. A 4′ gate is the standard size for vinyl, Trex and steel gate-frame kits and clears a 28″ cart easily; 3′ is lighter but tight with two hands on a cart. ${F.fullGate ? `On this depth the gate spans the whole driveway side (${Math.round(F.gate.width * 12)}″ leaf, no fixed panel), since a sliver of fence would be harder to build. Steel gate-frame kits adjust to fit.` : `Fixed panel beside it: ${(F.fixedLen * 12).toFixed(0)}″.`}`
    : `A ${state.gate}′ gate doesn’t fit this depth. Try 3′ or a deeper pad.`;
  $('#padSummary').innerHTML = `Paver area <b>${m.pad.area.toFixed(0)} sq ft</b> · tallest wall <b>${m.drop}″</b> at the far end · wall <b>${m.wall.wallLen.toFixed(1)}′</b> long · inside the fence <b>${m.clear.len.toFixed(1)}′ × ${m.clear.dep.toFixed(1)}′</b>`;
}

// ---------- render: warnings ----------
function renderWarnings() {
  const html = model.warnings.map((w) => `<div class="warn">⚠️ ${esc(w)}</div>`).join('');
  $('#warnDesign').innerHTML = html;
  $('#warnMat').innerHTML = html;
}

// ---------- render: materials ----------
function renderMaterials() {
  const m = model;
  const F = m.fenceLayout;
  const kp = [
    [m.wall.blocks, 'wall blocks'],
    [m.wall.caps, 'caps'],
    [m.pav.w ? m.pad.count : Math.ceil(m.pad.order), m.pav.w ? 'pavers' : 'sq ft pavers'],
    [m.stone.total.toFixed(2), 'cu yd stone + sand'],
    [F.posts.length, `posts (${[8, 10, 12].filter((l) => F.postCounts[l]).map((l) => `${F.postCounts[l]}×${l}′`).join(', ')})`],
    [F.concreteBags, 'concrete bags'],
    [F.bays.length, `fence sections + 1 gate`],
    [(F.fenceLF + F.gate.width).toFixed(1) + '′', 'of fence incl. gate'],
  ];
  $('#kpis').innerHTML = kp.map(([v, l]) => `<div class="kpi"><b>${v}</b><span>${esc(l)}</span></div>`).join('');

  const groups = [];
  for (const l of m.lines) {
    let g = groups.find((x) => x.name === l.group);
    if (!g) groups.push((g = { name: l.group, lines: [], total: 0 }));
    g.lines.push(l);
    g.total += l.total;
  }
  let rows = `<thead><tr><th>Item</th><th class="n">Qty</th><th class="n">Unit $</th><th class="n">Total</th></tr></thead><tbody>`;
  for (const g of groups) {
    rows += `<tr class="grp"><td colspan="3">${esc(g.name)}</td><td class="n">${money(g.total)}</td></tr>`;
    for (const l of g.lines) {
      rows += `<tr><td>${esc(l.label)}${l.note ? `<span class="note">${esc(l.note)}</span>` : ''}</td><td class="n">${qtyFmt(l.qty)} <small>${esc(l.unit)}</small></td><td class="n">${money2(l.unitPrice)}</td><td class="n">${money(l.total)}</td></tr>`;
    }
  }
  const t = m.totals;
  rows += `<tr class="tot"><td colspan="3">Subtotal</td><td class="n">${money(t.subtotal)}</td></tr>`;
  rows += `<tr class="tot"><td colspan="3">Sales tax (${state.tax}%)</td><td class="n">${money(t.tax)}</td></tr>`;
  rows += `<tr class="grand"><td colspan="3">DIY total</td><td class="n">${money(t.total)}</td></tr>`;
  rows += `<tr><td colspan="3">Quality YHM quote</td><td class="n">${money2(QUOTE.total)}</td></tr></tbody>`;
  $('#bom').innerHTML = rows;

  const notes = [
    ...m.notes,
    `Wall: ${m.wall.blocksRaw} blocks in place (${m.wall.faceArea.toFixed(0)} sq ft of face, one course buried), stepping down in ${m.blk.bh}″ courses as the grade rises toward the driveway. ${m.wall.farCourses} courses at the far end.`,
    `Posts sit ${(F.off * 12).toFixed(0)}″ behind the wall face in their own footings, ${36}″ below grade, so the fence doesn’t load the wall. Set them before stacking block. Low-side posts need 10′ stock because they pass through the fill.`,
    'Stone assumes 4″ of topsoil stripped, a 6″ minimum compacted base, and a 1″ sand bed. Order bulk from a landscape yard, not bags.',
    'Labor, plant removal/disposal, permits and tools you already own aren’t included.',
  ];
  $('#matNotes').innerHTML = notes.map((n) => `<li>${esc(n)}</li>`).join('');
}

function shoppingList() {
  const m = model;
  const lines = [`Trash pad${state.name ? ' – ' + state.name : ''}: ${state.L}′ × ${state.D}′, ${state.drop}″ drop`, ''];
  let g = '';
  for (const l of m.lines) {
    if (l.group !== g) {
      g = l.group;
      lines.push(`${g}:`);
    }
    lines.push(`  • ${l.label}: ${qtyFmt(l.qty)} ${l.unit} (${money(l.total)})`);
  }
  lines.push('', `Subtotal ${money(m.totals.subtotal)} + tax ${money(m.totals.tax)} = ${money(m.totals.total)}`, location.href);
  return lines.join('\n');
}

// ---------- render: prices ----------
let priceTableBuilt = false;
function renderPrices() {
  const tbl = $('#priceTable');
  if (!priceTableBuilt) {
    let html = '<thead><tr><th>Item</th><th>Unit</th><th class="n">Price</th></tr></thead><tbody>';
    let g = '';
    for (const p of PRICES) {
      if (p.group !== g) {
        g = p.group;
        html += `<tr class="grp"><td colspan="3">${esc(g)}</td></tr>`;
      }
      html += `<tr data-id="${p.id}"><td>${esc(p.label)} <span class="badge ${p.src}">${p.src === 'plan' ? 'plan.md' : 'est.'}</span>${p.hint ? `<span class="hint2">${esc(p.hint)}</span>` : ''}</td><td>${esc(p.unit)}</td><td class="n">$<input type="number" min="0" step="0.01" inputmode="decimal" aria-label="${esc(p.label)} price" /></td></tr>`;
    }
    tbl.innerHTML = html + '</tbody>';
    tbl.addEventListener('input', (e) => {
      const row = e.target.closest('tr[data-id]');
      if (!row) return;
      const id = row.dataset.id;
      const v = parseFloat(e.target.value);
      if (!Number.isFinite(v) || v < 0 || v === PRICE_BY_ID[id].price) delete state.prices[id];
      else state.prices[id] = v;
      row.classList.toggle('changed', id in state.prices);
      renderAll({ skipPrices: true });
    });
    priceTableBuilt = true;
  }
  for (const row of tbl.querySelectorAll('tr[data-id]')) {
    const id = row.dataset.id;
    const input = row.querySelector('input');
    if (document.activeElement !== input) input.value = priceOf(state, id);
    row.classList.toggle('changed', id in state.prices);
  }
}

// ---------- render: quote comparison ----------
function renderQuote() {
  const t = model.totals;
  const diyHard = t.hardscape * (1 + t.taxRate);
  const diyFence = t.fence * (1 + t.taxRate);
  const diyExtra = t.extras * (1 + t.taxRate);
  const save = QUOTE.total - t.total;
  const max = Math.max(QUOTE.total, t.total);
  const pct = (v) => ((v / max) * 100).toFixed(2) + '%';
  const C = { hard: '#2f6d4f', fence: '#c08a52', tax: '#9aa59f', extra: '#4f7fc9' };
  const qHard = QUOTE.hardscape, qFence = QUOTE.fence;
  $('#quoteBox').innerHTML = `
    <div class="cmp">
      <h3>DIY vs. Quality YHM (${QUOTE.date})</h3>
      <div class="big">${save >= 0 ? 'Save ' + money(save) : 'Costs ' + money(-save) + ' more'}</div>
      <div class="bars">
        <div class="bar-row"><span>Quality YHM</span><div class="bar"><i style="width:${pct(qHard)};background:${C.hard}"></i><i style="width:${pct(qFence)};background:${C.fence}"></i><i style="width:${pct(QUOTE.tax)};background:${C.tax}"></i></div><span class="n">${money2(QUOTE.total)}</span></div>
        <div class="bar-row"><span>Your DIY</span><div class="bar"><i style="width:${pct(t.hardscape)};background:${C.hard}"></i><i style="width:${pct(t.fence)};background:${C.fence}"></i><i style="width:${pct(t.extras)};background:${C.extra}"></i><i style="width:${pct(t.tax)};background:${C.tax}"></i></div><span class="n">${money(t.total)}</span></div>
      </div>
      <div class="legend"><span style="--c:${C.hard}">Wall, pad, base, rentals</span><span style="--c:${C.fence}">Fence &amp; gate</span><span style="--c:${C.extra}">Hose reel (not in quote)</span><span style="--c:${C.tax}">Tax</span></div>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Line</th><th class="n">Quote</th><th class="n">DIY (incl. tax)</th></tr></thead>
      <tbody>
        <tr><td>Hardscaping: wall, pavers, drainage, base<span class="note" style="display:block;font-size:12px;color:var(--ink-2)">Quote also covers removing 3 grasses + lilac and all labor</span></td><td class="n">${money2(qHard)}</td><td class="n">${money(diyHard)}</td></tr>
        <tr><td>Fence &amp; gate<span style="display:block;font-size:12px;color:var(--ink-2)">Quote: 4′ pressure-treated dog-ear, 4′ gate. Yours: ${esc(FENCES[state.fence].name)}, ${Math.round(model.fenceLayout.gate.width * 12)}″ gate</span></td><td class="n">${money2(qFence)}</td><td class="n">${money(diyFence)}</td></tr>
        <tr><td>Hose reel + leader hose</td><td class="n">—</td><td class="n">${money(diyExtra)}</td></tr>
        <tr><td>Tax</td><td class="n">${money2(QUOTE.tax)}</td><td class="n">in lines</td></tr>
        <tr class="grand"><td>Total</td><td class="n">${money2(QUOTE.total)}</td><td class="n">${money(t.total)}</td></tr>
      </tbody>
    </table></div>
    <ul class="notes">
      <li>The quote is for a ~${QUOTE.padL}′ × ${QUOTE.padD}′ pad; your design is ${state.L}′ × ${state.D}′.</li>
      <li>The quote needs a 50% deposit (${money2(QUOTE.total / 2)}) and is valid 30 days. plan.md suggests building DIY in April–May 2027.</li>
      <li>DIY time: about 4–5 weekend days for two people, plus a few days for post concrete to cure.</li>
    </ul>`;
}

// ---------- header ----------
function renderHeader() {
  const t = model.totals;
  $('#hdrTotal').textContent = money(t.total);
  const save = QUOTE.total - t.total;
  $('#hdrSave').textContent = save >= 0 ? `saves ${money(save)} vs quote` : `${money(-save)} over quote`;
}

// ---------- URL ----------
let urlTimer = 0;
function writeUrl(now = false) {
  clearTimeout(urlTimer);
  const go = () => {
    const h = '#' + encode(state);
    if (location.hash !== h) history.replaceState(null, '', h);
  };
  if (now) go();
  else urlTimer = setTimeout(go, 250);
}

// ---------- main render ----------
let raf = 0;
function draw3d() {
  if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = 0;
    if (scene) scene.update(state, model);
  });
}
function softRender() {
  // fast path for continuous color picking
  model = buildModel(state);
  renderPlan($('#plan'), state, model);
  draw3d();
  writeUrl();
}
function renderAll({ skipPrices = false } = {}) {
  model = buildModel(state);
  renderDesign();
  renderWarnings();
  renderMaterials();
  if (!skipPrices) renderPrices();
  renderQuote();
  renderHeader();
  renderPlan($('#plan'), state, model);
  draw3d();
  writeUrl();
}

// ---------- events ----------
['L', 'D', 'drop', 'tax'].forEach(bindRange);
$('#name').addEventListener('input', (e) => {
  state.name = e.target.value.slice(0, 60);
  writeUrl();
});
$('#bothFaces').addEventListener('change', (e) => set({ bothFaces: e.target.checked }));
$('#auger').addEventListener('change', (e) => set({ auger: e.target.checked }));
document.querySelectorAll('[data-preset]').forEach((b) =>
  b.addEventListener('click', () => set(b.dataset.preset === 'quoted' ? { L: 10, D: 7 } : { L: 10, D: 5, gate: 3 })),
);
$('#resetDesign').addEventListener('click', () => {
  const prices = state.prices;
  state = defaultState();
  state.prices = prices;
  renderAll();
  toast('Design reset (your prices kept)');
});
$('#resetPrices').addEventListener('click', () => {
  state.prices = {};
  renderAll();
  toast('Prices reset to plan.md defaults');
});

// view tabs
document.querySelectorAll('[data-view]').forEach((b) =>
  b.addEventListener('click', () => {
    view = b.dataset.view;
    document.querySelectorAll('[data-view]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    $('#three').hidden = view !== '3d';
    $('#plan').hidden = view !== 'plan';
    $('#tools3d').style.visibility = view === '3d' ? '' : 'hidden';
    $('#hint3d').hidden = view !== '3d';
  }),
);
$('#camView').addEventListener('change', (e) => scene && scene.setView(e.target.value, model));
$('#gateBtn').addEventListener('click', (e) => {
  if (!scene) return;
  const open = !scene.gateOpen;
  scene.setGateOpen(open);
  e.currentTarget.setAttribute('aria-pressed', String(open));
  e.currentTarget.querySelector('.long').textContent = open ? 'Close gate' : 'Open gate';
});
$('#miniBtn').addEventListener('click', (e) => {
  const mini = document.body.classList.toggle('mini');
  e.currentTarget.setAttribute('aria-pressed', String(mini));
});
setTimeout(() => $('#hint3d').classList.add('fade'), 5000);

// section tabs
function setTab(tab) {
  if (tab === 'design' && matchMedia('(min-width: 901px)').matches) tab = 'materials';
  document.body.dataset.tab = tab;
  document.querySelectorAll('.tabs [data-tab]').forEach((x) => x.setAttribute('aria-selected', String(x.dataset.tab === tab || (tab === 'design' && x.dataset.tab === 'design'))));
}
document.querySelectorAll('.tabs [data-tab]').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
matchMedia('(min-width: 901px)').addEventListener('change', () => setTab(document.body.dataset.tab));
setTab('design');

// sharing
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('show'), 2200);
}
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {}
    ta.remove();
    return ok;
  }
}
$('#copyBtn').addEventListener('click', async () => {
  writeUrl(true);
  const ok = await copyText(location.href);
  toast(ok ? 'Link copied. Paste it into a text.' : 'Couldn’t copy. Long-press the address bar instead.');
});
if (navigator.share) {
  $('#shareBtn').hidden = false;
  $('#shareBtn').addEventListener('click', async () => {
    writeUrl(true);
    try {
      await navigator.share({ title: state.name ? `Trash pad – ${state.name}` : 'Trash pad design', url: location.href });
    } catch {}
  });
}
$('#copyList').addEventListener('click', async () => {
  writeUrl(true);
  toast((await copyText(shoppingList())) ? 'Shopping list copied' : 'Couldn’t copy');
});

// someone pasted a different link into this tab
window.addEventListener('hashchange', () => {
  if (location.hash === '#' + encode(state)) return;
  const s = decode(location.hash);
  if (!s) return;
  state = s;
  renderAll();
});

renderAll();
writeUrl(true);
initScene();
