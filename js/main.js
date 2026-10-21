// Boot: scene, fixed isometric camera, warm lights, and the wiring between
// the UI, the cat rig, its controller and its behaviour.
import * as THREE from 'three';
import { initLang } from './i18n.js';
import { ROOM, buildRoom } from './room.js';
import { buildCat, adoptGLB } from './cat.js';
import { CatController } from './catController.js';
import { Behavior } from './behavior.js';
import { Audio } from './audio.js';
import { Health } from './health.js';
import { Hud } from './hud.js';
import { initUI, openSetup, openApp, profile, setStatus, applyI18n, currentProfile, useProfile } from './ui.js';

const canvas = document.getElementById('scene');
const frame = canvas.parentElement;
const loadingEl = document.getElementById('loading');

let renderer, scene, camera, room, rig, ctrl, behavior;
let audio = new Audio(null);
const health = new Health();
let hud = null;
const clock = new THREE.Clock();
const pointer = { x: 0, y: 0 };
let started = false;

/* ---------------- scene ---------------- */
function initScene() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.16;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);

  scene = new THREE.Scene();

  const center = new THREE.Vector3(ROOM.W * 0.5, ROOM.H * 0.58, ROOM.D * 0.5);
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 300);
  const dir = new THREE.Vector3(1, 0.86, 1).normalize();
  camera.position.copy(center).addScaledVector(dir, 70);
  camera.lookAt(center);
  camera.userData.center = center;
  scene.add(camera);

  // warm, soft, one shadow caster
  scene.add(new THREE.HemisphereLight(0xFFF6EA, 0x8C7E6E, 0.8));
  const key = new THREE.DirectionalLight(0xFFEFD6, 0.95);
  key.position.set(18, 30, 24);
  key.target.position.copy(center);
  scene.add(key.target);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const S = 20;
  key.shadow.camera.left = -S; key.shadow.camera.right = S;
  key.shadow.camera.top = S; key.shadow.camera.bottom = -S;
  key.shadow.camera.near = 20; key.shadow.camera.far = 120;
  key.shadow.bias = -0.0008;
  key.shadow.normalBias = 0.04;
  key.shadow.camera.updateProjectionMatrix();
  scene.add(key);

  const fillLight = new THREE.DirectionalLight(0xDCE8F2, 0.3);
  fillLight.position.set(-14, 12, 18);
  scene.add(fillLight);

  // the desk lamp: a warm pool of light on the cat's home
  const lamp = new THREE.PointLight(0xFFC27A, 16, 14, 2);
  lamp.position.set(7.5, 8, 3.4);
  scene.add(lamp);

  // soft contact shadow so the diorama floats
  const shadowTex = radialShadow();
  const blob = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM.W * 1.5, ROOM.D * 1.5),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.4, depthWrite: false, toneMapped: false })
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.set(ROOM.W / 2, -0.02, ROOM.D / 2);
  scene.add(blob);
}

function radialShadow() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 10, 64, 64, 62);
  g.addColorStop(0, 'rgba(60,46,32,.55)');
  g.addColorStop(1, 'rgba(60,46,32,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function resize() {
  const w = frame.clientWidth, h = frame.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  const aspect = w / h;
  const viewSize = 28.5;
  camera.left = -viewSize * aspect / 2;
  camera.right = viewSize * aspect / 2;
  camera.top = viewSize / 2;
  camera.bottom = -viewSize / 2;
  camera.updateProjectionMatrix();
}

/* ---------------- optional real models ---------------- */
let manifest = { models: {}, posters: {} };
async function loadManifest() {
  try {
    const res = await fetch('assets/manifest.json');
    if (res.ok) manifest = await res.json();
  } catch (e) { /* keep the defaults */ }
}

async function tryGLB(file) {
  if (!file) return null;
  const path = 'assets/models/' + file;
  try {
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const loader = new GLTFLoader();
    return await new Promise((res, rej) => loader.load(path, g => res(g), undefined, rej));
  } catch (e) {
    return null;
  }
}

/* ---------------- start ---------------- */
async function start(p) {
  openApp();
  await loadManifest();
  audio.setFiles(manifest.sounds);
  if (!renderer) initScene();
  resize();

  if (!room) {
    const glbRoom = await tryGLB(manifest.models && manifest.models.room);
    room = buildRoom(manifest);
    if (glbRoom) {
      room.group.clear();
      glbRoom.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      room.group.add(glbRoom.scene);
    }
    scene.add(room.group);
  }

  if (behavior) behavior.stopPurr();          // a rebuilt cat must not leave a loop running
  if (rig) { scene.remove(rig.root); rig = null; }
  const glbCat = await tryGLB(manifest.models && manifest.models.cat);
  rig = glbCat ? adoptGLB(glbCat.scene) : buildCat({ eye: p.eye, collar: p.collar });
  rig.root.traverse(o => { if (o.isMesh || o.isInstancedMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(rig.root);

  health.begin();                             // a brand-new cat starts on 2.5 hearts
  ctrl = new CatController(rig);
  behavior = new Behavior({
    room, rig, ctrl, audio, scene,
    onStatus: key => setStatus(key),
    onFed: () => health.refill(),             // the moment it starts munching
    onTreatDone: () => { treatBtn.disabled = false; }
  });

  loadingEl.hidden = true;
  if (!started) { started = true; clock.start(); renderer.setAnimationLoop(tick); }
}

function tick() {
  const dt = Math.min(0.05, clock.getDelta());
  if (ctrl) {
    ctrl.lookAtScreen(pointer.x, pointer.y);
    behavior.setHungry(health.value() <= 1);
    behavior.update(dt);
    ctrl.update(dt);
    hud.update(dt);
  }
  renderer.render(scene, camera);
}

/* ---------------- input ---------------- */
window.addEventListener('resize', () => { if (renderer) resize(); });
window.addEventListener('pointermove', e => {
  const r = frame.getBoundingClientRect();
  pointer.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
  pointer.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
});

const sneezeBtn = document.getElementById('sneezeBtn');
const treatBtn = document.getElementById('treatBtn');
const muteBtn = document.getElementById('muteBtn');

sneezeBtn.addEventListener('click', () => { audio.unlock(); if (behavior) behavior.requestSneeze(); });
treatBtn.addEventListener('click', () => {
  audio.unlock();
  if (behavior && behavior.requestTreat()) treatBtn.disabled = true;
});
muteBtn.setAttribute('aria-pressed', String(audio.muted));
muteBtn.addEventListener('click', () => {
  const next = !audio.muted;
  audio.setMuted(next);
  muteBtn.setAttribute('aria-pressed', String(next));
  if (!next) audio.unlock();
});
// document.getElementById('changeCat').addEventListener('click', () => openSetup(currentProfile()));
window.addEventListener('pointerdown', () => audio.unlock());

/* ---------------- boot ---------------- */
initLang();
hud = new Hud({ health, profile: () => currentProfile() });
initUI({
  onStart: p => start(p),
  onLangChange: () => hud.applyLang()
});

const saved = profile.load();
if (saved) { useProfile(saved); openApp(); start(saved); }
else openSetup(null);
