/**
 * @module libgptjs Graphical Programming with ThreeJS (GPT)
 * @class PF_ModelDrone
 */

import PF_Common from "./PF_Common"
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader"
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader";

class PF_ModelDrone {
    constructor(on_loaded_external_cb){
        this.on_loaded_external_cb = on_loaded_external_cb;
        this.drone_obj = undefined;
        this.load_mat();
    }
};

PF_ModelDrone.prototype.load_mat = function () {
    // 1. materials first
    const _lm = new MTLLoader();

    _lm.load(
        PF_Common.DRONE_MTL_PATH,

        function on_loaded_ok (materials_) {
            materials_.preload();
            
            // 2. load obj and attach materials
            this.load_obj(materials_);
        }.bind(this),

        function on_loading(xhr) {
            console.info("Material loaded: " + (xhr.loaded / xhr.total * 100) + " %");
        },

        function on_error (err) {
            console.error(err);
        }    
    );
};

PF_ModelDrone.prototype.load_obj = function (mats_) {
    const _lo = new OBJLoader();

    _lo.setMaterials(mats_);

    _lo.load(
        PF_Common.DRONE_OBJ_PATH,

        function on_load_ok_sequence (obj_) {
            this.drone_obj = obj_;
            this.on_loaded_external_cb.call(this, this.drone_obj);
        }.bind(this),

        function on_loading(xhr) {
            console.info("Model loaded: " + (xhr.loaded / xhr.total * 100) + " %");
        },

        function on_error (err) {
            console.error(err);
        }
    );
};

PF_ModelDrone.prototype.spin_propellers = function (ms) {
    // because it is undefined on_setup and it is loaded on runtime
    if (this.drone_obj !== undefined) {
        const _front_left = this.drone_obj.getObjectByName("mesh1326258638");
        const _front_right = this.drone_obj.getObjectByName("mesh1301670615");
        const _rear_left = this.drone_obj.getObjectByName("mesh1083488708");
        const _rear_right = this.drone_obj.getObjectByName("mesh255131489");
        const _propellers = [_front_left, _front_right, _rear_left, _rear_right]
        
        for (let i=0; i<_propellers.length; i++) {
            const p = _propellers[i];
            p.rotation.y += 0.174533;
        }
    }
};

PF_ModelDrone.prototype.spin_drone = function (ms) {
    // because it is undefined on_setup and it is loaded on runtime
    if (this.drone_obj !== undefined) {
        // 10 degrees (0.174533 rads) per frame
        this.drone_obj.rotation.y += 0.174533;
    }
};

export default PF_ModelDrone