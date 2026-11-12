import * as THREE from 'three';
import { mat, box, sphere, cylinder, cone, addSolid } from './kit.js';

/* Furniture and set dressing for the sublevel facility.
   Every large prop registers a rectangular collider. */

function reg(parent, x, z, w, d, ry = 0) {
  const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry));
  addSolid('lab', x, z, (w * c + d * s) / 2, (w * s + d * c) / 2);
}

const steel = () => mat('furniture steel', 0x343b39, 0.5, { metalness: 0.35 });
const wood = () => mat('office wood', 0x5a5042, 0.82);
const paper = () => mat('paper', 0xd1cab3, 0.95);

export function officeDesk(parent, x, z, ry = 0, opts = {}) {
  const { w = 2.2, d = 1.0, monitors = 1, clutter = true } = opts;
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g);
  box(g, 'desk top', 0, 0.76, 0, w, 0.07, d, wood());
  for (const dx of [-w / 2 + 0.1, w / 2 - 0.1]) for (const dz of [-d / 2 + 0.08, d / 2 - 0.08])
    box(g, 'desk leg', dx, 0.38, dz, 0.06, 0.76, 0.06, steel());
  box(g, 'drawer bank', w / 2 - 0.45, 0.5, 0.12, 0.8, 0.62, 0.8, mat('desk drawer', 0x4c4539, 0.85));
  for (let i = 0; i < 3; i++) {
    box(g, 'drawer', w / 2 - 0.45, 0.28 + i * 0.2, 0.53, 0.74, 0.16, 0.02, steel());
    box(g, 'handle', w / 2 - 0.45, 0.28 + i * 0.2, 0.55, 0.2, 0.02, 0.02, steel());
  }
  for (let i = 0; i < monitors; i++) {
    const mx = -w / 2 + 0.55 + i * 0.62;
    box(g, 'monitor body', mx, 0.96, 0.02, 0.5, 0.38, 0.42, mat('monitor shell', 0x262a27, 0.7));
    box(g, 'monitor screen', mx, 0.96, -0.2, 0.42, 0.3, 0.02,
      mat('monitor glow', 0x6f8f7d, 0.35, { emissive: 0x466f58, emissiveIntensity: 0.55 }));
    box(g, 'monitor stand', mx, 0.8, 0.02, 0.08, 0.1, 0.12, steel());
  }
  if (clutter) {
    box(g, 'papers', 0.35, 0.8, 0.1, 0.4, 0.012, 0.5, paper());
    cylinder(g, 'mug', 0.05, 0.86, -0.15, 0.05, 0.045, 0.12, mat('mug', 0x9b8a70, 0.7), 10);
  }
  reg(parent, x, z, w, d, ry);
  return g;
}

export function officeChair(parent, x, z, ry = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g);
  box(g, 'seat', 0, 0.47, 0, 0.46, 0.09, 0.46, mat('chair fabric', 0x373b36, 0.95));
  box(g, 'back', 0, 0.79, 0.21, 0.46, 0.6, 0.08, mat('chair fabric', 0x373b36, 0.95));
  box(g, 'post', 0, 0.25, 0, 0.07, 0.44, 0.07, steel());
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2;
    const arm = box(g, 'base leg', Math.cos(a) * 0.2, 0.06, Math.sin(a) * 0.2, 0.34, 0.04, 0.05, steel());
    arm.rotation.y = -a;
    sphere(g, 'caster', Math.cos(a) * 0.36, 0.03, Math.sin(a) * 0.36, 0.035, mat('rubber', 0x111414, 0.95));
  }
  reg(parent, x, z, 0.6, 0.6, ry);
  return g;
}

export function cabinet(parent, x, z, w = 1.2, d = 0.55, h = 1.95, ry = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g);
  box(g, 'cabinet body', 0, h / 2, 0, w, h, d, mat('cabinet', 0x4a514b, 0.8));
  box(g, 'cabinet top', 0, h + 0.03, 0, w + 0.05, 0.06, d + 0.05, mat('cabinet top', 0x343a35, 0.7));
  box(g, 'cabinet split', 0, h / 2, d / 2 + 0.01, 0.04, h - 0.1, 0.02, mat('cabinet shadow', 0x2a2f2b, 0.9));
  for (const dx of [-w / 4, w / 4]) box(g, 'handle', dx, h / 2, d / 2 + 0.04, 0.04, 0.16, 0.03, steel());
  reg(parent, x, z, w, d, ry);
  return g;
}

