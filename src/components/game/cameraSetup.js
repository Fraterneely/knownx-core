import * as THREE from 'three';
import { SpaceScaler } from '../../utils/scaler';

const scaler = new SpaceScaler();
const fov = 30;
const aspect = window.innerWidth / window.innerHeight;
const near = 0.00000000005;
const far = 500000000000;
export class CameraSetup {
    constructor() {
        console.log("Initializing CameraSetup...");
        this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        const startPosition = new THREE.Vector3(1.00003, 0.000008, 0.00009); // place camera a bit near Earth
        scaler.positionMesh(this._camera, startPosition);
        this._camera.lookAt(scaler.scaleVector(new THREE.Vector3(0.99992, 0.0000099, 0)));
    }
    getCamera() {
        return this._camera;
    }
}
export class ThirdPersonCamera {
    constructor(params) {
        console.log("Initializing FristPersonCamera...");
        this.params = params;
        this.camera = params.camera;
        this.shipBody = params.shipBody;
        this.currentPosition = new THREE.Vector3();
        this.currentLookat = new THREE.Vector3();
        this.offset = new THREE.Vector3(0.5, 2, 7.5); // Default offset (x, y, z)
        this.velocityPosition = new THREE.Vector3();
        this.velocityLookat = new THREE.Vector3();
        
        console.log(`Target position: ${this.params.target.position.toArray()}`);
        console.log(`Target rotation: ${this.params.target.quaternion.toArray()}`);
    }
    _CalculateIdealOffset() {
        const offset = new THREE.Vector3(0, 0, 0); 
        const q = new THREE.Quaternion().setFromEuler(this.params.target.rotation);
        offset.applyQuaternion(q);
        return this.params.target.position.clone().add(offset);
    }
        
    _CalculateIdealLookat() {
        const look = new THREE.Vector3(0, 0, 0);
        const q = new THREE.Quaternion().setFromEuler(this.params.target.rotation);
        look.applyQuaternion(q);
        return this.params.target.position.clone().add(look);
    }
      
    Update(timeElapsed) {
        const idealOffset = this._CalculateIdealOffset();
        const idealLookat = this._CalculateIdealLookat();
        
        const t = 0.1 * timeElapsed;
        this.currentPosition.lerp(idealOffset, t);
        this.currentLookat.lerp(idealLookat, t);

        this.camera.position.copy(this.currentPosition);
        this.camera.lookAt(this.currentLookat);
    }
}

export class FirstPersonCamera {  
  constructor(params) {
    console.log("Initializing FirstPersonCamera...");
    this.params = params;
    this.camera = params.camera;
    this.target = params.target; // spacecraft or player object
    this.shipBody = params.shipBody;

    // For smooth transitions
    this.currentPosition = new THREE.Vector3();
    this.currentLookat = new THREE.Vector3();
    this.offset = new THREE.Vector3(0.5e-8, 2e-8, 7.5e-8); // Default offset (x, y, z)
    this.velocityPosition = new THREE.Vector3(); // Track position velocity
    this.velocityLookat = new THREE.Vector3(); // Track lookat velocity

    // Adjust these for preferred cockpit/behind-body position
    this.offset = new THREE.Vector3(0.5e-8, 2e-8, 7.5e-8); // closer to body
    this.lookOffset = new THREE.Vector3(0, 0, -1e-8); // look direction
  }

  _CalculateIdealOffset() {
    // Convert offset to target’s local space
    const offset = this.offset.clone();
    offset.applyQuaternion(this.target.quaternion);
    return this.target.position.clone().add(offset);
  }

  _CalculateIdealLookat() {
    // Where the camera should look (forward of target)
    const lookAt = this.lookOffset.clone();
    lookAt.applyQuaternion(this.target.quaternion);
    return this.target.position.clone().add(lookAt);
  }

  _clamp(value, min, max) {
      return Math.max(min, Math.min(value, max));
  }

  _smoothDampScalar(current, target, currentVelocity, smoothTime, maxSpeed, deltaTime) {
      smoothTime = Math.max(0.0001, smoothTime);
      const omega = 2 / smoothTime;
      const x = omega * deltaTime;
      const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);

      let change = current - target;
      const originalTo = target; // Store original target for clamping
      const maxChange = maxSpeed * smoothTime;
      change = this._clamp(change, -maxChange, maxChange); // Use custom clamp
      target = current - change; // Recalculate target based on clamped change

      const temp = (currentVelocity + omega * change) * deltaTime;
      currentVelocity = (currentVelocity - omega * temp) * exp;
      current = target + (change + temp) * exp;

      // Prevent overshooting
      if (originalTo - current > 0 === originalTo - target > 0) {
          current = originalTo;
          currentVelocity = 0;
      }
      return { value: current, velocity: currentVelocity };
  }

  _smoothDampVector(current, target, currentVelocity, smoothTime, maxSpeed, deltaTime) {
      // Apply smoothDampScalar to each component
      const dampX = this._smoothDampScalar(current.x, target.x, currentVelocity.x, smoothTime, maxSpeed, deltaTime);
      const dampY = this._smoothDampScalar(current.y, target.y, currentVelocity.y, smoothTime, maxSpeed, deltaTime);
      const dampZ = this._smoothDampScalar(current.z, target.z, currentVelocity.z, smoothTime, maxSpeed, deltaTime);

      current.set(dampX.value, dampY.value, dampZ.value);
      currentVelocity.set(dampX.velocity, dampY.velocity, dampZ.velocity);
  }

  Update(timeElapsed) {
    const idealOffset = this._CalculateIdealOffset();
    const idealLookat = this._CalculateIdealLookat();

    // Smooth damping to reduce jiggle
    // Calculate spacecraft speed
    const spacecraftSpeed = this.shipBody.velocity.length();

    // Dynamically adjust damping time based on spacecraft speed
    // Faster speed -> lower dampingTime (snappier camera)
    // Slower speed -> higher dampingTime (smoother camera)
    const minDampingTime = 0.01; // Minimum damping time for very fast movement
    const maxDampingTime = 0.5;  // Maximum damping time for slow movement
    const speedThreshold = 1000;   // Speed at which damping time starts to decrease significantly
    const maxSpeed = 100000000000; // Limit the maximum speed of camera movement to prevent overshooting

    let dampingTime = maxDampingTime - (maxDampingTime - minDampingTime) * Math.min(1, spacecraftSpeed / speedThreshold);
    dampingTime = Math.max(minDampingTime, Math.min(maxDampingTime, dampingTime)); // Ensure it stays within bounds

    this._smoothDampVector(this.currentPosition, idealOffset, this.velocityPosition, dampingTime, maxSpeed, timeElapsed);
    this._smoothDampVector(this.currentLookat, idealLookat, this.velocityLookat, dampingTime, maxSpeed, timeElapsed);

    // Apply new camera transform
    this.camera.position.copy(this.currentPosition);
    
    // Calculate the spacecraft's up vector from its quaternion
    const spacecraftUp = new THREE.Vector3(0, 1, 0); // Default up vector
    spacecraftUp.applyQuaternion(this.target.quaternion);
    this.camera.up.copy(spacecraftUp);

    this.camera.lookAt(this.currentLookat);
  }
}