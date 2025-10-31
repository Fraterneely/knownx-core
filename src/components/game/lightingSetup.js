import * as THREE from 'three';
import { CELESTIAL_BODIES, NON_SOLID_TYPES } from '../../entities/CelestialBodies';
import { SpaceScaler } from '../../utils/scaler';

const scaler = new SpaceScaler();

export function setupLighting(scene, activeLights, setLightsReady) {
  const ambientLight = new THREE.AmbientLight(0x202020, 0.15);
  scene.add(ambientLight);

  // Loop through each celestial body
  for (const key in CELESTIAL_BODIES) {
    const body = CELESTIAL_BODIES[key];

    // Remove old light if it exists
    if (activeLights.current[key]) {
      scene.remove(activeLights.current[key]);
      delete activeLights.current[key];
    }

    if (NON_SOLID_TYPES.includes(body.type) && body.emissive) {
      // For stars, blackholes, etc. that emit light
      const light = new THREE.PointLight(body.emmissiveColor || 0xffffff, body.emissiveIntensity, 0);
      scaler.positionMesh(light, body.position)
      light.castShadow = true;

      scene.add(light);
      activeLights.current[key] = light;
      setLightsReady(true);

      const helper = new THREE.PointLightHelper(light, 10);
      // scene.add(helper);

      const shadowCamHelper = new THREE.CameraHelper(light.shadow.camera);
      // scene.add(shadowCamHelper);
    }

    // a soft directional fill light from the star direction to simulate scattered sunlight
    if (body.type === 'star') {
      const fill = new THREE.DirectionalLight(body.color || 0xffffff, 0.00001);
      fill.position.copy(scaler.scaleVector(body.position.x, body.position.y, body.position.z).clone().add(new THREE.Vector3(1, 0.5, 1)).normalize().multiplyScalar(10));
      scene.add(fill);
      activeLights.current[`${key}_fill`] = fill;
    }
  }
}
