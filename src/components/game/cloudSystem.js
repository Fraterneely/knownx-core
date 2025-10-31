import * as THREE from 'three';

/**
 * Volumetric Cloud Shader
 * Creates realistic, lit clouds with depth
 */
// export const VolumetricCloudMaterial = (cloudTexture, sunPosition) => {
//   return new THREE.ShaderMaterial({
//     uniforms: {
//       cloudTexture: { value: cloudTexture },
//       sunPosition: { value: sunPosition.normalize() },
//       sunColor: { value: new THREE.Color(1.0, 0.95, 0.9) },
//       cloudColor: { value: new THREE.Color(1.0, 1.0, 1.0) },
//       shadowColor: { value: new THREE.Color(0.3, 0.3, 0.4) },
//       time: { value: 0.0 },
//       windDirection: { value: new THREE.Vector2(1.0, 0.5) },
//       windSpeed: { value: 0.0001 },
//       coverage: { value: 0.5 },
//       density: { value: 0.8 },
//     },
    
//     vertexShader: `
//       varying vec2 vUv;
//       varying vec3 vNormal;
//       varying vec3 vPosition;
      
//       void main() {
//         vUv = uv;
//         vNormal = normalize(normalMatrix * normal);
//         vPosition = position;
        
//         gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
//       }
//     `,
    
//     fragmentShader: `
//       uniform sampler2D cloudTexture;
//       uniform vec3 sunPosition;
//       uniform vec3 sunColor;
//       uniform vec3 cloudColor;
//       uniform vec3 shadowColor;
//       uniform float time;
//       uniform vec2 windDirection;
//       uniform float windSpeed;
//       uniform float coverage;
//       uniform float density;
      
//       varying vec2 vUv;
//       varying vec3 vNormal;
//       varying vec3 vPosition;
      
//       // Noise function for cloud variation
//       float noise(vec2 p) {
//         return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
//       }
      
//       void main() {
//         // Animate clouds with wind
//         vec2 animatedUV = vUv + windDirection * time * windSpeed;
        
//         // Sample cloud texture
//         vec4 cloudSample = texture2D(cloudTexture, animatedUV);
//         float cloudDensity = cloudSample.r;
        
//         // Add multiple octaves for detail
//         vec2 uv2 = animatedUV * 2.0;
//         vec2 uv3 = animatedUV * 4.0;
//         float detail1 = texture2D(cloudTexture, uv2).r * 0.5;
//         float detail2 = texture2D(cloudTexture, uv3).r * 0.25;
        
//         cloudDensity = cloudDensity + detail1 + detail2;
//         cloudDensity = smoothstep(1.0 - coverage, 1.0, cloudDensity);
        
//         // Calculate lighting from sun
//         vec3 normal = normalize(vNormal);
//         float sunDot = max(dot(normal, sunPosition), 0.0);
        
//         // Self-shadowing effect
//         float shadow = smoothstep(0.0, 1.0, sunDot);
//         shadow = mix(0.3, 1.0, shadow);
        
//         // Cloud lighting
//         vec3 litCloud = mix(shadowColor, cloudColor * sunColor, shadow);
        
//         // Sun scatter through clouds
//         float scatter = pow(sunDot, 4.0);
//         litCloud += sunColor * scatter * 0.5;
        
//         // Edge softness for depth
//         float edgeFade = smoothstep(0.0, 0.2, cloudDensity) * 
//                          smoothstep(1.0, 0.8, cloudDensity);
        
//         // Final opacity
//         float alpha = cloudDensity * density * edgeFade;
        
//         gl_FragColor = vec4(litCloud, alpha);
//       }
//     `,
    
//     transparent: true,
//     side: THREE.DoubleSide,
//     depthWrite: false,
//     blending: THREE.NormalBlending
//   });
// };

/**
 * WORKING Cloud Shader - Simplified
 */
export function VolumetricCloudMaterial(cloudTexture, starPosition) {
  return new THREE.ShaderMaterial({
    uniforms: {
      cloudTexture: { value: cloudTexture },
      starPosition: { value: starPosition },
      time: { value: 0 },
      windSpeed: { value: 0.0001 },
      coverage: { value: 0.5 },
      opacity: { value: 0.8 },
    },
    
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;
      
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    
    fragmentShader: `
      uniform sampler2D cloudTexture;
      uniform vec3 sunPosition;
      uniform float time;
      uniform float windSpeed;
      uniform float coverage;
      uniform float opacity;
      
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;
      
      void main() {
        // Animate UVs
        vec2 uv = vUv + vec2(time * windSpeed, 0.0);
        
        // Sample cloud texture
        float cloud = texture2D(cloudTexture, uv).r;
        
        // Apply coverage
        cloud = smoothstep(1.0 - coverage, 1.0, cloud);
        
        // Lighting
        vec3 normal = normalize(vNormal);
        vec3 lightDir = normalize(sunPosition);
        float light = max(dot(normal, lightDir), 0.3); // Ambient 0.3
        
        // Cloud color
        vec3 cloudColor = vec3(1.0, 1.0, 1.0) * light;
        
        // Final opacity
        float alpha = cloud * opacity;
        
        gl_FragColor = vec4(cloudColor, alpha);
      }
    `,
    
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false
  });
}

