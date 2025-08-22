import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Spacecraft } from '../entities/SpaceCraft.js';
import { SpaceScaler } from '../utils/scaler.js';
import { ThirdPersonCamera } from '../components/game/cameraSetup.js';
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
  console.log('Starting spacecrafts loading ...');
  const loadPromises = spacecraftList.map((sc, index) => {
    return new Promise((resolve, reject) => {

      console.log("Found craft named " + sc.name)
      console.log(`Loading a ${sc.name}'s 3D Model...`);

      // Spacecraft body for physics engine
      const shipSize = scaler.scaleValue(sc.size.x, sc.size.y, sc.size.z) || 1;
      console.log(`Scaled Ship size is ${shipSize}`);
      const body = new CANNON.Body({
        mass: 1,
        position: new CANNON.Vec3(scaler.scaleValue(sc.position.x), scaler.scaleValue(sc.position.y), scaler.scaleValue(sc.position.z)),
        shape: new CANNON.Box(new CANNON.Vec3(0.000002, 0.00000067, 0.00000267)),
        material: spacecraftsMaterial,
        velocity: new CANNON.Vec3(0, 0, 0),
        angularVelocity: new CANNON.Vec3(0, 0, 0),
        quaternion: new CANNON.Quaternion(sc.orientation.x, sc.orientation.y, sc.orientation.z, sc.orientation.w),
      });
      world.addBody(body);


      // Spacecraft model for rendering
      loader.load(
        '/models/spacecrafts/spaceship_low_poly.glb',
        (gltf) => {
          console.log(`Spacecraft ${sc.name}'s 3D Model is loaded successfully`);
          const model = gltf.scene;
          scaler.scaleMesh(model, sc.size);

          const spacecraft = new THREE.Object3D();
          spacecraft.add(model);
          scaler.positionMesh(spacecraft, sc.position);
          // spacecraft.rotation.z =  Math.PI / 2

          scene.add(spacecraft);

          const spacecraftWrapper = {
            body: body, // The CANNON.Body
            model: spacecraft, // The THREE.Object3D model
            data: sc // The full Spacecraft object
          };
          spacecraftRef.current.set(sc.name, spacecraftWrapper);
          // console.log(`Spacecraft Wrapper is setted (Body Pos), ${spacecraftWrapper.body.position.toArray()}`);
          // console.log(`Spacecraft Wrapper is setted (Model Pos), ${spacecraftWrapper.model.position.toArray()}`);
          // console.log(`Spacecraft Wrapper is setted (Data Pos), ${spacecraftWrapper.data.position.toArray()}`);



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

export function updatePosition(updated, deltaTime){
  const moved = Spacecraft.updatePosition(updated, deltaTime);
  return moved;
}

export function updateOrientation(updated, deltaPitch, deltaYaw, deltaRoll){
  const rotated = Spacecraft.updateOrientation(updated, deltaPitch, deltaYaw, deltaRoll);
  return rotated;
}