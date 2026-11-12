import * as THREE from 'three';
import { mat, box, sphere, cylinder, cone } from './kit.js';

/* "SUBJECT 06" — a tall, emaciated humanoid grown in a tank.
   Built from primitives with articulated pivots so it can walk.
   Deliberately over-long limbs, a narrow skull and a hanging jaw. */
export function buildCreature(parent) {
  const skin = mat('subject skin', 0x8a8e7f, 0.98);
  const skinDark = mat('subject skin dark', 0x565c50, 0.98);
  const skinPale = mat('subject skin pale', 0xa3a594, 0.98);
  const wound = mat('subject wound', 0x4a1510, 0.9, { emissive: 0x250403, emissiveIntensity: 0.35 });
  const bone = mat('subject bone', 0xd6cfb4, 0.72);
  const cloth = mat('subject cloth', 0x141717, 1);
  const socket = mat('subject socket', 0x030404, 0.95);
  const eyeMat = mat('subject eye', 0xff5f22, 0.3, { emissive: 0xff4a12, emissiveIntensity: 2.2 });

  const root = new THREE.Group();
  root.name = 'SUBJECT 06';
  root.scale.setScalar(0.9);
  parent.add(root);
  const body = new THREE.Group();
  root.add(body);

  // pelvis and exposed spine
  sphere(body, 'pelvis', 0, 1.24, 0, 0.2, skinDark, 1.05, 0.72, 0.8);
  const spine = cylinder(body, 'spine', 0, 1.35, -0.04, 0.055, 0.05, 0.52, skinDark, 7);
  spine.rotation.x = 0.1;
  for (let i = 0; i < 5; i++) {
    sphere(body, 'vertebra', 0, 1.19 + i * 0.1, -0.09, 0.034, bone, 1, 0.8, 1.2);
  }
  for (let i = 0; i < 3; i++) {
    const hipSpike = cone(body, 'hip spike', (i - 1) * 0.12, 1.33, -0.14, 0.028, 0.17, bone, 5);
    hipSpike.rotation.x = -0.9;
  }

  // hunched torso
  const torso = new THREE.Group();
  torso.position.set(0, 1.34, 0);
  torso.rotation.x = 0.2;
  body.add(torso);

  cylinder(torso, 'abdomen', 0, 0.26, 0.01, 0.17, 0.115, 0.58, skin, 9).scale.z = 0.8;
  sphere(torso, 'stomach hollow', 0, 0.3, 0.13, 0.095, skinDark, 1.4, 1.8, 0.32);
  sphere(torso, 'ribcage', 0, 0.66, 0, 0.27, skin, 1.05, 0.92, 0.64);
  for (let i = 0; i < 5; i++) {
    const y = 0.4 + i * 0.098;
    for (const s of [-1, 1]) {
      const rib = box(torso, 'rib', s * (0.055 + i * 0.014), y, 0.15,
        0.22 - i * 0.009, 0.022, 0.05, bone);
      rib.rotation.z = s * (0.15 + i * 0.012);
    }
  }
  box(torso, 'sternum', 0, 0.55, 0.185, 0.028, 0.4, 0.028, bone);

  // torn flank
  sphere(torso, 'chest wound', -0.185, 0.53, 0.12, 0.09, wound, 1.05, 1.8, 0.35);
  for (let i = 0; i < 4; i++) {
    sphere(torso, 'spine', 0, 0.14 + i * 0.12, -0.18, 0.032, bone, 1, 1.3, 1);
  }
  for (let i = 0; i < 5; i++) {
    const spike = cone(torso, 'spine spike', 0, 0.15 + i * 0.12, -0.23, 0.03, 0.17, bone, 5);
    spike.rotation.x = -0.85;
  }
  for (const s of [-1, 1]) {
    const clav = box(torso, 'collarbone', s * 0.16, 0.85, 0.1, 0.31, 0.034, 0.034, bone);
    clav.rotation.z = s * 0.14;
    sphere(torso, 'shoulder', s * 0.31, (s < 0 ? 0.83 : 0.78), 0, 0.1, skin, 1.1, 0.85, 0.95);
    const blade = cone(torso, 'shoulder blade', s * 0.17, 0.7, -0.18, 0.04, 0.16, bone, 5);
    blade.rotation.x = -1.0;
    blade.rotation.z = s * 0.5;
  }

  // long neck, tilted head
  cylinder(torso, 'neck', 0, 0.99, 0.02, 0.075, 0.058, 0.36, skinDark, 7);
  const head = new THREE.Group();
  head.position.set(0, 1.15, 0.06);
  head.rotation.z = 0.06;
  head.rotation.x = -0.08;
  torso.add(head);

  sphere(head, 'skull', 0, 0.12, 0.01, 0.2, skinPale, 0.8, 1.34, 0.94);
  sphere(head, 'cranium ridge', 0, 0.34, -0.02, 0.11, skinDark, 1.45, 0.55, 1.2);
  sphere(head, 'occiput', 0, 0.1, -0.1, 0.13, skinDark, 1.1, 1.2, 0.8);
  for (const s of [-1, 1]) {
    sphere(head, 'temple', s * 0.125, 0.2, 0.07, 0.07, skinDark, 1, 1.4, 0.8);
    sphere(head, 'cheek', s * 0.12, 0.02, 0.12, 0.05, skinDark, 1.1, 1.5, 0.7);
    sphere(head, 'socket', s * 0.073, 0.165, 0.15, 0.07, socket, 1.05, 1.25, 0.6);
    sphere(head, 'eye', s * 0.073, 0.16, 0.2, 0.017, eyeMat, 1, 1, 0.8);
  }
  box(head, 'brow', 0, 0.255, 0.16, 0.3, 0.06, 0.07, skinDark);
  const nose = cone(head, 'nose cavity', 0, 0.07, 0.19, 0.03, 0.1, socket, 5);
  nose.rotation.x = Math.PI;
  for (let i = 0; i < 4; i++) {
    const strip = box(head, 'face scar', -0.07 + i * 0.045, -0.04, 0.175, 0.012, 0.15, 0.02, skinDark);
    strip.rotation.z = (i - 1.5) * 0.12;
  }

  // hanging jaw
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.04, 0.03);
  head.add(jaw);
  sphere(jaw, 'jaw bone', 0, -0.12, 0.1, 0.13, skinDark, 1.15, 0.5, 0.9);
  box(jaw, 'lower lip', 0, -0.045, 0.185, 0.185, 0.028, 0.03, skinDark);
  box(jaw, 'mouth cavity', 0, -0.005, 0.165, 0.17, 0.11, 0.05, socket);
  for (let i = 0; i < 5; i++) {
    const len = 0.06 + (i % 3) * 0.022;
    const tooth = cone(head, 'upper fang', -0.072 + i * 0.036, -0.048, 0.2, 0.011, len, bone, 5);
    tooth.rotation.x = Math.PI;
    tooth.rotation.z = (i - 2) * 0.05;
  }
  for (let i = 0; i < 4; i++) {
    const len = 0.045 + (i % 2) * 0.03;
    const tooth = cone(jaw, 'lower fang', -0.058 + i * 0.039, -0.035, 0.2, 0.011, len, bone, 5);
    tooth.rotation.x = 0.12;
    tooth.rotation.z = (i - 1.5) * -0.05;
  }

  // arms — long enough to hang past the knees
  function makeArm(side) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.34, 0.81, 0);
    torso.add(shoulder);
    sphere(shoulder, 'shoulder joint', 0, 0, 0, 0.1, skinDark);
    cylinder(shoulder, 'upper arm', 0, -0.35, 0, 0.07, 0.045, 0.7, skin, 8).scale.z = 0.9;
    const elbow = new THREE.Group();
    elbow.position.y = -0.7;
    shoulder.add(elbow);
    sphere(elbow, 'elbow', 0, 0, 0, 0.075, skinDark, 1, 1.2, 1);
    cylinder(elbow, 'forearm', 0, -0.36, 0, 0.05, 0.033, 0.72, skin, 8);
    for (let i = 0; i < 4; i++) {
      sphere(elbow, 'vein', 0.015, -0.1 - i * 0.14, 0.032, 0.011, wound);
    }
    const hand = new THREE.Group();
    hand.position.y = -0.74;
    elbow.add(hand);
    sphere(hand, 'palm', 0, -0.02, 0.01, 0.06, skinDark, 1.0, 0.95, 1.35);
    for (let i = 0; i < 3; i++) {
      const claw = cone(hand, 'claw', (i - 1) * 0.042, -0.13, 0.045, 0.012, 0.22, bone, 5);
      claw.rotation.x = 0.55;
      claw.rotation.z = (i - 1) * 0.12;
    }
    const thumb = cone(hand, 'thumb', side * 0.06, -0.07, 0.0, 0.013, 0.16, bone, 5);
    thumb.rotation.z = side * 0.9;
    return { shoulder, elbow, hand };
  }
  const armL = makeArm(-1), armR = makeArm(1);

  // legs — thin and slightly over-long
  function makeLeg(side) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.14, 1.28, 0);
    body.add(hip);
    cylinder(hip, 'thigh', 0, -0.31, 0, 0.08, 0.05, 0.62, skin, 8);
    const knee = new THREE.Group();
    knee.position.y = -0.62;
    hip.add(knee);
    sphere(knee, 'knee', 0, 0, 0, 0.068, skinDark);
    cylinder(knee, 'shin', 0, -0.29, 0, 0.052, 0.032, 0.58, skin, 8);
    const ankle = new THREE.Group();
    ankle.position.y = -0.58;
    knee.add(ankle);
    sphere(ankle, 'ankle', 0, 0, 0, 0.05, skinDark);
    box(ankle, 'foot', 0, -0.03, 0.08, 0.11, 0.06, 0.3, skinDark);
    for (let i = 0; i < 3; i++) {
      const toe = cone(ankle, 'toe', (i - 1) * 0.04, -0.025, 0.235, 0.014, 0.1, bone, 5);
      toe.rotation.x = Math.PI / 2.1;
    }
    return { hip, knee, ankle };
  }
  const legL = makeLeg(-1), legR = makeLeg(1);

  // ragged loincloth: a waist band plus hanging strips, legs stay visible
  const gown = new THREE.Group();
  body.add(gown);
  cylinder(gown, 'waist wrap', 0, 1.23, 0, 0.225, 0.21, 0.2, cloth, 10).scale.z = 0.85;
  const strips = [];
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2;
    const len = 0.44 + ((i * 7) % 5) * 0.11 + (i % 3 === 0 ? 0.18 : 0);
    const strip = box(gown, 'gown strip', Math.cos(a) * 0.215, 1.13 - len / 2, Math.sin(a) * 0.2,
      0.085, len, 0.024, cloth);
    strip.rotation.y = -a;
    strip.rotation.z = Math.sin(a) * 0.12;
    strip.rotation.x = Math.cos(a) * 0.06;
    strips.push(strip);
  }
  // a few bloody tatters
  for (let i = 0; i < 4; i++) {
    const a = 0.4 + i * 1.7;
    const tatter = box(gown, 'bloody tatter', Math.cos(a) * 0.225, 0.8, Math.sin(a) * 0.21,
      0.07, 0.3 + (i % 3) * 0.1, 0.022, wound);
    tatter.rotation.y = -a;
    strips.push(tatter);
  }

  // blood on the chest and face
  const stain = sphere(torso, 'blood smear', 0.03, 0.42, 0.2, 0.05, wound, 0.8, 2.3, 0.25);
  stain.rotation.z = 0.4;
  sphere(head, 'face blood', 0.1, 0.06, 0.16, 0.03, wound, 0.8, 2.6, 0.25);

  root.position.set(0, 0.02, -38.15);
  return {
    root, body, torso, head, jaw, armL, armR, legL, legR, eyes: eyeMat, gown,
    strips, phase: 0, awake: false, moving: false,
  };
}

