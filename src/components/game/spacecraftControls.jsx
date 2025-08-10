import { Vector3 } from 'three';

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

export const getThrustVectorFromKeys = (orientationQuat) => {
  if (!orientationQuat || typeof orientationQuat.multiply !== 'function') {
    console.warn('Invalid orientation quaternion.');
    return new Vector3();
  }

  const localForward = new Vector3(0, 0, -1);
  const localRight   = new Vector3(1, 0, 0);
  const localUp      = new Vector3(0, 1, 0);

  const worldForward = localForward.clone().applyQuaternion(orientationQuat);
  const worldRight   = localRight.clone().applyQuaternion(orientationQuat);
  const worldUp      = localUp.clone().applyQuaternion(orientationQuat);

  let thrust = new Vector3();
  if (keysPressed.has('KeyW')) thrust.add(worldForward);
  if (keysPressed.has('KeyS')) thrust.sub(worldForward);
  if (keysPressed.has('KeyD')) thrust.add(worldRight);
  if (keysPressed.has('KeyA')) thrust.sub(worldRight);
  if (keysPressed.has('KeyE')) thrust.add(worldUp);
  if (keysPressed.has('KeyQ')) thrust.sub(worldUp);

  return thrust.lengthSq() > 0 ? thrust.normalize() : thrust;
};

export const getRotationDeltaFromKeys = (rotationSpeed = 0.01) => {
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
