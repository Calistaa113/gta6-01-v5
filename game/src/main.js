// VISTAMAR v3: Golden Hour - game entrypoint.
import * as THREE from 'three';
import { makeRenderer, makeSky, makeEnvMap, makeLights, makeOcean, makeBeach, SUN_DIR } from './env.js';
import { buildCity, onRoad, hitsBuilding, districtAt, PALMS } from './city.js';
import { buildCar, animateCar, setCarEnv, CAR_TYPES } from './cars.js';
import { buildPerson, animatePerson, knockDown } from './people.js';
import { MISSIONS, STATIONS, audioStart, playStation, sfxShot, sfxSiren, sfxCash, hud, drawMinimap } from './story.js';
import { rng, pick } from './rng.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(location.search);
const SHOT = params.get('shot');
const R = rng(Number(params.get('seed') || 7));

const canvas = document.getElementById('view');
const renderer = makeRenderer(canvas);
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xf3a27c, 160, 1100); // warm haze, kept far so facades keep their colour
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.3, 4000);
const env = makeEnvMap(renderer);
setCarEnv(env);
const sky = makeSky(scene);
const { sun } = makeLights(scene);
const ocean = makeOcean(scene);
makeBeach(scene);
buildCity(scene, env);

const WEAPONS = [
  { name: 'FISTS', dmg: 8, rate: 0.5, range: 2 },
  { name: 'PISTOL', dmg: 20, rate: 0.35, range: 60 },
  { name: 'SMG', dmg: 12, rate: 0.09, range: 50 },
  { name: 'SHOTGUN', dmg: 60, rate: 0.9, range: 25 },
];

// ---------- game state ----------
const save = JSON.parse(localStorage.getItem('vistamar-v3') || 'null');
export const G = {
  money: save?.money ?? 500, mission: save?.mission ?? 0, wanted: 0, heat: 0, hp: 100,
  weapon: 1, cool: 0, line: null, lineT: 0, station: 0, t: 0, started: false,
};

const player = buildPerson(0xff7eb6, { pants: 0xf2f2f2, hair: 0x1a1a1a, gun: true, hp: 100 });
player.position.set(4, 0, -40);
scene.add(player);
let heading = 0; // radians, forward = (sin, 0, cos)
let car = null; // car the player drives

const traffic = []; const police = []; const peds = []; const gunmen = []; const blocks = [];
const colors = [0xffb000, 0xe63946, 0x2ec4b6, 0xf1faee, 0x8338ec, 0x3a86ff, 0xff006e, 0x111111];

function spawnCar(type, x, z, h, color) {
  const c = buildCar(type, color ?? pick(R, colors));
  c.position.set(x, 0, z); c.rotation.y = h; c.userData.heading = h;
  scene.add(c); return c;
}

for (let i = 0; i < 26; i++) {
  const road = i % 3 === 0 ? 140 : 0;
  const dir = R() < 0.5 ? 0 : Math.PI;
  const lane = dir === 0 ? -3.5 : 3.5;
  const t = spawnCar(pick(R, ['sports', 'sedan', 'sedan', 'van']), road + lane, -1000 + R() * 2000, dir);
  t.userData.speed = 9 + R() * 8; t.userData.ai = true;
  traffic.push(t);
}
for (let i = 0; i < 40; i++) {
  const p = buildPerson(pick(R, colors), { pants: pick(R, [0x2b2f3a, 0xe9d8a6, 0x6c757d]) });
  p.position.set(R() < 0.5 ? -11 + R() * 2 : 12 + R() * 3, 0, -1000 + R() * 2000);
  p.userData.dir = R() < 0.5 ? 1 : -1; scene.add(p); peds.push(p);
}

function spawnPolice(near) {
  const side = R() < 0.5 ? -1 : 1;
  const c = spawnCar('police', near.x + (R() - 0.5) * 6, near.z + side * (70 + R() * 50), side > 0 ? Math.PI : 0, 0xf4f4f4);
  c.userData.cop = true; c.userData.speed = 0; police.push(c);
}

// helicopter with a spotlight for 4-5 stars
const heli = new THREE.Group();
{
  const m = new THREE.MeshPhysicalMaterial({ color: 0x1d2b53, metalness: 0.5, roughness: 0.3, clearcoat: 1, envMap: env });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.6, 18, 12), m); body.scale.set(1, 0.8, 1.9); heli.add(body);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 5, 8), m); tail.rotation.x = Math.PI / 2; tail.position.z = -4.2; heli.add(tail);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(11, 0.06, 0.4), new THREE.MeshStandardMaterial({ color: 0x111111 })); rotor.position.y = 1.5; heli.add(rotor);
  heli.userData.rotor = rotor;
  const spot = new THREE.SpotLight(0xffffff, 400, 120, 0.35, 0.5); spot.position.set(0, -1, 1); heli.add(spot); heli.add(spot.target);
  heli.userData.spot = spot;
  heli.visible = false; scene.add(heli);
}

