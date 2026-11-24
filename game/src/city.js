// Vistamar city: Ocean Drive, cross streets, deco hotels, glass towers, palms, street lights.
import * as THREE from 'three';
import { rng } from './rng.js';

export const ROADS = []; // {x0,x1,z0,z1}
export const BUILDINGS = []; // axis-aligned footprints for collision {x0,x1,z0,z1}
export const DISTRICTS = [
  { name: 'OCEAN DRIVE', test: (x) => x < 20 },
  { name: 'NEON STRIP', test: (x, z) => z > 0 && x < 140 },
  { name: 'PORT VARELA', test: (x, z) => z <= 0 && x < 140 },
  { name: 'PALMETTO HEIGHTS', test: () => true },
];

const LEN = 2200;

function wallTexture(base, seed) {
  const r = rng(seed);
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1600; i++) {
    const v = Math.floor(r() * 40);
    g.fillStyle = `rgba(${v},${v},${v},${0.05 + r() * 0.06})`;
    g.fillRect(r() * 128, r() * 128, 2 + r() * 4, 1 + r() * 3);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function bumpTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const img = g.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 110 + Math.random() * 60;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6);
  return t;
}

function roadTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#3b3a3f'; g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.25})`; g.fillRect(Math.random() * 256, Math.random() * 512, 2, 2); }
  g.fillStyle = '#f2c230'; g.fillRect(118, 0, 7, 512); g.fillRect(131, 0, 7, 512);
  g.fillStyle = '#eeeeee';
  for (let y = 0; y < 512; y += 128) { g.fillRect(58, y, 6, 64); g.fillRect(192, y, 6, 64); }
  g.fillRect(6, 0, 5, 512); g.fillRect(245, 0, 5, 512);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function addRoad(scene, x, z, w, l, alongZ, tex) {
  const t = tex.clone(); t.needsUpdate = true; t.repeat.set(1, l / 28);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), new THREE.MeshStandardMaterial({ map: t, roughness: 0.82 }));
  m.rotation.x = -Math.PI / 2; if (!alongZ) m.rotation.z = Math.PI / 2;
  m.position.set(x, 0.05, z); m.receiveShadow = true; scene.add(m);
  if (alongZ) ROADS.push({ x0: x - w / 2, x1: x + w / 2, z0: z - l / 2, z1: z + l / 2, alongZ });
  else ROADS.push({ x0: x - l / 2, x1: x + l / 2, z0: z - w / 2, z1: z + w / 2, alongZ });
}

// ---------- buildings with real depth ----------
const frameMat = new THREE.MeshStandardMaterial({ color: 0xf6efe2, roughness: 0.6 });
const winGeo = new THREE.BoxGeometry(1.5, 1.8, 0.3);
const sillGeo = new THREE.BoxGeometry(1.9, 0.14, 0.5);
const acGeo = new THREE.BoxGeometry(1.4, 0.9, 1.4);

function facadeWindows(group, w, h, d, floors, cols, winMat) {
  // recessed panes: dark glass boxes sunk into the wall, with protruding sills on all four faces
  const fh = h / floors;
  const panes = []; const sills = [];
  const faces = [
    { n: new THREE.Vector3(0, 0, 1), len: w, off: d / 2 },
    { n: new THREE.Vector3(0, 0, -1), len: w, off: d / 2 },
    { n: new THREE.Vector3(1, 0, 0), len: d, off: w / 2 },
    { n: new THREE.Vector3(-1, 0, 0), len: d, off: w / 2 },
  ];
  for (const f of faces) {
    const c = Math.max(1, Math.floor(f.len / (w / cols)));
    for (let fl = 1; fl < floors; fl++) {
      for (let i = 0; i < c; i++) {
        const u = -f.len / 2 + (i + 0.5) * (f.len / c);
        const y = fl * fh + fh * 0.45;
        const p = new THREE.Vector3();
        if (f.n.z !== 0) p.set(u, y, f.n.z * (f.off - 0.08)); else p.set(f.n.x * (f.off - 0.08), y, u);
        const rot = f.n.x !== 0 ? Math.PI / 2 : 0;
        panes.push({ p, rot });
        const s = p.clone().addScaledVector(f.n, 0.2); s.y -= 0.95;
        sills.push({ p: s, rot });
      }
    }
  }
  const pm = new THREE.InstancedMesh(winGeo, winMat, panes.length);
  const sm = new THREE.InstancedMesh(sillGeo, frameMat, sills.length);
  const o = new THREE.Object3D();
  panes.forEach((q, i) => { o.position.copy(q.p); o.rotation.set(0, q.rot, 0); o.updateMatrix(); pm.setMatrixAt(i, o.matrix); });
  sills.forEach((q, i) => { o.position.copy(q.p); o.rotation.set(0, q.rot, 0); o.updateMatrix(); sm.setMatrixAt(i, o.matrix); });
  sm.castShadow = true;
  group.add(pm, sm);
}

