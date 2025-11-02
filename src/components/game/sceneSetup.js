import * as THREE from 'three';
import { CameraSetup } from './cameraSetup';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export function setupScene(mountRef) {
  console.log('🎬 setupScene called');
  console.log('Existing canvases:', document.querySelectorAll('canvas').length);

  // Check if canvas already exists
  const existingCanvas = mountRef.current?.querySelector('canvas');
  if (existingCanvas) {
    console.warn('Canvas already exists, cleaning up...');
    existingCanvas.remove();
  }

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
      // scene.background = texture;
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

  // Audio setup
  const listener = new THREE.AudioListener();
  camera.add(listener);

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

  renderer.debug.checkShaderErrors = true;

  // Also add this to catch shader errors:
  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    console.error('WebGL context lost!', event);
    event.preventDefault();
  });  

  // Log renderer info
  console.log('Max textures:', renderer.capabilities.maxTextures);
  console.log('Max vertex uniforms:', renderer.capabilities.maxVertexUniforms);
  console.log('Max fragment uniforms:', renderer.capabilities.maxFragmentUniforms);

  return { scene, camera, renderer, composer, listener, audioLoader, sound };
}
