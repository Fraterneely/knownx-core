// JavaScript Example: Reading Entities
// Filterable fields: title, description, target, objective, status, difficulty, reward_points, time_limit, requirements
async function fetchMissionEntities() {
    const response = await fetch(`https://app.base44.com/api/apps/687a2440b4f7e5f9e49f56e4/entities/Mission`, {
        headers: {
            'api_key': '3a364ef91ee740848005a4c4258f0c4d', // or use await User.me() to get the API key
            'Content-Type': 'application/json'
        }
    });
    const data = await response.json();
    console.log(data);
}

// JavaScript Example: Updating an Entity
// Filterable fields: title, description, target, objective, status, difficulty, reward_points, time_limit, requirements
async function updateMissionEntity(entityId, updateData) {
    const response = await fetch(`https://app.base44.com/api/apps/687a2440b4f7e5f9e49f56e4/entities/Mission/${entityId}`, {
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