import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { CameraSetup } from './cameraSetup';

export function setupScene(mountRef) {
  // Scene setup
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#000');

  // Camera setup
  const cameraSetup = new CameraSetup();
  const camera = cameraSetup.getCamera();

  // Renderer setup
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    logarithmicDepthBuffer: true,
    preserveDrawingBuffer: true
  });
  renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);

  // Clear any existing canvas elements before adding a new one
  while (mountRef.current.firstChild) {
    mountRef.current.removeChild(mountRef.current.firstChild);
  }

  mountRef.current.appendChild(renderer.domElement);

  // Enhanced controls setup
  const controls = null;
  // if (camera && renderer) {
  //   const controls = null;
  //   // controlsRef.current = new OrbitControls(camera, renderer.domElement);
  //   // controlsRef.current.enableDamping = true;
  //   // controlsRef.current.dampingFactor = 0.05;
  //   // controlsRef.current.screenSpacePanning = false;
  //   // controlsRef.current.minDistance = 0.0001; // Allow very close approach
  //   // controlsRef.current.maxDistance = 100000; // Allow very distant viewing
  //   // controlsRef.current.zoomSpeed = 2; // Faster zoom for large distances
  //   // controlsRef.current.rotateSpeed = 0.8; // Smoother rotation
  //   // controlsRef.current.keyPanSpeed = 20; // Faster keyboard panning
  // }

  // renderer.render(scene, camera);

  return { scene, camera, renderer, controls };
}