/**
 * Create multi-layered cloud system
 */
export class CloudSystem {
  constructor(planetRadius, textureLoader) {
    this.planetRadius = planetRadius;
    this.textureLoader = textureLoader;
    this.cloudLayers = [];
    this.time = 0;
  }
  
  /**
   * Add a cloud layer at specific altitude
   */
  addCloudLayer(altitude, texture, starPosition, options = {}) {
    const {
      windSpeed = 0.0001,
      windDirection = new THREE.Vector2(1.0, 0.3),
      coverage = 0.5,
      density = 0.8,
      rotation = 0
    } = options;
    
    const cloudRadius = this.planetRadius + altitude;
    const geometry = new THREE.SphereGeometry(cloudRadius, 128, 128);
    
    // Load or use provided texture
    const cloudTexture = typeof texture === 'string' 
      ? this.textureLoader.load(texture)
      : texture;
    
    const material = VolumetricCloudMaterial(
      cloudTexture,
      starPosition
    );
    
    material.uniforms.windSpeed.value = windSpeed;
    material.uniforms.coverage.value = coverage;
    material.uniforms.opacity.value = density;
    
    const cloudMesh = new THREE.Mesh(geometry, material);
    cloudMesh.rotation.y = rotation;
    cloudMesh.userData.isCloudLayer = true;
    cloudMesh.userData.windSpeed = windSpeed;
    
    // Fix cloud rendering order to ensure clouds appear above the planet
    cloudMesh.renderOrder = 1;
    material.transparent = true;
    material.depthWrite = false;
    
    this.cloudLayers.push(cloudMesh);
    
    return cloudMesh;
  }
  
  /**
   * Update all cloud layers
   */
  update(delta, sunPosition) {
    this.time += delta;
    
    this.cloudLayers.forEach(layer => {
      if (layer.material.uniforms) {
        layer.material.uniforms.time.value = this.time;
        layer.material.uniforms.sunPosition.value.copy(sunPosition).normalize();
        
        // Rotate clouds slowly
        layer.rotation.y += delta * layer.userData.windSpeed * 0.1;
      }
    });
  }
  
  /**
   * Get all cloud meshes
   */
  getMeshes() {
    return this.cloudLayers;
  }
  
  /**
   * Dispose of all cloud layers
   */
  dispose() {
    this.cloudLayers.forEach(layer => {
      layer.geometry.dispose();
      layer.material.dispose();
    });
    this.cloudLayers = [];
  }
}

/**
 * Update working clouds
 */
export function updateClouds(cloudMesh, sunPosition, deltaTime) {
  if (!cloudMesh || !cloudMesh.material || !cloudMesh.material.uniforms) return;
  
  cloudMesh.material.uniforms.sunPosition.value.copy(sunPosition).normalize();
  cloudMesh.material.uniforms.time.value += deltaTime;
}

/**
 * Create simple procedural cloud texture
 * Use this if you don't have a cloud texture file
 */
export function createProceduralCloudTexture(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  // Create noise-based clouds
  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      
      // Multiple octaves of noise
      let noise = 0;
      noise += Math.random() * 0.5;
      noise += Math.random() * 0.25;
      noise += Math.random() * 0.125;
      
      // Smooth
      noise = Math.pow(noise, 1.5);
      
      const value = Math.floor(noise * 255);
      data[i] = value;     // R
      data[i + 1] = value; // G
      data[i + 2] = value; // B
      data[i + 3] = 255;   // A
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  
  return texture;
}

/**
 * Setup realistic Earth-like clouds
 */
export function setupEarthClouds(planetRadius, textureLoader, scene) {
  const cloudSystem = new CloudSystem(planetRadius, textureLoader);
  
  // Try to load cloud texture, fallback to procedural
  let cloudTexture;
  try {
    cloudTexture = textureLoader.load('/textures/clouds/earth_clouds.png');
  } catch (e) {
    console.log('No cloud texture found, using procedural clouds');
    cloudTexture = createProceduralCloudTexture(512);
  }
  
  // Low cumulus clouds (1-2km altitude)
  const lowClouds = cloudSystem.addCloudLayer(1500, cloudTexture, {
    windSpeed: 0.0002,
    windDirection: new THREE.Vector2(1.0, 0.2),
    coverage: 0.4,
    density: 0.9,
    rotation: 0
  });
  scene.add(lowClouds);
  
  // High cirrus clouds (8-12km altitude)
  const highClouds = cloudSystem.addCloudLayer(10000, cloudTexture, {
    windSpeed: 0.0004,
    windDirection: new THREE.Vector2(0.8, -0.3),
    coverage: 0.3,
    density: 0.5,
    rotation: Math.PI / 4
  });
  scene.add(highClouds);
  
  return cloudSystem;
}