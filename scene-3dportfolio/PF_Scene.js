/**
 * @module libgptjs Graphical Programming with ThreeJS (GPT)
 * @class PF_Scene
 */

import * as THREE from 'three'
import GPT_Scene from '../core/GPT_Scene'
import GPT_Common from '../core/GPT_Common'
import PF_Common from './PF_Common'
import PF_ModelSkybox from './PF_ModelSkybox'
import PF_ModelDrone from './PF_ModelDrone'
import PF_ModelFlightPath from './PF_ModelFlightPath'
import PF_FollowCamera from './PF_FollowCamera'
import PF_ModelUFO from './PF_ModelUFO'
import PF_ModelBillboard from './PF_ModelBillboard'
import PF_ModelArcade from './PF_ModelArcade'

/**
 * Creating a child object (kind of child class) by Inheriting from GPT_Scene (Follow steps 1 to 3)
 *
 * Renders several animations by using vertical scroll
 */
function PF_Scene() {
    // 1. Call parent object
    GPT_Scene.call(this, GPT_Common.SCENE_NAME_3DPORTFOLIO);

    this.fc = new PF_FollowCamera();
}

// 2. Extend from parent object prototype (keeps the proto clean)
PF_Scene.prototype = Object.create(GPT_Scene.prototype);

// 3. Repair the inherited constructor
PF_Scene.prototype.constructor = PF_Scene;

/**
 * Creates a THREE.Camera with by default values (perspective camera)
 * (Overriden method)
 */
PF_Scene.prototype.get_cam = function () {
    this.fc.config_cam();
    return this.fc.cam;
}

/**
 * Creates a THREE.OrbitControls with by default values (orbit control)
 * (Overriden method)
 */
PF_Scene.prototype.get_cam_handler = function (cam_, webgl_dom_element_) {
    this.fc.config_cam_handler(cam_, webgl_dom_element_);
    return this.fc.cam_handler;
}

/**
 * Overrides createObjects funtion in child object
 */
PF_Scene.prototype.createObjects = function () {
    this.createAxes();
    this.createFloor();
    this.createSkybox();
    this.createFlightPath();
    this.createDrone();

    // decorations
    this.createUFO();
    this.createBillboard();

    // iteractive items
    this.createArcade();
}

PF_Scene.prototype.createAxes = function () {
    const axisH = new THREE.AxesHelper(200);
    axisH.position.set(0.0, 0.0, 0.0);
    axisH.setColors(new THREE.Color(0xff0000), new THREE.Color(0x00ff00), new THREE.Color(0x0000ff));

    // add to set of gpt_objects to be added into the rendering graph
    this.gpt_models.set("AxesHelper", axisH);
}

PF_Scene.prototype.createFloor = function () {
    // geometry
    const floor_geom = new THREE.PlaneGeometry(PF_Common.FLOOR_WIDTH, PF_Common.FLOOR_WIDTH, 2, 2);

    // material
    const floor_tex = new THREE.TextureLoader().load(PF_Common.FLOOR_TEXTURE_PATH);
    floor_tex.wrapS = THREE.RepeatWrapping;
    floor_tex.wrapT = THREE.RepeatWrapping;
    floor_tex.repeat.set(1, 1);

    const floor_nm = new THREE.TextureLoader().load(PF_Common.FLOOR_NORMAL_MAP_PATH);

    const floor_mat = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        emissive: 0x0f0f0f,
        flatShading: false, // smooth transition between triangles
        specular: 0xe6d35e,
        shininess: 75,
        map: floor_tex,
        side: THREE.FrontSide,
        normalMap: floor_nm,
    });

    // Mesh = Geometry + Material
    const floor = new THREE.Mesh(floor_geom, floor_mat);
    floor.rotation.set(-1.57079632679, 0, 0);

    // shadows
    floor.castShadow = false;
    floor.receiveShadow = true;

    this.gpt_models.set("floor", floor);
}

PF_Scene.prototype.createSkybox = function () {
    const m_skybox = new PF_ModelSkybox();

    m_skybox.mesh.castShadow = false;
    m_skybox.mesh.receiveShadow = false;

    this.gpt_models.set("skybox", m_skybox.mesh);
}

PF_Scene.prototype.createFlightPath = function () {
    this.m_fpath = new PF_ModelFlightPath();
    this.m_fpath.mesh.castShadow = false;
    this.m_fpath.mesh.receiveShadow = false;

    this.gpt_models.set("flight_path", this.m_fpath.mesh);
}

/**
 * Creates Drone model and uses `this.m_fpath` to
 * pass the `spline_points3D` to move the drone along on update
 */
PF_Scene.prototype.createDrone = function () {
    
    const _on_loaded_ok = function (drone_obj_) {
        // drone object is a 3DObject-group
        console.debug("drone_obj:");
        console.debug(drone_obj_);

        // add drone.mesh at runtime not setup
        this.AddModelToScene("drone", drone_obj_);

        // set drone as target of the follow-camera
        this.fc.set_target(drone_obj_);

    }.bind(this);

    // save reference to our class so we can spin the propellers on update
    this.m_drone = new PF_ModelDrone(_on_loaded_ok, this.scene, this.m_fpath.spline_points3D);
}

PF_Scene.prototype.createUFO = function () {
    const _on_loaded_ok = function (ufo_obj_) {
        // add ufo-mesh at runtime
        this.AddModelToScene("ufo", ufo_obj_);
    }.bind(this);

    // save reference to our class so we can update
    this.m_ufo = new PF_ModelUFO(_on_loaded_ok);
}

