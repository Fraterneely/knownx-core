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
  const audioPlayingRef = useRef(false);

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
  
    let animationFrameId;
    let lastUpdateTime = performance.now();
  
    setThridPersonCameraActive(true);
    window.focus();
  
    // ✅ Define handlers ONCE
    const handleKeyDownInRender = (e) => {
      handleKeyDown(e);
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
  
    function onResize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      
      renderer.setSize(w, h);
      composer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  
    // ✅ Audio setup - only once per useEffect run
    if (!audioPlayingRef.current && soundRef.current && !soundRef.current.buffer) {
      console.log("Starting audio loading...");
      audioLoaderRef.current.load('/sounds/15 S.T.A.Y.wav', (buffer) => {
        soundRef.current.setBuffer(buffer);
        soundRef.current.setLoop(true);
        soundRef.current.setVolume(1);
        if (!isPaused) {
          soundRef.current.play();
          audioPlayingRef.current = true;
        }
      });
  
      if(camera.add(soundRef.current)){
        console.log("Sound added to camera");
      }
    }
  
    // ✅ Handle audio with current isPaused value
    const updateAudioPlayback = () => {
      if (!soundRef.current || !soundRef.current.buffer) return;
      
      if (isPaused && soundRef.current.isPlaying) {
        soundRef.current.pause();
        audioPlayingRef.current = false;
      } else if (!isPaused && !soundRef.current.isPlaying) {
        soundRef.current.play();
        audioPlayingRef.current = true;
      }
    };
  
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
  
      const currentTime = performance.now();
      
      // Always update camera
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
  
      // Handle audio
      updateAudioPlayback();
  
      // ✅ When paused, render and return
      if (isPaused) {
        if (orbitalControlActive && controls) {
          controls.target.copy(selectedSpacecraftRef.current.model.position);
          controls.update();
        }
        
        composer.render();
        return;
      }
  
      // Calculate delta only when not paused
      let realDelta = (currentTime - lastUpdateTime) / 1000;
      lastUpdateTime = currentTime;
      
      const scaledDelta = realDelta * timeScale;
      setGameTime(prev => prev + scaledDelta);
  
      // ALL YOUR PHYSICS AND UPDATE CODE HERE
      // (Keep exactly as you have it)
  
      const stars = scene.getObjectByName("starfield");
  
      if (worldRef.current) {
        worldRef.current.step(1/60, scaledDelta, 3);
        
        if (spacecraftsRef.current) {
          spacecraftsRef.current.forEach((wrapper, name) => {
            if (wrapper.model && wrapper.body) {
              wrapper.model.position.copy(wrapper.body.position);
              wrapper.model.quaternion.copy(wrapper.body.quaternion);
            }
          });
        }
      }
  
      applyOrbitalForces(celestialBodiesRef);
  
      if (selectedSpacecraftRef.current && onSpacecraftUpdate) {
        const shipBody = selectedSpacecraftRef.current.body;
        const ship = selectedSpacecraftRef.current.model;
        const shipData = selectedSpacecraftRef.current.data;
  
        if (ship && shipData && shipBody) {
          shipData.position.copy(scaler.reScaleVector(shipBody.position));
          shipData.orientation.copy(shipBody.quaternion);
  
          if (!shipBody.angularVelocity) {
            shipBody.angularVelocity = { pitch: 0, yaw: 0, roll: 0 };
          }
  
          const { deltaPitch, deltaYaw, deltaRoll } = getRotationDeltaFromKeys(0.0005);
  
          shipBody.angularVelocity.pitch += deltaPitch;
          shipBody.angularVelocity.yaw   += deltaYaw;
          shipBody.angularVelocity.roll  += deltaRoll;
  
          const maxSpeed = 0.05;
          shipBody.angularVelocity.pitch = Math.max(-maxSpeed, Math.min(maxSpeed, shipBody.angularVelocity.pitch));
          shipBody.angularVelocity.yaw   = Math.max(-maxSpeed, Math.min(maxSpeed, shipBody.angularVelocity.yaw));
          shipBody.angularVelocity.roll  = Math.max(-maxSpeed, Math.min(maxSpeed, shipBody.angularVelocity.roll));
          
          if (!isFinite(shipBody.angularVelocity.pitch)) shipBody.angularVelocity.pitch = 0;
          if (!isFinite(shipBody.angularVelocity.yaw)) shipBody.angularVelocity.yaw = 0;
          if (!isFinite(shipBody.angularVelocity.roll)) shipBody.angularVelocity.roll = 0;
  
          const qDelta = new CANNON.Quaternion();
          qDelta.setFromEuler(
            shipBody.angularVelocity.pitch,
            shipBody.angularVelocity.yaw,
            shipBody.angularVelocity.roll,
            "XYZ"
          );
  
          shipBody.quaternion = shipBody.quaternion.mult(qDelta);
  
          const mainTWR = shipData.twr || 2.0;
          const rcsTWR = 0.05;
  
          const { mainThrust, rcsThrust } = getThrustFromKeys(
            shipBody.quaternion,
            shipData.mass,
            mainTWR,
            rcsTWR
          );
  
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
  
          let totalForce = new CANNON.Vec3(0, 0, 0);
          let totalThrustVector = new CANNON.Vec3(0, 0, 0);
          
          if (mainThrust.lengthSquared() > 0) {
            totalThrustVector.vadd(scaledMainThrust, totalThrustVector);
            totalForce.vadd(scaledMainThrust, totalForce);
            applyForceToBody(shipBody, scaledMainThrust);
          }
  
          if (rcsThrust.lengthSquared() > 0) {
            totalThrustVector.vadd(scaledRcsThrust, totalThrustVector);
            totalForce.vadd(scaledRcsThrust, totalForce);
            applyForceToBody(shipBody, scaledRcsThrust);
          }
  
          if (landingSystemRef.current) {
            const landingInfo = landingSystemRef.current.update(
              shipBody,
              shipData.position,
              celestialBodiesRef,
              scaler,
              scaledDelta
            );
            
            setLandingData(landingInfo);
  
            if (landingInfo.phase === LANDING_PHASES.DESCENT || 
                landingInfo.phase === LANDING_PHASES.FINAL_APPROACH) {
              
              if (landingInfo.altitude < 5000 && landingInfo.verticalSpeed > 10) {
                const retroThrust = landingInfo.recommendedThrust;
                const upVector = new CANNON.Vec3(0, 0, -1);
                const retroForce = upVector.scale(mainThrust * retroThrust);
                applyForceToBody(shipBody, retroForce);
              }
            }
  
            if (landingInfo.phase === LANDING_PHASES.LANDED) {
              shipBody.velocity.set(0, 0, 0);
              shipBody.angularVelocity.set(0, 0, 0);
            }
          }
  
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
              totalForce.vadd(cannonForce, totalForce);
              applyForceToBody(shipBody, cannonForce);
            }
          }
  
          const cannonAcceleration = totalForce.scale(1 / shipData.mass);
  
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
      }
  
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
        const fadeFactor = Math.min(1.0, landingData.altitude / 100000);
        
        if (scene.background && scene.background.isTexture) {
          scene.fog = new THREE.FogExp2(0x87CEEB, (1 - fadeFactor) * 0.00001);
        }
      } else {
        scene.fog = null;
      }
  
      if (!orbitalControlActive && thirdPersonRef.current) {
        thirdPersonRef.current.Update(scaledDelta);
  
        if (!thirdPersonRef.current.currentOffset)
          thirdPersonRef.current.currentOffset = new THREE.Vector3(0.5e-8, 2e-8, 7.5e-8);
        if (!thirdPersonRef.current.targetOffset)
          thirdPersonRef.current.targetOffset = new THREE.Vector3(0.5e-8, 2e-8, 7.5e-8);
  
        if (keysPressed.has('KeyC')) {
          thirdPersonRef.current.targetOffset.set(0, 0, -2.5e-8);
          thirdPersonRef.current.lookOffset.set(0, 0, -1);
        } else if (keysPressed.has('BracketRight')) {
          thirdPersonRef.current.targetOffset.set(5e-8, 0, 0);
          thirdPersonRef.current.lookOffset.set(0, 0, 0);
        } else if (keysPressed.has('BracketLeft')) {
          thirdPersonRef.current.targetOffset.set(-5e-8, 0, 0);
          thirdPersonRef.current.lookOffset.set(0, 0, 0);
        } else if (keysPressed.has('Equal')) {
          thirdPersonRef.current.targetOffset.set(0, 1e-8, -7e-8);
          thirdPersonRef.current.lookOffset.set(0, 0, 0);
        } else if (keysPressed.has('KeyV')) {
          thirdPersonRef.current.targetOffset.set(0.5e-8, 2e-8, 7.5e-8);
          thirdPersonRef.current.lookOffset.set(0, 0, -1e-8);
        }
  
        thirdPersonRef.current.currentOffset.lerp(thirdPersonRef.current.targetOffset, 0.5);
        thirdPersonRef.current.offset.copy(thirdPersonRef.current.currentOffset);
      }
  
      if (orbitalControlActive && OrbitalTargetBody.current) {
        controlsRef.current.setTargetAndRange(OrbitalTargetBody.current, { bodyRadius: OrbitalTargetBody.current.data.radius || 0 });
        controlsRef.current.update();
      }
  
      onSpacecraftUpdate(selectedSpacecraftRef.current.data);
  
      composer.render();
    };
  
    // ✅ Add event listeners ONCE, outside animate loop
    window.addEventListener('keydown', handleKeyDownInRender);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('resize', onResize);
  
    // Start animation
    animate();
  
    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDownInRender);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', onResize);
      
      if (soundRef.current && soundRef.current.isPlaying) {
        soundRef.current.stop();
        audioPlayingRef.current = false;
      }
    };
  }, [sceneReady, isPaused, timeScale, orbitalControlActive]);

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