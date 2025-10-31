import * as THREE from 'three';
import { createAtmosphericSphere, createSkyDome } from '../components/game/atmosphereShader';
import { CloudSystem, createProceduralCloudTexture } from '../components/game/cloudSystem';
import { AU_TO_METERS } from './physicsUtils';
import { createTestAtmosphere, createTestClouds } from '../test/simpleTestMaterial';

/**
 * Quick setup for Earth-like planet with realistic atmosphere
 */
export function setupEarthLikePlanet(bodyGroup, key, body, scaler, textureLoader, sunPosition, setLoadingProgress) {
  const planetRadius = scaler.scaleValue(body.radius);  
  const atmosphereHeightMeters = body.atmosphere?.height || 100000;
  const atmosphereHeightAU = atmosphereHeightMeters / AU_TO_METERS; // Convert meters to AU
  const atmosphereHeightScaled = scaler.scaleValue(atmosphereHeightAU); // Then scale for rendering
  const atmosphereColor = body.atmosphere?.color || new THREE.Vector3(0.3, 0.72, 1.0);
  
  console.log(`🌍 Setting up Earth-like planet called: ${body.name}`);
  console.log(`  Planet radius: ${(body.radius * AU_TO_METERS) / 1000} km`);
  console.log(`  Atmosphere height: ${atmosphereHeightMeters / 1000} km`);
  console.log(`  Atmosphere height (scaled): ${atmosphereHeightScaled} units`);
  
  const result = {
    atmosphere: null,
    skyDome: null,
    clouds: null
  };
  
  // 1. Atmospheric scattering
  if (body.atmosphere) {
    const atmosphereMesh = createAtmosphericSphere(
      planetRadius,
      atmosphereHeightScaled,
      atmosphereColor,
      sunPosition,
    );
    
    // const atmosphereMesh = createTestAtmosphere(
    //   planetRadius,
    //   atmosphereHeightScaled
    // );
    bodyGroup.add(atmosphereMesh);
    result.atmosphere = {
      height: atmosphereHeightAU,
      meshes: atmosphereMesh 
    };
    console.log('  ✓ Atmosphere created');
  }
  
  // 2. Sky dome for ground view
  if (body.atmosphere) {
    const skyDome = createSkyDome(planetRadius * 5, sunPosition);
    skyDome.visible = false;
    // bodyGroup.add(skyDome);
    result.skyDome = skyDome;
    console.log('  ✓ Sky dome created');
  }
  
  // 3. Volumetric clouds
  if (body.clouds) {
    const cloudSystem = new CloudSystem(planetRadius, textureLoader);
    
    // Get or create cloud texture
    let cloudTexture;
    if (body.clouds.texture) {
      cloudTexture  = textureLoader.load(
        body.clouds.texture,
        () => {
          console.log('  ✓ Cloud texture loaded'); 
          setLoadingProgress(prev => ({
            ...prev,
            cloudsTextures: {
              ...prev.cloudsTextures,
              [key]: 'loaded'
            }
          }));
        },
        undefined,
        (error) => {
          console.error(`Failed to load cloud texture for ${body.name}:`, error);
          console.log('  ⚠ Cloud texture failed, using procedural');
          setLoadingProgress(prev => ({
            ...prev,
            cloudsTextures: {
              ...prev.cloudsTextures,
              [key]: 'failed'
            }
          }));
          cloudTexture = createProceduralCloudTexture(512);
        }
      );
    } else {
      setLoadingProgress(prev => ({
        ...prev,
        cloudsTextures: {
          ...prev.cloudsTextures,
          [key]: 'loaded'
        }
      }));
      cloudTexture = createProceduralCloudTexture(512);
      console.log('  ✓ Procedural clouds generated');
    }
    
    // Low clouds (cumulus)
    const lowCloudsAltitudeMeters = body.clouds.lowAltitude || 2000;
    const lowCloudsAltitudeAU = lowCloudsAltitudeMeters / AU_TO_METERS;
    const lowClouds = cloudSystem.addCloudLayer(
      scaler.scaleValue(lowCloudsAltitudeAU),
      cloudTexture,
      sunPosition,
      {
        windSpeed: body.clouds.windSpeed || 0.0002,
        windDirection: new THREE.Vector2(1.0, 0.2),
        coverage: body.clouds.coverage || 0.5,
        density: body.clouds.density || 0.85,
      }
    );

    // const lowClouds = createTestClouds(planetRadius, scaler.scaleValue(lowCloudsAltitudeAU));
    bodyGroup.add(lowClouds);
    
    // High clouds (cirrus)
    const highCloudsAltitudeMeters = body.clouds.highAltitude || 10000;
    const highCloudsAltitudeAU = highCloudsAltitudeMeters / AU_TO_METERS;
    const highClouds = cloudSystem.addCloudLayer(
      scaler.scaleValue(highCloudsAltitudeAU),
      cloudTexture,
      {
        windSpeed: (body.clouds.windSpeed || 0.0002) * 2,
        windDirection: new THREE.Vector2(0.7, -0.3),
        coverage: (body.clouds.coverage || 0.5) * 0.6,
        density: (body.clouds.density || 0.85) * 0.6,
        rotation: Math.PI / 4
      }
    );

    // const highClouds = createTestClouds(planetRadius, scaler.scaleValue(highCloudsAltitudeAU));
    bodyGroup.add(highClouds);
    
    result.clouds = {
      altitudes: [lowCloudsAltitudeAU, highCloudsAltitudeAU],
      system: cloudSystem,
      meshes: [lowClouds, highClouds]
    };
    console.log('  ✓ Cloud system created (2 layers)');
  }
  
  return result;
}

