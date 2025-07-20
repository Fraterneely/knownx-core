
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
        position: { x: 1.0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        fuel: 1000,
        max_fuel: 1000,
        oxygen: 500,
        power: 100,
        thrust: 5000,
        mass: 1500,
        target_body: "Mars",
        mission_status: "active",
        orientation: { pitch: 0, yaw: 0, roll: 0 }, // Spacecraft orientation in radians
        thrust_vector: { x: 0, y: 0, z: 0 }, // Current thrust direction
        thrust_level: 0, // Current thrust level (0-1)
        autopilot: false, // Autopilot status
      }
    ];
  },
  
  // Apply thrust in a specific direction
  applyThrust: (spacecraft, thrustVector, thrustLevel, deltaTime) => {
    if (spacecraft.fuel <= 0) return spacecraft; // No fuel, no thrust
    
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
    }
    
    // Calculate thrust force (N)
    const thrustForce = spacecraft.thrust * thrustLevel;
    
    // Calculate acceleration (m/s²) using F = ma
    const acceleration = {
      x: (thrustForce * normalizedVector.x) / spacecraft.mass,
      y: (thrustForce * normalizedVector.y) / spacecraft.mass,
      z: (thrustForce * normalizedVector.z) / spacecraft.mass
    };
    
    // Update velocity (km/s)
    const newVelocity = {
      x: spacecraft.velocity.x + acceleration.x * deltaTime,
      y: spacecraft.velocity.y + acceleration.y * deltaTime,
      z: spacecraft.velocity.z + acceleration.z * deltaTime
    };
    
    // Calculate fuel consumption based on thrust level
    // Higher thrust = higher fuel consumption
    const fuelConsumption = spacecraft.thrust * thrustLevel * 0.0001 * deltaTime;
    
    return {
      ...spacecraft,
      velocity: newVelocity,
      fuel: Math.max(0, spacecraft.fuel - fuelConsumption),
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
  
  // Calculate orientation based on thrust vector
  updateOrientation: (spacecraft, targetVector) => {
    if (!targetVector || (targetVector.x === 0 && targetVector.y === 0 && targetVector.z === 0)) {
      return spacecraft; // No change in orientation
    }
    
    // Calculate pitch (rotation around X-axis)
    const pitch = Math.atan2(
      Math.sqrt(targetVector.x * targetVector.x + targetVector.z * targetVector.z),
      targetVector.y
    );
    
    // Calculate yaw (rotation around Y-axis)
    const yaw = Math.atan2(targetVector.z, targetVector.x);
    
    // Roll can be controlled separately or kept at 0 for simplicity
    const roll = 0;
    
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
