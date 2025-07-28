import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { CameraSetup } from './cameraSetup';

export function setupScene(mountRef, sceneRef, cameraRef, rendererRef, controlsRef) {
  // Scene setup
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#000');
  sceneRef.current = scene;

  // Camera setup
  const cameraSetup = new CameraSetup();
  const camera = cameraSetup.getCamera();
  cameraRef.current = camera;

  // Renderer setup
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    logarithmicDepthBuffer: true
  });
  renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; // Better color reproduction
  renderer.toneMappingExposure = 0.8;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  rendererRef.current = renderer;

  // Clear any existing canvas elements before adding a new one
  while (mountRef.current.firstChild) {
    mountRef.current.removeChild(mountRef.current.firstChild);
  }

  mountRef.current.appendChild(renderer.domElement);

  // Enhanced controls setup
  if (cameraRef.current && rendererRef.current) {
    controlsRef.current = new OrbitControls(cameraRef.current, rendererRef.current.domElement);
    controlsRef.current.enableDamping = true;
    controlsRef.current.dampingFactor = 0.05;
    controlsRef.current.screenSpacePanning = false;
    controlsRef.current.minDistance = 0.0001; // Allow very close approach
    controlsRef.current.maxDistance = 100000; // Allow very distant viewing
    controlsRef.current.zoomSpeed = 2; // Faster zoom for large distances
    controlsRef.current.rotateSpeed = 0.8; // Smoother rotation
    controlsRef.current.keyPanSpeed = 20; // Faster keyboard panning
  }

  renderer.render(scene, camera);

  return { scene, camera, renderer, controls: controlsRef.current };
}