function placeRoadblock(x, z) {
  const g = new THREE.Group();
  const stripe = new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0x552200 });
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff });
  for (let i = -2; i <= 2; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.35, 0.3), i % 2 ? stripe : white); b.position.set(i * 2.7, 1.0, 0); g.add(b);
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.1, 0.15), white); l.position.set(i * 2.7, 0.5, 0); g.add(l);
  }
  g.position.set(x, 0, z); scene.add(g); blocks.push(g);
  for (const s of [-1, 1]) { const c = spawnCar('police', x + s * 5, z + 3, s * 1.2, 0xf4f4f4); c.userData.cop = true; c.userData.parked = true; police.push(c); }
  return g;
}

function spawnGunmen(x, z, n) {
  for (let i = 0; i < n; i++) {
    const p = buildPerson(0x1b1b1b, { pants: 0x3d2b1f, cap: 0xb5179e, gun: true, hp: 45 });
    p.position.set(x + (R() - 0.5) * 16, 0, z + (R() - 0.5) * 16); p.userData.aiming = true; p.userData.cool = R();
    scene.add(p); gunmen.push(p);
  }
}

// ---------- input ----------
const keys = {};
addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (!G.started && (e.code === 'Enter' || e.code === 'Space')) startGame();
  if (e.code === 'KeyF') toggleCar();
  if (e.code === 'KeyR') { G.station = (G.station + 1) % STATIONS.length; playStation(G.station); }
  if (e.code.startsWith('Digit')) { const n = Number(e.code.slice(5)) - 1; if (WEAPONS[n]) G.weapon = n; }
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
let mouseDown = false;
addEventListener('mousedown', () => { mouseDown = true; });
addEventListener('mouseup', () => { mouseDown = false; });
addEventListener('mousemove', (e) => { if (document.pointerLockElement) heading -= e.movementX * 0.003; });
document.getElementById('play').addEventListener('click', startGame);

function startGame() {
  if (G.started) return;
  G.started = true; audioStart(); playStation(G.station);
  document.getElementById('title').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  canvas.requestPointerLock?.();
  beginMission();
}

function say(line, secs = 4) { G.line = line; G.lineT = secs; }
function beginMission() {
  const m = MISSIONS[G.mission % MISSIONS.length];
  m.lines.forEach((l, i) => setTimeout(() => say(l), i * 4200));
  if (m.gunmen) spawnGunmen(m.to[0], m.to[1], m.gunmen);
  if (m.wanted) setWanted(m.wanted);
  if (m.id === 'neon') placeRoadblock(140, 560);
}
function completeMission() {
  const m = MISSIONS[G.mission % MISSIONS.length];
  G.money += m.reward; sfxCash(); say(['Mission passed', `${m.title}  +$${m.reward.toLocaleString('en-US')}`], 5);
  G.mission++; setWanted(0);
  localStorage.setItem('vistamar-v3', JSON.stringify({ money: G.money, mission: G.mission }));
  setTimeout(beginMission, 5500);
}

function setWanted(n) {
  G.wanted = Math.max(0, Math.min(5, n)); G.heat = G.wanted ? 30 : 0;
  while (police.filter((p) => !p.userData.parked).length < G.wanted + 1 && G.wanted > 0) spawnPolice(pos());
}
function pos() { return car ? car.position : player.position; }

function toggleCar() {
  if (car) {
    player.position.copy(car.position).add(new THREE.Vector3(Math.cos(car.userData.heading) * 2.4, 0, -Math.sin(car.userData.heading) * 2.4));
    player.visible = true; car.userData.speed = 0; car = null; return;
  }
  const all = traffic.concat(police);
  let best = null; let bd = 6;
  for (const c of all) { const d = c.position.distanceTo(player.position); if (d < bd) { bd = d; best = c; } }
  if (best) {
    car = best; best.userData.ai = false; player.visible = false; heading = best.userData.heading;
    if (best.userData.cop) setWanted(Math.max(G.wanted, 2)); else if (G.wanted < 1) setWanted(1);
  }
}

