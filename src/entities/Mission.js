import missionSchema from './Mission.json';

export const Mission = {
  list: () => {
    return [
      {
        title: "Path to Mars",
        description: "Reach Mars and enter stable orbit.",
        target: "Mars",
        objective: "orbit",
        status: "available",
        difficulty: "medium",
        reward_points: 250,
        time_limit: 120, // hours
        requirements: {
          min_fuel: 800,
          min_oxygen: 400,
          min_power: 75
        }
      },
      {
        title: "Lunar Sample Run",
        description: "Land on the Moon and collect rock samples.",
        target: "Moon",
        objective: "sample_collection",
        status: "available",
        difficulty: "hard",
        reward_points: 400,
        time_limit: 72,
        requirements: {
          min_fuel: 600,
          min_oxygen: 350,
          min_power: 50
        }
      }
    ];
  },

  schema: missionSchema
};