export function shelfUnit(parent, x, z, ry = 0, opts = {}) {
  const { w = 2.2, h = 2.25, d = 0.55, filled = true } = opts;
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g);
  for (const dx of [-w / 2, w / 2]) box(g, 'shelf side', dx, h / 2, 0, 0.06, h, d, steel());
  for (let i = 0; i < 4; i++) box(g, 'shelf', 0, 0.28 + i * 0.62, 0, w, 0.05, d, steel());
  if (filled) {
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
      if ((i + j) % 3 === 0) continue;
      const bw = 0.42 + ((i * 7 + j * 3) % 4) * 0.05;
      box(g, 'archive box', -w / 2 + 0.32 + j * 0.62, 0.56 + i * 0.62, 0, bw, 0.4, d * 0.85,
        mat('archive box', 0x8a7b5d, 0.95));
    }
  }
  reg(parent, x, z, w, d, ry);
  return g;
}

export function hospitalBed(parent, x, z, ry = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g);
  const frame = steel();
  for (const dx of [-0.48, 0.48]) {
    box(g, 'bed rail', dx, 0.62, 0, 0.05, 0.08, 2.05, frame);
    for (const dz of [-1.0, 1.0]) box(g, 'bed leg', dx, 0.28, dz, 0.06, 0.56, 0.06, frame);
    box(g, 'headboard', dx, 0.95, -1.02, 0.06, 0.72, 0.06, frame);
  }
  for (const dz of [-1.0, 1.0]) box(g, 'end bar', 0, 0.62, dz, 1.0, 0.08, 0.05, frame);
  box(g, 'mattress', 0, 0.72, 0, 0.92, 0.18, 1.95, mat('mattress', 0x7d7d6c, 0.98));
  box(g, 'pillow', 0, 0.84, -0.72, 0.55, 0.1, 0.32, mat('pillow', 0x9a9784, 0.98));
  box(g, 'sheet', 0, 0.83, 0.35, 0.9, 0.035, 1.15, mat('sheet', 0x8d9081, 0.98));
  for (const dz of [-0.3, 0.25, 0.75]) box(g, 'restraint', 0, 0.86, dz, 0.94, 0.04, 0.09, mat('restraint', 0x2a2520, 0.95));
  for (const dx of [-0.5, 0.5]) for (const dz of [-0.85, 0.85])
    sphere(g, 'bed wheel', dx, 0.07, dz, 0.07, mat('rubber', 0x111414, 0.95));
  reg(parent, x, z, 1.05, 2.15, ry);
  return g;
}

export function ivStand(parent, x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
  cylinder(g, 'iv pole', 0, 1.0, 0, 0.025, 0.025, 2.0, steel(), 8);
  cylinder(g, 'iv base', 0, 0.03, 0, 0.26, 0.3, 0.05, steel(), 12);
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * Math.PI * 2;
    box(g, 'iv foot', Math.cos(a) * 0.17, 0.05, Math.sin(a) * 0.17, 0.3, 0.03, 0.04, steel()).rotation.y = -a;
  }
  box(g, 'iv bag', 0.12, 1.62, 0, 0.18, 0.34, 0.09,
    mat('iv fluid', 0xa8b49b, 0.4, { transparent: true, opacity: 0.4, emissive: 0x26301f, emissiveIntensity: 0.2 }));
  box(g, 'iv hook', 0, 1.95, 0, 0.22, 0.03, 0.03, steel());
  return g;
}

export function privacyCurtain(parent, x, z, ry = 0, w = 2.4) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g);
  cylinder(g, 'curtain rail', 0, 2.95, 0, 0.02, 0.02, w, steel(), 6).rotation.z = Math.PI / 2;
  for (let i = 0; i < 4; i++) {
    box(g, 'curtain panel', -w / 2 + 0.35 + i * 0.55, 2.0, 0, 0.5, 1.85, 0.035,
      mat('curtain', 0x6b7268, 0.98), { cast: false });
  }
  return g;
}