function decoHotel(scene, x, z, r, env, idx) {
  const palette = ['#f7c6d0', '#bfe8e0', '#fde3a7', '#f9d0b4', '#d9d3f5', '#fff3e0'];
  const neon = [0xff2d95, 0x00e5ff, 0xffd400, 0x9d5cff, 0x39ff88];
  const w = 18 + r() * 8, d = 16 + r() * 6, floors = 5 + Math.floor(r() * 5), h = floors * 3.4;
  const g = new THREE.Group();
  const wall = new THREE.MeshStandardMaterial({ map: wallTexture(palette[idx % palette.length], idx * 7 + 3), bumpMap: bumpTexture(), bumpScale: 0.6, roughness: 0.85 });
  const core = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wall); core.position.y = h / 2; core.castShadow = core.receiveShadow = true;
  g.add(core);
  // floor bands and cornice
  for (let f = 1; f <= floors; f++) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.28, d + 0.5), frameMat); band.position.y = f * 3.4 - 0.1; g.add(band);
  }
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(w + 1.4, 0.8, d + 1.4), frameMat); cornice.position.y = h + 0.3; cornice.castShadow = true; g.add(cornice);
  // stepped deco tower on top with a neon fin
  const step = new THREE.Mesh(new THREE.BoxGeometry(w * 0.45, 4, d * 0.45), wall); step.position.y = h + 2.6; step.castShadow = true; g.add(step);
  const nc = neon[idx % neon.length];
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.6, 7, 3), new THREE.MeshStandardMaterial({ color: nc, emissive: nc, emissiveIntensity: 3 }));
  fin.position.set(0, h + 6, d * 0.23); g.add(fin);
  // pilasters
  for (const sx of [-1, -0.33, 0.33, 1]) {
    const pil = new THREE.Mesh(new THREE.BoxGeometry(0.7, h, 0.6), frameMat); pil.position.set(sx * w / 2, h / 2, d / 2 + 0.2); pil.castShadow = true; g.add(pil);
  }
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x223a4a, metalness: 0.6, roughness: 0.08, envMap: env, envMapIntensity: 1.4, emissive: r() < 0.5 ? 0x3a2410 : 0x000000 });
  facadeWindows(g, w, h, d, floors, 6, glass);
  // balconies with railings on the sea side (-x after rotation, local +z)
  const rail = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.3, roughness: 0.4 });
  for (let f = 1; f < floors; f += 1) {
    for (const u of [-w / 3, 0, w / 3]) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.2, 1.4), frameMat); slab.position.set(u, f * 3.4 + 0.1, d / 2 + 0.7); slab.castShadow = true; g.add(slab);
      const rl = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.9, 0.06), rail); rl.position.set(u, f * 3.4 + 0.6, d / 2 + 1.38); g.add(rl);
    }
  }
  // storefront glass, awning and neon sign at street level
  const shop = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 2.6, 0.2), new THREE.MeshPhysicalMaterial({ color: 0x0d1820, metalness: 0.5, roughness: 0.05, envMap: env, emissive: 0x402010, emissiveIntensity: 0.6 }));
  shop.position.set(0, 1.5, d / 2 + 0.05); g.add(shop);
  const aw = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, w * 0.82, 12, 1, false, 0, Math.PI), new THREE.MeshStandardMaterial({ color: [0xff6f91, 0x2ec4b6, 0xffb703][idx % 3], roughness: 0.7, side: THREE.DoubleSide }));
  aw.rotation.z = Math.PI / 2; aw.rotation.y = 0; aw.position.set(0, 3.1, d / 2 + 0.5); aw.scale.set(1, 1, 0.8); g.add(aw);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.6, 1.4), new THREE.MeshBasicMaterial({ map: signTexture(['HOTEL BLUE ORCHID', 'THE CORAL', 'SUNSET PALACE', 'LA PERLA', 'NEON MOTEL', 'CASA VISTA', 'FLAMINGO', 'ROYAL PALM'][idx % 8], nc), transparent: true, toneMapped: false }));
  sign.position.set(0, h - 1.2, d / 2 + 0.45); g.add(sign);
  // rooftop clutter
  const ac = new THREE.Mesh(acGeo, new THREE.MeshStandardMaterial({ color: 0xbfc4c8, metalness: 0.4, roughness: 0.5 }));
  ac.position.set(-w * 0.3, h + 1.1, -d * 0.25); ac.castShadow = true; g.add(ac);
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 2, 14), new THREE.MeshStandardMaterial({ color: 0x8a6a50, roughness: 0.8 }));
  tank.position.set(w * 0.3, h + 1.6, -d * 0.2); tank.castShadow = true; g.add(tank);
  g.rotation.y = -Math.PI / 2; // front faces the sea (-x)
  g.position.set(x, 0, z);
  scene.add(g);
  BUILDINGS.push({ x0: x - d / 2 - 1, x1: x + d / 2 + 1, z0: z - w / 2, z1: z + w / 2 });
  return g;
}

