import * as THREE from 'three';
import { CameraSetup } from './cameraSetup';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export function setupScene(mountRef) {
  // Scene setup
  const scene = new THREE.Scene();
  
  // Background texture (your skybox)
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

  // Audio setup (optional)
  const listener = new THREE.AudioListener();
  // camera.add(listener);

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

  while (mountRef.current.firstChild) {
    mountRef.current.removeChild(mountRef.current.firstChild);
  }
  mountRef.current.appendChild(renderer.domElement);

  // 🎇 Bloom + Postprocessing setup
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.1,  // strength
    0.000000004,  // radius
    0.85  // threshold
  );
  composer.addPass(bloomPass);

  return { scene, camera, renderer, composer, audioLoader, sound };
}
