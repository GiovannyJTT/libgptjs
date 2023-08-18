/**
 * @module libgptjs Graphical Programming with ThreeJS (GPT)
 * @class PF_ModelDrone
 */

import PF_Common from "./PF_Common"
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader"
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader";
import * as THREE from "three"
import { lerp } from "three/src/math/MathUtils";

/**
 * States that the "drone movement" can have.
 * Object.freeze makes Enum objects to be immutable.
 * Symbol makes objects Enum objecst to be unique.
 */
const PF_MoveDrone = Object.freeze(
    {
        // Flying and stying at the same position (propellers rotating)
        HOVERING: Symbol("hovering"),

        // Moving fordward to the next point (pointing drone-nose to it)
        FORWARD: Symbol("loading_bullet"),

        // Moving backward to the previous point (pointing drone-back to it, not nose)
        BACKWARD: Symbol("bullet_traveling"),
    }
);

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

        this.init_move();
        this.load_mat();
    }
};

/**
 * - Initilizes drone move direction
 * - Installs callbacks for events of move-forward (ex: "ArrowUp"), move-backward (ex: "ArrowDown"),
 * hovering (ex: "Space")
 * - Transition: `Forward -> Backward` or `Backward -> Forward`: it updates the `prevTS` timestamps and the `this.fp_index`
 * to avoid jumps into the position
 * - Transition: `Forward -> Hovering` or `Backward -> Hovering`: it saves the reimaining time and the move-direction it was using
 * - Transition: `Hovering -> Forward` or `Hovering -> Backward`: it will used the saved values to compute new timestamps properly
 * - TODO: use vertical scroller events
 */
PF_ModelDrone.prototype.init_move = function () {
    this.fp_index = 0;
    this.move_dir = PF_MoveDrone.HOVERING;
    this.elapsed_forward = undefined;
    this.elapsed_backward = undefined;
    this.remain_forward = undefined;
    this.remain_backward = undefined;

    document.addEventListener("keydown",
        function (event_) {
            switch(event_.code) {
                case "ArrowUp":
                    // direction changed
                    if (PF_MoveDrone.BACKWARD == this.move_dir) {
                        this.remain_backward = PF_Common.FPATH_STEP_DURATION_MS - this.elapsed_backward;
                        this.prevTS_forward = performance.now() - this.remain_backward;
                        // update index to reverse direction
                        this.fp_index -= 1;
                    }
                    this.move_dir = PF_MoveDrone.FORWARD;
                    break;
                case "ArrowDown":
                    // direction changed
                    if (PF_MoveDrone.FORWARD == this.move_dir) {
                        this.remain_forward = PF_Common.FPATH_STEP_DURATION_MS - this.elapsed_forward;
                        this.prevTS_backward = performance.now() - this.remain_forward;
                        // update index to reverse direction
                        this.fp_index += 1;
                    }
                    this.move_dir = PF_MoveDrone.BACKWARD;
                    break;
                case "Space":
                    this.move_dir = PF_MoveDrone.HOVERING;
                    break;
            }
        }.bind(this)
    );
}

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
 * @param {*} obj_ 
 */
