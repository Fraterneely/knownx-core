import React, { useRef, useEffect, useState, useCallback } from 'react';
import { setupScene } from './sceneSetup';
import { initCannonWorld, gravitationalForce, applyOrbitalForces } from '../../utils/physicsUtils';
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
        getThrustVectorFromKeys, getRotationDeltaFromKeys } from './spacecraftControls';
import { setupOrbitControls } from './orbitalControlSetup';
import CannonDebugger from 'cannon-es-debugger';
import { ThirdPersonCamera } from './cameraSetup';
import { setupPostFX } from './postfx';

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

  // Effect for initial scene setup (runs once mountRef is available)
  useEffect(() => {
    if (!mountRef.current) return;

    const { scene, camera, renderer, composer, audioLoader, sound } = setupScene(mountRef);
    const {world, cannonDebugger, celestialBodiesMaterail, spacecraftsMaterial } = initCannonWorld(scene);
    setupLighting(scene, activeLights, setLightsReady); 
    setupStarfield(scene);
    setupCelestialBodies(world, scene, camera, celestialBodiesMaterail, celestialBodiesRef, orbitRefs, atmosphereRefs, cloudsRefs, textureLoader, setLoadingProgress);
    loadAllSpacecraftModels(world, scene, spacecraftsMaterial, spacecraftList, spacecraftsRef, selectedSpacecraftRef, setLoadingProgress);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    composerRef.current = composer;
    worldRef.current = world;
    celestialBodiesMaterailRef.current = celestialBodiesMaterail;
    spacecraftsMaterialRef.current = spacecraftsMaterial;
    cannonDebuggerRef.current = cannonDebugger;
    // audioLoaderRef.current = audioLoader;
    // soundRef.current = sound;

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

    const allRequiredRefsPopulated = selectedSpacecraftRef.current;

    if (allAssetsLoaded && allRequiredRefsPopulated) {
      setSceneReady(true);
      controlsRef.current = setupOrbitControls(cameraRef.current, rendererRef.current);
      
    } else {
      setSceneReady(false);
      // console.log("scene not Ready", allTexturesLoaded, allModelsLoaded, allRequiredRefsPopulated);
    }
  }, [loadingProgress, selectedSpacecraftRef.current, thirdPersonRef.current, spacecraftList]);
    
  // Animation loop (depends on sceneReady)
  useEffect(() => {
    if (!sceneReady || !selectedSpacecraftRef.current) return;
    console.log("sceneReady", sceneReady, "Animating");

    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    const composer = composerRef.current;
    const controls = controlsRef.current; 
    let time = Date.now();

    let animationFrameId;
    let lastUpdateTime = 0;

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Focus the window to ensure key events work
    window.focus();

    // Initialize 3rd Person view

    thirdPersonRef.current = new ThirdPersonCamera({ 
      camera: cameraRef.current,
      target: selectedSpacecraftRef.current.model,
    });
    
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
        const deltaTime = ((currentTime - time) / 1000) * timeScale;
        setGameTime(prev => prev + deltaTime);
        time = currentTime;

        // Update Cannon.js world and synchronize spacecraft models
        if (worldRef.current) {
          cannonDebuggerRef.current.update();
          worldRef.current.step(1 / 60); // Update physics 60 times per second
          
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
        // applyOrbitalForces(celestialBodiesRef);

        // Handle Spacecraft's physics
        if (selectedSpacecraftRef.current && onSpacecraftUpdate) {
          const shipBody = selectedSpacecraftRef.current.body;
          const ship = selectedSpacecraftRef.current.model;
          const shipData = selectedSpacecraftRef.current.data;

          // Thrust and orientation application
          if (!ship || !shipData || !shipBody) return;

          // Apply orientation
          const rotationSpeed = 0.09;
          const { deltaPitch, deltaYaw, deltaRoll } = getRotationDeltaFromKeys(rotationSpeed);
          const qDelta = new CANNON.Quaternion();
          qDelta.setFromEuler(deltaPitch * rotationSpeed, deltaYaw * rotationSpeed, deltaRoll * rotationSpeed, "XYZ");

          // Apply to shipBody quaternion
          shipBody.quaternion = shipBody.quaternion.mult(qDelta);
          // console.log(` ShipBody's quaternion: ${shipBody.quaternion.toArray()}`);

          // Apply thrust to Cannon.js body
          const thrustPower = 0.001;
          const thrustDir = getThrustVectorFromKeys(shipBody.quaternion);
          if (thrustDir.lengthSquared() > 0) {
            const thrustVector = thrustDir.scale(thrustPower);
            shipBody.applyForce(thrustVector);
          }


          // Apply gravitational forces from celestial bodies to Cannon.js body
          for (const bodyName in celestialBodiesRef.current) {
            const body = celestialBodiesRef.current[bodyName];
            if (shipBody && shipData && ship && body.bodyBody && body.bodyMesh && body.bodyData) {
              // console.log(`Applying gravity pull to ${shipData.name} from ${bodyName}`);
              const force = gravitationalForce(
                shipData.position, // Spacecraft position
                shipData.mass, // Spacecraft mass
                body.bodyData.position, // Celestial body position
                body.bodyData.mass // Celestial body mass
              );
              const cannonForce = new CANNON.Vec3(force.x, force.y, force.z);
              shipBody.applyForce(cannonForce);
            }
          }

          // Sync Three.js model to Cannon body
          ship.position.copy(shipBody.position);
          ship.quaternion.copy(shipBody.quaternion);

          // Sync data to body
          shipData.position.copy(scaler.reScaleVector(shipBody.position));
          shipData.orientation.copy(shipBody.quaternion);
          shipData.velocity.copy(scaler.reScaleVector(shipBody.velocity));

          let updatedShipData = updatePosition(shipData);
          updatedShipData = updateOrientation(updatedShipData);
          updatedShipData = updateVelocity(updatedShipData);
          updatedShipData = updateSystems(updatedShipData, deltaTime);

          // console.debug(`Update Ship data:(
          //   Position: (${updatedShipData.position.toArray()});
          //   Orientation: (${updatedShipData.orientation.toArray()});
          //   Mass: ${updatedShipData.mass} kg;
          //   )`);

          selectedSpacecraftRef.current.data = updatedShipData;
          selectedSpacecraftRef.current.body = shipBody;
          selectedSpacecraftRef.current.model = ship;
        }

        // onSpacecraftUpdate(moved);
        onSpacecraftUpdate(selectedSpacecraftRef.current.data);
        controlsRef.current.target.copy(selectedSpacecraftRef.current.model.position);
        // controlsRef.current.target.set(0, 0, 0);

        // Handle camera follow 
        thirdPersonRef.current.Update(timeScale);

        // Debugging information
        // console.debug(`Spacecraft position: ${selectedSpacecraftRef.current.model.position.toArray()}`);
        // console.debug(`Spacecraft orientation: ${selectedSpacecraftRef.current.model.quaternion.toArray()}`);
        // console.debug(`Camera position: ${camera.position.toArray()}`);

        // Update renderer and camera
        controlsRef.current.update();
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix();

        // Handle resize
        function onResize() {
          const w = window.innerWidth;
          const h = window.innerHeight;
          renderer.setSize(w, h);
          composer.setSize(w, h);
        }
        window.addEventListener('resize', onResize);

        composer.render();
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
  }, [sceneReady, timeScale]);

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