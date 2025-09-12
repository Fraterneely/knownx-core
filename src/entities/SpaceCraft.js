
import { Vector3, Quaternion, Euler } from 'three';
import spacecraftSchema from './SpaceCraft.json';
import { G, AU_TO_METERS } from '../utils/physicsUtils';

export const Spacecraft = {
  list: () => {
    // For now just return an array of one default spacecraft
    return [
      {
        name: "Imboni-1",
        position: new Vector3(1 + 4.530e-5 + 4.530e-5*5, 0, 0), 
        size: new Vector3(0.00000000267, 0.00000000267, 0.00000000267),
        velocity: new Vector3(0, 0, 0),
        max_speed: 0.00041666,
        fuel: 700,
        max_fuel: 1000,
        oxygen: 500,
        power: 100,
        thrust: 1,
        mass: 10000,
        target_body: "Mars",
        mission_status: "active",
        orientation: new Quaternion().setFromEuler(new Euler(0, 0, 0)), 
        thrust_vector: new Vector3(0, 0, 0),
        thrust_level: 0,
        autopilot: false, 
      }
    ];
  },
  
  // Apply thrust in a specific direction
  // Depriciated for real physics in physics utilty
  applyThrust: (spacecraft, thrustVector, thrustLevel, deltaTime) => {
    // console.log('applyThrust - Input:', { spacecraft, thrustVector, thrustLevel, deltaTime });
    
    if (spacecraft.fuel <= 0) {
        console.log('No fuel available. Thrust cannot be applied.');
        return spacecraft; // No fuel, no thrust
    }
    
    if (!thrustVector) {
        console.log('Invalid thrust vector. Thrust cannot be applied.');
        return spacecraft;
    }
    // Normalize thrust vector if it's not zero
    const magnitude = Math.sqrt(
        thrustVector.x ** 2 + 
        thrustVector.y ** 2 + 
        thrustVector.z ** 2
    );
    
    let normalizedVector = { x: 0, y: 0, z: 0 };
    if (magnitude > 0) {
        normalizedVector = {
            x: thrustVector.x / magnitude,
            y: thrustVector.y / magnitude,
            z: thrustVector.z / magnitude
        };
        // console.log('Normalized thrust vector:', normalizedVector);
    } else {
        // console.log('Thrust vector magnitude is zero, using zero vector for thrust.');
    }
    // Calculate thrust force (N)
    const thrustForce = spacecraft.thrust * thrustLevel;
    // console.log(`Calculated thrust force: ${thrustForce} N`);
    // Calculate acceleration (m/s²) using F = ma
    const acceleration = {
        x: (thrustForce * normalizedVector.x) / spacecraft.mass,
        y: (thrustForce * normalizedVector.y) / spacecraft.mass,
        z: (thrustForce * normalizedVector.z) / spacecraft.mass
    };
    // console.log('Calculated acceleration:', acceleration);
    // Update velocity (km/s)
    let newVelocity = {
        x: spacecraft.velocity.x + acceleration.x * deltaTime,
        y: spacecraft.velocity.y + acceleration.y * deltaTime,
        z: spacecraft.velocity.z + acceleration.z * deltaTime
    };
    if (newVelocity > spacecraft.max_speed) {
      newVelocity = {
        x: spacecraft.max_speed * deltaTime,
        y: spacecraft.max_speed * deltaTime,
        z: spacecraft.max_speed * deltaTime
      };
    }
    // console.log('New velocity after applying thrust:', newVelocity);
    // Calculate fuel consumption based on thrust level
    const fuelConsumption = spacecraft.thrust * thrustLevel * 0.0001 * deltaTime;
    // console.log(`Fuel consumption for this thrust application: ${fuelConsumption}`);
    // Ensure fuel does not go below zero
    const updatedFuel = Math.max(0, spacecraft.fuel - fuelConsumption);
    // console.log('Updated fuel level:', updatedFuel);
    const result = {
        ...spacecraft,
        velocity: newVelocity,
        fuel: updatedFuel,
        thrust_vector: normalizedVector,
        thrust_level: thrustLevel
    };
    // console.log('applyThrust - Output (velocity, fuel, thrust_vector, thrust_level):', { velocity: result.velocity, fuel: result.fuel, thrust_vector: result.thrust_vector, thrust_level: result.thrust_level });
    return result;
  },
  
  // Calculate gravitational forces from celestial bodies
  // Depriciated for real physics in physics
  calculateGravity: (spacecraft, celestialBodies) => {
    let totalForce = { x: 0, y: 0, z: 0 };
    
    Object.entries(celestialBodies).forEach(([key, body]) => {
      const bodyPos = body.position;
      const distance = Math.sqrt(
        Math.pow(spacecraft.position.x - bodyPos.x, 2) +
        Math.pow(spacecraft.position.y - bodyPos.y, 2) +
        Math.pow(spacecraft.position.z - bodyPos.z, 2)
      );
      
      if (distance > 0.001) { // Avoid division by zero
        const force = (G * body.mass * spacecraft.mass) / Math.pow(distance * AU_TO_METERS, 2);
        const direction = {
          x: (bodyPos.x - spacecraft.position.x) / distance,
          y: (bodyPos.y - spacecraft.position.y) / distance,
          z: (bodyPos.z - spacecraft.position.z) / distance
        };
        
        totalForce.x += force * direction.x / spacecraft.mass;
        totalForce.y += force * direction.y / spacecraft.mass;
        totalForce.z += force * direction.z / spacecraft.mass;
      }
    });
    
    return totalForce;
  },
  
  // Update spacecraft position based on velocity
  updatePosition: (spacecraft) => {
    // console.log('Updating position for spacecraft:', spacecraft);
    if (!spacecraft || !spacecraft.position || !spacecraft.velocity){
      console.error('Invalid spacecraft data for position update');
      return spacecraft;
    } 
    const newPosition = new Vector3(
      spacecraft.position.x,
      spacecraft.position.y,
      spacecraft.position.z
    );
    const result = {
      ...spacecraft,
      position: newPosition
    };
    // console.log('updatePosition - Output (position):', result.position);
    return result;
  },

  updateOrientation: (spacecraft) => {
    // console.log('updateOrientation - Input:', { spacecraft.orientation });
    const newOrientation = spacecraft.orientation;
  
    const result = {
      ...spacecraft,
      orientation: newOrientation
    };
    // console.log('updateOrientation - Output (orientation):', result.orientation);
    return result;
  },

  updateVelocity: (spacecraft) => {
    const newVelocity = spacecraft.velocity;

    const result = {
      ...spacecraft,
      velocity: newVelocity
    };
    return result;
  },

  // Update spacecraft systems (oxygen, power, etc.)
  updateSystems: (spacecraft, deltaTimeSec = 1) => {
    // Base consumption rates per second
    const BASE_OXYGEN_CONSUMPTION = 0.0005; // oxygen units/sec
    const BASE_POWER_CONSUMPTION  = 0.002;  // kWh/sec
    
    const crewCount = spacecraft.crew || 1;
    
    // Calculate usage
    const oxygenConsumption = BASE_OXYGEN_CONSUMPTION * crewCount * deltaTimeSec;
    const powerConsumption  = BASE_POWER_CONSUMPTION * deltaTimeSec;
    
    // Thrust multipliers
    const thrustOxygenFactor = spacecraft.thrust_level * 0.001 * deltaTimeSec;
    const thrustPowerFactor  = spacecraft.thrust_level * 0.01  * deltaTimeSec;
    
    return {
      ...spacecraft,
      oxygen: Math.max(0, spacecraft.oxygen - oxygenConsumption - thrustOxygenFactor),
      power:  Math.max(0, spacecraft.power  - powerConsumption  - thrustPowerFactor)
    };
  },


  
  // Autopilot function to navigate to a target body
  navigateToTarget: (spacecraft, targetBody, celestialBodies, deltaTime) => {
    if (!spacecraft.autopilot || !targetBody) return spacecraft;
    
    const target = celestialBodies[targetBody.toLowerCase()];
    if (!target) return spacecraft;
    
    // Calculate vector to target
    const targetVector = {
      x: target.position.x - spacecraft.position.x,
      y: target.position.y - spacecraft.position.y,
      z: target.position.z - spacecraft.position.z
    };
    
    // Calculate distance to target
    const distance = Math.sqrt(
      targetVector.x * targetVector.x +
      targetVector.y * targetVector.y +
      targetVector.z * targetVector.z
    );
    
    // Normalize direction vector
    const direction = {
      x: targetVector.x / distance,
      y: targetVector.y / distance,
      z: targetVector.z / distance
    };
    
    // Determine appropriate thrust level based on distance
    let thrustLevel = 0;
    if (distance > 0.5) {
      thrustLevel = 1.0; // Full thrust when far away
    } else if (distance > 0.1) {
      thrustLevel = 0.5; // Half thrust when getting closer
    } else if (distance > 0.01) {
      thrustLevel = 0.1; // Low thrust for final approach
    }
    
    // Apply thrust in the calculated direction
    let updatedSpacecraft = Spacecraft.applyThrust(
      spacecraft, 
      direction, 
      thrustLevel, 
      deltaTime
    );
    
    // Update orientation to face the target
    updatedSpacecraft = Spacecraft.updateOrientation(updatedSpacecraft, direction);
    
    return updatedSpacecraft;
  },
  
  // Main update function that combines all the above
  update: async (id, data) => {
    // This would normally update the database
    console.log(`Updating spacecraft ${id} with data:`, data);
    return data;
  },
  
  create: async (data) => {
    // This would normally create a new spacecraft in the database
    console.log('Creating new spacecraft:', data);
    return {
      id: 'sc-' + Math.random().toString(36).substr(2, 9),
      ...data
    };
  },
  
  delete: async (id) => {
    // This would normally delete the spacecraft from the database
    console.log(`Deleting spacecraft ${id}`);
    return true;
  },
  
  schema: spacecraftSchema
};


