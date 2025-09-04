import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import CannonDebugger from 'cannon-es-debugger';

// Gravitational Constant (real value, for accurate physics simulation)
export const G = 6.67408e-11; // m^3 kg^-1 s^-2
export const AU_TO_METERS = 1.49598e11; // 1 AU in meters
export const FORCE_SCALE = 1 / AU_TO_METERS; // scale N·m → AU·kg/s²

export function toMeters(vAU) {
  return vAU.clone().multiplyScalar(AU_TO_METERS);
}

/**
 * Calculates the gravitational force between two celestial bodies.
 * @param {THREE.Vector3} body1Position - Position of the first body.
 * @param {number} body1Mass - Mass of the first body.
 * @param {THREE.Vector3} body2Position - Position of the second body.
 * @param {number} body2Mass - Mass of the second body.
 * @returns {THREE.Vector3} The gravitational force vector.
 */

export function initCannonWorld (scene){
    const world = new CANNON.World();
    world.gravity.set(0, 0, 0); // No global gravity, handled by custom forces
    world.solver.iterations = 20;
    world.solver.tolerance = 0.001;
    world.defaultContactMaterial.contactEquationStiffness = 1e9;
    world.defaultContactMaterial.contactEquationRelaxation = 3;

    const celestialBodiesMaterail = new CANNON.Material("celestialBodiesMaterail");
    const spacecraftsMaterial = new CANNON.Material("spacecraftsMaterial");
    const contactMaterial = new CANNON.ContactMaterial(celestialBodiesMaterail, spacecraftsMaterial, {
        friction: 0.5,
        restitution: 0
    });
    world.addContactMaterial(contactMaterial);

    const cannonDebugger = new CannonDebugger(scene, world, {
        color: 0xffffff,
        lineWidth: 10,
    });

    return {world, cannonDebugger, celestialBodiesMaterail, spacecraftsMaterial};
};

export function gravitationalForce(body1PosAU, m1, body2PosAU, m2) {
  const p1 = toMeters(body1PosAU);
  const p2 = toMeters(body2PosAU);

  const rVec = p2.clone().sub(p1);          // meters
  // console.log(`rVec: (${rVec.toArray()})`);
  const r = rVec.length();
  // console.log(`r: ${r} m`);
  const dir = rVec.clone().divideScalar(r); // unitless
  // console.log(`direction: ${dir.toArray()}`);
  const mag = G * m1 * m2 / (r*r);          // newtons
  // console.log(`Force Mag: ${mag} N`);
  return dir.multiplyScalar(mag);           // N vector on body1
}

/**
 * Calculates the thrust force based on a given direction and magnitude.
 * @param {THREE.Vector3} direction - The direction of the thrust.
 * @param {number} magnitude - The magnitude of the thrust.
 * @returns {THREE.Vector3} The thrust force vector.
 */
export function applyOrbitalForces(celestialBodiesRef) {
  const bodyNames = Object.keys(celestialBodiesRef.current);
  for (let i = 0; i < bodyNames.length; i++) {
    const bodyName1 = bodyNames[i];
    const body1 = celestialBodiesRef.current[bodyName1];

    for (let j = i + 1; j < bodyNames.length; j++) { // Iterate over unique pairs
      const bodyName2 = bodyNames[j];
      const body2 = celestialBodiesRef.current[bodyName2];

      if (body1.bodyBody && body1.bodyData && body2.bodyBody && body2.bodyData) {
        const force = gravitationalForce(
          body1.bodyData.position,
          body1.bodyData.mass,
          body2.bodyData.position,
          body2.bodyData.mass
        );
        const cannonForce = new CANNON.Vec3(force.x, force.y, force.z);
        body1.bodyBody.applyForce(cannonForce); // Apply force to body1
        body2.bodyBody.applyForce(cannonForce.scale(-1)); // Apply equal and opposite force to body2
      }
    }
  }
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
  const scaledForce = new CANNON.Vec3(force.x, force.y, force.z).scale(FORCE_SCALE);
  body.applyForce(scaledForce);
}