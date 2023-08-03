/**
 * @module libgptjs Graphical Programming with ThreeJS (GPT)
 * @class PF_ModelDrone
 */

import PF_Common from "./PF_Common"
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader"
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader";
import * as THREE from "three"

class PF_ModelDrone {
    /**
     * @param {Function} on_loaded_external_cb callback to be run when model fully loaded
     * @param {THREE.Scene} webgl_scene neede to attach / deattach properllers at runtime
     * @param {Array} waypoints list of waypoints (Vector3) to move the drone along
     */
    constructor(on_loaded_external_cb, webgl_scene, waypoints){
        this.on_loaded_external_cb = on_loaded_external_cb;
        this.scene = webgl_scene
        this.waypoints = waypoints

        this.drone_obj = undefined;
        this.fl = undefined; // front left
        this.fr = undefined; // front right
        this.rl = undefined; // rear left
        this.rr = undefined; // rear right

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

            this.setup_drone_and_propellers(obj_);
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

PF_ModelDrone.prototype.setup_drone_and_propellers = function (obj_) {
    // set up drone
    this.drone_obj = obj_;
    this.drone_obj.scale.set(PF_Common.DRONE_SCALE, PF_Common.DRONE_SCALE, PF_Common.DRONE_SCALE);
    this.drone_obj.position.set(this.waypoints[0].x, this.waypoints[0].y, this.waypoints[0].z);

    // get propellers Object3D
    this.fl = this.drone_obj.getObjectByName("mesh1326258638");
    this.fr = this.drone_obj.getObjectByName("mesh1301670615");
    this.rl = this.drone_obj.getObjectByName("mesh1083488708");
    this.rr = this.drone_obj.getObjectByName("mesh255131489");

    // attach propellers objects to scene
    this.scene.add(this.fl);
    this.scene.add(this.fr);
    this.scene.add(this.rl);
    this.scene.add(this.rr);

    // de-attach propellers from drone_object, so we can rotate them independently
    this.drone_obj.remove(this.fl);
    this.drone_obj.remove(this.fr);
    this.drone_obj.remove(this.rl);
    this.drone_obj.remove(this.rr);

    // set up propellers
    this.fl.scale.set(PF_Common.DRONE_SCALE, PF_Common.DRONE_SCALE, PF_Common.DRONE_SCALE);
    this.fr.scale.set(PF_Common.DRONE_SCALE, PF_Common.DRONE_SCALE, PF_Common.DRONE_SCALE);
    this.rl.scale.set(PF_Common.DRONE_SCALE, PF_Common.DRONE_SCALE, PF_Common.DRONE_SCALE);
    this.rr.scale.set(PF_Common.DRONE_SCALE, PF_Common.DRONE_SCALE, PF_Common.DRONE_SCALE);

    this.recenter_propellers();
};

/**
 * Models are added to scene at origin by default.
 * After deattach from parent the centers are displaced.
 * Translating the models to orign is not enough so we need to compute bb and center again * 
 */
PF_ModelDrone.prototype.recenter_propellers = function () {
    this.fl.geometry.computeBoundingBox();
    this.fl.geometry.center();
    this.fr.geometry.computeBoundingBox();
    this.fr.geometry.center();
    this.rl.geometry.computeBoundingBox();
    this.rl.geometry.center();
    this.rr.geometry.computeBoundingBox();
    this.rr.geometry.center();
}

/**
 * Spins propellers independently in origin and translates to drone motors
 * @param {*} ms 
 */
PF_ModelDrone.prototype.spin_propellers = function (ms) {
    // because it is undefined on_setup and it is loaded on runtime
    if (this.drone_obj !== undefined) {
        this.fl.rotation.y += PF_Common.DRONE_PROPELERS_ROT_CW;
        this.fr.rotation.y += PF_Common.DRONE_PROPELERS_ROT_CCW;
        this.rl.rotation.y += PF_Common.DRONE_PROPELERS_ROT_CCW;
        this.rr.rotation.y += PF_Common.DRONE_PROPELERS_ROT_CW;

        this.propellers_to_drone();
    }
};

/**
 * Translates the propellers to world coordinates of the motors of the drone
 * TODO: based on drone rotation compute final positions
 */
PF_ModelDrone.prototype.propellers_to_drone = function () {
    // front left
    this.fl.position.x = this.drone_obj.position.x - PF_Common.DRONE_PROPELLERS_DISPLACEMENT_XZ;
    this.fl.position.y = this.drone_obj.position.y + PF_Common.DRONE_PROPELLERS_DISPLACEMENT_Y;
    this.fl.position.z = this.drone_obj.position.z - PF_Common.DRONE_PROPELLERS_DISPLACEMENT_XZ;

    // front right
    this.fr.position.x = this.drone_obj.position.x + PF_Common.DRONE_PROPELLERS_DISPLACEMENT_XZ;
    this.fr.position.y = this.drone_obj.position.y + PF_Common.DRONE_PROPELLERS_DISPLACEMENT_Y;
    this.fr.position.z = this.drone_obj.position.z - PF_Common.DRONE_PROPELLERS_DISPLACEMENT_XZ;
    
    // rear left
    this.rl.position.x = this.drone_obj.position.x - PF_Common.DRONE_PROPELLERS_DISPLACEMENT_XZ;
    this.rl.position.y = this.drone_obj.position.y + PF_Common.DRONE_PROPELLERS_DISPLACEMENT_Y;
    this.rl.position.z = this.drone_obj.position.z + PF_Common.DRONE_PROPELLERS_DISPLACEMENT_XZ;

    // rear right
    this.rr.position.x = this.drone_obj.position.x + PF_Common.DRONE_PROPELLERS_DISPLACEMENT_XZ;
    this.rr.position.y = this.drone_obj.position.y + PF_Common.DRONE_PROPELLERS_DISPLACEMENT_Y;
    this.rr.position.z = this.drone_obj.position.z + PF_Common.DRONE_PROPELLERS_DISPLACEMENT_XZ;
}

PF_ModelDrone.prototype.move_drone = function () {
    if (this.drone_obj !== undefined) {
        this.drone_obj.position.x += 0.1;
        this.drone_obj.position.z -= 0.1;
    }
}

export default PF_ModelDrone