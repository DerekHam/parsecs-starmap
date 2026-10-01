// Procedural textures so the map ships with zero binary assets.
// Each body gets a deterministic appearance derived from its id and colour.

import * as THREE from 'three';

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function shade(rgb, amount) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return `rgb(${clamp(rgb.r + amount)},${clamp(rgb.g + amount)},${clamp(rgb.b + amount)})`;
}

const cache = new Map();

export function bodyTexture(body) {
  if (cache.has(body.id)) return cache.get(body.id);

  const width = 512;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const rand = mulberry32(hashString(body.id));
  const base = hexToRgb(body.color || '#999999');

  ctx.fillStyle = shade(base, 0);
  ctx.fillRect(0, 0, width, height);

  if (body.type === 'star') {
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, '#fff6c9');
    g.addColorStop(0.5, body.color || '#FDB813');
    g.addColorStop(1, '#fd8813');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  } else if (body.type === 'planet' && /giant|uranus|neptune/i.test(`${body.tags || ''}${body.id}`)) {
    // Banded gas / ice giant.
    let y = 0;
    while (y < height) {
      const bandH = 4 + rand() * 22;
      const amt = (rand() - 0.5) * 70;
      ctx.fillStyle = shade(base, amt);
      ctx.fillRect(0, y, width, bandH);
      // turbulence streaks
      for (let i = 0; i < 40; i++) {
        const sx = rand() * width;
        const sw = 10 + rand() * 80;
        ctx.globalAlpha = 0.08 + rand() * 0.12;
        ctx.fillStyle = shade(base, amt + (rand() - 0.5) * 60);
        ctx.fillRect(sx, y + rand() * bandH, sw, 1 + rand() * 2);
      }
      ctx.globalAlpha = 1;
      y += bandH;
    }
    // A storm spot.
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.ellipse(rand() * width, height * (0.45 + rand() * 0.2), 26, 12, 0, 0, Math.PI * 2);
    ctx.fillStyle = shade(base, -60);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else if (body.type === 'moon' || body.type === 'asteroid' || body.type === 'dwarf') {
    // Cratered / mottled surface.
    for (let i = 0; i < 260; i++) {
      const r = 1 + rand() * 9;
      ctx.beginPath();
      ctx.arc(rand() * width, rand() * height, r, 0, Math.PI * 2);
      ctx.fillStyle = shade(base, (rand() - 0.6) * 60);
      ctx.globalAlpha = 0.5;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else {
    // Terrestrial: continents / clouds.
    for (let i = 0; i < 90; i++) {
      const r = 10 + rand() * 60;
      ctx.beginPath();
      ctx.ellipse(rand() * width, rand() * height, r, r * (0.5 + rand()), 0, 0, Math.PI * 2);
      ctx.fillStyle = shade(base, (rand() - 0.5) * 90);
      ctx.globalAlpha = 0.35;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(body.id, tex);
  return tex;
}

export function ringTexture(color = '#d9c9a3') {
  const width = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  const base = hexToRgb(color);
  const rand = mulberry32(7);
  for (let x = 0; x < width; x++) {
    const t = x / width;
    let a = 0.75;
    // Simulate gaps in the ring plane.
    a *= 0.55 + 0.45 * Math.sin(t * 90) * Math.sin(t * 23 + 1.3);
    if (t > 0.62 && t < 0.7) a *= 0.08; // Cassini-like gap
    if (t < 0.04 || t > 0.98) a *= 0.2;
    ctx.fillStyle = `rgba(${base.r},${base.g},${base.b},${Math.max(0, a).toFixed(3)})`;
    ctx.fillRect(x, 0, 1, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Soft round dot used as the point sprite for background stars, so they render
// as circles rather than the default squares.
export function starTexture() {
  if (cache.has('__star__')) return cache.get('__star__');
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.85)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set('__star__', tex);
  return tex;
}

export function glowTexture(color = 'rgba(255,210,120,1)') {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, color);
  g.addColorStop(0.25, 'rgba(255,190,90,0.55)');
  g.addColorStop(1, 'rgba(255,150,40,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
