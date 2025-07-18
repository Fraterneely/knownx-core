
import spacecraftSchema from './SpaceCraft.json';

export const Spacecraft = {
  list: () => {
    // For now just return an array of one default spacecraft
    return [
      {
        name: "Imboni-1",
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        fuel: 1000,
        max_fuel: 1000,
        oxygen: 500,
        power: 100,
        thrust: 5000,
        mass: 1500,
        target_body: "Mars",
        mission_status: "active"
      }
    ];
  },
  schema: spacecraftSchema
};
