// Core three.js setup: renderer, camera, controls, lights, starfield.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { starTexture } from './textures.js?v=10';

export function createScene(container, labelContainer) {
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.01,
    5e7
  );
  camera.position.set(0, 2600000, 4200000);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    logarithmicDepthBuffer: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  const labelRenderer = new CSS2DRenderer({ element: labelContainer });
  labelRenderer.setSize(window.innerWidth, window.innerHeight);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.9;
  controls.minDistance = 0.05;
  controls.maxDistance = 4.5e7;
  controls.screenSpacePanning = true;

  // Lighting. The point light uses no falloff so the outer planets stay lit;
  // physically inaccurate but necessary to see anything at true scale.
  const sunLight = new THREE.PointLight(0xffffff, 2.4, 0, 0);
  sunLight.position.set(0, 0, 0);
  scene.add(sunLight);

  scene.add(new THREE.AmbientLight(0x2a3040, 0.55));

  scene.add(createStarfield(renderer.getPixelRatio()));

  return { scene, camera, renderer, labelRenderer, controls, sunLight };
}

// Realistic-ish spectral classes: frequency, temperature range (K), point size
// (device px) and brightness. Cool M/K dwarfs dominate; hot O/B stars are rare
// but larger and brighter, as in the real sky.
const STAR_CLASSES = [
  { w: 0.0003, t0: 30000, t1: 40000, s0: 1.7, s1: 2.7, b0: 0.9, b1: 1.0 }, // O
  { w: 0.008, t0: 10000, t1: 30000, s0: 1.5, s1: 2.3, b0: 0.85, b1: 1.0 }, // B
  { w: 0.03, t0: 7500, t1: 10000, s0: 1.3, s1: 2.0, b0: 0.75, b1: 0.95 }, // A
  { w: 0.06, t0: 6000, t1: 7500, s0: 1.15, s1: 1.7, b0: 0.68, b1: 0.85 }, // F
  { w: 0.14, t0: 5200, t1: 6000, s0: 1.0, s1: 1.5, b0: 0.6, b1: 0.78 }, // G
  { w: 0.25, t0: 3700, t1: 5200, s0: 0.85, s1: 1.3, b0: 0.48, b1: 0.66 }, // K
  { w: 0.52, t0: 2400, t1: 3700, s0: 0.7, s1: 1.1, b0: 0.36, b1: 0.54 } // M
];

function pickClass() {
  const total = STAR_CLASSES.reduce((sum, c) => sum + c.w, 0);
  let r = Math.random() * total;
  for (const c of STAR_CLASSES) {
    r -= c.w;
    if (r <= 0) return c;
  }
  return STAR_CLASSES[STAR_CLASSES.length - 1];
}

const clamp255 = (v) => Math.max(0, Math.min(255, v));

// Blackbody colour approximation (Tanner Helland) -> sRGB 0..1.
function blackbodyColor(kelvin) {
  const t = kelvin / 100;
  let r;
  if (t <= 66) r = 255;
  else r = 329.698727446 * Math.pow(t - 60, -0.1332047592);

  let g;
  if (t <= 66) g = 99.4708025861 * Math.log(t) - 161.1195681661;
  else g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);

  let b;
  if (t >= 66) b = 255;
  else if (t <= 19) b = 0;
  else b = 138.5177312231 * Math.log(t - 10) - 305.0447927307;

  return [clamp255(r) / 255, clamp255(g) / 255, clamp255(b) / 255];
}

// sRGB -> linear, because three treats vertex colours as linear.
function sRGBToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function createStarfield(pixelRatio) {
  const count = 5200;
  const radius = 8e6;

  // Four point-size buckets, since PointsMaterial has one size per draw call.
  const bucketSizes = [0.9, 1.35, 1.85, 2.5];
  const bucketPos = bucketSizes.map(() => []);
  const bucketCol = bucketSizes.map(() => []);

  for (let i = 0; i < count; i++) {
    // Uniform points on a sphere.
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = radius * (0.9 + Math.random() * 0.1);

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.cos(phi);
    const z = r * Math.sin(phi) * Math.sin(theta);

    const cls = pickClass();
    const temp = cls.t0 + Math.random() * (cls.t1 - cls.t0);
    const [cr, cg, cb] = blackbodyColor(temp);

    const size = cls.s0 + Math.random() * (cls.s1 - cls.s0);
    // Slightly dialled down so the sky reads as background, not foreground.
    const bright = (cls.b0 + Math.random() * (cls.b1 - cls.b0)) * 0.8;

    let bi = 0;
    if (size > 2.0) bi = 3;
    else if (size > 1.5) bi = 2;
    else if (size > 1.1) bi = 1;

    bucketPos[bi].push(x, y, z);
    bucketCol[bi].push(
      sRGBToLinear(cr),
      sRGBToLinear(cg),
      sRGBToLinear(cb),
      bright
    );
  }

  const group = new THREE.Group();
  const sprite = starTexture();
  bucketSizes.forEach((size, i) => {
    if (!bucketPos[i].length) return;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(bucketPos[i], 3)
    );
    geometry.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(bucketCol[i], 4)
    );
    const material = new THREE.PointsMaterial({
      map: sprite, // round point sprite instead of a square
      size: size * pixelRatio * 1.6,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      alphaTest: 0.02,
      depthWrite: false,
      blending: THREE.NormalBlending
    });
    group.add(new THREE.Points(geometry, material));
  });

  return group;
}
