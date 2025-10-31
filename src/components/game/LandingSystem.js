import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { AU_TO_METERS } from '../../utils/physicsUtils';

// Landing phases
export const LANDING_PHASES = {
  SPACE: 'space',
  APPROACH: 'approach',           // 100km - 50km
  ATMOSPHERIC_ENTRY: 'entry',     // 50km - 20km
  DESCENT: 'descent',              // 20km - 1km
  FINAL_APPROACH: 'final',         // 1km - 100m
  TOUCHDOWN: 'touchdown',          // < 100m
  LANDED: 'landed'
};

// Add this constant at the top of landingSystem.js
export const ATMOSPHERE_ALTITUDE = {
  KARMAN_LINE: 100000,      // 100km - atmospheric entry begins
  DENSE_ATMOSPHERE: 50000,  // 50km - thick atmosphere, heavy effects
  TROPOSPHERE: 20000,       // 20km - weather layer
  FINAL_APPROACH: 1000,     // 1km - landing gear deployment
  TOUCHDOWN_ZONE: 100,      // 100m - touchdown imminent
  SURFACE: 1                // 1m - landed
};

const AU_TO_M = AU_TO_METERS;

// Safe landing parameters
const SAFE_LANDING_SPEED = 5;      // m/s
const DAMAGE_THRESHOLD_SPEED = 15; // m/s
const CRITICAL_SPEED = 30;         // m/s (instant destruction)

/**
 * Landing System Class
 * Handles all landing phases, effects, and physics
 */
export class LandingSystem {
  constructor(scene, camera, composer) {
    this.scene = scene;
    this.camera = camera;
    this.composer = composer;
    
    // Landing state
    this.currentPhase = LANDING_PHASES.SPACE;
    this.targetBody = null;
    this.altitude = Infinity;
    this.verticalSpeed = 0;
    this.isLandingGearDeployed = false;
    this.isAutopilotEngaged = false;
    this.touchdownVelocity = null;
    
    // Effects
    this.atmosphereParticles = null;
    this.dustParticles = null;
    this.heatShimmer = null;
    this.cameraShake = { intensity: 0, decay: 0.95 };
    
    // Timers
    this.phaseStartTime = 0;
    this.shakeTime = 0;
  }

  /**
   * Calculate altitude above nearest celestial body
   * Handles AU -> scaled units -> meters conversion properly
   */
  calculateAltitude(spacecraftPosition, celestialBodiesRef, scaler) {
    let closestBody = null;
    let minDistance = Infinity;

    // console.group('🛰️ Altitude Calculation Debug');
    // console.log('Spacecraft Position:', spacecraftPosition.toArray());

    Object.entries(celestialBodiesRef.current).forEach(([key, body]) => {
      if (!body.data || body.data.type === 'star') {
        // console.log(`⊗ Skipping ${key} (type: ${body.data?.type || 'undefined'})`);
        return;
      }
      
      // Body position in AU (from bodyData)
      const bodyPosAU = body.data.position;
      // console.log(`\n📍 ${key}:`);
      // console.log('  Position (AU):', bodyPosAU.toArray());

      // Radius in AU
      const radiusAU = body.data.radius;
      // console.log('  Radius (AU):', radiusAU);
      
      // Radius in meters
      const radiusMeters = radiusAU * AU_TO_M;
      // console.log('  Radius (meters):', radiusMeters);

      // Distance in AU
      const distanceAU = spacecraftPosition.distanceTo(bodyPosAU);
      // console.log('  Distance to center (meters):', distanceAU * AU_TO_M);
      
      // Surface distance in AU
      const surfaceDistanceAU = distanceAU - radiusAU;
      
      // Convert to meters for altitude display
      const surfaceDistanceMeters = surfaceDistanceAU * AU_TO_M;
      // console.log('  Surface distance (meters):', surfaceDistanceMeters);
      
      if (surfaceDistanceMeters < minDistance) {
        minDistance = surfaceDistanceMeters;
        closestBody = {
          key, 
          body, 
          distanceAU: surfaceDistanceAU,
          distanceMeters: surfaceDistanceMeters 
        };
        // console.log('  ✓ NEW CLOSEST BODY');
      }
    });

    if (closestBody) {
      this.altitude = closestBody.distanceMeters;
      this.targetBody = closestBody;
      // console.log(`\n🎯 Closest Body: ${closestBody.key}`);
      // console.log(`📏 Altitude: ${this.altitude.toFixed(2)} meters (${(this.altitude/1000).toFixed(2)} km)`);
    } else {
      this.altitude = Infinity;
      this.targetBody = null;
      // console.log('\n❌ No bodies found nearby');
    }
    
    console.groupEnd();
    
    return { altitude: this.altitude, body: closestBody };
  }

