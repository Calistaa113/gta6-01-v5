// Curvy car models: bezier side profiles extruded with deep bevels, glass cabins, real wheels.
import * as THREE from 'three';

let ENV = null;
export function setCarEnv(env) { ENV = env; }

function profile(kind) {
  // side silhouette in (x = length, y = height), front of the car at +x
  const s = new THREE.Shape();
  if (kind === 'sports') {
    s.moveTo(-2.15, 0.32);
    s.lineTo(2.0, 0.3);
    s.quadraticCurveTo(2.32, 0.34, 2.28, 0.62);
    s.quadraticCurveTo(1.6, 0.86, 0.75, 0.94);
    s.quadraticCurveTo(-0.6, 1.06, -2.05, 0.98);
    s.quadraticCurveTo(-2.3, 0.7, -2.15, 0.32);
  } else if (kind === 'van') {
    s.moveTo(-2.4, 0.38);
    s.lineTo(2.25, 0.36);
    s.quadraticCurveTo(2.5, 0.42, 2.45, 0.95);
    s.quadraticCurveTo(2.35, 1.2, 1.9, 1.28);
    s.lineTo(-2.3, 1.3);
    s.quadraticCurveTo(-2.5, 1.0, -2.4, 0.38);
  } else {
    s.moveTo(-2.3, 0.34);
    s.lineTo(2.15, 0.32);
    s.quadraticCurveTo(2.42, 0.38, 2.38, 0.72);
    s.quadraticCurveTo(1.8, 0.9, 1.0, 0.96);
    s.lineTo(-1.5, 1.0);
    s.quadraticCurveTo(-2.25, 1.0, -2.38, 0.72);
    s.quadraticCurveTo(-2.42, 0.45, -2.3, 0.34);
  }
  return s;
}

function cabinProfile(kind) {
  const s = new THREE.Shape();
  if (kind === 'sports') {
    s.moveTo(0.85, 0.0);
    s.quadraticCurveTo(0.2, 0.42, -0.35, 0.45);
    s.quadraticCurveTo(-1.2, 0.4, -1.75, 0.0);
  } else if (kind === 'van') {
    s.moveTo(1.95, 0.0);
    s.quadraticCurveTo(1.75, 0.55, 1.45, 0.62);
    s.lineTo(-2.2, 0.62);
    s.lineTo(-2.2, 0.0);
  } else {
    s.moveTo(1.05, 0.0);
    s.quadraticCurveTo(0.55, 0.55, 0.15, 0.6);
    s.lineTo(-1.05, 0.6);
    s.quadraticCurveTo(-1.55, 0.5, -1.9, 0.0);
  }
  s.closePath();
  return s;
}

function extrude(shape, width, bevel) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: width - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel,
    bevelSegments: 5, curveSegments: 20, steps: 1,
  });
  g.translate(0, 0, -(width - bevel * 2) / 2);
  g.computeVertexNormals();
  return g;
}

const tireGeo = new THREE.TorusGeometry(0.3, 0.13, 12, 28);
const rimGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.08, 24);
const spokeGeo = new THREE.BoxGeometry(0.42, 0.045, 0.05);
const tireMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.85 });
const rimMat = new THREE.MeshStandardMaterial({ color: 0xe8e8ee, metalness: 1, roughness: 0.18 });
const chrome = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 1, roughness: 0.12 });
const blackTrim = new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.5 });

function wheel() {
  const w = new THREE.Group();
  const spin = new THREE.Group();
  const tire = new THREE.Mesh(tireGeo, tireMat); tire.castShadow = true;
  const rim = new THREE.Mesh(rimGeo, rimMat); rim.rotation.x = Math.PI / 2;
  spin.add(tire, rim);
  for (let i = 0; i < 6; i++) {
    const sp = new THREE.Mesh(spokeGeo, rimMat);
    sp.rotation.z = (i / 6) * Math.PI; sp.position.z = 0.05;
    spin.add(sp);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.14, 10), chrome); hub.rotation.x = Math.PI / 2;
  spin.add(hub);
  w.add(spin);
  w.userData.spin = spin;
  return w;
}

export const CAR_TYPES = {
  sports: { name: 'ARDENT GT', len: 4.5, width: 2.0, top: 160, accel: 26 },
  sedan: { name: 'MARLOWE 4', len: 4.7, width: 1.95, top: 125, accel: 17 },
  police: { name: 'VPD CRUISER', len: 4.7, width: 1.95, top: 150, accel: 23 },
  van: { name: 'PELICAN VAN', len: 4.9, width: 2.1, top: 105, accel: 12 },
};

