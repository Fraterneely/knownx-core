// JavaScript Example: Reading Entities
// Filterable fields: name, position, velocity, fuel, max_fuel, oxygen, power, thrust, mass, target_body, mission_status
async function fetchSpacecraftEntities() {
    const response = await fetch(`https://app.base44.com/api/apps/687a2440b4f7e5f9e49f56e4/entities/Spacecraft`, {
        headers: {
            'api_key': '3a364ef91ee740848005a4c4258f0c4d', // or use await User.me() to get the API key
            'Content-Type': 'application/json'
        }
    });
    const data = await response.json();
    console.log(data);
}

// JavaScript Example: Updating an Entity
// Filterable fields: name, position, velocity, fuel, max_fuel, oxygen, power, thrust, mass, target_body, mission_status
async function updateSpacecraftEntity(entityId, updateData) {
    const response = await fetch(`https://app.base44.com/api/apps/687a2440b4f7e5f9e49f56e4/entities/Spacecraft/${entityId}`, {
        method: 'PUT',
        headers: {
            'api_key': '3a364ef91ee740848005a4c4258f0c4d', // or use await User.me() to get the API key
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
    });
    const data = await response.json();
    console.log(data);
}