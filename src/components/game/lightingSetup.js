import * as THREE from 'three';
import { CELESTIAL_BODIES, NON_SOLID_TYPES } from '../../entities/CelestialBodies';
import { SpaceScaler } from '../../utils/scaler';

const scaler = new SpaceScaler();

export function setupLighting(scene) {
  const ambientLight = new THREE.AmbientLight(0x202020, 0.15);
  scene.add(ambientLight);

  // Loop through each celestial body
  for (const key in CELESTIAL_BODIES) {
    const body = CELESTIAL_BODIES[key];

    if (NON_SOLID_TYPES.includes(body.type) && body.emissive) {
      // For stars, blackholes, etc. that emit light
      const light = new THREE.PointLight(body.color || 0xffffff, body.emissiveIntensity || 1, 0);
      light.position.copy(scaler.scaleVector(body.position.x, body.position.y, body.position.z));
      light.castShadow = true;
      light.shadow.mapSize.width = 2048;
      light.shadow.mapSize.height = 2048;
      light.shadow.camera.near = 0.1;
      light.shadow.camera.far = 1000;

      scene.add(light);
    }

    // a soft directional fill light from the star direction to simulate scattered sunlight
    if (body.type === 'star') {
      const fill = new THREE.DirectionalLight(body.color || 0xffffff, 0.1);
      fill.position.copy(scaler.scaleVector(body.position.x, body.position.y, body.position.z).clone().add(new THREE.Vector3(1, 0.5, 1)).normalize().multiplyScalar(10));
      scene.add(fill);
    }
  }
}
