// three.js view of the pad, wall, fence, carts and reel. Units: feet. y is up.
import * as THREE from '../vendor/three.module.min.js';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { BLOCKS, PAVERS, FENCES } from './catalog.js';

const HOUSE_SIDING = '#5f6b63';

// ---------- small helpers ----------
const texCache = new Map();
const matCache = new Map();

function canvasTex(key, size, draw, repeat = true) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  texCache.set(key, t);
  return t;
}

function noise(ctx, size, base, amp, n = 4000, r = 1.5) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < n; i++) {
    const v = Math.floor((Math.random() - 0.5) * amp);
    ctx.fillStyle = v > 0 ? `rgba(255,255,255,${v / 255})` : `rgba(0,0,0,${-v / 255})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, r, r);
  }
}

function mat(key, opts) {
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...opts });
  matCache.set(key, m);
  return m;
}

function shadeHex(hex, k) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(k);
  return '#' + c.getHexString();
}

function box(w, h, d, material, x, y, z, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

// Box spanning [x0,x1] x [y0,y1] x [z0,z1]
function span(x0, x1, y0, y1, z0, z1, material, opts) {
  return box(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), material, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, opts);
}

// ---------- textures ----------
const grayGrain = () => canvasTex('grain', 128, (ctx, s) => noise(ctx, s, '#d8d8d8', 50, 2500, 2));
const lawnTex = () =>
  canvasTex('lawn', 256, (ctx, s) => {
    noise(ctx, s, '#6f9a4a', 60, 9000, 2);
    for (let i = 0; i < 1400; i++) {
      ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(140,190,90,.5)' : 'rgba(60,95,35,.5)';
      const x = Math.random() * s, y = Math.random() * s;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 3, y - 4);
      ctx.stroke();
    }
  });
const asphaltTex = () => canvasTex('asphalt', 256, (ctx, s) => noise(ctx, s, '#3d3f41', 70, 12000, 1.5));
const sidingTex = () =>
  canvasTex('siding', 256, (ctx, s) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, s, s);
    const n = 8;
    for (let i = 0; i < n; i++) {
      const y = (i * s) / n;
      const g = ctx.createLinearGradient(0, y, 0, y + s / n);
      g.addColorStop(0, '#c9c9c9');
      g.addColorStop(0.12, '#f4f4f4');
      g.addColorStop(1, '#e2e2e2');
      ctx.fillStyle = g;
      ctx.fillRect(0, y, s, s / n);
    }
  });
const brickTex = () =>
  canvasTex('brick', 256, (ctx, s) => {
    ctx.fillStyle = '#b7aa98';
    ctx.fillRect(0, 0, s, s);
    const rows = 12, cols = 4;
    const bh = s / rows, bw = s / cols;
    for (let r = 0; r < rows; r++) {
      for (let c = -1; c < cols + 1; c++) {
        const x = c * bw + (r % 2 ? bw / 2 : 0);
        const tone = 0.8 + Math.random() * 0.35;
        ctx.fillStyle = `rgb(${Math.round(150 * tone)},${Math.round(84 * tone)},${Math.round(62 * tone)})`;
        ctx.fillRect(x + 2, r * bh + 2, bw - 4, bh - 4);
      }
    }
  });

function paverTex(pav, hex) {
  // One texture tile = 4 ft x 4 ft
  return canvasTex(`pv-${pav.pattern}-${pav.w}-${pav.l}-${hex}`, 512, (ctx, s) => {
    const px = s / 4; // pixels per foot
    const base = new THREE.Color(hex);
    const tone = (k) => {
      const c = base.clone().multiplyScalar(k);
      return `rgb(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)})`;
    };
    ctx.fillStyle = tone(0.62);
    ctx.fillRect(0, 0, s, s);
    const joint = 3;
    const unit = (x, y, w, h) => {
      ctx.fillStyle = tone(0.88 + Math.random() * 0.22);
      ctx.fillRect(x + joint / 2, y + joint / 2, w - joint, h - joint);
    };
    if (pav.pattern === 'flag') {
      // random-ish ashlar using 6" grid modules
      const m = px / 2;
      const sizes = [[2, 2], [2, 3], [3, 2], [2, 4], [4, 2], [1, 2], [2, 1]];
      const grid = Array.from({ length: 8 }, () => Array(8).fill(false));
      for (let gy = 0; gy < 8; gy++) {
        for (let gx = 0; gx < 8; gx++) {
          if (grid[gy][gx]) continue;
          let [w, h] = sizes[Math.floor(Math.random() * sizes.length)];
          w = Math.min(w, 8 - gx);
          h = Math.min(h, 8 - gy);
          while (w > 1 && grid[gy].slice(gx, gx + w).some(Boolean)) w--;
          for (let yy = gy; yy < gy + h; yy++) for (let xx = gx; xx < gx + w; xx++) grid[yy][xx] = true;
          unit(gx * m, gy * m, w * m, h * m);
        }
      }
    } else {
      const w = (pav.l / 12) * px, h = (pav.w / 12) * px;
      const rows = Math.ceil(s / h) + 1;
      for (let r = 0; r < rows; r++) {
        const off = pav.pattern === 'running' && r % 2 ? w / 2 : 0;
        for (let x = -w; x < s + w; x += w) unit(x + off, r * h, w, h);
      }
    }
  });
}

// ---------- scene ----------
export function createScene(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#cfe2f0');
  scene.fog = new THREE.Fog('#cfe2f0', 60, 140);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 400);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.minDistance = 4;
  controls.maxDistance = 70;

  scene.add(new THREE.HemisphereLight('#e8f2ff', '#5d6e4c', 1.0));
  const sun = new THREE.DirectionalLight('#fff4e0', 2.2);
  sun.castShadow = true;
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 120 });
  scene.add(sun, sun.target);

  let world = new THREE.Group();
  scene.add(world);
  let gatePivot = null;
  let gateDir = 1;
  let gateOpen = false;
  let gateAngle = 0;
  let dirty = true;
  let lastDims = null;

  function disposeGroup(g) {
    g.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
  }

  function update(state, m) {
    disposeGroup(world);
    scene.remove(world);
    world = new THREE.Group();
    build(world, state, m);
    scene.add(world);
    const cx = m.L / 2, cz = m.D / 2;
    sun.position.set(cx - 14, 26, cz + 22);
    sun.target.position.set(cx, -1, cz);
    const dims = `${m.L}x${m.D}`;
    if (!lastDims) setView('street', m);
    lastDims = dims;
    dirty = true;
  }

  function build(g, s, m) {
    const { L, D, drop } = m;
    const blk = BLOCKS[s.block];
    const blockHex = blk.colors.find((c) => c.id === s.blockColor).hex;
    const pav = PAVERS[s.paver];
    const paverHex = pav.colors.find((c) => c.id === s.paverColor).hex;
    const grade = (x) => (x <= 0 ? 0 : -(drop / 12) * Math.min(x, L + 6) / L);

    // --- driveway ---
    const asph = asphaltTex().clone();
    asph.needsUpdate = true;
    asph.repeat.set(26 / 6, 24 / 6);
    g.add(span(-26, 0, -0.6, 0, 0, 24, new THREE.MeshStandardMaterial({ map: asph, roughness: 0.95 }), { cast: false }));

    // --- lawn (sloped) ---
    const xs = [];
    for (let x = -30; x <= L + 24; x += 1) xs.push(x);
    xs.push(0, L, L + 6);
    const xsU = [...new Set(xs.map((v) => Math.round(v * 1000) / 1000))].sort((a, b) => a - b);
    const zs = [];
    for (let z = 0; z <= D + 28; z += 1) zs.push(z);
    zs.push(D);
    const zsU = [...new Set(zs)].sort((a, b) => a - b);
    const pos = [], uv = [], idx = [];
    for (let j = 0; j < zsU.length; j++) {
      for (let i = 0; i < xsU.length; i++) {
        const x = xsU[i], z = zsU[j];
        pos.push(x, x <= 0 ? -0.05 : grade(x) - 0.01, z);
        uv.push(x / 5, z / 5);
      }
    }
    const nx = xsU.length;
    for (let j = 0; j < zsU.length - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    lg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    lg.setIndex(idx);
    lg.computeVertexNormals();
    const lawn = new THREE.Mesh(lg, mat('lawn', { map: lawnTex(), roughness: 1 }));
    lawn.receiveShadow = true;
    g.add(lawn);

    // --- house ---
    const sid = sidingTex().clone();
    sid.needsUpdate = true;
    const houseX0 = -26, houseX1 = L + 18;
    sid.repeat.set((houseX1 - houseX0) / 8, 9.4 / (8 * 0.58));
    const sidingMat = new THREE.MeshStandardMaterial({ map: sid, color: HOUSE_SIDING, roughness: 0.8 });
    const brickTop = 1.0;
    g.add(span(houseX0, 0, 0, 9.4, -1.2, 0, sidingMat, { cast: false }));
    const sid2 = sid.clone();
    sid2.needsUpdate = true;
    sid2.repeat.set(houseX1 / 8, (9.4 - brickTop) / (8 * 0.58));
    g.add(span(0, houseX1, brickTop, 9.4, -1.2, 0, new THREE.MeshStandardMaterial({ map: sid2, color: HOUSE_SIDING, roughness: 0.8 }), { cast: false }));
    const br = brickTex().clone();
    br.needsUpdate = true;
    const brickBottom = grade(houseX1) - 1.5;
    br.repeat.set(houseX1 / 3, (brickTop - brickBottom) / 2.2);
    g.add(span(0, houseX1, brickBottom, brickTop, -1.2, 0, new THREE.MeshStandardMaterial({ map: br, roughness: 0.95 }), { cast: false }));
    // fascia + roof
    const white = mat('white', { color: '#f1f1ec', roughness: 0.6 });
    g.add(span(houseX0, houseX1, 9.4, 10.1, -1.2, 1.4, white));
    const roof = box(houseX1 - houseX0, 0.25, 9, mat('roof', { color: '#7d8387', roughness: 0.95 }), (houseX0 + houseX1) / 2, 11.6, -2.6);
    roof.rotation.x = -0.4;
    g.add(roof);
    // garage door, downspout, window
    g.add(span(-10.5, -1.6, 0, 7, -0.02, 0.06, white));
    for (let y = 1.4; y < 7; y += 1.4) g.add(span(-10.5, -1.6, y - 0.03, y + 0.03, 0.06, 0.08, mat('doorline', { color: '#cfcfca' }), { cast: false }));
    g.add(span(-21, -12.1, 0, 7, -0.02, 0.06, white));
    g.add(span(-0.75, -0.45, 0, 9.4, 0.02, 0.32, white));
    const wx0 = L + 3, wx1 = L + 8;
    g.add(span(wx0, wx1, 3.4, 7.6, -0.05, 0.12, white));
    g.add(span(wx0 + 0.3, wx1 - 0.3, 3.7, 7.3, 0.05, 0.14, mat('glass', { color: '#6f8fa3', roughness: 0.15, metalness: 0.3 }), { cast: false }));

    // --- pad ---
    const tex = paverTex(pav, paverHex).clone();
    tex.needsUpdate = true;
    tex.repeat.set(m.pad.x / 4, m.pad.z / 4);
    const pt = pav.t / 12;
    const padMesh = span(0, m.pad.x, -pt, 0, 0, m.pad.z, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), { cast: false });
    // UVs on the top face map to x/z so the texture is in feet
    g.add(padMesh);
    // base below pavers to fill the driveway-end edge
    g.add(span(0, m.pad.x, -0.9, -pt, 0, m.pad.z, mat('base', { color: '#8d877d' }), { cast: false }));

    // --- wall blocks ---
    const bh = blk.bh / 12, bw = blk.bw / 12, bd = blk.bd / 12, capH = blk.cap.h / 12;
    const coursesAt = (h) => 1 + Math.max(0, Math.ceil((h - blk.cap.h) / blk.bh - 1e-9));
    const grain = grayGrain();
    const blockMats = [0.9, 0.97, 1.04, 1.1].map((k, i) =>
      mat(`blk-${blockHex}-${i}`, { color: shadeHex(blockHex, k), map: grain, roughness: 0.95 }),
    );
    const gap = 0.012;
    const pickMat = () => blockMats[Math.floor(Math.random() * blockMats.length)];
    const maxC = coursesAt(drop);
    for (let k = 0; k < maxC; k++) {
      const top = -capH - k * bh;
      // front wall along x
      const off = k % 2 ? bw / 2 : 0;
      for (let a = -off; a < L - 1e-6; a += bw) {
        const x0 = Math.max(0, a), x1 = Math.min(L, a + bw);
        if (x1 - x0 < 0.05) continue;
        if (coursesAt(m.dropAt(x1)) <= k) continue;
        g.add(span(x0 + gap, x1 - gap, top - bh + gap, top - gap, D - bd, D, pickMat()));
      }
      // far wall along z
      const off2 = k % 2 ? 0 : bw / 2;
      const zEnd = D - bd;
      for (let a = -off2; a < zEnd - 1e-6; a += bw) {
        const z0 = Math.max(0, a), z1 = Math.min(zEnd, a + bw);
        if (z1 - z0 < 0.05) continue;
        g.add(span(L - bd, L, top - bh + gap, top - gap, z0 + gap, z1 - gap, pickMat()));
      }
    }
    // caps
    const capMat = mat(`cap-${blockHex}`, { color: shadeHex(blockHex, 1.12), map: grain, roughness: 0.9 });
    const ov = 1 / 12, cd = blk.cap.d / 12, cl = blk.cap.l / 12;
    for (let x = 0; x < L + ov - 1e-6; x += cl) {
      g.add(span(x + gap, Math.min(L + ov, x + cl) - gap, -capH, 0, D - cd + ov, D + ov, capMat));
    }
    for (let z = 0; z < D - cd + ov - 1e-6; z += cl) {
      g.add(span(L - cd + ov, L + ov, -capH, 0, z + gap, Math.min(D - cd + ov, z + cl) - gap, capMat));
    }

    // --- fence ---
    buildFence(g, s, m);

    // --- carts & reel ---
    for (const it of m.items) {
      if (it.kind === 'cart') g.add(cartMesh(it));
      else g.add(reelMesh(it, s, m));
    }
  }

  function buildFence(g, s, m) {
    const F = m.fenceLayout;
    const fh = s.fh;
    const hex = m.fenceHex;
    const kind = s.fence;
    const ps = F.ps;
    const fenceMat = mat(`fence-${hex}`, { color: hex, map: grayGrain(), roughness: kind === 'vinyl' ? 0.45 : 0.8 });
    const darker = mat(`fenced-${hex}`, { color: shadeHex(hex, 0.85), roughness: 0.8 });
    const steel = mat('steel', { color: '#2b2b2b', roughness: 0.5, metalness: 0.6 });
    const postMat = kind === 'trex' || kind === 'vinyl' || kind === 'pvc' || kind === 'siding' || kind === 'cedar' ? fenceMat : fenceMat;

    // posts
    for (const p of F.posts) {
      g.add(span(p.x - ps / 2, p.x + ps / 2, m.dropAt(p.x) / -12, fh + 0.12, p.z - ps / 2, p.z + ps / 2, postMat));
      if (kind === 'trex' || kind === 'vinyl' || kind === 'pvc') {
        const cap = new THREE.Mesh(new THREE.ConeGeometry(ps * 0.8, 0.18, 4), darker);
        cap.rotation.y = Math.PI / 4;
        cap.position.set(p.x, fh + 0.21, p.z);
        cap.castShadow = true;
        g.add(cap);
      }
    }

    // outward normal for a segment: driveway run faces -x, front faces +z, far faces +x
    const outward = (sg) => {
      if (Math.abs(sg.a[0] - sg.b[0]) < 1e-6) return sg.a[0] < m.L / 2 ? [-1, 0] : [1, 0];
      return [0, 1];
    };

    const infill = (len, isGate) => {
      // Builds infill in local coords: x along the run 0..len, z = 0 is the post centerline,
      // +z = outward (finished side). Returns a group.
      const grp = new THREE.Group();
      const y0 = 0.17, y1 = fh;
      const rail = (y) => grp.add(span(0, len, y - 0.15, y + 0.15, -0.06, 0.06, darker));
      if (kind === 'cedar' || kind === 'pvc') {
        rail(0.6);
        rail(fh - 0.55);
        const w = 5.5 / 12;
        const n = Math.max(1, Math.round(len / w));
        const pw = len / n;
        const shape = new THREE.Shape();
        const ear = kind === 'cedar' ? 0.07 : 0;
        const hh = y1 - y0;
        shape.moveTo(0, 0);
        shape.lineTo(pw - 0.01, 0);
        shape.lineTo(pw - 0.01, hh - ear);
        shape.lineTo(pw - 0.01 - ear, hh);
        shape.lineTo(ear, hh);
        shape.lineTo(0, hh - ear);
        shape.closePath();
        const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: false });
        for (let i = 0; i < n; i++) {
          const pk = new THREE.Mesh(geo, i % 3 === 1 ? darker : fenceMat);
          pk.position.set(i * pw, y0, 0.07);
          pk.castShadow = pk.receiveShadow = true;
          grp.add(pk);
        }
        if (isGate) {
          // steel gate frame on the inside face
          grp.add(span(0.05, len - 0.05, 0.4, 0.5, -0.12, -0.07, steel));
          grp.add(span(0.05, len - 0.05, fh - 0.45, fh - 0.35, -0.12, -0.07, steel));
          const diag = Math.hypot(len - 0.1, fh - 0.9);
          const d = box(diag, 0.08, 0.05, steel, len / 2, fh / 2, -0.1);
          d.rotation.z = Math.atan2(fh - 0.9, len - 0.1);
          grp.add(d);
        }
      } else if (kind === 'siding') {
        const sid = sidingTex().clone();
        sid.needsUpdate = true;
        sid.repeat.set(len / 4, (y1 - y0) / (8 * 0.58));
        const sm = new THREE.MeshStandardMaterial({ map: sid, color: hex, roughness: 0.8 });
        const panel = span(0, len, y0, y1 - 0.15, -0.1, 0.1, sm);
        grp.add(panel);
        const trim = mat('trimwhite', { color: '#f1f1ec', roughness: 0.6 });
        grp.add(span(-0.02, len + 0.02, y1 - 0.15, y1, -0.14, 0.14, trim));
        grp.add(span(-0.02, len + 0.02, y0 - 0.05, y0 + 0.1, -0.13, 0.13, trim));
        if (isGate) grp.add(span(0.05, len - 0.05, fh / 2 - 0.05, fh / 2 + 0.05, -0.14, -0.1, steel));
      } else if (kind === 'trex') {
        const w = 5.5 / 12;
        const n = Math.max(2, Math.round(len / (w * 0.82)));
        const step = len / n;
        for (let i = 0; i < n; i++) {
          const zz = i % 2 ? -0.05 : 0.05;
          grp.add(span(i * step, Math.min(len, i * step + w), y0 + 0.15, y1 - 0.2, zz - 0.04, zz + 0.04, i % 2 ? darker : fenceMat));
        }
        grp.add(span(0, len, y1 - 0.22, y1, -0.12, 0.12, darker));
        grp.add(span(0, len, y0, y0 + 0.17, -0.12, 0.12, darker));
      } else if (kind === 'vinyl') {
        const vm = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.4 });
        const n = Math.max(1, Math.round(len / (7 / 12)));
        for (let i = 0; i < n; i++) {
          grp.add(span((i * len) / n + 0.005, ((i + 1) * len) / n - 0.005, y0 + 0.2, y1 - 0.25, -0.04, 0.04, vm));
        }
        grp.add(span(0, len, y1 - 0.27, y1, -0.1, 0.1, vm));
        grp.add(span(0, len, y0, y0 + 0.22, -0.1, 0.1, vm));
      }
      return grp;
    };

    for (const sg of F.segs) {
      const dx = sg.b[0] - sg.a[0], dz = sg.b[1] - sg.a[1];
      const lenC = Math.hypot(dx, dz); // post center to center
      const len = lenC - ps; // clear between posts
      if (len <= 0.02) continue;
      const ux = dx / lenC, uz = dz / lenC;
      const [ox, oz] = outward(sg);
      if (sg.kind === 'fence') {
        const grp = infill(len, false);
        // local +x -> run direction, local +z -> outward
        alignGroup(grp, ux, uz, ox, oz);
        grp.position.set(sg.a[0] + ux * (ps / 2), 0, sg.a[1] + uz * (ps / 2));
        g.add(grp);
      } else {
        // gate leaf, hinged at sg.a (hinge) — pivot group
        const pivot = new THREE.Group();
        pivot.position.set(sg.a[0], 0, sg.a[1]);
        const leaf = infill(len - 0.06, true);
        const holder = new THREE.Group();
        alignGroup(holder, ux, uz, ox, oz);
        leaf.position.set(ps / 2 + 0.03, 0, 0);
        holder.add(leaf);
        pivot.add(holder);
        // hinges
        for (const y of [0.6, fh - 0.55]) pivot.add(box(0.08, 0.2, 0.08, steel, ux * (ps / 2 + 0.02) + ox * 0.08, y, uz * (ps / 2 + 0.02) + oz * 0.08));
        g.add(pivot);
        gatePivot = pivot;
        gateDir = Math.sign(uz) || 1;
        pivot.rotation.y = gateAngle;
      }
    }
  }

  // Rotate a group so local +x points along (ux,uz) and local +z points along (ox,oz).
  function alignGroup(grp, ux, uz, ox, oz) {
    const xAxis = new THREE.Vector3(ux, 0, uz);
    const zAxis = new THREE.Vector3(ox, 0, oz);
    const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis);
    if (yAxis.y < 0) {
      // mirrored basis: flip local z by scaling
      grp.scale.z = -1;
      zAxis.negate();
      yAxis.negate();
    }
    const mtx = new THREE.Matrix4().makeBasis(xAxis, yAxis.normalize(), zAxis);
    grp.quaternion.setFromRotationMatrix(mtx);
  }

  function cartMesh(it) {
    const grp = new THREE.Group();
    const trash = it.label === 'Trash';
    const color = trash ? '#2e3236' : '#1f4fa3';
    const body = mat(`cart-${color}`, { color, roughness: 0.55 });
    const lidM = mat(`lid-${color}`, { color: shadeHex(color, trash ? 1.2 : 1.1), roughness: 0.5 });
    const black = mat('black', { color: '#151515', roughness: 0.7 });
    const w = it.len, d = it.dep, h = it.h;
    // tapered body (wider at the top)
    const geo = new THREE.CylinderGeometry(0.5, 0.42, 1, 4, 1);
    geo.rotateY(Math.PI / 4);
    const b = new THREE.Mesh(geo, body);
    b.scale.set(w * 1.32, h - 0.3, d * 1.32);
    b.position.set(0, (h - 0.3) / 2 + 0.12, 0);
    b.castShadow = b.receiveShadow = true;
    grp.add(b);
    const lid = box(w + 0.06, 0.12, d + 0.08, lidM, 0, h - 0.12, 0.02);
    grp.add(lid);
    // handle + wheels on the side facing out (toward +z)
    grp.add(box(w * 0.8, 0.09, 0.09, black, 0, h - 0.3, d / 2 + 0.08));
    for (const sx of [-1, 1]) {
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.15, 18), black);
      wh.rotation.z = Math.PI / 2;
      wh.position.set(sx * (w / 2 - 0.05), 0.42, d / 2 - 0.25);
      wh.castShadow = true;
      grp.add(wh);
    }
    grp.position.set((it.x0 + it.x1) / 2, 0, (it.z0 + it.z1) / 2);
    return grp;
  }

  function reelMesh(it, s, m) {
    const grp = new THREE.Group();
    const green = mat('hose', { color: '#2f7d3f', roughness: 0.6 });
    const gray = mat('reelgray', { color: '#53575a', roughness: 0.6, metalness: 0.2 });
    const brown = mat('resin', { color: '#5a4636', roughness: 0.8 });
    const cx = (it.x0 + it.x1) / 2, cz = (it.z0 + it.z1) / 2;
    if (it.type === 'wall') {
      // backer board on the end fence, reel on brackets
      const F = m.fenceLayout;
      const atFar = s.reelEnd !== 'drive';
      const fx = atFar ? F.fx1 - F.ps / 2 : F.fx0 + F.ps / 2;
      const sgn = atFar ? -1 : 1;
      grp.add(span(fx + sgn * 0.0, fx + sgn * 0.1, 0.9, 3.1, it.z0, it.z1, mat('backer', { color: '#8a6a4c' })));
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.55, 24), green);
      drum.rotation.x = Math.PI / 2;
      drum.position.set(fx + sgn * 0.62, 2.2, cz);
      drum.castShadow = true;
      grp.add(drum);
      for (const dz of [-0.33, 0.33]) {
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.05, 24), gray);
        disc.rotation.x = Math.PI / 2;
        disc.position.set(fx + sgn * 0.62, 2.2, cz + dz);
        grp.add(disc);
        grp.add(span(fx + sgn * 0.1, fx + sgn * 0.66, 2.15, 2.25, cz + dz - 0.03, cz + dz + 0.03, gray));
      }
    } else if (it.type === 'box') {
      grp.add(span(it.x0, it.x1, 0, it.h - 0.15, it.z0, it.z1, brown));
      grp.add(span(it.x0 - 0.04, it.x1 + 0.04, it.h - 0.15, it.h, it.z0 - 0.04, it.z1 + 0.04, mat('resinlid', { color: '#6b5544' })));
    } else if (it.type === 'cart') {
      grp.add(span(it.x0 + 0.1, it.x0 + 0.18, 0.3, it.h, it.z0 + 0.2, it.z0 + 0.28, gray));
      grp.add(span(it.x1 - 0.18, it.x1 - 0.1, 0.3, it.h, it.z0 + 0.2, it.z0 + 0.28, gray));
      grp.add(span(it.x0 + 0.1, it.x1 - 0.1, it.h - 0.08, it.h, it.z0 + 0.2, it.z0 + 0.28, gray));
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, it.len - 0.5, 24), green);
      drum.rotation.z = Math.PI / 2;
      drum.position.set(cx, 1.2, cz);
      drum.castShadow = true;
      grp.add(drum);
      for (const sx of [it.x0 + 0.15, it.x1 - 0.15]) {
        const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.12, 16), mat('black', { color: '#151515' }));
        wh.rotation.z = Math.PI / 2;
        wh.position.set(sx, 0.33, it.z1 - 0.4);
        grp.add(wh);
      }
    }
    return grp;
  }

  function setView(name, m) {
    const L = m?.L ?? 10, D = m?.D ?? 7;
    const views = {
      street: { p: [L * 0.55 + 16, 8.5, D + 19], t: [L * 0.45, -0.4, D * 0.4] },
      drive: { p: [-15, 7, D + 9], t: [L * 0.45, 0, D * 0.4] },
      top: { p: [L / 2, 24, D / 2 + 0.6], t: [L / 2, 0, D / 2] },
      inside: { p: [L * 0.5, 7.5, D + 3.5], t: [L * 0.5, 0.5, 1.5] },
    };
    const v = views[name] || views.street;
    camera.position.set(...v.p);
    controls.target.set(...v.t);
    controls.update();
    dirty = true;
  }

  function setGateOpen(open) {
    gateOpen = open;
    dirty = true;
  }

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    dirty = true;
  }
  new ResizeObserver(resize).observe(container);
  resize();
  controls.addEventListener('change', () => (dirty = true));

  function loop() {
    requestAnimationFrame(loop);
    const target = gateOpen ? -gateDir * (Math.PI / 2) : 0;
    if (Math.abs(target - gateAngle) > 0.001) {
      gateAngle += (target - gateAngle) * 0.15;
      if (gatePivot) gatePivot.rotation.y = gateAngle;
      dirty = true;
    }
    controls.update();
    if (dirty) {
      renderer.render(scene, camera);
      dirty = false;
    }
  }
  loop();

  return { update, setView, setGateOpen, resize, get gateOpen() { return gateOpen; } };
}
