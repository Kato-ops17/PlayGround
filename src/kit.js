import * as THREE from 'three';

/* Shared materials, geometry caches and tiny world-building helpers. */

export const mats = new Map();

export function mat(name, color, roughness = 0.85, extra = {}) {
  let m = mats.get(name);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness, ...extra });
    mats.set(name, m);
  }
  return m;
}

const geoCache = new Map();
function cached(key, make) {
  let g = geoCache.get(key);
  if (!g) { g = make(); geoCache.set(key, g); }
  return g;
}

export function box(parent, name, x, y, z, sx, sy, sz, material, opts = {}) {
  const key = `b${sx.toFixed(4)}|${sy.toFixed(4)}|${sz.toFixed(4)}`;
  const m = new THREE.Mesh(cached(key, () => new THREE.BoxGeometry(sx, sy, sz)), material);
  m.name = name;
  m.position.set(x, y, z);
  m.castShadow = opts.cast !== undefined ? opts.cast : true;
  m.receiveShadow = opts.receive !== undefined ? opts.receive : true;
  if (opts.ry) m.rotation.y = opts.ry;
  if (opts.rx) m.rotation.x = opts.rx;
  if (opts.rz) m.rotation.z = opts.rz;
  parent.add(m);
  return m;
}

export function sphere(parent, name, x, y, z, r, material, sx = 1, sy = 1, sz = 1) {
  const key = `s${r.toFixed(4)}`;
  const m = new THREE.Mesh(cached(key, () => new THREE.SphereGeometry(r, 16, 12)), material);
  m.name = name;
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.castShadow = true;
  parent.add(m);
  return m;
}

export function cylinder(parent, name, x, y, z, r1, r2, h, material, segments = 12, open = false) {
  const key = `c${r1.toFixed(4)}|${r2.toFixed(4)}|${h.toFixed(4)}|${segments}|${open ? 1 : 0}`;
  const m = new THREE.Mesh(cached(key, () => new THREE.CylinderGeometry(r1, r2, h, segments, 1, open)), material);
  m.name = name;
  m.position.set(x, y, z);
  m.castShadow = !open;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

export function cone(parent, name, x, y, z, r, h, material, segments = 8) {
  const key = `k${r.toFixed(4)}|${h.toFixed(4)}|${segments}`;
  const m = new THREE.Mesh(cached(key, () => new THREE.ConeGeometry(r, h, segments)), material);
  m.name = name;
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

export function light(parent, color, intensity, x, y, z, distance = 0) {
  const l = new THREE.PointLight(color, intensity, distance, 2);
  l.position.set(x, y, z);
  parent.add(l);
  return l;
}

export const interactables = [];

export function addInteract(mesh, label, action, area) {
  mesh.userData.label = label;
  mesh.userData.action = action;
  mesh.userData.area = area;
  interactables.push(mesh);
  return mesh;
}

/* Solid colliders used by the sublevel facility. */
export const solids = { room: [], lot: [], lab: [] };

export function addSolid(area, x, z, hx, hz, opts = {}) {
  const c = { x, z, hx, hz, disabled: false, ...opts };
  solids[area].push(c);
  return c;
}

export function blocked(area, x, z, r = 0.3) {
  const list = solids[area];
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if (c.disabled) continue;
    if (Math.abs(x - c.x) < c.hx + r && Math.abs(z - c.z) < c.hz + r) return true;
  }
  return false;
}

export function clearInteractables() {
  interactables.length = 0;
}
