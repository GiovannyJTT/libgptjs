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
            console.debug("Material loaded: " + (xhr.loaded / xhr.total * 100) + " %");
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
            console.debug("Model loaded: " + (xhr.loaded / xhr.total * 100) + " %");
        },

        function on_error (err) {
            console.error(err);
        }
    );
};

/**
 * 1. Identifies the Object3D of the 4 propellers by their name: `mesh1326258638`, `mesh1301670615`, `mesh1083488708`, `mesh255131489`]
 * 2. Attaches those propellers-Object3D to Webgl.Scene (so it doesn't dissappear from rendering)
 * 3. Deattaches the propellers-Object3D from the parent drone-Object3D
 * 4. Applies same scale as drone-Object3D
 * 5. Recomputes center of the object3D
 * 6. Initializes values for spinning propellers
 * @param {*} obj_ 
 */
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
    console.debug("Deattached propellers models from drone object3D");

    // set up propellers
    this.fl.scale.set(PF_Common.DRONE_SCALE, PF_Common.DRONE_SCALE, PF_Common.DRONE_SCALE);
    this.fr.scale.set(PF_Common.DRONE_SCALE, PF_Common.DRONE_SCALE, PF_Common.DRONE_SCALE);
    this.rl.scale.set(PF_Common.DRONE_SCALE, PF_Common.DRONE_SCALE, PF_Common.DRONE_SCALE);
    this.rr.scale.set(PF_Common.DRONE_SCALE, PF_Common.DRONE_SCALE, PF_Common.DRONE_SCALE);
    this.recenter_propellers();

    // initial values
    this.fl_y_acc = 0.0;
    this.fr_y_acc = 0.0;
    this.rl_y_acc = 0.0;
    this.rr_y_acc = 0.0;
};

/**
 * Models are added to scene at origin by default
 * - After deattach from parent the centers are displaced
 * - Translating the models to orign is not enough, so we need to compute bb and center again them 
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
 * Spins propellers independently in their local-space (LS) and
 *  translates them onto the drone motors (in world-space coordinates) taking into account the current drone rotation
 * 1. Aligns propellers rotation with drone rotation in local-space at origin (0,0,0)
 * 2. Spins propellers in their Y axis in local-space
 * 3. Translates the propellers to put them on top of each one of the 4 motors in local-space
 * 4. Calculates new position of the propellers when the drone is rotating
 * 5. Translates the propellers from local-space to drone-coords in world-space
 * @param {*} ms milliseconds passed since last frame
 */
PF_ModelDrone.prototype.spin_propellers = function (ms) {
    // because it is undefined on_setup and it is loaded on runtime
    if (this.drone_obj !== undefined) {
        this.propellers_rot_aligned_with_drone_rotation_LS();
        this.propellers_spin_LS();
        this.propellers_to_motors_LS();
        this.propelleres_pos_aligned_with_drone_rotation_LS();
        this.propellers_to_drone_WS();
    }
};

PF_ModelDrone.prototype.propellers_rot_aligned_with_drone_rotation_LS = function () {
    this.fl.rotation.x = this.drone_obj.rotation.x;
    this.fl.rotation.y = this.drone_obj.rotation.y;
    this.fl.rotation.z = this.drone_obj.rotation.z;

    this.fr.rotation.x = this.drone_obj.rotation.x;
    this.fr.rotation.y = this.drone_obj.rotation.y;
    this.fr.rotation.z = this.drone_obj.rotation.z;

    this.rl.rotation.x = this.drone_obj.rotation.x;
    this.rl.rotation.y = this.drone_obj.rotation.y;
    this.rl.rotation.z = this.drone_obj.rotation.z;

    this.rr.rotation.x = this.drone_obj.rotation.x;
    this.rr.rotation.y = this.drone_obj.rotation.y;
    this.rr.rotation.z = this.drone_obj.rotation.z;
}

/**
 * Spins the propellers in their vertical axis (Y) in their local-space
 * - The propellers will spin Clockwise or CounterClockwise depending on their configuration
 * - FrontLeft (CW), FrontRight (CCW), RearLeft (CCW), RearRight (CW)
 */
