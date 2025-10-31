import * as THREE from 'three';

/**
 * Sky Dome Shader for ground-level view
 * Appears only when camera is below atmosphere
 */
export const SkyDomeShaderMaterial = (sunPosition) => {
  return new THREE.ShaderMaterial({
    uniforms: {
      sunPosition: { value: sunPosition.normalize() },
      sunColor: { value: new THREE.Color(1.0, 0.9, 0.8) },
      skyColor: { value: new THREE.Color(0.3, 0.5, 0.9) },
      horizonColor: { value: new THREE.Color(0.8, 0.85, 1.0) },
      groundColor: { value: new THREE.Color(0.4, 0.3, 0.2) },
    },
    
    vertexShader: `
      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vNormal = normalize(position);
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    
    fragmentShader: `
      uniform vec3 sunPosition;
      uniform vec3 sunColor;
      uniform vec3 skyColor;
      uniform vec3 horizonColor;
      uniform vec3 groundColor;
      
      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      
      void main() {
        vec3 direction = normalize(vNormal);
        float height = direction.y;
        
        // Sun glow
        float sunDot = max(dot(direction, sunPosition), 0.0);
        vec3 sun = sunColor * pow(sunDot, 256.0) * 3.0;
        
        // Sky gradient
        float skyGradient = smoothstep(-0.1, 0.3, height);
        vec3 sky = mix(horizonColor, skyColor, skyGradient);
        
        // Horizon glow
        float horizonGlow = 1.0 - abs(height);
        horizonGlow = pow(horizonGlow, 3.0);
        sky += horizonColor * horizonGlow * 0.3;
        
        // Sunset color based on sun height
        float sunHeight = sunPosition.y;
        vec3 sunsetColor = vec3(1.0, 0.5, 0.2);
        float sunsetMix = smoothstep(-0.2, 0.2, -sunHeight);
        sky = mix(sky, sunsetColor, sunsetMix * 0.5);
        
        vec3 color = sky + sun;
        
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    
    side: THREE.BackSide,
    depthWrite: false
  });
};

/**
 * Create sky dome for ground view
 */
export function createSkyDome(radius, sunPosition) {
  const geometry = new THREE.SphereGeometry(radius, 64, 64);
  const material = SkyDomeShaderMaterial(sunPosition);
  
  const skyDome = new THREE.Mesh(geometry, material);
  skyDome.userData.isSkyDome = true;
  
  return skyDome;
}

/**
 * WORKING Atmospheric Shader - Simplified but Beautiful
 * This actually renders unlike the complex GPU Gems version
 */
export function AtmosphereShaderMaterial(planetRadius, atmosphereRadius, atmosphereColor, sunPosition) {
  return new THREE.ShaderMaterial({
    uniforms: {
      planetRadius: { value: planetRadius },
      atmosphereRadius: { value: atmosphereRadius },
      sunPosition: { value: sunPosition.normalize() },
      cameraPos: { value: new THREE.Vector3() },
      atmosphereColor: { value: new THREE.Color(0.5, 0.7, 1.0) }, // Sky blue
      sunsetColor: { value: new THREE.Color(1.0, 0.6, 0.3) }, // Orange
    },
    
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec3 vWorldPosition;
      varying vec3 vViewDirection;
      
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        
        // View direction from camera to this point
        vViewDirection = normalize(worldPos.xyz - cameraPosition);
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    
    fragmentShader: `
      uniform float planetRadius;
      uniform float atmosphereRadius;
      uniform vec3 sunPosition;
      uniform vec3 cameraPos;
      uniform vec3 atmosphereColor;
      uniform vec3 sunsetColor;
      
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec3 vWorldPosition;
      varying vec3 vViewDirection;
      
      void main() {
        // Direction from planet center to this atmosphere point
        vec3 normal = normalize(vPosition);
        
        // Direction from camera to this point
        vec3 viewDir = normalize(vViewDirection);
        
        // Sun direction (normalized)
        vec3 lightDir = normalize(sunPosition);
        
        // CRITICAL: Check if this point is facing the sun
        float sunAlignment = dot(normal, lightDir);
        
        // Only show atmosphere on the sunlit side
        if (sunAlignment < -0.2) {
          // Point is on dark side, fade out atmosphere
          discard; // Or set alpha to 0
        }
        
        // Fresnel effect (atmosphere glow at edges when viewed from angle)
        float fresnel = 1.0 - abs(dot(-viewDir, normal));
        fresnel = pow(fresnel, 2.5);
        
        // Sun intensity on this point (0 = dark, 1 = full sun)
        float sunDot = max(sunAlignment, 0.0);
        
        // Sunset effect (when sun is at horizon)
        float sunHeight = lightDir.y;
        float sunsetAmount = smoothstep(0.3, -0.1, sunHeight) * sunDot;
        
        // Mix base atmosphere color with sunset color
        vec3 baseColor = mix(atmosphereColor, sunsetColor, sunsetAmount);
        
        // Add sun glow when looking towards sun through atmosphere
        float sunGlow = pow(max(dot(-viewDir, lightDir), 0.0), 16.0);
        vec3 glowColor = vec3(1.0, 0.95, 0.8) * sunGlow * 0.8;
        
        // Final color: base atmosphere + sun glow
        vec3 finalColor = baseColor + glowColor;
        
        // Atmosphere intensity: stronger at edges (fresnel) and on sunlit side
        float intensity = fresnel * smoothstep(-0.2, 0.5, sunDot);
        
        // Final opacity
        float alpha = intensity * 0.6;
        
        gl_FragColor = vec4(finalColor, alpha);
      }
    `,
    
    transparent: true,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
}

const atmosphereShader = {
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  
  fragmentShader: `
    uniform vec3 atmosphereColor;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
      float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
      gl_FragColor = vec4(atmosphereColor, 1.0) * intensity;
    }
  `
};

const atmosphereMaterial = new THREE.ShaderMaterial({
  uniforms: {
    atmosphereColor: { value: new THREE.Color(0x4db8ff) }
  },
  vertexShader: atmosphereShader.vertexShader,
  fragmentShader: atmosphereShader.fragmentShader,
  blending: THREE.AdditiveBlending,
  side: THREE.BackSide,
  transparent: true,
  depthWrite: false
});

/**
 * Create working atmosphere sphere
 */
export function createAtmosphericSphere(planetRadius, atmosphereHeight, atmosphereColor, sunPosition) {
  const atmosphereRadius = planetRadius + atmosphereHeight;
  
  const geometry = new THREE.SphereGeometry(atmosphereRadius, 128, 128);
  const material = AtmosphereShaderMaterial(planetRadius, atmosphereRadius, atmosphereColor, sunPosition);
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.isAtmosphere = true;
  mesh.renderOrder = 2;
  mesh.visible = true;
  mesh.frustumCulled = false;
  
  return mesh;
}

/**
 * Update working atmosphere
 */
export function updateWorkingAtmosphere(atmosphereMesh, cameraPos, sunPosition) {
  if (!atmosphereMesh || !atmosphereMesh.material || !atmosphereMesh.material.uniforms) return;
  
  atmosphereMesh.material.uniforms.cameraPos.value.copy(cameraPos);
  atmosphereMesh.material.uniforms.sunPosition.value.copy(sunPosition).normalize();
}