export function gurney(parent, x, z, ry = 0, opts = {}) {
  const { bag = true } = opts;
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g);
  const frame = steel();
  box(g, 'gurney frame', 0, 0.72, 0, 0.92, 0.06, 2.0, frame);
  box(g, 'gurney mattress', 0, 0.79, 0, 0.8, 0.1, 1.85, mat('gurney pad', 0x3b4741, 0.95));
  for (const dx of [-0.42, 0.42]) {
    box(g, 'gurney rail', dx, 0.82, 0, 0.04, 0.06, 1.9, frame);
    for (const dz of [-0.85, 0.85]) {
      box(g, 'gurney leg', dx, 0.4, dz, 0.05, 0.64, 0.05, frame);
      sphere(g, 'gurney wheel', dx, 0.07, dz, 0.07, mat('rubber', 0x111414, 0.95));
    }
  }
  if (bag) {
    const body = mat('body bag', 0x27322d, 0.9);
    box(g, 'body bag', 0, 0.9, 0, 0.6, 0.18, 1.55, body);
    sphere(g, 'body head', 0, 0.92, -0.82, 0.21, body, 1, 0.7, 1.1);
    box(g, 'zipper', 0.03, 1.0, 0, 0.02, 0.015, 1.45, mat('zipper', 0x8d948c, 0.5, { metalness: 0.5 }));
  }
  reg(parent, x, z, 0.95, 2.05, ry);
  return g;
}

export function autopsyTable(parent, x, z, ry = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g);
  const stainless = mat('stainless', 0x6a716d, 0.32, { metalness: 0.65 });
  box(g, 'autopsy top', 0, 0.86, 0, 0.95, 0.08, 2.35, stainless);
  box(g, 'autopsy rim', 0, 0.92, 0, 1.02, 0.04, 2.42, stainless);
  cylinder(g, 'autopsy pedestal', 0, 0.42, 0, 0.35, 0.45, 0.82, stainless, 12);
  box(g, 'drain', 0.25, 0.91, 0.9, 0.12, 0.02, 0.12, mat('drain', 0x232824, 0.4, { metalness: 0.6 }));
  box(g, 'body sheet', 0, 0.98, 0.05, 0.72, 0.16, 1.65, mat('autopsy sheet', 0x9c9988, 0.97));
  sphere(g, 'sheet head', 0, 1.02, -0.72, 0.2, mat('autopsy sheet', 0x9c9988, 0.97), 1, 0.7, 1.1);
  reg(parent, x, z, 1.05, 2.4, ry);
  return g;
}

export function labBench(parent, x, z, ry = 0, opts = {}) {
  const { w = 3.4, d = 1.05, sink = true } = opts;
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g);
  const stainless = mat('stainless', 0x6a716d, 0.32, { metalness: 0.65 });
  box(g, 'bench top', 0, 0.92, 0, w, 0.07, d, stainless);
  box(g, 'bench cabinet', 0, 0.45, 0, w - 0.1, 0.86, d - 0.12, mat('bench cabinet', 0x4d544e, 0.8));
  for (const dx of [-w / 3, 0, w / 3]) box(g, 'bench door', dx, 0.45, d / 2 - 0.03, w / 3 - 0.12, 0.68, 0.03, mat('bench door', 0x555c55, 0.8));
  if (sink) {
    box(g, 'sink', -w / 2 + 0.55, 0.9, 0, 0.5, 0.12, 0.42, mat('sink', 0x878f89, 0.25, { metalness: 0.7 }));
    cylinder(g, 'faucet', -w / 2 + 0.35, 1.1, -0.12, 0.025, 0.025, 0.34, stainless, 8);
    box(g, 'faucet arm', -w / 2 + 0.45, 1.27, -0.05, 0.2, 0.03, 0.03, stainless);
  }
  for (let i = 0; i < 3; i++) {
    cylinder(g, 'beaker', -0.4 + i * 0.45, 1.03, 0.1, 0.075, 0.065, 0.22,
      mat('lab glass', 0xa9c0b3, 0.15, { transparent: true, opacity: 0.35 }), 10);
    cylinder(g, 'beaker fluid', -0.4 + i * 0.45, 1.0, 0.1, 0.065, 0.06, 0.14,
      mat('beaker fluid', 0x5f8468, 0.3, { emissive: 0x2a4a34, emissiveIntensity: 0.4 }), 10);
  }
  box(g, 'microscope base', 0.95, 0.98, 0, 0.18, 0.06, 0.24, mat('microscope', 0x2d3431, 0.5, { metalness: 0.4 }));
  cylinder(g, 'microscope arm', 0.95, 1.16, 0.05, 0.035, 0.045, 0.32, mat('microscope', 0x2d3431, 0.5, { metalness: 0.4 }), 8);
  box(g, 'microscope lens', 0.95, 1.04, -0.09, 0.1, 0.16, 0.1, steel());
  reg(parent, x, z, w, d, ry);
  return g;
}

