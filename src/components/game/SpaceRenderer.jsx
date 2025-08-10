import React, { useRef, useEffect, useState, useCallback } from 'react';
import { setupScene } from './sceneSetup';
import { calculateGravitationalForce } from '../../utils/physicsUtils';
import * as CANNON from 'cannon-es';
import { CELESTIAL_BODIES } from '@/entities/CelestialBodies';
import { setupLighting } from './lightingSetup';
import { setupCelestialBodies } from './celestialBodySetup';
import { TextureLoader, Vector3, Euler } from 'three';
import { loadAllSpacecraftModels, updatePosition, 
        applyThrust, updateOrientation,
        updateShipControl, updateSpacecraftModels } from '../../entities/Spacecrafts';
import { SpaceScaler } from '../../utils/scaler';
import { setupStarfield } from './starfieldSetup';
import { handleKeyDown, handleKeyUp, keysPressed, 
        getThrustVectorFromKeys, getRotationDeltaFromKeys } from './spacecraftControls';

const scaler = new SpaceScaler();

export const useSpacecraftsRef = () => {
  const spacecraftsRef = useRef([]);
  return spacecraftsRef;
};

export default function SpaceRenderer({ 
  spacecraftList,
  onSpacecraftUpdate,
  targetBody,
  isPaused,
  timeScale 
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef();
  const cameraRef = useRef();
  const rendererRef = useRef();
  const audioLoaderRef = useRef();
  const soundRef = useRef();
  const controlsRef = useRef();
  const activeLights = useRef([]);
  const celestialBodiesRef = useRef({});
  const atmosphereRefs = useRef({});
  const cloudsRefs = useRef({});
  const orbitRefs = useRef({});
  const textureLoader = useRef(new TextureLoader);
  const spacecraftsRef = useRef([]); // spacecraft data here
  const selectedSpacecraftRef = useSpacecraftsRef();
  const thirdPersonRef = useRef();
  const worldRef = useRef(null); // Cannon.js world
  const spacecraftBodyRef = useRef(null); // Cannon.js body for spacecraft
  const [loadingProgress, setLoadingProgress] = useState({
    textures: {},
    citylightsTextures: {},
    cloudsTextures: {},
    models: {},
  });
  const [sceneReady, setSceneReady] = useState(false);
  const [gameTime, setGameTime] = useState(0);
  const [activeLightsReady, setLightsReady] = useState(false);

  // Effect for initial scene setup (runs once mountRef is available)
  useEffect(() => {
    if (!mountRef.current) return;

    const { scene, camera, renderer, audioLoader, sound, controls } = setupScene(mountRef);
    setupLighting(scene, activeLights, setLightsReady);
    setupStarfield(scene);
    setupCelestialBodies(scene, celestialBodiesRef, orbitRefs, atmosphereRefs, cloudsRefs, textureLoader, setLoadingProgress);
    loadAllSpacecraftModels(scene, camera, spacecraftList, spacecraftsRef, selectedSpacecraftRef, thirdPersonRef, setLoadingProgress);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    // audioLoaderRef.current = audioLoader;
    // soundRef.current = sound;
    controlsRef.current = controls;

    // Cleanup for initial setup
    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (rendererRef.current.domElement && mountRef.current?.contains(rendererRef.current.domElement)) {
          mountRef.current.removeChild(rendererRef.current.domElement);
        }
      }
    };
  }, []); // Runs once on mount

  // Effect to set sceneReady when all assets are loaded and refs are populated
  useEffect(() => {
    const totalExpectedTextures = Object.values(CELESTIAL_BODIES).filter(body => body.texture).length;
    // console.log("totalExpectedTextures", totalExpectedTextures);
    const totalExpectedCitylightsTextures = Object.values(CELESTIAL_BODIES).filter(body => body.citylightsTexture).length;
    // console.log("totalExpectedCitlightsTextures", totalExpectedCitylightsTextures);
    const totalExpectedCloudsTextures = Object.values(CELESTIAL_BODIES).filter(body => body.clouds).length;
    // console.log("totalExpectedCloudsTextures", totalExpectedCloudsTextures);
    const totalExpectedModels = spacecraftList ? spacecraftList.length : 0;
    // console.log("totalExpectedModels", totalExpectedModels);

    const loadedTextureCount = Object.values(loadingProgress.textures).filter(status => status === 'loaded').length;
    // console.log("loadedTextureCount", loadedTextureCount);
    const loadedCitylightsTexturesCount = Object.values(loadingProgress.citylightsTextures).filter(status => status === 'loaded').length;
    // console.log("loadedCitylightsTexturesCount", loadedCitylightsTexturesCount);
    const loadedCloudsTexturesCount = Object.values(loadingProgress.cloudsTextures).filter(status => status === 'loaded').length;
    // console.log("loadedCloudsTexturesCount", loadedCloudsTexturesCount);
    const loadedModelCount = Object.values(loadingProgress.models).filter(status => status === 'loaded').length;
    // console.log("loadedModelCount", loadedModelCount);

    const allTexturesLoaded = totalExpectedTextures === 0 || loadedTextureCount === totalExpectedTextures;
    const allCitylightsTexturesLoaded = totalExpectedCitylightsTextures === 0 || loadedCitylightsTexturesCount === totalExpectedCitylightsTextures;
    const allCloudsTexturesLoaded = totalExpectedCloudsTextures === 0 || loadedCloudsTexturesCount === totalExpectedCloudsTextures;
    const allModelsLoaded = totalExpectedModels === 0 || loadedModelCount === totalExpectedModels;

    // const allTexturesLoaded = Object.values(loadingProgress.textures).every(status => status === 'loaded');
    // const allCitylightsTexturesLoaded = Object.values(loadingProgress.citylightsTextures).every(status => status === 'loaded');
    // const allCloudsTexturesLoaded = Object.values(loadingProgress.cloudsTextures).every(status => status === 'loaded');
    // const allModelsLoaded = Object.values(loadingProgress.models).every(status => status === 'loaded');
    const allAssetsLoaded = allTexturesLoaded && allCitylightsTexturesLoaded && allCloudsTexturesLoaded && allModelsLoaded;

    const allRequiredRefsPopulated = selectedSpacecraftRef.current;

    if (allAssetsLoaded && allRequiredRefsPopulated) {
      setSceneReady(true);
      if(sceneReady){
        console.log("sceneReady is settled and ready", sceneReady);
      }else{
        console.log("sceneReady is settled but not yet ready", sceneReady);
      }
      
    } else {
      setSceneReady(false);
      console.log("scene not Ready", allTexturesLoaded, allModelsLoaded, allRequiredRefsPopulated);
    }
  }, [loadingProgress, selectedSpacecraftRef.current, thirdPersonRef.current, spacecraftList]);

  
  // Render scene if everything setlled
  useEffect(() => {
    if (mountRef.current && sceneReady && rendererRef.current) {
      rendererRef.current.render(sceneRef, cameraRef);
    }
  }, []); // Run once

  
  // Initialize Cannon.js world
  useEffect(() => {
    if(!sceneReady || !selectedSpacecraftRef.current) return;

    const shipMesh = selectedSpacecraftRef.current.model;
    const shipData = selectedSpacecraftRef.current.data;
    
    worldRef.current = new CANNON.World();
    worldRef.current.gravity.set(0, 0, 0); // No global gravity, handled by custom forces
    worldRef.current.broadphase = new CANNON.SAPBroadphase(worldRef.current);
    worldRef.current.allowSleep = true;

    // Create a Cannon.js body for the spacecraft
    const spacecraftShape = new CANNON.Sphere(1); // Placeholder shape, adjust as needed
    spacecraftBodyRef.current = new CANNON.Body({
      mass: 1, // Placeholder mass, will be updated with actual spacecraft mass
      shape: spacecraftShape,
    });
    spacecraftBodyRef.current.position.copy(shipMesh.position);
    worldRef.current.addBody(spacecraftBodyRef.current);

    return () => {
      if (worldRef.current) {
        worldRef.current.removeBody(spacecraftBodyRef.current);
        worldRef.current = null;
        spacecraftBodyRef.current = null;
      }
    };
  }, [selectedSpacecraftRef.current, spacecraftList, loadingProgress]);

  // Animation loop (depends on sceneReady)
  useEffect(() => {
    if (!sceneReady) return;
    console.log("sceneReady", sceneReady, "Animating");

    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    const controls = controlsRef.current; 
    let time = Date.now();

    let animationFrameId;
    let lastUpdateTime = 0;

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Focus the window to ensure key events work
    window.focus();

    // console.log("Starting audio loading...");
    // audioLoaderRef.current.load('/sounds/mixkit-horror-sci-fi-wind-tunnel-894.wav', (buffer) => {
    //   soundRef.current.setBuffer(buffer);
    //   soundRef.current.setLoop(true);
    //   soundRef.current.setVolume(1);
    //   soundRef.current.play();
    // });
    // console.log("audio loaded!!");

    // if(camera.add(soundRef.current)){
    //   console.log("Sound added to camera");
    // };

    var tick = 0;
    const animate = () => {
      console.log(`Tick: ${tick += 1}`);
      if (!isPaused) {
        // Update game time
        const currentTime = Date.now();
        const deltaTime = (currentTime - time) * timeScale;
        setGameTime(prev => prev + deltaTime);
        time = currentTime;

        // Update Cannon.js world
        if (worldRef.current) {
          worldRef.current.step(1 / 60); // Update physics 60 times per second
        }

        // Handle Spacecraft's physics
        console.log(`Ship Body: ${worldRef.current}`);
        if (selectedSpacecraftRef.current && onSpacecraftUpdate && spacecraftBodyRef.current) {
          const ship = selectedSpacecraftRef.current.model;
          const shipData = selectedSpacecraftRef.current.data;

          // Thrust and orientation application
          if (!ship || !shipData) return;
          const thrustPower = 0.000000001;
          const { deltaPitch, deltaYaw, deltaRoll } = getRotationDeltaFromKeys(0.01);
          const rotated = updateOrientation(shipData, deltaPitch, deltaYaw, deltaRoll);
          const thrustVector = getThrustVectorFromKeys(rotated.orientation);
          const updated = applyThrust(rotated, thrustVector, thrustPower, deltaTime);

          // Apply thrust to Cannon.js body
          const cannonThrustVector = new CANNON.Vec3(thrustVector.x, thrustVector.y, thrustVector.z);
          spacecraftBodyRef.current.applyForce(cannonThrustVector.scale(thrustPower));

          // Apply gravitational forces from celestial bodies to Cannon.js body
          for (const bodyName in celestialBodiesRef.current) {
            const body = celestialBodiesRef.current[bodyName];
            if (body.mass && body.mesh) { // Ensure body has mass and a mesh for position
              const force = calculateGravitationalForce(
                ship.position, // Spacecraft position
                selectedSpacecraftRef.current.data.mass, // Spacecraft mass
                body.mesh.position, // Celestial body position
                body.mass // Celestial body mass
              );
              const cannonForce = new CANNON.Vec3(force.x, force.y, force.z);
              spacecraftBodyRef.current.applyForce(cannonForce);
            }
          }

          // Update Three.js mesh position and rotation from Cannon.js body
          ship.position.copy(spacecraftBodyRef.current.position);
          ship.quaternion.copy(spacecraftBodyRef.current.quaternion);

          // Update spacecraft data with Cannon.js position and orientation
          selectedSpacecraftRef.current.data.position.copy(spacecraftBodyRef.current.position / 100);
          selectedSpacecraftRef.current.data.orientation.copy(spacecraftBodyRef.current.quaternion / 100);

          // No longer need updatePosition and collision detection here, Cannon.js handles it
          // const moved = updatePosition(updated, deltaTime);
          // selectedSpacecraftRef.current.data = moved;

          // Collision detection and response will be handled by Cannon.js
          // for (const bodyName in celestialBodiesRef.current) {
          //   const body = celestialBodiesRef.current[bodyName];
          //   const celestialBodyData = CELESTIAL_BODIES[bodyName];

          //   if (body.mesh && celestialBodyData && !CELESTIAL_BODIES.NON_SOLID_TYPES.includes(celestialBodyData.type)) {
          //     const bodyRadius = scaler.scale(celestialBodyData.radius);
          //     const distance = ship.position.distanceTo(body.mesh.position);

          //     if (distance < bodyRadius) {
          //       const directionToBody = new Vector3().subVectors(ship.position, body.mesh.position).normalize();
          //       ship.position.copy(body.mesh.position.clone().add(directionToBody.multiplyScalar(bodyRadius)));
          //       selectedSpacecraftRef.current.data.position.copy(ship.position);
          //     }
          //   }
          // }

          scaler.positionMesh(ship, new Vector3(selectedSpacecraftRef.current.data.position.x, selectedSpacecraftRef.current.data.position.y, selectedSpacecraftRef.current.data.position.z));
          const euler = new Euler().setFromQuaternion(selectedSpacecraftRef.current.data.quaternion, 'XYZ');
          // console.log('Orientation (Quaternion):', selectedSpacecraftRef.current.data.orientation);
          // console.log('Converted Euler angles:', {x: euler.x, y: euler.y, z: euler.z});
          ship.rotation.set(euler.x, euler.y, euler.z);

          // console.log('Applied ship rotation:', ship.rotation);
          console.log(`Current Spacecraft position: ${ship.position.toArray()}`);
          console.log(`Current Camera position: ${camera.position.toArray()}`);
        }

        // onSpacecraftUpdate(moved);
        onSpacecraftUpdate(selectedSpacecraftRef.current.data);

        // Handle camera follow 
        thirdPersonRef.current.Update(timeScale);

        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
        renderer.setSize(window.innerWidth, window.innerHeight)
        renderer.render(scene, camera);
        animationFrameId = requestAnimationFrame(animate);
      };
    }

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      if (renderer.domElement && mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [sceneReady]);

  return (
    <div>
      <div 
        ref={mountRef} 
        tabIndex={0}
        className="w-full h-full relative"
        style={{ height: '100vh', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      >
      </div>
      <div className="min-h-screen bg-gray-900 flex items-center justify-center" style={{display: !sceneReady ? 'block' : 'none'}}> 
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mb-4"></div>
          <div className="text-white text-xl">Loading Assets...</div>
          {/* Display loading progress */}
          <div className="text-white text-sm mt-2">
            Textures: {Object.keys(loadingProgress.textures).length > 0 ? 
             `${Object.values(loadingProgress.textures).filter(status => status === 'loaded').length} / ${Object.keys(loadingProgress.textures).length}` : '0/0'}
          </div>
          <div className="text-white text-sm mt-2">
            Citylights Textures: {Object.keys(loadingProgress.citylightsTextures).length > 0 ? 
              `${Object.values(loadingProgress.citylightsTextures).filter(status => status === 'loaded').length} / ${Object.keys(loadingProgress.citylightsTextures).length}` : '0/0'}
          </div>
          <div className="text-white text-sm mt-2">
            Clouds Textures: {Object.keys(loadingProgress.cloudsTextures).length > 0 ? 
              `${Object.values(loadingProgress.cloudsTextures).filter(status => status === 'loaded').length} / ${Object.keys(loadingProgress.cloudsTextures).length}` : '0/0'}
          </div>
          <div className="text-white text-sm mt-2">
            Models: {Object.keys(loadingProgress.models).length > 0 ? 
              `${Object.values(loadingProgress.models).filter(progress => progress === 100).length} / ${Object.keys(loadingProgress.models).length}` : '0/0'}
          </div>
        </div>
       </div>
    </div>  
  )
}