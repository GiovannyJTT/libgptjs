/**
 * @module libgptjs Graphical Programming with ThreeJS (GPT)
 * @class PF_ModelUFO
 */

import PF_Common from "./PF_Common";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader";

class PF_ModelUFO {
    /**
     * A ufo 3D-model that keeps rotating on the sky
     */
    constructor (on_loaded_external_cb) {
        this.on_loaded_external_cb = on_loaded_external_cb;
        // start loading the model.obj
        this.load_mat();
    }
}

PF_ModelUFO.prototype.load_mat = function () {
    // 1. materials first
    const _lm = new MTLLoader();

    _lm.load(
        PF_Common.UFO_MTL_PATH,

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

PF_ModelUFO.prototype.load_obj = function (mats_) {
    const _lo = new OBJLoader();

    _lo.setMaterials(mats_);

    _lo.load(
        PF_Common.UFO_OBJ_PATH,

        function on_loaded_sequence (obj_) {
            this.adapt_to_scene(obj_);
            // 3. call external callback to add model to scene
            this.on_loaded_external_cb.call(this, this.ufo_obj);
        }.bind(this),

        function on_loading(xhr) {
            console.debug("Model loaded: " + (xhr.loaded / xhr.total * 100) + " %");
        },

        function on_error (err) {
            console.error(err);
        }
    );
}

PF_ModelUFO.prototype.adapt_to_scene = function (obj_) {
    this.ufo_obj = obj_;
    this.ufo_obj.scale.set(PF_Common.UFO_SCALE, PF_Common.UFO_SCALE, PF_Common.UFO_SCALE);
    this.ufo_obj.position.set(0, PF_Common.UFO_POS_Y_MIN, 0);
}

/**
 * per-frame update
 */
PF_ModelUFO.prototype.fly_on_sky = function (ms) {
    if(undefined === this.ufo_obj) {
        return;
    }
    this.ufo_obj.rotation.y += 0.0174533; // 1 deg
    this.ufo_obj.rotation.x = PF_Common.get_ufo_rot_x_pingpong(this.ufo_obj.rotation.x);
    this.ufo_obj.position.y = PF_Common.get_ufo_pos_y_pingpong(this.ufo_obj.position.y);
}

export default PF_ModelUFO;