import React, { useRef, useEffect, useState, useCallback } from 'react';
import { setupScene } from './sceneSetup';
import { setupLighting } from './lightingSetup';
import { setupCelestialBodies } from './celestialBodySetup';
import { TextureLoader, Vector3 } from 'three';
import { loadAllSpacecraftModels, updatePosition, updateShipControl, updateSpacecraftModels } from '../../entities/Spacecrafts';
import { SpaceScaler } from '../../utils/scaler';
import { setupStarfield } from './starfieldSetup';
import { applyThrust } from '../../entities/Spacecrafts';

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
  const controlsRef = useRef();
  const activeLights = useRef([]);
  const celestialBodiesRef = useRef({});
  const atmosphereRefs = useRef({});
  const cloudsRefs = useRef({});
  const orbitRefs = useRef({});
  const textureLoader = useRef(new TextureLoader);
  const spacecraftsRef = useRef([]); // spacecraft data here
  const selectedSpacecraftRef = useSpacecraftsRef();
  const keysPressed = new Set();
  const thirdPersonRef = useRef();
  const [textureLoadStatus, setTextureLoadStatus] = useState({});
  const [sceneReady, setSceneReady] = useState(false);
  const [activeLightsReady, setLightsReady] = useState(false);

  useEffect(() => {
    if (!mountRef.current) return;

    const { scene, camera, renderer, controls } = setupScene(mountRef, sceneRef, cameraRef, rendererRef, controlsRef);
    setupLighting(scene, activeLights, setLightsReady);
    setupStarfield(scene);
    setupCelestialBodies(scene, celestialBodiesRef, orbitRefs, atmosphereRefs, cloudsRefs, textureLoader, setTextureLoadStatus);
    loadAllSpacecraftModels(scene, camera, spacecraftList, spacecraftsRef, selectedSpacecraftRef, thirdPersonRef);

    setSceneReady(true);

    return () => {
      // controls.dispose();
      renderer.dispose();
    };

  }, []);

  // Animation loop
  useEffect(() => {
    if (!sceneReady) return;

    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    const controls = controlsRef.current; 
    camera.rotate = Math.PI;
    let time = Date.now();

    let animationFrameId;
    const ROTATION_STEP = Math.PI / 180;

    const handleKeyDown = (e) => {
      keysPressed.add(e.code);
    };

    const handleKeyUp = (e) => {
      keysPressed.delete(e.code);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Focus the window to ensure key events work
    window.focus();

    const getThrustVectorFromKeys = (orientation) => {
      if (!orientation) {
          console.log('No orientation provided. Returning zero vector.');
          return new Vector3();
      }
  
      // Basis vectors based on yaw (for forward/backward and right/left)
      const forward = new Vector3(
          -Math.sin(orientation.yaw),
          0,
          -Math.cos(orientation.yaw)
      );
  
      const right = new Vector3(
          Math.cos(orientation.yaw),
          0,
          -Math.sin(orientation.yaw)
      );
  
      // Up vector is fixed globally in Y-axis for now
      const up = new Vector3(0, 1, 0);
  
      let thrust = new Vector3();
  
      // Left/Right
      if (keysPressed.has('KeyD')) {
          thrust.add(forward);
          console.log('KeyD pressed. Thrust right:', forward.toArray());
      }
      if (keysPressed.has('KeyA')) {
          thrust.sub(forward);
          console.log('KeyA pressed. Thrust left:', forward.toArray());
      }
  
      // Forward/Backward
      if (keysPressed.has('KeyW')) {
          thrust.sub(right);
          console.log('KeyW pressed. Thrust forward:', right.toArray());
      }
      if (keysPressed.has('KeyS')) {
          thrust.add(right);
          console.log('KeyS pressed. Thrust backward:', right.toArray());
      }
  
      // Up/Down (Lift)
      if (keysPressed.has('KeyE')) {
          thrust.add(up);
          console.log('KeyE pressed. Thrust up:', up.toArray());
      }
      if (keysPressed.has('KeyQ')) {
          thrust.sub(up);
          console.log('KeyQ pressed. Thrust down:', up.toArray());
      }
  
      const normalizedThrust = thrust.lengthSq() > 0 ? thrust.normalize() : thrust;
      return normalizedThrust;
  };
  
    

    const animate = () => {
      if (!isPaused) {
        const currentTime = Date.now()
        const deltaTime = currentTime - time
        time = currentTime

        console.log(`DeltaTime from anima: ${deltaTime}`);

        if(!thirdPersonRef.current){
          camera.position.y += 0.000001;
          camera.position.z -= 0.000001
        }

        if (selectedSpacecraftRef.current && camera && thirdPersonRef.current && onSpacecraftUpdate) {
          const ship = selectedSpacecraftRef.current.model;
          const shipData = selectedSpacecraftRef.current.data;

          // Handle camera follow
          thirdPersonRef.current.Update(timeScale);

          ship.position.y += Math.sin(0.00000001);
          shipData.position.y += Math.sin(0.00000001);

          // Thrust application
          if (!ship || !shipData) return;
          const thrustVector = getThrustVectorFromKeys(shipData.orientation);
          const updated = applyThrust(shipData, thrustVector, 1, deltaTime);
          const moved = updatePosition(updated, deltaTime);
          selectedSpacecraftRef.current.data = moved;
          scaler.positionMesh(ship, new Vector3(moved.position.x, moved.position.y, moved.position.z));

          selectedSpacecraftRef.current.model = ship;

          // onSpacecraftUpdate(moved);
          onSpacecraftUpdate(selectedSpacecraftRef.current.data);
        }

        

        
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


  // if (!thirdPersonRef.current) {
  //   return (
  //     <div className="min-h-screen bg-gray-900 flex items-center justify-center">
  //       <div className="text-center">
  //         <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mb-4"></div>
  //         <div className="text-white text-xl">Waiting for spacecraft...</div>
  //       </div>
  //     </div>
  //   );
  // }
  return (
    <div 
      ref={mountRef} 
      tabIndex={0}
      className="w-full h-full relative"
      style={{ height: '100vh', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    >
    </div>    
  )


}