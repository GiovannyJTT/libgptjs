/**
 * @module libgptjs Graphical Programming with ThreeJS (GPT)
 * @class PF_ModelBillboard
 */

import PF_Common from "./PF_Common";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader";
import * as THREE from "three";

class PF_ModelBillboard {
    /**
     * - Billboard panel where we show info (country, name, year) for each wp-country
     * - This single billboard will be moved to different locations and changed its contend based on drone position
     * - This billboard keeps facing towards the drone position
     */
    constructor (on_loaded_external_cb) {
        this.on_loaded_external_cb = on_loaded_external_cb;

        // start loading the model.obj
        this.load_mat();
    }
}

PF_ModelBillboard.prototype.load_mat = function () {
    // 1. materials first
    const _lm = new MTLLoader();

    _lm.load(
        PF_Common.BILLBOARD_MTL_PATH,

        function on_loaded (materials_) {
            materials_.preload();

            // 2. load .obj and attach materials
            this.load_obj(materials_);
        }.bind(this),

        function on_loading(xhr) {
            console.debug("Material loaded: " + (xhr.loaded / xhr.total * 100) + " %");
        },

        function on_error (err) {
            console.error(err);
        }
    );
}

PF_ModelBillboard.prototype.load_obj = function (mats_) {
    const _lo = new OBJLoader();

    _lo.setMaterials(mats_);

    _lo.load(
        PF_Common.BILLBOARD_OBJ_PATH,

        function on_loaded_sequence (obj_) {
            this.adapt_to_scene(obj_);
            this.calc_pos_per_wp_country();

            // 3. call external callback to add model to scene
            this.on_loaded_external_cb.call(this, this.billboard_obj);
        }.bind(this),

        function on_loading(xhr) {
            console.debug("Model loaded: " + (xhr.loaded / xhr.total * 100) + " %");
        },

        function on_error (err) {
            console.error(err);
        } 
    );
}

PF_ModelBillboard.prototype.adapt_to_scene = function (obj_) {
    this.billboard_obj = obj_;

    // recenter object
    for (let i=0; i < this.billboard_obj.children.length; i++) {
        let c = this.billboard_obj.children[i];
        c.geometry.computeBoundingBox();
        c.geometry.center();
    }

    this.billboard_obj.scale.set(PF_Common.BILLBOARD_SCALE, PF_Common.BILLBOARD_SCALE, PF_Common.BILLBOARD_SCALE);
    
    // initially at origin, it will be moved to its position when first update()
    this.billboard_obj.position.set(0, 0, 0);

    const _bb = new THREE.Box3().setFromObject(this.billboard_obj);
    this.size = new THREE.Vector3();
    _bb.getSize(this.size);
    console.debug("PF_ModelBillboard: bounding box size: " + JSON.stringify(this.size));
}

/**
 * - Calculates the position of the billboard-object in the middle between the previous and the current
 *  wp-country-coordinates and stores them into `this.pos_per_wp`
 * - Example of a segment formed by two waypoint-contry:
 * Example:
 * ```json
 * {
 *  wp_start: {name: "VALENCIA", coords: {x: -204.4, y: 366.6}, date: "2017-March", wp_index: 0},
 *  wp_end: {name: "HELSINKI", coords: {x: 343.3, y: -244.4}, date: "2019-March", wp_index: 1}
 * }
 * ```
 * - NOTE: It adds an artificial init-point at the beginning of the wp-list in order to
 *  place properly the first billboard for the first contry with a proper displacement to be focused by
 *  the follow-camera while landing:
 * ```json
 *  {name: "INIT", coords: {x: -900, y: 1200}, date: "0000-00-00", wp_index: -1}
 * @property {THREE.Vector3} this.size final size (bounding box) of the object after scaling
 * ```
 */
PF_ModelBillboard.prototype.calc_pos_per_wp_country = function () {
    if (PF_Common.FPATH_WPS.length == 0) {
        console.error("FPATH_WPS is empty");
        return;
    }

    let wps = PF_Common.FPATH_WPS;
    wps.unshift(
        {name: "INIT", coords: {x: -900, y: 1200}, date: "0000-00-00", wp_index: -1}
    );

    this.pos_per_wp = [];

    for (let i=1; i < wps.length; i++) {
        const wp_end = wps[i];
        const wp_start = wps[i-1];

        const end = new THREE.Vector3(wp_end.coords.x, 0, wp_end.coords.y);
        const start = new THREE.Vector3(wp_start.coords.x, 0, wp_start.coords.y);
        // displacement based on direction-vector to not overlap with drone

        const disp = new THREE.Vector3().copy(end)
            .sub(start).normalize().multiplyScalar(2.5 * this.size.z);

        const end_pos = new THREE.Vector3(
            end.x,
            this.size.y / 2,
            end.z
        );

        const final_pos = end_pos.sub(disp);
        this.pos_per_wp.push(final_pos);
    }
}

/**
 * - Places the BILLBOARD-object at a point between current and next waypoint-country in order to show
 * information on the panel while the drone is reaching the next target-waypoint
 * @param {Int} wp_index index of the waypoint-country where to place this object 
 */
PF_ModelBillboard.prototype.place_at_wp = function (wp_index) {
    if (undefined === this.billboard_obj){
        return;
    }

    const pos = this.pos_per_wp[wp_index];
    this.billboard_obj.position.set(pos.x, pos.y, pos.z);
}

PF_ModelBillboard.prototype.face_to = function (lookat_pos) {
    if (undefined === this.billboard_obj){
        return;
    }
    const pos = new THREE.Vector3(lookat_pos.x, this.billboard_obj.position.y, lookat_pos.z);
    this.billboard_obj.lookAt(pos);
}


export default PF_ModelBillboard