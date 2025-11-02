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
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { setupKeyboardControls } from './keyboardControls';

const scaler = new SpaceScaler();
const stats = new Stats();

export const useSpacecraftsRef = () => {
  const spacecraftsRef = useRef([]);
  return spacecraftsRef;
};

export default function SpaceRenderer({
  spacecraftList,
  onSpacecraftUpdate,
  targetBody,
  isPaused,
  setIsPaused,
  timeScale,
  showHUD,
  addLogEntry
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef();
  const cameraRef = useRef();
  const rendererRef = useRef();
  const composerRef = useRef();
  const listenerRef = useRef();
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
  const [cinematicTime, setCinematicTime] = useState(0);
  const [cinematicActive, setCinematicActive] = useState(false);
  const [cinematicFadeOut, setCinematicFadeOut] = useState(false);
  const cinematicTimeoutRef = useRef(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isEngineOn, setEngineOn] = useState(false);
  const [travelMode, setTraveMode] = useState(false);
  const soundTrackRef = useRef(null);
  const ambientTrackRef = useRef(null);
  const cinematicTrackRef = useRef(null);
  const engineSoundRef = useRef(null);


  // Effect for initial scene setup (runs once mountRef is available)
  useEffect(() => {
    if (!mountRef.current) return;

    const { scene, camera, renderer, composer, listener, audioLoader, sound } = setupScene(mountRef);
    const {world, cannonDebugger, celestialBodiesMaterail, spacecraftsMaterial } = initCannonWorld(scene);
    const landingSystem = new LandingSystem(scene, camera, composer);

    setupLighting(scene, activeLights, setLightsReady); 
    setupStarfield(scene, textureLoader);
    setupCelestialBodies(world, renderer, scene, camera, celestialBodiesMaterail, celestialBodiesRef, orbitRefs, atmosphereRefs, cloudsRefs, textureLoader, setLoadingProgress);
    loadAllSpacecraftModels(world, scene, spacecraftsMaterial, spacecraftList, spacecraftsRef, selectedSpacecraftRef, setLoadingProgress);
    // setupKeyboardControls(setShowOrbitalSelector);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    composerRef.current = composer;
    worldRef.current = world;
    celestialBodiesMaterailRef.current = celestialBodiesMaterail;
    spacecraftsMaterialRef.current = spacecraftsMaterial;
    cannonDebuggerRef.current = cannonDebugger;
    listenerRef.current = listener;
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
      const controls = setupOrbitControls(cameraRef.current, rendererRef.current.domElement);
      controlsRef.current = controls;

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

  // Effect for handling Pause/Resume shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPaused(prev => !prev);
        addLogEntry('Time Control', { action: isPaused ? 'Resume' : 'Pause' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPaused, setIsPaused]);

  // Cinematic Effect
  useEffect(() => {
    if (isPaused) {
      // Start countdown to cinematic mode
      cinematicTimeoutRef.current = setTimeout(() => {
        setCinematicActive(true);
        setCinematicFadeOut(false);
        setOrbitalControlActive(true);
        showHUD(false);
        console.log("🎥 Cinematic orbit started");
      }, 5000); // 15 seconds
    } else {
      // Unpaused — cancel cinematic and reset
      if (cinematicActive) {
        setCinematicFadeOut(true);
      }
      clearTimeout(cinematicTimeoutRef.current);
      cinematicTimeoutRef.current = null;
      setCinematicActive(false);
      setOrbitalControlActive(false);
    }
  
    return () => clearTimeout(cinematicTimeoutRef.current);
  }, [isPaused]);
  

  useEffect(() => {
    if (cinematicActive) {
      setCinematicTime(0);
    }
  }, [cinematicActive]);

  // Load Audios
  useEffect(() => {
    const audioLoader = audioLoaderRef.current;
    const listener = listenerRef.current;

    audioLoader.load('/sounds/15 S.T.A.Y.wav', buffer => {
      soundTrackRef.current = buffer;
    });
  
    audioLoader.load('/sounds/spacecraft-engine-loop-01-58205.wav', buffer => {
      engineSoundRef.current = buffer;
    });
  
    audioLoader.load('/sounds/relaxing-cinematic-pads-303218.wav', buffer => {
      cinematicTrackRef.current = buffer;
    });
  
    audioLoader.load('/sounds/spaceship-ambient-sfx-164114.wav', buffer => {
      ambientTrackRef.current = buffer;
    });
  
    return () => {
      cameraRef.current.remove(listener);
    };
  }, []); // Run once

  // Handle Audios
  useEffect(() => {
    const sound = soundRef.current;
  
    const fadeVolume = (targetVolume, duration = 2, onComplete = null) => {
      const initial = sound.getVolume();
      const step = (targetVolume - initial) / (duration * 60);
      let count = 0;
  
      const fade = () => {
        count++;
        sound.setVolume(initial + step * count);
        if (count < duration * 60) {
          requestAnimationFrame(fade);
        } else if (onComplete) {
          onComplete();
        }
      };
      fade();
    };
  
    const stopAll = (fadeOut = true) => {
      if (sound.isPlaying) {
        if (fadeOut) {
          fadeVolume(0, 1.5, () => sound.stop());
        } else {
          sound.stop();
        }
      }
    };
  
    const playTrack = (trackRef, volume = 0.6, loop = true) => {
      if (!trackRef.current) return;
      stopAll(true);
      sound.setBuffer(trackRef.current);
      sound.setLoop(loop);
      sound.setVolume(0);
      sound.play();
      fadeVolume(volume, 2);
    };
  
    // Logic choosing which track to play
    if (isPaused && cinematicActive) {
      playTrack(cinematicTrackRef, 0.7);
      setCurrentTrack('cinematic');
    } else if (travelMode) {
      playTrack(ambientTrackRef, 0.4);
      setCurrentTrack('ambient');
    } else if (isEngineOn) {
      playTrack(engineSoundRef, 0.5);
      setCurrentTrack('engine');
    } else {
      playTrack(soundTrackRef, 0.6);
      setCurrentTrack('soundtrack');
    }
  }, [isPaused, cinematicActive, travelMode, isEngineOn, keysPressed]);

  // Track if engine is on
  useEffect(() => {
    // Whenever keysPressed changes, update engine state
    if (keysPressed.has('KeyW')) {
      setEngineOn(true);
    } else {
      setEngineOn(false);
    }
  }, [keysPressed]);
  
  // Animation loop (depends on sceneReady)
  useEffect(() => {
    if (!sceneReady || !selectedSpacecraftRef.current || !cameraRef.current) return;
  
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    const composer = composerRef.current;
    const controls = controlsRef.current; 

    document.body.appendChild(stats.dom);
  
    let animationFrameId;
    let lastUpdateTime = performance.now();
  
    setThridPersonCameraActive(true);
    window.focus();
  
    // ✅ Define handlers ONCE
    const handleKeyDownInRender = async (e) => {
      handleKeyDown(e);
      if (e.code === 'KeyO') {
        if (orbitalControlActive) {
          setOrbitalControlActive(false);
          OrbitalTargetBody.current = null;
          setShowOrbitalSelector(true);
        } else {
          setShowOrbitalSelector(true);
        }
      }
      if (e.code === 'KeyT') {
        await setThridPersonCameraActive(true);
        setOrbitalControlActive(false);
        OrbitalTargetBody.current = null;
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
  
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      stats.update();
  
      const currentTime = performance.now();
      
      // Always update camera
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
  
  
      // When Paused
      if (isPaused) {
        const ship = selectedSpacecraftRef.current?.model;

        if (controls && ship) {
          if (cinematicActive) {
            controls.target.copy(ship.position);
            
            const realDelta = (currentTime - lastUpdateTime) / 1000;
            setCinematicTime(prev => prev + realDelta);

            // Easing logic
            let easeFactor;
            if (!cinematicFadeOut) {
              // Fade in over 5 seconds
              easeFactor = Math.min(1, cinematicTime / 5);
            } else {
              // Fade out over 2 seconds
              easeFactor = Math.max(0, 1 - cinematicTime / 2);
              if (easeFactor === 0) {
                setCinematicActive(false);
                setCinematicTime(0);
                setCinematicFadeOut(false);
              }
            }

            const orbitSpeed = 0.02 * easeFactor;
            const radius = 8e-8 * easeFactor;
            const time = performance.now() * 0.001;

            const x = ship.position.x + Math.cos(time * orbitSpeed) * radius;
            const z = ship.position.z + Math.sin(time * orbitSpeed) * radius;
            const y = ship.position.y;

            const smoothing = 1 - Math.pow(0.1, realDelta); // ~0.02 per 60fps frame
            camera.position.lerp(new THREE.Vector3(x, y, z), smoothing);

            camera.lookAt(ship.position);

            controls.update();
          }
        }

        composer.render();
        return;
      }

      
  
      // Calculate delta only when not paused
      let realDelta = (currentTime - lastUpdateTime) / 1000;
      lastUpdateTime = currentTime;
      
      const scaledDelta = realDelta * timeScale;
      setGameTime(prev => prev + scaledDelta);
  
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

      if (controls && orbitalControlActive && OrbitalTargetBody.current) {
        const targetBody = OrbitalTargetBody.current;
        
        // ✅ Handle both spacecraft and celestial bodies
        const targetPosition = targetBody.model 
          ? targetBody.model.position      // Spacecraft
          : targetBody.bodyMesh.position;  // Celestial body
        
      
        controls.target.copy(targetPosition);
        controls.update();
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
          
          if (bodyId.startsWith('spacecraft-')) {
            const spacecraftName = bodyId.replace('spacecraft-', '');
            
            if (spacecraftsRef.current) {
              const spacecraft = spacecraftsRef.current.get(spacecraftName);
              
              if (spacecraft && spacecraft.model && controlsRef.current && cameraRef.current) {
                setThridPersonCameraActive(false);
                thirdPersonRef.current = null;
                
                OrbitalTargetBody.current = spacecraft;
                
                // ✅ Set initial camera position ONCE
                const bodyRadius = scaler.scaleValue(spacecraft.data.size.x);
                const orbitRadius = bodyRadius * 5;
                
                cameraRef.current.position.set(
                  spacecraft.model.position.x + orbitRadius,
                  spacecraft.model.position.y + orbitRadius * 0.5,
                  spacecraft.model.position.z + orbitRadius
                );
                
                controlsRef.current.target.copy(spacecraft.model.position);
                setOrbitalControlActive(true);
                
                console.log(`Orbital control set to spacecraft: ${spacecraftName}`);
              }
            }
          } 
          else if (controlsRef.current && celestialBodiesRef.current && celestialBodiesRef.current[bodyId]) {
            setThridPersonCameraActive(false);
            thirdPersonRef.current = null;
            
            const targetBody = celestialBodiesRef.current[bodyId];
            OrbitalTargetBody.current = targetBody;
            
            // ✅ Set initial camera position ONCE
            const bodyRadius = scaler.scaleValue(targetBody.data.radius);
            const orbitRadius = bodyRadius * 3;
            
            cameraRef.current.position.set(
              targetBody.bodyMesh.position.x + orbitRadius,
              targetBody.bodyMesh.position.y + orbitRadius * 0.5,
              targetBody.bodyMesh.position.z + orbitRadius
            );
            
            controlsRef.current.target.copy(targetBody.bodyMesh.position);
            setOrbitalControlActive(true);
            
            console.log(`Orbital control set to celestial body: ${bodyId}`);
          }
        }}

         onClose={() => setShowOrbitalSelector(false)}
       />
    </div>  
  )
}