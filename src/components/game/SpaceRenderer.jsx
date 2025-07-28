import React, { useRef, useEffect, useState, useCallback } from 'react';
import { setupScene } from './sceneSetup';
import { setupLighting } from './lightingSetup';
import { setupCelestialBodies } from './celestialBodySetup';
import { TextureLoader } from 'three';
import { loadAllSpacecraftModels, updateShipControl, updateSpacecraftModels } from '../../entities/Spacecrafts';
import { SpaceScaler } from '../../utils/scaler';
import { ThirdPersonCamera } from './cameraSetup';
import * as THREE from 'three';
import { setupStarfield } from './starfieldSetup';

const scaler = new SpaceScaler();

export default function SpaceRenderer({ 
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
  const selectedSpacecraftRef = useRef(null);
  const keysPressed = new Set();
  const thirdPersonRef = useRef(null);
  const [textureLoadStatus, setTextureLoadStatus] = useState({});
  const [sceneReady, setSceneReady] = useState(false);
  const [activeLightsReady, setLightsReady] = useState(false);

  useEffect(() => {
    if (!mountRef.current) return;

    const { scene, camera, renderer, controls } = setupScene(mountRef, sceneRef, cameraRef, rendererRef, controlsRef);
    setupLighting(scene, activeLights, setLightsReady);
    setupStarfield(scene);
    setupCelestialBodies(scene, celestialBodiesRef, orbitRefs, atmosphereRefs, cloudsRefs, textureLoader, setTextureLoadStatus);
    loadAllSpacecraftModels(scene, camera, spacecraftsRef, selectedSpacecraftRef, thirdPersonRef, cameraRef, controlsRef);

    setSceneReady(true);

    return () => {
      controls.dispose();
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

    const animate = () => {
      const deltaTime = (Date.now() - time);
      time = Date.now();

      if (selectedSpacecraftRef.current && camera && controlsRef.current) {
        const ship = selectedSpacecraftRef.current;

        // Handle movement
        if (keysPressed.has('KeyW')) {
          ship.position.x -= 0.001; // Forward
        }
        if (keysPressed.has('KeyS')) {
          ship.position.x += 0.001; // Backward
        }
        if (keysPressed.has('KeyA')) {
          ship.rotation.x += 0.001; // Rotate left
        }
        if (keysPressed.has('KeyD')) {
          ship.rotation.x -= 0.001; // Rotate right
        }
        if (keysPressed.has('KeyQ')) {
          ship.rotation.y += 0.001; // Rotate left
        }
        if (keysPressed.has('KeyE')) {
          ship.rotation.y -= 0.001; // Rotate right
        }

        if (keysPressed.has('ArrowUp')) {
          ship.position.y += 0.001; // Up
        }
        if (keysPressed.has('ArrowDown')) {
          ship.position.y -= 0.001; // Down
        }
        if (keysPressed.has('ArrowLeft')) {
          ship.position.z -= 0.001; // Left
        }
        if (keysPressed.has('ArrowRight')) {
          ship.position.z += 0.001; // Right
        }

        thirdPersonRef.current.Update(timeScale);
    
        controlsRef.current.target.copy(selectedSpacecraftRef.current.position);
        controlsRef.current.update();
      }
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()

      renderer.setSize(window.innerWidth, window.innerHeight)
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

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
    <div 
      ref={mountRef} 
      tabIndex={0}
      className="w-full h-full relative"
      style={{ height: '100vh', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    ></div>
  )
}