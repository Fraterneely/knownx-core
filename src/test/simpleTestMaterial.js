import * as THREE from 'three';

/**
 * TEMPORARY: Super simple atmosphere material for testing
 * If this works, the issue is with the shader
 */
export function createSimpleAtmosphereMaterial() {
  return new THREE.MeshBasicMaterial({
    color: 0x87CEEB, // Sky blue
    transparent: true,
    opacity: 0.3,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
}

/**
 * TEMPORARY: Super simple cloud material for testing
 * If this works, the issue is with the cloud shader
 */
export function createSimpleCloudMaterial() {
  return new THREE.MeshBasicMaterial({
    color: 0xFFFFFF, // White
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
    depthWrite: false
  });
}

/**
 * Replace atmosphere with simple version for testing
 */
export function createTestAtmosphere(planetRadius, atmosphereHeight) {
  const atmosphereRadius = planetRadius + atmosphereHeight;
  
  const geometry = new THREE.SphereGeometry(atmosphereRadius, 64, 64);
  const material = createSimpleAtmosphereMaterial();
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 2;
  mesh.visible = true;
  mesh.frustumCulled = false;
  mesh.userData.isAtmosphere = true;
  mesh.userData.isTestAtmosphere = true;
  
  console.log('🧪 TEST: Simple atmosphere created');
  
  return mesh;
}

/**
 * Replace clouds with simple version for testing
 */
export function createTestClouds(planetRadius, altitude) {
  const cloudRadius = planetRadius + altitude;
  
  const geometry = new THREE.SphereGeometry(cloudRadius, 64, 64);
  const material = createSimpleCloudMaterial();
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 3;
  mesh.visible = true;
  mesh.frustumCulled = false;
  mesh.userData.isCloudLayer = true;
  mesh.userData.isTestCloud = true;
  
  console.log('🧪 TEST: Simple cloud layer created');
  
  return mesh;
}