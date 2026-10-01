// Keplerian orbital mechanics.
// Elements follow the classic (a, e, i, Omega, omega, M0) set with a J2000 mean
// anomaly. Positions are returned relative to the orbit's parent in scene units.

import { AU_KM, DEG, J2000_MS, KM_PER_UNIT, DAY_MS } from './config.js?v=10';

function normalizeAngle(a) {
  const twoPi = Math.PI * 2;
  a %= twoPi;
  return a < 0 ? a + twoPi : a;
}

// Solve Kepler's equation M = E - e sin(E) with Newton iteration.
function solveEccentricAnomaly(meanAnomaly, e) {
  let E = meanAnomaly;
  for (let i = 0; i < 10; i++) {
    const dE = (E - e * Math.sin(E) - meanAnomaly) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-9) break;
  }
  return E;
}

function semiMajorAxisKm(orbit) {
  if (orbit.aKm != null) return orbit.aKm;
  if (orbit.aAU != null) return orbit.aAU * AU_KM;
  return 0;
}

// Returns the relative position { x, y, z } in scene units for a body.
// The ecliptic plane maps to the XZ plane, with ecliptic north as +Y.
export function relativePosition(orbit, timeMs) {
  if (!orbit) return { x: 0, y: 0, z: 0 };

  const a = semiMajorAxisKm(orbit);
  const e = orbit.e || 0;
  const inc = (orbit.iDeg || 0) * DEG;
  const node = (orbit.nodeDeg || 0) * DEG;
  const peri = (orbit.periDeg || 0) * DEG;

  const period = Math.abs(orbit.periodDays) || 1;
  const direction = orbit.retrograde ? -1 : 1;
  const n = (2 * Math.PI) / (period * DAY_MS);
  const M = normalizeAngle((orbit.m0Deg || 0) * DEG + direction * n * (timeMs - J2000_MS));

  const E = solveEccentricAnomaly(M, e);

  // Position in the orbital plane, periapsis on +x.
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);

  // Rotate by argument of periapsis, inclination, then ascending node.
  const cw = Math.cos(peri), sw = Math.sin(peri);
  const x1 = xp * cw - yp * sw;
  const y1 = xp * sw + yp * cw;

  const ci = Math.cos(inc), si = Math.sin(inc);
  const y2 = y1 * ci;
  const z2 = y1 * si;

  const cn = Math.cos(node), sn = Math.sin(node);
  const xe = x1 * cn - y2 * sn;
  const ye = x1 * sn + y2 * cn;
  const ze = z2;

  return {
    x: xe / KM_PER_UNIT,
    y: ze / KM_PER_UNIT,
    z: -ye / KM_PER_UNIT
  };
}

// Sample a full closed orbit as an array of { x, y, z } scene-space points.
// Uses the same element set so the line matches the body's motion.
export function sampleOrbit(orbit, segments = 256) {
  const points = [];
  if (!orbit) return points;

  const a = semiMajorAxisKm(orbit);
  const e = orbit.e || 0;
  const inc = (orbit.iDeg || 0) * DEG;
  const node = (orbit.nodeDeg || 0) * DEG;
  const peri = (orbit.periDeg || 0) * DEG;

  const cw = Math.cos(peri), sw = Math.sin(peri);
  const ci = Math.cos(inc), si = Math.sin(inc);
  const cn = Math.cos(node), sn = Math.sin(node);

  for (let s = 0; s <= segments; s++) {
    const E = (s / segments) * Math.PI * 2;
    const xp = a * (Math.cos(E) - e);
    const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);

    const x1 = xp * cw - yp * sw;
    const y1 = xp * sw + yp * cw;

    const y2 = y1 * ci;
    const z2 = y1 * si;

    const xe = x1 * cn - y2 * sn;
    const ye = x1 * sn + y2 * cn;

    points.push({
      x: xe / KM_PER_UNIT,
      y: z2 / KM_PER_UNIT,
      z: -ye / KM_PER_UNIT
    });
  }
  return points;
}