function signTexture(text, col) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 96;
  const g = c.getContext('2d');
  const hex = '#' + col.toString(16).padStart(6, '0');
  g.font = 'bold 62px Trebuchet MS, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = hex; g.shadowBlur = 24; g.fillStyle = hex; g.fillText(text, 256, 50);
  g.shadowBlur = 6; g.fillStyle = '#ffffff'; g.fillText(text, 256, 50);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function glassTower(scene, x, z, r, env) {
  const w = 16 + r() * 8, d = 16 + r() * 8, h = 40 + r() * 60;
  const g = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({ color: [0x335c7a, 0x2f6e6a, 0x5a4a7a][Math.floor(r() * 3)], metalness: 0.9, roughness: 0.08, envMap: env, envMapIntensity: 1.8, clearcoat: 1 });
  const core = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); core.position.y = h / 2; core.castShadow = core.receiveShadow = true; g.add(core);
  // vertical mullion fins and spandrel bands give the glass depth
  const fin = new THREE.BoxGeometry(0.25, h, 0.7);
  const finMat = new THREE.MeshStandardMaterial({ color: 0xd8dde2, metalness: 0.8, roughness: 0.3 });
  const n = Math.floor(w / 2.2);
  const im = new THREE.InstancedMesh(fin, finMat, n * 2 + Math.floor(d / 2.2) * 2);
  const o = new THREE.Object3D(); let k = 0;
  for (let i = 0; i < n; i++) for (const s of [1, -1]) { o.position.set(-w / 2 + (i + 0.5) * w / n, h / 2, s * (d / 2 + 0.3)); o.rotation.set(0, 0, 0); o.updateMatrix(); im.setMatrixAt(k++, o.matrix); }
  const m2 = Math.floor(d / 2.2);
  for (let i = 0; i < m2; i++) for (const s of [1, -1]) { o.position.set(s * (w / 2 + 0.3), h / 2, -d / 2 + (i + 0.5) * d / m2); o.rotation.set(0, Math.PI / 2, 0); o.updateMatrix(); im.setMatrixAt(k++, o.matrix); }
  im.count = k; im.castShadow = true; g.add(im);
  for (let y = 4; y < h; y += 4) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.5, d + 0.4), finMat); band.position.y = y; g.add(band);
  }
  const crown = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 3, d * 0.7), finMat); crown.position.y = h + 1.5; g.add(crown);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3040 })); beacon.position.y = h + 6; g.add(beacon);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 3), finMat); mast.position.y = h + 4.5; g.add(mast);
  g.position.set(x, 0, z); scene.add(g);
  BUILDINGS.push({ x0: x - w / 2 - 1, x1: x + w / 2 + 1, z0: z - d / 2 - 1, z1: z + d / 2 + 1 });
}

function lowShop(scene, x, z, r, env, idx) {
  const w = 10 + r() * 6, d = 10 + r() * 5, h = 5 + r() * 3;
  const wall = new THREE.MeshStandardMaterial({ map: wallTexture(['#ffd6a5', '#caffbf', '#9bf6ff', '#ffc6ff', '#fdffb6'][idx % 5], idx + 40), bumpMap: bumpTexture(), bumpScale: 0.5, roughness: 0.9 });
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wall); b.position.y = h / 2; b.castShadow = b.receiveShadow = true; g.add(b);
  const par = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.8, d + 0.4), frameMat); par.position.y = h + 0.2; g.add(par);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 2.4, 0.15), new THREE.MeshPhysicalMaterial({ color: 0x102028, metalness: 0.5, roughness: 0.05, envMap: env, emissive: 0x553311, emissiveIntensity: 0.8 }));
  glass.position.set(0, 1.4, d / 2 + 0.05); g.add(glass);
  const aw = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.12, 1.8), new THREE.MeshStandardMaterial({ color: 0xff5d73 }));
  aw.position.set(0, 2.9, d / 2 + 0.9); aw.rotation.x = 0.25; aw.castShadow = true; g.add(aw);
  g.rotation.y = -Math.PI / 2; g.position.set(x, 0, z); scene.add(g);
  BUILDINGS.push({ x0: x - d / 2 - 1, x1: x + d / 2 + 1, z0: z - w / 2 - 1, z1: z + w / 2 + 1 });
}

