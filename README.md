# Parsecs Star Map

A 2D interactive star map for the Parsecs collaborative hard science-fiction novel.

## Features

- Solar system view with planets and sun
- Click planets to view their planetary systems (moons, space stations)
- Click any celestial body for a pop-up with description and wiki link
- Realistic scales with configurable scaling factors
- Easily editable data in JSON files

## Deployment

This is a static website that can be deployed on GitHub Pages.

1. Create a new repository on GitHub
2. Upload all files from this folder to the repository
3. Enable GitHub Pages in the repository settings
4. The site will be available at `https://yourusername.github.io/repositoryname/`

## Editing Data

### Adding New Celestial Objects

To add new planets, moons, or space stations:

1. **Add orbital data** to the `celestialOrbits` object in `script.js`:
   ```javascript
   NewObjectName: { period: 100.5, type: 'moon' } // period in Earth days
   ```

2. **Add a display radius** to the `radii` object in `script.js` (optional, defaults to generic size):
   ```javascript
   moons: {
     NewObjectName: 12 // pixels on screen
   }
   ```

3. **Add an entry to `data/solar_system.json`**:
   ```json
   {
     "name": "NewObjectName",
     "orbit": 450000,
     "diameter": 3000,
     "description": "Description here",
     "wiki": "https://parsecs.fandom.com/wiki/NewObjectName"
   }
   ```

4. The orbital positions are calculated in **real-time** using the actual orbital periods.

### Orbital Calculations

The system uses:
- Reference epoch: January 1, 2000 (UTC)
- Real orbital periods (in Earth days) for accurate positioning
- Automatic angle calculation: `position = (daysElapsed / orbitalPeriod * 360) % 360`

## Scaling

The display scales are configured in `script.js`:
- Solar system orbits: 100 px per AU
- Planetary orbits: 0.01 px per km

Adjust these values to change the visual scale.