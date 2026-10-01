// Builds the three.js object graph and meshes for every body in a system.

import * as THREE from 'three';
import { KM_PER_UNIT, AU_KM, DAY_MS, J2000_MS } from './config.js?v=10';
import { relativePosition } from './kepler.js?v=10';
import { bodyTexture, ringTexture, glowTexture } from './textures.js?v=10';

function sphereSegments(radiusUnits) {
  if (radiusUnits < 0.001) return [8, 6];
  if (radiusUnits < 1) return [24, 16];
  if (radiusUnits < 50) return [48, 32];
  return [64, 48];
}

function createMesh(body, assets) {
  const radius = Math.max(body.radiusKm / KM_PER_UNIT, 1e-5);
  const [w, h] = sphereSegments(radius);
  const geometry = new THREE.SphereGeometry(radius, w, h);

  const real = assets.bodyTex && assets.bodyTex.get(body.id);
  const map = real || bodyTexture(body);

  let material;
  if (body.type === 'star') {
    material = new THREE.MeshBasicMaterial({ map });
  } else {
    material = new THREE.MeshStandardMaterial({
      map,
      // Real maps already carry the body's colour; only tint procedural ones.
      color: real ? 0xffffff : new THREE.Color(body.color || '#ffffff'),
      roughness: 1,
      metalness: 0
    });
  }

  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.bodyId = body.id;

  // Axial tilt: rotate the spin axis away from the orbital-plane normal. The
  // magnitude is folded into [0, 90]; retrograde spin comes from the signed
  // rotation period, so obliquity above 90 does not double-count direction.
  const obliq = body.axialTiltDeg || 0;
  if (obliq) {
    const tiltDeg = obliq > 90 ? 180 - obliq : obliq;
    mesh.userData.tiltQuat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      (tiltDeg * Math.PI) / 180
    );
  }
  return mesh;
}

function addClouds(planetMesh, body, cloudTex) {
  if (!cloudTex || !planetMesh) return;
  const radius = Math.max(body.radiusKm / KM_PER_UNIT, 1e-5);
  const geometry = new THREE.SphereGeometry(radius * 1.012, 48, 32);
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    alphaMap: cloudTex, // white clouds -> alpha 1, black sky -> alpha 0
    transparent: true,
    depthWrite: false,
    roughness: 1,
    metalness: 0
  });
  const clouds = new THREE.Mesh(geometry, material);
  clouds.userData.bodyId = body.id;
  // Child of the planet so it inherits the axial tilt and spin.
  planetMesh.add(clouds);
}

function addSunGlow(pivot, radius) {
  const material = new THREE.SpriteMaterial({
    map: glowTexture('rgba(255,225,140,1)'),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.setScalar(radius * 80);
  pivot.add(sprite);
}

// RingGeometry uses planar UVs; remap them so u runs from the inner to the
// outer edge, which is how ring strips (real 2048x125, procedural 512x1) are
// encoded.
function applyRadialUVs(geometry, inner, outer) {
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  const v = new THREE.Vector3();
  const span = outer - inner || 1;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const r = Math.hypot(v.x, v.y);
    uv.setXY(i, (r - inner) / span, 0.5);
  }
  uv.needsUpdate = true;
}

function addRings(pivot, body, assets) {
  const inner = body.rings.innerKm / KM_PER_UNIT;
  const outer = body.rings.outerKm / KM_PER_UNIT;
  const geometry = new THREE.RingGeometry(inner, outer, 160, 1);
  applyRadialUVs(geometry, inner, outer);

  const real = assets.ringTex && assets.ringTex.get(body.id);
  const material = new THREE.MeshBasicMaterial({
    map: real || ringTexture(body.color),
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    opacity: real ? 1 : 0.9
  });
  const ring = new THREE.Mesh(geometry, material);
  // Rings lie in the planet's equatorial plane, so they carry the same tilt.
  const qBase = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  const obliq = body.axialTiltDeg || 0;
  const tiltDeg = obliq > 90 ? 180 - obliq : obliq;
  const qTilt = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    (tiltDeg * Math.PI) / 180
  );
  ring.quaternion.copy(qTilt).multiply(qBase);
  pivot.add(ring);
}

function solveKepler(meanAnomaly, e) {
  const twoPi = Math.PI * 2;
  let M = meanAnomaly % twoPi;
  if (M < 0) M += twoPi;
  let E = M;
  for (let k = 0; k < 6; k++) {
    const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= d;
    if (Math.abs(d) < 1e-7) break;
  }
  return E;
}

