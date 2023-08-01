/**
 * @module libgptjs Graphical Programming with ThreeJS (GPT)
 * @class Scene3DPortfolio
 */

import * as THREE from 'three'
import GPT_Scene from '../core/GPT_Scene'
import PF_Common from './PF_Common'
import PF_ModelSkybox from './PF_ModelSkybox'

/**
 * Creating a child object (kind of child class) by Inheriting from GPT_Scene (Follow steps 1 to 3)
 *
 * Renders several animations by using vertical scroll
 */
function PF_Scene() {
    // 1. Call parent object
    GPT_Scene.call(this);
}

// 2. Extend from parent object prototype (keeps the proto clean)
PF_Scene.prototype = Object.create(GPT_Scene.prototype);

// 3. Repair the inherited constructor
PF_Scene.prototype.constructor = PF_Scene;

/**
 * Overrides createObjects funtion in child object
 */
PF_Scene.prototype.createObjects = function () {
    this.createAxes();
    this.createFloor();
    this.createSkybox();
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
    floor_tex.repeat.set(2, 2);

    const floor_mat = new THREE.MeshPhongMaterial({
        color: 0xb35900,
        emissive: 0x101010,
        flatShading: false,
        specular: 0x111A11,
        shininess: 50,
        map: floor_tex,
        side: THREE.FrontSide
    });

    // Mesh = Geometry + Material
    const floor = new THREE.Mesh(floor_geom, floor_mat);
    floor.rotation.set(- 1.57079632679, 0, 0);

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

/**
 * Per-frame update
 * Overrides updateObjects function in child object
 * @param {float} ms milliseconds passed since last frame
 */
PF_Scene.prototype.updateObjects = function (ms) {
    // this.updateDragon(ms);
    // this.updateRobot(ms);
    // this.updateBullet();
    // this.on_fsmr_changed();
    // this.im.controllers.get("stats").update();
}

/**
 * Overrides createLights function in child object
 * This function creates a light of each type (ambient, point, directional, focal) and adds helpers (wireframe representations)
 * for better understanding of where are located the light sources.
 */
PF_Scene.prototype.createLights = function () {
    // 5% white light (almost black), doesnt need position. Ambient-Light: is added when shading the models surfaces
    const lAmbient = new THREE.AmbientLight(new THREE.Color(0x0d0d0d), 1.0);
    this.gpt_lights.set("lAmbient", lAmbient);

    // 75% white light. Point-Light: emits in all directions
    const lPoint = new THREE.PointLight(new THREE.Color(0xbfbfbf), 1.0);
    lPoint.position.set(0, 100, 50);
    this.gpt_lights.set("lPoint", lPoint);

    const lPointHelper = new THREE.PointLightHelper(lPoint, 10);
    this.gpt_lights.set("lPointHelper", lPointHelper);

    // 75% white light. Directional-Light: emits only in the configured direction vector
    const lDirectional = new THREE.DirectionalLight(new THREE.Color(0xbfbfbf), 1.0);

    // direction of the lighting vector
    lDirectional.position.set(-200, 200, 0);
    this.gpt_lights.set("lDirectional", lDirectional);

    const lDirectionalHelper = new THREE.DirectionalLightHelper(lDirectional, 10);
    this.gpt_lights.set("lDirectionalHelper", lDirectionalHelper);

    // 75% white light. Focal-Light: emits light with "cone" volume
    const lFocal = new THREE.SpotLight(new THREE.Color(0xbfbfbf));
    lFocal.position.set(200, 330, -300);

    // direction of the central lighting vector
    lFocal.target.position.set(0, 0, 0);

    lFocal.angle = Math.PI / 8; // radians
    lFocal.distance = 1000;

    lFocal.castShadow = true;
    lFocal.shadow.camera.near = 5;
    lFocal.shadow.camera.far = 1000;
    lFocal.shadow.camera.fov = 45; // degrees
    lFocal.shadow.camera.visible = true;

    // intensity 10 is ok for distance 1000
    lFocal.intensity = 10;

    // atenuation from the central vector to the borders of the cone
    lFocal.decay = 7.5;

    this.gpt_lights.set("lFocal", lFocal);

    const lFocalHelper = new THREE.SpotLightHelper(lFocal);
    this.gpt_lights.set("lFocalHelper", lFocalHelper);
}

/**
 * Overrides updateLights function in child object
 * @param {float} ms milliseconds passed since last frame
 */
PF_Scene.prototype.updateLights = function (ms) {
    // console.log("update dragonLights here! (elapsed " + ms + " ms)");
}

export default PF_Scene;