// ---------- palms ----------
function palmGeometry(r) {
  const parts = [];
  const lean = 0.8 + r() * 1.6, h = 9 + r() * 4;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(lean * 0.2, h * 0.35, 0), new THREE.Vector3(lean * 0.6, h * 0.7, 0), new THREE.Vector3(lean, h, 0),
  ]);
  const trunk = new THREE.TubeGeometry(curve, 16, 0.26, 8, false);
  // taper: shrink rings toward the top and add bark rings
  const pos = trunk.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const ring = Math.floor(i / 9) / 16;
    const c = curve.getPoint(Math.min(ring, 1));
    const k = 1 - ring * 0.45 + (Math.floor(ring * 32) % 2) * 0.06;
    pos.setX(i, c.x + (pos.getX(i) - c.x) * k); pos.setZ(i, c.z + (pos.getZ(i) - c.z) * k);
  }
  trunk.computeVertexNormals();
  const fronds = [];
  const top = curve.getPoint(1);
  const N = 9;
  for (let f = 0; f < N; f++) {
    const a = (f / N) * Math.PI * 2 + r() * 0.3;
    const len = 4.2 + r() * 1.4;
    const segs = 10;
    const g = new THREE.BufferGeometry();
    const v = []; const idx = [];
    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      const along = t * len;
      const droop = -Math.pow(t, 1.8) * 2.6 + t * 0.8;
      const wdt = Math.sin(t * Math.PI) * 0.75 + 0.05;
      const cx = Math.cos(a) * along, cz = Math.sin(a) * along;
      const px = -Math.sin(a) * wdt, pz = Math.cos(a) * wdt;
      // V-fold along the midrib so the frond has volume
      v.push(top.x + cx - px, top.y + droop - wdt * 0.25, top.z + cz - pz);
      v.push(top.x + cx, top.y + droop, top.z + cz);
      v.push(top.x + cx + px, top.y + droop - wdt * 0.25, top.z + cz + pz);
      if (s < segs) { const b = s * 3; idx.push(b, b + 3, b + 1, b + 1, b + 3, b + 4, b + 1, b + 4, b + 2, b + 2, b + 4, b + 5); }
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex(idx); g.computeVertexNormals();
    fronds.push(g);
  }
  const nuts = [];
  for (let n = 0; n < 4; n++) { const s = new THREE.SphereGeometry(0.22, 8, 6); s.translate(top.x + Math.cos(n * 1.6) * 0.35, top.y - 0.35, top.z + Math.sin(n * 1.6) * 0.35); nuts.push(s); }
  return { trunk, fronds, nuts };
}

function mergeGeos(list) {
  // light-weight merge of non-indexed-compatible geometries
  let total = 0; let itotal = 0;
  for (const g of list) { total += g.attributes.position.count; itotal += g.index ? g.index.count : g.attributes.position.count; }
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), ind = new Uint32Array(itotal);
  let vo = 0, io = 0;
  for (const g of list) {
    pos.set(g.attributes.position.array, vo * 3); nor.set(g.attributes.normal.array, vo * 3);
    if (g.index) { for (let i = 0; i < g.index.count; i++) ind[io + i] = g.index.array[i] + vo; io += g.index.count; }
    else { for (let i = 0; i < g.attributes.position.count; i++) ind[io + i] = vo + i; io += g.attributes.position.count; }
    vo += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); out.setIndex(new THREE.BufferAttribute(ind, 1));
  return out;
}

