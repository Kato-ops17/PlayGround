import * as THREE from 'three';
import './style.css';
import { mat, box, sphere, cylinder, light, addInteract, interactables, solids, blocked } from './kit.js';
import { buildFacility } from './facility.js';

/* ------------------------------------------------------------------ *
 *  DEAD AIR — NIGHT SHIFT
 * ------------------------------------------------------------------ */

const canvas = document.querySelector('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.22;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c100f);
scene.fog = new THREE.FogExp2(0x0d1211, 0.022);

const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.08, 110);
camera.position.y = 1.65;
camera.rotation.order = 'YXZ';
const player = new THREE.Group();
player.add(camera);
scene.add(player);

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const center = new THREE.Vector2(0, 0);
raycaster.far = 4.2;
const keys = new Set();
const $ = s => document.querySelector(s);

const ui = {
  menu: $('#menu-screen'), hud: $('#hud'), prompt: $('#interaction-prompt'),
  objective: $('#objective'), sub: $('#objective-sub'), toast: $('#toast'),
  note: $('#note-modal'), noteTitle: $('#note-title'), noteBody: $('#note-body'),
  look: $('#look-hint'), end: $('#end-screen'),
};
const flashEl = $('#flash');

let activeArea = 'room';
let started = false, pointerLocked = false;
let yaw = 0, pitch = 0;
let flashlightOn = true;
let hasCode = false, doorOpened = false, evidence = 0, entityAlert = false;
let gameEnded = false, toastTimer = 0, elapsed = 0;
let facility = null;

const ambient = new THREE.HemisphereLight(0x9ca9aa, 0x151515, 0.4);
scene.add(ambient);
const moon = new THREE.DirectionalLight(0xa6b8bf, 0.62);
moon.position.set(-18, 24, 12);
moon.castShadow = true;
moon.shadow.mapSize.set(1024, 1024);
scene.add(moon);

const flashlight = new THREE.SpotLight(0xe8efdf, 24, 30, Math.PI / 6.1, 0.5, 1.7);
flashlight.position.set(0, 0, 0);
flashlight.target.position.set(0, 0, -1);
camera.add(flashlight, flashlight.target);
const fill = new THREE.PointLight(0x9f7150, 1.4, 13);
fill.position.set(0, 1, 1);
camera.add(fill);

const room = new THREE.Group(); room.name = 'Safehouse'; scene.add(room);
const lot = new THREE.Group(); lot.name = 'Ashford exterior'; scene.add(lot);
lot.visible = false;