// A belt is a cloud of particles on their own Kepler orbits. Density tapers
// smoothly toward the inner/outer edges (no hard annulus boundary) and a small
// inclination spread gives the cloud thickness.
function createBelt(body) {
  const innerAU = body.belt.innerAU;
  const outerAU = body.belt.outerAU;
  const thicknessAU = body.belt.thicknessAU || 0.2;
  const count = body.belt.count || 3000;

  const midAU = (innerAU + outerAU) / 2;
  const halfAU = (outerAU - innerAU) / 2;

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 4);
  const aKm = new Float32Array(count);
  const ecc = new Float32Array(count);
  const inc = new Float32Array(count);
  const node = new Float32Array(count);
  const peri = new Float32Array(count);
  const m0 = new Float32Array(count);
  const motion = new Float32Array(count); // rad per ms

  const rgb = new THREE.Color(0x9aa2ac);
  // Roughly bell-shaped in [-1, 1].
  const gauss = () => (Math.random() + Math.random() + Math.random() + Math.random() - 2) / 2;

  let i = 0;
  let guard = 0;
  while (i < count && guard < count * 30) {
    guard++;
    const u = Math.random() * 2 - 1; // -1 .. 1 across the belt
    const f = Math.pow(1 - u * u, 1.6); // 1 at the middle, 0 at the edges
    if (Math.random() > 0.15 + 0.85 * f) continue; // thin out the edges

    const aAU = midAU + u * halfAU;
    aKm[i] = aAU * AU_KM;
    ecc[i] = Math.random() * 0.12;
    inc[i] = gauss() * Math.atan2(thicknessAU, aAU);
    node[i] = Math.random() * Math.PI * 2;
    peri[i] = Math.random() * Math.PI * 2;
    m0[i] = Math.random() * Math.PI * 2;
    const periodDays = 365.25 * Math.pow(aAU, 1.5);
    motion[i] = (Math.PI * 2) / (periodDays * DAY_MS);

    const alpha = 0.25 + 0.75 * f;
    colors[i * 4] = rgb.r;
    colors[i * 4 + 1] = rgb.g;
    colors[i * 4 + 2] = rgb.b;
    colors[i * 4 + 3] = alpha;
    i++;
  }
  // Defensive fill if the guard tripped.
  for (; i < count; i++) {
    aKm[i] = midAU * AU_KM;
    motion[i] = (Math.PI * 2) / (365.25 * Math.pow(midAU, 1.5) * DAY_MS);
    colors[i * 4] = rgb.r;
    colors[i * 4 + 1] = rgb.g;
    colors[i * 4 + 2] = rgb.b;
    colors[i * 4 + 3] = 0.4;
  }

  const geometry = new THREE.BufferGeometry();
  const positionAttr = new THREE.BufferAttribute(positions, 3);
  geometry.setAttribute('position', positionAttr);
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));

  const material = new THREE.PointsMaterial({
    size: 1.35,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    depthWrite: false
  });

  const points = new THREE.Points(geometry, material);
  points.userData = {
    bodyId: 'belt',
    count,
    aKm,
    ecc,
    inc,
    node,
    peri,
    m0,
    motion,
    positionAttr,
    lastTime: null
  };
  return points;
}

// Advance every particle along its own Kepler orbit.
function updateBelt(points, timeMs) {
  const u = points.userData;
  if (!u || !u.positionAttr) return;
  if (u.lastTime === timeMs) return;
  u.lastTime = timeMs;

  const pos = u.positionAttr.array;
  const dt = timeMs - J2000_MS;
  for (let i = 0; i < u.count; i++) {
    const e = u.ecc[i];
    const E = solveKepler(u.m0[i] + u.motion[i] * dt, e);
    const xp = u.aKm[i] * (Math.cos(E) - e);
    const yp = u.aKm[i] * Math.sqrt(1 - e * e) * Math.sin(E);

    const cw = Math.cos(u.peri[i]);
    const sw = Math.sin(u.peri[i]);
    const x1 = xp * cw - yp * sw;
    const y1 = xp * sw + yp * cw;

    const ci = Math.cos(u.inc[i]);
    const si = Math.sin(u.inc[i]);
    const y2 = y1 * ci;
    const z2 = y1 * si;

    const cn = Math.cos(u.node[i]);
    const sn = Math.sin(u.node[i]);
    const xe = x1 * cn - y2 * sn;
    const ye = x1 * sn + y2 * cn;

    pos[i * 3] = xe / KM_PER_UNIT;
    pos[i * 3 + 1] = z2 / KM_PER_UNIT;
    pos[i * 3 + 2] = -ye / KM_PER_UNIT;
  }
  u.positionAttr.needsUpdate = true;
}

