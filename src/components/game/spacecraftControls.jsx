import * as CANNON from 'cannon-es';

export const keysPressed = new Set();

export const handleKeyDown = (e) => {
  console.log(`${e.code} is Pressed`);
  keysPressed.add(e.code);
  const handledKeys = [
    'KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyQ', 'KeyE',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'KeyZ', 'KeyX'
  ];
  if (handledKeys.includes(e.code)) {
    e.preventDefault();
  }
};
export const handleKeyUp = (e) => keysPressed.delete(e.code);

export const getRotationDeltaFromKeys = (rotationSpeed = 1) => {
  let deltaPitch = 0;
  let deltaYaw = 0;
  let deltaRoll = 0;

  if (keysPressed.has('ArrowUp'))    deltaPitch -= rotationSpeed;
  if (keysPressed.has('ArrowDown'))  deltaPitch += rotationSpeed;
  if (keysPressed.has('ArrowLeft'))  deltaYaw   += rotationSpeed;
  if (keysPressed.has('ArrowRight')) deltaYaw   -= rotationSpeed;

  if (keysPressed.has('KeyZ')) deltaRoll -= rotationSpeed;
  if (keysPressed.has('KeyX')) deltaRoll += rotationSpeed;

  return { deltaPitch, deltaYaw, deltaRoll };
};

export const getThrustVectorFromKeys = (orientationQuat) => {
  if (!orientationQuat || typeof orientationQuat.vmult !== 'function') {
    console.warn('Invalid orientation quaternion.');
    return new CANNON.Vec3();
  }

  const localForward = new CANNON.Vec3(0, 0, -1);
  const localRight   = new CANNON.Vec3(1, 0, 0);
  const localUp      = new CANNON.Vec3(0, 1, 0);

  // Transform directions to world space
  const worldForward = orientationQuat.vmult(localForward);
  const worldRight   = orientationQuat.vmult(localRight);
  const worldUp      = orientationQuat.vmult(localUp);

  let thrust = new CANNON.Vec3();
  if (keysPressed.has('KeyW')) thrust.vadd(worldForward, thrust);
  if (keysPressed.has('KeyS')) thrust.vsub(worldForward, thrust);
  if (keysPressed.has('KeyD')) thrust.vadd(worldRight, thrust);
  if (keysPressed.has('KeyA')) thrust.vsub(worldRight, thrust);
  if (keysPressed.has('KeyE')) thrust.vadd(worldUp, thrust);
  if (keysPressed.has('KeyQ')) thrust.vsub(worldUp, thrust);

  // Return normalized direction (if any)
  return thrust.lengthSquared() > 0 ? thrust.unit() : thrust;
};
