// Bootstrap: load data, build the scene, wire interaction, run the loop.

import * as THREE from 'three';
import { createScene } from './scene.js?v=10';
import { createBodies, updateBodies } from './bodies.js?v=10';
import { loadAssets } from './assets.js?v=10';
import { createOrbitLines } from './orbits.js?v=10';
import { createMarkers } from './markers.js?v=10';
import { createFocus } from './focus.js?v=10';
import { createUI } from './ui.js?v=10';
import { TimeEngine } from './time.js?v=10';

async function loadSystem() {
  const indexRes = await fetch('data/systems.json');
  if (!indexRes.ok) throw new Error(`systems.json: ${indexRes.status}`);
  const index = await indexRes.json();
  if (!index.systems || !index.systems.length) throw new Error('No systems defined.');

  const system = index.systems[0];
  const res = await fetch(system.file);
  if (!res.ok) throw new Error(`${system.file}: ${res.status}`);
  return res.json();
}

function showError(message) {
  const box = document.createElement('div');
  box.className = 'error';
  box.innerHTML =
    `<b>Could not start the starmap.</b><br>${message}<br><br>` +
    `If you opened this file directly, run a small local web server instead, ` +
    `e.g. <code>python3 -m http.server</code> inside the site folder.`;
  document.body.appendChild(box);
}

async function main() {
  let systemData;
  try {
    systemData = await loadSystem();
  } catch (err) {
    showError(err.message);
    return;
  }

  const viewport = document.getElementById('viewport');
  const labelContainer = document.getElementById('labels');
  const { scene, camera, renderer, labelRenderer, controls } = createScene(viewport, labelContainer);

  const assets = await loadAssets(systemData);
  const { records } = createBodies(systemData, scene, assets);
  createOrbitLines(systemData, records);

  const engine = new TimeEngine();
  const byId = new Map(systemData.bodies.map((b) => [b.id, b]));

  // Self-report the running build so it is obvious whether new code executed.
  const buildInfo = document.getElementById('build-info');
  if (buildInfo) {
    buildInfo.textContent =
      `build v10 · ${systemData.bodies.length} bodies · belt ${byId.has('belt') ? 'yes' : 'no'}`;
  }
  console.log('[Parsecs] build v10 loaded:', systemData.name, systemData.bodies.length, 'bodies');

  const focus = createFocus({ camera, controls, records, systemData });

  function selectBody(id, { fromHash = false, instant = false } = {}) {
    const body = byId.get(id);
    if (!body) return;
    focus.focus(id, { animate: !instant });
    const chain = focus.ancestors(id);
    ui.showInfo(body, chain);
    ui.renderBreadcrumb(chain);
    if (!fromHash && location.hash.slice(1) !== id) {
      history.pushState({ id }, '', `#${id}`);
    }
  }

  function resetView({ fromHash = false } = {}) {
    focus.overview();
    ui.hideInfo();
    ui.renderBreadcrumb([]);
    if (!fromHash && location.hash) {
      history.pushState(null, '', location.pathname);
    }
  }

  // Move up one level: Luna -> Earth, Earth -> the solar system.
  function goUp() {
    const current = focus.selectedId;
    if (!current) return;
    const body = byId.get(current);
    if (body && body.parent) selectBody(body.parent);
    else resetView();
  }

  const markers = createMarkers(systemData, records, selectBody);

  const ui = createUI({
    engine,
    systemData,
    markers,
    records,
    onSelect: selectBody,
    onToggleOrbits: null,
    onResetView: resetView,
    onUp: goUp
  });
  ui.init();

  // Keyboard: Escape / Backspace go up one level.
  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (e.key === 'Escape' || e.key === 'Backspace') {
      e.preventDefault();
      goUp();
    }
  });

  // Ray-pick actual meshes (markers remain the primary target).
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const meshes = [...records.values()].map((r) => r.mesh).filter(Boolean);
  let downX = 0, downY = 0;

  renderer.domElement.addEventListener('pointerdown', (e) => {
    downX = e.clientX;
    downY = e.clientY;
  });

  renderer.domElement.addEventListener('pointerup', (e) => {
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 5) return;
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(meshes, false);
    if (hits.length) {
      const id = hits[0].object.userData.bodyId;
      if (id && id !== 'belt') selectBody(id);
    }
  });

  window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    labelRenderer.setSize(w, h);
  });

  // Default to the story era so the map opens in-period, then place bodies
  // before any deep link is applied.
  engine.set(Date.UTC(2206, 0, 1));
  updateBodies(systemData, records, engine.current);

  // Deep links and browser back/forward.
  function applyHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id && byId.has(id)) selectBody(id, { fromHash: true });
    else resetView({ fromHash: true });
  }
  window.addEventListener('hashchange', applyHash);
  window.addEventListener('popstate', applyHash);

  const initialHash = decodeURIComponent(location.hash.slice(1));
  if (initialHash && byId.has(initialHash)) selectBody(initialHash, { fromHash: true, instant: true });

  const labelProbe = new THREE.Vector3();
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.1);
    engine.update(dt);
    updateBodies(systemData, records, engine.current);
    focus.update(dt);
    markers.update(camera, labelProbe);
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }
  animate();

  document.getElementById('loading').classList.add('hidden');
}

main();