export function fumeHood(parent, x, z, ry = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g);
  box(g, 'hood body', 0, 1.25, -0.15, 1.9, 2.4, 0.85, mat('hood body', 0x50574f, 0.8));
  box(g, 'hood interior', 0, 1.3, 0.24, 1.6, 1.7, 0.5, mat('hood interior', 0x2b322d, 0.95));
  box(g, 'hood glass', 0, 1.45, 0.44, 1.55, 1.35, 0.03,
    mat('hood glass', 0x8fa89b, 0.15, { transparent: true, opacity: 0.22, metalness: 0.2 }), { cast: false });
  box(g, 'hood worktop', 0, 0.55, 0.18, 1.7, 0.06, 0.55, mat('stainless', 0x6a716d, 0.32, { metalness: 0.65 }));
  cylinder(g, 'hood duct', 0, 2.75, -0.15, 0.18, 0.18, 1.1, mat('duct', 0x3e443f, 0.6), 8);
  box(g, 'hood sash', 0, 1.35, 0.48, 1.5, 0.06, 0.04, steel());
  reg(parent, x, z, 1.95, 0.95, ry);
  return g;
}

export function specimenTank(parent, x, z, opts = {}) {
  const { r = 0.42, h = 1.6 } = opts;
  const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
  const stainless = mat('stainless', 0x6a716d, 0.32, { metalness: 0.65 });
  cylinder(g, 'tank base', 0, 0.18, 0, r + 0.1, r + 0.14, 0.36, stainless, 16);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 18, 1, true),
    mat('specimen glass', 0x7ea08c, 0.15, { transparent: true, opacity: 0.22, metalness: 0.2, side: THREE.DoubleSide }));
  glass.position.set(0, h / 2 + 0.34, 0); glass.name = 'specimen glass'; g.add(glass);
  cylinder(g, 'tank fluid', 0, h / 2 + 0.32, 0, r - 0.05, r - 0.05, h - 0.12,
    mat('tank fluid', 0x50705f, 0.3, { transparent: true, opacity: 0.28, emissive: 0x1c3326, emissiveIntensity: 0.5 }), 16);
  sphere(g, 'specimen mass', 0, h / 2 + 0.3, 0, r * 0.5,
    mat('specimen mass', 0x3f4a3d, 0.95, { emissive: 0x142016, emissiveIntensity: 0.4 }), 0.8, 1.7, 0.8);
  cylinder(g, 'tank lid', 0, h + 0.42, 0, r + 0.1, r + 0.08, 0.16, stainless, 16);
  sphere(g, 'tank bubble', r * 0.3, h * 0.4, 0.1, 0.025, mat('bubble', 0xcfe0d4, 0.2, { emissive: 0x7fa08a, emissiveIntensity: 0.8 }));
  reg(parent, x, z, r * 2.2, r * 2.2);
  return g;
}