/* ---------------------------- safehouse ---------------------------- */
function buildRoom() {
  room.add(new THREE.AmbientLight(0xb2aaa0, 0.62));
  const warm = light(room, 0xffc583, 26, -2.5, 3.8, 1, 14);
  warm.castShadow = true;
  const wall = mat('plaster', 0x746e63), floor = mat('wood', 0x453b31), trim = mat('trim', 0x302b25);
  const glass = mat('glass', 0x18272a, 0.2, { metalness: 0.25, emissive: 0x102126, emissiveIntensity: 0.25, transparent: true, opacity: 0.18, depthWrite: false });
  box(room, 'floor', 0, -0.12, 0, 12, 0.24, 12, floor);
  box(room, 'ceiling', 0, 4.8, 0, 12, 0.25, 12, mat('ceiling', 0x3f3d37));
  box(room, 'back wall', 0, 2.4, 5.95, 12, 4.8, 0.22, wall);
  box(room, 'left wall', -5.95, 2.4, 0, 0.22, 4.8, 12, mat('left wall', 0x5d594f));
  box(room, 'right wall front', 5.95, 2.4, -4.8, 0.22, 4.8, 2.4, wall);
  box(room, 'right wall back', 5.95, 2.4, 4.8, 0.22, 4.8, 2.4, wall);
  box(room, 'right wall lintel', 5.95, 4.15, 0, 0.22, 1.3, 2.4, wall);
  box(room, 'safehouse door frame', 5.72, 1.55, 0, 0.16, 3.1, 2.2, mat('room frame', 0x302b25));
  box(room, 'safehouse door', 5.62, 1.5, 0, 0.12, 2.9, 1.9, mat('room door', 0x51483c));
  const exitTarget = box(room, 'room exit target', 5.0, 1.55, 0, 1.5, 2.8, 2.2, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, colorWrite: false }));
  addInteract(exitTarget, 'LEAVE THE SAFEHOUSE', () => changeArea('lot'), 'room');
  box(room, 'window left', -4.5, 2.4, -5.95, 3, 4.8, 0.22, wall);
  box(room, 'window right', 4.5, 2.4, -5.95, 3, 4.8, 0.22, wall);
  box(room, 'window top', 0, 4.1, -5.95, 6, 1.4, 0.22, wall);
  box(room, 'window sill wall', 0, 0.93, -5.95, 6, 1.86, 0.22, wall);
  box(room, 'window glass', 0, 2.65, -5.95, 5.85, 2.55, 0.08, glass, { cast: false });
  for (const x of [-3, 0, 3]) box(room, 'window mullion', x, 2.65, -5.82, 0.095, 2.65, 0.16, trim);
  for (const y of [1.36, 3.94]) box(room, 'window frame', 0, y, -5.82, 6.12, 0.13, 0.18, trim);
  box(room, 'couch base', -1.6, 0.47, 1.4, 3.15, 0.62, 1.25, mat('couch', 0x4c4941));
  box(room, 'couch back', -1.6, 1.12, 0.92, 3.15, 1.08, 0.38, mat('couch back', 0x57534a));
  for (const x of [-2.7, -1.6, -0.5]) box(room, 'couch cushion', x, 0.82, 1.42, 0.96, 0.2, 0.9, mat('cushion', 0x696257));
  for (const x of [-2.82, -0.38]) for (const z of [1, 1.85]) box(room, 'couch leg', x, 0.2, z, 0.12, 0.4, 0.12, trim);
  box(room, 'coffee table', -1.4, 0.52, 3.05, 2, 0.15, 1.05, mat('table', 0x302b25));
  for (const x of [-2.25, -0.55]) for (const z of [2.7, 3.4]) box(room, 'table leg', x, 0.25, z, 0.09, 0.52, 0.09, trim);
  box(room, 'cardboard box', 3, 0.63, 2.4, 1.15, 1.25, 1.05, mat('box', 0x796247));
  box(room, 'box tape', 2.45, 1.28, 2.4, 0.06, 0.03, 1.05, mat('box tape', 0xb59a70));
  box(room, 'shipping crate', 4.3, 0.48, 3.8, 1.25, 0.95, 1.2, mat('crate', 0x514638));
  box(room, 'crate stripe', 4.3, 0.48, 3.17, 0.09, 0.95, 0.03, mat('crate stripe', 0x927752));
  box(room, 'suitcase', 3.65, 0.3, -1.4, 1.2, 0.6, 0.75, mat('suitcase', 0x393d3b));
  cylinder(room, 'lamp stem', -0.1, 1.6, -0.1, 0.035, 0.045, 2.9, mat('brass', 0x866c4d));
  cylinder(room, 'lamp shade', -0.1, 3.17, -0.1, 0.25, 0.42, 0.48, mat('shade', 0xb19a75));
  light(room, 0xffb56b, 10, -0.1, 2.95, -0.1, 7);
  box(room, 'picture frame', -4.8, 2.7, -1.5, 0.08, 1.35, 1.8, mat('frame', 0x221f1c));
  box(room, 'picture', -4.73, 2.7, -1.5, 0.03, 1.16, 1.56, mat('picture', 0x595449));
  const rug = cylinder(room, 'rug', 0, 0.015, 2.2, 2.5, 2.5, 0.025, mat('rug', 0x454239), 32);
  rug.scale.set(1, 0.3, 0.58);
  const outside = new THREE.Group(); room.add(outside); outside.position.z = -6.9;
  box(outside, 'distant ground', 0, -0.35, -14, 50, 0.2, 35, mat('earth', 0x202723), { cast: false });
  box(outside, 'distant factory', 0, 1.45, -26, 13, 3.5, 3, mat('factory', 0x323535));
  box(outside, 'factory roof', 0, 3.3, -26, 14, 0.2, 3.4, mat('roof', 0x242827));
  for (const x of [-4.7, -1.8, 2.5, 4.2]) box(outside, 'factory windows', x, 1.8, -24.43, 0.55, 0.75, 0.03, mat('lit window', 0x9c8060, 0.4, { emissive: 0x6e4323, emissiveIntensity: 0.55 }), { cast: false });
  function pine(x, z, h) {
    cylinder(outside, 'pine trunk', x, h * 0.34, z, 0.12, 0.2, h * 0.68, mat('bark', 0x302a22), 7);
    for (let i = 0; i < 3; i++) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(h * (0.29 - i * 0.045), h * 0.46, 7), mat('pine', i === 1 ? 0x1d2925 : 0x25312a));
      c.position.set(x, h * (0.34 + i * 0.19), z); c.castShadow = true; outside.add(c);
    }
  }
  for (const [x, z, h] of [[-8, -2, 7], [-11, -9, 9], [-7, -15, 6], [9, -4, 8], [12, -12, 10], [7, -19, 7], [16, -6, 9], [-15, -4, 8]]) pine(x, z, h);
}
buildRoom();