/**
 * Quick setup for Mars-like planet (thin atmosphere, dust)
 */
export function setupMarsLikePlanet(bodyGroup, key, body, scaler, textureLoader, sunPosition, setLoadingProgress) {
  const planetRadius = scaler.scaleValue(body.radius);  
  const atmosphereHeightMeters = body.atmosphere?.height || 80000;
  const atmosphereHeightAU = atmosphereHeightMeters / AU_TO_METERS; // Convert meters to AU
  const atmosphereHeightScaled = scaler.scaleValue(atmosphereHeightAU); 
  const atmosphereColor = body.atmosphere?.color || new THREE.Vector3(0.9, 0.6, 0.4);
  
  console.log(`🌍 Setting up Mars-like planet called: ${body.name}`);
  console.log(`  Planet radius: ${(body.radius * AU_TO_METERS) / 1000} km`);
  console.log(`  Atmosphere height: ${atmosphereHeightMeters / 1000} km`);
  console.log(`  Atmosphere height (scaled): ${atmosphereHeightScaled} units`);
  
  const result = {
    atmosphere: null,
    skyDome: null,
    clouds: null
  };
  
  // 1. Atmospheric scattering
  if (body.atmosphere) {
    const atmosphereMesh = createAtmosphericSphere(
      planetRadius,
      atmosphereHeightScaled,
      atmosphereColor,
      sunPosition,
    );
    
    bodyGroup.add(atmosphereMesh);
    result.atmosphere = atmosphereMesh;
  }
  
  // Reddish sky
  if (body.atmosphere) {
    const skyDome = createSkyDome(planetRadius * 5, sunPosition);
    
    // Override colors for Mars
    if (skyDome.material.uniforms) {
      skyDome.material.uniforms.skyColor.value.set(0.8, 0.5, 0.3); // Butterscotch sky
      skyDome.material.uniforms.horizonColor.value.set(0.9, 0.6, 0.4);
    }
    
    skyDome.visible = false;
    // bodyGroup.add(skyDome);
    result.skyDome = skyDome;
  }
  
  // Dust storms instead of clouds
  if (body.clouds) {
    const cloudSystem = new CloudSystem(planetRadius, textureLoader);
    const dustTexture = createProceduralCloudTexture(512);
    
    // Single layer of dust
    const dustLayer = cloudSystem.addCloudLayer(
      scaler.scaleValue(1000),
      dustTexture,
      {
        windSpeed: 0.0005, // Faster dust movement
        windDirection: new THREE.Vector2(1.0, 0.5),
        coverage: 0.3,
        density: 0.6,
      }
    );
    
    // Make dust more orange
    if (dustLayer.material.uniforms) {
      dustLayer.material.uniforms.cloudColor.value.set(0.9, 0.6, 0.3);
    }
    
    bodyGroup.add(dustLayer);
    
    result.clouds = {
      system: cloudSystem,
      meshes: [dustLayer]
    };
  }
  
  return result;
}

/**
 * Quick setup for Venus-like planet (thick atmosphere)
 */
