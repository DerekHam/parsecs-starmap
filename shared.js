// ============================================
// SHARED UTILITIES - Used by all views
// ============================================

// Reference epoch (Jan 1, 2000) for orbital calculations
const referenceEpoch = new Date('2000-01-01T00:00:00Z').getTime();

// Orbital periods for all celestial bodies (in Earth days)
const celestialOrbits = {
  Mercury: { period: 87.97 },
  Venus: { period: 224.70 },
  Earth: { period: 365.25 },
  Mars: { period: 686.97 },
  Jupiter: { period: 4332.59 },
  Saturn: { period: 10759.22 },
  Uranus: { period: 30688.5 },
  Neptune: { period: 60182.0 },
  Moon: { period: 27.3 },
  Phobos: { period: 0.319 },
  Deimos: { period: 1.262 },
  Io: { period: 1.769 },
  Europa: { period: 3.551 },
  Titan: { period: 15.945 },
  Triton: { period: 5.877 },
  ISS: { period: 0.067 }
};

// Calculate orbital position based on time
function calculateOrbitalPosition(objectName, time) {
  const orbit = celestialOrbits[objectName];
  if (!orbit) return 0;

  const timeDiff = time.getTime() - referenceEpoch;
  const daysElapsed = timeDiff / (1000 * 60 * 60 * 24);
  const angle = ((daysElapsed / orbit.period) * 360) % 360;
  return (angle * Math.PI) / 180;
}

// Create SVG gradients and filters
function createGradients(svg) {
  let defs = svg.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svg.appendChild(defs);
  }

  const gradients = {
    sun: { colors: ['#FDB813', '#FD8813'] },
    Mercury: { colors: ['#8C7853', '#C0C0C0'] },
    Venus: { colors: ['#FFC649', '#FFE5B4'] },
    Earth: { colors: ['#4A90E2', '#2ECC71'] },
    Mars: { colors: ['#E27B58', '#A84C3A'] },
    Jupiter: { colors: ['#DAA520', '#B8860B'] },
    Saturn: { colors: ['#F4A460', '#DEB887'] },
    Uranus: { colors: ['#4FD0E7', '#87CEEB'] },
    Neptune: { colors: ['#4166F5', '#2E5CE6'] },
    Moon: { colors: ['#D3D3D3', '#A9A9A9'] },
    'Luna/The Moon': { colors: ['#D3D3D3', '#A9A9A9'] },
    Phobos: { colors: ['#8B8B83', '#696969'] },
    Deimos: { colors: ['#A9A9A9', '#808080'] },
    Io: { colors: ['#FFD700', '#FFA500'] },
    Europa: { colors: ['#E8DCC4', '#D2B48C'] },
    Ganymede: { colors: ['#C0A080', '#8B7765'] },
    Callisto: { colors: ['#696969', '#505050'] },
    Titan: { colors: ['#FF8C00', '#FFB347'] },
    Titania: { colors: ['#B0C4DE', '#8FA0C0'] },
    Triton: { colors: ['#B0C4DE', '#87CEEB'] },
    'Luna | The Moon': { colors: ['#D3D3D3', '#A9A9A9'] }
  };

  for (const [name, grad] of Object.entries(gradients)) {
    // Escape special characters in the name for use as ID
    const escapedName = name.replace(/[^a-zA-Z0-9-_]/g, '_');
    if (!defs.querySelector(`#gradient-${escapedName}`)) {
      const radialGrad = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
      radialGrad.id = `gradient-${escapedName}`;
      radialGrad.setAttribute('cx', '35%');
      radialGrad.setAttribute('cy', '35%');

      const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop1.setAttribute('offset', '0%');
      stop1.setAttribute('stop-color', grad.colors[0]);
      radialGrad.appendChild(stop1);

      const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop2.setAttribute('offset', '100%');
      stop2.setAttribute('stop-color', grad.colors[1]);
      radialGrad.appendChild(stop2);

      defs.appendChild(radialGrad);
    }
  }

  // Add glow filter
  if (!defs.querySelector('#glow')) {
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.id = 'glow';
    filter.setAttribute('x', '-100%');
    filter.setAttribute('y', '-100%');
    filter.setAttribute('width', '300%');
    filter.setAttribute('height', '300%');

    const blur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
    blur.setAttribute('stdDeviation', '3');
    blur.setAttribute('result', 'coloredBlur');
    filter.appendChild(blur);

    const merge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
    const mergeNode1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    mergeNode1.setAttribute('in', 'coloredBlur');
    const mergeNode2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    mergeNode2.setAttribute('in', 'SourceGraphic');
    merge.appendChild(mergeNode1);
    merge.appendChild(mergeNode2);
    filter.appendChild(merge);

    defs.appendChild(filter);
  }
}

// Get or create zoom group
function getZoomGroup(svg) {
  let group = svg.querySelector('#zoom-group');
  if (!group) {
    group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.id = 'zoom-group';
    svg.appendChild(group);
  }
  return group;
}

// Update SVG transform (zoom and pan)
function updateTransform(svg, zoom, panX, panY) {
  const group = getZoomGroup(svg);
  group.setAttribute('transform', `translate(${panX}, ${panY}) scale(${zoom})`);
}

