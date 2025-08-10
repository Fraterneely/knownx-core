import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { CameraSetup } from './cameraSetup';

export function setupScene(mountRef) {
  // Scene setup
  const scene = new THREE.Scene();
  
  // Debug logging for background texture loading
  const textureLoader = new THREE.CubeTextureLoader();
  textureLoader.setPath('/unibox/blue/');

  
  const texturePaths = [
    'bkg1_right.png',
    'bkg1_left.png', 
    'bkg1_top.png',
    'bkg1_bottom.png',
    'bkg1_front.png',
    'bkg1_back.png'
  ];

  console.log('Loading background textures from:', '/Unibox/blue/');
  console.log('Texture paths:', texturePaths);

  textureLoader.load(
    texturePaths,
    (texture) => {
      console.log('Background textures loaded successfully');
      scene.background = texture;
    },
    (progress) => {
      console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
    },
    (error) => {
      console.error('Error loading background textures:', error);
    }
  );

  // Camera setup
  const cameraSetup = new CameraSetup();
  const camera = cameraSetup.getCamera();

  // Create a listener
  const listener = new THREE.AudioListener();
  // camera.add(listener);

  // Positional audio
  const sound = new THREE.PositionalAudio(listener);
  const audioLoader = new THREE.AudioLoader();

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

  return { scene, camera, renderer, audioLoader, sound, controls };
}