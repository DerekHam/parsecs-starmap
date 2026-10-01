// Loads real imagery referenced from the data files, with graceful fallback
// to the procedural textures when a file is missing.

import * as THREE from 'three';

function loadTexture(url) {
  return new Promise((resolve) => {
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        resolve(tex);
      },
      undefined,
      () => {
        console.warn(`[parsecs] could not load texture: ${url}`);
        resolve(null);
      }
    );
  });
}

// Returns { bodyTex: Map<id,Texture>, cloudTex: Map<id,Texture>, ringTex: Map<id,Texture> }
export async function loadAssets(systemData) {
  const bodyTex = new Map();
  const cloudTex = new Map();
  const ringTex = new Map();

  // `?lite` skips imagery (procedural fallback) for fast/low-bandwidth loading.
  if (new URLSearchParams(location.search).has('lite')) {
    return { bodyTex, cloudTex, ringTex };
  }

  const jobs = [];

  for (const body of systemData.bodies) {
    if (body.texture) {
      jobs.push(
        loadTexture(body.texture).then((t) => {
          if (t) bodyTex.set(body.id, t);
        })
      );
    }
    if (body.clouds) {
      jobs.push(
        loadTexture(body.clouds).then((t) => {
          if (t) cloudTex.set(body.id, t);
        })
      );
    }
    if (body.rings && body.rings.texture) {
      jobs.push(
        loadTexture(body.rings.texture).then((t) => {
          if (t) ringTex.set(body.id, t);
        })
      );
    }
  }

  await Promise.all(jobs);
  return { bodyTex, cloudTex, ringTex };
}
