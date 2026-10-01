// Shared constants for the Parsecs starmap.

// Scene units: 1 unit = 1,000 km (true scale).
export const KM_PER_UNIT = 1000;

// Astronomical unit in kilometres.
export const AU_KM = 149597870.7;

// J2000.0 epoch (2000-01-01 12:00 UTC) in Unix milliseconds.
export const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

// Milliseconds in a day.
export const DAY_MS = 86400000;

export const DEG = Math.PI / 180;

export const BODY_TYPES = {
  star: { label: 'Star', color: '#ffcf4d', size: 'large' },
  planet: { label: 'Planet', color: '#7fb2ff', size: 'medium' },
  dwarf: { label: 'Dwarf planet', color: '#b6a68c', size: 'small' },
  asteroid: { label: 'Asteroid', color: '#9aa0a6', size: 'small' },
  moon: { label: 'Moon', color: '#cfcfcf', size: 'small' },
  station: { label: 'Station', color: '#7fe9ff', size: 'small' },
  observatory: { label: 'Observatory', color: '#b98cff', size: 'small' },
  belt: { label: 'Belt', color: '#8b9099', size: 'small' }
};
