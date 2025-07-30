import * as THREE from 'three';
import { SpaceScaler } from '../../utils/scaler';

const scaler = new SpaceScaler();
const fov = 45;
const aspect = window.innerWidth / window.innerHeight;
const near = 0.000001;
const far = 50000000;
export class CameraSetup {
    constructor() {
        console.log("Initializing CameraSetup...");
        this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        console.log(`Camera created with FOV: ${fov}, Aspect: ${aspect}, Near: ${near}, Far: ${far}`);
        const startPosition = new THREE.Vector3(1.00001, 0.00002, 0.00008); // place camera a bit near Earth
        scaler.positionMesh(this._camera, startPosition);
        this._camera.lookAt(scaler.scaleVector(new THREE.Vector3(0.99992, 0.0000099, 0)));
        console.log(`Camera positioned using SpaceScaler at: ${this._camera.position.x}, ${this._camera.position.y}, ${this._camera.position.z} .`);
    }
    getCamera() {
        console.log(`Getting camera instance...`);
        return this._camera;
    }
}
export class ThirdPersonCamera {
    constructor(params) {
        console.log("Initializing ThirdPersonCamera...");
        this.params = params;
        this.camera = params.camera;
        this.currentPosition = new THREE.Vector3();
        this.currentLookat = new THREE.Vector3();
        console.log("ThirdPersonCamera initialized with target:", this.params.target);
        
        console.log(`Target position: ${this.params.target.position.toArray()}`);
        console.log(`Target rotation: ${this.params.target.rotation.toArray()}`);
    }
    _CalculateIdealOffset() {
        const offset = new THREE.Vector3(0.00005, 0.00001, 0); // in AU
        const q = new THREE.Quaternion().setFromEuler(this.params.target.rotation);
        offset.applyQuaternion(q);
        return this.params.target.position.clone().add(offset);
    }
        
    _CalculateIdealLookat() {
        const look = new THREE.Vector3(0.000003, 0, 0); // in AU
        const q = new THREE.Quaternion().setFromEuler(this.params.target.rotation);
        look.applyQuaternion(q);
        return this.params.target.position.clone().add(look);
    }
      
    Update(timeElapsed) {
        const idealOffset = this._CalculateIdealOffset();
        const idealLookat = this._CalculateIdealLookat();
        
        const t = 1.0 * timeElapsed;
        this.currentPosition.lerp(idealOffset, t);
        this.currentLookat.lerp(idealLookat, t);
        
        // console.log(`Current Position after lerp: ${this.currentPosition.toArray()}`);
        // console.log(`Current Lookat after lerp: ${this.currentLookat.toArray()}`);

        this.camera.position.copy(this.currentPosition);
        this.camera.lookAt(this.currentLookat);
        // console.log(`Camera position set to: ${this.camera.position.toArray()}`);
        // console.log(`Camera looking at: ${this.currentLookat.toArray()}`);
    }
}