export function setupVenusLikePlanet(bodyGroup, key, body, scaler, textureLoader, sunPosition, setLoadingProgress) {
  const planetRadius = scaler.scaleValue(body.radius);
  const atmosphereHeight = body.atmosphere?.height || 250000;
  
  console.log(`☁️ Setting up Venus-like planet: ${body.name}`);
  
  const result = {
    atmosphere: null,
    skyDome: null,
    clouds: null
  };
  
  // Very thick atmosphere
  if (body.atmosphere) {
    const atmosphereMesh = createAtmosphericSphere(
      planetRadius,
      atmosphereHeight,
      sunPosition,
      bodyGroup
    );
    
    bodyGroup.add(atmosphereMesh);
    result.atmosphere = atmosphereMesh;
  }
  
  // Yellow/orange sky
  if (body.atmosphere) {
    const skyDome = createSkyDome(planetRadius * 5, sunPosition);
    
    if (skyDome.material.uniforms) {
      skyDome.material.uniforms.skyColor.value.set(1.0, 0.8, 0.3); // Yellow
      skyDome.material.uniforms.horizonColor.value.set(1.0, 0.7, 0.2);
    }
    
    skyDome.visible = false;
    // bodyGroup.add(skyDome);
    result.skyDome = skyDome;
  }
  
  // Dense sulfuric acid clouds
  if (body.clouds) {
    const cloudSystem = new CloudSystem(planetRadius, textureLoader);
    const cloudTexture = createProceduralCloudTexture(512);
    
    // Multiple thick cloud layers
    const layers = [];
    for (let i = 0; i < 3; i++) {
      const altitude = scaler.scaleValue(50000 + i * 30000);
      const cloudLayer = cloudSystem.addCloudLayer(
        altitude,
        cloudTexture,
        {
          windSpeed: 0.0001 * (i + 1),
          windDirection: new THREE.Vector2(1.0, 0.1 * i),
          coverage: 0.8,
          density: 0.9,
          rotation: (Math.PI / 3) * i
        }
      );
      
      // Yellow clouds
      if (cloudLayer.material.uniforms) {
        cloudLayer.material.uniforms.cloudColor.value.set(1.0, 0.9, 0.5);
      }
      
      bodyGroup.add(cloudLayer);
      layers.push(cloudLayer);
    }
    
    result.clouds = {
      system: cloudSystem,
      meshes: layers
    };
  }
  
  return result;
}

/**
 * Auto-select planet type and setup
 */
export function setupPlanetAtmosphere(bodyGroup, key, body, scaler, textureLoader, sunPosition, setLoadingProgress) {
  // Detect planet type by name or characteristics
  const name = body.name.toLowerCase();
  
  if (name.includes('earth')) {
    return setupEarthLikePlanet(bodyGroup, key, body, scaler, textureLoader, sunPosition, setLoadingProgress);
  } else if (name.includes('mars')) {
    return setupMarsLikePlanet(bodyGroup, key, body, scaler, textureLoader, sunPosition, setLoadingProgress);
  // } else if (name.includes('venus')) {
  //   return setupVenusLikePlanet(bodyGroup, key, body, scaler, textureLoader, sunPosition, setLoadingProgress);
  } else {
    return setupEarthLikePlanet(bodyGroup, key, body, scaler, textureLoader, sunPosition, setLoadingProgress);  
  }
}

/**
 * Update all atmosphere effects (call in animation loop)
 */
export function updateAllAtmospheres(atmosphereRefs, cloudsRefs, camera, sunPosition, landingData, scaledDelta) {
  // Update atmospheres
  Object.entries(atmosphereRefs).forEach(([key, data]) => {
    if (data && data.atmosphere) {
      // Update scattering
      if (data.atmosphere.material && data.atmosphere.material.uniforms) {
        const uniforms = data.atmosphere.material.uniforms;
        
        // Update camera position
        uniforms.v3CameraPos.value.copy(camera.position);
        const cameraHeight = camera.position.length();
        uniforms.fCameraHeight.value = cameraHeight;
        uniforms.fCameraHeight2.value = cameraHeight * cameraHeight;
        
        // Update sun position
        uniforms.v3LightPos.value.copy(sunPosition).normalize();
        
        // Make sure atmosphere is visible
        data.atmosphere.visible = true;
      }
      
      // Show/hide sky dome based on altitude
      if (data.skyDome && landingData) {
        const showSky = landingData.altitude < 50000 && landingData.targetBody === key;
        data.skyDome.visible = showSky;
        
        if (showSky) {
          data.skyDome.position.copy(camera.position);
          if (data.skyDome.material.uniforms) {
            data.skyDome.material.uniforms.sunPosition.value.copy(sunPosition).normalize();
          }
        }
      }
    }
  });
  
  // Update clouds
  Object.entries(cloudsRefs).forEach(([key, data]) => {
    if (data && data.system) {
      data.system.update(scaledDelta, sunPosition);
    }

    // Make sure all cloud meshes are visible
    if (data.meshes) {
      data.meshes.forEach(mesh => {
        mesh.visible = true;
      });
    }
  });
}