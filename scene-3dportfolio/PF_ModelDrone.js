/**
 * @module libgptjs Graphical Programming with ThreeJS (GPT)
 * @class PF_ModelDrone
 */

import PF_Common from "./PF_Common"
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader"
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader";
import * as THREE from "three"
import { lerp } from "three/src/math/MathUtils";
import PF_MoveFSM from "./PF_MoveFSM";

class PF_ModelDrone {
    /**
     * @param {Function} on_loaded_external_cb callback to be run when model fully loaded
     * @param {THREE.Scene} webgl_scene neede to attach / deattach properllers at runtime
     * @param {Array[THREE.Vector3]} fpath_curve_points list of flight path points (Vector3)
     *  that form the curve to move the drone along
     * @private `this.drone_obj` will be retrieved at `setup_drone_and_propellers` after
     *  the drone-model is fully loaded
     */
    constructor(on_loaded_external_cb, webgl_scene, fpath_curve_points){
        this.on_loaded_external_cb = on_loaded_external_cb;
        this.scene = webgl_scene;
        this.fpath_curve = fpath_curve_points;

        this.drone_obj = undefined
        this.fl = undefined; // front left
        this.fr = undefined; // front right
        this.rl = undefined; // rear left
        this.rr = undefined; // rear right

        this.set_fsm();

        // start loading the model.obj
        this.load_mat();
    }
};

// METHODS FOR LOADING .OBJ AND SPIN PROPELLERS

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
            // 3. call external callback to add model to scene
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
 * @param {*} obj_ 
 */
