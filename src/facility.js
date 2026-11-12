import * as THREE from 'three';
import { mat, box, sphere, cylinder, cone, addInteract, addSolid, solids } from './kit.js';
import * as P from './props.js';
import { buildCreature, animateCreature } from './creature.js';

/* ------------------------------------------------------------------ *
 *  SUBLEVEL 02 — a real facility: wide halls, enclosed rooms with
 *  doorways and headers, furniture, signage and a creature.
 * ------------------------------------------------------------------ */
export function buildFacility(scene, { onEvidence, onCaught }) {
  const group = new THREE.Group();
  group.name = 'Sublevel laboratory';
  group.visible = false;
  scene.add(group);

  const F = { minX: -30, maxX: 30, minZ: -40, maxZ: 14, h: 4.4 };
  const wallMat = mat('facility wall', 0x7a8177, 0.96);
  const darkWall = mat('facility wall dark', 0x596157, 0.95);
  const concrete = mat('facility concrete', 0x84877a, 0.97);
  const metal = mat('facility steel', 0x3d4540, 0.5, { metalness: 0.4 });
  const floorMat = mat('lab floor', 0x59615a, 0.95);
  const ceilingMat = mat('lab ceiling', 0x525a4f, 0.96);

  const lights = [];
  const flickerLights = [];
  group.add(new THREE.AmbientLight(0x85937f, 1.35));

  /* ---------------- structural helpers ---------------- */
  function wall(x1, z1, x2, z2, opts = {}) {
    const h = opts.h ?? F.h, th = opts.th ?? 0.3, m = opts.m ?? wallMat;
    const alongX = Math.abs(z2 - z1) < 0.001;
    const a = alongX ? Math.min(x1, x2) : Math.min(z1, z2);
    const b = alongX ? Math.max(x1, x2) : Math.max(z1, z2);
    const doors = (opts.doors || []).slice().sort((p, q) => p.at - q.at);
    const segment = (s, e) => {
      const len = e - s;
      if (len <= 0.03) return;
      if (alongX) {
        box(group, 'facility wall', (s + e) / 2, h / 2, z1, len, h, th, m);
        addSolid('lab', (s + e) / 2, z1, len / 2, th / 2);
      } else {
        box(group, 'facility wall', x1, h / 2, (s + e) / 2, th, h, len, m);
        addSolid('lab', x1, (s + e) / 2, th / 2, len / 2);
      }
    };
    const header = (s, e, dh) => {
      if (dh >= h - 0.05) return;
      if (alongX) box(group, 'door header', (s + e) / 2, (dh + h) / 2, z1, e - s, h - dh, th, m);
      else box(group, 'door header', x1, (dh + h) / 2, (s + e) / 2, th, h - dh, e - s, m);
    };
    let cursor = a;
    for (const d of doors) {
      const ds = d.at - d.w / 2, de = d.at + d.w / 2, dh = d.h ?? 2.65;
      segment(cursor, ds);
      header(ds, de, dh);

      // metal door frame
      if (alongX) {
        box(group, 'door jamb', ds, dh / 2, z1, 0.09, dh, th + 0.08, metal);
        box(group, 'door jamb', de, dh / 2, z1, 0.09, dh, th + 0.08, metal);
        box(group, 'door lintel', (ds + de) / 2, dh + 0.045, z1, de - ds + 0.18, 0.09, th + 0.08, metal);
        box(group, 'threshold', (ds + de) / 2, 0.012, z1, de - ds, 0.024, th + 0.08,
          mat('threshold', 0x2a2e2a, 0.95), { cast: false });
      } else {
        box(group, 'door jamb', x1, dh / 2, ds, th + 0.08, dh, 0.09, metal);
        box(group, 'door jamb', x1, dh / 2, de, th + 0.08, dh, 0.09, metal);
        box(group, 'door lintel', x1, dh + 0.045, (ds + de) / 2, th + 0.08, 0.09, de - ds + 0.18, metal);
        box(group, 'threshold', x1, 0.012, (ds + de) / 2, th + 0.08, 0.024, de - ds,
          mat('threshold', 0x2a2e2a, 0.95), { cast: false });
      }

      if (d.glass) {
        const paneMat = mat('observation glass', 0x9ab9a7, 0.1,
          { transparent: true, opacity: 0.17, metalness: 0.35, side: THREE.DoubleSide });
        const pane = new THREE.Mesh(new THREE.PlaneGeometry(de - ds - 0.12, dh - 0.12), paneMat);
        if (alongX) { pane.position.set((ds + de) / 2, dh / 2 + 0.02, z1 + 0.02); }
        else { pane.position.set(x1 + 0.02, dh / 2 + 0.02, (ds + de) / 2); pane.rotation.y = Math.PI / 2; }
        group.add(pane);
        if (alongX) addSolid('lab', (ds + de) / 2, z1, (de - ds) / 2, th / 2 + 0.05);
        else addSolid('lab', x1, (ds + de) / 2, th / 2 + 0.05, (de - ds) / 2);
      } else if (d.panel !== false) {
        const pw = Math.min(0.85, d.w * 0.38);
        const doorMat = mat('sliding door', 0x3e4540, 0.62, { metalness: 0.25 });
        if (alongX) {
          box(group, 'sliding door', ds + pw / 2 + 0.03, 1.29, z1, pw, 2.58, 0.07, doorMat);
        } else {
          box(group, 'sliding door', x1, 1.29, ds + pw / 2 + 0.03, 0.07, 2.58, pw, doorMat);
        }
      }
      cursor = de;
    }
    segment(cursor, b);
  }

  function floorPatch(name, x1, z1, x2, z2, color, rough = 0.95) {
    const lifted = new THREE.Color(color).multiplyScalar(1.38).getHex();
    box(group, name, (x1 + x2) / 2, 0.012, (z1 + z2) / 2, x2 - x1, 0.024, z2 - z1,
      mat(name, lifted, rough), { cast: false });
  }

  function ceilingLight(x, z, color, intensity, flicker = false, dist = 12) {
    box(group, 'light housing', x, 4.36, z, 2.1, 0.1, 0.6, mat('light housing', 0x333a35, 0.7));
    const tube = box(group, 'light tube', x, 4.3, z, 1.85, 0.045, 0.3,
      mat('tube' + color + intensity, color, 0.3, { emissive: color, emissiveIntensity: 1.5 }), { cast: false });
    const l = new THREE.PointLight(color, intensity * 2.2, dist, 2);
    l.position.set(x, 4.02, z);
    group.add(l);
    lights.push(l);
    const entry = { l, tube, flicker, base: intensity * 2.2, seed: Math.random() * 10 };
    if (flicker) flickerLights.push(entry);
    return entry;
  }

  function pipeRun(x, z, len, axis, y, r = 0.09, color = 0x38413b, name = 'pipe') {
    const m = cylinder(group, name, x, y, z, r, r, len, mat(name + color, color, 0.5, { metalness: 0.5 }), 8);
    if (axis === 'z') m.rotation.x = Math.PI / 2; else m.rotation.z = Math.PI / 2;
    return m;
  }

  function bloodStain(x, z, sx = 1, sz = 1, ry = 0) {
    const m = box(group, 'blood stain', x, 0.026, z, sx, 0.012, sz,
      mat('blood stain', 0x3a1c18, 0.95), { cast: false });
    m.rotation.y = ry;
    return m;
  }

  /* ---------------- shell ---------------- */
  box(group, 'sublevel floor', 0, -0.15, -13, 60, 0.3, 54, floorMat);
  box(group, 'sublevel ceiling', 0, 4.55, -13, 60, 0.3, 54, ceilingMat);

  wall(-30, 14, 30, 14, { m: concrete, doors: [{ at: 0, w: 3.6, h: 3.15 }] });
  wall(-30, -40, 30, -40, { m: darkWall });
  wall(-30, -40, -30, 14, { m: concrete });
  wall(30, -40, 30, 14, { m: concrete });

  // north row, N corridor, mid blocks, S corridor, deep rooms
  wall(-30, 10.5, 30, 10.5, { doors: [{ at: -23, w: 2.4 }, { at: -11, w: 2.4 }, { at: 0, w: 3.4, h: 3.0 }, { at: 11, w: 2.4 }, { at: 23, w: 2.4 }] });
  wall(-17, 10.5, -17, 14, {});
  wall(17, 10.5, 17, 14, {});
  wall(-4, 10.5, -4, 14, {});
  wall(4, 10.5, 4, 14, {});

  wall(-30, 5, 30, 5, { doors: [{ at: -23, w: 2.4 }, { at: -10.5, w: 2.4 }, { at: 0, w: 7.4, h: 3.5 }, { at: 10.5, w: 2.4 }, { at: 23, w: 2.4 }] });
  wall(-17, -12, -17, 5, { doors: [{ at: -3.5, w: 2.4 }] });
  wall(17, -12, 17, 5, { doors: [{ at: -3.5, w: 2.6, glass: true }] });

  wall(-30, -12, 30, -12, { doors: [{ at: -23, w: 2.4 }, { at: -10.5, w: 2.4 }, { at: 0, w: 7.4, h: 3.5 }, { at: 10.5, w: 2.4 }, { at: 23, w: 2.4 }] });
  wall(-4, -34, -4, 5, { doors: [{ at: -28, w: 2.4 }, { at: -14.5, w: 5.2, h: 3.5 }, { at: -2, w: 2.4 }] });
  wall(4, -34, 4, 5, { doors: [{ at: -28, w: 2.4 }, { at: -14.5, w: 5.2, h: 3.5 }, { at: -2, w: 2.4 }] });

  wall(-30, -17, 30, -17, { doors: [{ at: -23, w: 2.4 }, { at: -10.5, w: 2.4 }, { at: 0, w: 7.4, h: 3.5 }, { at: 10.5, w: 2.4 }, { at: 23, w: 2.4 }] });
  wall(-17, -34, -17, -17, { doors: [{ at: -25.5, w: 2.4 }] });
  wall(17, -34, 17, -17, { doors: [{ at: -25.5, w: 2.4 }] });
  wall(-30, -34, 30, -34, { m: darkWall, doors: [{ at: 0, w: 6, h: 3.6 }] });
  wall(-12, -40, -12, -34, { m: darkWall });
  wall(12, -40, 12, -34, { m: darkWall });

  /* ---------------- floors ---------------- */
  floorPatch('vestibule floor', -4, 10.5, 4, 14, 0x484b42);
  floorPatch('admin floor', -30, 10.5, -4, 14, 0x4a4439, 0.98);
  floorPatch('security floor', 4, 10.5, 30, 14, 0x41463d);
  floorPatch('north hall floor', -30, 5, 30, 10.5, 0x3f4540);
  floorPatch('west mid floor', -30, -12, -4, 5, 0x434e46);
  floorPatch('east mid floor', 4, -12, 30, 5, 0x474d44);
  floorPatch('main hall floor', -4, -34, 4, 5, 0x3b413c);
  floorPatch('south hall floor', -30, -17, 30, -12, 0x3e443f);
  floorPatch('south rooms floor', -30, -34, 30, -17, 0x3e4038);
  floorPatch('deep hall floor', -4, -34, 4, -17, 0x383e38);
  floorPatch('chamber floor', -12, -40, 12, -34, 0x30362f);

  // tile seams + drains
  for (let z = -33; z < 13; z += 2) box(group, 'floor seam', 0, 0.026, z, 7.5, 0.012, 0.045, mat('floor seam', 0x2c312c, 0.95), { cast: false });
  for (let x = -28; x < 29; x += 2) box(group, 'hall seam', x, 0.026, 7.75, 0.045, 0.012, 5.3, mat('hall seam', 0x2c312c, 0.95), { cast: false });
  for (const [x, z] of [[0, 1], [0, -8], [0, -23], [-9, 7.7], [9, 7.7], [0, -14.5]]) {
    box(group, 'floor drain', x, 0.03, z, 0.55, 0.02, 0.55, mat('drain grate', 0x232824, 0.6, { metalness: 0.5 }), { cast: false });
    for (let i = 0; i < 4; i++) box(group, 'drain slot', x - 0.2 + i * 0.13, 0.042, z, 0.05, 0.01, 0.45, mat('drain slot', 0x101310, 0.8), { cast: false });
  }

  /* ---------------- ceiling lights ---------------- */
  ceilingLight(0, 12.3, 0xffc789, 15, false, 10);
  ceilingLight(-20, 7.7, 0xbfd4c2, 11, false, 12);
  ceilingLight(-7, 7.7, 0xbfd4c2, 11, false, 12);
  ceilingLight(7, 7.7, 0xbfd4c2, 11, true, 12);
  ceilingLight(20, 7.7, 0xbfd4c2, 11, false, 12);
  ceilingLight(0, 1.5, 0xc3d6c6, 12, false, 12);
  ceilingLight(0, -9, 0xc3d6c6, 12, true, 12);
  ceilingLight(0, -20, 0xc3d6c6, 12, false, 12);
  ceilingLight(0, -30, 0xff6a45, 13, true, 12);
  ceilingLight(-20, -14.5, 0xbfd4c2, 10, false, 12);
  ceilingLight(8, -14.5, 0xbfd4c2, 10, true, 12);
  ceilingLight(20, -14.5, 0xbfd4c2, 10, false, 12);

  ceilingLight(-23.5, 12.2, 0xffc485, 13, false, 10);
  ceilingLight(-10.5, 12.2, 0xffc485, 12, true, 10);
  ceilingLight(10.5, 12.2, 0xffc485, 14, false, 10);
  ceilingLight(23.5, 12.2, 0xffc485, 9, false, 10);
  ceilingLight(-23.5, -3.5, 0xa8c9ad, 13, false, 11);
  ceilingLight(-10.5, -3, 0x9fc6d0, 12, true, 11);
  ceilingLight(10.5, -3, 0xd2e0d0, 15, false, 12);
  ceilingLight(23.5, -3, 0xffb877, 13, false, 11);
  ceilingLight(-23.5, -25.5, 0xffb16b, 9, true, 11);
  ceilingLight(-10.5, -25.5, 0xff7a52, 12, false, 11);
  ceilingLight(10.5, -25.5, 0xd8e3d5, 16, false, 12);
  ceilingLight(23.5, -25.5, 0xff904d, 13, true, 12);
  const chamberLamp = ceilingLight(0, -36.4, 0xff4f35, 18, false, 13);

  // dead fixtures keep the halls visually continuous
  for (const [x, z] of [[-13.5, 7.7], [13.5, 7.7], [0, -4], [0, -25], [-13.5, -14.5], [13.5, -14.5]]) {
    box(group, 'dead light housing', x, 4.36, z, 2.1, 0.1, 0.6, mat('light housing', 0x333a35, 0.7));
    box(group, 'dead tube', x, 4.3, z, 1.85, 0.045, 0.3, mat('dead tube', 0x5b655c, 0.7, { emissive: 0x1c241e, emissiveIntensity: 0.3 }), { cast: false });
  }

  /* ---------------- pipes / ceiling detail ---------------- */
  pipeRun(-2.7, -13, 52, 'z', 4.18, 0.1, 0x3a423c);
  pipeRun(-2.7, -13, 52, 'z', 4.02, 0.055, 0x4c554d);
  pipeRun(2.65, -13, 52, 'z', 4.14, 0.06, 0x444d46);
  pipeRun(0, 7.7, 58, 'x', 4.16, 0.09, 0x3a423c);
  pipeRun(0, -14.5, 58, 'x', 4.16, 0.09, 0x3a423c);
  for (let z = -32; z < 13; z += 4) box(group, 'pipe bracket', -2.7, 4.22, z, 0.3, 0.06, 0.12, metal);

  /* ---------------- signs ---------------- */
  P.addSign(group, 'SECURITY', 'NIGHT OFFICE', 11, 3.15, 10.34, Math.PI);
  P.addSign(group, 'ADMIN 01', 'RECORDS', -23, 3.15, 10.34, Math.PI);
  P.addSign(group, 'ADMIN 02', '', -11, 3.15, 10.34, Math.PI);
  P.addSign(group, 'ARCHIVE', 'PERSONNEL FILES', 23, 3.15, 10.34, Math.PI);
  P.addSign(group, 'WARD 2A', 'CONTAINMENT', -23, 3.15, 5.17, 0);
  P.addSign(group, 'MORGUE', 'COLD STORAGE', -10.5, 3.15, 5.17, 0);
  P.addSign(group, 'RESEARCH', 'LAB 04', 10.5, 3.15, 5.17, 0);
  P.addSign(group, 'OBSERVATION', 'CONTROL', 23, 3.15, 5.17, 0);
  P.addSign(group, 'WARD 2A', '', -23, 3.15, -12.17, Math.PI);
  P.addSign(group, 'MORGUE', '', -10.5, 3.15, -12.17, Math.PI);
  P.addSign(group, 'RESEARCH', '', 10.5, 3.15, -12.17, Math.PI);
  P.addSign(group, 'OBSERVATION', '', 23, 3.15, -12.17, Math.PI);
  P.addSign(group, 'STORAGE', 'SUPPLIES', -23, 3.15, -16.83, 0);
  P.addSign(group, 'GENERATOR', 'POWER', -10.5, 3.15, -16.83, 0);
  P.addSign(group, 'THEATRE', 'SURGERY', 10.5, 3.15, -16.83, 0);
  P.addSign(group, 'BOILER', 'INCINERATOR', 23, 3.15, -16.83, 0);
  P.addSign(group, 'SUBJECT 06', 'NO ENTRY', 0, 3.3, -33.82, 0, 1.2);
  P.addSign(group, 'MORGUE', '', -3.83, 3.1, -2, Math.PI / 2, 0.8);
  P.addSign(group, 'THEATRE', '', 3.83, 3.1, -28, -Math.PI / 2, 0.8);
  P.addSign(group, 'SUBLEVEL 02', 'CONTAINMENT WING', 0, 3.1, 13.68, Math.PI, 1.4);

  // corridor directions at the main intersection
  P.addSign(group, '◄ WARD · MORGUE', '', -3.82, 2.5, 6.5, Math.PI / 2, 0.75);
  P.addSign(group, 'STORAGE · BOILER ►', '', 3.82, 2.5, -19.5, -Math.PI / 2, 0.75);
  P.addSign(group, 'EXIT ▲', '', 0, 2.55, 12.01, Math.PI, 0.7);

  // grime and drag marks
  bloodStain(-1.2, -31, 1.1, 3.8, 0.2);
  bloodStain(2.4, -22.5, 0.8, 2.4, -0.3);
  bloodStain(0.6, -35.2, 1.6, 2.2, 0.1);
  bloodStain(8.4, -28.4, 1.4, 2.0, 0.6);
  bloodStain(-19.5, -11.2, 1.0, 1.6, 0.2);
  bloodStain(-8.7, 3.8, 0.9, 1.2, -0.4);
  const stainXs = [-27, -19.5, -6, 3, 8, 15, 20, 27];
  for (let i = 0; i < stainXs.length; i++) {
    const x = stainXs[i], z = i % 2 ? 5.17 : 10.33;
    box(group, 'wall stain', x, 1.2 + (i % 3) * 0.5, z, 0.8, 1.1, 0.02, mat('wall stain', 0x30362f, 0.98), { cast: false });
  }

  // fire extinguishers and wall signage in the halls
  for (const [x, z, ry] of [[-3.82, 8.6, Math.PI / 2], [3.82, -16, -Math.PI / 2], [-27.8, 5.2, 0], [27.8, -12.2, Math.PI]]) {
    cylinder(group, 'extinguisher', x, 0.65, z, 0.11, 0.11, 0.52, mat('extinguisher red', 0x8d2f22, 0.6), 12);
    box(group, 'extinguisher bracket', x, 0.9, z, 0.26, 0.06, 0.06, metal);
  }

  /* ---------------- entry blast gate ---------------- */
  const gateMat = mat('blast door', 0x3b423d, 0.55, { metalness: 0.45 });
  const gatePanels = [];
  for (const dir of [-1, 1]) {
    const pg = new THREE.Group();
    pg.position.set(dir * 0.92, 0, 13.86);
    group.add(pg);
    box(pg, 'blast door', 0, 1.55, 0, 1.82, 3.1, 0.14, gateMat);
    for (let i = 0; i < 4; i++) box(pg, 'blast rib', 0, 0.4 + i * 0.73, 0.09, 1.7, 0.06, 0.03, metal);
    box(pg, 'blast stripe', 0, 1.75, 0.1, 1.7, 0.12, 0.02, mat('hazard', 0x967430, 0.85));
    box(pg, 'blast handle', dir * -0.55, 1.1, 0.12, 0.12, 0.5, 0.06, metal);
    gatePanels.push({ g: pg, base: dir * 0.92, dir });
  }
  const gateCollider = addSolid('lab', 0, 13.86, 1.84, 0.22);
  box(group, 'gate warning', 0, 3.32, 13.68, 3.8, 0.22, 0.06, mat('hazard', 0x967430, 0.85));

  /* ---------------- evidence registry ---------------- */
  const evidenceDefs = [];
  const hitMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide });
  function registerEvidence(def) {
    def.taken = false;
    const [x, y, z] = def.pos;
    const target = box(group, 'evidence target', x, y, z, 1.05, 1.5, 1.05, hitMat, { cast: false, receive: false });
    addInteract(target, def.label, () => onEvidence(def), 'lab');
    evidenceDefs.push(def);
    return def;
  }

  /* ---------------- north offices ---------------- */
  P.officeDesk(group, -26.6, 13.05, 0, { w: 2.4, d: 1.0, monitors: 1 });
  P.officeChair(group, -26.6, 12.15, 0);
  P.officeDesk(group, -19.6, 13.05, 0, { w: 1.8, d: 0.9, monitors: 0 });
  P.officeChair(group, -19.6, 12.2, Math.PI);
  P.cabinet(group, -29.4, 12.3, 1.6, 0.55, 1.9, Math.PI / 2);
  P.plant(group, -18.1, 11.3);
  P.crate(group, -28.9, 11.1, 0.8, 0.2);
  box(group, 'paper stack', -19.2, 0.82, 13.1, 0.35, 0.3, 0.28, mat('paper', 0xd1cab3, 0.95));
  box(group, 'notice board', -24.5, 2.3, 13.84, 1.7, 1.0, 0.04, mat('cork', 0x5d4f38, 0.95), { cast: false });
  for (let i = 0; i < 4; i++) box(group, 'notice', -25.1 + (i % 2) * 0.55, 2.55 - Math.floor(i / 2) * 0.4, 13.81, 0.3, 0.24, 0.01, mat('paper', 0xd1cab3, 0.95), { cast: false });

  P.officeDesk(group, -14, 13.05, 0, { w: 2.2, d: 1.0, monitors: 1 });
  P.officeChair(group, -14, 12.15, Math.PI);
  P.cabinet(group, -5.2, 12.3, 1.4, 0.55, 1.9, Math.PI / 2);
  cylinder(group, 'water cooler', -6.4, 0.55, 13.5, 0.24, 0.24, 1.1, mat('cooler', 0x9aa196, 0.7), 12);
  cylinder(group, 'water bottle', -6.4, 1.35, 13.5, 0.2, 0.24, 0.55, mat('water bottle', 0x8fb3b0, 0.2, { transparent: true, opacity: 0.35 }), 12);
  P.plant(group, -16, 11.2);

  // security office — monitor wall and the case tape
  P.consoleDesk(group, 10.5, 13.3, 0, { w: 5.6, screens: 4 });
  P.officeChair(group, 8.2, 12.1, Math.PI);
  P.officeChair(group, 12.8, 12.1, Math.PI);
  P.cabinet(group, 16.5, 11.8, 1.6, 0.55, 1.9, Math.PI / 2);
  box(group, 'security map board', 10.5, 2.35, 13.82, 2.4, 1.15, 0.04, mat('map board', 0x2c332d, 0.9), { cast: false });
  for (let i = 0; i < 5; i++) box(group, 'map line', 9.5 + i * 0.45, 2.1 + (i % 3) * 0.16, 13.79, 0.04, 0.5, 0.01, mat('map ink', 0x8c9a82, 0.8, { emissive: 0x3f4d3b, emissiveIntensity: 0.4 }), { cast: false });
  const caseTape = box(group, 'case tape', 8.2, 0.98, 13.15, 0.58, 0.15, 0.38, mat('evidence tape', 0x373129, 0.8));
  cylinder(group, 'tape reel', 8.05, 1.08, 13.15, 0.1, 0.1, 0.03, mat('reel', 0x8a8f88, 0.35, { metalness: 0.6 }), 12);
  cylinder(group, 'tape reel', 8.37, 1.08, 13.15, 0.1, 0.1, 0.03, mat('reel', 0x8a8f88, 0.35, { metalness: 0.6 }), 12);
  box(group, 'tape label', 8.2, 1.065, 13.15, 0.24, 0.012, 0.18, mat('tape label', 0xcfc4a4, 0.95));
  registerEvidence({
    pos: [8.2, 1.3, 13.15], prop: caseTape, room: 'SECURITY', label: 'TAKE THE CASE TAPE',
    title: 'CASE TAPE / SUBJECT 06',
    body: 'RECOVERED AUDIO — 01:42 AM\n\n“...it knows when we are looking at it. Shut the glass. Shut it now—”\n\n[ IMPACT ]\n\n“Do not let it hear the broadcast.”'
  });
  box(group, 'radio', 12.7, 0.97, 13.1, 0.5, 0.22, 0.3, mat('radio', 0x343a34, 0.6));
  cylinder(group, 'radio dial', 12.55, 1.1, 13.1, 0.05, 0.05, 0.04, metal, 10);

  // archive
  P.shelfUnit(group, 20.2, 13.35, 0, { w: 2.6 });
  P.shelfUnit(group, 24.4, 13.35, 0, { w: 2.6 });
  P.shelfUnit(group, 29.3, 12.2, Math.PI / 2, { w: 2.4 });
  P.crate(group, 19.2, 11.35, 0.9, 0.1);
  P.crate(group, 27.6, 11.5, 1.1, -0.2);
  box(group, 'loose files', 22.6, 0.9, 12.0, 0.9, 0.25, 0.6, mat('paper', 0xd1cab3, 0.95));

  /* ---------------- ward ---------------- */
  for (const z of [2.6, -1.6, -5.8, -9.7]) {
    P.hospitalBed(group, -26.4, z, Math.PI / 2);
    P.ivStand(group, -24.7, z + 0.35);
    box(group, 'oxygen cylinder', -29.2, 0.55, z + 0.55, 0.28, 1.1, 0.28, mat('oxygen', 0x556b5c, 0.65), { cast: true });
    cylinder(group, 'oxygen cap', -29.2, 1.16, z + 0.55, 0.08, 0.08, 0.14, metal, 8);
  }
  P.privacyCurtain(group, -24.7, 0.5, Math.PI / 2, 5.4);
  P.privacyCurtain(group, -24.7, -7.7, Math.PI / 2, 4.6);
  P.officeDesk(group, -20.4, -10.2, 0, { w: 2.0, d: 1.0, monitors: 1 });
  P.officeChair(group, -20.4, -9.25, Math.PI);
  P.cabinet(group, -17.5, -3.2, 1.8, 0.55, 1.9, Math.PI / 2);
  P.wheelchair(group, -20.8, 4.0, 0.5);
  box(group, 'ward sink', -29.2, 0.9, -5.8, 0.9, 0.12, 0.55, mat('sink', 0x878f89, 0.25, { metalness: 0.7 }));
  cylinder(group, 'ward faucet', -29.2, 1.12, -5.9, 0.025, 0.025, 0.35, metal, 8);
  for (let i = 0; i < 3; i++) box(group, 'torn curtain', -25.9 + i * 0.7, 2.3, -11.7, 0.55, 1.9, 0.035, mat('curtain', 0x6b7268, 0.98), { cast: false });
  box(group, 'chalk board', -20.5, 2.2, 4.82, 2.0, 1.0, 0.04, mat('chalk board', 0x25302b, 0.95), { cast: false });

  /* ---------------- morgue ---------------- */
  box(group, 'morgue drawer bank', -16.45, 1.1, 0.5, 0.7, 2.2, 8.3, mat('stainless', 0x6a716d, 0.32, { metalness: 0.65 }));
  addSolid('lab', -16.45, 0.5, 0.4, 4.2);
  for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) {
    const z = -2.6 + col * 2.05;
    box(group, 'morgue drawer', -16.07, 0.55 + row * 0.66, z, 0.04, 0.56, 1.85, mat('morgue drawer', 0x59615c, 0.45, { metalness: 0.5 }));
    box(group, 'drawer handle', -16.03, 0.55 + row * 0.66, z, 0.05, 0.05, 0.4, metal);
    box(group, 'drawer tag', -16.02, 0.72 + row * 0.66, z, 0.012, 0.1, 0.16, mat('drawer tag', 0xc8c1a8, 0.9));
  }
  P.autopsyTable(group, -9.5, -5.5, 0);
  P.gurney(group, -6.2, -9.4, 0, { bag: true });
  P.officeDesk(group, -6.2, 3.7, 0, { w: 1.8, d: 0.9, monitors: 1 });
  P.officeChair(group, -6.2, 2.9, Math.PI);
  P.cabinet(group, -16.5, -8.8, 1.4, 0.55, 1.9, Math.PI / 2);
  const chart = box(group, 'patient chart', -6.2, 0.81, 3.5, 0.42, 0.025, 0.55, mat('chart', 0xcfc7ab, 0.95));
  box(group, 'chart line', -6.2, 0.825, 3.5, 0.3, 0.004, 0.4, mat('chart ink', 0x6a5a43, 0.9), { cast: false });
  registerEvidence({
    pos: [-6.2, 1.05, 3.5], prop: chart, room: 'MORGUE', label: 'READ THE PATIENT CHART',
    title: 'PATIENT CHART / 06-B',
    body: 'SUBJECT 06\nAGE: UNLISTED\n\nTissue regenerates between observations. Vocal cords develop without exposure to speech.\n\nLast night it said my name before I entered the room.\n\nDo not let it out of the tank.'
  });
  P.specimenTank(group, -13.5, -11.0, { r: 0.38, h: 1.35 });
  P.specimenTank(group, -14.6, -11.0, { r: 0.38, h: 1.35 });
  box(group, 'morgue sink', -4.7, 0.9, -3.0, 0.55, 0.12, 1.5, mat('sink', 0x878f89, 0.25, { metalness: 0.7 }));
  bloodStain(-8.5, -8.0, 1.6, 2.4, 0.3);

  /* ---------------- research lab ---------------- */
  P.labBench(group, 6.2, 4.2, 0, { w: 3.2 });
  P.labBench(group, 14.6, 4.2, 0, { w: 3.0 });
  P.labBench(group, 6.2, -11.2, 0, { w: 3.2 });
  P.labBench(group, 14.6, -11.2, 0, { w: 3.0 });
  P.labBench(group, 10.5, -4.0, 0, { w: 3.6, d: 1.1 });
  P.fumeHood(group, 16.2, 0.4, -Math.PI / 2);
  P.specimenTank(group, 5.1, -8.6, { r: 0.4, h: 1.5 });
  P.specimenTank(group, 6.3, -8.6, { r: 0.4, h: 1.5 });
  P.specimenTank(group, 15.4, -6.2, { r: 0.44, h: 1.7 });
  P.cabinet(group, 4.65, 2.0, 1.2, 0.55, 1.9, Math.PI / 2);
  P.gurney(group, 12.2, 2.5, 0, { bag: false });
  for (const [x, z] of [[9.0, -2.8], [12.0, -2.8], [9.0, -5.2], [12.0, -5.2]]) {
    cylinder(group, 'stool seat', x, 0.62, z, 0.2, 0.2, 0.07, mat('stool', 0x39413b, 0.7), 10);
    cylinder(group, 'stool pole', x, 0.31, z, 0.03, 0.03, 0.62, metal, 8);
    cylinder(group, 'stool base', x, 0.03, z, 0.22, 0.24, 0.04, metal, 10);
  }
  box(group, 'lab notice', 4.02, 2.4, -6.0, 0.04, 0.9, 1.3, mat('notice board', 0x2f352f, 0.9), { cast: false });
  for (let i = 0; i < 3; i++) box(group, 'lab notice paper', 3.99, 2.55 - i * 0.24, -6.0, 0.01, 0.18, 0.9, mat('paper', 0xd1cab3, 0.95), { cast: false });
  bloodStain(8.0, -9.8, 1.2, 1.4, 0.4);

  /* ---------------- observation control ---------------- */
  P.consoleDesk(group, 19.6, -4.0, Math.PI / 2, { w: 6.2, screens: 5 });
  for (const z of [-6.4, -4.0, -1.6]) P.officeChair(group, 20.9, z, Math.PI / 2);
  P.cabinet(group, 29.3, -1.0, 1.8, 0.55, 1.9, Math.PI / 2);
  P.cabinet(group, 29.3, -8.0, 1.8, 0.55, 1.9, Math.PI / 2);
  box(group, 'observation wall monitor', 29.75, 2.5, -4.0, 0.05, 1.0, 3.4, mat('monitor shell', 0x262a27, 0.7), { cast: false });
  for (let i = 0; i < 3; i++) box(group, 'observation screen', 29.71, 2.5, -5.1 + i * 1.1, 0.02, 0.7, 0.9,
    mat('observation glow', 0x88a893, 0.3, { emissive: 0x527c62, emissiveIntensity: 0.9 }), { cast: false });
  box(group, 'log desk', 24.5, 0.78, 3.8, 2.4, 0.08, 0.9, mat('office wood', 0x5a5042, 0.82));
  for (const dx of [-1.0, 1.0]) for (const dz of [-0.35, 0.35]) box(group, 'log desk leg', 24.5 + dx, 0.39, 3.8 + dz, 0.06, 0.78, 0.06, metal);
  P.officeChair(group, 24.5, 3.0, Math.PI);
  box(group, 'log book', 24.5, 0.84, 3.8, 0.5, 0.03, 0.65, mat('chart', 0xcfc7ab, 0.95));
  addSolid('lab', 24.5, 3.8, 1.2, 0.45);

  /* ---------------- storage ---------------- */
  for (const z of [-20.0, -24.2, -28.4, -32.2]) P.shelfUnit(group, -29.25, z, Math.PI / 2, { w: 3.4, filled: true });
  P.shelfUnit(group, -25.4, -33.3, 0, { w: 2.6 });
  P.shelfUnit(group, -21.6, -33.3, 0, { w: 2.6 });
  P.crate(group, -20.4, -30.0, 1.1, 0.2);
  P.crate(group, -19.2, -31.3, 0.8, -0.3);
  P.crate(group, -20.0, -22.0, 0.9, 0.4);
  P.crate(group, -28.2, -18.6, 0.7, 0.1);
  P.barrel(group, -27.3, -18.0);
  P.barrel(group, -26.5, -18.4);
  P.officeDesk(group, -25.0, -30.6, 0, { w: 1.7, d: 0.8, monitors: 0 });
  P.officeChair(group, -25.0, -29.8, 0);
  const ledger = box(group, 'test ledger', -25.0, 0.82, -30.4, 0.62, 0.09, 0.46, mat('ledger', 0x7d6a4c, 0.9));
  box(group, 'ledger band', -25.0, 0.87, -30.4, 0.05, 0.02, 0.46, mat('ledger band', 0x4d4030, 0.9));
  registerEvidence({
    pos: [-25.0, 1.05, -30.4], prop: ledger, room: 'STORAGE', label: 'TAKE THE TEST LEDGER',
    title: 'TRIAL 06 / NIGHT LOG',
    body: 'SUBJECT RESPONSE EXCEEDS ALL BASELINES.\n\nThe vocal pattern is an exact match for a person who has not yet entered the room.\n\nDr. Vale ordered another overnight run. The west gate is the only route out.\n\nDo not answer the intercom.'
  });
  box(group, 'forklift pallet', -22.5, 0.12, -19.0, 1.2, 0.16, 1.2, mat('pallet', 0x5b4a34, 0.95));
  box(group, 'pallet load', -22.5, 0.55, -19.0, 1.0, 0.7, 1.0, mat('archive box', 0x8a7b5d, 0.95));

  /* ---------------- generator room ---------------- */
  P.generator(group, -10.5, -27.0, 0);
  P.cabinet(group, -16.4, -21.0, 1.8, 0.55, 1.9, Math.PI / 2);
  box(group, 'breaker panel', -6.0, 1.8, -20.2, 0.2, 1.6, 1.4, mat('panel', 0x59635b, 0.7));
  for (let i = 0; i < 5; i++) box(group, 'breaker switch', -5.88, 2.0 - i * 0.22, -20.2, 0.04, 0.1, 0.16, mat('breaker', 0x252b27, 0.8));
  P.barrel(group, -6.2, -32.6);
  P.barrel(group, -5.4, -32.2);
  cylinder(group, 'cable spool', -14.5, 0.6, -30.5, 0.65, 0.65, 0.7, mat('cable', 0x23241f, 0.95), 14).rotation.z = Math.PI / 2;
  pipeRun(-10.5, -25.0, 6, 'x', 3.2, 0.12, 0x464e46, 'steam pipe');
  box(group, 'generator gauge board', -13.8, 1.4, -29.8, 0.12, 0.9, 1.1, mat('gauge board', 0x3e463f, 0.7));
  for (let i = 0; i < 3; i++) cylinder(group, 'gauge', -13.72, 1.7 - i * 0.28, -29.8, 0.11, 0.11, 0.04, mat('gauge', 0x9a9279, 0.5), 12).rotation.z = Math.PI / 2;

  /* ---------------- surgical theatre ---------------- */
  P.autopsyTable(group, 9.5, -26.5, 0);
  P.gurney(group, 5.7, -22.5, 0.1, { bag: true });
  P.gurney(group, 14.8, -31.5, Math.PI / 2, { bag: false });
  P.cabinet(group, 6.5, -33.3, 2.4, 0.55, 1.9, 0);
  P.cabinet(group, 13.8, -33.3, 2.0, 0.55, 1.9, 0);
  P.labBench(group, 5.4, -19.2, 0, { w: 2.2, d: 0.9 });
  // surgical lamp
  cylinder(group, 'surgical pole', 12.6, 1.5, -28.8, 0.06, 0.06, 3.0, metal, 8);
  box(group, 'surgical arm', 11.2, 3.0, -28.8, 2.9, 0.1, 0.1, metal);
  for (let i = 0; i < 3; i++) {
    const lx = 10.0 + i * 0.65;
    cylinder(group, 'surgical light', lx, 2.85, -28.8, 0.24, 0.18, 0.16,
      mat('surgical light', 0xe9e0c8, 0.3, { emissive: 0xffe9bf, emissiveIntensity: 1.2 }), 12);
  }
  P.ivStand(group, 8.1, -24.6);
  P.ivStand(group, 10.9, -24.6);
  box(group, 'instrument tray', 14.2, 0.82, -20.6, 1.1, 0.06, 0.7, mat('stainless', 0x6a716d, 0.32, { metalness: 0.65 }));
  for (const dx of [-0.45, 0.45]) for (const dz of [-0.25, 0.25]) box(group, 'tray leg', 14.2 + dx, 0.4, -20.6 + dz, 0.04, 0.8, 0.04, metal);
  addSolid('lab', 14.2, -20.6, 0.55, 0.35);
  for (let i = 0; i < 4; i++) box(group, 'surgical tool', 13.8 + i * 0.24, 0.87, -20.5, 0.04, 0.02, 0.34, metal);
  const reel = new THREE.Group(); reel.position.set(14.2, 0.92, -20.55); group.add(reel);
  cylinder(reel, 'final reel', 0, 0.06, 0, 0.18, 0.18, 0.06, mat('reel dark', 0x2b2822, 0.8), 14);
  cylinder(reel, 'reel hub', 0, 0.1, 0, 0.06, 0.06, 0.08, metal, 10);
  registerEvidence({
    pos: [14.2, 1.2, -20.55], prop: reel, room: 'THEATRE', label: 'TAKE THE SURGICAL RECORDING',
    title: 'SURGICAL RECORDING / 02:13',
    body: 'The subject was opened six times. It never stopped breathing.\n\nAt 02:13 the chest cavity produced a human voice. It asked us to stop the recording.\n\nWe did not stop. It remembers that.'
  });
  bloodStain(10.2, -30.6, 2.0, 3.0, 0.2);
  bloodStain(7.0, -23.0, 1.0, 1.4, -0.4);
  box(group, 'surgical tray', 5.4, 1.0, -19.2, 0.8, 0.07, 0.5, mat('stainless', 0x6a716d, 0.32, { metalness: 0.65 }));

  /* ---------------- boiler room ---------------- */
  P.boiler(group, 25.2, -30.4, 0);
  P.barrel(group, 19.0, -20.0);
  P.barrel(group, 19.8, -20.6);
  P.crate(group, 21.0, -31.8, 1.0, 0.3);
  P.crate(group, 19.4, -29.0, 0.8, -0.2);
  box(group, 'coal heap', 20.8, 0.35, -25.5, 1.4, 0.7, 1.5, mat('coal', 0x1c1c1b, 0.98));
  pipeRun(20.3, -25.0, 14, 'z', 2.8, 0.14, 0x4a4238, 'boiler pipe');
  pipeRun(20.3, -25.0, 14, 'z', 2.45, 0.08, 0x5a4e40, 'boiler pipe small');
  const fire = new THREE.PointLight(0xff6a2a, 7, 7, 2);
  fire.position.set(24.5, 1.1, -24.2);
  group.add(fire); lights.push(fire);
  flickerLights.push({ l: fire, base: 7, seed: 9 });
  box(group, 'boiler warning', 24.5, 2.2, -27.7, 1.6, 0.5, 0.05, mat('hazard', 0x967430, 0.85), { cast: false });

  /* ---------------- corridor props ---------------- */
  function bench(x, z, ry = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; group.add(g);
    box(g, 'bench seat', 0, 0.46, 0, 1.9, 0.09, 0.48, mat('bench wood', 0x5c4c36, 0.95));
    box(g, 'bench back', 0, 0.75, 0.2, 1.9, 0.55, 0.07, mat('bench wood', 0x5c4c36, 0.95));
    for (const dx of [-0.75, 0.75]) box(g, 'bench leg', dx, 0.23, 0, 0.08, 0.46, 0.4, metal);
    const crosswise = Math.abs(Math.sin(ry)) > 0.5;
    addSolid('lab', x, z, crosswise ? 0.3 : 0.98, crosswise ? 0.98 : 0.3);
  }
  bench(-27.4, 6.0, Math.PI);
  bench(27.5, -16.4, 0);
  bench(-3.0, 7.4, Math.PI / 2);
  P.gurney(group, -2.8, -7.4, 0, { bag: false });
  P.gurney(group, 2.7, -24.0, 0, { bag: false });
  P.wheelchair(group, 2.6, 8.8, 2.4);
  P.barrel(group, -2.4, 9.2);
  P.crate(group, 2.5, -14.6, 0.8, 0.3);
  P.ivStand(group, -3.1, -19.8);
  P.ivStand(group, 2.9, -31.0);
  box(group, 'notice board north', -13.5, 2.4, 10.32, 2.2, 1.1, 0.04, mat('cork', 0x5d4f38, 0.95), { cast: false });
  for (let i = 0; i < 4; i++) box(group, 'notice north', -14.4 + i * 0.55, 2.55 - (i % 2) * 0.35, 10.29, 0.36, 0.3, 0.01, mat('paper', 0xd1cab3, 0.95), { cast: false });
  box(group, 'hall map', 13.5, 2.4, 10.32, 2.0, 1.1, 0.04, mat('map board', 0x2c332d, 0.9), { cast: false });
  for (let i = 0; i < 6; i++) box(group, 'map corridor', 12.7 + (i % 3) * 0.7, 2.2 + Math.floor(i / 3) * 0.35, 10.29, 0.5, 0.04, 0.01, mat('map ink', 0x8c9a82, 0.8, { emissive: 0x3f4d3b, emissiveIntensity: 0.4 }), { cast: false });
  box(group, 'deep hall warning', 0, 2.8, -33.82, 4.0, 0.5, 0.05, mat('hazard', 0x967430, 0.85), { cast: false });

  /* ---------------- subject chamber ---------------- */
  cylinder(group, 'chamber dais', 0, 0.09, -38.1, 3.7, 3.7, 0.18, mat('dais', 0x303731, 0.6, { metalness: 0.3 }), 24);
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI * 2;
    const cable = box(group, 'dais cable', Math.cos(a) * 3.1, 0.2, -38.1 + Math.sin(a) * 3.1,
      0.055, 0.035, 2.0, mat('cable', 0x171a17, 0.9), { cast: false });
    cable.rotation.y = -a;
  }
  P.consoleDesk(group, -5.4, -35.5, Math.PI, { w: 3.0, screens: 3 });
  const originReel = new THREE.Group(); originReel.position.set(-5.4, 0.93, -35.12); group.add(originReel);
  cylinder(originReel, 'origin reel', 0, 0.09, 0, 0.24, 0.24, 0.09, mat('reel dark', 0x2b2822, 0.8), 16);
  cylinder(originReel, 'origin hub', 0, 0.14, 0, 0.08, 0.08, 0.1, mat('reel', 0x8a8f88, 0.35, { metalness: 0.6 }), 12);
  box(originReel, 'origin label', 0, 0.145, 0, 0.22, 0.01, 0.14, mat('tape label', 0xcfc4a4, 0.95));
  registerEvidence({
    pos: [-5.4, 1.22, -35.12], prop: originReel, room: 'CHAMBER', label: 'TAKE THE ORIGIN REEL', final: true,
    title: 'ORIGIN REEL / DO NOT PLAY',
    body: 'We built a receiver. It was never a receiver.\n\nThe signal comes from under the building. Every time we answer, it gets closer.\n\nIf you are hearing this, leave the tape running.\n\nDo not turn around.'
  });

  // observation tank
  const tankShell = new THREE.Group();
  group.add(tankShell);
  const tankGlass = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 3.9, 24, 1, true),
    mat('tank glass', 0x8fb7a4, 0.1, { transparent: true, opacity: 0.13, metalness: 0.25, side: THREE.DoubleSide }));
  tankGlass.position.set(0, 1.95, -38.2);
  tankShell.add(tankGlass);
  const tankFluid = new THREE.Mesh(new THREE.CylinderGeometry(1.38, 1.38, 3.7, 20, 1, true),
    mat('tank fluid', 0x5d8c6d, 0.2, { transparent: true, opacity: 0.16, emissive: 0x1f3a29, emissiveIntensity: 0.7, side: THREE.DoubleSide }));
  tankFluid.position.set(0, 1.95, -38.2);
  tankShell.add(tankFluid);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    cylinder(tankShell, 'tank bar', Math.cos(a) * 1.5, 1.95, -38.2 + Math.sin(a) * 1.5, 0.04, 0.04, 3.9, metal, 6);
  }
  const topRing = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.06, 6, 24), metal);
  topRing.position.set(0, 3.95, -38.2); topRing.rotation.x = Math.PI / 2; tankShell.add(topRing);
  const bottomRing = new THREE.Mesh(new THREE.TorusGeometry(1.52, 0.07, 6, 24), metal);
  bottomRing.position.set(0, 0.36, -38.2); bottomRing.rotation.x = Math.PI / 2; group.add(bottomRing);
  cylinder(group, 'tank pedestal', 0, 0.2, -38.2, 1.6, 1.7, 0.4, mat('tank pedestal', 0x333a35, 0.55, { metalness: 0.4 }), 20);
  addSolid('lab', 0, -38.2, 1.55, 1.55);
  const tankLight = new THREE.PointLight(0x6fd9a0, 14, 8, 2);
  tankLight.position.set(0, 2.4, -38.0);
  group.add(tankLight); lights.push(tankLight);

  const shards = new THREE.Group();
  shards.visible = false;
  group.add(shards);
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI * 2;
    const sh = box(shards, 'glass shard', Math.cos(a) * (1.6 + (i % 3) * 0.45), 0.05, -38.2 + Math.sin(a) * (1.6 + (i % 3) * 0.45),
      0.16 + (i % 4) * 0.08, 0.025, 0.28, mat('glass shard', 0x9fc4b1, 0.1, { transparent: true, opacity: 0.5 }), { cast: false });
    sh.rotation.y = a;
  }

  // creature in the tank
  const creature = buildCreature(group);
  creature.root.position.set(0, 0.4, -38.2);
  creature.root.rotation.y = 0;

  // chamber dressing
  P.gurney(group, -7.0, -37.2, Math.PI / 2, { bag: true });
  P.gurney(group, 7.0, -37.0, Math.PI / 2, { bag: false });
  P.crate(group, 9.4, -35.2, 0.9, 0.2);
  P.barrel(group, -9.4, -35.4);
  P.ivStand(group, -5.8, -35.6);
  P.officeChair(group, -6.4, -35.0, Math.PI);
  P.officeChair(group, -4.4, -35.0, Math.PI);
  for (let i = 0; i < 6; i++) {
    const x = -9 + i * 3.6;
    cylinder(group, 'chamber cable', x, 2.6, -39.4, 0.035, 0.035, 3.2, mat('cable', 0x171a17, 0.9), 6);
  }
  P.addSign(group, 'SUBJECT 06', 'CONTAINMENT', 0, 3.86, -39.82, 0, 1.1);
  box(group, 'chamber warning', 0, 2.7, -34.06, 4.4, 0.45, 0.04, mat('hazard', 0x967430, 0.85), { cast: false });
  bloodStain(0, -36.6, 3.0, 2.0, 0.2);

  /* ---------------- path grid ---------------- */
  const PATH = { cell: 1, x0: F.minX + 0.5, z0: F.minZ + 0.5, w: 60, h: 54, walk: null };
  function buildPathGrid() {
    const w = PATH.w, h = PATH.h;
    PATH.walk = new Uint8Array(w * h);
    for (let iz = 0; iz < h; iz++) for (let ix = 0; ix < w; ix++) {
      const x = PATH.x0 + ix * PATH.cell, z = PATH.z0 + iz * PATH.cell;
      let ok = x > F.minX + 0.45 && x < F.maxX - 0.45 && z > F.minZ + 0.45 && z < F.maxZ - 0.45;
      if (ok) {
        for (let i = 0; i < solids.lab.length; i++) {
          const c = solids.lab[i];
          if (c.disabled) continue;
          if (Math.abs(x - c.x) < c.hx + 0.34 && Math.abs(z - c.z) < c.hz + 0.34) { ok = false; break; }
        }
      }
      PATH.walk[iz * w + ix] = ok ? 1 : 0;
    }
  }
  buildPathGrid();

  function walkableNear(ix, iz) {
    if (PATH.walk[iz * PATH.w + ix]) return [ix, iz];
    for (let r = 1; r <= 5; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      const nx = ix + dx, nz = iz + dz;
      if (nx < 0 || nz < 0 || nx >= PATH.w || nz >= PATH.h) continue;
      if (PATH.walk[nz * PATH.w + nx]) return [nx, nz];
    }
    return null;
  }

  function findPath(sx, sz, tx, tz) {
    if (!PATH.walk) return null;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const six = clamp(Math.round(sx - PATH.x0), 0, PATH.w - 1);
    const siz = clamp(Math.round(sz - PATH.z0), 0, PATH.h - 1);
    const tix = clamp(Math.round(tx - PATH.x0), 0, PATH.w - 1);
    const tiz = clamp(Math.round(tz - PATH.z0), 0, PATH.h - 1);
    const start = walkableNear(six, siz), goal = walkableNear(tix, tiz);
    if (!start || !goal) return null;
    const w = PATH.w, h = PATH.h;
    const s = start[1] * w + start[0], t = goal[1] * w + goal[0];
    const prev = new Int32Array(w * h).fill(-1);
    const seen = new Uint8Array(w * h);
    const q = new Int32Array(w * h);
    let head = 0, tail = 0;
    q[tail++] = s; seen[s] = 1;
    while (head < tail && !seen[t]) {
      const cur = q[head++];
      const cx = cur % w, cz = (cur / w) | 0;
      for (let k = 0; k < 4; k++) {
        const nx = cx + (k === 0 ? 1 : k === 1 ? -1 : 0);
        const nz = cz + (k === 2 ? 1 : k === 3 ? -1 : 0);
        if (nx < 0 || nz < 0 || nx >= w || nz >= h) continue;
        const ni = nz * w + nx;
        if (seen[ni] || !PATH.walk[ni]) continue;
        seen[ni] = 1; prev[ni] = cur; q[tail++] = ni;
      }
    }
    if (!seen[t]) return null;
    const path = [];
    let cur = t;
    while (cur !== s) {
      path.push({ x: PATH.x0 + (cur % w), z: PATH.z0 + ((cur / w) | 0) });
      cur = prev[cur];
      if (cur < 0) return null;
    }
    path.reverse();
    return path;
  }

  /* ---------------- AI + update ---------------- */
  const AI = { awake: false, chaseDelay: 0, cooldown: 0, path: [], pathTimer: 0, gateOpen: false };
  let gateOpen = false;

  function wake() {
    if (AI.awake) return;
    AI.awake = true;
    AI.chaseDelay = 2.0;
    creature.awake = true;
    gateOpen = true;
    tankShell.visible = false;
    shards.visible = true;
    tankLight.color.set(0xff5a3a);
    tankLight.intensity = 6;
  }

  function openGate() { gateOpen = true; }

  function resetCreature() {
    creature.root.position.set(0, 0.02, -37.4);
    AI.path = [];
    AI.pathTimer = 0;
    AI.cooldown = 7;
  }

  function update(dt, playerPos, t, paused = false) {
    // flickering fixtures
    for (let i = 0; i < flickerLights.length; i++) {
      const f = flickerLights[i];
      f.seed -= dt;
      if (f.seed > 0) continue;
      const strong = f.base > 10;
      const roll = Math.random();
      f.l.intensity = roll < 0.22 ? f.base * 0.06 : f.base * (0.72 + Math.random() * 0.38);
      f.seed = roll < 0.22 ? 0.05 + Math.random() * 0.12 : (strong ? 0.6 : 0.25) + Math.random() * 1.4;
    }

    if (gateOpen) {
      gateCollider.disabled = true;
      for (const p of gatePanels) {
        const target = p.dir * 3.45;
        p.g.position.x += (target - p.g.position.x) * Math.min(1, dt * 2.2);
      }
    }

    if (AI.awake) {
      chamberLamp.l.intensity = 15 + Math.sin(t * 6.8) * 7;
      chamberLamp.tube.material.emissiveIntensity = 1.3 + Math.sin(t * 6.8) * 0.6;
    }

    animateCreature(creature, dt, t);
    creature.moving = false;

    if (!AI.awake || paused) return;
    if (AI.cooldown > 0) { AI.cooldown -= dt; return; }

    const c = creature.root;
    if (AI.chaseDelay > 0) {
      AI.chaseDelay -= dt;
      c.position.y = Math.max(0.02, c.position.y - dt * 0.35);
      c.position.z = Math.min(-36.4, c.position.z + dt * 0.9);
      c.lookAt(0, 1.2, -34.5);
      creature.moving = AI.chaseDelay < 1.6;
      return;
    }

    AI.pathTimer -= dt;
    if (AI.pathTimer <= 0) {
      AI.path = findPath(c.position.x, c.position.z, playerPos.x, playerPos.z) || [];
      AI.pathTimer = 0.55;
    }
    while (AI.path.length && Math.hypot(c.position.x - AI.path[0].x, c.position.z - AI.path[0].z) < 0.28) AI.path.shift();
    const target = AI.path.length ? AI.path[0] : { x: playerPos.x, z: playerPos.z };
    const dx = target.x - c.position.x, dz = target.z - c.position.z;
    const dist = Math.hypot(dx, dz) || 1;
    const speed = 3.2;
    c.position.x += dx / dist * speed * dt;
    c.position.z += dz / dist * speed * dt;
    c.lookAt(playerPos.x, c.position.y + 1.3, playerPos.z);
    creature.moving = true;

    if (Math.hypot(playerPos.x - c.position.x, playerPos.z - c.position.z) < 1.25 && AI.cooldown <= 0) {
      AI.cooldown = 7;
      AI.path = [];
      onCaught?.();
      c.position.set(0, 0.02, -37.4);
    }
  }

  function state() {
    return {
      awake: AI.awake, cooldown: AI.cooldown,
      creature: creature.root.position.toArray(),
      gateOpen, evidence: evidenceDefs.filter(e => e.taken).length,
    };
  }

  return {
    group, lights, flickerLights, F, evidenceDefs,
    wake, openGate, resetCreature, update, state,
    get creature() { return creature; },
    tankShell, shards,
  };
}
