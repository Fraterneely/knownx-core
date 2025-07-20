import React, { useRef, useEffect, useState } from 'react';
import { Spacecraft } from '@/entities/SpaceCraft';
import { CELESTIAL_BODIES } from '@/entities/CelestialBodies';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as THREE from 'three';
import { TextureLoader } from 'three';

export default function SpaceRenderer({ 
  spacecraft, 
  onSpacecraftUpdate, 
  targetBody,
  isPaused,
  timeScale 
}) {
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
  const infoLabels = useRef({});
  const [selectedBody, setSelectedBody] = useState(null);
  const [showOrbits, setShowOrbits] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [realScale, setRealScale] = useState(false);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000005); // Darker background for better contrast
    sceneRef.current = scene;

    // Camera setup with improved parameters for space viewing
    const camera = new THREE.PerspectiveCamera(
      60, // Wider FOV for better planet viewing
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.00001, // Much smaller near plane for viewing tiny objects
      500000 // Much larger far plane for distant stars
    );
    camera.position.set(0, 0.5, 2); // Slightly elevated position
    cameraRef.current = camera;

    // Renderer setup with improved quality
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      logarithmicDepthBuffer: true // Better handling of vastly different scales
    });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; // Better color reproduction
    renderer.toneMappingExposure = 0.8;
    // Replace deprecated sRGBEncoding with the new approach
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;
    
    // Clear any existing canvas elements before adding a new one
    while (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }
    
    mountRef.current.appendChild(renderer.domElement);

    // Enhanced controls setup
    if (cameraRef.current && rendererRef.current) {
      controlsRef.current = new OrbitControls(cameraRef.current, rendererRef.current.domElement);
      controlsRef.current.enableDamping = true;
      controlsRef.current.dampingFactor = 0.05;
      controlsRef.current.screenSpacePanning = false;
      controlsRef.current.minDistance = 0.0001; // Allow very close approach
      controlsRef.current.maxDistance = 100000; // Allow very distant viewing
      controlsRef.current.zoomSpeed = 2; // Faster zoom for large distances
      controlsRef.current.rotateSpeed = 0.8; // Smoother rotation
      controlsRef.current.keyPanSpeed = 20; // Faster keyboard panning
    }

    // Enhanced starfield with different star sizes and colors
    const starGeometry = new THREE.BufferGeometry();
    const starVertices = [];
    const starColors = [];
    const starSizes = [];
    
    for (let i = 0; i < 20000; i++) {
      const x = (Math.random() - 0.5) * 10000;
      const y = (Math.random() - 0.5) * 10000;
      const z = (Math.random() - 0.5) * 10000;
      starVertices.push(x, y, z);
      
      // Random star colors (white, blue-white, yellow, orange, red)
      const colorChoice = Math.random();
      if (colorChoice > 0.8) {
        starColors.push(0.9, 0.9, 1); // Blue-white
      } else if (colorChoice > 0.6) {
        starColors.push(1, 1, 0.9); // Yellow-white
      } else if (colorChoice > 0.4) {
        starColors.push(1, 0.8, 0.5); // Orange
      } else if (colorChoice > 0.2) {
        starColors.push(1, 0.5, 0.5); // Red
      } else {
        starColors.push(1, 1, 1); // White
      }
      
      // Random star sizes
      starSizes.push(Math.random() * 2 + 0.5);
    }
    
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
    starGeometry.setAttribute('size', new THREE.Float32BufferAttribute(starSizes, 1));
    
    const starMaterial = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      sizeAttenuation: true
    });
    
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Add celestial bodies with enhanced visuals
    Object.entries(CELESTIAL_BODIES).forEach(([key, body]) => {
      // Calculate scale factor based on mode
      const scaleFactor = realScale ? 1 : 50;
      const geometry = new THREE.SphereGeometry(body.radius * scaleFactor, 64, 64);
      
      // Load texture if available
      let material;
      if (body.texture) {
        const texture = textureLoader.current.load(body.texture);
        material = new THREE.MeshPhongMaterial({ 
          map: texture,
          color: body.color,
          emissive: body.type === 'star' ? body.color : 0x000000,
          emissiveIntensity: body.type === 'star' ? (body.emissiveIntensity || 0.3) : 0,
          shininess: body.type === 'star' ? 0 : 30
        });
      } else {
        material = new THREE.MeshPhongMaterial({ 
          color: body.color,
          emissive: body.type === 'star' ? body.color : 0x000000,
          emissiveIntensity: body.type === 'star' ? (body.emissiveIntensity || 0.3) : 0
        });
      }
      
      const mesh = new THREE.Mesh(geometry, material);
      
      // Apply axial tilt if defined
      if (body.axialTilt) {
        mesh.rotation.z = body.axialTilt * Math.PI / 180;
      }
      
      mesh.position.set(...body.position);
      mesh.castShadow = body.type !== 'star';
      mesh.receiveShadow = body.type !== 'star';
      mesh.userData = { bodyData: body, bodyKey: key };
      
      scene.add(mesh);
      celestialBodies.current[key] = mesh;
      
      // Add atmosphere if defined
      if (body.atmosphere) {
        const atmosphereGeometry = new THREE.SphereGeometry(
          body.radius * scaleFactor * 1.05, 
          64, 
          64
        );
        const atmosphereMaterial = new THREE.MeshPhongMaterial({
          color: body.atmosphere.color,
          transparent: true,
          opacity: body.atmosphere.opacity,
          side: THREE.DoubleSide
        });
        const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        atmosphereMesh.position.copy(mesh.position);
        scene.add(atmosphereMesh);
        atmosphereRefs.current[key] = atmosphereMesh;
      }
      
      // Add clouds if defined
      if (body.clouds) {
        const cloudsGeometry = new THREE.SphereGeometry(
          body.radius * scaleFactor * 1.02, 
          64, 
          64
        );
        const cloudsTexture = textureLoader.current.load(body.clouds.texture);
        const cloudsMaterial = new THREE.MeshPhongMaterial({
          map: cloudsTexture,
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide
        });
        const cloudsMesh = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
        cloudsMesh.position.copy(mesh.position);
        scene.add(cloudsMesh);
        cloudsRefs.current[key] = cloudsMesh;
      }
      
      // Add orbit path for planets with proper elliptical shape
      if (body.orbitalRadius) {
        // Create elliptical orbit path
        const segments = 128;
        const orbitCurve = new THREE.EllipseCurve(
          0, 0,                                    // Center x, y
          body.orbitalRadius, body.orbitalRadius * (1 - body.orbitalEccentricity || 0), // xRadius, yRadius
          0, 2 * Math.PI,                          // Start angle, end angle
          false,                                   // Clockwise
          0                                        // Rotation
        );
        
        const orbitPoints = orbitCurve.getPoints(segments);
        const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
        
        // Convert 2D points to 3D
        const positions = new Float32Array(segments * 3);
        for (let i = 0; i < segments; i++) {
          const point = orbitPoints[i];
          positions[i * 3] = point.x;
          positions[i * 3 + 1] = 0;
          positions[i * 3 + 2] = point.y;
        }
        orbitGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const orbitMaterial = new THREE.LineBasicMaterial({ 
          color: 0x444466, 
          transparent: true, 
          opacity: 0.3,
          linewidth: 1
        });
        
        const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
        
        // Apply orbital inclination
        if (body.orbitalInclination) {
          orbitLine.rotation.x = body.orbitalInclination * Math.PI / 180;
        }
        
        scene.add(orbitLine);
        orbitRefs.current[key] = orbitLine;
      }
      
      // Add text label for the body
      // Create label reference but don't append to DOM yet
      const labelDiv = document.createElement('div');
      labelDiv.className = 'absolute px-2 py-1 bg-black/50 text-white text-xs rounded pointer-events-none';
      labelDiv.style.display = 'none';
      labelDiv.textContent = body.name;
      // Store in ref but don't append to DOM until we're sure mountRef exists
      infoLabels.current[key] = labelDiv;
    });

    // Add spacecraft with improved model
    const spacecraftGroup = new THREE.Group();
    
    // Main body
    const bodyGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.04, 8);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.rotation.x = Math.PI / 2;
    spacecraftGroup.add(bodyMesh);
    
    // Solar panels
    const panelGeometry = new THREE.BoxGeometry(0.05, 0.01, 0.02);
    const panelMaterial = new THREE.MeshPhongMaterial({ color: 0x3b82f6 });
    const leftPanel = new THREE.Mesh(panelGeometry, panelMaterial);
    leftPanel.position.set(-0.03, 0, 0);
    spacecraftGroup.add(leftPanel);
    
    const rightPanel = new THREE.Mesh(panelGeometry, panelMaterial);
    rightPanel.position.set(0.03, 0, 0);
    spacecraftGroup.add(rightPanel);
    
    // Antenna
    const antennaGeometry = new THREE.CylinderGeometry(0.001, 0.001, 0.03, 4);
    const antennaMaterial = new THREE.MeshPhongMaterial({ color: 0xcccccc });
    const antennaMesh = new THREE.Mesh(antennaGeometry, antennaMaterial);
    antennaMesh.position.set(0, 0.02, 0);
    spacecraftGroup.add(antennaMesh);
    
    // Thrusters
    const thrusterGeometry = new THREE.ConeGeometry(0.005, 0.01, 8);
    const thrusterMaterial = new THREE.MeshPhongMaterial({ color: 0x555555 });
    const thruster = new THREE.Mesh(thrusterGeometry, thrusterMaterial);
    thruster.position.set(0, 0, 0.02);
    thruster.rotation.x = Math.PI;
    spacecraftGroup.add(thruster);
    
    // Thruster exhaust (particle effect)
    const exhaustGeometry = new THREE.BufferGeometry();
    const exhaustVertices = [];
    for (let i = 0; i < 100; i++) {
      exhaustVertices.push(
        (Math.random() - 0.5) * 0.005,
        (Math.random() - 0.5) * 0.005,
        Math.random() * 0.03 + 0.02
      );
    }
    exhaustGeometry.setAttribute('position', new THREE.Float32BufferAttribute(exhaustVertices, 3));
    const exhaustMaterial = new THREE.PointsMaterial({
      color: 0x3b82f6,
      size: 0.002,
      transparent: true,
      opacity: 0.7
    });
    const exhaust = new THREE.Points(exhaustGeometry, exhaustMaterial);
    exhaust.visible = false; // Only visible when thrusting
    spacecraftGroup.add(exhaust);
    
    spacecraftGroup.position.set(
      spacecraft.position.x,
      spacecraft.position.y,
      spacecraft.position.z
    );
    scene.add(spacecraftGroup);
    spacecraftRef.current = spacecraftGroup;

    // Add enhanced lighting
    const ambientLight = new THREE.AmbientLight(0x202020, 0.2);
    scene.add(ambientLight);

    // Sun light with shadows
    const sunLight = new THREE.PointLight(0xffffee, 1.5, 1000);
    sunLight.position.set(0, 0, 0);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.01;
    sunLight.shadow.camera.far = 100;
    scene.add(sunLight);
    
    // Add a subtle directional light to improve visibility of dark sides
    const fillLight = new THREE.DirectionalLight(0x404060, 0.2);
    fillLight.position.set(1, 0.5, 0.5);
    scene.add(fillLight);

    // Handle window resize
    const handleResize = () => {
      if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;
      
      // Use window dimensions for full screen
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };
    
    // Call resize handler immediately to set initial size
    handleResize();
    window.addEventListener('resize', handleResize);

    // Add click handler for selecting celestial bodies
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    const handleClick = (event) => {
      // Calculate mouse position in normalized device coordinates
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      
      // Update the picking ray with the camera and mouse position
      raycaster.setFromCamera(mouse, cameraRef.current);
      
      // Calculate objects intersecting the picking ray
      const celestialBodyMeshes = Object.values(celestialBodies.current);
      const intersects = raycaster.intersectObjects(celestialBodyMeshes, false);
      
      if (intersects.length > 0) {
        const selectedMesh = intersects[0].object;
        const bodyKey = selectedMesh.userData.bodyKey;
        setSelectedBody(bodyKey);
        
        // Focus camera on selected body
        if (controlsRef.current) {
          controlsRef.current.target.copy(selectedMesh.position);
          
          // Set camera position relative to body size
          const bodyRadius = CELESTIAL_BODIES[bodyKey].radius;
          const distanceFactor = bodyRadius * 200;
          const newCameraPosition = new THREE.Vector3(
            selectedMesh.position.x + distanceFactor,
            selectedMesh.position.y + distanceFactor * 0.5,
            selectedMesh.position.z + distanceFactor
          );
          
          // Animate camera movement
          const startPosition = cameraRef.current.position.clone();
          const endPosition = newCameraPosition;
          const duration = 1000; // ms
          const startTime = Date.now();
          
          const animateCamera = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease out
            
            cameraRef.current.position.lerpVectors(startPosition, endPosition, easeProgress);
            
            if (progress < 1) {
              requestAnimationFrame(animateCamera);
            }
          };
          
          animateCamera();
        }
      } else {
        setSelectedBody(null);
      }
    };
    
    window.addEventListener('click', handleClick);

    // Add keyboard controls for toggling display options
    const handleKeyPress = (e) => {
      if (e.key === 'o') {
        setShowOrbits(prev => !prev);
        Object.values(orbitRefs.current).forEach(orbit => {
          orbit.visible = !orbit.visible;
        });
      } else if (e.key === 'l') {
        setShowLabels(prev => !prev);
      } else if (e.key === 's') {
        setRealScale(prev => !prev);
        // This requires re-creating the scene with new scale, handled in a separate effect
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyPress);
      
      // Remove labels from DOM
      Object.values(infoLabels.current).forEach(label => {
        if (label.parentNode) {
          label.parentNode.removeChild(label);
        }
      });
      
      // Dispose of all Three.js objects
      Object.values(celestialBodies.current).forEach(mesh => {
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(material => material.dispose());
          } else {
            mesh.material.dispose();
          }
        }
        if (sceneRef.current) sceneRef.current.remove(mesh);
      });
      
      if (spacecraftRef.current) {
        if (spacecraftRef.current.geometry) spacecraftRef.current.geometry.dispose();
        if (spacecraftRef.current.material) spacecraftRef.current.material.dispose();
        if (sceneRef.current) sceneRef.current.remove(spacecraftRef.current);
      }
      
      if (mountRef.current && rendererRef.current && rendererRef.current.domElement) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
      
      if (rendererRef.current) rendererRef.current.dispose();
      
      // Clear references
      celestialBodies.current = {};
      spacecraftRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
    };
  }, []);

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
          const gravityForce = Spacecraft.calculateGravity(spacecraft, currentCelestialBodies);
          
          // Apply gravity to velocity
          let updatedSpacecraft = {
            ...spacecraft,
            velocity: {
              x: spacecraft.velocity.x + gravityForce.x * deltaTime,
              y: spacecraft.velocity.y + gravityForce.y * deltaTime,
              z: spacecraft.velocity.z + gravityForce.z * deltaTime
            }
          };
          
          // Apply autopilot if enabled
          if (spacecraft.autopilot && spacecraft.target_body) {
            updatedSpacecraft = Spacecraft.navigateToTarget(
              updatedSpacecraft, 
              spacecraft.target_body, 
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
      if (showLabels && mountRef.current) {
        Object.entries(celestialBodies.current).forEach(([key, mesh]) => {
          if (infoLabels.current[key]) {
            const label = infoLabels.current[key];
            
            // Make sure label is in the DOM
            if (!label.parentNode && mountRef.current) {
              mountRef.current.appendChild(label);
            }
            
            // Convert 3D position to screen position
            const position = mesh.position.clone();
            position.project(cameraRef.current);
            
            // Convert to screen coordinates
            const x = (position.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-(position.y * 0.5) + 0.5) * window.innerHeight;
            
            // Only show label if object is in front of camera
            if (position.z < 1) {
              label.style.display = 'block';
              label.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
              
              // Add distance information if a body is selected
              if (selectedBody === key) {
                const body = CELESTIAL_BODIES[key];
                label.innerHTML = `
                  <div class="font-bold">${body.name}</div>
                  <div class="text-xs opacity-80">Mass: ${body.mass.toExponential(2)} kg</div>
                  <div class="text-xs opacity-80">Radius: ${(body.radius * 149597870.7).toFixed(0)} km</div>
                `;
              } else {
                label.textContent = CELESTIAL_BODIES[key].name;
              }
            } else {
              label.style.display = 'none';
            }
          }
        });
      } else {
        // Hide all labels
        Object.values(infoLabels.current).forEach(label => {
          label.style.display = 'none';
        });
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
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
  }, [spacecraft, onSpacecraftUpdate, isPaused, timeScale, gameTime, showLabels, selectedBody]);

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
        
        // Also update atmospheres and clouds if they exist
        if (atmosphereRefs.current[key]) {
          atmosphereRefs.current[key].scale.set(scaleFactor, scaleFactor, scaleFactor);
        }
        
        if (cloudsRefs.current[key]) {
          cloudsRefs.current[key].scale.set(scaleFactor, scaleFactor, scaleFactor);
        }
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
      
      {/* Display info about selected body if any */}
      {selectedBody && (
        <div className="absolute top-4 left-4 bg-gray-900/80 text-white p-3 rounded backdrop-blur-sm border border-gray-700/50 z-10 max-w-xs">
          <div className="text-lg font-bold">{CELESTIAL_BODIES[selectedBody].name}</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-sm">
            <div className="text-gray-300">Type:</div>
            <div>{CELESTIAL_BODIES[selectedBody].type}</div>
            
            <div className="text-gray-300">Mass:</div>
            <div>{CELESTIAL_BODIES[selectedBody].mass.toExponential(2)} kg</div>
            
            <div className="text-gray-300">Radius:</div>
            <div>{(CELESTIAL_BODIES[selectedBody].radius * 149597870.7).toFixed(0)} km</div>
            
            {CELESTIAL_BODIES[selectedBody].orbitalPeriod && (
              <>
                <div className="text-gray-300">Orbital Period:</div>
                <div>{CELESTIAL_BODIES[selectedBody].orbitalPeriod} days</div>
              </>
            )}
            
            {CELESTIAL_BODIES[selectedBody].rotationPeriod && (
              <>
                <div className="text-gray-300">Rotation Period:</div>
                <div>{Math.abs(CELESTIAL_BODIES[selectedBody].rotationPeriod)} days
                  {CELESTIAL_BODIES[selectedBody].rotationPeriod < 0 ? ' (retrograde)' : ''}
                </div>
              </>
            )}
            
            {spacecraft && (
              <>
                <div className="text-gray-300">Distance:</div>
                <div>
                  {calculateDistanceToBody(selectedBody).toFixed(4)} AU
                  <span className="text-xs text-gray-400 ml-1">
                    ({(calculateDistanceToBody(selectedBody) * 149597870.7).toFixed(0)} km)
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
  
  // Helper function to calculate distance from spacecraft to a celestial body
  function calculateDistanceToBody(bodyKey) {
    if (!spacecraft || !celestialBodies.current[bodyKey]) return 0;
    
    const bodyPosition = celestialBodies.current[bodyKey].position;
    return Math.sqrt(
      Math.pow(spacecraft.position.x - bodyPosition.x, 2) +
      Math.pow(spacecraft.position.y - bodyPosition.y, 2) +
      Math.pow(spacecraft.position.z - bodyPosition.z, 2)
    );
  }
}