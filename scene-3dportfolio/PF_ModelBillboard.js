/**
 * @module libgptjs Graphical Programming with ThreeJS (GPT)
 * @class PF_ModelBillboard
 */

import PF_Common from "./PF_Common";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader";
import * as THREE from "three";
import { lerp } from "three/src/math/MathUtils";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader";
import * as helvetiker_regular from "three/examples/fonts/helvetiker_regular.typeface.json"

class PF_ModelBillboard {
    /**
     * - Billboard panel where we show info (country, name, year) for each wp-country
     * - This single billboard will be moved to different locations and changed its contend based on drone position
     * - This billboard keeps facing towards the drone position
     */
    constructor (on_loaded_external_cb) {
        this.on_loaded_external_cb = on_loaded_external_cb;
        this.prev_wp_index = undefined;
        this.prev_lookat_pos = new THREE.Vector3(0,0,0);

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
            this.attach_light();

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

    // slice clones the array, we dont want to modify the original
    let wps = PF_Common.FPATH_WPS.slice(0);
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

PF_ModelBillboard.prototype.attach_light = function () {
    const dist = this.size.x;
    // Point-Light for UFO in the center. Point-Light: emits in all directions, 75% white light.
    const lp = new THREE.PointLight(new THREE.Color(0xbfbfbf), 6, dist, 2);
    const pos_scaled = new THREE.Vector3(
        0,
        0.5,
        0.5
    );
    lp.position.set(pos_scaled.x, pos_scaled.y, pos_scaled.z);
    // fixed attachment
    this.billboard_obj.add(lp);
}

/**
 * - Places the BILLBOARD-object at a point between current and next waypoint-country in order to show
 * information on the panel while the drone is reaching the next target-waypoint
 * @param {Int} wp_index index of the waypoint-country where to place this object
 * @param {Function} on_waypoint_changed_cb callback to be executed when detected that the waypoint-country index changed between frames.
 *  This callback commonly removes the previous text3d_mesh from the scene and adds the new one just created
 */
PF_ModelBillboard.prototype.place_at_wp = function (wp_index, on_waypoint_changed_cb_) {
    if (undefined === this.billboard_obj){
        return;
    }

    const pos = this.pos_per_wp[wp_index];
    this.billboard_obj.position.set(pos.x, pos.y, pos.z);

    // wp hasn't changed
    if (this.prev_wp_index === wp_index) {
        return;
    }

    // wp just changed
    this.create_text3d(wp_index, on_waypoint_changed_cb_);
}

/**
 * Creates a new text-3D `only` when the waypoint-country location changes (when `wp_index` changes
 * between frames)
 * @param {Int} wp_index waypoint-country index
 * @param {Function} on_waypoint_changed_cb callback to be executed when detected that the waypoint-country index has changed between frames.
 *  This callback commonly removes the previous `text3d_mesh` from the scene and adds the new one
 * @property {Font} this.font font to be extruded as text-3D
 * @property {THREE.Mesh} this.text3d_mesh Mesh Object of the text-3D after scaling and positioning
 * @property {Int} this.prev_wp_index waypoint-country index in the previous frame
 */
PF_ModelBillboard.prototype.create_text3d = function (wp_index, on_waypoint_changed_cb_) {
    console.debug("create_text3d: wp_index: " + wp_index);

    const fl = new FontLoader();
    this.font = fl.parse(helvetiker_regular);
    this.text3d_mesh = this.get_text3d_mesh(wp_index);
    on_waypoint_changed_cb_.call(this, this.text3d_mesh);    
    this.prev_wp_index = wp_index;
}

/**
 * Creates text mesh (text geometry + text material)
 * 1. It configures the string-content of the text: wp.name + wp.date
 * 2. Sets text-3D size, height, position, orientation, etc., to be placed on the billboard-panel
 * 3. Sets material: front (opaque) and size (transparent glass). The glass material uses the skybox to simnulate reflections
 * @param {Int} wp_index waypoint-country index needed to set the string-content (wp.name + wp.date)
 * @returns {THREE.Mesh} Final mesh to be included into the webgl.scene
 */
PF_ModelBillboard.prototype.get_text3d_mesh = function (wp_index) {
    // 1. string-content
    const content_str = PF_Common.FPATH_WPS[wp_index].name + " - " + PF_Common.FPATH_WPS[wp_index].date;

    const text_geom = new TextGeometry(
        content_str,
        {
            font: this.font,
            size: 40,
            height: 5,
            curveSegments: 12,
            bevelEnabled: true,
            bevelThickness: 10,
            bevelSize: 8,
            bevelOffset: 0,
            bevelSegments: 5
        }
    );

    // 2. Place on the billboard-panel
    // text_geom.computeBoundingBox();
    // text_geom.center();

    // 3. Create material: front (opaque) + side (glass)
    const mat_glass = new THREE.MeshPhongMaterial(
        {
            color: 0x351F39,
            emissive: 0x222222,
            flatShading: true, // per-triangle normal, not smooth transition between triangles
            specular: 0xA0C1B8,
            shininess: 70,
            side: THREE.FrontSide,
            transparent: true,
            opacity: 0.75,
            envMap: PF_Common.SKYBOX_CUBE_TEXTURE
        }
    );

    const mat_opaque = new THREE.MeshBasicMaterial(
        {
            color: 0x351F39,
            emissive: 0x222222,
            flatShading: true,
            specular: 0xA0C1B8,
            shininess: 70,
            side: THREE.FrontSide,
            transparent: false,
            envMap: PF_Common.SKYBOX_CUBE_TEXTURE
        }
    );

    const text_mat = [];
    // front
    text_mat.push(mat_opaque);
    // side
    text_mat.push(mat_glass);

    const text_mesh = new THREE.Mesh(text_geom, text_mat);
    return text_mesh;
}

PF_ModelBillboard.prototype.face_to = function (lookat_pos) {
    if (undefined === this.billboard_obj){
        return;
    }
    
    const pos = new THREE.Vector3(lookat_pos.x, this.billboard_obj.position.y, lookat_pos.z);

    // apply interpolation for smooth rotation
    const i_pos = new THREE.Vector3(
        lerp(this.prev_lookat_pos.x, pos.x, PF_Common.INTERPOLATION_FACTOR_FOR_60_FPS),
        lerp(this.prev_lookat_pos.y, pos.y, PF_Common.INTERPOLATION_FACTOR_FOR_60_FPS),
        lerp(this.prev_lookat_pos.z, pos.z, PF_Common.INTERPOLATION_FACTOR_FOR_60_FPS)
    );

    this.billboard_obj.lookAt(i_pos);
    this.prev_lookat_pos = i_pos;
}


export default PF_ModelBillboard