// import * as THREE from 'three';
// import { SpaceScaler } from '../../utils/scaler';
// import { CELESTIAL_BODIES, NON_SOLID_TYPES } from '../../entities/CelestialBodies';

// const scaler = new SpaceScaler();

// export function setupCelestialBodies(scene, celestialBodiesRef, orbitRefs, atmosphereRefs, cloudsRefs, textureLoader, setLoadingProgress) {
//   Object.entries(CELESTIAL_BODIES).forEach(([key, body]) => {
//     const geometry = new THREE.IcosahedronGeometry(scaler.scaleValue(body.radius) , 16);
//     const bodyGroup = new THREE.Group();

//     // Axial Tilt
//     if (body.axialTilt) {
//       bodyGroup.rotation.x = body.axialTilt * Math.PI / 180;
//     }

//     scene.add(bodyGroup); 

//     let material;
//     if (body.texture) {
//       const fallbackMaterial = new THREE.MeshPhongMaterial({
//         color: body.color,
//         emissive: body.type === 'star' ? body.color : 0x000000,
//         emissiveIntensity: body.type === 'star' ? (body.emissiveIntensity || 0.3) : 0,
//       });
//       const texture = textureLoader.current.load(
//         body.texture, 
//         (loadedTexture) => {
//           // console.log(`Successfully loaded texture for ${body.name}`);
//           setLoadingProgress(prev => ({
//             ...prev,
//             textures: {
//               ...prev.textures,
//               [key]: 'loaded'
//             }
//           }));
//         },
//         undefined,
//         (error) => {
//           console.error(`Failed to load texture for ${body.name}:`, error);
//           setLoadingProgress(prev => ({
//             ...prev,
//             textures: {
//               ...prev.textures,
//               [key]: 'failed'
//             }
//           }));