/* ------------------------------ exterior ---------------------------- */
function buildLot({ onSearchCar, onKeypad }) {
  lot.add(new THREE.AmbientLight(0x78898b, 0.34));
  const asphalt = mat('asphalt', 0x252a29), concrete = mat('concrete', 0x4a4b45), rust = mat('rust', 0x443c32);
  const brick = mat('brick', 0x49443c), darkBrick = mat('dark brick', 0x282e2d), metal = mat('metal', 0x333a39, 0.54, { metalness: 0.45 });
  box(lot, 'parking lot', 0, -0.25, -8, 100, 0.5, 90, asphalt);
  for (let i = 0; i < 18; i++) {
    const x = ((i * 37) % 57) - 28, z = ((i * 23) % 65) - 36;
    box(lot, 'asphalt patch', x, 0.006, z, 1.3 + (i % 3) * 0.8, 0.015, 0.25 + (i % 4) * 0.2, mat('patch' + i, i % 2 ? 0x2a2e2c : 0x202423), { cast: false });
  }
  for (let x = -23; x <= 23; x += 7) box(lot, 'parking stripe', x, 0.012, 8, 0.12, 0.02, 6, mat('stripe', 0x8c8061), { cast: false });
  box(lot, 'factory main', 0, 5, -27, 28, 10, 4, brick);
  box(lot, 'factory roof', 0, 10.05, -27, 29, 0.28, 4.7, mat('roof metal', 0x272d2c));
  box(lot, 'factory west wing', -13.6, 3.8, -19.5, 4, 7, 18, darkBrick);
  box(lot, 'west wing roof', -13.6, 7.35, -19.5, 4.4, 0.28, 18.5, mat('roof2', 0x303433));
  box(lot, 'factory east shed', 9, 3, -20, 10, 5.5, 15, mat('shed', 0x3e403c));
  box(lot, 'shed roof', 9, 5.85, -20, 10.5, 0.3, 15.5, mat('shed roof', 0x252a28));
  for (let x = -11; x <= 12; x += 4) {
    box(lot, 'factory upper window', x, 7.1, -24.94, 1.1, 1.5, 0.07, mat('dark pane' + x, 0x151b1b, 0.25, { emissive: x === 1 ? 0x74502d : 0x080d0e, emissiveIntensity: x === 1 ? 0.4 : 0.1 }), { cast: false });
    box(lot, 'factory lintel', x, 7.9, -24.9, 1.35, 0.13, 0.18, rust);
  }
  for (const x of [-10, -5, 0, 5, 10]) box(lot, 'facade pilaster', x, 4.7, -24.86, 0.2, 9.3, 0.24, mat('concrete rib', 0x373a36));
  box(lot, 'loading door', 2.4, 3.2, -24.78, 4.2, 6.1, 0.12, mat('loading door', 0x282d2c));
  for (let y = 0.45; y < 6; y += 0.35) box(lot, 'door slat', 2.4, y, -24.68, 4.12, 0.035, 0.05, metal);
  box(lot, 'loading canopy', 2.4, 6.5, -25.5, 5, 0.25, 1.8, rust);
  for (const x of [0.2, 4.6]) box(lot, 'canopy support', x, 5.4, -25.2, 0.15, 2.1, 0.15, metal);
  box(lot, 'side entrance frame', -10.2, 1.7, -24.72, 2.1, 3.45, 0.25, mat('door surround', 0x252a29));
  const entrance = box(lot, 'side entrance', -10.2, 1.65, -24.54, 1.65, 3, 0.18, mat('factory door', 0x343936));
  box(lot, 'door warning', -10.2, 2.9, -24.42, 1.3, 0.11, 0.08, mat('warning', 0x856641));
  box(lot, 'keypad', -8.98, 1.65, -24.34, 0.27, 0.54, 0.12, mat('keypad', 0x171d1d, 0.3, { emissive: 0x17302e, emissiveIntensity: 0.7 }));
  for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++)
    sphere(lot, 'keypad button', -9.06 + c * 0.12, 1.8 - r * 0.13, -24.26, 0.025, mat('keypad light', 0x6ab5a0, 0.25, { emissive: 0x397d65, emissiveIntensity: 1 }));
  const doorTarget = box(lot, 'door interaction', -10.05, 1.7, -24.25, 2.2, 3.3, 1.4, new THREE.MeshBasicMaterial({ colorWrite: false }));
  addInteract(doorTarget, 'USE THE SERVICE KEYPAD', onKeypad, 'lot');
  for (let i = 0; i < 7; i++) box(lot, 'side corrugation', -15.67, 3.8, -17 - i * 3.4, 0.08, 6.3, 0.12, mat('side metal' + i, 0x353b38));
  box(lot, 'vent stack', -6, 13, -28, 1.4, 6, 1.4, rust);
  box(lot, 'vent cap', -6, 16, -28, 2, 0.25, 2, metal);
  for (const x of [-11, 2, 10]) {
    box(lot, 'lamp arm', x, 8.5, -25.15, 0.12, 0.12, 0.8, metal);
    box(lot, 'lamp shade', x, 8.15, -25.2, 0.7, 0.18, 0.42, metal);
    const l = light(lot, 0xffa653, x === -11 ? 10 : 6, x, 7.8, -25.1, 18);
    l.userData.flicker = true;
  }
  const bark = mat('tree bark', 0x292a25), leaves = mat('tree leaves', 0x17221e);
  function tree(x, z, h) {
    cylinder(lot, 'tree trunk', x, h * 0.32, z, 0.18, 0.25, h * 0.64, bark, 7);
    for (let i = 0; i < 4; i++) {
      const t = new THREE.Mesh(new THREE.ConeGeometry(h * (0.29 - i * 0.035), h * 0.43, 7), leaves);
      t.position.set(x, h * (0.35 + i * 0.15), z); t.castShadow = true; lot.add(t);
    }
  }
  for (const [x, z, h] of [[-26, -10, 11], [-31, -21, 14], [-24, -34, 10], [25, -9, 12], [30, -24, 14], [23, -38, 11], [18, -46, 9], [-18, -48, 10]]) tree(x, z, h);
  for (const side of [-1, 1]) for (let z = -49; z < 1; z += 5) {
    cylinder(lot, 'fence post', side * 25, 0.9, z, 0.055, 0.055, 1.8, metal, 6);
    box(lot, 'fence rail', side * 25, 1.45, z - 2.5, 0.055, 0.055, 5, metal, { cast: false });
    box(lot, 'fence rail', side * 25, 0.5, z - 2.5, 0.055, 0.055, 5, metal, { cast: false });
  }
  const car = new THREE.Group(); car.position.set(0, 0, 8.5); lot.add(car);
  const bodymat = mat('car paint', 0x4d3028, 0.34, { metalness: 0.48 }), tire = mat('rubber', 0x111414, 0.95);
  const chrome = mat('chrome', 0x727674, 0.28, { metalness: 0.8 }), windows = mat('car glass', 0x192326, 0.17, { metalness: 0.25 });
  box(car, 'car chassis', 0, 0.78, 0, 2.05, 0.72, 4.5, bodymat);
  box(car, 'car hood', 0, 1.1, -1.45, 1.95, 0.28, 1.35, bodymat);
  box(car, 'car trunk', 0, 1.08, 1.62, 1.9, 0.35, 1.05, bodymat);
  box(car, 'car roof', 0, 1.8, 0.05, 1.63, 0.18, 1.9, bodymat);
  box(car, 'windshield', 0, 1.52, -0.99, 1.56, 0.68, 0.07, windows);
  box(car, 'rear glass', 0, 1.52, 1.11, 1.56, 0.62, 0.06, windows);
  for (const side of [-1, 1]) {
    box(car, 'side glass', side * 0.83, 1.55, 0.05, 0.06, 0.55, 1.7, windows);
    for (const z of [-1.48, 1.48]) {
      cylinder(car, 'tire', side * 1.04, 0.47, z, 0.43, 0.43, 0.25, tire, 16).rotation.z = Math.PI / 2;
      cylinder(car, 'hubcap', side * 1.18, 0.47, z, 0.2, 0.2, 0.04, chrome, 12).rotation.z = Math.PI / 2;
    }
    box(car, 'door panel', side * 1.04, 0.86, 0.12, 0.1, 0.59, 1.75, bodymat);
    box(car, 'door handle', side * 1.105, 1.04, -0.25, 0.04, 0.055, 0.32, chrome);
  }
  for (const x of [-0.67, 0.67]) {
    box(car, 'headlight', x, 0.99, -2.27, 0.48, 0.28, 0.08, mat('headlamp', 0xe0d4a9, 0.22, { emissive: 0x9b8659, emissiveIntensity: 0.4 }));
    box(car, 'tail light', x, 0.98, 2.26, 0.42, 0.3, 0.08, mat('tail lamp', 0x7d2821, 0.3, { emissive: 0x711f16, emissiveIntensity: 0.4 }));
  }
  box(car, 'front bumper', 0, 0.48, -2.32, 2.15, 0.18, 0.16, chrome);
  box(car, 'rear bumper', 0, 0.48, 2.32, 2.15, 0.18, 0.16, chrome);
  const carTarget = box(lot, 'driver interaction', 1.45, 1, 7.85, 0.9, 1.7, 1.7, new THREE.MeshBasicMaterial({ colorWrite: false }));
  addInteract(carTarget, "SEARCH THE DRIVER'S SEAT", onSearchCar, 'lot');
  lot.userData.lamps = [...lot.children.filter(o => o.userData.flicker)];
}

