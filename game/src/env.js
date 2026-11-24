// Golden-hour environment: renderer, sky dome shader, sun, ocean, beach.
import * as THREE from 'three';

export const SUN_DIR = new THREE.Vector3(-0.55, 0.16, -0.82).normalize();

export function makeRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1);
  r.setSize(window.innerWidth, window.innerHeight, false);
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.05;
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  return r;
}

const skyVert = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * p;
  gl_Position.z = gl_Position.w;
}`;

const skyFrag = `
uniform vec3 sunDir;
uniform float time;
varying vec3 vDir;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=0.5; } return v; }
void main() {
  vec3 d = normalize(vDir);
  float h = clamp(d.y, -0.2, 1.0);
  vec3 horizon = vec3(1.0, 0.55, 0.28);
  vec3 mid = vec3(0.86, 0.32, 0.36);
  vec3 zenith = vec3(0.22, 0.12, 0.38);
  vec3 col = mix(horizon, mid, smoothstep(0.0, 0.18, h));
  col = mix(col, zenith, smoothstep(0.18, 0.75, h));
  float s = max(dot(d, sunDir), 0.0);
  col += vec3(1.0, 0.62, 0.3) * pow(s, 8.0) * 0.65;
  col += vec3(1.0, 0.85, 0.6) * pow(s, 64.0) * 1.2;
  col += vec3(1.0, 0.95, 0.8) * smoothstep(0.9993, 0.9997, s) * 6.0;
  if (d.y > 0.02) {
    vec2 uv = d.xz / (d.y + 0.15) * 1.6 + vec2(time * 0.004, 0.0);
    float c = smoothstep(0.52, 0.8, fbm(uv));
    vec3 cloudLit = mix(vec3(0.95, 0.5, 0.45), vec3(1.0, 0.82, 0.6), pow(s, 3.0));
    col = mix(col, cloudLit, c * 0.75 * smoothstep(0.02, 0.2, d.y));
  }
  if (d.y < 0.0) col = mix(col, vec3(0.35, 0.18, 0.22), smoothstep(0.0, -0.1, d.y));
  gl_FragColor = vec4(col, 1.0);
}`;

export function makeSky(scene) {
  const mat = new THREE.ShaderMaterial({
    vertexShader: skyVert, fragmentShader: skyFrag, side: THREE.BackSide, depthWrite: false,
    uniforms: { sunDir: { value: SUN_DIR.clone() }, time: { value: 0 } },
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1800, 48, 24), mat);
  sky.frustumCulled = false;
  scene.add(sky);
  return sky;
}

export function makeEnvMap(renderer) {
  // Bake a reflection map from a small sky-only scene so paint and glass catch the sunset.
  const envScene = new THREE.Scene();
  makeSky(envScene);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(900, 24), new THREE.MeshBasicMaterial({ color: 0x3a2228 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -30;
  envScene.add(ground);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(envScene, 0.02);
  pmrem.dispose();
  return rt.texture;
}

export function makeLights(scene) {
  const hemi = new THREE.HemisphereLight(0xffc7a0, 0x50304a, 0.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffb070, 3.4);
  sun.position.copy(SUN_DIR).multiplyScalar(300);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const c = sun.shadow.camera;
  c.left = -120; c.right = 120; c.top = 120; c.bottom = -120; c.near = 10; c.far = 700;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  return { sun, hemi };
}

const oceanVert = `
uniform float time;
varying vec3 vWorld;
varying float vWave;
void main() {
  vec3 p = position;
  vec4 w = modelMatrix * vec4(p, 1.0);
  float wave = sin(w.x * 0.06 + time * 1.3) * 0.35 + sin(w.z * 0.09 - time * 1.7) * 0.25 + sin((w.x + w.z) * 0.21 + time * 2.4) * 0.08;
  w.y += wave;
  vWave = wave;
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const oceanFrag = `
uniform float time;
uniform vec3 sunDir;
uniform vec3 camPos;
varying vec3 vWorld;
varying float vWave;
void main() {
  float e = 0.6;
  float dx = cos(vWorld.x * 0.06 + time * 1.3) * 0.021 + cos((vWorld.x + vWorld.z) * 0.21 + time * 2.4) * 0.017 + sin(vWorld.x * 1.3 + time * 3.0) * 0.03;
  float dz = -sin(vWorld.z * 0.09 - time * 1.7) * 0.022 + cos((vWorld.x + vWorld.z) * 0.21 + time * 2.4) * 0.017 + cos(vWorld.z * 1.7 - time * 2.6) * 0.03;
  vec3 n = normalize(vec3(-dx * e * 4.0, 1.0, -dz * e * 4.0));
  vec3 v = normalize(camPos - vWorld);
  float fres = pow(1.0 - max(dot(n, v), 0.0), 4.0);
  vec3 deep = vec3(0.03, 0.18, 0.26);
  vec3 shallow = vec3(0.1, 0.42, 0.45);
  vec3 skyRef = vec3(1.0, 0.55, 0.38);
  vec3 col = mix(deep, shallow, clamp(vWave * 0.8 + 0.4, 0.0, 1.0) * 0.5);
  col = mix(col, skyRef, 0.25 + fres * 0.6);
  vec3 r = reflect(-v, n);
  float glint = pow(max(dot(r, sunDir), 0.0), 220.0);
  col += vec3(1.0, 0.8, 0.5) * glint * 5.0;
  col += vec3(1.0, 0.6, 0.3) * pow(max(dot(r, sunDir), 0.0), 12.0) * 0.3;
  float dist = length(camPos.xz - vWorld.xz);
  col = mix(col, vec3(1.0, 0.6, 0.42), smoothstep(250.0, 1400.0, dist));
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function makeOcean(scene) {
  const mat = new THREE.ShaderMaterial({
    vertexShader: oceanVert, fragmentShader: oceanFrag,
    uniforms: { time: { value: 0 }, sunDir: { value: SUN_DIR.clone() }, camPos: { value: new THREE.Vector3() } },
  });
  const geo = new THREE.PlaneGeometry(3600, 3600, 220, 220);
  geo.rotateX(-Math.PI / 2);
  const ocean = new THREE.Mesh(geo, mat);
  ocean.position.set(-1830, -0.6, 0); // the sea lies west of the beach (x < -30)
  scene.add(ocean);
  return ocean;
}

export function sandTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#e8c08a'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 9000; i++) {
    const t = Math.random();
    g.fillStyle = t < 0.5 ? 'rgba(180,130,80,0.25)' : 'rgba(255,240,210,0.3)';
    g.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(30, 300);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeBeach(scene) {
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(40, 2400), new THREE.MeshStandardMaterial({ map: sandTexture(), roughness: 0.95 }));
  sand.rotation.x = -Math.PI / 2; sand.position.set(-30, 0.02, 0); sand.receiveShadow = true;
  scene.add(sand);
  // a wet strip where waves lap
  const wet = new THREE.Mesh(new THREE.PlaneGeometry(8, 2400), new THREE.MeshStandardMaterial({ color: 0xa8774e, roughness: 0.3, metalness: 0.1 }));
  wet.rotation.x = -Math.PI / 2; wet.position.set(-48, 0.03, 0);
  scene.add(wet);
  // lifeguard towers in pastel colours
  const cols = [0xff6f91, 0x52d1dc, 0xffc75f];
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({ color: cols[i % 3], roughness: 0.6 });
    const hut = new THREE.Mesh(new THREE.BoxGeometry(3, 2.2, 3), m); hut.position.y = 3.2; hut.castShadow = true;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.2, 4), m); roof.position.y = 4.9; roof.rotation.y = Math.PI / 4;
    const legM = new THREE.MeshStandardMaterial({ color: 0xf4efe6 });
    for (const [x, z] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.2), legM); l.position.set(x, 1.1, z); g.add(l);
    }
    g.add(hut, roof);
    g.position.set(-36, 0, -1000 + i * 240);
    scene.add(g);
  }
}