//           if (celestialBodiesRef.current[key]) {
//             celestialBodiesRef.current[key].material = fallbackMaterial;
//           }
//         }
//       );

//       material = new THREE.MeshStandardMaterial({
//         map: texture,
//         color: body.color,
//         emissive: body.type === 'star' ? body.color : 0x000000,
//         emissiveIntensity: body.type === 'star' ? (body.emissiveIntensity || 0.3) : 0,
//       });
//     } else {
//       material = new THREE.MeshPhongMaterial({
//         color: body.color,
//         emissive: body.type === 'star' ? body.color : 0x000000,
//         emissiveIntensity: body.type === 'star' ? (body.emissiveIntensity || 0.3) : 0
//       });
//     }

//     const mesh = new THREE.Mesh(geometry, material);
//     scaler.positionMesh(mesh, body.position);
//     mesh.userData = { bodyData: body, bodyKey: key };
//     bodyGroup.add(mesh);

//     // Shadows
//     if (NON_SOLID_TYPES.includes(body.type)) {
//       mesh.castShadow = false;
//       mesh.receiveShadow = false;
//     }else{
//       mesh.castShadow = true;
//       mesh.receiveShadow = true;
//     }

//     // City lights
//     if (body.citylightsTexture) {
//       const citylightsTexture = textureLoader.current.load(
//         body.citylightsTexture,
//         () => {
//           setLoadingProgress(prev => ({
//             ...prev,
//             citylightsTextures: {
//               ...prev.citylightsTextures,
//               [key]: 'loaded'
//             }
//           }));
//         },
//         undefined,
//         () => {
//           setLoadingProgress(prev => ({
//             ...prev,
//             citylightsTextures: {
//               ...prev.citylightsTextures,
//               [key]: 'failed'
//             }
//           }));
//         }
//       );
//       const lightsMat = new THREE.MeshBasicMaterial({
//         map: citylightsTexture,
//         blending: THREE.AdditiveBlending
//       })
//       const citylightsMesh = new THREE.Mesh(geometry, lightsMat);
//       scaler.positionMesh(citylightsMesh, body.position);
//       bodyGroup.add(citylightsMesh);
//     }

    
    