/* ------------------------------ UI state ---------------------------- */
function setObjective(title, detail) { ui.objective.textContent = title; ui.sub.textContent = detail; }
function toast(message) { ui.toast.textContent = message; ui.toast.classList.add('show'); toastTimer = 2.8; }
function openNote(title, body) {
  ui.noteTitle.textContent = title; ui.noteBody.textContent = body;
  ui.note.classList.remove('hidden');
  if (document.pointerLockElement) document.exitPointerLock();
}
function closeNote() {
  ui.note.classList.add('hidden');
  if (started && !gameEnded) canvas.requestPointerLock?.();
}
function closeOverlays() {
  if (!ui.note.classList.contains('hidden')) { closeNote(); return true; }
  return false;
}
function changeArea(area) {
  activeArea = area;
  room.visible = area === 'room'; lot.visible = area === 'lot'; facility.group.visible = area === 'lab';
  ui.prompt.innerHTML = '';
  if (area === 'room') {
    player.position.set(2.15, 0, 1.8); yaw = 0;
    setObjective('Find a way out', 'The car is waiting in the lot. Search it before approaching the factory.');
    scene.background.set(0x171816); scene.fog.density = 0.023;
    renderer.toneMappingExposure = 1.16;
    moon.castShadow = false;
  }
  if (area === 'lot') {
    player.position.set(0, 0, 13); yaw = 0;
    setObjective('Search the car for a way inside', 'The factory side entrance is on the west wall.');
    scene.background.set(0x111615); scene.fog.density = 0.018;
    renderer.toneMappingExposure = 1.16;
    moon.castShadow = true;
  }
  if (area === 'lab') {
    player.position.set(0, 0, 12.25); yaw = 0;
    if (evidence >= 5) setObjective('IT IS AWAKE. RUN.', 'Get back to the entry gate. Do not look back.');
    else setObjective('Recover the five recordings', 'Search the facility. Start with SECURITY, east of the entry hall.');
    scene.background.set(0x0b0e0c); scene.fog.density = 0.024;
    renderer.toneMappingExposure = 1.4;
    moon.castShadow = false;
  }
  camera.rotation.set(pitch, yaw, 0, 'YXZ');
}

