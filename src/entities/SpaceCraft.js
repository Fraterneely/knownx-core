
import { Vector3 } from 'three';
import spacecraftSchema from './SpaceCraft.json';

// Physics constants
const G = 6.67430e-11; // Gravitational constant
const AU_TO_METERS = 1.496e11; // 1 AU in meters

export const Spacecraft = {
  list: () => {
    // For now just return an array of one default spacecraft
    return [
      {
        name: "Imboni-1",
        position: new Vector3(1, -0.0000426, 0),
        size: new Vector3(0.0000000267, 0.0000000267, 0.0000000267),
        velocity: { x: 0, y: 0, z: 0 },
        max_speed: 100,
        fuel: 700,
        max_fuel: 1000,
        oxygen: 500,
        power: 100,
        thrust: 50,
        mass: 1500,
        target_body: "Venus",
        mission_status: "active",
        orientation: { pitch: 0, yaw: 0, roll: 1 }, // Spacecraft orientation in radians
        thrust_vector: { x: 0, y: 0, z: 0 }, // Current thrust direction
        thrust_level: 0, // Current thrust level (0-1)
        autopilot: false, // Autopilot status
      }
    ];
  },
  
  // Apply thrust in a specific direction
  applyThrust: (spacecraft, thrustVector, thrustLevel, deltaTime) => {
    console.log('Applying thrust for spacecraft:', spacecraft);
    console.log('Initial fuel level:', spacecraft.fuel);
    
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
    const newVelocity = {
        x: spacecraft.velocity.x + acceleration.x * deltaTime,
        y: spacecraft.velocity.y + acceleration.y * deltaTime,
        z: spacecraft.velocity.z + acceleration.z * deltaTime
    };
    // console.log('New velocity after applying thrust:', newVelocity);
    // Calculate fuel consumption based on thrust level
    const fuelConsumption = spacecraft.thrust * thrustLevel * 0.0001 * deltaTime;
    // console.log(`Fuel consumption for this thrust application: ${fuelConsumption}`);
    // Ensure fuel does not go below zero
    const updatedFuel = Math.max(0, spacecraft.fuel - fuelConsumption);
    // console.log('Updated fuel level:', updatedFuel);
    return {
        ...spacecraft,
        velocity: newVelocity,
        fuel: updatedFuel,
        thrust_vector: normalizedVector,
        thrust_level: thrustLevel
    };
  },
  
  // Calculate gravitational forces from celestial bodies
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
  updatePosition: (spacecraft, deltaTime) => {
    // console.log('Updating position for spacecraft:', spacecraft);
    if (!spacecraft || !spacecraft.position || !spacecraft.velocity){
      console.error('Invalid spacecraft data for position update');
      return spacecraft;
    } 
    return {
      ...spacecraft,
      position: {
        x: spacecraft.position.x + spacecraft.velocity.x * deltaTime,
        y: spacecraft.position.y + spacecraft.velocity.y * deltaTime,
        z: spacecraft.position.z + spacecraft.velocity.z * deltaTime
      }
    };
  },
  
  // Update spacecraft systems (oxygen, power, etc.)
  updateSystems: (spacecraft, deltaTime) => {
    // Basic consumption rates
    const oxygenConsumption = 0.05 * deltaTime; // hours
    const powerConsumption = 0.2 * deltaTime; // kWh
    
    // Additional consumption based on thrust level
    const thrustOxygenFactor = spacecraft.thrust_level * 0.1;
    const thrustPowerFactor = spacecraft.thrust_level * 0.3;
    
    return {
      ...spacecraft,
      oxygen: Math.max(0, spacecraft.oxygen - oxygenConsumption - (thrustOxygenFactor * deltaTime)),
      power: Math.max(0, spacecraft.power - powerConsumption - (thrustPowerFactor * deltaTime))
    };
  },
  
  // Update orientation based on delta pitch and delta yaw
  updateOrientation: (spacecraft, deltaPitch, deltaYaw) => {
    let { pitch, yaw, roll } = spacecraft.orientation;

    pitch += deltaPitch;
    yaw += deltaYaw;

    // Clamp pitch to prevent flipping (e.g., -PI/2 to PI/2)
    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));

    // Keep yaw within 0 to 2*PI
    yaw = (yaw + 2 * Math.PI) % (2 * Math.PI);

    return {
      ...spacecraft,
      orientation: { pitch, yaw, roll }
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
