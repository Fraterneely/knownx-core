export const Mission = {
    "name": "Mission",
    "type": "object",
    "properties": {
      "title": {
        "type": "string",
        "description": "Mission title"
      },
      "description": {
        "type": "string",
        "description": "Mission description"
      },
      "target": {
        "type": "string",
        "description": "Target celestial body"
      },
      "objective": {
        "type": "string",
        "enum": [
          "orbit",
          "landing",
          "flyby",
          "sample_collection",
          "deep_space"
        ],
        "description": "Mission objective type"
      },
      "status": {
        "type": "string",
        "enum": [
          "available",
          "active",
          "completed",
          "failed"
        ],
        "default": "available"
      },
      "difficulty": {
        "type": "string",
        "enum": [
          "easy",
          "medium",
          "hard",
          "extreme"
        ],
        "default": "easy"
      },
      "reward_points": {
        "type": "number",
        "description": "Points awarded for completion"
      },
      "time_limit": {
        "type": "number",
        "description": "Time limit in hours"
      },
      "requirements": {
        "type": "object",
        "properties": {
          "min_fuel": {
            "type": "number"
          },
          "min_oxygen": {
            "type": "number"
          },
          "min_power": {
            "type": "number"
          }
        }
      }
    },
    "required": [
      "title",
      "description",
      "target",
      "objective",
      "difficulty",
      "reward_points"
    ]
};

export const Spacecraft = {
    "name": "Spacecraft",
    "type": "object",
    "properties": {
      "name": {
        "type": "string",
        "description": "Name of the spacecraft"
      },
      "position": {
        "type": "object",
        "properties": {
          "x": {
            "type": "number"
          },
          "y": {
            "type": "number"
          },
          "z": {
            "type": "number"
          }
        },
        "description": "Position in 3D space (AU units)"
      },
      "velocity": {
        "type": "object",
        "properties": {
          "x": {
            "type": "number"
          },
          "y": {
            "type": "number"
          },
          "z": {
            "type": "number"
          }
        },
        "description": "Velocity vector (km/s)"
      },
      "fuel": {
        "type": "number",
        "description": "Fuel remaining (kg)"
      },
      "max_fuel": {
        "type": "number",
        "description": "Maximum fuel capacity (kg)"
      },
      "oxygen": {
        "type": "number",
        "description": "Oxygen remaining (hours)"
      },
      "power": {
        "type": "number",
        "description": "Power remaining (kWh)"
      },
      "thrust": {
        "type": "number",
        "description": "Thrust power (N)"
      },
      "mass": {
        "type": "number",
        "description": "Total mass (kg)"
      },
      "target_body": {
        "type": "string",
        "description": "Current target celestial body"
      },
      "mission_status": {
        "type": "string",
        "enum": [
          "active",
          "docked",
          "crashed",
          "lost"
        ],
        "default": "active"
      }
    },
    "required": [
      "name",
      "position",
      "velocity",
      "fuel",
      "max_fuel",
      "oxygen",
      "power",
      "thrust",
      "mass"
    ]
  }