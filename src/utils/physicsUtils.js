import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// Gravitational Constant (real value, for accurate physics simulation)
export const G = 6.67430e-11; // m^3 kg^-1 s^-2

/**
 * Calculates the gravitational force between two celestial bodies.
 * @param {THREE.Vector3} body1Position - Position of the first body.
 * @param {number} body1Mass - Mass of the first body.
 * @param {THREE.Vector3} body2Position - Position of the second body.
 * @param {number} body2Mass - Mass of the second body.
 * @returns {THREE.Vector3} The gravitational force vector.
 */
export function calculateGravitationalForce(body1Position, body1Mass, body2Position, body2Mass) {
    const direction = new THREE.Vector3().subVectors(body2Position, body1Position);
    const distance = direction.length();

    // Avoid division by zero or extremely large forces at very close distances
    // Using a small epsilon to prevent numerical instability
    const minDistance = 0.1; 
    if (distance < minDistance) return new THREE.Vector3(); 

    const forceMagnitude = (G * body1Mass * body2Mass) / (distance * distance);
    return direction.normalize().multiplyScalar(forceMagnitude);
}

/**
 * Calculates the thrust force based on a given direction and magnitude.
 * @param {THREE.Vector3} direction - The direction of the thrust.
 * @param {number} magnitude - The magnitude of the thrust.
 * @returns {THREE.Vector3} The thrust force vector.
 */
export function calculateThrustForce(direction, magnitude) {
    return direction.clone().normalize().multiplyScalar(magnitude);
}

/**
 * Applies a force to a Cannon.js body.
 * @param {CANNON.Body} body - The Cannon.js body to apply the force to.
 * @param {THREE.Vector3} force - The force vector to apply.
 */
export function applyForceToBody(body, force) {
    body.applyForce(new CANNON.Vec3(force.x, force.y, force.z));
}