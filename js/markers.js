// Fixed-screen-size navigation markers (CSS2D) for every body.
// Icons stay the same pixel size at any distance, which is what makes a
// true-scale map navigable. Major bodies (star, planets, dwarf planets and
// asteroids) always carry a label; satellites show theirs on hover only.

import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { AU_KM, KM_PER_UNIT } from './config.js?v=10';

// CSS2DRenderer sorts on renderOrder before camera distance, so a larger value
// keeps major bodies on top of their satellites for overlapping clicks.
const RENDER_ORDER = {
  star: 60,
  planet: 50,
  dwarf: 40,
  asteroid: 35,
  belt: 30,
  moon: 20,
  station: 10
};

function orbitUnits(orbit) {
  if (!orbit) return 0;
  if (orbit.aKm != null) return orbit.aKm / KM_PER_UNIT;
  if (orbit.aAU != null) return (orbit.aAU * AU_KM) / KM_PER_UNIT;
  return 0;
}

export function createMarkers(systemData, records, onSelect) {
  const entries = [];

  // Largest satellite orbit per parent, used to size the reveal distance.
  const extentCache = new Map();
  function childExtent(parentId) {
    if (extentCache.has(parentId)) return extentCache.get(parentId);
    let max = 0;
    for (const b of systemData.bodies) {
      if (b.parent === parentId && b.orbit) max = Math.max(max, orbitUnits(b.orbit));
    }
    extentCache.set(parentId, max);
    return max;
  }

  // Camera distance (scene units) under which a satellite's label appears.
  function revealRange(body) {
    const a = orbitUnits(body.orbit);
    const parentExtent = childExtent(body.parent);
    return Math.max(a * 8, parentExtent * 6, 60);
  }

  for (const body of systemData.bodies) {
    // The belt has no marker of its own; its particles are toggled with labels.
    if (body.type === 'belt') continue;
    const record = records.get(body.id);
    if (!record) continue;

    const isSatellite = body.type === 'moon' || body.type === 'station';

    const el = document.createElement('button');
    el.type = 'button';
    el.className = `marker marker--${body.type}${body.inhabited ? ' is-inhabited' : ''}`;
    // Satellites start hidden until the camera is close enough.
    if (isSatellite) el.classList.add('no-label');
    el.dataset.id = body.id;
    el.title = body.name;
    el.innerHTML =
      `<span class="marker-dot" style="background:${body.color || 'var(--moon)'}"></span>` +
      `<span class="marker-label">${escapeHtml(body.name)}</span>`;

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      onSelect(body.id);
    });
    el.addEventListener('pointerenter', () => el.classList.add('is-hover'));
    el.addEventListener('pointerleave', () => el.classList.remove('is-hover'));

    const css2d = new CSS2DObject(el);
    css2d.renderOrder = RENDER_ORDER[body.type] || 0;
    record.pivot.add(css2d);
    record.markerEl = el;

    entries.push({
      body,
      el,
      css2d,
      isSatellite,
      range: isSatellite ? revealRange(body) : Infinity
    });
  }

  // Visibility must be toggled on the CSS2DObject; CSS2DRenderer overwrites the
  // element's inline display every frame.
  function setOptions({ markers = true, labels = true, inhabitedOnly = false } = {}) {
    for (const { body, el, css2d } of entries) {
      css2d.visible = markers && (!inhabitedOnly || body.inhabited);
      el.classList.toggle('labels-off', !labels);
    }
  }

  // Per-frame: reveal satellite labels once the camera is close to the planet.
  function update(camera, tmpVec) {
    for (const entry of entries) {
      if (!entry.isSatellite) continue;
      entry.css2d.getWorldPosition(tmpVec);
      const d = camera.position.distanceTo(tmpVec);
      entry.el.classList.toggle('no-label', d >= entry.range);
    }
  }

  return { entries, setOptions, update };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