//     // Glow for stars Add a little pulsating effect
//     if (body.type === "star") {
//       const glowGeometry = new THREE.SphereGeometry(scaler.scaleValue(body.radius * 1.08), 64, 64);
//       const glowMaterial = new THREE.MeshBasicMaterial({
//         color: new THREE.Color(body.color),
//         transparent: true,
//         opacity: 0.15,
//         side: THREE.BackSide,
//         depthWrite: false,
//       });

//       const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
//       // glowMesh.position.copy(body.position);
//       scaler.positionMesh(glowMesh, body.position);
//       scene.add(glowMesh);

    
//       function animateStar() {
//         const time = performance.now() * 0.001;
//         const scale = 1 + Math.sin(time * 2.5) * 0.01;
//         mesh.scale.set(scale, scale, scale);
//         glowMesh.scale.set(scale * 1.08, scale * 1.08, scale * 1.08);
//         requestAnimationFrame(animateStar);
//       }
//       animateStar();
//     }

    
//     celestialBodiesRef.current[key] = bodyGroup;

//     // Atmosphere
//     if (body.atmosphere) {
//       const atmosphereGeometry = new THREE.SphereGeometry(
//         scaler.scaleValue(body.radius * 1.05),
//         64,
//         64
//       );
//       const atmosphereMaterial = new THREE.MeshPhongMaterial({
//         color: body.atmosphere.color,
//         transparent: true,
//         opacity: body.atmosphere.opacity,
//         side: THREE.DoubleSide
//       });
//       const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
//       mesh.add(atmosphereMesh);
//       atmosphereRefs.current[key] = atmosphereMesh;
//     }

//     // Clouds
//     if (body.clouds) {
//       const cloudsGeometry = new THREE.SphereGeometry(
//         scaler.scaleValue(body.radius * 1.02),
//         64,
//         64
//       );
//       const cloudsTexture  = textureLoader.current.load(
//         body.clouds.texture,
//         () => {
//           setLoadingProgress(prev => ({
//             ...prev,
//             cloudsTextures: {
//               ...prev.cloudsTextures,
//               [key]: 'loaded'
//             }
//           }));
//         },
//         undefined,
//         (error) => {
//           console.error(`Failed to load cloud texture for ${body.name}:`, error);
//           setLoadingProgress(prev => ({
//             ...prev,
//             cloudsTextures: {
//               ...prev.cloudsTextures,
//               [key]: 'failed'
//             }
//           }));
//         }
//       );
//       const cloudsMaterial = new THREE.MeshPhongMaterial({
//         map: cloudsTexture,
//         transparent: true,
//         opacity: 0.8,
//         side: THREE.DoubleSide
//       });
//       const cloudsMesh = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
//       scaler.positionMesh(cloudsMesh, body.position);
//       bodyGroup.add(cloudsMesh);
//       cloudsRefs.current[key] = cloudsMesh;
//     }

//     if (body.orbitalRadius) {
//       const segments = 128;
//       const xRadius = scaler.scaleValue(body.orbitalRadius);
//       const yRadius = scaler.scaleValue(body.orbitalRadius * (1 - (body.orbitalEccentricity || 0)));

//       const orbitCurve = new THREE.EllipseCurve(
//         0, 0,
//         xRadius, yRadius,
//         0, 2 * Math.PI,
//         false,
//         0
//       );


//       let orbitPoints = orbitCurve.getPoints(segments);
//       // Close the loop by pushing the first point again
//       orbitPoints.push(orbitPoints[0]);
      

//       const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);

//       const positions = new Float32Array(segments * 3);
//       for (let i = 0; i < segments; i++) {
//         const point = orbitPoints[i];
//         positions[i * 3] = point.x;
//         positions[i * 3 + 1] = 0;
//         positions[i * 3 + 2] = point.y;
//       }
//       orbitGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

//       const orbitMaterial = new THREE.LineBasicMaterial({
//         color: 0x444466,
//         transparent: true,
//         opacity: 0.3,
//         linewidth: 1
//       });

//       const orbitLine = new THREE.LineLoop(orbitGeometry, orbitMaterial);


//       if (body.orbitalInclination) {
//         orbitLine.rotation.x = body.orbitalInclination * Math.PI / 180;
//       }

//       scene.add(orbitLine);
//       orbitRefs.current[key] = orbitLine;
//     }
//   });
// }