PF_ModelDrone.prototype.propellers_spin_LS = function () {
    // accumulate
    this.fl_y_acc += PF_Common.DRONE_PROPELERS_ROT_CW;
    this.fr_y_acc += PF_Common.DRONE_PROPELERS_ROT_CCW;
    this.rl_y_acc += PF_Common.DRONE_PROPELERS_ROT_CCW;
    this.rr_y_acc += PF_Common.DRONE_PROPELERS_ROT_CW;

    // clamp
    this.fl_y_acc = (this.fl_y_acc >= 2*Math.PI || this.fl_y_acc <= -2*Math.PI)? 0.0 : this.fl_y_acc;
    this.fr_y_acc = (this.fr_y_acc >= 2*Math.PI || this.fr_y_acc <= -2*Math.PI)? 0.0 : this.fr_y_acc;
    this.rl_rot_acc = (this.rl_rot_acc >= 2*Math.PI || this.rl_y_acc <= -2*Math.PI)? 0.0 : this.rl_rot_acc;
    this.rr_y_acc = (this.rr_y_acc >= 2*Math.PI || this.rr_y_acc <= -2*Math.PI)? 0.0 : this.rr_y_acc;

    // apply (localaxis)
    this.fl.rotateY(this.fl_y_acc);
    this.fr.rotateY(this.fr_y_acc);
    this.rl.rotateY(this.rl_y_acc);
    this.rr.rotateY(this.rr_y_acc);
}

/**
 * Translates / Displaces the propelers to their positions on top of the motors in local-space
 */
PF_ModelDrone.prototype.propellers_to_motors_LS = function () {
    // front left
    this.fl.position.x = -PF_Common.DRONE_PROPELLERS_DISPLACEMENT_XZ;
    this.fl.position.y = PF_Common.DRONE_PROPELLERS_DISPLACEMENT_Y;
    this.fl.position.z = -PF_Common.DRONE_PROPELLERS_DISPLACEMENT_XZ;

    // front right
    this.fr.position.x = PF_Common.DRONE_PROPELLERS_DISPLACEMENT_XZ;
    this.fr.position.y = PF_Common.DRONE_PROPELLERS_DISPLACEMENT_Y;
    this.fr.position.z = -PF_Common.DRONE_PROPELLERS_DISPLACEMENT_XZ;
    
    // rear left
    this.rl.position.x = -PF_Common.DRONE_PROPELLERS_DISPLACEMENT_XZ;
    this.rl.position.y = PF_Common.DRONE_PROPELLERS_DISPLACEMENT_Y;
    this.rl.position.z = PF_Common.DRONE_PROPELLERS_DISPLACEMENT_XZ;

    // rear right
    this.rr.position.x = PF_Common.DRONE_PROPELLERS_DISPLACEMENT_XZ;
    this.rr.position.y = PF_Common.DRONE_PROPELLERS_DISPLACEMENT_Y;
    this.rr.position.z = PF_Common.DRONE_PROPELLERS_DISPLACEMENT_XZ;
}

/**
 * Rotates the propellers around the drone in local-space (LS) in order to
 *  1. Keep them on top of the motors when the drone is rotating on any of its axis
 */
PF_ModelDrone.prototype.propelleres_pos_aligned_with_drone_rotation_LS = function () {
    // front left position after rotation
    const fl_r = new THREE.Vector3().copy(this.fl.position)
        .applyEuler(this.drone_obj.rotation);
    this.fl.position.set(fl_r.x, fl_r.y, fl_r.z);

    // front right position after rotation
    const fr_r = new THREE.Vector3().copy(this.fr.position)
        .applyEuler(this.drone_obj.rotation);
    this.fr.position.set(fr_r.x, fr_r.y, fr_r.z);

    // rear left position after rotation
    const rl_r = new THREE.Vector3().copy(this.rl.position)
        .applyEuler(this.drone_obj.rotation);
    this.rl.position.set(rl_r.x, rl_r.y, rl_r.z);

    // rear right position after rotation
    const rr_r = new THREE.Vector3().copy(this.rr.position)
        .applyEuler(this.drone_obj.rotation);
    this.rr.position.set(rr_r.x, rr_r.y, rr_r.z);
}

/**
 * Translates the propellers to World-Space coordinates of the drone position
 */
PF_ModelDrone.prototype.propellers_to_drone_WS = function () {
    // front left
    this.fl.position.x += this.drone_obj.position.x;
    this.fl.position.y += this.drone_obj.position.y;
    this.fl.position.z += this.drone_obj.position.z;

    // front right
    this.fr.position.x += this.drone_obj.position.x;
    this.fr.position.y += this.drone_obj.position.y;
    this.fr.position.z += this.drone_obj.position.z;

    // rear left+
    this.rl.position.x += this.drone_obj.position.x;
    this.rl.position.y += this.drone_obj.position.y;
    this.rl.position.z += this.drone_obj.position.z;
    
    // rear right+
    this.rr.position.x += this.drone_obj.position.x;
    this.rr.position.y += this.drone_obj.position.y;
    this.rr.position.z += this.drone_obj.position.z
}

PF_ModelDrone.prototype.move_drone = function () {
    if (this.drone_obj !== undefined) {
        this.drone_obj.position.x += 0.25;
        this.drone_obj.position.z -= 0.25;

        this.drone_obj.rotation.y = PF_Common.get_drone_rot_y(this.drone_obj.rotation.y);
        this.drone_obj.rotation.z = this.drone_obj.rotation.y / 2.0;
    }
}

export default PF_ModelDrone