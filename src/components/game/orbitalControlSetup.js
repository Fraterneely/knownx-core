// orbitalControlSetup.js
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three';

/**
 * Creates OrbitControls and returns { controls, setTargetAndRange }.
 * setTargetAndRange(targetObject3D, options) will center the controls on the object
 * and compute min/max distances relative to the current camera distance and optionally the body's radius.
 */
export function setupOrbitControls(camera, rendererDomElement) {
  const controls = new OrbitControls(camera, rendererDomElement);

  // Basic sensible defaults
  controls.enableDamping = true;
  controls.enableZoom = true; 
  controls.enablePan = true;
  controls.dampingFactor = 0.05;
  controls.rotateSpeed = 0.08; 
  controls.zoomSpeed = 0.6;
  controls.panSpeed = 0.5;
  controls.screenSpacePanning = false;

  // Default ranges (will be overridden per-target)
  controls.minDistance = 1e-8;
  controls.maxDistance = 1e8;

  // Allow mouse buttons to behave normally
  // (This makes middle-wheel do dolly, right do pan)
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN
  };

  // Helper: set sensible min/max based on camera distance and optional bodyRadius
  function setTargetAndRange(target, opts = {}) {
    if (!target || !target.position) return;
    console.log(`Setting target to: ${target.position.toArray()}`);
    controls.target.copy(target.position);

    // compute current distance from camera to target
    const camPos = new THREE.Vector3().copy(camera.position);
    const distance = camPos.distanceTo(target.position);
    const bodyRadius = opts.bodyRadius || 0;
    console.log(`Setting body radius to: ${bodyRadius}`);

    // choose min/max relative to distance (and radius), avoid too small or too large values
    const min = Math.max( bodyRadius * 1.1 || distance * 0.01, distance * 0.000001, 1e-8 );
    const max = Math.max( distance * 50, (bodyRadius + distance) * 10, 1e2 );
    console.log(`Setting min distance to: ${min}`);
    console.log(`Setting max distance to: ${max}`);

    // controls.minDistance = min;
    // controls.maxDistance = max;

    // Ensure the camera is within min/max — if not, move it to a safe distance smoothly
    const clampedDistance = Math.max(min, Math.min(max, distance));
    console.log(`Clamped distance: ${clampedDistance}`);
    
    console.log(`Clamping distance from ${distance} to ${clampedDistance}`);
    // Move camera along its current vector to the target
    const dir = new THREE.Vector3().subVectors(camPos, target.position).normalize();
    camera.position.copy(dir.multiplyScalar(100).add(target.position));
    camera.updateProjectionMatrix();
    
    console.log(`Setting camera position to: ${camera.position.toArray()}`);

    // Let OrbitControls recompute internal state
    controls.update();
  }

  return { controls, setTargetAndRange };
}