  /**
   * Determine current landing phase based on altitude (in meters)
   */
  updatePhase(altitude) {
    const prevPhase = this.currentPhase;
    
    // Altitude thresholds in meters
    const altKm = altitude / 1000;
    
    if (altitude > 50000000) { // > 50,000 km - too far
      this.currentPhase = LANDING_PHASES.SPACE;
    } else if (altitude > 100000) { // > 100 km
      this.currentPhase = LANDING_PHASES.APPROACH;
    } else if (altitude > 50000) { // 50-100 km - atmospheric entry
      this.currentPhase = LANDING_PHASES.ATMOSPHERIC_ENTRY;
    } else if (altitude > 1000) { // 1-50 km - descent
      this.currentPhase = LANDING_PHASES.DESCENT;
    } else if (altitude > 100) { // 100m-1km - final approach
      this.currentPhase = LANDING_PHASES.FINAL_APPROACH;
    } else if (altitude > 1) { // 1-100m - touchdown
      this.currentPhase = LANDING_PHASES.TOUCHDOWN;
    } else if (altitude <= 1) { // < 1m - landed
      this.currentPhase = LANDING_PHASES.LANDED;
    }

    // Phase transition
    if (prevPhase !== this.currentPhase) {
      // console.log(`🚀 PHASE TRANSITION: ${prevPhase} → ${this.currentPhase} (Alt: ${altKm.toFixed(1)} km)`);
      this.onPhaseChange(prevPhase, this.currentPhase);
    }

    return this.currentPhase;
  }

  /**
   * Handle phase transitions
   */
  onPhaseChange(oldPhase, newPhase) {
    // console.log(`Landing Phase: ${oldPhase} → ${newPhase}`);
    this.phaseStartTime = performance.now();

    switch(newPhase) {
      case LANDING_PHASES.ATMOSPHERIC_ENTRY:
        this.createAtmosphereEffects();
        this.cameraShake.intensity = 0.3;
        break;
      
      case LANDING_PHASES.DESCENT:
        this.cameraShake.intensity = 0.1;
        break;
      
      case LANDING_PHASES.FINAL_APPROACH:
        if (!this.isLandingGearDeployed) {
          this.deployLandingGear();
        }
        break;
      
      case LANDING_PHASES.TOUCHDOWN:
        this.createDustEffects();
        this.cameraShake.intensity = 0.5;
        break;
      
      case LANDING_PHASES.LANDED:
        this.handleLanding();
        break;
    }
  }

  /**
   * Create atmospheric entry particle effects
   */
  createAtmosphereEffects() {
    if (this.atmosphereParticles) return;

    const particleCount = 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      // Random positions around spacecraft
      positions[i * 3] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
      
      // Streak velocities
      velocities[i * 3] = (Math.random() - 0.5) * 2;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 2;
      velocities[i * 3 + 2] = Math.random() * -5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

    const material = new THREE.PointsMaterial({
      color: 0xff6600,
      size: 0.5,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    this.atmosphereParticles = new THREE.Points(geometry, material);
    this.scene.add(this.atmosphereParticles);
  }

  /**
   * Create dust cloud on touchdown
   */
  createDustEffects() {
    if (this.dustParticles) return;

    const particleCount = 1000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 20;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.random() * 5;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x8B7355,
      size: 1.0,
      transparent: true,
      opacity: 0.6
    });

    this.dustParticles = new THREE.Points(geometry, material);
  }

  /**
   * Deploy landing gear (visual/state change)
   */
  deployLandingGear() {
    this.isLandingGearDeployed = true;
    // console.log('🛬 Landing gear deployed');
    // TODO: Trigger landing gear animation on spacecraft model
  }

  /**
   * Update atmospheric particles
   */
  updateAtmosphereParticles(delta, spacecraftVelocity) {
    if (!this.atmosphereParticles) return;

    const positions = this.atmosphereParticles.geometry.attributes.position.array;
    const velocities = this.atmosphereParticles.geometry.attributes.velocity.array;

    for (let i = 0; i < positions.length; i += 3) {
      // Move particles based on velocity
      positions[i] += velocities[i] * delta * 60;
      positions[i + 1] += velocities[i + 1] * delta * 60;
      positions[i + 2] += velocities[i + 2] * delta * 60;

      // Reset particles that go too far
      if (positions[i + 2] < -50) {
        positions[i] = (Math.random() - 0.5) * 50;
        positions[i + 1] = (Math.random() - 0.5) * 50;
        positions[i + 2] = 50;
      }
    }

    this.atmosphereParticles.geometry.attributes.position.needsUpdate = true;

    // Fade out when exiting atmospheric phase
    if (this.currentPhase !== LANDING_PHASES.ATMOSPHERIC_ENTRY) {
      this.atmosphereParticles.material.opacity *= 0.95;
      if (this.atmosphereParticles.material.opacity < 0.01) {
        this.scene.remove(this.atmosphereParticles);
        this.atmosphereParticles = null;
      }
    }
  }

  /**
   * Update dust particles
   */
  updateDustParticles(delta) {
    if (!this.dustParticles) return;

    const positions = this.dustParticles.geometry.attributes.position.array;

    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] += delta * 10; // Rise up
      
