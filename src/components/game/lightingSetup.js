import * as THREE from 'three';

export function setupLighting(scene) {
  const ambientLight = new THREE.AmbientLight(0x202020, 0.2);
  scene.add(ambientLight);

  const sunLight = new THREE.PointLight(0xffffee, 1.5, 1000);
  sunLight.position.set(0, 0, 0);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 0.01;
  sunLight.shadow.camera.far = 100;
  scene.add(sunLight);

  const fillLight = new THREE.DirectionalLight(0x404060, 0.2);
  fillLight.position.set(1, 0.5, 0.5);
  scene.add(fillLight);
}