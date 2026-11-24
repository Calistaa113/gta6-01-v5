// Deterministic screenshot staging: ?shot=cover|shootout|roadblock|title
import * as THREE from 'three';

function showHud(on) {
  document.getElementById('title').classList.toggle('hidden', on);
  document.getElementById('hud').classList.toggle('hidden', !on);
}

export function stageShot(name, k) {
  const { G, camera, player, spawnCar, spawnGunmen, placeRoadblock, police, heli, say } = k;
  G.started = true;
  if (name === 'title') {
    showHud(false);
    camera.position.set(-70, 26, 40);
    camera.lookAt(30, 12, -120);
    return;
  }
  showHud(true);
  if (name === 'cover') {
    // golden-hour chase north on Ocean Drive: player in an Ardent GT, cruisers behind
    G.mission = 1; G.wanted = 5; G.money = 48250;
    const me = spawnCar('sports', -3.2, 300, Math.PI, 0xffa600);
    me.userData.speed = 39; me.userData.steer = 0.15;
    k.setCar(me); k.setHeading(Math.PI); player.visible = false;
    spawnCar('sedan', 3.6, 262, 0, 0xc1121f).userData.speed = 8;
    for (const [x, z] of [[1.8, 313], [-4.6, 321], [3.2, 333]]) { const c = spawnCar('police', x, z, Math.PI, 0xf4f4f4); c.userData.cop = true; c.userData.parked = true; police.push(c); }
    heli.position.set(-6, 30, 330);
    camera.position.set(-5.6, 1.9, 289);
    camera.lookAt(1.5, 1.6, 322);
    say(['Ness', 'Every cop he owns is between me and the pier.'], 999);
    return;
  }
  if (name === 'shootout') {
    G.mission = 2; G.wanted = 2; G.money = 12600; G.weapon = 2;
    player.position.set(6, 0, -160); player.rotation.y = Math.PI; player.userData.aiming = true;
    k.setHeading(Math.PI);
    const spots = [[3, -167], [8.5, -170], [1, -175], [11, -178], [5.5, -183]];
    spawnGunmen(0, 0, 0);
    spots.forEach(([x, z]) => spawnGunmen(x, z, 1));
    // spawnGunmen scatters; pull them back onto the staged marks
    const gm = k.scene.children.filter((o) => o.userData && o.userData.aiming && o !== player).slice(-5);
    gm.forEach((g, i) => { g.position.set(spots[i][0], 0, spots[i][1]); g.rotation.y = 0; });
    const cover = spawnCar('van', -1.5, -172, 0.6, 0x3a86ff); cover.userData.speed = 0;
    camera.position.set(7.6, 2.3, -154.5);
    camera.lookAt(5, 1.2, -175);
    say(['Rico', 'Los Cuervos took the shipping yard. Take it back.'], 999);
    return;
  }
  if (name === 'roadblock') {
    G.mission = 3; G.wanted = 4; G.money = 31900;
    placeRoadblock(140, 548);
    const me = spawnCar('sedan', 138.5, 532, 0, 0x8338ec);
    me.userData.speed = 26; k.setCar(me); k.setHeading(0); player.visible = false;
    camera.position.set(136.2, 2.6, 522);
    camera.lookAt(140, 1.0, 548);
    say(['Ness', 'They sealed the Strip. Find a gap and floor it.'], 999);
  }
}