// Position of a Lagrange anchor relative to its primary, in scene units.
// L1/L2/L3 use the standard Hill-radius distance; L4/L5 form the equilateral
// points of the primary-secondary pair.
function lagrangeRelative(body, records, timeMs) {
  const primary = records.get(body.parent);
  const secondary = records.get(body.anchor.secondary);
  if (!primary || !secondary || !secondary.data.orbit) return new THREE.Vector3();

  const rel = relativePosition(secondary.data.orbit, timeMs);
  const vector = new THREE.Vector3(rel.x, rel.y, rel.z);
  const R = vector.length();
  if (R === 0) return new THREE.Vector3();
  const dir = vector.clone().divideScalar(R);

  const m1 = primary.data.massKg || 1;
  const m2 = secondary.data.massKg || 0;
  const q = m2 / m1;
  const r = R * Math.cbrt(q / 3);

  switch (body.anchor.point) {
    case 'L1':
      return dir.clone().multiplyScalar(R - r);
    case 'L2':
      return dir.clone().multiplyScalar(R + r);
    case 'L3':
      return dir.clone().multiplyScalar(-R * (1 + (5 / 12) * q));
    case 'L4':
    case 'L5': {
      // Rotate the direction 60 degrees within the orbital plane (about up).
      const ang = (body.anchor.point === 'L4' ? 1 : -1) * (Math.PI / 3);
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      return new THREE.Vector3(
        dir.x * c - dir.z * s,
        dir.y,
        dir.x * s + dir.z * c
      ).multiplyScalar(R);
    }
    default:
      return dir.clone().multiplyScalar(R - r);
  }
}

// Returns { records: Map<id, record>, rootId }.
export function createBodies(systemData, scene, assets = {}) {
  const records = new Map();

  // Pass 1: create pivots and meshes.
  for (const body of systemData.bodies) {
    const pivot = new THREE.Object3D();
    const record = { data: body, pivot, mesh: null, children: [] };

    if (body.type === 'belt') {
      record.mesh = createBelt(body);
      pivot.add(record.mesh);
    } else {
      record.mesh = createMesh(body, assets);
      pivot.add(record.mesh);
      if (body.type === 'star') {
        addSunGlow(pivot, body.radiusKm / KM_PER_UNIT);
      }
      if (body.clouds) {
        addClouds(record.mesh, body, assets.cloudTex && assets.cloudTex.get(body.id));
      }
      if (body.rings) {
        addRings(pivot, body, assets);
      }
    }

    record.mesh.userData.record = record;
    records.set(body.id, record);
  }

  // Pass 2: attach pivots into a hierarchy.
  for (const body of systemData.bodies) {
    const record = records.get(body.id);
    const parent = body.parent ? records.get(body.parent) : null;
    if (parent) {
      parent.pivot.add(record.pivot);
      parent.children.push(record);
      record.parent = parent;
    } else {
      scene.add(record.pivot);
      record.parent = null;
    }
  }

  return { records, rootId: systemData.root };
}

const _spinAxis = new THREE.Vector3(0, 1, 0);
const _qSpin = new THREE.Quaternion();

// Spin a body about its (tilted) axis from its sidereal rotation period. A
// negative period (Venus, Uranus, Triton) spins retrograde.
function applySpin(body, mesh, timeMs) {
  if (!mesh) return;
  const angle = body.rotationDays
    ? ((timeMs - J2000_MS) / (body.rotationDays * DAY_MS)) * Math.PI * 2
    : (timeMs / DAY_MS) * 0.05; // stations and other markers: gentle turn

  _qSpin.setFromAxisAngle(_spinAxis, angle);
  const tilt = mesh.userData.tiltQuat;
  if (tilt) {
    mesh.quaternion.copy(tilt).multiply(_qSpin);
  } else {
    mesh.quaternion.copy(_qSpin);
  }
}

// Update every pivot to the position implied by the current simulated time.
export function updateBodies(systemData, records, timeMs) {
  for (const body of systemData.bodies) {
    const record = records.get(body.id);
    if (!record) continue;

    // The belt is a cloud of independently orbiting particles.
    if (body.type === 'belt') {
      if (record.mesh) updateBelt(record.mesh, timeMs);
      continue;
    }

    if (body.anchor && body.anchor.type === 'lagrange') {
      record.pivot.position.copy(lagrangeRelative(body, records, timeMs));
      applySpin(body, record.mesh, timeMs);
      continue;
    }

    if (!body.orbit) {
      applySpin(body, record.mesh, timeMs); // the star
      continue;
    }
    const p = relativePosition(body.orbit, timeMs);
    record.pivot.position.set(p.x, p.y, p.z);
    applySpin(body, record.mesh, timeMs);
  }
}