export function animateCreature(c, dt, t) {
  const awake = c.awake;
  const speed = awake ? (c.moving ? 7.4 : 2.1) : 0.8;
  c.phase += dt * speed;
  const p = c.phase;
  const breathe = Math.sin(t * 1.4) * 0.012;

  c.body.position.y = Math.sin(p * 1.9) * (awake ? 0.05 : 0.01) + breathe;
  c.torso.rotation.x = (awake ? 0.3 : 0.2) + Math.sin(p * 1.9) * 0.025;
  c.torso.rotation.z = Math.sin(p * 0.9) * (awake ? 0.055 : 0.015);

  c.head.rotation.x = (awake ? -0.16 : -0.08) + Math.sin(t * 3.1) * (awake ? 0.03 : 0.006);
  c.head.rotation.z = 0.06 + Math.sin(t * 0.73) * (awake ? 0.08 : 0.11) + Math.sin(t * 7.1) * (awake ? 0.045 : 0.005);
  c.head.rotation.y = Math.sin(t * 0.41) * (awake ? 0.1 : 0.13);

  const swing = awake && c.moving ? 0.58 : 0.05;
  c.armL.shoulder.rotation.x = Math.sin(p) * swing - (awake ? 0.36 : 0.08);
  c.armR.shoulder.rotation.x = -Math.sin(p) * swing - (awake ? 0.36 : 0.08);
  c.armL.shoulder.rotation.z = 0.1 + (awake ? 0.05 : 0) + Math.sin(t * 0.9) * 0.02;
  c.armR.shoulder.rotation.z = -0.1 - (awake ? 0.05 : 0) - Math.sin(t * 0.9 + 1) * 0.02;
  c.armL.elbow.rotation.x = awake ? -0.42 + Math.sin(p) * 0.2 : -0.08;
  c.armR.elbow.rotation.x = awake ? -0.42 - Math.sin(p) * 0.2 : -0.08;

  const legSwing = awake && c.moving ? 0.6 : 0.03;
  c.legL.hip.rotation.x = Math.sin(p) * legSwing;
  c.legR.hip.rotation.x = -Math.sin(p) * legSwing;
  c.legL.knee.rotation.x = 0.06 + Math.max(0, -Math.sin(p)) * (awake ? 0.8 : 0.05);
  c.legR.knee.rotation.x = 0.06 + Math.max(0, Math.sin(p)) * (awake ? 0.8 : 0.05);

  c.jaw.rotation.x = (awake ? 0.52 : 0.06) + (awake ? Math.sin(t * 5.3) * 0.14 : 0.01);
  c.eyes.emissiveIntensity = awake ? 2.4 + Math.sin(t * 8) * 1.0 : 0.9;

  for (let i = 0; i < c.strips.length; i++) {
    c.strips[i].rotation.z = Math.sin(t * 1.3 + i * 0.9) * (awake ? 0.12 : 0.04);
  }
}
