import * as THREE from 'three';
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
    'bkg1_bot.png',
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
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);

  // Clear any existing canvas elements before adding a new one
  while (mountRef.current.firstChild) {
    mountRef.current.removeChild(mountRef.current.firstChild);
  }

  mountRef.current.appendChild(renderer.domElement);

  return { scene, camera, renderer, audioLoader, sound };
}