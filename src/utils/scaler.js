import * as THREE from 'three';

export class SpaceScaler {
  constructor(scaleFactor = 100) {
    this.SCALE_X = scaleFactor;
  }

  // Scale a scalar value (e.g., radius)
  scaleValue(value) {
    return value * this.SCALE_X;
  }

  // Scale a Vector3 position
  scaleVector(v) {
    return new THREE.Vector3(v.x * this.SCALE_X, v.y * this.SCALE_X, v.z * this.SCALE_X);
  }

  // Apply scale to a mesh's size (e.g., radius of planet)
  scaleMesh(mesh, value) {
    mesh.scale.copy(this.scaleVector(value));
  }

  // Apply scale to a mesh's position
  positionMesh(mesh, vector) {
    mesh.position.copy(this.scaleVector(vector));
  }

  // Convert an array [x, y, z] into scaled Vector3
  scaleArray([x, y, z]) {
    return new THREE.Vector3(x * this.SCALE_X, y * this.SCALE_X, z * this.SCALE_X);
  }
}
