// Highlight pins: a small yellow triangle pointing down at the location of a
// featured article. Body-anchored pins follow the body; orbit-anchored pins
// move along a real Keplerian orbit. Hovering a pin and its sidebar entry are
// linked through the onHover callback.

import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { relativePosition } from './kepler.js?v=14';
import { AU_KM, KM_PER_UNIT } from './config.js?v=14';

export function createHighlights({ highlights, scene, records, onActivate, onHover }) {
  const pins = [];
  const orbiting = [];
  const elements = new Map();

  for (const highlight of highlights) {
    let parent = null;
    let fixedPosition = null;
    let orbit = null;

    if (highlight.body && records.get(highlight.body)) {
      parent = records.get(highlight.body).pivot;
    } else if (highlight.orbit) {
      orbit = highlight.orbit;
    } else if (highlight.point) {
      const a = (highlight.point.aAU * AU_KM) / KM_PER_UNIT;
      const ang = (highlight.point.angleDeg || 0) * (Math.PI / 180);
      fixedPosition = { x: a * Math.cos(ang), y: 0, z: a * Math.sin(ang) };
    } else {
      continue;
    }

    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'highlight-pin';
    el.title = highlight.title;
    el.setAttribute('aria-label', highlight.title);
    el.dataset.highlightId = highlight.id;
    el.innerHTML = '<span class="pin-triangle"></span>';
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      onActivate(highlight);
    });
    el.addEventListener('pointerenter', () => {
      if (onHover) onHover(highlight.id, true);
      else el.classList.add('is-hover');
    });
    el.addEventListener('pointerleave', () => {
      if (onHover) onHover(highlight.id, false);
      else el.classList.remove('is-hover');
    });

    const obj = new CSS2DObject(el);
    // Bottom-centre of the element is the anchor, so the triangle points down
    // at the body.
    obj.center.set(0.5, 1);
    obj.renderOrder = 200;

    if (parent) {
      parent.add(obj);
    } else {
      const p = fixedPosition || relativePosition(orbit, Date.now());
      obj.position.set(p.x, p.y, p.z);
      scene.add(obj);
      if (orbit) orbiting.push({ obj, orbit });
    }

    elements.set(highlight.id, el);
    pins.push({ highlight, el, obj });
  }

  // Advance the orbit-anchored pins on their Kepler orbits.
  function update(timeMs) {
    for (const item of orbiting) {
      const p = relativePosition(item.orbit, timeMs);
      item.obj.position.set(p.x, p.y, p.z);
    }
  }

  // Highlight a pin from the sidebar.
  function setHover(id, on) {
    const el = elements.get(id);
    if (el) el.classList.toggle('is-hover', on);
  }

  return { pins, update, setHover };
}
