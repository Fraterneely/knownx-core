import * as THREE from 'three';

export function setupStarfield(scene, textureLoader) {
  const starGeometry = new THREE.BufferGeometry();
  const starVertices = [];
  const starColors = [];
  const starSizes = [];

  for (let i = 0; i < 1500; i++) {
    const x = (Math.random() - 0.5) * 10000;
    const y = (Math.random() - 0.5) * 10000;
    const z = (Math.random() - 0.5) * 10000;
    starVertices.push(x, y, z);

    // Vary star color
    const colorChoice = Math.random();
    if (colorChoice > 0.8) starColors.push(0.9, 0.9, 1);
    else if (colorChoice > 0.6) starColors.push(1, 1, 0.9);
    else if (colorChoice > 0.4) starColors.push(1, 0.8, 0.5);
    else if (colorChoice > 0.2) starColors.push(1, 0.5, 0.5);
    else starColors.push(1, 1, 1);

    // Random base size (larger = brighter)
    starSizes.push(Math.pow(Math.random(), 2) * 3 + 0.2);
  }

  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
  starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
  starGeometry.setAttribute('size', new THREE.Float32BufferAttribute(starSizes, 1));

  // Load a flare-like circular gradient
  const flareTexture = textureLoader.current.load('/textures/lensFlares/star.png');

  const starMaterial = new THREE.PointsMaterial({
    map: flareTexture,
    size: 12, // try changing between 4 and 12 for more or less flare
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);

  // Animate stars (for twinkle)
  stars.tick = (delta) => {
    stars.material.uniforms.time.value += delta;
  };

  return stars;
}
