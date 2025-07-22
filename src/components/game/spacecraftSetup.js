import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';

export function setupSpacecraft(scene, camera, spacecraftRef) {
  const loader = new GLTFLoader();
  loader.load(
    '/models/spacecrafts/spaceship_low_poly.glb',
    (gltf) => {
      const spacecraft = gltf.scene;
      spacecraft.scale.set(0.01, 0.01, 0.01);
      spacecraft.position.set(0, 0, 0);
      scene.add(spacecraft);
      spacecraftRef.current = spacecraft;

      spacecraft.add(camera);
      camera.position.set(0, 0.2, 0.1);
      camera.lookAt(new THREE.Vector3(0, 0.2, 1));
    },
    undefined,
    (error) => {
      console.error('An error occurred while loading the spacecraft model:', error);
    }
  );
}