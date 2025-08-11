import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function setupOrbitControls(camera, renderer) {
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = false;
  controls.minDistance = 0.0001;
  controls.maxDistance = 5000000;
  return controls;
}