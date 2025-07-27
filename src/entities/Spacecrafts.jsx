import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { Spacecraft } from '../entities/SpaceCraft.js'; // Your physics/simulation engine
import { SpaceScaler } from '../utils/scaler.js';

const spacecraftObjects = new Map(); // Map: name -> 3D Object
const loader = new GLTFLoader();
const scaler = new SpaceScaler();

/**
 * Load all spacecraft models and add them to the scene.
 * @param {THREE.Scene} scene - Three.js scene to attach models to.
 * @returns {Promise} - Resolves when all models are loaded.
 */
export async function loadAllSpacecraftModels(scene, camera, spacecraftRef, cameraRef, controlsRef) {
  const spacecraftList = Spacecraft.list();
  console.log("Spacecrafts list found!")

  const loadPromises = spacecraftList.map((sc, index) => {
    return new Promise((resolve, reject) => {
      console.log("Found craft named " + sc.name)
      loader.load(
        '/models/spacecrafts/spaceship_low_poly.glb',
        (gltf) => {
          const model = gltf.scene;
        
          // const modelScale = scaler.scaleVector({x: sc.size.x, y: sc.size.y, z: sc.size.z});
          console.log(`Real Craft size: ${sc.size.x}, ${sc.size.y}, ${sc.size.z}`)
          // console.log(`converted Craft size: ${modelScale}`);
          // model.scale.copy(modelScale);
          scaler.scaleMesh(model, sc.size);
          console.log(`Craft's placed size: ${model.scale.x}, ${model.scale.y}, ${model.scale.z}`)
          model.rotation.y = Math.PI; // Optional: face forward
          model.position.set(sc.position.x, sc.position.y, sc.position.z);
          console.log(`Real Craft position ${sc.position.x}, ${sc.position.y}, ${sc.position.z}`)
          // scaler.positionMesh(model, sc.position);
          console.log(`Craft's placed position ${model.position.x}, ${model.position.y}, ${model.position.z}`)

          scene.add(model);
          spacecraftObjects.set(sc.name, model);
          spacecraftRef.current = spacecraftObjects;

          // position camera for the FIRST craft
          if (index === 0) {
            const offset = new THREE.Vector3(0.05, 0.02, 0.05); // Behind and above the ship
            const cameraPosition = model.position.clone().add(offset);

            camera.position.copy(cameraPosition);
            camera.lookAt(model.position);

            if (cameraRef) cameraRef.current = camera;
            controlsRef.current?.target.copy(model.position);
            controlsRef.current?.update();
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
