import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Spacecraft } from '../../entities/SpaceCraft';
import { CELESTIAL_BODIES } from '@/entities/CelestialBodies';
import * as THREE from 'three';
import { TextureLoader } from 'three';
import { updateSpacecraftModels } from '../../entities/Spacecrafts';
import Label from './Label';
import { setupScene } from './sceneSetup';
import { setupLighting } from './lightingSetup';
import { setupStarfield } from './starfieldSetup';
import { setupCelestialBodies } from './celestialBodySetup';
import { setupSpacecraft } from './spacecraftSetup';
import { setupEventHandlers } from './eventHandlers';
import { setupKeyboardControls } from './keyboardControls';
import { loadAllSpacecraftModels } from '../../entities/Spacecrafts'



export default function SpaceRenderer({ 
  onSpacecraftUpdate, 
  targetBody,
  isPaused,
  timeScale 
}) {
  // Existing refs and state
  const mountRef = useRef();
  const sceneRef = useRef();
  const spacecraftRef = useRef();
  const cameraRef = useRef();
  const rendererRef = useRef();
  const celestialBodies = useRef({});
  const controlsRef = useRef();
  const [manualControl, setManualControl] = useState(false);
  const [gameTime, setGameTime] = useState(0);

  // Add new refs for textures and special effects
  const textureLoader = useRef(new TextureLoader());
  const cloudsRefs = useRef({});
  const atmosphereRefs = useRef({});
  const orbitRefs = useRef({});
  const [labelData, setLabelData] = useState({});
  const [selectedBody, setSelectedBody] = useState(null);
  const [showOrbits, setShowOrbits] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [realScale, setRealScale] = useState(false);
  const [textureLoadStatus, setTextureLoadStatus] = useState({});

  useEffect(() => {
    if (!mountRef.current) return;

    const { scene, camera, renderer, controls } = setupScene(mountRef, sceneRef, cameraRef, rendererRef, controlsRef);
    setupLighting(scene);
    setupStarfield(scene);
    setupCelestialBodies(scene, celestialBodies, orbitRefs, atmosphereRefs, cloudsRefs, realScale, textureLoader, setTextureLoadStatus);
    console.log("Starting Spaccraft laoding...")
    loadAllSpacecraftModels(scene, camera, spacecraftRef);
    const cleanupEventHandlers = setupEventHandlers(mountRef, cameraRef, rendererRef, controlsRef, celestialBodies, setSelectedBody);
    const cleanupKeyboardControls = setupKeyboardControls(setShowOrbits, setShowLabels, setRealScale, orbitRefs);

    return () => {
      cleanupEventHandlers();
      cleanupKeyboardControls();
      controls.dispose();
      renderer.dispose();
      scene.traverse((object) => {
        if (object.isMesh) {
          object.geometry.dispose();
          if (object.material.isMaterial) {
            // Assuming cleanMaterial is defined elsewhere or will be added
            // For now, directly dispose material
            if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        }
      });
    };
  }, [realScale, textureLoadStatus]);

  // Animation loop
  useEffect(() => {
    let animationId;
    let lastUpdateTime = 0; // Track last time we updated the state
    
    const animate = (timestamp) => {
      if (!isPaused) {
        // Update game time
        const deltaTime = 0.016 * timeScale; // 60 FPS
        setGameTime(prev => prev + deltaTime);

        // Update celestial body positions (orbital mechanics)
        Object.entries(CELESTIAL_BODIES).forEach(([key, body]) => {
          if (body.orbitalRadius && celestialBodies.current[key]) {
            const angle = (gameTime * 2 * Math.PI) / (body.orbitalPeriod * 24); // Convert to radians
            const x = body.orbitalRadius * Math.cos(angle);
            const z = body.orbitalRadius * Math.sin(angle);
            celestialBodies.current[key].position.set(x, 0, z);
          }
        });

        // Update spacecraft physics
        if (spacecraftRef.current && onSpacecraftUpdate) {
          // Only update state every 100ms to prevent too many updates
          const shouldUpdateState = timestamp - lastUpdateTime > 100;
          
          // Get current celestial body positions for gravity calculations
          const currentCelestialBodies = {};
          Object.entries(CELESTIAL_BODIES).forEach(([key, body]) => {
            if (celestialBodies.current[key]) {
              currentCelestialBodies[key] = {
                ...body,
                position: {
                  x: celestialBodies.current[key].position.x,
                  y: celestialBodies.current[key].position.y,
                  z: celestialBodies.current[key].position.z
                }
              };
            }
          });
          
          // Calculate gravitational forces
          const gravityForce = Spacecraft.calculateGravity(spacecraftRef.current, currentCelestialBodies);
          
          // Apply gravity to velocity
          let updatedSpacecraft = {
            ...spacecraftRef,
            velocity: {
              x: spacecraftRef.current.velocity.x + gravityForce.x * deltaTime,
              y: spacecraftRef.current.velocity.y + gravityForce.y * deltaTime,
              z: spacecraftRef.current.velocity.z + gravityForce.z * deltaTime
            }
          };
          
          // Apply autopilot if enabled
          if (spacecraftRef.current.autopilot && spacecraftRef.current.target_body) {
            updatedSpacecraft = Spacecraft.navigateToTarget(
              updatedSpacecraft, 
              spacecraftRef.current.target_body, 
              currentCelestialBodies, 
              deltaTime
            );
          }
          
          // Update position based on velocity
          updatedSpacecraft = Spacecraft.updatePosition(updatedSpacecraft, deltaTime);
          
          // Update spacecraft systems (oxygen, power)
          updatedSpacecraft = Spacecraft.updateSystems(updatedSpacecraft, deltaTime);
          
          // Update spacecraft mesh position and orientation
          spacecraftRef.current.position.set(
            updatedSpacecraft.position.x,
            updatedSpacecraft.position.y,
            updatedSpacecraft.position.z
          );
          
          // Update spacecraft orientation (rotation)
          if (updatedSpacecraft.orientation) {
            spacecraftRef.current.rotation.x = updatedSpacecraft.orientation.pitch;
            spacecraftRef.current.rotation.y = updatedSpacecraft.orientation.yaw;
            spacecraftRef.current.rotation.z = updatedSpacecraft.orientation.roll;
          }
          
          // Update spacecraft data in state (but not too frequently)
          if (shouldUpdateState) {
            lastUpdateTime = timestamp;
            onSpacecraftUpdate(updatedSpacecraft);
          }
        }

        // Update camera to follow spacecraft
        if (manualControl && controlsRef.current) {
          controlsRef.current.update();
        } else if (cameraRef.current && spacecraftRef.current) {
          cameraRef.current.position.set(
            spacecraftRef.current.position.x,
            spacecraftRef.current.position.y + 0.5,
            spacecraftRef.current.position.z + 1
          );
          cameraRef.current.lookAt(spacecraftRef.current.position);
        }
      }

      // Update celestial body labels if they exist
      if (showLabels) {
        const newLabelData = {};
        Object.entries(celestialBodies.current).forEach(([key, mesh]) => {
          const body = CELESTIAL_BODIES[key];
          const position = mesh.position.clone();
          position.project(cameraRef.current);

          const x = (position.x * 0.5 + 0.5) * window.innerWidth;
          const y = (-(position.y * 0.5) + 0.5) * window.innerHeight;

          if (position.z < 1) {
            newLabelData[key] = {
              id: key,
              name: body.name,
              x: x + 15, // Offset label to the right
              y: y,
              display: 'block',
              isSelected: selectedBody === key,
              bodyData: body,
              distance: spacecraftRef.current ? calculateDistanceToBody(key) : undefined,
            };
          } else {
            newLabelData[key] = {
              id: key,
              name: body.name,
              x: x,
              y: y,
              display: 'none',
              isSelected: false,
              bodyData: body,
              distance: undefined,
            };
          }
        });
        setLabelData(newLabelData);
      } else {
        setLabelData({}); // Clear all labels if showLabels is false
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        // Update spacecraft model position and orientation
        updateSpacecraftModels([spacecraftRef.current]);

        // If manual control is off, update camera position to follow spacecraft
        if (!manualControl && spacecraftRef.current) {
          cameraRef.current.position.copy(spacecraftRef.current.position);
          // Adjust camera offset from spacecraft
          cameraRef.current.position.add(new THREE.Vector3(0, 0.5, 1.5));
          cameraRef.current.lookAt(spacecraftRef.current.position);
        }

        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [spacecraftRef.current, onSpacecraftUpdate, isPaused, timeScale, gameTime, showLabels, selectedBody, manualControl]);

  // Enhanced keyboard controls for camera and visualization options
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'c') {
        setManualControl(prev => !prev); // Toggle camera control
        
        // When enabling manual control, make sure controls are properly set up
        if (!manualControl && controlsRef.current) {
          controlsRef.current.enabled = true;
          
          // Update control target to current spacecraft position
          if (spacecraftRef.current) {
            controlsRef.current.target.set(
              spacecraftRef.current.position.x,
              spacecraftRef.current.position.y,
              spacecraftRef.current.position.z
            );
          }
        }
      } else if (e.key === 'l') {
        // Toggle labels
        setShowLabels(prev => !prev);
      } else if (e.key === 'o') {
        // Toggle orbit visualization
        setShowOrbits(prev => !prev);
        Object.values(orbitRefs.current).forEach(orbit => {
          orbit.visible = !orbit.visible;
        });
      } else if (e.key === 'r') {
        // Toggle realistic scale
        setRealScale(prev => !prev);
      } else if (e.key === 'f') {
        // Focus on target body if one is set
        if (targetBody && celestialBodies.current[targetBody]) {
          const targetPosition = celestialBodies.current[targetBody].position;
          
          // Set camera to look at target
          if (cameraRef.current) {
            // Calculate appropriate distance based on body size
            const bodyRadius = CELESTIAL_BODIES[targetBody].radius;
            const distance = bodyRadius * 100; // Adjust based on body size
            
            // Position camera at a good viewing angle
            const cameraPosition = new THREE.Vector3(
              targetPosition.x + distance,
              targetPosition.y + distance * 0.5,
              targetPosition.z + distance
            );
            
            // Animate camera movement
            const startPosition = cameraRef.current.position.clone();
            const endPosition = cameraPosition;
            const duration = 1000; // ms
            const startTime = Date.now();
            
            const animateCamera = () => {
              const elapsed = Date.now() - startTime;
              const progress = Math.min(elapsed / duration, 1);
              const easeProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease out
              
              cameraRef.current.position.lerpVectors(startPosition, endPosition, easeProgress);
              cameraRef.current.lookAt(targetPosition);
              
              if (progress < 1) {
                requestAnimationFrame(animateCamera);
              } else {
                // When animation completes, set control target if in manual mode
                if (manualControl && controlsRef.current) {
                  controlsRef.current.target.copy(targetPosition);
                }
              }
            };
            
            animateCamera();
            
            // Set selected body
            setSelectedBody(targetBody);
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [manualControl, targetBody, showLabels, showOrbits]);

  // Effect to update textures and models when real scale changes
  useEffect(() => {
    if (!sceneRef.current || !celestialBodies.current) return;
    
    // Update all celestial body scales
    Object.entries(CELESTIAL_BODIES).forEach(([key, body]) => {
      if (celestialBodies.current[key]) {
        const scaleFactor = realScale ? 1 : 50;
        celestialBodies.current[key].scale.set(scaleFactor, scaleFactor, scaleFactor);
        
        // No need to update atmospheres and clouds separately since they're now children
        // of the planet mesh and will scale automatically with their parent
        console.log(`Updated scale for ${body.name} to ${scaleFactor}x`);
      }
    });
    
  }, [realScale]);

  // Effect to focus camera on target body when it changes
  useEffect(() => {
    if (targetBody && celestialBodies.current[targetBody] && !manualControl) {
      // Auto-focus on new target body
      const targetPosition = celestialBodies.current[targetBody].position;
      
      if (cameraRef.current) {
        // Calculate appropriate distance based on body size
        const bodyRadius = CELESTIAL_BODIES[targetBody].radius;
        const distance = bodyRadius * 100; // Adjust based on body size
        
        // Position camera at a good viewing angle
        cameraRef.current.position.set(
          targetPosition.x + distance,
          targetPosition.y + distance * 0.5,
          targetPosition.z + distance
        );
        
        cameraRef.current.lookAt(targetPosition);
      }
    }
  }, [targetBody, manualControl]);

  return (
    <div 
      ref={mountRef} 
      className="w-full h-full relative"
      style={{ height: '100vh', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {/* Camera control indicator */}
      {manualControl && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-900/80 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm border border-gray-700/50 z-10 pointer-events-none">
          Manual Camera Control Active (Press 'C' to exit)
        </div>
      )}
      
      {/* Display controls help */}
      <div className="absolute bottom-4 left-4 bg-gray-900/80 text-white p-2 rounded text-xs backdrop-blur-sm border border-gray-700/50 z-10 pointer-events-none">
        <div className="font-bold mb-1">Keyboard Controls:</div>
        <div>C - Toggle camera control</div>
        <div>L - Toggle labels</div>
        <div>O - Toggle orbit paths</div>
        <div>R - Toggle realistic scale</div>
        <div>F - Focus on target body</div>
      </div>
      
      {/* Render labels using the Label component */}
      {Object.values(labelData).map(label => (
        <Label
          key={label.id}
          id={label.id}
          name={label.name}
          x={label.x}
          y={label.y}
          display={label.display}
          isSelected={label.isSelected}
          bodyData={label.bodyData}
          distance={label.distance}
        />
      ))}
    </div>
  );
  
  // Helper function to calculate distance from spacecraft to a celestial body
  function calculateDistanceToBody(bodyKey) {
    if (!spacecraftRef.current || !celestialBodies.current[bodyKey]) return 0;
    
    const bodyPosition = celestialBodies.current[bodyKey].position;
    return Math.sqrt(
      Math.pow(spacecraftRef.current.position.x - bodyPosition.x, 2) +
      Math.pow(spacecraftRef.current.position.y - bodyPosition.y, 2) +
      Math.pow(spacecraftRef.current.position.z - bodyPosition.z, 2)
    );
  }
}