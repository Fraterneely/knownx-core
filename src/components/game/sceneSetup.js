import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export function setupScene(mountRef, sceneRef, cameraRef, rendererRef, controlsRef) {
  // Scene setup
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000005); // Darker background for better contrast
  sceneRef.current = scene;

  // Camera setup with improved parameters for space viewing
  const camera = new THREE.PerspectiveCamera(
    30, // Wider FOV for better planet viewing
    mountRef.current.clientWidth / mountRef.current.clientHeight,
    0.00001, // Much smaller near plane for viewing tiny objects
    500000 // Much larger far plane for distant stars
  );
  camera.position.set(0, 0.5, 2); // Slightly elevated position
  cameraRef.current = camera;

  // Renderer setup with improved quality
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    logarithmicDepthBuffer: true // Better handling of vastly different scales
  });
  renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; // Better color reproduction
  renderer.toneMappingExposure = 0.8;
  // Replace deprecated sRGBEncoding with the new approach
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

  return { scene, camera, renderer, controls: controlsRef.current };
}