// ---------- shooting ----------
const ray = new THREE.Raycaster();
const tracers = [];
function shoot() {
  const w = WEAPONS[G.weapon];
  if (G.cool > 0) return; G.cool = w.rate; sfxShot();
  const origin = player.position.clone().add(new THREE.Vector3(0, 1.5, 0));
  const dir = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
  const pellets = G.weapon === 3 ? 6 : 1;
  for (let k = 0; k < pellets; k++) {
    const d = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), (R() - 0.5) * (pellets > 1 ? 0.2 : 0.03));
    let hit = null; let hd = w.range;
    for (const p of gunmen.concat(peds)) {
      if (p.userData.dead) continue;
      const to = p.position.clone().add(new THREE.Vector3(0, 1.2, 0)).sub(origin);
      const along = to.dot(d); if (along < 0 || along > hd) continue;
      if (to.clone().sub(d.clone().multiplyScalar(along)).length() < 0.7) { hit = p; hd = along; }
    }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([origin, origin.clone().addScaledVector(d, hd)]), new THREE.LineBasicMaterial({ color: 0xffe08a }));
    scene.add(line); tracers.push({ line, t: 0.06 });
    if (hit) {
      hit.userData.hp -= w.dmg;
      if (hit.userData.hp <= 0) { knockDown(hit); if (peds.includes(hit)) setWanted(G.wanted + 1); else G.money += 150; }
    }
  }
  if (G.wanted === 0 && G.weapon > 0) setWanted(1);
}

// ---------- update ----------
const tmp = new THREE.Vector3();
function driveCar(c, dt, throttle, steerIn, nitro) {
  const d = c.userData; const spec = d.spec;
  const top = spec.top / 3.6 * (nitro ? 1.35 : 1);
  d.speed += throttle * spec.accel * dt * (nitro ? 1.6 : 1);
  d.speed -= d.speed * (throttle === 0 ? 0.8 : 0.15) * dt;
  d.speed = Math.max(-12, Math.min(top, d.speed));
  d.steer += (steerIn - d.steer) * Math.min(1, dt * 6);
  d.heading += d.steer * dt * Math.min(Math.abs(d.speed) / 6, 1) * 1.6 * Math.sign(d.speed || 1);
  const nx = c.position.x + Math.sin(d.heading) * d.speed * dt;
  const nz = c.position.z + Math.cos(d.heading) * d.speed * dt;
  if (hitsBuilding(nx, nz) || nx < -60) { d.speed *= -0.3; } else { c.position.x = nx; c.position.z = nz; }
  c.rotation.y = d.heading;
}

