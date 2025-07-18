import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

const CELESTIAL_BODIES = {
  sun: {
    name: 'Sun',
    position: [0, 0, 0],
    radius: 0.00465, // AU
    color: '#FDB813',
    mass: 1.989e30,
    type: 'star'
  },
  earth: {
    name: 'Earth',
    position: [1, 0, 0],
    radius: 0.0000426, // AU
    color: '#6B93D6',
    mass: 5.972e24,
    type: 'planet',
    orbitalRadius: 1,
    orbitalPeriod: 365.25
  },
  moon: {
    name: 'Moon',
    position: [1.00257, 0, 0],
    radius: 0.0000116, // AU
    color: '#C0C0C0',
    mass: 7.342e22,
    type: 'moon',
    orbitalRadius: 0.00257,
    orbitalPeriod: 27.32,
    parent: 'earth'
  },
  mars: {
    name: 'Mars',
    position: [1.52, 0, 0],
    radius: 0.0000227, // AU
    color: '#CD5C5C',
    mass: 6.39e23,
    type: 'planet',
    orbitalRadius: 1.52,
    orbitalPeriod: 687
  },
  jupiter: {
    name: 'Jupiter',
    position: [5.2, 0, 0],
    radius: 0.000467, // AU
    color: '#D8CA9D',
    mass: 1.898e27,
    type: 'planet',
    orbitalRadius: 5.2,
    orbitalPeriod: 4333
  },
  proximaCentauri: {
    name: 'Proxima Centauri',
    position: [268000, 0, 0],
    radius: 0.000007, // AU
    color: '#FF6B6B',
    mass: 2.428e29,
    type: 'star'
  }
};

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
  const [gameTime, setGameTime] = useState(0);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.0001,
      1000
    );
    camera.position.set(0, 0, 2);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    // Add starfield
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 });
    const starVertices = [];
    for (let i = 0; i < 10000; i++) {
      const x = (Math.random() - 0.5) * 2000;
      const y = (Math.random() - 0.5) * 2000;
      const z = (Math.random() - 0.5) * 2000;
      starVertices.push(x, y, z);
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Add celestial bodies
    Object.entries(CELESTIAL_BODIES).forEach(([key, body]) => {
      const geometry = new THREE.SphereGeometry(body.radius * 50, 32, 32);
      const material = new THREE.MeshPhongMaterial({ 
        color: body.color,
        emissive: body.type === 'star' ? body.color : 0x000000,
        emissiveIntensity: body.type === 'star' ? 0.3 : 0
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...body.position);
      scene.add(mesh);
      celestialBodies.current[key] = mesh;

      // Add orbit path for planets
      if (body.orbitalRadius) {
        const orbitGeometry = new THREE.RingGeometry(body.orbitalRadius - 0.01, body.orbitalRadius + 0.01, 64);
        const orbitMaterial = new THREE.MeshBasicMaterial({ 
          color: 0x444444, 
          transparent: true, 
          opacity: 0.2,
          side: THREE.DoubleSide
        });
        const orbitMesh = new THREE.Mesh(orbitGeometry, orbitMaterial);
        orbitMesh.rotation.x = Math.PI / 2;
        scene.add(orbitMesh);
      }
    });

    // Add spacecraft
    const spacecraftGeometry = new THREE.ConeGeometry(0.02, 0.1, 8);
    const spacecraftMaterial = new THREE.MeshPhongMaterial({ color: 0x3b82f6 });
    const spacecraftMesh = new THREE.Mesh(spacecraftGeometry, spacecraftMaterial);
    spacecraftMesh.position.set(
      spacecraft.position.x,
      spacecraft.position.y,
      spacecraft.position.z
    );
    scene.add(spacecraftMesh);
    spacecraftRef.current = spacecraftMesh;

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.2);
    scene.add(ambientLight);

    const sunLight = new THREE.PointLight(0xffffff, 1, 100);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);

    // Handle window resize
    const handleResize = () => {
      if (!mountRef.current) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Animation loop
  useEffect(() => {
    let animationId;
    const animate = () => {
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
          // Simple physics simulation
          const gravityForce = calculateGravity(spacecraft.position);
          const newVelocity = {
            x: spacecraft.velocity.x + gravityForce.x * deltaTime,
            y: spacecraft.velocity.y + gravityForce.y * deltaTime,
            z: spacecraft.velocity.z + gravityForce.z * deltaTime
          };
          const newPosition = {
            x: spacecraft.position.x + newVelocity.x * deltaTime,
            y: spacecraft.position.y + newVelocity.y * deltaTime,
            z: spacecraft.position.z + newVelocity.z * deltaTime
          };

          spacecraftRef.current.position.set(newPosition.x, newPosition.y, newPosition.z);
          
          // Update spacecraft data
          onSpacecraftUpdate({
            ...spacecraft,
            position: newPosition,
            velocity: newVelocity,
            fuel: Math.max(0, spacecraft.fuel - 0.1 * deltaTime), // Fuel consumption
            oxygen: Math.max(0, spacecraft.oxygen - 0.05 * deltaTime), // Oxygen consumption
            power: Math.max(0, spacecraft.power - 0.2 * deltaTime) // Power consumption
          });
        }

        // Update camera to follow spacecraft
        if (cameraRef.current && spacecraftRef.current) {
          cameraRef.current.position.set(
            spacecraftRef.current.position.x,
            spacecraftRef.current.position.y + 0.5,
            spacecraftRef.current.position.z + 1
          );
          cameraRef.current.lookAt(spacecraftRef.current.position);
        }
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [spacecraft, onSpacecraftUpdate, isPaused, timeScale, gameTime]);

  // Calculate gravitational forces
  const calculateGravity = (position) => {
    let totalForce = { x: 0, y: 0, z: 0 };
    
    Object.entries(CELESTIAL_BODIES).forEach(([key, body]) => {
      const bodyPos = celestialBodies.current[key]?.position || new THREE.Vector3(...body.position);
      const distance = Math.sqrt(
        Math.pow(position.x - bodyPos.x, 2) +
        Math.pow(position.y - bodyPos.y, 2) +
        Math.pow(position.z - bodyPos.z, 2)
      );
      
      if (distance > 0.001) { // Avoid division by zero
        const G = 6.67430e-11; // Gravitational constant
        const force = (G * body.mass * spacecraft.mass) / Math.pow(distance * 1.496e11, 2); // Convert AU to meters
        const direction = {
          x: (bodyPos.x - position.x) / distance,
          y: (bodyPos.y - position.y) / distance,
          z: (bodyPos.z - position.z) / distance
        };
        
        totalForce.x += force * direction.x / spacecraft.mass;
        totalForce.y += force * direction.y / spacecraft.mass;
        totalForce.z += force * direction.z / spacecraft.mass;
      }
    });
    
    return totalForce;
  };

  return (
    <div 
      ref={mountRef} 
      className="w-full h-full relative"
      style={{ minHeight: '600px' }}
    />
  );
}