/**
 * @module libgptjs Graphical Programming with ThreeJS (GPT)
 * @class PF_FolllowCamera
 */

import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

class PF_FollowCamera {
    /**
     * 
     */
    constructor () {
        this.velocity = 0;
        this.speed = 0;
        this.cam = undefined;
        this.cam_handler = undefined;
    }
};

PF_FollowCamera.prototype.config_cam = function () {
    this.cam = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
    this.cam.position.set(0, 275, -700); // consider we are working in mm
    this.cam.lookAt(new THREE.Vector3(0, 80, 0)); // looking at the origin
};

PF_FollowCamera.prototype.config_cam_handler = function (cam_, dom_element_) {
    // this.cam_handler = new Object();
    // this.cam_handler.update = function () {
    //     console.debug("PF_FollowCamera update");
    // }

    this.cam_handler = new OrbitControls(cam_, dom_element_);
    this.cam_handler.target.set(0, 100, 0);
    this.cam_handler.noKeys = true; // moving with keyboard not allowed
}

export default PF_FollowCamera;