PF_ModelDrone.prototype.setup_drone_and_propellers = function (obj_) {
    // set up drone
    this.drone_obj = obj_;
    this.drone_obj.scale.set(PF_Common.DRONE_SCALE, PF_Common.DRONE_SCALE, PF_Common.DRONE_SCALE);
    this.drone_obj.position.set(this.fpath_curve[this.i_target].x, this.fpath_curve[this.i_target].y, this.fpath_curve[this.i_target].z);

    // enable casting shadows on the floor
    this.drone_obj.traverse(function(child){child.castShadow = true;});

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
 * - The propellers will spin `Clockwise` or `CounterClockwise` depending on their position on the drone
 * - FrontLeft (CW), FrontRight (CCW), RearLeft (CCW), RearRight (CW)
 */
PF_ModelDrone.prototype.propellers_spin_LS = function () {
    const _spins = PF_Common.get_propellers_spin();

    // apply in local-space
    this.fl.rotateY(_spins["fl"]);
    this.fr.rotateY(_spins["fr"]);
    this.rl.rotateY(_spins["rl"]);
    this.rr.rotateY(_spins["rr"]);
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

// METHODS FOR DROVE MOVEMENT

/**
 * - Creates a drone move-state-machine
 * - Passes a list of callbacks to be triggered when input events are captured:
 * move-forward (ex: "ArrowUp"), move-backward (ex: "ArrowDown"), hovering (ex: "Space")
 * - `on_forward_to_backward`, `on_backward_to_forward`: it updates the `i_target`, `i_start` and `i_end` indices
 * in a way to reverse the segment-points. This avoids jumps into the position. The new move will start
 * from the curren position. It compensates the `remaining time` and sets timestamps that will be used to compute interpolation factor 
 * - `on_hovering_to_forward`, `on_hovering_to_backward`: these transitions set `i_start` and `i_end` to continue
 * the direction assuming `i_target` is not in the extremes.
 * - `on_forward_to_hovering`, `on_backward_to_hovering`: these transitions will be done by the internal
 * move-state-machine once the interpolation is completed
 */
PF_ModelDrone.prototype.set_fsm = function () {
    const _cbs = {};

    _cbs.on_hovering_to_forward = () => {
        this.update_indices_H_FW();
    };

    _cbs.on_hovering_to_backward = () => {
        this.update_indices_H_BW();
    };

    _cbs.on_forward_to_backward = () => {
        this.update_indices_FW_BW();
   };

    _cbs.on_backward_to_forward = () => {
        this.update_indices_BW_FW();
    };

    _cbs.on_forward_to_hovering = () => {
        // fsm changes to hovering when interpolation completed
        console.debug("on_forward_to_hovering");
    };

    _cbs.on_backward_to_hovering = () => {
        // fsm changes to hovering when interpolation completed
        console.debug("on_backward_to_hovering");
    };

    // NOTE: pass these methods to avoid changing state when `i_target` is on the extremes
    _cbs.target_is_first = this.target_is_first.bind(this);
    _cbs.target_is_last = this.target_is_last.bind(this);

    this.fsm = new PF_MoveFSM(_cbs);
    this.I_FIRST = 0;
    this.I_SECOND = 1;
    this.I_LAST = this.fpath_curve.length - 1;
    this.I_SECOND_LAST = this.fpath_curve.length - 2;
    
    // NOTE: spawning drone at i_target
    this.i_target = this.I_FIRST;
}

/**
 * - This method is called every frame
 * - Checks `drone_obj` exists (loading of model .obj has finished)
 * - Moves the drone_obj using interpolation between two points3D
 * depending on the direction (`forward`, `backwards`, `hovering`)
 * - When move direction is `hovering` it does nothing
 * - Checks update of the move-state-machine
 * - Depending on current move-state it will run methods to move fw / bw / hovering
 * @param {Float} ms milliseconds passed since last frame
 */
PF_ModelDrone.prototype.move_interpolated = function (ms) {
    if (this.drone_obj === undefined) {
        return false;
    }
    this.fsm.update_state();

    if (this.fsm.is_hovering()){
        this.fsm.scrollend_smooth_on_drone_hovering();
    }
    else if (this.fsm.is_forward()){
        if (!this.target_is_last()) {
            const i_fw = this.get_interpolation_FW();
            this.fsm.scrollup_page_on_drone_fw(this.i_target, i_fw);

            if (this.interpolation_completed(i_fw)) {
                this.fsm.trigger_go_hover();
                this.i_target++;
                console.debug("FW-Interpolation completed. Target: " + this.i_target);
            }
            else {
                this.move_to_forward_point_interpolated(i_fw);
                this.point_nose_to_forward_point_interpolated(i_fw);
            }
        }
    }
    else if (this.fsm.is_backward()){
        if (!this.target_is_first()) {
            const i_bw = this.get_interpolation_BW();
            this.fsm.scrolldown_page_on_drone_bw(this.i_target, i_bw);

            if (this.interpolation_completed(i_bw)) {
                this.fsm.trigger_go_hover();
                this.i_target--;
                console.debug("BW-Interpolation completed. Target: " + this.i_target);
            }
            else {
                this.move_to_backward_point_interpolated(i_bw);
                this.point_nose_to_backward_point_interpolated(i_bw);
            }
        }
    }
}

PF_ModelDrone.prototype.update_indices_H_FW = function () {
    this.i_start = this.i_target;
    this.i_end = this.i_start + 1;
    this.i_lookat_start = this.i_end;
    this.i_lookat_end = this.i_lookat_start + 1;

    // clamp
    this.i_end = Math.min(this.i_end, this.I_LAST);
    this.i_lookat_start = Math.min(this.i_lookat_start, this.I_SECOND_LAST);
    this.i_lookat_end = Math.min(this.i_lookat_end, this.I_LAST);

    // update time stamp
    this.prevTS_forward = performance.now();

    console.debug("target: " + this.i_target +  ", start: " + this.i_start + ", end: " + this.i_end
        + ", look_start: " + this.i_lookat_start + ", look_end: " + this.i_lookat_end
        + ", TS_fw: " + this.prevTS_forward);
}

PF_ModelDrone.prototype.update_indices_H_BW = function () {
    this.i_start = this.i_target;
    this.i_end = this.i_start - 1;
    this.i_lookat_start = this.i_end;
    this.i_lookat_end = this.i_lookat_start - 1;

    // clamp
    this.i_end = Math.max(this.i_end, this.I_FIRST);
    this.i_lookat_start = Math.max(this.i_lookat_start, this.I_SECOND);
    this.i_lookat_end = Math.max(this.i_lookat_end, this.I_FIRST);

    // update time stamp
    this.prevTS_backward = performance.now();

    console.debug("target: " + this.i_target + ", start: " + this.i_start +  ", end: " + this.i_end
        + ", look_start: " + this.i_lookat_start + ", look_end: " + this.i_lookat_end
        + ", TS_bw: " + this.prevTS_backward);
}

PF_ModelDrone.prototype.update_indices_FW_BW = function () {
    // reverse segment-points
    this.i_target = this.i_target + 1;
    
    this.i_start = this.i_target;
    this.i_end = this.i_start - 1;
    console.debug("Reversed segment-points");

    this.i_lookat_start = this.i_end;
    this.i_lookat_end = this.i_lookat_start - 1;

    // clamp
    this.i_end = Math.max(this.i_end, this.I_FIRST);
    this.i_lookat_start = Math.max(this.i_lookat_start, this.I_SECOND);
    this.i_lookat_end = Math.max(this.i_lookat_end, this.I_FIRST);

    // update time stamp
    const remain = PF_Common.get_segment_duration() - this.elapsed_fw;
    this.prevTS_backward = performance.now() - remain;
    console.debug("Compensated remaining time");

    console.debug("target: " + this.i_target + ", start: " + this.i_start +  ", end: " + this.i_end
        + ", look_start: " + this.i_lookat_start + ", look_end: " + this.i_lookat_end
        + ", TS_bw: " + this.prevTS_backward);
}

PF_ModelDrone.prototype.update_indices_BW_FW = function () {    
    // reverse segment-points
    this.i_target = this.i_target - 1;

    this.i_start = this.i_target;
    this.i_end = this.i_start + 1;
    console.debug("Reversed segment-points");

    this.i_lookat_start = this.i_end;
    this.i_lookat_end = this.i_lookat_start + 1;

    // clamp
    this.i_end = Math.min(this.i_end, this.I_LAST);
    this.i_lookat_start = Math.min(this.i_lookat_start, this.I_SECOND_LAST);
    this.i_lookat_end = Math.min(this.i_lookat_end, this.I_LAST);

    // update time stamp
    const remain = PF_Common.get_segment_duration() - this.elapsed_bw;
    this.prevTS_forward = performance.now() - remain;
    console.debug("Compensated remaining time");

    console.debug("target: " + this.i_target +  ", start: " + this.i_start + ", end: " + this.i_end
        + ", look_start: " + this.i_lookat_start + ", look_end: " + this.i_lookat_end
        + ", TS_fw: " + this.prevTS_forward);
}

PF_ModelDrone.prototype.target_is_first = function () {
    return this.i_target == this.I_FIRST;
}

PF_ModelDrone.prototype.target_is_last = function () {
    return this.i_target == this.I_LAST;
}

/**
 * @returns {Float} Interpolation factor `[0, 1]` (current part of the interval / segement based on elapsed time)
 */
PF_ModelDrone.prototype.get_interpolation_FW = function () {
    this.elapsed_fw = performance.now() - this.prevTS_forward;
    const _i = this.elapsed_fw / PF_Common.get_segment_duration();
    return Math.min(_i, 1.0);
}

/**
 * @returns {Float} Interpolation factor `[0, 1]` (current part of the interval / segement based on elapsed time)
 */
PF_ModelDrone.prototype.get_interpolation_BW = function () {
    this.elapsed_bw = performance.now() - this.prevTS_backward;
    const _i = this.elapsed_bw / PF_Common.get_segment_duration();
    return Math.min(_i, 1.0);
}

PF_ModelDrone.prototype.interpolation_completed = function (i_) {
    return i_ >= 1.0;
}

/**
 * - Moves the drone to a point between `i_start` and `i_end` depending on the received `i_fw` factor
 * @property {THREE.Vector3} `i_start` and `i_end` are set outside, when a event of movement (FW, BW, H) is captured
 * @param {Flaot} i_fw Interpolation factor `[0, 1]` (current part of the interval / segement based on elapsed time)
 */
PF_ModelDrone.prototype.move_to_forward_point_interpolated = function (i_fw) {
    // current point3D
    const _p = this.fpath_curve[this.i_start];
    // next point3D
    const _p_next = this.fpath_curve[this.i_end];
    // interpolate coordinates between current and next point
    const _ip_x = lerp(_p.x, _p_next.x, i_fw);
    const _ip_y = lerp(_p.y, _p_next.y, i_fw);
    const _ip_z = lerp(_p.z, _p_next.z, i_fw);
    // apply
    this.drone_obj.position.set(_ip_x, _ip_y, _ip_z);
}

/**
 * - Applies a rotation to the drone in order to make it `lookAt` an interpolated position between two points3D
 * (the next and second next spline-curve points)
 * - Pointing towards an interpolated point makes the rotation smoother
 * - Note: when two points3D of the spline curve are vertically aligned, the`THREE.Object3D.lookAt()` can keep
 * flipping the object suddenly because of gimbal-lock.
 * @param {Flaot} i_fw Interpolation factor `[0, 1]` (current part of the interval / segement based on elapsed time)
 * @property {THREE.Vector3} `i_lookat_start` and `i_lookat_end` are set outside to define the next-segment. The drone will
 * be looking-at an interpolated point into the next-segment
 * @returns {boolean} true when rotated properly, false otherwise
 */
PF_ModelDrone.prototype.point_nose_to_forward_point_interpolated = function (i_fw) {
    // start_point (current target point)
    const _tp = this.fpath_curve[this.i_lookat_start];
    // end_point (next target point)
    const _tp_next = this.fpath_curve[this.i_lookat_end];
    // lookAt_point (interpolated point between current and next target point based on time elapsed)
    const _la_x = lerp(_tp.x, _tp_next.x, i_fw);
    const _la_y = lerp(_tp.y, _tp_next.y, i_fw);
    const _la_z = lerp(_tp.z, _tp_next.z, i_fw);
    // apply rotation to point drone-nose to target-point
    this.drone_obj.lookAt(_la_x, _la_y, _la_z);
    // fix rotation
    this.drone_obj.rotateY(Math.PI);
}

/**
 * - Moves the drone to the previous point using interpolation between current and previous in the curve
 * @param {Flaot} i_bw Interpolation factor `[0, 1]` (current part of the interval / segement based on elapsed time)
 * @returns {boolean} true when moved properly, false otherwise
 */
PF_ModelDrone.prototype.move_to_backward_point_interpolated = function (i_bw) {
    // current point3D
    const _p = this.fpath_curve[this.i_start];
    // prev point3D
    const _p_prev = this.fpath_curve[this.i_end];
    // interpolate coordinates between current and prev point
    const _ip_x = lerp(_p.x, _p_prev.x, i_bw);
    const _ip_y = lerp(_p.y, _p_prev.y, i_bw);
    const _ip_z = lerp(_p.z, _p_prev.z, i_bw);
    // apply
    this.drone_obj.position.set(_ip_x, _ip_y, _ip_z);
}

/**
 * - Updates the rotation of the drone to align with the direction is going
 * - NOTE: It will not rotate around its axis, hence simulates reverse move as a car
 * @param {Flaot} i_bw Interpolation factor `[0, 1]` (current part of the interval / segement based on elapsed time)
 * @property {THREE.Vector3} `i_lookat_start` and `i_lookat_end` are set outside to define the next-segment. The drone will
 * be looking-at an interpolated point into the next-segment
 * @returns {boolean} true when rotated properly, false otherwise
 */
PF_ModelDrone.prototype.point_nose_to_backward_point_interpolated = function (i_bw) {
    // start_point (current target point)
    const _tp = this.fpath_curve[this.i_lookat_start];
    // end_point (prev target point)
    const _tp_prev = this.fpath_curve[this.i_lookat_end];
    const _la_x = lerp(_tp.x, _tp_prev.x, i_bw);
    const _la_y = lerp(_tp.y, _tp_prev.y, i_bw);
    const _la_z = lerp(_tp.z, _tp_prev.z, i_bw);
    // apply rotation to point drone-nose to target-point
    this.drone_obj.lookAt(_la_x, _la_y, _la_z);
    // NOTE: not fixing the rotation so it will not rotate around its axis, hence simulates reverse move as a car
    // this.drone_obj.rotateY(Math.PI);
}

/**
 * Artificial drone shaking on X axis
 * @param {*} ms 
 */
PF_ModelDrone.prototype.animate_shaking = function (ms) {
    if (this.drone_obj === undefined) {
        return false;
    }
    this.drone_obj.rotation.x = PF_Common.get_ufo_rot_x_pingpong(this.drone_obj.rotation.x);
}

export default PF_ModelDrone