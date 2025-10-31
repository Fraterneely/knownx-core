import * as THREE from 'three';
import { AU_TO_METERS } from './physicsUtils';

/**
 * Debug helper to visualize atmosphere and cloud layers
 * Add this temporarily to see where things are
 */
export function addAtmosphereDebugWireframes(bodyGroup, planetRadiusScaled, atmosphereRadiusScaled, cloudAltitudesScaled) {
  // Planet surface wireframe (red)
  const planetWireframe = new THREE.Mesh(
    new THREE.SphereGeometry(planetRadiusScaled, 32, 32),
    new THREE.MeshBasicMaterial({
      color: 0xff0000,
      wireframe: true,
      transparent: true,
      opacity: 0.3
    })
  );
  bodyGroup.add(planetWireframe);
  
  // Atmosphere boundary wireframe (blue)
  const atmosphereWireframe = new THREE.Mesh(
    new THREE.SphereGeometry(planetRadiusScaled + atmosphereRadiusScaled, 32, 32),
    new THREE.MeshBasicMaterial({
      color: 0x0000ff,
      wireframe: true,
      transparent: true,
      opacity: 0.5
    })
  );
  bodyGroup.add(atmosphereWireframe);
  
  // Cloud layers wireframes (green)
  cloudAltitudesScaled.forEach((altitude, index) => {
    const cloudWireframe = new THREE.Mesh(
      new THREE.SphereGeometry(planetRadiusScaled + altitude, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        wireframe: true,
        transparent: true,
        opacity: 0.4
      })
    );
    bodyGroup.add(cloudWireframe);
  });
  
  console.log('🔍 Debug wireframes added:');
  console.log(`  RED = Planet surface (${planetRadiusScaled})`);
  console.log(`  BLUE = Atmosphere edge (${planetRadiusScaled + atmosphereRadiusScaled})`);
  console.log(`  GREEN = Cloud layers`, cloudAltitudesScaled);
}

/**
 * Test if atmosphere and clouds are actually in the scene
 */
export function testAtmosphereInScene(scene) {
  console.group('🔍 Scene Atmosphere Test');
  
  let atmosphereCount = 0;
  let cloudCount = 0;
  let totalMeshes = 0;
  
  scene.traverse((object) => {
    if (object.isMesh) {
      totalMeshes++;
      
      if (object.userData.isAtmosphere) {
        atmosphereCount++;
        console.log('✅ Found atmosphere mesh:', {
          visible: object.visible,
          renderOrder: object.renderOrder,
          material: object.material.type,
          transparent: object.material.transparent,
          geometry: `${object.geometry.type} (${object.geometry.parameters?.radius})`
        });
      }
      
      if (object.userData.isCloudLayer) {
        cloudCount++;
        console.log('☁️ Found cloud layer:', {
          visible: object.visible,
          renderOrder: object.renderOrder,
          material: object.material.type,
          transparent: object.material.transparent,
          geometry: `${object.geometry.type} (${object.geometry.parameters?.radius})`
        });
      }
    }
  });
  
  console.log(`\n📊 Summary:`);
  console.log(`  Total meshes in scene: ${totalMeshes}`);
  console.log(`  Atmosphere meshes: ${atmosphereCount}`);
  console.log(`  Cloud layers: ${cloudCount}`);
  
  if (atmosphereCount === 0) {
    console.error('❌ NO ATMOSPHERE MESHES FOUND! Atmosphere not being added to scene.');
  }
  
  if (cloudCount === 0) {
    console.error('❌ NO CLOUD LAYERS FOUND! Clouds not being added to scene.');
  }
  
  console.groupEnd();
  
  return { atmosphereCount, cloudCount, totalMeshes };
}

/**
 * Log atmosphere and cloud setup for debugging
 */
export function logAtmosphereSetup(body, scaler) {
  console.group(`🌍 Atmosphere Debug for: ${body.name}`);
  
  // Planet
  console.log('Planet:');
  console.log(`  Radius (AU): ${body.radius}`);
  console.log(`  Radius (meters): ${(body.radius * AU_TO_METERS).toExponential(2)}`);
  console.log(`  Radius (km): ${(body.radius * AU_TO_METERS / 1000).toFixed(0)}`);
  console.log(`  Radius (scaled): ${scaler.scaleValue(body.radius)}`);
  
  // Atmosphere
  if (body.atmosphere) {
    const atmHeightM = body.atmosphere.height || 100000;
    const atmHeightAU = atmHeightM / AU_TO_METERS;
    const atmHeightScaled = scaler.scaleValue(atmHeightAU);
    
    console.log('\nAtmosphere:');
    console.log(`  Height (meters): ${atmHeightM}`);
    console.log(`  Height (km): ${atmHeightM / 1000}`);
    console.log(`  Height (AU): ${atmHeightAU.toExponential(2)}`);
    console.log(`  Height (scaled): ${atmHeightScaled}`);
    console.log(`  Total radius (scaled): ${scaler.scaleValue(body.radius) + atmHeightScaled}`);
  }
  
  // Clouds
  if (body.clouds) {
    console.log('\nClouds:');
    const lowAltM = body.clouds.lowAltitude || 2000;
    const lowAltAU = lowAltM / AU_TO_METERS;
    const lowAltScaled = scaler.scaleValue(lowAltAU);
    
    console.log(`  Low altitude (meters): ${lowAltM}`);
    console.log(`  Low altitude (km): ${lowAltM / 1000}`);
    console.log(`  Low altitude (AU): ${lowAltAU.toExponential(2)}`);
    console.log(`  Low altitude (scaled): ${lowAltScaled}`);
    
    const highAltM = body.clouds.highAltitude || 10000;
    const highAltAU = highAltM / AU_TO_METERS;
    const highAltScaled = scaler.scaleValue(highAltAU);
    
    console.log(`  High altitude (meters): ${highAltM}`);
    console.log(`  High altitude (km): ${highAltM / 1000}`);
    console.log(`  High altitude (AU): ${highAltAU.toExponential(2)}`);
    console.log(`  High altitude (scaled): ${highAltScaled}`);
  }
  
  console.groupEnd();
}