# Parsecs Star Map - Complete Implementation

## Project Overview
A 2D interactive star map webpage for the Parsecs hard science-fiction universe showing:
1. **Solar System View** - All 8 planets orbiting the Sun with real-time calculations
2. **Planetary Views** - Individual planets with moons, space stations, and orbital mechanics

## Architecture

### File Structure
```
/
├── index.html                 # Solar system view entry point
├── style.css                  # Global styling
├── shared.js                  # Shared utility functions (250 lines)
├── script.js                  # Solar system renderer logic (175 lines)
├── planetary.js               # Planetary view renderer logic (200 lines)
├── planets/
│   ├── earth.html            # Earth view template
│   ├── mercury.html          # Mercury view template
│   ├── venus.html            # Venus view template
│   ├── mars.html             # Mars view template
│   ├── jupiter.html          # Jupiter view template
│   ├── saturn.html           # Saturn view template
│   ├── uranus.html           # Uranus view template
│   └── neptune.html          # Neptune view template
└── data/
    ├── solar_system.json        # Solar system body definitions
    └── planets/
        ├── earth.json          # Earth + Moon + ISS
        ├── mercury.json        # Mercury + Helios Station
        ├── venus.json          # Venus + Aphrodite Station
        ├── mars.json           # Mars + Phobos, Deimos, settlements
        ├── jupiter.json        # Jupiter + 4 Galilean moons + stations
        ├── saturn.json         # Saturn + Titan + ring stations
        ├── uranus.json         # Uranus + Titania + observation post
        └── neptune.json        # Neptune + Triton + research post
```

## Core Features

### 1. Solar System View (index.html)
- **Real-time orbital positioning** using astronomical orbital periods
- **Zoom/Pan controls**:
  - Scroll wheel to zoom (0.1x - 10x range)
  - Click-drag to pan across the system
- **Time controls**:
  - Datetime input to set viewing time
  - "Reset to Now" button for current time
- **Interactive celestial bodies**:
  - Click any planet to open an info modal
  - Modal shows planet name, description, wiki link
  - Clicking planet navigates to planetary view
- **Visual enhancements**:
  - 1000-star background field
  - Radial gradients per planet (unique colors)
  - Glow filter effects
  - Orbital path circles (dashed white lines)

### 2. Planetary Views (planets/*.html)
- **Central planet display** (large sphere)
- **Orbiting moons** with correct orbital mechanics
- **Space stations** marked with cyan cross icons
- **Same zoom/pan/time controls** as solar view
- **Interactive moons/stations**:
  - Click any moon or station for info modal
  - Wiki links for each body
- **Back navigation** link to return to solar system

### 3. Orbital Mechanics Engine
**Reference Epoch:** January 1, 2000 UTC

**Calculation:**
```
daysElapsed = (currentTime - epochTime) / 86400000
orbitalPeriod = body.period (in days)
orbitsCompleted = daysElapsed / orbitalPeriod
angle = (orbitsCompleted * 360) % 360  [degrees]
angleRadians = angle * (π / 180)
```

**Orbital Distances:**
- Mercury: 0.387 AU (57.9 million km)
- Venus: 0.723 AU (108.2 million km)
- Earth: 1.0 AU (149.6 million km)
- Mars: 1.524 AU (227.9 million km)
- Jupiter: 5.203 AU (779.1 million km)
- Saturn: 9.537 AU (1.43 billion km)
- Uranus: 19.191 AU (2.87 billion km)
- Neptune: 30.069 AU (4.50 billion km)

**Orbital Periods (days):**
- Mercury: 87.97
- Venus: 224.70
- Earth: 365.25
- Mars: 686.97
- Jupiter: 4332.59
- Saturn: 10759.22
- Uranus: 30688.5
- Neptune: 60182.0

### 4. Visual Rendering

**SVG Implementation:**
- Circles for planets, moons
- Lines (horizontal + vertical) for station markers
- Radial gradients for realistic shading
- SVG filters for glow effects
- Transform groups for zoom/pan

**Color Scheme:**
- **Sun:** #FDB813 to #FD8813 (gold to orange)
- **Mercury:** #8C7853 to #A0826D (gray-brown)
- **Venus:** #E8C38A to #F0DD6F (pale yellow)
- **Earth:** #4FA3FF to #3ECE64 (blue to green)
- **Mars:** #E27B58 to #C84630 (rust red)
- **Jupiter:** #D4A574 to #9B7653 (tan)
- **Saturn:** #E8DCC4 to #D4A574 (pale tan)
- **Uranus:** #4FD0E7 to #3EA8C4 (cyan)
- **Neptune:** #4165F4 to #1F4FBF (deep blue)

