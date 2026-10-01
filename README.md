# Parsecs Starmap

A true-scale, interactive 3D map of the **Parsecs** universe's solar system.
It is a static site: no build step, no dependencies to install, no external
services. Click a world, moon, or station and jump straight to its page on the
[Parsecs wiki](https://parsecs.fandom.com).

## Running it locally

ES modules must be served over HTTP (opening `index.html` from disk will not
work in most browsers). From this folder run any static server, for example:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploying on GitHub Pages

1. Commit this folder to a GitHub repository.
2. Repository **Settings → Pages**.
3. Set **Source** to *Deploy from a branch*, branch `main`, folder **`/docs`**.
4. The map will be live at `https://<user>.github.io/<repo>/`.

Then link to it from the wiki navigation.

## How it works

- **True scale.** One scene unit is 1,000 km. Sizes and distances are real, so
  planets are invisible specks at system scale — which is why every body has a
  fixed-screen-size **marker** you can click at any distance.
- **Real orbital mechanics.** Positions come from J2000 Keplerian elements
  (`js/kepler.js`): mean anomaly → Kepler's equation (Newton iteration) → true
  anomaly → ecliptic coordinates. Nothing is faked or animated on rails.
- **Time travel.** The time bar scrubs from 1900 to 2300 and plays back at
  1 day/s up to 10 years/s. It opens on **1 Jan 2206**, the founding era of the
  Star Alliance Federal Government.
- **Drill-down.** Click a planet to fly to it and list its moons and stations;
  the breadcrumb (`The Solar System › Saturn › Titan`) walks back up.
- **Axial spin and tilt.** Planets and moons rotate at their real sidereal
  rotation periods (a negative `rotationDays` spins retrograde, e.g. Venus and
  Uranus) about axes set by their real obliquity (`axialTiltDeg`). Ring systems
  inherit the planet's tilt, so Uranus rolls on its side.
- **Asteroid belt.** A cloud of particles each on its own Kepler orbit (so it
  rotates like everything else), with a soft density falloff instead of a hard
  edge. It has no marker of its own and is shown/hidden with the **Labels**
  toggle.
- **Go up one level.** The **Up** button (or `Esc` / `Backspace`) returns to the
  parent body — Luna → Earth, Earth → the solar system. Browser back/forward
  also works, since each focus is a history entry.

## Deep links

Append a body id to the URL to open it directly — handy from wiki pages:

```
index.html#earth
index.html#titan
index.html#cassini-division-station
```

## Project layout

```
index.html            app shell + import map
css/style.css         overlay UI, markers, panels
js/
  main.js             bootstrap and render loop
  scene.js            renderer, camera, controls, lights, starfield
  bodies.js           meshes, rings, asteroid belt from data
  orbits.js           orbit path lines
  kepler.js           orbital element solver
  time.js             time engine
  markers.js          fixed-size CSS2D navigation markers
  focus.js            camera fly-to and breadcrumbs
  ui.js               toolbar, search, info panel, time controls
  textures.js         procedural canvas textures (zero image assets)
data/
  systems.json        index of star systems
  solar-system.json   all bodies and their orbital elements
vendor/three/         pinned three.js r160 (offline-safe)
```

## Editing the map

Everything is data-driven. To add or change a body, edit
`data/solar-system.json`. A body looks like:

```jsonc
{
  "id": "titan",
  "name": "Titan",
  "type": "moon",              // star | planet | dwarf | asteroid | moon | station
  "parent": "saturn",
  "radiusKm": 2574.7,
  "color": "#ffb347",
  "rotationDays": 15.945,      // sidereal spin period (negative = retrograde)
  "axialTiltDeg": 0.35,        // obliquity of the spin axis
  "inhabited": true,
  "description": "…",
  "wiki": "https://parsecs.fandom.com/wiki/…",
  "orbit": {
    "aKm": 1221870,            // use aAU for heliocentric bodies
    "e": 0.0288,
    "iDeg": 0.34854,
    "nodeDeg": 0,
    "periDeg": 0,
    "m0Deg": 330,
    "periodDays": 15.945,
    "retrograde": false        // optional
  }
}
```

If `wiki` is omitted, the info panel falls back to a wiki search for the body's
name, so links never break.

## Textures and credits

Imagery lives in `textures/` and is referenced from each body's `texture`
field. Two sources are used:

- **Star and planets** (`textures/*.jpg`): the 2K set from
  [Solar System Scope](https://www.solarsystemscope.com/textures/), **CC BY 4.0**.
- **Moons and dwarf planets** (`textures/moons/*.jpg`): colour/grayscale
  simulation maps from the [Celestia Content](https://github.com/CelestiaProject/CelestiaContent)
  project, mostly **CC BY 3.0/4.0**, themselves derived from NASA/JPL/USGS data.
  Each file's original credits are in the `.license` files of that repository.

Attribution is shown in the toolbar and must be kept if you reuse the images.
Only a few tiny bodies (Hygiea, Eros) have no published map and use the
procedural fallback in `js/textures.js`.

To swap in your own imagery, drop a file in `textures/` and point the body's
`texture` (and optional `clouds`) field at it. Earth also uses a transparent
cloud shell, controlled by its `clouds` field.

## Station placement

Stations can either orbit their parent (`orbit`) or sit at a fixed point
relative to a two-body system via a Lagrange `anchor`:

```jsonc
"anchor": { "type": "lagrange", "secondary": "luna", "point": "L1" }
```

Supported points are `L1`–`L5`. The position is recomputed every frame from the
primary and secondary's current positions and masses, so the Earth-Luna
Spaceport always tracks the real L1 point as Luna orbits. This requires a
`massKg` on the primary and secondary bodies.

## Adding another star system

`data/systems.json` lists systems. Add a new entry and a matching data file
with its own `root` body; the renderer builds it with no code changes. (The
current camera framing is tuned for one system at a time.)
