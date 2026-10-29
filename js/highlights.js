// Highlight pins: a small yellow triangle pointing down at the location of a
// featured article. Body-anchored pins follow the body; point-anchored pins sit
// at a fixed spot (e.g. a region of the asteroid belt).

import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { AU_KM, KM_PER_UNIT } from './config.js?v=12';

export function createHighlights({ highlights, scene, records, onActivate }) {
  const pins = [];

  for (const highlight of highlights) {
    let parent = null;
    let position = null;

    if (highlight.body && records.get(highlight.body)) {
      parent = records.get(highlight.body).pivot;
    } else if (highlight.point) {
      const a = (highlight.point.aAU * AU_KM) / KM_PER_UNIT;
      const ang = (highlight.point.angleDeg || 0) * (Math.PI / 180);
      position = { x: a * Math.cos(ang), y: 0, z: a * Math.sin(ang) };
    } else {
      continue;
    }

    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'highlight-pin';
    el.title = highlight.title;
    el.setAttribute('aria-label', highlight.title);
    el.innerHTML = '<span class="pin-triangle"></span>';
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      onActivate(highlight);
    });

    const obj = new CSS2DObject(el);
    // Bottom-centre of the element is the anchor, so the triangle points down
    // at the body.
    obj.center.set(0.5, 1);
    obj.renderOrder = 200;

    if (parent) {
      parent.add(obj);
    } else {
      obj.position.set(position.x, position.y, position.z);
      scene.add(obj);
    }

    pins.push({ highlight, el, obj });
  }

  return { pins };
}
