/**
 * @module libgptjs Graphical Programming with ThreeJS (GPT)
 * @class `PF_ModelArcade` It gets spawn close the waypoint-country location based
 * on the current drone position. It faces always the camera so the user can read
 * properly its content.
 */

import PF_Common from "./PF_Common";
import {FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import * as THREE from "three";
import { lerp } from "three/src/math/MathUtils";
import PF_ModelDisplay from "./PF_ModelDisplay";

class PF_ModelArcade {
    /**
     * - Arcade model which shows pictures on the screen based on current wp-country
     * - This single object will be moved to different locations and changed its contend based on drone position
     * - This object keeps facing the camera
     */
    constructor (on_loaded_external_cb) {
        this.on_loaded_external_cb = on_loaded_external_cb;
        this.prev_lookat_pos = new THREE.Vector3(0,0,0);

        // start loading model.obj
        this.load_mat();
    }
}

PF_ModelArcade.prototype.load_mat = function () {
    const _l = new FBXLoader();
    _l.load(
        PF_Common.ARCADE_FBX_PATH,

        function on_loaded (obj_) {
            this.adapt_to_scene(obj_);
            this.calc_pos_per_wp_country();
            this.attach_light();
            this.attach_display();


            // call external callback to add model to scene
            this.on_loaded_external_cb.call(this, this.arcade_obj);
        }.bind(this),

        function on_loading(xhr) {
            console.debug("Model loaded: " + (xhr.loaded / xhr.total * 100) + " %");
        },

        function on_error (err) {
            console.error(err);
        } 
    );
}

PF_ModelArcade.prototype.adapt_to_scene = function (obj_) {
    this.arcade_obj = obj_;

    // recenter object
    for (let i=0; i < this.arcade_obj.children.length; i++) {
        let c = this.arcade_obj.children[i];
        c.geometry.computeBoundingBox();
        c.geometry.center();
    }

    this.arcade_obj.scale.set(PF_Common.ARCADE_SCALE, PF_Common.ARCADE_SCALE, PF_Common.ARCADE_SCALE);
    this.arcade_obj.position.set(0, 0, 0);

    const _bb = new THREE.Box3().setFromObject(this.arcade_obj);
    this.size = new THREE.Vector3();
    _bb.getSize(this.size);
    console.debug("PF_ModelArcade: bounding box size: " + JSON.stringify(this.size));

    // enable casting shadows on the floor
    this.arcade_obj.traverse(function(child){child.castShadow = true;});
}

/**
 * - For each wp-country: it calculates the position of the arcade-object close to the wp-country and stores them into `this.pos_per_wp`
 * - A displacement is added to make the arcade-screen to be focused by the follow-camera when the drone is landing
 * - The displacement-vector `(1.125, 0, -0.5)` is based on the curve-spline formed by the 3D-points that are close to the wp-country
 *  on the ground. (The 3D-points of this curve on-ground are set at `PF_ModelFlightPath.prototype.get_waypoints`)
 * @property {THREE.Vector3} this.size final size (bounding box) of the object after scaling
 */
PF_ModelArcade.prototype.calc_pos_per_wp_country = function () {
    this.pos_per_wp = [];
 
    for (let i=0; i < PF_Common.FPATH_WPS.length; i++) {
        const wp = PF_Common.FPATH_WPS[i];

        const pos_at_wp = new THREE.Vector3(
            wp.coords.x,
            this.size.y / 2,
            wp.coords.y
        );

        // displacement-vector to center the arcade-screen on the camera when drone is landing
        const disp = new THREE.Vector3(1.125, 0, -0.5).normalize()
            .multiplyScalar(PF_Common.ARCADE_DISPLACEMENT_TO_FOCUS_ON_CAM);

        const final_pos = pos_at_wp.add(disp);
        this.pos_per_wp.push(final_pos);
    }
}

PF_ModelArcade.prototype.attach_light = function () {
    const dist_screen = this.size.y * 0.5;
    // Point-Light close to the arcade-screen position. Point-Light: emits in all directions, 75% white light.
    const lp_screen = new THREE.PointLight(new THREE.Color(0xbfbfbf), 80, dist_screen, 2);
    // model-coords: (x, z, y)
    lp_screen.position.set(0, -this.size.y * 0.4, this.size.y * 0.8);
    // fixed attachment
    this.arcade_obj.add(lp_screen);

    // Point-Light close to the arcade-buttons position. Point-Light: emits in all directions, 75% white light.
    const dist_buttons = this.size.y * 0.375;
    const lp_buttons = new THREE.PointLight(new THREE.Color(0xbfbfbf), 100, dist_buttons, 2);
    // model-coords: (x, z, y)
    lp_buttons.position.set(-this.size.y * 0.25, -this.size.y * 1.25, -this.size.y * 0.625);
    // fixed attachment
    this.arcade_obj.add(lp_buttons);

}

PF_ModelArcade.prototype.attach_display = function () {
    this.m_display = new PF_ModelDisplay();
    this.arcade_obj.add(this.m_display.mesh);
}

/**
 * - Places the ARCADE-object close to the wp-country
 * @param {Int} wp_index index of the waypoint-country where to place this object 
 */
PF_ModelArcade.prototype.place_at_wp = function (wp_index) {
    if (undefined === this.arcade_obj){
        return;
    }

    const pos = this.pos_per_wp[wp_index];
    this.arcade_obj.position.set(pos.x, pos.y, pos.z);
}

PF_ModelArcade.prototype.face_to = function (lookat_pos) {
    if (undefined === this.arcade_obj) {
        return;
    }
    
    const pos = new THREE.Vector3(lookat_pos.x, this.arcade_obj.position.y, lookat_pos.z);

    const i_pos = new THREE.Vector3(
        lerp(this.prev_lookat_pos.x, pos.x, PF_Common.INTERPOLATION_FACTOR_FOR_60_FPS),
        lerp(this.prev_lookat_pos.y, pos.y, PF_Common.INTERPOLATION_FACTOR_FOR_60_FPS),
        lerp(this.prev_lookat_pos.z, pos.z, PF_Common.INTERPOLATION_FACTOR_FOR_60_FPS)
    );

    this.arcade_obj.lookAt(i_pos);
    this.prev_lookat_pos = i_pos;

    // fix rotation
    this.arcade_obj.rotateX(-Math.PI / 2);
}

export default PF_ModelArcade