function update(dt) {
  G.t += dt; G.cool -= dt;
  sky.material.uniforms.time.value = G.t; ocean.material.uniforms.time.value = G.t;
  ocean.material.uniforms.camPos.value.copy(camera.position);
  for (const leaves of PALMS) leaves.rotation.z = Math.sin(G.t * 0.8) * 0.004;
  if (G.started && !SHOT) {
    if (car) {
      const th = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
      const st = (keys.KeyA ? 1 : 0) - (keys.KeyD ? 1 : 0);
      driveCar(car, dt, th, st, keys.ShiftLeft);
      heading += (car.userData.heading - heading) * Math.min(1, dt * 4);
    } else {
      if (keys.KeyA) heading += dt * 2.4; if (keys.KeyD) heading -= dt * 2.4;
      const sp = (keys.KeyW ? 1 : keys.KeyS ? -0.5 : 0) * (keys.ShiftLeft ? 8 : 4.5);
      tmp.set(Math.sin(heading) * sp * dt, 0, Math.cos(heading) * sp * dt);
      const n = player.position.clone().add(tmp);
      if (!hitsBuilding(n.x, n.z)) player.position.copy(n);
      player.rotation.y = heading; player.userData.aiming = mouseDown;
      animatePerson(player, Math.abs(sp), dt);
      if (mouseDown) shoot();
    }
    // mission target
    const m = MISSIONS[G.mission % MISSIONS.length];
    const here = pos();
    const near = Math.hypot(here.x - m.to[0], here.z - m.to[1]) < 14;
    const cleared = !m.gunmen || gunmen.every((g) => g.userData.dead);
    const evaded = !m.wanted || G.wanted === 0;
    if (near && cleared && (evaded || m.id === 'ledger' || m.id === 'neon')) completeMission();
    // wanted decays when no cop sees you
    if (G.wanted > 0) {
      const seen = police.some((p) => p.position.distanceTo(here) < 60);
      G.heat -= seen ? 0 : dt; if (G.heat <= 0) setWanted(G.wanted - 1);
      if (Math.floor(G.t * 2) % 3 === 0) sfxSiren(G.t);
    }
  }
  for (const t of traffic) {
    if (t === car || !t.userData.ai) { animateCar(t, dt, G.t); continue; }
    t.position.z += Math.cos(t.userData.heading) * t.userData.speed * dt;
    if (t.position.z > 1080) t.position.z = -1080; if (t.position.z < -1080) t.position.z = 1080;
    animateCar(t, dt, G.t);
  }
  for (const p of police) {
    if (p !== car && !p.userData.parked && G.wanted > 0) {
      const here = pos(); const want = Math.atan2(here.x - p.position.x, here.z - p.position.z);
      let diff = want - p.userData.heading; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      driveCar(p, dt, p.position.distanceTo(here) > 9 ? 1 : -0.4, Math.max(-1, Math.min(1, diff * 2)), false);
    }
    animateCar(p, dt, G.t);
  }
  for (const p of peds) {
    if (p.userData.dead) continue;
    p.position.z += p.userData.dir * 1.3 * dt; p.rotation.y = p.userData.dir > 0 ? 0 : Math.PI;
    if (Math.abs(p.position.z) > 1080) p.userData.dir *= -1;
    animatePerson(p, 1.3, dt);
  }
  for (const g of gunmen) {
    if (g.userData.dead) continue;
    const here = pos(); g.rotation.y = Math.atan2(here.x - g.position.x, here.z - g.position.z);
    animatePerson(g, 0, dt);
    g.userData.cool -= dt;
    if (g.userData.cool < 0 && g.position.distanceTo(here) < 40 && !SHOT) { g.userData.cool = 1.2; if (R() < 0.3) G.hp -= 4; sfxShot(); }
  }
  if (G.hp <= 0) { say(['Hospital', 'Wasted. The coast keeps $500.']); G.money = Math.max(0, G.money - 500); G.hp = 100; setWanted(0); player.position.set(4, 0, -40); }
  heli.visible = G.wanted >= 4 || SHOT === 'cover';
  if (heli.visible) {
    const here = pos();
    heli.position.lerp(tmp.set(here.x + 12, 34, here.z - 20), Math.min(1, dt * 0.8));
    heli.lookAt(here.x, 34, here.z);
    heli.userData.rotor.rotation.y += dt * 30;
    heli.userData.spot.target.position.set(0, -34, 10);
  }
  for (let i = tracers.length - 1; i >= 0; i--) { tracers[i].t -= dt; if (tracers[i].t < 0) { scene.remove(tracers[i].line); tracers.splice(i, 1); } }
  if (G.lineT > 0) { G.lineT -= dt; if (G.lineT <= 0) G.line = null; }
  // the sun's shadow box follows the action
  const f = pos(); sun.position.set(f.x, 0, f.z).addScaledVector(SUN_DIR, 300); sun.target.position.set(f.x, 0, f.z);
}

function updateCamera(dt) {
  const target = pos();
  const back = car ? 9.5 : 5.2, up = car ? 3.6 : 2.6;
  const want = new THREE.Vector3(target.x - Math.sin(heading) * back, up, target.z - Math.cos(heading) * back);
  camera.position.lerp(want, Math.min(1, dt * 5));
  camera.lookAt(target.x + Math.sin(heading) * 6, 1.4, target.z + Math.cos(heading) * 6);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  update(dt);
  if (!SHOT) updateCamera(dt);
  const here = pos();
  hud({
    wanted: G.wanted, money: G.money, hp: G.hp, speed: car ? car.userData.speed : 0, inCar: !!car,
    carName: car ? CAR_TYPES[car.userData.type].name : '', weapon: WEAPONS[G.weapon].name,
    objective: MISSIONS[G.mission % MISSIONS.length].goal, district: districtAt(here.x, here.z), line: G.line, station: STATIONS[G.station],
  });
  drawMinimap(document.getElementById('mini'), here, heading, police.map((p) => ({ x: p.position.x, z: p.position.z, c: '#ff3b3b' })).concat(gunmen.filter((g) => !g.userData.dead).map((g) => ({ x: g.position.x, z: g.position.z, c: '#c77dff' }))), MISSIONS[G.mission % MISSIONS.length].to);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

if (SHOT) stageShot(SHOT, { G, scene, camera, player, spawnCar, spawnGunmen, placeRoadblock, traffic, police, peds, heli, say, setCar: (c) => { car = c; }, setHeading: (h) => { heading = h; } });
requestAnimationFrame(frame);
