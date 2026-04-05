// ============================================
// Solar System View
// ============================================

const solarOrbitScale = 100; // px per AU
const centerX = 0;
const centerY = 0;

const planetRadii = {
  sun: 20,
  Mercury: 5,
  Venus: 8,
  Earth: 10,
  Mars: 7,
  Jupiter: 15,
  Saturn: 12,
  Uranus: 10,
  Neptune: 10
};

let solarSvg, modal, modalTitle, modalDescription, modalLink, closeBtn, timeInput, timeResetBtn;
let data = null;
let zoom = 1;
let panX = 0;
let panY = 0;
let isDragging = false;
let startX, startY, startPanX, startPanY;
let currentTime = new Date();

// Draw the solar system
function drawSolarSystem() {
  solarSvg.innerHTML = '';
  zoom = 1;
  panX = 0;
  panY = 0;

  const group = getZoomGroup(solarSvg);
  createGradients(solarSvg);
  updateTransform(solarSvg, zoom, panX, panY);

  generateStars(group);

  // Draw sun
  const sun = createCircle(centerX, centerY, planetRadii.sun, 'sun', data.sun);
  sun.style.pointerEvents = 'none';
  group.appendChild(sun);

  // Draw planets and orbits
  data.planets.forEach(planet => {
    const angle = calculateOrbitalPosition(planet.name, currentTime);
    const distance = planet.orbit * solarOrbitScale;
    const x = centerX + distance * Math.cos(angle);
    const y = centerY + distance * Math.sin(angle);
    const radius = planetRadii[planet.name] || 5;

    // Draw orbit
    const orbit = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    orbit.setAttribute('cx', centerX);
    orbit.setAttribute('cy', centerY);
    orbit.setAttribute('r', distance);
    orbit.setAttribute('fill', 'none');
    orbit.setAttribute('stroke', 'rgba(100, 200, 255, 0.2)');
    orbit.setAttribute('stroke-width', '0.5');
    orbit.setAttribute('stroke-dasharray', '2,2');
    group.appendChild(orbit);

    // Draw planet
    const circle = createCircle(x, y, radius, planet.name, planet, (planetData) => {
      goToPlanet(planetData.name);
    });
    group.appendChild(circle);
  });
}

// Navigate to a planet view
function goToPlanet(planetName) {
  const encoded = encodeURIComponent(planetName);
  const timeParam = new URLSearchParams({ time: currentTime.toISOString() }).toString();
  window.location.href = `planets/${encoded}.html?${timeParam}`;
}

// Show modal with celestial body info
function showModal(item) {
  if (!item) return;
  modalTitle.textContent = item.name || '';
  modalDescription.textContent = item.description || '';
  if (item.wiki) {
    modalLink.href = item.wiki;
    modalLink.textContent = 'View on Wiki';
  }
  modal.style.display = 'block';
}

// Set time input to current time
function setTimeInput() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  timeInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Initialize when page loads
function init() {
  // Get DOM elements
  solarSvg = document.getElementById('solar-system-svg');
  modal = document.getElementById('modal');
  modalTitle = document.getElementById('modal-title');
  modalDescription = document.getElementById('modal-description');
  modalLink = document.getElementById('modal-link');
  closeBtn = document.querySelector('.close');
  timeInput = document.getElementById('time-input');
  timeResetBtn = document.getElementById('time-reset');

  // Load data
  fetch('data/solar_system.json')
    .then(response => response.json())
    .then(json => {
      data = json;
      drawSolarSystem();
    });

  // Close modal
  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });

  // Time controls
  setTimeInput();
  timeInput.addEventListener('change', (e) => {
    currentTime = new Date(e.target.value);
    drawSolarSystem();
  });

  timeResetBtn.addEventListener('click', () => {
    currentTime = new Date();
    setTimeInput();
    drawSolarSystem();
  });

  // Home button
  document.getElementById('home-button').addEventListener('click', () => {
    currentTime = new Date();
    setTimeInput();
    drawSolarSystem();
  });

  // Zoom and pan
  solarSvg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    zoom *= zoomFactor;
    zoom = Math.max(0.1, Math.min(10, zoom));
    updateTransform(solarSvg, zoom, panX, panY);
  });

  solarSvg.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startPanX = panX;
    startPanY = panY;
  });

  solarSvg.addEventListener('mousemove', (e) => {
    if (isDragging) {
      panX = startPanX + (e.clientX - startX);
      panY = startPanY + (e.clientY - startY);
      updateTransform(solarSvg, zoom, panX, panY);
    }
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });

  solarSvg.addEventListener('mouseleave', () => {
    isDragging = false;
  });
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