export function consoleDesk(parent, x, z, ry = 0, opts = {}) {
  const { w = 5.0, screens = 4 } = opts;
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g);
  box(g, 'console top', 0, 0.82, 0, w, 0.1, 1.0, mat('console', 0x353c37, 0.8));
  box(g, 'console body', 0, 0.42, 0.05, w - 0.2, 0.78, 0.85, mat('console body', 0x2c322e, 0.85));
  for (let i = 0; i < screens; i++) {
    const mx = -w / 2 + 0.75 + i * (w - 1.5) / Math.max(1, screens - 1);
    box(g, 'console monitor', mx, 1.28, -0.16, 0.72, 0.52, 0.1, mat('monitor shell', 0x262a27, 0.7));
    box(g, 'console screen', mx, 1.28, -0.22, 0.62, 0.42, 0.02,
      mat('console glow', 0x7c9c86, 0.3, { emissive: 0x466f58, emissiveIntensity: 0.6 }));
    box(g, 'console stand', mx, 0.92, -0.1, 0.12, 0.2, 0.12, steel());
  }
  box(g, 'keyboard', 0, 0.9, 0.23, 1.0, 0.04, 0.32, mat('keyboard', 0x242925, 0.8));
  reg(parent, x, z, w, 1.05, ry);
  return g;
}

export function generator(parent, x, z, ry = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g);
  box(g, 'generator block', 0, 1.1, 0, 3.3, 2.2, 1.7, mat('generator', 0x424a44, 0.8));
  cylinder(g, 'generator drum', 0, 1.55, -1.0, 0.55, 0.55, 1.9, mat('generator drum', 0x363d38, 0.6, { metalness: 0.3 }), 16).rotation.z = Math.PI / 2;
  for (let i = 0; i < 6; i++) box(g, 'generator vent', -1.2 + i * 0.48, 1.15, 0.87, 0.3, 1.1, 0.03, mat('vent', 0x252b27, 0.9));
  box(g, 'generator panel', 0.9, 1.45, 0.88, 0.75, 0.75, 0.04, mat('panel', 0x59635b, 0.7));
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * Math.PI * 2;
    box(g, 'panel button', 0.7 + Math.cos(a) * 0.18, 1.55 + Math.sin(a) * 0.15, 0.92, 0.06, 0.06, 0.02,
      mat('button', i === 0 ? 0x9b3a2e : 0x7e8b74, 0.5, i === 0 ? { emissive: 0x5e120a, emissiveIntensity: 0.8 } : {}));
  }
  box(g, 'warning stripe', 0, 0.16, 0.86, 3.1, 0.2, 0.03, mat('hazard', 0x9b7a2e, 0.85));
  reg(parent, x, z, 3.4, 2.2, ry);
  return g;
}

export function boiler(parent, x, z, ry = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g);
  const tank = cylinder(g, 'boiler tank', 0, 1.55, 0, 1.15, 1.15, 3.1, mat('boiler', 0x4a443c, 0.75), 18);
  tank.rotation.x = Math.PI / 2;
  for (const dz of [-1.4, 0, 1.4]) cylinder(g, 'boiler band', 0, 1.55, dz, 1.19, 1.19, 0.12, mat('boiler band', 0x39342e, 0.6), 18).rotation.x = Math.PI / 2;
  box(g, 'firebox', 0, 0.55, 0.35, 1.5, 1.1, 1.1, mat('firebox', 0x37322c, 0.9));
  box(g, 'furnace glow', 0, 0.5, 0.92, 0.9, 0.55, 0.03,
    mat('furnace glow', 0xff8a3d, 0.4, { emissive: 0xff5a12, emissiveIntensity: 2.2 }), { cast: false });
  box(g, 'furnace grate', 0, 0.5, 0.95, 0.95, 0.05, 0.03, mat('grate', 0x221e1a, 0.9));
  cylinder(g, 'boiler stack', 1.7, 2.2, -1.2, 0.22, 0.22, 2.4, mat('pipe', 0x333a36, 0.5, { metalness: 0.5 }), 10);
  cylinder(g, 'pressure gauge', 1.15, 1.7, 0.55, 0.16, 0.16, 0.06, mat('gauge', 0x9a9279, 0.5), 12).rotation.x = Math.PI / 2;
  box(g, 'coal pile', -1.3, 0.32, 0.6, 1.1, 0.62, 1.0, mat('coal', 0x1c1c1b, 0.98));
  reg(parent, x, z, 2.5, 3.3, ry);
  return g;
}

