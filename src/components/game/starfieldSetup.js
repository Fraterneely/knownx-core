import * as THREE from 'three';

export function setupStarfield(scene) {
  const starGeometry = new THREE.BufferGeometry();
  const starVertices = [];
  const starColors = [];
  const starSizes = [];

  for (let i = 0; i < 100000; i++) {
    const x = (Math.random() - 0.5) * 10000;
    const y = (Math.random() - 0.5) * 10000;
    const z = (Math.random() - 0.5) * 10000;
    starVertices.push(x, y, z);

    const colorChoice = Math.random();
    if (colorChoice > 0.8) {
      starColors.push(0.9, 0.9, 1); // Blue-white
    } else if (colorChoice > 0.6) {
      starColors.push(1, 1, 0.9); // Yellow-white
    } else if (colorChoice > 0.4) {
      starColors.push(1, 0.8, 0.5); // Orange
    } else if (colorChoice > 0.2) {
      starColors.push(1, 0.5, 0.5); // Red
    } else {
      starColors.push(1, 1, 1); // White
    }

    starSizes.push(Math.pow(Math.random(), 2) * 2 + 0.1);
  }

  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
  starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
  starGeometry.setAttribute('size', new THREE.Float32BufferAttribute(starSizes, 1));

  const starMaterial = new THREE.PointsMaterial({
    size: 0.5,
    vertexColors: true,
    sizeAttenuation: true,
  });

  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);
}