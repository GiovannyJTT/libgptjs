/**
 * @module libgptjs Graphical Programming with ThreeJS (GPT)
 * @class PF_FolllowCamera
 */

import * as THREE from "three"
import { lerp } from "three/src/math/MathUtils";

class PF_FollowCamera {
    /**
     * Creates a follow camera that will follow and point towards the direction of the `target` (commonly moving drone object)
     * @property {THREE.Object3D} `target_obj` object to be followed. It will be set at `set_target()` once the model is fully loaded
     * @property {THREE.Camera} `cam` camera that will be moved
     * @property {PF_FollowCamera} `cam_handler` Object that will control the movement of the camera
     * @property {Float} `radial_dist` distance to keep between camera and target_obj
     * @property {THREE.Vector3} `goal_point` position where the camera has to move in order follow the `target_obj`, pointing in the same `direction`
     * taking into accoun the current rotation of the target_obj and keep the `radial_dist`
     * @property {Float} `i_pos` interpolation factor to update the camera-position every frame
     */
    constructor () {
        this.target_obj = undefined;
        this.cam = undefined;
        this.cam_handler = undefined;        
        this.radial_dist = 200;
        this.goal_point = new THREE.Vector3();
        this.i_pos = 0.1;
    }
};

/**
 * Creates and cofigures a perspective camera. It will be called at GPT_Renderer.
 */
PF_FollowCamera.prototype.config_cam = function () {
    this.cam = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
    this.cam.position.set(0, 275, 0); // consider we are working in mm
    this.cam.lookAt(new THREE.Vector3(0, 0, 0)); // looking at the origin
};

/**
 * Creates and configures a `FollowCamera``Handler`. It will be called at GPT_Renderer.
 * @param {*} cam_ (`not used`, using `this.cam` instead) `target camera` to be followed (Object3D)
 * @param {*} webgl_dom_element_ (`not used`) webgl dom element from which events are captured (keydown, touch, etc.)
 */
PF_FollowCamera.prototype.config_cam_handler = function (cam_, webgl_dom_element_) {
    this.cam_handler = this;
}

/**
 * @param {THREE.Object3D} target_obj_ target obejct to be followed
 */
PF_FollowCamera.prototype.set_target = function (target_obj_) {
    this.target_obj = target_obj_;
}

PF_FollowCamera.prototype.update = function () {

    if (undefined !== this.target_obj) {
        // directional vector (what direction is the object moving towards)
        const _yaw = this.target_obj.rotation.y;
        const _pitch = this.target_obj.rotation.x;

        const sin_pitch = Math.sin(_pitch);
        const cos_pitch = Math.cos(_pitch);
        const cos_yaw = Math.cos(_yaw);

        const _dir = new THREE.Vector3(
            Math.sin(_yaw),
            -(sin_pitch * cos_yaw),
            -(cos_pitch * cos_yaw),
        )

        // calculate pos behind the target_obj based on current rotation the target
        this.goal_point = new THREE.Vector3().copy(this.target_obj.position)
            .sub(
                _dir.multiplyScalar(this.radial_dist)
            );

        // clapm values to avoid pointing towards the sky and go to close to the obj
        this.goal_point.y = (this.goal_point.y < this.target_obj.position.y) ? this.target_obj.position.y : this.goal_point.y; 

        // update camera positioon
        // TODO: use interpolation to smooth the movement
        this.cam.position.set(this.goal_point.x, this.goal_point.y, this.goal_point.z);

        // update camera rotation (point camera towards the target_obj)
        this.cam.lookAt(this.target_obj.position);
    }
}

export default PF_FollowCamera;