### 5. Data Format

**solar_system.json Structure:**
```json
{
  "sun": { "name": "Sun", "diameter": 1391000 },
  "planets": [
    {
      "name": "Earth",
      "orbit": 1,
      "diameter": 12742,
      "description": "...",
      "wiki": "https://..."
    }
  ]
}
```

**planets/*.json Structure:**
```json
{
  "planet": {
    "name": "Earth",
    "orbit": 1,
    "diameter": 12742,
    "description": "...",
    "wiki": "..."
  },
  "moons": [
    {
      "name": "Moon",
      "orbit": 384400,
      "diameter": 3474,
      "description": "...",
      "wiki": "..."
    }
  ],
  "stations": [
    {
      "name": "ISS",
      "orbit": 6371,
      "description": "...",
      "wiki": "..."
    }
  ]
}
```

## Implementation Details

### shared.js - Utility Library (250 lines)
**Key Functions:**
- `calculateOrbitalPosition(name, time)` - Core orbital mechanics
- `createGradients(svg)` - Creates 16 color gradients + glow filter
- `getZoomGroup(svg)` - Retrieves or creates zoom transform group
- `updateTransform(svg, zoom, panX, panY)` - Applies zoom/pan transforms
- `generateStars(group, numStars)` - Creates 1000-star background
- `createCircle(cx, cy, r, name, data, onClickCallback)` - Renders clickable planet/moon
- `createStationIcon(group, cx, cy, size, data, onClickCallback)` - Renders station markers
- `drawSaturnRings(group)` - Renders 5-ring Saturn system

### script.js - Solar View Logic (175 lines)
**Key Functions:**
- `init()` - Single entry point for initialization
- `drawSolarSystem()` - Main renderer (calls utility functions)
- `goToPlanet(planetName)` - Navigates to planetary view
- `showModal(item)` - Displays info modal
- `setTimeInput()` - Formats current datetime
**Event Handlers:** Zoom, pan, time controls, modal interactions

### planetary.js - Planetary View Logic (200 lines)
**Key Functions:**
- `init()` - Initialization (reads planet name from URL)
- `drawPlanetarySystem()` - Renders planet + moons + stations
- `getPlanetNameFromUrl()` - Extracts planet name from filepath
- `showModal(item)` - Displays info modals
- `setTimeInput()` - Datetime formatting
**Event Handlers:** Same zoom/pan/time as solar view

## Usage

### Opening the Application
1. Open `index.html` in a web browser
2. Solar system view appears with all 8 planets

### Navigating to a Planet
1. Click any planet in the solar system
2. Page navigates to `planets/[PlanetName].html`
3. Planetary view renders with that planet centered

### Controlling the View
- **Zoom:** Scroll mouse wheel (0.1x - 10x)
- **Pan:** Click and drag
- **Time:** Adjust datetime input or click "Reset to Now"
- **Info:** Click any planet/moon/station for modal with wiki link
- **Back:** Click "← Back to Solar System" link to return

## Testing Results

✅ **Solar System View**
- All 8 planets rendering with correct orbital positions
- Gradient colors and glows rendering properly
- 1000-star background visible
- Zoom/pan controls functional
- Time controls working
- Click handlers navigating to planetary views

✅ **Planetary Views Tested**
- **Earth:** Moon rendering and clickable
- **Jupiter:** 4 Galilean moons visible in orbits
- **Saturn:** Distinctive rings rendering around planet

✅ **Interaction Flow**
- Solar → Planet navigation working
- Back navigation to solar system working
- Modals displaying on click
- Wiki links included in modals

## Technical Highlights

1. **Pure JavaScript** - No frameworks, pure vanilla JS with SVG
2. **Accurate Astronomy** - Real orbital periods and distances
3. **Modular Architecture** - Separate files for different concerns
4. **Real-time Calculations** - Positions calculated for any datetime
5. **Responsive Design** - Zoom/pan works at any scale
6. **Extensible Data** - Easy to add new planets, moons, or stations

## Future Enhancement Possibilities

- Orbital trails visualization
- Relative size scaling toggle
- Pause/play time control
- Speed controls for time passage
- Asteroid belt visualization
- Comet paths
- Search by body name
- Historical date browsing
- 3D view option
- Multiplayer collaborative annotations
