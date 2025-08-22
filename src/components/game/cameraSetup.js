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
        console.log("Initializing ThirdPersonCamera...");
        this.params = params;
        this.camera = params.camera;
        this.currentPosition = new THREE.Vector3();
        this.currentLookat = new THREE.Vector3();
        
        console.log(`Target position: ${this.params.target.position.toArray()}`);
        console.log(`Target rotation: ${this.params.target.quaternion.toArray()}`);
    }
    _CalculateIdealOffset() {
        const offset = new THREE.Vector3(0, 0.000002, 0.000005);
        // console.log(`Target Rotaion: ${this.params.target.rotation.toArray()}`);
        const q = new THREE.Quaternion().setFromEuler(this.params.target.rotation);
        // console.log(`Target Quaternion: ${q.toArray()}`);
        offset.applyQuaternion(q);
        return this.params.target.position.clone().add(offset);
    }
        
    _CalculateIdealLookat() {
        const look = new THREE.Vector3(0, 0, 0.000006);
        const q = new THREE.Quaternion().setFromEuler(this.params.target.rotation);
        look.applyQuaternion(q);
        return this.params.target.position.clone().add(look);
    }
      
    Update(timeElapsed) {
        // console.log(`Updating camera position and orientation from: ${this.camera.position.toArray()}, for taget (POS): ${this.params.target.position.toArray()}`);
        // console.log(`Updating camera position and orientation from: ${this.camera.rotation.toArray()}, for taget (ROTATION): ${this.params.target.rotation.toArray()}`);
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