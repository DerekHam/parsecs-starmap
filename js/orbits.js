// Orbit path lines, drawn in each body's parent frame.

import * as THREE from 'three';
import { sampleOrbit } from './kepler.js?v=10';
import { BODY_TYPES } from './config.js?v=10';

export function createOrbitLines(systemData, records) {
  const lines = [];

  for (const body of systemData.bodies) {
    if (!body.orbit || body.type === 'belt') continue;
    const record = records.get(body.id);
    if (!record) continue;

    const pts = sampleOrbit(body.orbit, 256);
    if (!pts.length) continue;

    const geometry = new THREE.BufferGeometry().setFromPoints(
      pts.map((p) => new THREE.Vector3(p.x, p.y, p.z))
    );

    const color = new THREE.Color(
      (BODY_TYPES[body.type] && BODY_TYPES[body.type].color) || '#8fb7ff'
    );
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: body.type === 'moon' || body.type === 'station' ? 0.22 : 0.35,
      depthWrite: false
    });

    const line = new THREE.Line(geometry, material);
    // The line lives in the parent frame so it stays put while the body moves.
    if (record.parent) {
      record.parent.pivot.add(line);
    } else {
      line.visible = false;
    }
    record.orbitLine = line;
    lines.push(line);
  }

  return lines;
}