function enterLab() {
  changeArea('lab');
  toast('SUBLEVEL ACCESS · SIGNAL LOST');
}

function finishGame() {
  gameEnded = true;
  ui.end.classList.remove('hidden');
  ui.prompt.innerHTML = '';
  if (document.pointerLockElement) document.exitPointerLock();
}

function collectEvidence(def) {
  if (def.taken) return;
  def.taken = true;
  evidence++;
  if (def.prop) {
    def.prop.traverse(o => {
      if (o.isMesh && o.material && o.material.color) o.material = mat('evidence taken', 0x25271f, 0.95);
    });
  }
  openNote(def.title, def.body);
  toast(`EVIDENCE ${String(evidence).padStart(2, '0')} / 05 RECOVERED`);
  if (evidence < 5) {
    setObjective('Recover the remaining evidence', `${evidence} of 5 recordings secured. Search the rooms off the halls.`);
  } else {
    entityAlert = true;
    setObjective('IT IS AWAKE. RUN.', 'Get back to the entry gate. Do not stop.');
    facility.wake();
    flashEl.classList.remove('bang'); void flashEl.offsetWidth; flashEl.classList.add('bang');
    toast('SUBJECT 06 IS AWAKE');
  }
}

function onCaught() {
  flashEl.classList.remove('bang'); void flashEl.offsetWidth; flashEl.classList.add('bang');
  toast('IT FOUND YOU — RUN');
  flashlightOn = false; flashlight.visible = false;
  setTimeout(() => {
    flashlightOn = true; flashlight.visible = true;
  }, 1400);
}