// Generate random stars
function generateStars(group, numStars = 1000) {
  for (let i = 0; i < numStars; i++) {
    const x = (Math.random() - 0.5) * 10000;
    const y = (Math.random() - 0.5) * 7500;
    const r = Math.random() * 0.5 + 0.5;
    const star = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    star.setAttribute('cx', x);
    star.setAttribute('cy', y);
    star.setAttribute('r', r);
    star.setAttribute('fill', 'white');
    star.setAttribute('opacity', Math.random() * 0.5 + 0.5);
    group.appendChild(star);
  }
}

// Create a circle for a celestial body
function createCircle(cx, cy, r, name, data, onClickCallback) {
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', cx);
  circle.setAttribute('cy', cy);
  circle.setAttribute('r', r);
  circle.setAttribute('fill', `url(#gradient-${name})`);
  circle.setAttribute('filter', 'url(#glow)');
  circle.setAttribute('stroke', 'rgba(255, 255, 255, 0.3)');
  circle.setAttribute('stroke-width', '0.5');
  if (onClickCallback) {
    circle.addEventListener('click', (e) => {
      e.stopPropagation();
      onClickCallback(data);
    });
  }
  return circle;
}

// Create moon icon (fixed size, doesn't scale with zoom)
function createMoonIcon(cx, cy, name, data, onClickCallback, zoom) {
  const iconGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const scale = 1 / Math.max(zoom, 0.1);
  iconGroup.setAttribute('transform', `translate(${cx}, ${cy}) scale(${scale})`);
  iconGroup.setAttribute('class', 'moon-icon');
  
  // Moon dot
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', 0);
  circle.setAttribute('cy', 0);
  circle.setAttribute('r', 8);
  circle.setAttribute('fill', `url(#gradient-${name})`);
  circle.setAttribute('stroke', 'rgba(255, 255, 255, 0.5)');
  circle.setAttribute('stroke-width', '1');
  circle.setAttribute('filter', 'url(#glow)');
  circle.setAttribute('style', 'cursor: pointer;');
  
  if (onClickCallback) {
    circle.addEventListener('click', (e) => {
      e.stopPropagation();
      onClickCallback(data);
    });
  }
  
  iconGroup.appendChild(circle);
  return iconGroup;
}

// Create station icon (fixed size, doesn't scale with zoom)
// Hexagon shape resembling a space station hub
function createStationIcon(group, cx, cy, size, data, onClickCallback, zoom) {
  const iconGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const scale = zoom ? (1 / Math.max(zoom, 0.1)) : 1;
  iconGroup.setAttribute('transform', `translate(${cx}, ${cy}) scale(${scale})`);
  iconGroup.setAttribute('class', 'station-icon');
  
  // Draw hexagon (space station hub)
  const hexSize = 8;
  
  // Create hexagon points
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60 - 90) * (Math.PI / 180);
    const x = hexSize * Math.cos(angle);
    const y = hexSize * Math.sin(angle);
    points.push([x, y]);
  }
  
  // Draw hexagon fill
  const hexagon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  const pointsStr = points.map(p => `${p[0]},${p[1]}`).join(' ');
  hexagon.setAttribute('points', pointsStr);
  hexagon.setAttribute('fill', '#64c8ff');
  hexagon.setAttribute('opacity', '0.7');
  hexagon.setAttribute('stroke', '#00ffff');
  hexagon.setAttribute('stroke-width', '1.5');
  hexagon.setAttribute('filter', 'url(#glow)');
  hexagon.setAttribute('style', 'cursor: pointer;');
  
  if (onClickCallback) {
    hexagon.addEventListener('click', (e) => {
      e.stopPropagation();
      onClickCallback(data);
    });
  }
  
  iconGroup.appendChild(hexagon);
  
  // Add solar panel extensions (small rectangles on 4 sides)
  const panelPositions = [
    { x: 0, y: -hexSize - 6, width: 4, height: 6 },  // top
    { x: hexSize + 6, y: -3, width: 6, height: 6 },  // right
    { x: 0, y: hexSize + 6, width: 4, height: 6 },   // bottom
    { x: -hexSize - 6, y: -3, width: 6, height: 6 }  // left
  ];
  
  panelPositions.forEach(panel => {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', panel.x - panel.width / 2);
    rect.setAttribute('y', panel.y - panel.height / 2);
    rect.setAttribute('width', panel.width);
    rect.setAttribute('height', panel.height);
    rect.setAttribute('fill', '#64c8ff');
    rect.setAttribute('opacity', '0.5');
    rect.setAttribute('stroke', '#00ffff');
    rect.setAttribute('stroke-width', '1');
    rect.setAttribute('filter', 'url(#glow)');
    iconGroup.appendChild(rect);
  });
  
  group.appendChild(iconGroup);
}

// Draw Saturn's rings
function drawSaturnRings(group) {
  const ringData = [
    { radius: 75, width: 10, opacity: 0.6, color: '#D4A574' },
    { radius: 72.5, width: 1, opacity: 0.3, color: '#8B7355' },
    { radius: 66, width: 12, opacity: 0.7, color: '#E8DCC4' },
    { radius: 57.5, width: 5, opacity: 0.4, color: '#C9B98D' },
    { radius: 53.5, width: 3, opacity: 0.2, color: '#A39D7A' }
  ];

  ringData.forEach(ring => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', 0);
    circle.setAttribute('cy', 0);
    circle.setAttribute('r', ring.radius);
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', ring.color);
    circle.setAttribute('stroke-width', ring.width);
    circle.setAttribute('opacity', ring.opacity);
    group.appendChild(circle);
  });
}
