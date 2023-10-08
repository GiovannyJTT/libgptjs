/**
 * @module libgptjs Graphical Programming with ThreeJS (GPT)
 * @class PF_ModelUFO
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
    this.billboard_obj.scale.set(PF_Common.BILLBOARD_SCALE, PF_Common.BILLBOARD_SCALE, PF_Common.BILLBOARD_SCALE);
    
    // initially at origin, it will be moved to its position when first update()
    this.billboard_obj.position.set(0,0,0);

    const _bb = new THREE.Box3().setFromObject(this.billboard_obj);
    this.size = new THREE.Vector3();
    _bb.getSize(this.size);
    console.debug("PF_ModelBillboard: bounding box size: " + JSON.stringify(this.size));
}

/**
 * - per-frame update
 * - Places the billboard object at the waypoint-contry
 * - It displaces the object a bit so the drone will not hit into it
 * @param {Dictionary} wp Example: `{name: "VALENCIA", coords: {x: 1, y: 2}, date: "2017-March"}`
 */
PF_ModelBillboard.prototype.place_at_wp = function (wp) {
    if (undefined === this.billboard_obj){
        return;
    }

    this.billboard_obj.position.x = wp.coords.x;
    this.billboard_obj.position.y = (this.size.y / 2);
    // this model-center it is displaced, fixing it
    this.billboard_obj.position.y -= (this.size.y * 0.075)
    this.billboard_obj.position.z = wp.coords.y;

    // add disp
    // TODO: calculate displacement based on direction from previus wp-country
    this.billboard_obj.position.x -= this.size.x * 0.75;
    this.billboard_obj.position.z += this.size.z;
}

PF_ModelBillboard.prototype.face_to = function (lookat_pos) {
    if (undefined === this.billboard_obj){
        return;
    }
    const pos = new THREE.Vector3(lookat_pos.x, this.billboard_obj.position.y, lookat_pos.z);
    this.billboard_obj.lookAt(pos);
}


export default PF_ModelBillboard