      // Fade and remove
      if (positions[i + 1] > 30) {
        this.scene.remove(this.dustParticles);
        this.dustParticles = null;
        return;
      }
    }

    this.dustParticles.geometry.attributes.position.needsUpdate = true;
    this.dustParticles.material.opacity *= 0.98;
  }

  /**
   * Apply camera shake effect
   */
  applyCameraShake(camera) {
    if (this.cameraShake.intensity < 0.01) return;

    const shake = this.cameraShake.intensity;
    camera.position.x += (Math.random() - 0.5) * shake;
    camera.position.y += (Math.random() - 0.5) * shake;
    camera.position.z += (Math.random() - 0.5) * shake;

    this.cameraShake.intensity *= this.cameraShake.decay;
  }

  /**
   * Calculate recommended retro-thrust for safe landing
   */
  calculateRetroThrust(altitude, verticalSpeed, shipMass) {
    if (altitude > 1000) return 0;

    // Target vertical speed based on altitude
    const targetSpeed = Math.max(2, altitude / 200);
    const speedError = verticalSpeed - targetSpeed;

    // PID-like controller
    const thrustMagnitude = Math.min(1.0, Math.max(0, speedError * 0.1));
    
    return thrustMagnitude;
  }

  /**
   * Handle final landing
   */
  handleLanding() {
    const landingSpeed = Math.abs(this.verticalSpeed);
    
    // console.log(`🛬 TOUCHDOWN! Speed: ${landingSpeed.toFixed(2)} m/s`);

    if (landingSpeed < SAFE_LANDING_SPEED) {
      console.log('✅ Perfect landing!');
      return { success: true, damage: 0, message: 'Perfect landing!' };
    } else if (landingSpeed < DAMAGE_THRESHOLD_SPEED) {
      const damage = (landingSpeed - SAFE_LANDING_SPEED) * 5;
      console.log(`⚠️ Rough landing! Damage: ${damage.toFixed(0)}%`);
      return { success: true, damage, message: 'Rough landing - minor damage' };
    } else if (landingSpeed < CRITICAL_SPEED) {
      const damage = 50 + (landingSpeed - DAMAGE_THRESHOLD_SPEED) * 3;
      console.log(`❌ Hard landing! Damage: ${damage.toFixed(0)}%`);
      return { success: false, damage, message: 'Hard landing - major damage' };
    } else {
      console.log('💥 CRASH! Spacecraft destroyed!');
      return { success: false, damage: 100, message: 'Catastrophic impact!' };
    }
  }

  /**
   * Main update function - call this in your animation loop
   */
  update(spacecraftBody, spacecraftPosition, celestialBodiesRef, scaler, delta) {
    // Calculate altitude
    const { altitude, body } = this.calculateAltitude(spacecraftPosition, celestialBodiesRef, scaler);
    
    // Calculate vertical speed in m/s
    // Cannon velocity is in scaled units/sec, convert to m/s
    const velocityScaled = spacecraftBody.velocity; // scaled units/sec
    
    // Convert to AU/sec, then to m/s
    const velocityAU = new CANNON.Vec3(
      velocityScaled.x / scaler.SCALE_X,
      velocityScaled.y / scaler.SCALE_X,
      velocityScaled.z / scaler.SCALE_X
    );  
    const velocityMS = new CANNON.Vec3(
      velocityAU.x * AU_TO_M,
      velocityAU.y * AU_TO_M,
      velocityAU.z * AU_TO_M
    );
    
    // Vertical speed (downward is positive for landing)
    this.verticalSpeed = -velocityMS.y;
    
    // Total speed
    const totalSpeed = Math.sqrt(velocityMS.x**2 + velocityMS.y**2 + velocityMS.z**2);
    
    // console.log('🚀 Landing Update:');
    // console.log(`  Altitude: ${(altitude/1000).toFixed(2)} km`);
    // console.log(`  Vertical Speed: ${this.verticalSpeed.toFixed(2)} m/s ${this.verticalSpeed > 0 ? '↓' : '↑'}`);
    // console.log(`  Total Speed: ${totalSpeed.toFixed(2)} m/s`);
    // console.log(`  Phase: ${this.currentPhase}`);
    
    // Update phase
    if (altitude < 100000000) { // Only track landing within 100,000 km
      this.updatePhase(altitude);
    }

    // Update effects
    this.updateAtmosphereParticles(delta, velocityMS);
    this.updateDustParticles(delta);
    this.applyCameraShake(this.camera);

    // Return landing data for UI/HUD
    return {
      phase: this.currentPhase,
      altitude: altitude,
      verticalSpeed: this.verticalSpeed,
      totalSpeed: totalSpeed,
      targetBody: body ? body.key : null,
      recommendedThrust: this.calculateRetroThrust(altitude, this.verticalSpeed, spacecraftBody.mass),
      isLandingGearDeployed: this.isLandingGearDeployed
    };
  }

  /**
   * Cleanup
   */
  dispose() {
    if (this.atmosphereParticles) {
      this.scene.remove(this.atmosphereParticles);
      this.atmosphereParticles.geometry.dispose();
      this.atmosphereParticles.material.dispose();
    }
    if (this.dustParticles) {
      this.scene.remove(this.dustParticles);
      this.dustParticles.geometry.dispose();
      this.dustParticles.material.dispose();
    }
  }
}