PF_ModelDrone.prototype.setup_drone_and_propellers = function (obj_) {
    // set up drone
    this.drone_obj = obj_;
    this.drone_obj.scale.set(PF_Common.DRONE_SCALE, PF_Common.DRONE_SCALE, PF_Common.DRONE_SCALE);
    this.drone_obj.position.set(this.fpath_curve[0].x, this.fpath_curve[0].y, this.fpath_curve[0].z);

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

PF_ModelDrone.prototype.move_to_forward_point_interpolated = function (ms) {
    if (this.drone_obj === undefined) {
        return false;
    }
         
    const _last_index = this.fpath_curve.length - 1;
    if (this.fp_index >= _last_index) {
        return false;
    }

    const _nowTS = performance.now();
    this.elapsed_forward = _nowTS - this.prevTS_forward;
    
    if (this.elapsed_forward < PF_Common.FPATH_STEP_DURATION_MS) {        
        // interpolation factor (current part of the interval based on elapsed time)
        const _i = this.elapsed_forward / PF_Common.FPATH_STEP_DURATION_MS;
        // current point3D
        const _p = this.fpath_curve[this.fp_index];
        // next point3D
        const _p_next = this.fpath_curve[this.fp_index + 1];
        // interpolate coordinates between current and next point
        const _ip_x = lerp(_p.x, _p_next.x, _i);
        const _ip_y = lerp(_p.y, _p_next.y, _i);
        const _ip_z = lerp(_p.z, _p_next.z, _i);

        // apply
        this.drone_obj.position.set(_ip_x, _ip_y, _ip_z);
        return true;
    }
    else {
        this.fp_index++;
        this.prevTS_forward = performance.now();
        return false;
    }
}

/**
 * - WARNING: Run this function after `move_to_next_point_interpolated()` to update `timestamps` and `this.fp_index`
 * (those values are used in here)
 * - Applies a rotation to the drone in order to make it `lookAt` an interpolated position between 2 points3D
 * (the next and second next spline curve points)
 * - Pointing towards an interpolated point makes the rotation smoother
 * - Note: when two points3D of the spline curve are vertically aligned, the`THREE.Object3D.lookAt()` can keep
 * flipping the object suddenly because of gimbal-lock.
 * @property {THREE.Vector3} `_lookAt_index` will be computed every frame as `this.fp_index + 1`
 * @property {THREE.Vector3} `this.fp_index` is set outside at `move_to_next_point_interpolated()`
 * @returns {boolean} true when rotated properly, false otherwise
 */
PF_ModelDrone.prototype.point_nose_to_forward_point_interpolated = function (ms) {
    if (this.drone_obj === undefined) {
        return false;
    }
    
    const _lookAt_index = this.fp_index + 1;
    const _last_index = this.fpath_curve.length - 1;
    if (_lookAt_index >= _last_index) {
        return false;
    }

    const _nowTS = performance.now();
    this.elapsed_forward = _nowTS - this.prevTS_forward;

    if (this.elapsed_forward < PF_Common.FPATH_STEP_DURATION_MS) {
        // start_point (current target point)
        const _tp = this.fpath_curve[_lookAt_index];
        // end_point (next target point)
        const _tp_next = this.fpath_curve[_lookAt_index + 1];
        // lookAt_point (interpolated point between current and next target point based on time elapsed)
        const _i = this.elapsed_forward / PF_Common.FPATH_STEP_DURATION_MS;
        const _la_x = lerp(_tp.x, _tp_next.x, _i);
        const _la_y = lerp(_tp.y, _tp_next.y, _i);
        const _la_z = lerp(_tp.z, _tp_next.z, _i);

        // apply rotation to point drone-nose to target-point
        this.drone_obj.lookAt(_la_x, _la_y, _la_z);
        // fix rotation
        this.drone_obj.rotateY(Math.PI);

        return true;
    }
    else {
        return false;
    }
}

/**
 * 1. Moves the drone to the previous point using interpolation between current and previous in the curve
 * 2. NOTE: Current `this.fp_index` is `updated` as `this.fp_index = this.fp_index + 1` at `keydown_event` to avoid jumps in the position
 * since now we are moving backwards
 * @param {Float} ms milliseconds passed since last frame
 * @returns {boolean} true when moved properly, false otherwise
 */
PF_ModelDrone.prototype.move_to_backward_point_interpolated = function (ms) {
    if (this.drone_obj === undefined) {
        return false;
    }

    const _last_index = 0;
    if (this.fp_index <= _last_index) {
        return false;
    }

    const _nowTS = performance.now();
    this.elapsed_backward = _nowTS - this.prevTS_backward;
    
    if (this.elapsed_backward < PF_Common.FPATH_STEP_DURATION_MS) {
        // interpolation factor (current part of the interval based on elapsed time)
        const _i = this.elapsed_backward / PF_Common.FPATH_STEP_DURATION_MS;
        // current point3D
        const _p = this.fpath_curve[this.fp_index];
        // prev point3D
        const _p_prev = this.fpath_curve[this.fp_index - 1];
        // interpolate coordinates between current and prev point
        const _ip_x = lerp(_p.x, _p_prev.x, _i);
        const _ip_y = lerp(_p.y, _p_prev.y, _i);
        const _ip_z = lerp(_p.z, _p_prev.z, _i);

        // apply
        this.drone_obj.position.set(_ip_x, _ip_y, _ip_z);
        return true;
    }
    else {
        this.fp_index--;
        this.prevTS_backward = performance.now();
        return false;
    }
}

/**
 * - Updates the rotation of the drone to align with the direction is going
 * - NOTE: It will not rotate around its axis, hence simulates reverse move as a car
 * @param {Float} ms milliseconds passed since last frame
 * @returns {boolean} true when rotated properly, false otherwise
 */
PF_ModelDrone.prototype.point_nose_to_backward_point_interpolated = function (ms) {
    if (this.drone_obj === undefined) {
        return false;
    }
    
    const _lookAt_index = this.fp_index - 1;
    const _last_index = 0;
    if (_lookAt_index <= _last_index) {
        return false;
    }

    const _nowTS = performance.now();
    this.elapsed_backward = _nowTS - this.prevTS_backward;

    if (this.elapsed_backward < PF_Common.FPATH_STEP_DURATION_MS) {
        // start_point (current target point)
        const _tp = this.fpath_curve[_lookAt_index];
        // end_point (prev target point)
        const _tp_prev = this.fpath_curve[_lookAt_index - 1];
        // lookAt_point (interpolated point between current and next target point based on time elapsed)
        const _i = this.elapsed_backward / PF_Common.FPATH_STEP_DURATION_MS;
        const _la_x = lerp(_tp.x, _tp_prev.x, _i);
        const _la_y = lerp(_tp.y, _tp_prev.y, _i);
        const _la_z = lerp(_tp.z, _tp_prev.z, _i);

        // apply rotation to point drone-nose to target-point
        this.drone_obj.lookAt(_la_x, _la_y, _la_z);
        // NOTE: not fix rotation so it will not rotate around its axis, hence simulates reverse move as a car
        // this.drone_obj.rotateY(Math.PI);

        return true;
    }
    else {
        return false;
    }
}

/**
 * - Moves the drone using interpolation between 2 points3D
 * depending on the direction (`forward` or `backwards`)
 * - When move direction is `hovering` it does nothing
 * @param {Float} ms milliseconds passed since last frame
 */
PF_ModelDrone.prototype.move_interpolated = function (ms) {
    if (PF_MoveDrone.HOVERING == this.move_dir){
        // nothing
    }
    else if (PF_MoveDrone.FORWARD == this.move_dir){
        this.move_to_forward_point_interpolated(ms);
        this.point_nose_to_forward_point_interpolated(ms);
    }
    else if (PF_MoveDrone.BACKWARD == this.move_dir){
        this.move_to_backward_point_interpolated(ms);
        this.point_nose_to_backward_point_interpolated(ms);
    }
}

/**
 * Artificial drone shaking on X axis
 * @param {*} ms 
 */
PF_ModelDrone.prototype.animate_shaking = function (ms) {
    if (this.drone_obj === undefined) {
        return false;
    }
    this.drone_obj.rotation.x = PF_Common.get_drone_rot_x_pingpong(this.drone_obj.rotation.x);
}

export default PF_ModelDrone