export const PALMS = [];
function addPalms(scene, spots, r) {
  const variants = [0, 1, 2].map(() => palmGeometry(r));
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8a6440, roughness: 0.95 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f7a33, roughness: 0.7, side: THREE.DoubleSide });
  const nutMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1c, roughness: 0.8 });
  variants.forEach((vg, vi) => {
    const mine = spots.filter((_, i) => i % 3 === vi);
    const trunk = new THREE.InstancedMesh(vg.trunk, trunkMat, mine.length);
    const leaves = new THREE.InstancedMesh(mergeGeos(vg.fronds), leafMat, mine.length);
    const nuts = new THREE.InstancedMesh(mergeGeos(vg.nuts), nutMat, mine.length);
    const o = new THREE.Object3D();
    mine.forEach((p, i) => {
      o.position.set(p.x, 0, p.z); o.rotation.set(0, p.rot, 0); o.scale.setScalar(p.s); o.updateMatrix();
      trunk.setMatrixAt(i, o.matrix); leaves.setMatrixAt(i, o.matrix); nuts.setMatrixAt(i, o.matrix);
    });
    for (const m of [trunk, leaves, nuts]) { m.castShadow = true; scene.add(m); }
    PALMS.push(leaves);
  });
}

function streetLight(scene, x, z, side) {
  const m = new THREE.MeshStandardMaterial({ color: 0x2a2a30, metalness: 0.6, roughness: 0.4 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 8), m); pole.position.set(x, 4, z); scene.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(2, 0.12, 0.12), m); arm.position.set(x + side, 7.9, z); scene.add(arm);
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.18, 0.4), new THREE.MeshStandardMaterial({ color: 0xffe6b0, emissive: 0xffd48a, emissiveIntensity: 3 }));
  lamp.position.set(x + side * 1.8, 7.8, z); scene.add(lamp);
}

export function buildCity(scene, env) {
  const r = rng(77);
  const tex = roadTexture();
  // Ocean Drive along the beach, an inland boulevard and cross streets every 120 m
  addRoad(scene, 0, 0, 16, LEN, true, tex);
  addRoad(scene, 140, 0, 16, LEN, true, tex);
  for (let z = -960; z <= 960; z += 120) addRoad(scene, 70, z, 12, 140, false, tex);
  // sidewalk + ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, LEN), new THREE.MeshStandardMaterial({ color: 0x9a8f86, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(330, 0, 0); ground.receiveShadow = true; scene.add(ground);
  const walk = new THREE.Mesh(new THREE.BoxGeometry(6, 0.2, LEN), new THREE.MeshStandardMaterial({ color: 0xd8cbbd, roughness: 0.9 }));
  walk.position.set(-11, 0.1, 0); walk.receiveShadow = true; scene.add(walk);
  let idx = 0;
  for (let z = -1020; z < 1020; z += 120) {
    for (const zz of [z + 30, z + 84]) {
      if (Math.abs(zz % 120) < 10) continue;
      decoHotel(scene, 26 + r() * 3, zz, r, env, idx++);
      if (r() < 0.55) glassTower(scene, 98, zz, r, env); else lowShop(scene, 96, zz, r, env, idx);
      if (r() < 0.6) glassTower(scene, 190 + r() * 20, zz, r, env); else lowShop(scene, 176, zz, r, env, idx + 2);
    }
  }
  const palms = [];
  for (let z = -1080; z < 1080; z += 14) {
    palms.push({ x: -10 + r() * 2, z: z + r() * 4, rot: r() * 6.28, s: 0.9 + r() * 0.35 });
    if (r() < 0.6) palms.push({ x: -22 - r() * 14, z: z + r() * 10, rot: r() * 6.28, s: 0.8 + r() * 0.4 });
    if (r() < 0.5) palms.push({ x: 10 + r() * 1.5, z: z + 7, rot: r() * 6.28, s: 0.85 + r() * 0.3 });
  }
  addPalms(scene, palms, r);
  for (let z = -1080; z < 1080; z += 40) { streetLight(scene, 9.5, z, -1); }
  // bushes along the beach wall
  const bush = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 0.9, flatShading: true }), 300);
  const o = new THREE.Object3D();
  for (let i = 0; i < 300; i++) { o.position.set(-14 - r() * 3, 0.5, -1100 + i * 7.3); o.scale.set(1 + r(), 0.7 + r() * 0.4, 1 + r()); o.updateMatrix(); bush.setMatrixAt(i, o.matrix); }
  bush.castShadow = true; scene.add(bush);
}

export function onRoad(x, z) { return ROADS.some((r) => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1); }
export function hitsBuilding(x, z) { return BUILDINGS.some((b) => x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1); }
export function districtAt(x, z) { return DISTRICTS.find((d) => d.test(x, z)).name; }
