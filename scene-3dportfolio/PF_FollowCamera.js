/**
 * @module libgptjs Graphical Programming with ThreeJS (GPT)
 * @class PF_FolllowCamera
 */

import * as THREE from "three"
import { lerp } from "three/src/math/MathUtils";
import PF_Common from "./PF_Common";

class PF_FollowCamera {
    /**
     * Creates a follow camera that will follow and point towards the direction of the `target` (commonly moving drone object)
     * @property {THREE.Object3D} `target_obj` object to be followed. It will be set at `set_target()` once the model is fully loaded
     * @property {THREE.Camera} `cam` camera that will be moved
     * @property {PF_FollowCamera} `cam_handler` Object that will control the movement of the camera
     * @property {THREE.Vector3} `goal_point` position where the camera has to move in order follow the `target_obj`, pointing in the same `direction`
     * taking into accoun the current rotation of the target_obj and keep the `radial_dist`
     * @property {Float} `PF_Common.FOLLOW_CAM_RADIAL_DISTANCE` (default 150) distance to keep between camera and target_obj
     * @property {Float} `PF_Common.FOLLOW_CAM_INTERPOLATION_FACTOR` (default 0.05) interpolation factor in range `[0.0, 1.0]` to update the camera-position every frame.
     * The `update()` method of this class is commonly calle at 60 fps, so the value of `FOLLOW_CAM_INTERPOLATION_FACTOR` is to make the camera to rotate smoothly
     */
    constructor () {
        this.target_obj = undefined;
        this.cam = undefined;
        this.cam_handler = undefined;        
        this.goal_point = new THREE.Vector3();
    }
};

/**
 * Creates and cofigures a perspective camera. It will be called at GPT_Renderer.
 */
PF_FollowCamera.prototype.config_cam = function () {
    this.cam = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
    this.cam.position.set(0, 0, 1); // consider we are working in mm
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

/**
 * 1. Calculates the `point-behind` the `target_obj` in the Z axis (in local-space)
 * 2. Rotates the `point-behind` to align with the current rotation of the `target_obj` (in local-space)
 * 3. Calculates `this.goal_point` by translating the `point-behind` to the `target_obj` coordinates in world-space
 * 4. Sets camera position as `this.goal_point` (`point-behind`) (interpolated)
 * 5. Rotates camera to point towards the current position of `target_obj`
 */
PF_FollowCamera.prototype.update = function () {
    if (undefined !== this.target_obj) {        

        const _behind = new THREE.Vector3(0.5, 0, 1)
            .multiplyScalar(PF_Common.FOLLOW_CAM_RADIAL_DISTANCE) // 1.
            .applyEuler(this.target_obj.rotation) // 2.

        this.goal_point = new THREE.Vector3().copy(this.target_obj.position)
            .add(_behind); // 3.

        // 4. update camera position (inerpolated)
        const _ix = lerp(this.cam.position.x, this.goal_point.x, PF_Common.FOLLOW_CAM_INTERPOLATION_FACTOR);
        const _iy = lerp(this.cam.position.y, this.goal_point.y, PF_Common.FOLLOW_CAM_INTERPOLATION_FACTOR);
        const _iz = lerp(this.cam.position.z, this.goal_point.z, PF_Common.FOLLOW_CAM_INTERPOLATION_FACTOR);
        this.cam.position.set(_ix, _iy, _iz);

        // 5. update camera rotation
        this.cam.lookAt(this.target_obj.position); 
    }
}

export default PF_FollowCamera;