export function crate(parent, x, z, s = 1.0, ry = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g);
  const woodMat = mat('crate wood', 0x6d5b40, 0.95);
  box(g, 'crate', 0, s / 2, 0, s, s, s, woodMat);
  for (const dz of [-s / 2 - 0.01, s / 2 + 0.01]) {
    box(g, 'crate brace', 0, s / 2, dz, s + 0.02, 0.1, 0.03, mat('crate brace', 0x4c402e, 0.95));
    box(g, 'crate cross', 0, s / 2, dz, 0.1, s + 0.02, 0.03, mat('crate brace', 0x4c402e, 0.95));
  }
  reg(parent, x, z, s, s, ry);
  return g;
}

export function barrel(parent, x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
  cylinder(g, 'barrel', 0, 0.55, 0, 0.34, 0.34, 1.1, mat('barrel', 0x3f4a3f, 0.75, { metalness: 0.3 }), 14);
  for (const y of [0.25, 0.55, 0.85]) cylinder(g, 'barrel ring', 0, y, 0, 0.36, 0.36, 0.05, mat('barrel ring', 0x2a3029, 0.6), 14);
  reg(parent, x, z, 0.72, 0.72);
  return g;
}

export function plant(parent, x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
  cylinder(g, 'pot', 0, 0.28, 0, 0.22, 0.17, 0.56, mat('pot', 0x6b4b37, 0.9), 12);
  cylinder(g, 'stem', 0, 0.9, 0, 0.025, 0.04, 1.2, mat('bark', 0x3a3022, 0.95), 6);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2;
    const leaf = cone(g, 'leaf', Math.cos(a) * 0.18, 1.05 + (i % 3) * 0.22, Math.sin(a) * 0.18, 0.18, 0.7, mat('dead leaf', 0x2c3726, 0.95), 6);
    leaf.rotation.z = Math.cos(a) * 0.5; leaf.rotation.x = Math.sin(a) * 0.5;
  }
  reg(parent, x, z, 0.5, 0.5);
  return g;
}

export function wheelchair(parent, x, z, ry = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g);
  box(g, 'wheelchair seat', 0, 0.52, 0, 0.48, 0.06, 0.48, mat('chair fabric', 0x333834, 0.95));
  box(g, 'wheelchair back', 0, 0.82, 0.22, 0.46, 0.55, 0.05, mat('chair fabric', 0x333834, 0.95));
  for (const dx of [-0.28, 0.28]) {
    const wheel = cylinder(g, 'wheelchair wheel', dx, 0.33, 0.06, 0.33, 0.33, 0.04, mat('rubber', 0x111414, 0.95), 16);
    wheel.rotation.z = Math.PI / 2;
    box(g, 'chair arm', dx, 0.7, 0, 0.04, 0.04, 0.42, steel());
    box(g, 'chair leg', dx, 0.25, 0.2, 0.04, 0.5, 0.04, steel());
  }
  box(g, 'footrest', 0, 0.16, -0.35, 0.44, 0.04, 0.2, steel());
  reg(parent, x, z, 0.7, 0.85, ry);
  return g;
}

/* ---- signage ---- */
const signMats = new Map();
export function signMaterial(text, sub = '', color = '#d0c6a8') {
  const key = `${text}|${sub}|${color}`;
  if (signMats.has(key)) return signMats.get(key);
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#171b18'; g.fillRect(0, 0, 512, 128);
  g.strokeStyle = '#61695e'; g.lineWidth = 4; g.strokeRect(7, 7, 498, 114);
  g.textAlign = 'center'; g.fillStyle = color;
  g.font = '600 44px "DM Mono", monospace';
  g.fillText(text, 256, sub ? 58 : 78);
  if (sub) { g.fillStyle = '#85907f'; g.font = '22px "DM Mono", monospace'; g.fillText(sub, 256, 99); }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false });
  signMats.set(key, m);
  return m;
}

export function addSign(parent, text, sub, x, y, z, ry = 0, scale = 1) {
  const w = 1.8 * scale, h = w / 4;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), signMaterial(text, sub));
  mesh.position.set(x, y, z); mesh.rotation.y = ry; mesh.name = 'sign: ' + text;
  parent.add(mesh);
  return mesh;
}
