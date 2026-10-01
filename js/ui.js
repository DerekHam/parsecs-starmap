// DOM overlay: toolbar, search, info panel, breadcrumb and time controls.

import { BODY_TYPES, AU_KM } from './config.js?v=10';

const WIKI_BASE = 'https://parsecs.fandom.com/wiki/';

function wikiUrl(body) {
  return body.wiki || `${WIKI_BASE}Special:Search?query=${encodeURIComponent(body.name)}`;
}

function formatDate(ms) {
  const d = new Date(ms);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC'
  });
}

function typeLabel(type) {
  return (BODY_TYPES[type] && BODY_TYPES[type].label) || type;
}

export function createUI({ engine, systemData, markers, records, onSelect, onToggleOrbits, onResetView, onUp }) {
  const $ = (id) => document.getElementById(id);

  const el = {
    navUp: $('nav-up'),
    breadcrumb: $('breadcrumb'),
    search: $('search-input'),
    results: $('search-results'),
    legend: $('legend'),
    infoPanel: $('info-panel'),
    infoType: $('info-type'),
    infoName: $('info-name'),
    infoDesc: $('info-desc'),
    infoMeta: $('info-meta'),
    infoLink: $('info-link'),
    infoChildren: $('info-children'),
    infoClose: $('info-close'),
    resetView: $('reset-view'),
    toggleMarkers: $('toggle-markers'),
    toggleLabels: $('toggle-labels'),
    toggleOrbits: $('toggle-orbits'),
    toggleInhabited: $('toggle-inhabited'),
    timePlay: $('time-play'),
    timeSpeed: $('time-speed'),
    timeSlider: $('time-slider'),
    timeDate: $('time-date'),
    time2206: $('time-2206'),
    timeNow: $('time-now')
  };

  const filters = { markers: true, labels: true, orbits: true, inhabitedOnly: false };
  const byId = new Map(systemData.bodies.map((b) => [b.id, b]));

  function applyFilters() {
    markers.setOptions(filters);
    for (const record of records.values()) {
      if (record.orbitLine) record.orbitLine.visible = filters.orbits;
      // The belt is decorative and is shown/hidden with the labels.
      if (record.data && record.data.type === 'belt' && record.mesh) {
        record.mesh.visible = filters.labels;
      }
    }
    if (onToggleOrbits) onToggleOrbits(filters.orbits);
    el.toggleOrbits.setAttribute('aria-pressed', String(filters.orbits));
  }

  function buildLegend() {
    const seen = new Set();
    for (const body of systemData.bodies) {
      if (seen.has(body.type) || !BODY_TYPES[body.type]) continue;
      seen.add(body.type);
      const li = document.createElement('li');
      const sw = document.createElement('span');
      sw.className = 'swatch';
      sw.style.background = BODY_TYPES[body.type].color;
      li.append(sw, document.createTextNode(typeLabel(body.type)));
      el.legend.appendChild(li);
    }
  }

  // ---------- Search ----------
  const searchIndex = systemData.bodies
    .map((b) => ({
      body: b,
      haystack: `${b.name} ${b.type} ${(b.tags || []).join(' ')}`.toLowerCase()
    }))
    .sort((a, b) => a.body.name.localeCompare(b.body.name));

  function runSearch(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      el.results.hidden = true;
      el.results.innerHTML = '';
      return;
    }
    const matches = searchIndex.filter((item) => item.haystack.includes(q)).slice(0, 8);
    el.results.innerHTML = '';
    if (!matches.length) {
      const div = document.createElement('div');
      div.className = 'search-item';
      div.textContent = 'No matches';
      el.results.appendChild(div);
    } else {
      for (const { body } of matches) {
        const btn = document.createElement('button');
        btn.className = 'search-item';
        btn.innerHTML = `<span>${body.name}</span><span class="type">${typeLabel(body.type)}</span>`;
        btn.addEventListener('click', () => {
          el.search.value = '';
          el.results.hidden = true;
          onSelect(body.id);
        });
        el.results.appendChild(btn);
      }
    }
    el.results.hidden = false;
  }

  // ---------- Info panel ----------
  function showInfo(body, chain) {
    const record = records.get(body.id);
    el.infoType.textContent = typeLabel(body.type) + (body.inhabited ? ' · inhabited' : '');
    el.infoName.textContent = body.name;
    el.infoDesc.textContent = body.description || 'No description recorded yet.';

    el.infoMeta.innerHTML = '';
    const pushMeta = (text) => {
      const s = document.createElement('span');
      s.textContent = text;
      el.infoMeta.appendChild(s);
    };
    if (body.parent) {
      const parent = byId.get(body.parent);
      if (parent) pushMeta(`Orbits ${parent.name}`);
    }
    const aKm = body.orbit && (body.orbit.aKm || (body.orbit.aAU ? body.orbit.aAU * AU_KM : 0));
    if (aKm) {
      const au = aKm / AU_KM;
      pushMeta(au >= 0.1 ? `${au.toFixed(3)} AU` : `${Math.round(aKm).toLocaleString()} km`);
    }
    if (body.radiusKm) pushMeta(`Radius ${Math.round(body.radiusKm).toLocaleString()} km`);
    if (body.orbit && body.orbit.periodDays) {
      const p = Math.abs(body.orbit.periodDays);
      pushMeta(p >= 1 ? `${p.toFixed(2)} d period` : `${(p * 24).toFixed(1)} h period`);
    }

    el.infoLink.href = wikiUrl(body);

    el.infoChildren.innerHTML = '';
    const children = systemData.bodies.filter((b) => b.parent === body.id);
    if (children.length) {
      const title = document.createElement('div');
      title.className = 'child-title';
      title.textContent = `Bodies at ${body.name}`;
      el.infoChildren.appendChild(title);
      for (const child of children) {
        const btn = document.createElement('button');
        btn.className = 'child-btn';
        btn.innerHTML = `<span>${child.name}</span><span class="type">${typeLabel(child.type)}</span>`;
        btn.addEventListener('click', () => onSelect(child.id));
        el.infoChildren.appendChild(btn);
      }
    }

    el.infoPanel.hidden = false;
    void record;
  }

  function hideInfo() {
    el.infoPanel.hidden = true;
  }

  function renderBreadcrumb(chain) {
    el.navUp.disabled = chain.length === 0;
    el.breadcrumb.innerHTML = '';
    const make = (label, current) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      if (current) btn.classList.add('current');
      return btn;
    };
    const root = document.createElement('button');
    root.textContent = systemData.name;
    root.addEventListener('click', () => onResetView());
    el.breadcrumb.appendChild(root);

    chain.forEach((body, index) => {
      const sep = document.createElement('span');
      sep.className = 'sep';
      sep.textContent = '›';
      el.breadcrumb.appendChild(sep);
      const btn = make(body.name, index === chain.length - 1);
      if (index !== chain.length - 1) btn.addEventListener('click', () => onSelect(body.id));
      el.breadcrumb.appendChild(btn);
    });
  }

  // ---------- Time ----------
  function timeToSlider(ms) {
    return ((ms - engine.min) / (engine.max - engine.min)) * 1000;
  }
  function sliderToTime(value) {
    return engine.min + (value / 1000) * (engine.max - engine.min);
  }

  function syncTimeUI() {
    el.timeSlider.value = String(timeToSlider(engine.current));
    el.timeDate.textContent = formatDate(engine.current);
    el.timePlay.textContent = engine.playing ? '❚❚' : '▶';
  }

  function init() {
    buildLegend();
    applyFilters();

    el.toggleMarkers.addEventListener('click', () => {
      filters.markers = !filters.markers;
      el.toggleMarkers.setAttribute('aria-pressed', String(filters.markers));
      applyFilters();
    });
    el.toggleLabels.addEventListener('click', () => {
      filters.labels = !filters.labels;
      el.toggleLabels.setAttribute('aria-pressed', String(filters.labels));
      applyFilters();
    });
    el.toggleOrbits.addEventListener('click', () => {
      filters.orbits = !filters.orbits;
      applyFilters();
    });
    el.toggleInhabited.addEventListener('click', () => {
      filters.inhabitedOnly = !filters.inhabitedOnly;
      el.toggleInhabited.setAttribute('aria-pressed', String(filters.inhabitedOnly));
      applyFilters();
    });

    el.navUp.addEventListener('click', () => {
      if (!el.navUp.disabled) onUp();
    });

    el.resetView.addEventListener('click', () => onResetView());
    el.infoClose.addEventListener('click', () => {
      hideInfo();
      onResetView();
    });

    el.search.addEventListener('input', (e) => runSearch(e.target.value));
    el.search.addEventListener('focus', (e) => runSearch(e.target.value));
    document.addEventListener('click', (e) => {
      if (!el.results.contains(e.target) && e.target !== el.search) el.results.hidden = true;
    });

    el.timeSlider.addEventListener('input', (e) => {
      engine.pause();
      engine.set(sliderToTime(Number(e.target.value)));
    });
    el.timePlay.addEventListener('click', () => engine.toggle());
    el.timeSpeed.addEventListener('change', (e) => engine.setSpeed(Number(e.target.value)));
    el.time2206.addEventListener('click', () => {
      engine.pause();
      engine.set(Date.UTC(2206, 0, 1));
    });
    el.timeNow.addEventListener('click', () => {
      engine.pause();
      engine.now();
    });

    engine.onChange(syncTimeUI);
    engine.setSpeed(Number(el.timeSpeed.value));
    syncTimeUI();
  }

  return { init, showInfo, hideInfo, renderBreadcrumb, syncTimeUI, filters };
}
