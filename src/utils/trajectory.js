import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { gravitationalForce } from "./physicsUtils";

export function computeTrajectory(shipBody, celestialBodies, steps = 500, dt = 1/60) {
    // Clone the ship's Cannon body state
    let pos = shipBody.position.clone();
    let vel = shipBody.velocity.clone();
    const points = [];

    for (let i = 0; i < steps; i++) {
        // Apply gravity from each celestial body
        celestialBodies.forEach(body => {
            const force = gravitationalForce(
                new THREE.Vector3(pos.x, pos.y, pos.z),
                shipBody.mass,
                new THREE.Vector3(body.position.x, body.position.y, body.position.z),
                body.mass
            );
            const cannonForce = new CANNON.Vec3(force.x, force.y, force.z);
            vel.vadd(cannonForce.scale(dt / shipBody.mass), vel); // vel += F * dt / m
        });

        // Advance position
        pos.vadd(vel.scale(dt, new CANNON.Vec3()), pos); // pos += vel * dt

        // Save point
        points.push(pos.clone());
    }

    return points;
}
