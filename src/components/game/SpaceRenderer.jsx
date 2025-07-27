import React, { useRef, useEffect, useState, useCallback } from 'react';
import { setupScene } from './sceneSetup';
import AddBody from './test_body';
import { setupLighting } from './lightingSetup';
import { setupCelestialBodies } from './celestialBodySetup';
import { TextureLoader } from 'three';
import { loadAllSpacecraftModels, updateSpacecraftModels } from '../../entities/Spacecrafts';
import { Spacecraft } from '../../entities/SpaceCraft';
import { SpaceScaler } from '../../utils/scaler';

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
  // const planetsRef = useRef([]);
  const celestialBodiesRef = useRef({}); // celestial bodies data here
  const atmosphereRefs = useRef({});
  const cloudsRefs = useRef({});
  const orbitRefs = useRef({});
  const textureLoader = useRef(new TextureLoader);
  const spacecraftsRef = useRef([]); // spacecraft data here
  const [textureLoadStatus, setTextureLoadStatus] = useState({});
  const [sceneReady, setSceneReady] = useState(false);
  const [activeLightsReady, setLightsReady] = useState(false);

  useEffect(() => {
    if (!mountRef.current) return;

    const { scene, camera, renderer, controls } = setupScene(mountRef, sceneRef, cameraRef, rendererRef, controlsRef);
    setupLighting(scene, activeLights, setLightsReady);
    setupCelestialBodies(scene, celestialBodiesRef, orbitRefs, atmosphereRefs, cloudsRefs, textureLoader, setTextureLoadStatus);
    loadAllSpacecraftModels(scene, camera, spacecraftsRef, cameraRef, controlsRef);

    setSceneReady(true);
  }, []);

  // Animation loop
  useEffect(() => {
    if (!sceneReady) return;

    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    const controls = controlsRef.current; 
    let time = Date.now();

    let animationFrameId;

    const animate = () => {
      const deltaTime = (Date.now() - time);
      time = Date.now();
      controls.update();
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
    };
  }, [sceneReady]);


  return (
    <div 
      ref={mountRef} 
      className="w-full h-full relative"
      style={{ height: '100vh', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    ></div>
  )
}