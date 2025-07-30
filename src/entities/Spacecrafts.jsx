import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { Spacecraft } from '../entities/SpaceCraft.js';
import { SpaceScaler } from '../utils/scaler.js';
import { ThirdPersonCamera } from '../components/game/cameraSetup.js';

const spacecraftObjects = new Map(); // Map: name -> 3D Object
const loader = new GLTFLoader();
const scaler = new SpaceScaler();

/**
 * Load all spacecraft models and add them to the scene.
 * @param {THREE.Scene} scene - Three.js scene to attach models to.
 * @returns {Promise} - Resolves when all models are loaded.
 */
export async function loadAllSpacecraftModels(scene, camera, spacecraftLists, spacecraftRef, selectedSpacecraftRef, thirdPersonRef) {
  const spacecraftList = spacecraftLists; 
  console.log("Spacecrafts list found!")

  const loadPromises = spacecraftList.map((sc, index) => {
    return new Promise((resolve, reject) => {
      console.log("Found craft named " + sc.name)
      loader.load(
        '/models/spacecrafts/spaceship_low_poly.glb',
        (gltf) => {
          const model = gltf.scene;
          scaler.scaleMesh(model, sc.size);

          const spacecraft = new THREE.Object3D();
          spacecraft.add(model);

          model.rotation.y = Math.PI; // face forward
          scaler.positionMesh(spacecraft, sc.position);

          scene.add(spacecraft);
          spacecraftObjects.set(sc.name, spacecraft);
          spacecraftRef.current = spacecraftObjects;


          const spacecraftWrapper = {
            model: spacecraft, // The THREE.Object3D model
            data: sc // The full Spacecraft object
          };

          // position camera for the FIRST craft
          if (index === 0) {
            selectedSpacecraftRef.current = spacecraftWrapper;

            thirdPersonRef.current = new ThirdPersonCamera({ 
              camera: camera,
              target: selectedSpacecraftRef.current.model,
            });

          }

          resolve();
          console.log(`Spacecraft ${sc.name} resolved successfully!`)
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

export function applyThrust(sc, thrustVector, thrustLevel, deltaTime){
  const updated = Spacecraft.applyThrust(sc, thrustVector, thrustLevel, deltaTime);
  return updated;
}

export function updatePosition(updated, deltaTime){
  const moved = Spacecraft.updatePosition(updated, deltaTime);
  return moved;
}