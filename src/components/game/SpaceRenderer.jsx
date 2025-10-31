import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { setupScene } from './sceneSetup';
import { initCannonWorld, gravitationalForce, applyOrbitalForces, applyForceToBody, AU_TO_METERS } from '../../utils/physicsUtils';
import * as CANNON from 'cannon-es';
import { CELESTIAL_BODIES } from '@/entities/CelestialBodies';
import { setupLighting } from './lightingSetup';
import { setupCelestialBodies } from './celestialBodySetup';
import { TextureLoader, Vector3, Euler } from 'three';
import { loadAllSpacecraftModels, updatePosition, 
        applyThrust, updateOrientation,
        updateShipControl, updateSpacecraftModels, 
        updateVelocity, updateSystems} from '../../entities/Spacecrafts';
import { SpaceScaler } from '../../utils/scaler';
import { setupStarfield } from './starfieldSetup';
import { handleKeyDown, handleKeyUp, keysPressed, 
        getThrustVectorFromKeys, getRotationDeltaFromKeys, 
        getThrustFromKeys} from './spacecraftControls';
import { setupOrbitControls } from './orbitalControlSetup';
import CannonDebugger from 'cannon-es-debugger';
import { ThirdPersonCamera, FirstPersonCamera } from './cameraSetup';
import { LandingSystem, LANDING_PHASES } from './LandingSystem';
import LandingHUD from '../ui/LandingHUD';
import OrbitalTargetSelector from '../ui/OrbitalTargetSelector';
import { updateAllAtmospheres } from '../../utils/atmosphereHelper';

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
  timeScale,
  onLandingStatusChange
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef();
  const cameraRef = useRef();
  const rendererRef = useRef();
  const composerRef = useRef();
  const audioLoaderRef = useRef();
  const soundRef = useRef();
  const controlsRef = useRef();
  const activeLights = useRef([]);
  const celestialBodiesRef = useRef({});
  const atmosphereRefs = useRef({});
  const cloudsRefs = useRef({});
  const orbitRefs = useRef({});
  const textureLoader = useRef(new TextureLoader);
  const spacecraftsRef = useRef(new Map()); // spacecraft data here
  const selectedSpacecraftRef = useSpacecraftsRef();
  const thirdPersonRef = useRef();
  const worldRef = useRef(null); // Cannon.js world
  const celestialBodiesMaterailRef = useRef();
  const spacecraftsMaterialRef = useRef();
  const cannonDebuggerRef = useRef(null); // Cannon.js debugger 
  const [loadingProgress, setLoadingProgress] = useState({
    textures: {},
    citylightsTextures: {},
    cloudsTextures: {},
    models: {},
  });
  const [sceneReady, setSceneReady] = useState(false);
  const [gameTime, setGameTime] = useState(0);
  const [activeLightsReady, setLightsReady] = useState(false);
  const [thirdPersonCameraReady, setThirdPersonCameraReady] = useState(false);
  const landingSystemRef = useRef(null);
  const [landingData, setLandingData] = useState(null);
  const [showOrbitalSelector, setShowOrbitalSelector] = useState(false);
  const [orbitalControlActive, setOrbitalControlActive] = useState(false);
  const [thridPersonCameraActive, setThridPersonCameraActive] = useState(false);
  const OrbitalTargetBody = useRef(null);

  // Effect for initial scene setup (runs once mountRef is available)
  useEffect(() => {
    if (!mountRef.current) return;

    const { scene, camera, renderer, composer, audioLoader, sound } = setupScene(mountRef);
    const {world, cannonDebugger, celestialBodiesMaterail, spacecraftsMaterial } = initCannonWorld(scene);
    const landingSystem = new LandingSystem(scene, camera, composer);

    setupLighting(scene, activeLights, setLightsReady); 
    setupStarfield(scene, textureLoader);
    setupCelestialBodies(world, renderer, scene, camera, celestialBodiesMaterail, celestialBodiesRef, orbitRefs, atmosphereRefs, cloudsRefs, textureLoader, setLoadingProgress);
    loadAllSpacecraftModels(world, scene, spacecraftsMaterial, spacecraftList, spacecraftsRef, selectedSpacecraftRef, setLoadingProgress);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    composerRef.current = composer;
    worldRef.current = world;
    celestialBodiesMaterailRef.current = celestialBodiesMaterail;
    spacecraftsMaterialRef.current = spacecraftsMaterial;
    cannonDebuggerRef.current = cannonDebugger;
    audioLoaderRef.current = audioLoader;
    soundRef.current = sound;
    landingSystemRef.current = landingSystem;

    // Cleanup for initial setup
    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (rendererRef.current.domElement && mountRef.current?.contains(rendererRef.current.domElement)) {
          mountRef.current.removeChild(rendererRef.current.domElement);
        }
      }
      if(worldRef.current){
        worldRef.current = null;
      }
    };
  }, []); // Runs once on mount

  // Effect to set sceneReady when all assets are loaded and refs are populated
  useEffect(() => {
    const totalExpectedTextures = Object.values(CELESTIAL_BODIES).filter(body => body.texture).length;
    const totalExpectedCitylightsTextures = Object.values(CELESTIAL_BODIES).filter(body => body.citylightsTexture).length;
    const totalExpectedCloudsTextures = Object.values(CELESTIAL_BODIES).filter(body => body.clouds).length;
    const totalExpectedModels = spacecraftList ? spacecraftList.length : 0;

    const loadedTextureCount = Object.values(loadingProgress.textures).filter(status => status === 'loaded').length;
    const loadedCitylightsTexturesCount = Object.values(loadingProgress.citylightsTextures).filter(status => status === 'loaded').length;
    const loadedCloudsTexturesCount = Object.values(loadingProgress.cloudsTextures).filter(status => status === 'loaded').length;
    const loadedModelCount = Object.values(loadingProgress.models).filter(status => status === 'loaded').length;

    const allTexturesLoaded = totalExpectedTextures === 0 || loadedTextureCount === totalExpectedTextures;
    const allCitylightsTexturesLoaded = totalExpectedCitylightsTextures === 0 || loadedCitylightsTexturesCount === totalExpectedCitylightsTextures;
    const allCloudsTexturesLoaded = totalExpectedCloudsTextures === 0 || loadedCloudsTexturesCount === totalExpectedCloudsTextures;
    const allModelsLoaded = totalExpectedModels === 0 || loadedModelCount === totalExpectedModels;
    const allAssetsLoaded = allTexturesLoaded && allCitylightsTexturesLoaded && allCloudsTexturesLoaded && allModelsLoaded;

    if (allAssetsLoaded && selectedSpacecraftRef.current?.model) {
      setSceneReady(true);
      // when sceneReady
      const { controls, setTargetAndRange } = setupOrbitControls(cameraRef.current, rendererRef.current.domElement);
      controlsRef.current = controls;
      controlsRef.current.setTargetAndRange = setTargetAndRange; // attach helper for convenience

    } else {
      setSceneReady(false);
    }
    
  }, [loadingProgress, selectedSpacecraftRef.current, thirdPersonRef.current, spacecraftList]);

  // Create third person camera
  useEffect(() => {
    if (!selectedSpacecraftRef.current?.model || !cameraRef.current || !thridPersonCameraActive) return;
    thirdPersonRef.current = new FirstPersonCamera({
      camera: cameraRef.current,
      target: selectedSpacecraftRef.current.model,
      shipBody: selectedSpacecraftRef.current.body, 
    });
    setThirdPersonCameraReady(true);
    console.log("ThirdPersonCamera initialized!");
  }, [selectedSpacecraftRef.current?.model, thridPersonCameraActive]);

  // Animation loop (depends on sceneReady)
  useEffect(() => {
    if (!sceneReady || !selectedSpacecraftRef.current || !cameraRef.current) return;

    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    const composer = composerRef.current;
    const controls = controlsRef.current; 
    let time = Date.now();

    let animationFrameId;
    let lastUpdateTime = time;

    setThridPersonCameraActive(true);

    const handleKeyDownWithOrbitalControl = (e) => {
       handleKeyDown(e);
       // Handle 'o' key press to activate orbital control selection
       if (e.code === 'KeyO') {
         if (orbitalControlActive) {
           setOrbitalControlActive(false);
           OrbitalTargetBody.current = null;
         } else {
           setShowOrbitalSelector(true);
         }
       }
       if (e.code === 'KeyT') {
          setThridPersonCameraActive(true);
       }
    };

    // Handle resize
    function onResize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      composer.setSize(w, h);
    }

    // Focus the window to ensure key events work
    window.focus();
    
    console.log("Starting audio loading...");
    audioLoaderRef.current.load('/sounds/15 S.T.A.Y.wav', (buffer) => {
      soundRef.current.setBuffer(buffer);
      soundRef.current.setLoop(true);
      soundRef.current.setVolume(1);
      soundRef.current.play();
    });
    console.log("audio loaded!!");

    if(camera.add(soundRef.current)){
      console.log("Sound added to camera");
    };

    var tick = 0;
    const animate = () => {
      tick++;
      const currentTime = performance.now();
      const realDelta = (currentTime - time) / 1000; // seconds in real world
      const scaledDelta = realDelta * timeScale;     // accelerated sim time
      time = currentTime;

      setGameTime(prev => prev + scaledDelta);

      if (!isPaused) {  
        lastUpdateTime = currentTime;

        const stars = scene.getObjectByName("starfield");
        if (stars && stars.tick) stars.tick(scaledDelta);  

        // Update Physics
        if (worldRef.current) {
          // cannonDebuggerRef.current.update();
          worldRef.current.step(1/60, scaledDelta, 3);
          
          // Sync Three.js models with Cannon.js bodies
          if (spacecraftsRef.current) {
            spacecraftsRef.current.forEach((wrapper, name) => {
              if (wrapper.model && wrapper.body) {
                wrapper.model.position.copy(wrapper.body.position);
                wrapper.model.quaternion.copy(wrapper.body.quaternion);
              }
            });
          }
        }

        // Update celestial body positions (orbital & Gravity mechanics)
        applyOrbitalForces(celestialBodiesRef);

        // Handle Spacecraft's physics
        if (selectedSpacecraftRef.current && onSpacecraftUpdate) {
          const shipBody = selectedSpacecraftRef.current.body;
          const ship = selectedSpacecraftRef.current.model;
          const shipData = selectedSpacecraftRef.current.data;

          // Thrust and orientation application
          if (!ship || !shipData || !shipBody) return;

          // Sync Cannon body to ship data
          shipData.position.copy(scaler.reScaleVector(shipBody.position));
          shipData.orientation.copy(shipBody.quaternion);

          /* ROTATION */
          // Keep track of angular velocity (persistent across frames)
          if (!shipBody.angularVelocity) {
            shipBody.angularVelocity = { pitch: 0, yaw: 0, roll: 0 };
          }

          // Get input deltas from keys (these act as acceleration)
          const { deltaPitch, deltaYaw, deltaRoll } = getRotationDeltaFromKeys(0.0005); // tweak small for smooth acceleration

          // Update angular velocity
          shipBody.angularVelocity.pitch += deltaPitch;
          shipBody.angularVelocity.yaw   += deltaYaw;
          shipBody.angularVelocity.roll  += deltaRoll;

          // Optionally clamp angular velocity to avoid crazy spinning
          const maxSpeed = 0.05;
          shipBody.angularVelocity.pitch = Math.max(-maxSpeed, Math.min(maxSpeed, shipBody.angularVelocity.pitch));
          shipBody.angularVelocity.yaw   = Math.max(-maxSpeed, Math.min(maxSpeed, shipBody.angularVelocity.yaw));
          shipBody.angularVelocity.roll  = Math.max(-maxSpeed, Math.min(maxSpeed, shipBody.angularVelocity.roll));
          
          // Ensure all values are finite to prevent audio listener errors
          if (!isFinite(shipBody.angularVelocity.pitch)) shipBody.angularVelocity.pitch = 0;
          if (!isFinite(shipBody.angularVelocity.yaw)) shipBody.angularVelocity.yaw = 0;
          if (!isFinite(shipBody.angularVelocity.roll)) shipBody.angularVelocity.roll = 0;

          // Apply rotation based on angular velocity
          const qDelta = new CANNON.Quaternion();
          qDelta.setFromEuler(
            shipBody.angularVelocity.pitch,
            shipBody.angularVelocity.yaw,
            shipBody.angularVelocity.roll,
            "XYZ"
          );

          shipBody.quaternion = shipBody.quaternion.mult(qDelta);

          // Apply thrust to Cannon.js body
          // const thrustPower = (shipData.mass * 9.8 * shipData.twr) * (scaler.SCALE_X ** 2) / AU_TO_METERS;

          /* THRUST */
          // Calculate thrust power
          const mainTWR = shipData.twr || 2.0; // Main engine TWR
          const rcsTWR = 0.05; // RCS is much weaker (0.5g)

          // Get separated thrust forces
          const { mainThrust, rcsThrust } = getThrustFromKeys(
            shipBody.quaternion,
            shipData.mass,
            mainTWR,
            rcsTWR
          );

          // Convert to SCALED coordinates
          const scaledMainThrust = new CANNON.Vec3(
            mainThrust.x * (scaler.SCALE_X ** 2) / AU_TO_METERS,
            mainThrust.y * (scaler.SCALE_X ** 2) / AU_TO_METERS,
            mainThrust.z * (scaler.SCALE_X ** 2) / AU_TO_METERS
          );

          const scaledRcsThrust = new CANNON.Vec3(
            rcsThrust.x * (scaler.SCALE_X ** 2) / AU_TO_METERS,
            rcsThrust.y * (scaler.SCALE_X ** 2) / AU_TO_METERS,
            rcsThrust.z * (scaler.SCALE_X ** 2) / AU_TO_METERS
          );

          // Apply main engine thrust
          let totalForce = new CANNON.Vec3(0, 0, 0);
          let totalThrustVector = new CANNON.Vec3(0, 0, 0);
          if (mainThrust.lengthSquared() > 0) {
            totalThrustVector.vadd(scaledMainThrust, totalThrustVector);
            totalForce.vadd(scaledMainThrust, totalForce);
            applyForceToBody(shipBody, scaledMainThrust);
          }

          // Apply RCS thrust
          if (rcsThrust.lengthSquared() > 0) {
            totalThrustVector.vadd(scaledRcsThrust, totalThrustVector);
            totalForce.vadd(scaledRcsThrust, totalForce);
            applyForceToBody(shipBody, scaledRcsThrust);
          }

          /* LANDING */
          // Landing system integration
          if (landingSystemRef.current) {
            const landingInfo = landingSystemRef.current.update(
              shipBody,
              shipData.position,
              celestialBodiesRef,
              scaler,
              scaledDelta
            );
            
            setLandingData(landingInfo);

            // Auto-apply retro thrust during descent if autopilot engaged
            if (landingInfo.phase === LANDING_PHASES.DESCENT || 
                landingInfo.phase === LANDING_PHASES.FINAL_APPROACH) {
              
              // Calculate upward thrust vector to counteract gravity
              if (landingInfo.altitude < 5000 && landingInfo.verticalSpeed > 10) {
                const retroThrust = landingInfo.recommendedThrust;
                
                // Apply upward force
                const upVector = new CANNON.Vec3(0, 0, -1);
                const retroForce = upVector.scale(mainThrust * retroThrust);
                applyForceToBody(shipBody, retroForce);
                
                console.log(`🔥 Retro-thrust: ${(retroThrust * 100).toFixed(0)}%`);
              }
            }

            // Stop spacecraft when landed
            if (landingInfo.phase === LANDING_PHASES.LANDED) {
              shipBody.velocity.set(0, 0, 0);
              shipBody.angularVelocity.set(0, 0, 0);
            }
          }

          /* GRAVITY */
          // Apply gravitational forces from celestial bodies to Cannon.js body
          for (const bodyName in celestialBodiesRef.current) {
            const body = celestialBodiesRef.current[bodyName];
            if (shipBody && shipData && body.data) {
              const force = gravitationalForce(
                shipData.position,
                shipData.mass,
                body.data.position,
                body.data.mass
              );
              
              const cannonForce = new CANNON.Vec3(force.x, force.y, force.z);
              totalForce.vadd(cannonForce, totalForce); // ✓ Accumulate forces
              applyForceToBody(shipBody, cannonForce);
            }
          }

          // Calculate total acceleration (after all forces applied)
          const cannonAcceleration = totalForce.scale(1 / shipData.mass);

          // Sync Cannon body to Three.js model
          ship.position.copy(shipBody.position);
          ship.quaternion.copy(shipBody.quaternion);

          const AccSim = new THREE.Vector3(
            cannonAcceleration.x,
            cannonAcceleration.y,
            cannonAcceleration.z
          );

          const velSim = new THREE.Vector3(
            shipBody.velocity.x,
            shipBody.velocity.y,
            shipBody.velocity.z
          );

          // Convert to meters/second² and meters/second
          shipData.acceleration.copy(AccSim.multiplyScalar(AU_TO_METERS / (scaler.SCALE_X ** 2)));
          shipData.velocity.copy(velSim.multiplyScalar(AU_TO_METERS / (scaler.SCALE_X ** 2)));
          shipData.thrust_vector.copy(totalThrustVector);

          let updatedShipData = updatePosition(shipData);
          updatedShipData = updateOrientation(updatedShipData);
          updatedShipData = updateVelocity(updatedShipData);
          updatedShipData = updateSystems(updatedShipData, scaledDelta);

          selectedSpacecraftRef.current.data = updatedShipData;
          selectedSpacecraftRef.current.body = shipBody;
          selectedSpacecraftRef.current.model = ship;
        }

        /* Atmosphere Update */
        if (celestialBodiesRef.current['sun']) {
          const sunPosition = celestialBodiesRef.current['sun'].bodyMesh.position.clone();
          
          updateAllAtmospheres(
            atmosphereRefs,
            cloudsRefs,
            camera,
            sunPosition,
            landingData,
            scaledDelta
          );
        }

        if (landingData && landingData.altitude < 100000) {
          // Fade starfield/background based on altitude
          const fadeFactor = Math.min(1.0, landingData.altitude / 100000);
          
          // If you have a starfield, fade it out
          if (scene.background && scene.background.isTexture) {
            // Can't directly fade cube texture, but you could use fog
            scene.fog = new THREE.FogExp2(0x87CEEB, (1 - fadeFactor) * 0.00001);
          }
        } else {
          scene.fog = null; // Clear fog in space
        }

        // Camera Update - only if orbital control is not active
        if (!orbitalControlActive && thirdPersonRef.current) {
          thirdPersonRef.current.Update(scaledDelta);

          // Define current and target camera offsets (persistent)
          if (!thirdPersonRef.current.currentOffset)
            thirdPersonRef.current.currentOffset = new THREE.Vector3(0.5e-8, 2e-8, 7.5e-8); // default chase view
          if (!thirdPersonRef.current.targetOffset)
            thirdPersonRef.current.targetOffset = new THREE.Vector3(0.5e-8, 2e-8, 7.5e-8);

          // Handle camera mode keys
          if (keysPressed.has('KeyC')) {
            thirdPersonRef.current.targetOffset.set(0, 0, -2.5e-8); // cockpit
            thirdPersonRef.current.lookOffset.set(0, 0, -1); // cockpit
          } else if (keysPressed.has('BracketRight')) {
            thirdPersonRef.current.targetOffset.set(5e-8, 0, 0); // right side
            thirdPersonRef.current.lookOffset.set(0, 0, 0);
          } else if (keysPressed.has('BracketLeft')) {
            thirdPersonRef.current.targetOffset.set(-5e-8, 0, 0); // left side
            thirdPersonRef.current.lookOffset.set(0, 0, 0);
          } else if (keysPressed.has('Equal')) {
            thirdPersonRef.current.targetOffset.set(0, 1e-8, -7e-8); // front view
            thirdPersonRef.current.lookOffset.set(0, 0, 0); // front view
          } else if (keysPressed.has('KeyV')) {
            thirdPersonRef.current.targetOffset.set(0.5e-8, 2e-8, 7.5e-8); // reset to default chase view
            thirdPersonRef.current.lookOffset.set(0, 0, -1e-8);
          }

          // Smooth interpolation toward target (cool transition)
          thirdPersonRef.current.currentOffset.lerp(thirdPersonRef.current.targetOffset, 0.5);

          // Apply result
          thirdPersonRef.current.offset.copy(thirdPersonRef.current.currentOffset);
        }
 
        if (orbitalControlActive && OrbitalTargetBody.current) {
          controlsRef.current.setTargetAndRange(OrbitalTargetBody.current, { bodyRadius: OrbitalTargetBody.current.data.radius || 0 });
          controlsRef.current.update();
        }

        // onSpacecraftUpdate;
        onSpacecraftUpdate(selectedSpacecraftRef.current.data);

        setTimeout(() => {
          const { testAtmosphereInScene } = require('../../utils/atmosphereDebug');
          testAtmosphereInScene(sceneRef.current);
        }, 10000);

        // Update renderer and camera
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix();

        composer.render();

        window.addEventListener('keydown', handleKeyDownWithOrbitalControl);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('resize', onResize);
      };

      animationFrameId = requestAnimationFrame(animate);
    }

    animate();

    // cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDownWithOrbitalControl);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (renderer.domElement && mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
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
      {/* Add Landing HUD */}
      <LandingHUD 
        landingData={landingData}
      />
      <OrbitalTargetSelector
         isOpen={showOrbitalSelector}
         onSelectBody={(bodyId) => {
           setShowOrbitalSelector(false);
           
           // Check if this is a spacecraft target
             if (bodyId.startsWith('spacecraft-')) {
               const spacecraftName = bodyId.replace('spacecraft-', '');
               
               // Access spacecraft from the spacecraftsRef
               if (spacecraftsRef.current) {
                 // Find the spacecraft model in the scene
                 const spacecraft = spacecraftsRef.current.get(spacecraftName);
                 
                 if (spacecraft && spacecraft.model && controlsRef.current && cameraRef.current) {
                  // Disable third-person camera and activate orbital control
                  setThridPersonCameraActive(false);
                  thirdPersonRef.current = null;
                   
                  // Set orbital control target to the spacecraft
                  OrbitalTargetBody.current = spacecraft.model;
                  controlsRef.current.setTargetAndRange(spacecraft.model, { bodyRadius: scaler.scaleValue(spacecraft.data.radius) || 0 });
                  setOrbitalControlActive(true);
                   
                  console.log(`Orbital control set to spacecraft: ${spacecraftName}`);
                 } else {
                   console.warn(`Could not set orbital control to spacecraft: ${spacecraftName}`);
                 }
               } else {
                 console.warn(`Spacecraft reference not available`);
               }
           } 
           // Otherwise it's a celestial body
           else if (controlsRef.current && celestialBodiesRef.current && celestialBodiesRef.current[bodyId] && 
            cameraRef.current && celestialBodiesRef.current[bodyId].bodyMesh && 
            celestialBodiesRef.current[bodyId].bodyMesh.position) {
             
            // Disable third-person camera and activate orbital control
            setThridPersonCameraActive(false);
            thirdPersonRef.current = null;
             
            const targetBody = celestialBodiesRef.current[bodyId];
            OrbitalTargetBody.current = targetBody.bodyMesh;
            controlsRef.current.setTargetAndRange(OrbitalTargetBody.current, { bodyRadius: scaler.scaleValue(targetBody.data.radius) || 0 });
            setOrbitalControlActive(true);

            console.log(`Orbital control set to celestial body: ${bodyId}`);
           } else {
             console.warn(`Could not set orbital control to target: ${bodyId}`);
           }
         }}

         onClose={() => setShowOrbitalSelector(false)}
       />
    </div>  
  )
}