PF_Scene.prototype.createBillboard = function () {
    const _on_loaded_ok = function (billboard_obj_) {
        this.AddModelToScene("billboard", billboard_obj_);
    }.bind(this);
    this.m_billboard = new PF_ModelBillboard(_on_loaded_ok);
}

PF_Scene.prototype.createArcade = function () {
    const _on_loaded_ok = function (arcade_obj_) {
        // arcade object is a 3D-Object-group
        console.debug("arcade_obj:");
        console.debug(arcade_obj_);

        this.AddModelToScene("arcade", arcade_obj_);
    }.bind(this);
    this.m_arcade = new PF_ModelArcade(_on_loaded_ok);
}

/**
 * Per-frame update
 * Overrides updateObjects function in child object
 * @param {float} ms milliseconds passed since last frame
 */
PF_Scene.prototype.updateObjects = function (ms) {
    this.updateDrone(ms);
    this.updateUFO(ms);
    this.updateBillboard(ms);
    this.updateArcade(ms);
}

PF_Scene.prototype.updateDrone = function (ms) {
    this.m_drone.spin_propellers(ms);
    this.m_drone.move_interpolated(ms);
}

PF_Scene.prototype.updateUFO = function (ms) {
    this.m_ufo.fly_on_sky(ms);
}

PF_Scene.prototype.updateBillboard = function (ms) {
    if (undefined !== this.m_drone.drone_obj) {
        this.m_billboard.place_at_wp(this.m_drone.get_wp_country_index());
        this.m_billboard.face_to(this.m_drone.drone_obj.position);
    }
}

PF_Scene.prototype.updateArcade = function (ms) {
    if (undefined !== this.m_drone.drone_obj) {
        this.m_arcade.place_at_wp(this.m_drone.get_wp_country_index());
        this.m_arcade.face_to(this.fc.cam.position);
    }
}

/**
 * 1. Creates an ambient-light and a directional-light, then adds visual-helpers
 * (wireframe representations) for better understanding of where are located the light sources.
 * 2. Creates a focal-light for each waypoint (location) on the 2D-map (floor)
 */
PF_Scene.prototype.createLights = function () {
    // Ambient-Light: is added when shading the models surfaces. 5% white light (almost black), doesnt need position.
    const lAmbient = new THREE.AmbientLight(new THREE.Color(0x0d0d0d), 1.0);
    this.gpt_lights.set("lAmbient", lAmbient);
   
    // Directional-Light: emits only in the configured direction vector. 75% white light.
    const lDirectional = new THREE.DirectionalLight(new THREE.Color(0xbfbfbf), 1.0);

    // NOTE: direction of the lighting vector is matched witht he skybox-sun position
    lDirectional.position.set(75, 200, 200);
    this.gpt_lights.set("lDirectional", lDirectional);

    const lDirectionalHelper = new THREE.DirectionalLightHelper(lDirectional, 10);
    this.gpt_lights.set("lDirectionalHelper", lDirectionalHelper);

    // Focal-lights pointing to on-map countries
    for (let i=0; i < PF_Common.FPATH_WPS.length; i++) {
        const _wp = PF_Common.FPATH_WPS[i]["coords"];

        // Focal-Light: emits light with "cone" volume, 75% white light
        const lFocal = new THREE.SpotLight(new THREE.Color(0xbfbfbf));
        lFocal.position.set(
            _wp.x + (2 * PF_Common.DRONE_BOUNDING_BOX_SIDE),
            PF_Common.FPATH_WPS_LIGHT_HEIGHT,
            _wp.y);

        // direction of the central lighting vector
        lFocal.target.position.set(_wp.x, 0, _wp.y);
        lFocal.angle = Math.PI / 12; // radians
        lFocal.distance = 3 * PF_Common.FPATH_WPS_LIGHT_HEIGHT;

        // intensity 50 and decay are related
        lFocal.intensity = 50;
        // atenuation from the central vector to the borders of the cone
        lFocal.decay = 11;

        // shadow config
        lFocal.shadow.camera.near = 5;
        lFocal.shadow.camera.far = lFocal.distance;
        lFocal.shadow.camera.fov = 45; // degrees
        lFocal.shadow.camera.visible = true;
        lFocal.castShadow = true;

        this.gpt_lights.set("lFocal_" + i, lFocal);

        // Focal-Light-Helper
        const lFocalHelper = new THREE.SpotLightHelper(lFocal);
        this.gpt_lights.set("lFocalHelper_" + i, lFocalHelper);
    }

    // Point-Light for UFO in the center. Point-Light: emits in all directions, 75% white light.
    const pldist = PF_Common.UFO_POS_Y_MIN;
    const lPoint = new THREE.PointLight(new THREE.Color(0xbfbfbf), 30, pldist, 2);

    lPoint.position.set(0, 1.5 * PF_Common.UFO_POS_Y_MIN, 0);
    this.gpt_lights.set("lPoint_ufo", lPoint);

    const lPointHelper = new THREE.PointLightHelper(lPoint, 10);
    this.gpt_lights.set("lPointHelper_ufo", lPointHelper);
}

/**
 * Overrides updateLights function in child object
 * @param {float} ms milliseconds passed since last frame
 */
PF_Scene.prototype.updateLights = function (ms) {
    // console.log("update dragonLights here! (elapsed " + ms + " ms)");
}

export default PF_Scene;