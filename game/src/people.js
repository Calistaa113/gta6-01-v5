// People: the player, pedestrians, gang gunmen and officers share one jointed body.
import * as THREE from 'three';

const skin = [0xf1c27d, 0xc68642, 0x8d5524, 0xe0ac69, 0xffdbac];
const limbGeo = new THREE.CapsuleGeometry(0.11, 0.55, 4, 8);
const torsoGeo = new THREE.CapsuleGeometry(0.24, 0.5, 4, 10);
const headGeo = new THREE.SphereGeometry(0.19, 14, 12);

export function buildPerson(shirt, opts = {}) {
  const g = new THREE.Group();
  const skinM = new THREE.MeshStandardMaterial({ color: opts.skin ?? skin[Math.floor(Math.random() * skin.length)], roughness: 0.6 });
  const shirtM = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.75 });
  const pantsM = new THREE.MeshStandardMaterial({ color: opts.pants ?? 0x2b2f3a, roughness: 0.8 });
  const torso = new THREE.Mesh(torsoGeo, shirtM); torso.position.y = 1.25; g.add(torso);
  const head = new THREE.Mesh(headGeo, skinM); head.position.y = 1.78; g.add(head);
  if (opts.cap) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.21, 0.12, 14), new THREE.MeshStandardMaterial({ color: opts.cap }));
    cap.position.y = 1.92; g.add(cap);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.2), cap.material); brim.position.set(0, 1.87, 0.17); g.add(brim);
  } else {
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: opts.hair ?? 0x2a1a10 }));
    hair.position.y = 1.8; g.add(hair);
  }
  const limb = (m, x, y) => { const p = new THREE.Group(); p.position.set(x, y, 0); const l = new THREE.Mesh(limbGeo, m); l.position.y = -0.36; p.add(l); g.add(p); return p; };
  const armL = limb(skinM, 0.33, 1.52), armR = limb(skinM, -0.33, 1.52);
  const legL = limb(pantsM, 0.13, 0.88), legR = limb(pantsM, -0.13, 0.88);
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  if (opts.gun) {
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.5), new THREE.MeshStandardMaterial({ color: 0x18181c, metalness: 0.7, roughness: 0.3 }));
    gun.position.set(0, -0.62, 0.18); armR.add(gun);
  }
  g.userData = { armL, armR, legL, legR, phase: Math.random() * 6, hp: opts.hp ?? 40, aiming: false };
  return g;
}

export function animatePerson(p, speed, dt) {
  const d = p.userData;
  d.phase += dt * (2 + speed * 1.6);
  const sw = Math.min(speed / 4, 1) * 0.7;
  d.legL.rotation.x = Math.sin(d.phase) * sw;
  d.legR.rotation.x = -Math.sin(d.phase) * sw;
  if (d.aiming) { d.armR.rotation.x = -Math.PI / 2; d.armL.rotation.x = -Math.PI / 2.4; d.armL.rotation.z = -0.4; }
  else { d.armL.rotation.x = -Math.sin(d.phase) * sw; d.armR.rotation.x = Math.sin(d.phase) * sw; d.armL.rotation.z = 0; }
}

export function knockDown(p) {
  p.rotation.x = -Math.PI / 2; p.position.y = 0.25; p.userData.dead = true;
}
