import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Spacecraft } from '../entities/SpaceCraft.js';
import { SpaceScaler } from '../utils/scaler.js';
import * as CANNON from 'cannon-es';

const spacecraftObjects = new Map(); // Map: name -> 3D Object
const loader = new GLTFLoader();
const scaler = new SpaceScaler();

/**
 * Load all spacecraft models and add them to the scene.
 * @param {THREE.Scene} scene - Three.js scene to attach models to.
 * @returns {Promise} - Resolves when all models are loaded.
 */
export async function loadAllSpacecraftModels(world, scene, spacecraftsMaterial, spacecraftLists, spacecraftRef, selectedSpacecraftRef, setLoadingProgress) {
  const spacecraftList = spacecraftLists; 
  // console.log('Starting spacecrafts loading ...');
  const loadPromises = spacecraftList.map((sc, index) => {
    return new Promise((resolve, reject) => {

      // console.log("Found craft named " + sc.name)
      // console.log(`Loading a ${sc.name}'s 3D Model...`);

      // Spacecraft body for physics engine
      const body = new CANNON.Body({
        mass: sc.mass,
        position: new CANNON.Vec3(scaler.scaleValue(sc.position.x), scaler.scaleValue(sc.position.y), scaler.scaleValue(sc.position.z)),
        shape: new CANNON.Box(new CANNON.Vec3(scaler.scaleValue(sc.size.x), scaler.scaleValue(sc.size.y), scaler.scaleValue(sc.size.z))),
        material: spacecraftsMaterial,
        velocity: new CANNON.Vec3(0, 0, 0),
        angularVelocity: new CANNON.Vec3(0, 0, 0),
        quaternion: new CANNON.Quaternion(sc.orientation.x, sc.orientation.y, sc.orientation.z, sc.orientation.w),
        linearDamping: 0,   // no slowdown in space
        angularDamping: 0,  // optional, stops rotational slowdown
      });
      world.addBody(body);


      // Spacecraft model for rendering
      loader.load(
        // '/models/spacecrafts/spaceship_low_poly.glb',
        '/models/spacecrafts/d.s.s._harbinger_battle_cruiser.glb',
        (gltf) => {
          // console.log(`Spacecraft ${sc.name}'s 3D Model is loaded successfully`);
          const model = gltf.scene;
          scaler.scaleMesh(model, sc.size);
          model.rotation.y =  Math.PI / 2;
          model.castShadow = true;
          model.receiveShadow = true;

          const spacecraft = new THREE.Object3D();
          spacecraft.add(model); 
          spacecraft.castShadow = true;
          spacecraft.receiveShadow = true;
          scaler.positionMesh(spacecraft, sc.position);

          scene.add(spacecraft);

          const spacecraftWrapper = {
            body: body, // The CANNON.Body
            model: spacecraft, // The THREE.Object3D model
            data: sc // The full Spacecraft object
          };
          spacecraftRef.current.set(sc.name, spacecraftWrapper);

          //the FIRST craft
          if (index === 0) {
            selectedSpacecraftRef.current = spacecraftWrapper;
          }
          setLoadingProgress(prev => ({
            ...prev,
            models: {
              ...prev.models,
              [sc.name]: 'loaded'
            }
          }));
          resolve();
        },
        (xhr) => {
          // Progress callback
          if (setLoadingProgress) {
            const progress = (xhr.loaded / xhr.total) * 100;
            setLoadingProgress(prev => ({
              ...prev,
              models: {
                ...prev.models,
                [sc.name]: progress
              }
            }));
          }
        },
        (error) => {
          console.error(`Error loading model ${sc.name}:`, error);
          setLoadingProgress(prev => ({
            ...prev,
            models: {
              ...prev.models,
              [sc.name]: 'failed'
            }
          }));
          reject(error);
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

export function updatePosition(updated){
  const update = Spacecraft.updatePosition(updated);
  return update;
}

export function updateOrientation(updated){
  const update = Spacecraft.updateOrientation(updated);
  return update;
}

export function updateVelocity(updated){
  const update = Spacecraft.updateVelocity(updated);
  return update;
}

export function updateSystems(updated, deltaTime){
  const update = Spacecraft.updateSystems(updated, deltaTime);
  return update;
}