/* --------------------------- interaction ---------------------------- */
function tryInteract() {
  if (closeOverlays()) return;
  raycaster.setFromCamera(center, camera);
  const hits = raycaster.intersectObjects(interactables.filter(o => o.userData.area === activeArea), false);
  if (hits.length && hits[0].distance <= raycaster.far) hits[0].object.userData.action?.();
}

function updatePrompt() {
  raycaster.setFromCamera(center, camera);
  const hits = raycaster.intersectObjects(interactables.filter(o => o.userData.area === activeArea), false);
  const hit = hits.find(h => h.distance <= raycaster.far);
  if (hit) ui.prompt.innerHTML = `<b>E</b> ${hit.object.userData.label}`;
  else if (activeArea === 'lab' && evidence >= 5 && player.position.z > 11.4) ui.prompt.innerHTML = '<b>↑</b> EXIT TO THE PARKING LOT';
  else if (activeArea === 'lot' && evidence >= 5 && Math.abs(player.position.x) < 2.4 && player.position.z > 5.5) ui.prompt.innerHTML = '<b>E</b> RETURN TO THE CAR';
  else ui.prompt.innerHTML = '';
}

/* ------------------------------ movement ---------------------------- */
function collides(x, z) {
  const radius = 0.3;
  if (activeArea === 'lab') {
    const F = facility.F;
    if (x < F.minX + radius || x > F.maxX - radius || z < F.minZ + radius || z > F.maxZ - radius) return true;
    return blocked('lab', x, z, radius);
  }
  if (activeArea === 'room') {
    if (x < -5.55 || x > 5.48 || z < -5.5 || z > 5.5) return true;
    if (Math.abs(x + 1.6) < 1.9 && z > 0.78 && z < 2.1) return true;
    if (Math.abs(x + 1.4) < 1.2 && z > 2.42 && z < 3.72) return true;
    if (x > 2.25 && x < 5.1 && z > 1.75 && z < 4.5) return true;
  }
  if (activeArea === 'lot') {
    if (x < -23 || x > 23 || z < -24.0 || z > 16.5) return true;
    if (Math.abs(x) < 1.35 && z > 6.05 && z < 10.95) return true;
  }
  return false;
}