export function buildCar(type, color) {
  const kind = type === 'sports' ? 'sports' : type === 'van' ? 'van' : 'sedan';
  const spec = CAR_TYPES[type];
  const car = new THREE.Group();
  const body = new THREE.Group();
  car.add(body);
  const paint = new THREE.MeshPhysicalMaterial({
    color, metalness: 0.7, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.03, envMap: ENV, envMapIntensity: 2.2,
  });
  const shell = new THREE.Mesh(extrude(profile(kind), spec.width, 0.14), paint);
  shell.castShadow = true; shell.receiveShadow = true;
  body.add(shell);
  if (type === 'police') {
    // black-and-white livery: dark lower doors
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.34, spec.width + 0.02), new THREE.MeshPhysicalMaterial({ color: 0x111118, clearcoat: 1, roughness: 0.3, envMap: ENV }));
    door.position.set(-0.1, 0.55, 0); body.add(door);
  }
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x1a2430, metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.82, envMap: ENV, envMapIntensity: 1.6, clearcoat: 1 });
  const baseY = kind === 'van' ? 1.18 : kind === 'sports' ? 0.86 : 0.9;
  const cab = new THREE.Mesh(extrude(cabinProfile(kind), spec.width - 0.32, 0.1), glass);
  cab.position.y = baseY; cab.castShadow = true;
  body.add(cab);
  if (kind !== 'van') {
    const roof = new THREE.Mesh(new THREE.BoxGeometry(kind === 'sports' ? 0.9 : 1.15, 0.05, spec.width - 0.42), paint);
    roof.position.set(kind === 'sports' ? -0.4 : -0.45, baseY + (kind === 'sports' ? 0.53 : 0.69), 0);
    body.add(roof);
  }
  // wheel arches (dark recess) and wheels
  const wx = kind === 'van' ? 1.55 : 1.42;
  const wz = spec.width / 2 - 0.1;
  const wheels = [];
  for (const [x, z] of [[wx, wz], [wx, -wz], [-wx, wz], [-wx, -wz]]) {
    const arch = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 20, 1, false, 0, Math.PI), blackTrim);
    arch.rotation.x = Math.PI / 2; arch.rotation.y = 0; arch.position.set(x, 0.43, z > 0 ? z + 0.02 : z - 0.02);
    body.add(arch);
    const w = wheel(); w.position.set(x, 0.43, z);
    if (z < 0) w.rotation.y = Math.PI;
    car.add(w); wheels.push(w);
  }
  // grille, bumpers, mirrors, lights
  const front = kind === 'van' ? 2.47 : kind === 'sports' ? 2.3 : 2.4;
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, spec.width * 0.5), blackTrim);
  grille.position.set(front, 0.46, 0); body.add(grille);
  for (const sx of [1, -1]) {
    const bump = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, spec.width - 0.2), chrome);
    bump.position.set(sx * (front - 0.02), 0.33, 0); body.add(bump);
  }
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2d0, emissiveIntensity: 3 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xff2030, emissive: 0xff1020, emissiveIntensity: 2.5 });
  for (const z of [spec.width / 2 - 0.35, -(spec.width / 2 - 0.35)]) {
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), headMat); h.scale.set(0.5, 0.7, 1.4);
    h.position.set(front - 0.04, 0.58, z); body.add(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.5), tailMat);
    t.position.set(-front + 0.04, 0.66, z); body.add(t);
    const mirror = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), paint); mirror.scale.set(0.8, 0.7, 1.3);
    mirror.position.set(kind === 'van' ? 1.7 : 0.75, baseY + 0.12, z > 0 ? spec.width / 2 + 0.08 : -spec.width / 2 - 0.08);
    body.add(mirror);
  }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, spec.width - 0.5), tailMat);
  bar.position.set(-front + 0.03, 0.66, 0); body.add(bar);
  let lights = null;
  if (type === 'police') {
    lights = [];
    const lb = new THREE.Group(); lb.position.set(-0.45, baseY + 0.75, 0);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 1.3), blackTrim); lb.add(base);
    for (const [z, c] of [[0.35, 0xff1030], [-0.35, 0x1060ff]]) {
      const m = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 4 });
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.5), m); l.position.set(0, 0.09, z);
      lb.add(l); lights.push(m);
    }
    body.add(lb);
  }
  const root = new THREE.Group();
  car.rotation.y = -Math.PI / 2; // model front (+x) faces +z, the game's forward
  root.add(car);
  root.userData = { type, spec, wheels, lights, body, speed: 0, steer: 0, paint };
  return root;
}

export function animateCar(car, dt, t) {
  const d = car.userData;
  const roll = d.speed * dt / 0.43;
  d.wheels.forEach((w, i) => {
    w.userData.spin.rotation.z -= (i % 2 === 0 ? 1 : -1) * roll;
    if (i < 2) w.rotation.y = (i === 1 ? Math.PI : 0) + d.steer * 0.5;
  });
  d.body.rotation.x = -d.steer * Math.min(Math.abs(d.speed) / 40, 1) * 0.05;
  if (d.lights) {
    const on = Math.floor(t * 6) % 2;
    d.lights[0].emissiveIntensity = on ? 6 : 0.3;
    d.lights[1].emissiveIntensity = on ? 0.3 : 6;
  }
}
