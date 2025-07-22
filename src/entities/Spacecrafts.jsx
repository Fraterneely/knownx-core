import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { Spacecraft } from '../entities/SpaceCraft.js'; // Your physics/simulation engine

const spacecraftObjects = new Map(); // Map: name -> 3D Object
const loader = new GLTFLoader();

/**
 * Load all spacecraft models and add them to the scene.
 * @param {THREE.Scene} scene - Three.js scene to attach models to.
 * @returns {Promise} - Resolves when all models are loaded.
 */
export async function loadAllSpacecraftModels(scene) {
  const spacecraftList = Spacecraft.list();

  const loadPromises = spacecraftList.map((sc) => {
    return new Promise((resolve, reject) => {
      loader.load(
        '/models/spacecrafts/spaceship_low_poly.glb', // You can customize per model with sc.model if needed
        (gltf) => {
          const model = gltf.scene;
          model.scale.set(0.001, 0.001, 0.001); // Adjust based on model size
          model.rotation.y = Math.PI; // Optional: face forward
          model.position.set(sc.position.x, sc.position.y, sc.position.z);

          scene.add(model);
          spacecraftObjects.set(sc.name, model);

          resolve();
        },
        undefined,
        (err) => {
          console.error(`Failed to load model for ${sc.name}`, err);
          reject(err);
        }
      );
    });
  });

  await Promise.all(loadPromises);
}

/**
 * Sync all loaded spacecraft models with the updated simulation state.
 * @param {Array} updatedSpacecraftList - Updated spacecraft states.
 */
export function updateSpacecraftModels(updatedSpacecraftList) {
  updatedSpacecraftList.forEach((sc) => {
    const model = spacecraftObjects.get(sc.name);
    if (!model) return;

    // Update position
    model.position.set(sc.position.x, sc.position.y, sc.position.z);

    // Optional: update rotation (Euler angles)
    model.rotation.set(
      sc.orientation.pitch || 0,
      sc.orientation.yaw || 0,
      sc.orientation.roll || 0
    );
  });
}

/**
 * Get 3D model by spacecraft name
 * @param {string} name
 * @returns {THREE.Object3D|null}
 */
export function getSpacecraftModel(name) {
  return spacecraftObjects.get(name) || null;
}
