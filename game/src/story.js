// Story missions, the Vistamar audio radio and the HUD.
export const MISSIONS = [
  { id: 'arrival', title: 'Golden Arrival', goal: 'Steal a car and drive to <em>Hotel Blue Orchid</em>', to: [22, -150], reward: 1500,
    lines: [['Ness', 'Welcome back to Vistamar. The coast never forgot you.'], ['Ness', 'Grab any ride on Ocean Drive and meet me at the Blue Orchid.']] },
  { id: 'ledger', title: 'The Ledger', goal: 'Get the ledger to the end of <em>Pier 9</em>', to: [-40, 640], reward: 4000, wanted: 3,
    lines: [['Ness', 'Every cop Mayor Salgado owns is between me and the pier.'], ['Rico', 'Then drive faster, hermana.']] },
  { id: 'varela', title: 'Port Varela Heat', goal: 'Clear the gunmen at <em>Port Varela</em>', to: [70, -480], reward: 6000, gunmen: 5,
    lines: [['Rico', 'Los Cuervos took the shipping yard. Take it back.']] },
  { id: 'neon', title: 'Neon Run', goal: 'Outrun the roadblock on the <em>Neon Strip</em>', to: [140, 720], reward: 8000, wanted: 4,
    lines: [['Ness', 'They sealed the Strip. Find a gap and floor it.']] },
  { id: 'skyhawk', title: 'Skyhawk', goal: 'Lose the <em>police helicopter</em>', to: [-20, -900], reward: 10000, wanted: 5,
    lines: [['Radio', 'Air unit Skyhawk has eyes on the suspect.'], ['Ness', 'Under the palms. It cannot see through them.']] },
  { id: 'sunset', title: 'Last Sunset', goal: 'Meet Salgado on <em>Ocean Drive</em>', to: [0, 960], reward: 25000,
    lines: [['Salgado', 'You could have owned this city.'], ['Ness', 'We already do.']] },
];

export const STATIONS = [
  { name: 'NEON FM 98.3', song: 'Midnight Causeway - The Palmettes', notes: [57, 60, 64, 67, 64, 60], bpm: 112 },
  { name: 'CORAL WAVE 101', song: 'Salt on the Chrome - Marisol', notes: [62, 65, 69, 72, 69, 65], bpm: 96 },
  { name: 'VPD SCANNER', song: 'All units, Ocean Drive', notes: [], bpm: 0 },
];

let ctx = null; let radioTimer = null;
export function audioStart() {
  if (ctx) return;
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; }
}
function tone(freq, dur, type = 'sawtooth', vol = 0.05) {
  if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 1800;
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  o.connect(f); f.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + dur);
}
export function playStation(i) {
  clearInterval(radioTimer);
  const st = STATIONS[i]; if (!st.bpm) return;
  let k = 0;
  radioTimer = setInterval(() => {
    const n = st.notes[k++ % st.notes.length];
    tone(440 * Math.pow(2, (n - 69) / 12), 0.3, 'sawtooth', 0.025);
    if (k % 2) tone(55, 0.2, 'square', 0.03);
  }, 60000 / st.bpm / 2);
}
export function sfxShot() { tone(160, 0.12, 'square', 0.12); tone(90, 0.2, 'sawtooth', 0.08); }
export function sfxSiren(t) { tone(700 + Math.sin(t * 4) * 200, 0.15, 'triangle', 0.02); }
export function sfxCash() { tone(880, 0.1, 'sine', 0.08); setTimeout(() => tone(1320, 0.15, 'sine', 0.08), 90); }

const $ = (id) => document.getElementById(id);
export function hud(state) {
  $('stars').innerHTML = [1, 2, 3, 4, 5].map((i) => `<span class="${i <= state.wanted ? '' : 'off'}">&#9733;</span>`).join('');
  $('money').textContent = '$' + Math.floor(state.money).toLocaleString('en-US');
  $('weapon').textContent = state.inCar ? state.carName : state.weapon;
  $('health').style.width = Math.max(0, state.hp) + '%';
  $('speed').textContent = Math.round(Math.abs(state.speed) * 3.6);
  $('carname').textContent = state.inCar ? state.carName : 'ON FOOT';
  $('objective').innerHTML = state.objective;
  $('district').textContent = state.district;
  $('dialogue').innerHTML = state.line ? `<b>${state.line[0]}:</b> ${state.line[1]}` : '';
  $('station').textContent = state.station.name; $('song').textContent = state.station.song;
  $('crosshair').style.display = state.inCar ? 'none' : 'block';
}

export function drawMinimap(canvas, player, heading, blips, target) {
  const g = canvas.getContext('2d'); const W = canvas.width; const S = 0.55;
  g.save(); g.fillStyle = '#3d4a4f'; g.fillRect(0, 0, W, W);
  g.translate(W / 2, W / 2); g.rotate(heading); g.scale(S, S); g.translate(-player.x, -player.z);
  g.fillStyle = '#1f6f8b'; g.fillRect(-2000, -1200, 1975, 2400);
  g.fillStyle = '#d9bf86'; g.fillRect(-50, -1200, 40, 2400);
  g.fillStyle = '#a7adb3'; g.fillRect(-8, -1200, 16, 2400); g.fillRect(132, -1200, 16, 2400);
  for (let z = -960; z <= 960; z += 120) g.fillRect(0, z - 6, 140, 12);
  for (const b of blips) { g.fillStyle = b.c; g.beginPath(); g.arc(b.x, b.z, 7, 0, 7); g.fill(); }
  if (target) { g.fillStyle = '#ffd166'; g.beginPath(); g.arc(target[0], target[1], 12, 0, 7); g.fill(); }
  g.restore();
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(W / 2, W / 2 - 9); g.lineTo(W / 2 - 6, W / 2 + 7); g.lineTo(W / 2 + 6, W / 2 + 7); g.fill();
}
