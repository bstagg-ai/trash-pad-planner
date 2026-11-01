// Run with: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildModel, packBays } from '../js/model.js';
import { defaultState, encode, decode } from '../js/state.js';

const within = (v, lo, hi, what) => assert.ok(v >= lo && v <= hi, `${what} = ${v}, expected ${lo}–${hi}`);

test('quoted 10x7 pad with a 30" drop lands in plan.md ranges', () => {
  const m = buildModel(defaultState());
  within(m.wall.blocks, 55, 65, 'large blocks');
  within(m.wall.caps, 12, 14, 'caps');
  within(m.stone.cy304 + m.stone.cy57, 4, 5, 'stone cu yd');
  within(m.stone.cySand, 0.15, 0.3, 'sand cu yd');
  const g = m.totals.groups;
  within(g['Wall & caps'], 900, 1200, 'wall + caps $');
  within(g['Stone & base'], 350, 550, 'stone $');
  within(g['Drainage & finishing'], 150, 250, 'drainage $');
  within(g['Tool rentals'], 200, 300, 'rentals $');
  within(m.totals.subtotal, 2400, 3500, 'cedar build subtotal $');
  assert.equal(m.warnings.length, 0, m.warnings.join('\n'));
});

test('Trex build lands in plan.md range (adjusted for the 3rd fence side)', () => {
  const s = defaultState();
  s.fence = 'trex';
  s.fenceColor = 'wg';
  const m = buildModel(s);
  within(m.totals.subtotal, 3700, 5600, 'trex subtotal $');
});

test('trimming depth to 5 ft shrinks wall and fill', () => {
  const a = buildModel(defaultState());
  const s = defaultState();
  s.D = 5;
  const b = buildModel(s);
  assert.ok(b.wall.blocks < a.wall.blocks);
  assert.ok(b.stone.total < a.stone.total);
  assert.ok(b.totals.subtotal < a.totals.subtotal);
});

test('gate: 4 ft fails on a shallow pad, 3 ft fits', () => {
  const s = defaultState();
  s.D = 5;
  assert.ok(!buildModel(s).fenceLayout.gateFits);
  s.gate = 3;
  assert.ok(buildModel(s).fenceLayout.gateFits);
});

test('fence covers 3 sides with gate on driveway end', () => {
  const m = buildModel(defaultState());
  const gates = m.fenceLayout.segs.filter((x) => x.kind === 'gate');
  assert.equal(gates.length, 1);
  assert.ok(Math.abs(gates[0].a[0] - m.fenceLayout.fx0) < 1e-9 && Math.abs(gates[0].b[0] - m.fenceLayout.fx0) < 1e-9);
  assert.equal(m.fenceLayout.posts.length, 6);
});

test('packBays', () => {
  assert.equal(packBays([4.3, 4.3, 5.75, 1.75]), 3);
  assert.equal(packBays([8, 8]), 2);
});

test('URL round trip incl. price overrides', () => {
  const s = defaultState();
  Object.assign(s, { name: 'Version B', L: 9.5, D: 5, drop: 22, fence: 'pvc', fenceColor: '#334455', gate: 3, reel: 'box', tax: 8 });
  s.prices.blk_rockwall = 16.25;
  const back = decode('#' + encode(s));
  assert.deepEqual(back, s);
});

test('trimmed 5 ft pad with 3 ft gate: gate spans the side, no sliver panel or extra post', () => {
  const s = defaultState();
  Object.assign(s, { D: 5, gate: 3 });
  const m = buildModel(s);
  assert.ok(m.fenceLayout.fullGate);
  assert.equal(m.fenceLayout.posts.length, 5);
  assert.ok(m.fenceLayout.gate.width > 3 && m.fenceLayout.gate.width < 3.5, `gate ${m.fenceLayout.gate.width}`);
  assert.equal(m.warnings.length, 0, m.warnings.join('\n'));
});
