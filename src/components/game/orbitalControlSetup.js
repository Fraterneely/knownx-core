// orbitalControlSetup.js
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Creates OrbitControls and returns { controls }.
 */
export function setupOrbitControls(camera, rendererDomElement) {
  const controls = new OrbitControls(camera, rendererDomElement);

  // ✅ Essential settings for stable orbiting
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;  // Smooth movement
  
  controls.enableZoom = true;
  controls.zoomSpeed = 0.05;
  
  controls.enableRotate = true;
  controls.rotateSpeed = 0.05;
  
  controls.enablePan = true;
  controls.panSpeed = 0.05;

  // ✅ CRITICAL: Disable auto-rotate if enabled
  
  // ✅ Set reasonable limits
  controls.minDistance = 1e-8;   // Don't go too close
  controls.maxDistance = 1;   // Don't go too far

  return controls;
}
