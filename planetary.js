// ============================================
// Planetary View
// ============================================

const planetOrbitScale = 1; // px per 1000 km (divide orbit by 1000 to get px)
const centerX = 0;
const centerY = 0;

const moonRadii = {
  Moon: 12,
  Phobos: 5,
  Deimos: 4,
  Io: 10,
  Europa: 9,
  Titan: 11,
  Triton: 9
};

const stationRadius = 3;
const planetSize = 100; // Size of planet in center

let planetarySvg, modal, modalTitle, modalDescription, modalLink, closeBtn, timeInput, timeResetBtn;
let planetData = null;
let zoom = 1;
let panX = 0;
let panY = 0;
let isDragging = false;
let startX, startY, startPanX, startPanY;
let currentTime = new Date();
let currentPlanetName = '';

// Get planet name from URL
function getPlanetNameFromUrl() {
  const pathParts = window.location.pathname.split('/');
  const name = decodeURIComponent(pathParts[pathParts.length - 1].replace('.html', ''));
  // Capitalize first letter to match gradient names
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// Draw the planetary system
function drawPlanetarySystem() {
  if (!planetData) return;

  planetarySvg.innerHTML = '';
  zoom = 1;
  panX = 0;
  panY = 0;

  const group = getZoomGroup(planetarySvg);
  createGradients(planetarySvg);
  updateTransform(planetarySvg, zoom, panX, panY);

  generateStars(group);

  // Draw moons and stations
  if (planetData.moons) {
    planetData.moons.forEach(moon => {
      const angle = calculateOrbitalPosition(moon.name, currentTime);
      const distance = (moon.orbit / 1000) * planetOrbitScale; // Convert km to display units
      const x = centerX + distance * Math.cos(angle);
      const y = centerY + distance * Math.sin(angle);
      const radius = 6; // Moon visible size

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

      // Create icon group with inverse scaling (maintains constant size when zoomed)
      const iconGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const scale = 1 / Math.max(zoom, 0.1);
      iconGroup.setAttribute('transform', `translate(${x}, ${y}) scale(${scale})`);
      
      // Draw moon as solid circle with gradient
      const moonCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      moonCircle.setAttribute('cx', 0);
      moonCircle.setAttribute('cy', 0);
      moonCircle.setAttribute('r', radius);
      // Escape special characters in moon name for gradient ID
      const escapedMoonName = moon.name.replace(/[^a-zA-Z0-9-_]/g, '_');
      moonCircle.setAttribute('fill', `url(#gradient-${escapedMoonName})`);
      moonCircle.setAttribute('stroke', 'rgba(255, 255, 255, 0.5)');
      moonCircle.setAttribute('stroke-width', '1');
      moonCircle.setAttribute('filter', 'url(#glow)');
      moonCircle.setAttribute('style', 'cursor: pointer;');
      
      if (showModal) {
        moonCircle.addEventListener('click', (e) => {
          e.stopPropagation();
          showModal(moon);
        });
      }
      
      iconGroup.appendChild(moonCircle);
      group.appendChild(iconGroup);
    });
  }

  if (planetData.stations) {
    planetData.stations.forEach(station => {
      const angle = calculateOrbitalPosition(station.name, currentTime);
      const distance = (station.orbit / 1000) * planetOrbitScale; // Convert km to display units
      const x = centerX + distance * Math.cos(angle);
      const y = centerY + distance * Math.sin(angle);

      // Draw orbit
      const orbit = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      orbit.setAttribute('cx', centerX);
      orbit.setAttribute('cy', centerY);
      orbit.setAttribute('r', distance);
      orbit.setAttribute('fill', 'none');
      orbit.setAttribute('stroke', 'rgba(100, 200, 255, 0.15)');
      orbit.setAttribute('stroke-width', '0.5');
      orbit.setAttribute('stroke-dasharray', '2,2');
      group.appendChild(orbit);

      // Draw station icon (fixed size)
      createStationIcon(group, x, y, 8, station, showModal, zoom);
    });
  }

  // Draw planet at center
  if (planetData.planet) {
    const planetCircle = createCircle(centerX, centerY, planetSize, currentPlanetName, planetData.planet, showModal);
    planetCircle.style.pointerEvents = 'none';
    group.appendChild(planetCircle);
  }

  // Draw Saturn's rings if applicable
  if (currentPlanetName === 'Saturn') {
    drawSaturnRings(group);
  }
}

// Show modal with info
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

// Set time input
function setTimeInput() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  timeInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Initialize
function init() {
  currentPlanetName = getPlanetNameFromUrl();
  
  // Get DOM elements
  planetarySvg = document.getElementById('planetary-svg');
  modal = document.getElementById('modal');
  modalTitle = document.getElementById('modal-title');
  modalDescription = document.getElementById('modal-description');
  modalLink = document.getElementById('modal-link');
  closeBtn = document.querySelector('.close');
  timeInput = document.getElementById('time-input');
  timeResetBtn = document.getElementById('time-reset');

  // Update title
  document.getElementById('planet-title').textContent = `${currentPlanetName} - Parsecs Star Map`;
  document.getElementById('planet-heading').textContent = currentPlanetName;

  // Get time from URL if provided
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('time')) {
    try {
      currentTime = new Date(urlParams.get('time'));
    } catch (e) {
      // Use current time if parsing fails
    }
  }

  // Load planet data
  fetch(`../data/planets/${currentPlanetName}.json`)
    .then(response => response.json())
    .then(json => {
      planetData = json;
      drawPlanetarySystem();
    })
    .catch(err => console.error('Failed to load planet data:', err));

  // Modal close
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
    drawPlanetarySystem();
  });

  timeResetBtn.addEventListener('click', () => {
    currentTime = new Date();
    setTimeInput();
    drawPlanetarySystem();
  });

  // Zoom and pan
  planetarySvg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    zoom *= zoomFactor;
    zoom = Math.max(0.1, Math.min(10, zoom));
    updateTransform(planetarySvg, zoom, panX, panY);
    // Redraw to update icon sizes
    drawPlanetarySystem();
  });

  planetarySvg.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startPanX = panX;
    startPanY = panY;
  });

  planetarySvg.addEventListener('mousemove', (e) => {
    if (isDragging) {
      panX = startPanX + (e.clientX - startX);
      panY = startPanY + (e.clientY - startY);
      updateTransform(planetarySvg, zoom, panX, panY);
    }
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });

  planetarySvg.addEventListener('mouseleave', () => {
    isDragging = false;
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
