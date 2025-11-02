import * as CANNON from 'cannon-es';

export const keysPressed = new Set();

export const handleKeyDown = (e) => {
  keysPressed.add(e.code);
  const handledKeys = [
    'KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyQ', 'KeyE',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'KeyZ', 'KeyX', 'KeyO', 'KeyT'
  ];
  if (handledKeys.includes(e.code)) {
    e.preventDefault();
  }
};

export const handleKeyUp = (e) => keysPressed.delete(e.code);

export function setupKeyboardControls(setShowOrbitalSelector) {
  const handleKeyPress = (e) => {
    handleKeyDown(e);
    if (e.code === 'KeyO') {
      setShowOrbitalSelector(true);
    }
  };

  window.addEventListener('keydown', handleKeyPress);

  return () => {
    window.removeEventListener('keydown', handleKeyPress);
  };
}

export const getRotationDeltaFromKeys = (rotationSpeed = 1) => {
  let deltaPitch = 0;
  let deltaYaw = 0;
  let deltaRoll = 0;

  if (keysPressed.has('ArrowUp'))    deltaPitch -= rotationSpeed;
  if (keysPressed.has('ArrowDown'))  deltaPitch += rotationSpeed;
  if (keysPressed.has('ArrowLeft'))  deltaYaw   += rotationSpeed;
  if (keysPressed.has('ArrowRight')) deltaYaw   -= rotationSpeed;

  if (keysPressed.has('KeyX')) deltaRoll -= rotationSpeed;
  if (keysPressed.has('KeyZ')) deltaRoll += rotationSpeed;

  return { deltaPitch, deltaYaw, deltaRoll };
};

/**
 * Get thrust forces separated by type (main engine vs RCS)
 * Returns object with mainThrust and rcsThrust vectors
 */
export const getThrustFromKeys = (orientationQuat, shipMass, mainTWR, rcsTWR = 0.5) => {
  if (!orientationQuat || typeof orientationQuat.vmult !== 'function') {
    console.warn('Invalid orientation quaternion.');
    return { mainThrust: new CANNON.Vec3(), rcsThrust: new CANNON.Vec3() };
  }

  // Define local directions
  const localForward = new CANNON.Vec3(0, 0, -1);
  const localRight   = new CANNON.Vec3(1, 0, 0);
  const localUp      = new CANNON.Vec3(0, 1, 0);

  // Transform to world space
  const worldForward = orientationQuat.vmult(localForward);
  const worldRight   = orientationQuat.vmult(localRight);
  const worldUp      = orientationQuat.vmult(localUp);

  let mainThrust = new CANNON.Vec3();
  let rcsThrust = new CANNON.Vec3();

  // Main engine thrust (POWERFUL - forward only)
  if (keysPressed.has('KeyW')) {
    mainThrust.vadd(worldForward, mainThrust);
  }

  // RCS thrusters (WEAK - for precise maneuvering)
  if (keysPressed.has('KeyS')) rcsThrust.vsub(worldForward, rcsThrust);
  if (keysPressed.has('KeyD')) rcsThrust.vadd(worldRight, rcsThrust);
  if (keysPressed.has('KeyA')) rcsThrust.vsub(worldRight, rcsThrust);
  if (keysPressed.has('KeyE')) rcsThrust.vadd(worldUp, rcsThrust);
  if (keysPressed.has('KeyQ')) rcsThrust.vsub(worldUp, rcsThrust);

  // Calculate thrust magnitudes
  const earthG = 9.8;
  const mainThrustMagnitude = shipMass * earthG * mainTWR;
  const rcsThrustMagnitude = shipMass * earthG * rcsTWR;

  // Normalize and scale by magnitude
  if (mainThrust.lengthSquared() > 0) {
    mainThrust = mainThrust.unit().scale(mainThrustMagnitude);
  }
  
  if (rcsThrust.lengthSquared() > 0) {
    rcsThrust = rcsThrust.unit().scale(rcsThrustMagnitude);
  }

  return { mainThrust, rcsThrust };
};