function move(dt) {
  let forward = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
  let side = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
  if (!forward && !side) return;
  const length = Math.hypot(forward, side); forward /= length; side /= length;
  const speed = (keys.has('shift') ? 5.2 : 3.0) * dt;
  const dx = (-Math.sin(yaw) * forward + Math.cos(yaw) * side) * speed;
  const dz = (-Math.cos(yaw) * forward - Math.sin(yaw) * side) * speed;
  if (!collides(player.position.x + dx, player.position.z)) player.position.x += dx;
  if (!collides(player.position.x, player.position.z + dz)) player.position.z += dz;
}

/* ------------------------------ game loop --------------------------- */
function update(dt) {
  elapsed += dt;
  move(dt);
  camera.rotation.set(pitch, yaw, 0, 'YXZ');

  if (activeArea === 'lab') {
    if (player.position.z > 13.25) {
      if (evidence >= 5) {
        changeArea('lot');
        player.position.set(-10, 0, -21.3); yaw = Math.PI;
        setObjective('Get to the car', 'You have all five recordings. Leave before it follows.');
        toast('BACK OUTSIDE · GET TO THE CAR');
      } else {
        player.position.z = 13.25;
      }
    }
    facility.update(dt, player.position, elapsed, !ui.note.classList.contains('hidden'));
  }

  for (const area of [lot]) {
    for (const l of area.userData.lamps || []) {
      if (Math.random() < dt * (l.userData.flicker ? 2.4 : 0.3)) l.intensity *= 0.14;
      else l.intensity = Math.min(l.userData.flicker ? 10 : 8, l.intensity + dt * 10);
    }
  }

  if (activeArea === 'lot' && doorOpened && player.position.z < -24.0) player.position.z = -24.0;
  if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) ui.toast.classList.remove('show'); }
  const seconds = Math.floor(elapsed), clockEl = $('#clock');
  if (clockEl) clockEl.textContent = `02:${String(13 + Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  updatePrompt();
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (started && !gameEnded) update(dt);
  renderer.render(scene, camera);
}

/* ------------------------------ wiring ------------------------------ */
buildLot({
  onSearchCar: () => {
    if (evidence >= 5) { finishGame(); return; }
    if (!hasCode) {
      hasCode = true;
      openNote('A folded maintenance slip', 'DOOR CODE: 0427\n\nIf the keypad is still alive, this should get you through the west service entrance.\n\nHolloway says we are not supposed to come back after the alarms. I think I am already too late.');
      setObjective('Find the west service entrance', 'The keypad is on the factory wall. Code: 0427.');
      toast('MAINTENANCE SLIP ADDED');
    } else openNote('Maintenance slip', 'DOOR CODE: 0427\n\nWest service entrance. Keep your head down.');
  },
  onKeypad: () => {
    if (!hasCode) { toast('THE KEYPAD NEEDS A CODE'); return; }
    if (!doorOpened) {
      doorOpened = true;
      toast('ACCESS GRANTED · 04 / 27');
      setTimeout(enterLab, 650);
    }
  },
});

facility = buildFacility(scene, { onEvidence: collectEvidence, onCaught });
facility.group.visible = false;

$('#start-button').addEventListener('click', () => {
  if (started) return;
  started = true;
  ui.menu.classList.remove('visible');
  ui.hud.classList.remove('hidden');
  ui.look.classList.remove('hidden');
  changeArea('room');
  canvas.requestPointerLock?.();
});
$('#close-note').addEventListener('click', closeNote);
ui.note.addEventListener('click', e => { if (e.target === ui.note) closeNote(); });
$('#restart-button').addEventListener('click', () => location.reload());
canvas.addEventListener('click', () => {
  if (started && !gameEnded && ui.note.classList.contains('hidden') && !document.pointerLockElement) canvas.requestPointerLock?.();
});

document.addEventListener('pointerlockchange', () => {
  pointerLocked = document.pointerLockElement === canvas;
  ui.look.classList.toggle('hidden', !started || pointerLocked || gameEnded || !ui.note.classList.contains('hidden'));
});
document.addEventListener('mousemove', e => {
  if (pointerLocked && started && !gameEnded && ui.note.classList.contains('hidden')) {
    yaw -= e.movementX * 0.0022;
    pitch = Math.max(-1.35, Math.min(1.35, pitch - e.movementY * 0.0022));
  }
});
document.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
  keys.add(k);
  if (k === 'e' && !e.repeat) tryInteract();
  if (k === 'f' && !e.repeat) {
    flashlightOn = !flashlightOn;
    flashlight.visible = flashlightOn;
    toast(flashlightOn ? 'FLASHLIGHT ON' : 'FLASHLIGHT OFF');
  }
});
document.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
});

/* --------------------------- test harness --------------------------- */
window.__gameTest = {
  state: () => ({
    area: activeArea, position: player.position.toArray(), yaw,
    prompt: ui.prompt.textContent, objective: ui.objective.textContent,
    evidence, hasCode, doorOpened, gameEnded, entityAlert,
    facility: facility.state(),
  }),
  startArea: (area) => {
    started = true;
    ui.menu.classList.remove('visible');
    ui.hud.classList.remove('hidden');
    changeArea(area);
  },
  changeArea: (area) => changeArea(area),
  teleport: (x, y, z, angle = 0, down = 0) => {
    player.position.set(x, y, z); yaw = angle; pitch = down;
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
    player.updateMatrixWorld(true);
  },
  look: (angle, down = 0) => { yaw = angle; pitch = down; camera.rotation.set(pitch, yaw, 0, 'YXZ'); },
  interact: () => { player.updateMatrixWorld(true); tryInteract(); },
  targets: () => interactables.map(o => ({ name: o.name, area: o.userData.area, label: o.userData.label, position: o.position.toArray() })),
  aim: () => {
    player.updateMatrixWorld(true);
    raycaster.setFromCamera(center, camera);
    return raycaster.intersectObjects(interactables.filter(o => o.userData.area === activeArea), false)
      .map(h => ({ name: h.object.name, distance: h.distance, label: h.object.userData.label }));
  },
  giveCode: () => { hasCode = true; },
  setEvidence: (n) => {
    evidence = n;
    if (n >= 5) { entityAlert = true; facility.openGate(); facility.wake(); }
  },
  wake: () => facility.wake(),
  creature: () => facility.state(),
  solids: () => solids.lab.length,
};

changeArea('room');
animate();
