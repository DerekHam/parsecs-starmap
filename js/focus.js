// Camera fly-to and drill-down helpers.

import * as THREE from 'three';
import { AU_KM, KM_PER_UNIT } from './config.js?v=10';

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export function createFocus({ camera, controls, records, systemData }) {
  let anim = null;
  let selectedId = null;
  // Last position we centred on, used to keep a moving body in view.
  const lastTarget = new THREE.Vector3();

  const byId = new Map(systemData.bodies.map((b) => [b.id, b]));

  function worldPosition(id) {
    const body = byId.get(id);
    // The belt's marker sits at a fixed point on the annulus, not at its pivot.
    if (body && body.type === 'belt' && body.marker) {
      const a = (body.marker.aAU * AU_KM) / KM_PER_UNIT;
      const ang = (body.marker.angleDeg || 0) * (Math.PI / 180);
      return new THREE.Vector3(a * Math.cos(ang), 0, a * Math.sin(ang));
    }
    const record = records.get(id);
    if (!record) return new THREE.Vector3();
    return record.pivot.getWorldPosition(new THREE.Vector3());
  }

  function orbitUnits(orbit) {
    if (!orbit) return 0;
    if (orbit.aKm != null) return orbit.aKm / KM_PER_UNIT;
    if (orbit.aAU != null) return (orbit.aAU * AU_KM) / KM_PER_UNIT;
    return 0;
  }

  function viewDistance(body) {
    if (!body.parent) return 3200000; // star: frame the whole system
    if (body.type === 'belt') return orbitUnits(body.orbit) * 2.2; // frame the belt
    const radius = Math.max(body.radiusKm / KM_PER_UNIT, 1e-5);

    let extent = 0;
    for (const other of systemData.bodies) {
      if (other.parent !== body.id) continue;
      extent = Math.max(extent, orbitUnits(other.orbit));
    }

    // Frame the body itself, expanding to include its satellite system.
    let distance = Math.max(radius * 9, extent * 1.8, 0.05);

    // Stations are effectively points, so give them context from their planet.
    if (body.type === 'station') {
      const parent = records.get(body.parent);
      if (parent) {
        distance = Math.max(distance, (parent.data.radiusKm / KM_PER_UNIT) * 2.5);
      }
    }
    return distance;
  }

  function focus(id, { animate = true } = {}) {
    const body = byId.get(id);
    if (!body) return;
    selectedId = id;

    const target = worldPosition(id);
    const distance = viewDistance(body);
    lastTarget.copy(target);

    let dir = camera.position.clone().sub(controls.target);
    if (dir.lengthSq() < 1e-9) dir.set(0, 0.45, 1);
    dir.normalize();

    const toPos = target.clone().add(dir.multiplyScalar(distance));
    const fromPos = camera.position.clone();
    const fromTarget = controls.target.clone();

    if (!animate) {
      camera.position.copy(toPos);
      controls.target.copy(target);
      controls.update();
      return;
    }

    anim = { fromPos, toPos, fromTarget, toTarget: target, t: 0, duration: 0.9 };
  }

  function overview() {
    selectedId = null;
    const toPos = new THREE.Vector3(0, 2600000, 4200000);
    anim = {
      fromPos: camera.position.clone(),
      toPos,
      fromTarget: controls.target.clone(),
      toTarget: new THREE.Vector3(0, 0, 0),
      t: 0,
      duration: 0.9
    };
  }

  function update(dt) {
    // Follow the selected body so it stays centred while time advances.
    if (selectedId) {
      const bp = worldPosition(selectedId);
      const dx = bp.x - lastTarget.x;
      const dy = bp.y - lastTarget.y;
      const dz = bp.z - lastTarget.z;
      if (dx || dy || dz) {
        if (anim) {
          anim.fromPos.x += dx; anim.fromPos.y += dy; anim.fromPos.z += dz;
          anim.toPos.x += dx; anim.toPos.y += dy; anim.toPos.z += dz;
          anim.fromTarget.x += dx; anim.fromTarget.y += dy; anim.fromTarget.z += dz;
          anim.toTarget.x += dx; anim.toTarget.y += dy; anim.toTarget.z += dz;
        } else {
          camera.position.x += dx; camera.position.y += dy; camera.position.z += dz;
          controls.target.x += dx; controls.target.y += dy; controls.target.z += dz;
        }
      }
      lastTarget.copy(bp);
    }

    if (!anim) return;
    anim.t = Math.min(1, anim.t + dt / anim.duration);
    const k = easeInOut(anim.t);
    camera.position.lerpVectors(anim.fromPos, anim.toPos, k);
    controls.target.lerpVectors(anim.fromTarget, anim.toTarget, k);
    controls.update();
    if (anim.t >= 1) anim = null;
  }

  function ancestors(id) {
    const chain = [];
    let current = byId.get(id);
    while (current) {
      chain.unshift(current);
      current = current.parent ? byId.get(current.parent) : null;
    }
    return chain;
  }

  return {
    focus,
    overview,
    update,
    ancestors,
    get selectedId() {
      return selectedId;
    }
  };
}
