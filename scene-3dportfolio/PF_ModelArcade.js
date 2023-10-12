/**
 * @module libgptjs Graphical Programming with ThreeJS (GPT)
 * @class PF_ModelArcadeScreen
 */

import PF_Common from "./PF_Common";
import {FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import * as THREE from "three";

class PF_ModelArcade {
    /**
     * - Arcade model which shows pictures on the screen based on current wp-country
     * - This single object will be moved to different locations and changed its contend based on drone position
     * - This object keeps facing the camera
     */
    constructor (on_loaded_external_cb) {
        this.on_loaded_external_cb = on_loaded_external_cb;

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
 * - Places the ARCADE-object close to the wp-country and displacement a bit in order to be
 *  focused by the follow-camera when the drone is landing
 *      - The displacement-vector `(1.125, 0, -0.5)` is based on the curve-spline formed by two 3D-points on the ground
 *  that touch the wp-country. (The 3D-points of this curve-on-ground are set at `PF_ModelFlightPath.prototype.get_waypoints`)
 * - This object shows information (pictures) on its screen and the user can swipe forward or backwards with 2 buttons
 * - This object keeps facing the camera
 * @param {Dictionary} wp_segment Example:
 * ```json
 * {
 *  wp_start: {name: "VALENCIA", coords: {x: -204.4, y: 366.6}, date: "2017-March", wp_index: 0},
 *  wp_end: {name: "HELSINKI", coords: {x: 343.3, y: -244.4}, date: "2019-March", wp_index: 1}
 * }
 * ```
 */
PF_ModelArcade.prototype.place_at_wp = function (wp_segment) {
    if (undefined === this.arcade_obj){
        return;
    }

    const end_pos = new THREE.Vector3(
        wp_segment.wp_end.coords.x,
        this.size.y / 2,
        wp_segment.wp_end.coords.y
    );

    // displacement-vector to center the screen on the camera when drone is landing
    const disp = new THREE.Vector3(1.125, 0, -0.5).normalize()
        .multiplyScalar(PF_Common.ARCADE_DISPLACEMENT_TO_FOCUS_ON_CAM);

    // update pos
    const final_pos = end_pos.add(disp);
    this.arcade_obj.position.set(final_pos.x, final_pos.y, final_pos.z);
}

PF_ModelArcade.prototype.face_to = function (lookat_pos) {
    if (undefined === this.arcade_obj) {
        return;
    }
    const pos = new THREE.Vector3(lookat_pos.x, this.arcade_obj.position.y, lookat_pos.z);
    this.arcade_obj.lookAt(pos);
    // fix rotation
    this.arcade_obj.rotateX(-Math.PI / 2);
}

export default PF_ModelArcade