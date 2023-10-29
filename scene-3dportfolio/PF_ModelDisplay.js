/**
 * @module libgptjs Graphical Programming with ThreeJS (GPT)
 * @class `PF_ModelDisplay` It is attached to the `PF_ModelArcade`-monitor.
 * It shows pictures, videos, and multimedia based on the user interaction.
 * It receives events to swipe-left or swipe-right the content.
 */

import * as THREE from "three";
import PF_Common from "./PF_Common";

class PF_ModelDisplay {

    /**
     * - It must be attached to `PF_ModelArcade` and overlaying its monitor, so we can show multimedia content on the texture
     * - It receives e'vents to swipe-left or swipe-right the contet
     * - Depending on the current waypoint-country it will show a set of specifi multimedia-content related to that country
     * - Click to read-more will open a new tab on the web-browser
     * @param {Number} width width of the display in meters. (Default: 54)
     * @param {Number} height height of the display in meters. (Default: 67)
     * @param {Number} inclination_rads angle of inclination to be placed properly on top of the arcade-screen.
     *  (Default: `74.5 * (Math.PI/180)`)
     * @param {Number} displacement displacement in the Z-axis from the center of the arcade-machine to be placed properly on top of the
     *  arcade-screen. (Default: 8)
     * @property {THREE.Mesh} this.mesh 3d-mesh containing the plane that simulates the display and in which the pictures
     *  will be shown as textures
     */
    constructor (width = 54, height = 67, inclination_rads = 74.5 * (Math.PI/180), displacement = 8) {
        this.mesh = this.get_display_mesh(width, height, inclination_rads, displacement);

        // init
        this.is_on = false;
        this.last_img_url = undefined;
        this.loading_texture = false;
    }
}

/**
 * - Creates a mesh (PlaneGeometry + MeshBasicMaterial)
 * - MeshBasicMaterial is not affected by light, so pictures will be displayed with good quality
 * - The material contains the initial texture, and it will be replaced on `render.update()`
 * - The display has a flag `is_on` which will allow to show the default texture
 *  (glossy / reflective) when `is off` or the picture when `is on`
 * - SkyBoxcube is applied as `envMap` (environment map) to simulate reflections
 * - Sets disabled: `receive / cast shadows`
 * 
 * @param {Number} width width of the display plane in meters (Commonly: 54)
 * @param {Number} height height of the display plane in meters (Commonly: 67)
 * @param {Float} inclination_rads Inclination of the display plane on the X-axis in other to face the
 *  camera properly (Commonly: 74.5 degrees)
 * @param {Number} displacement displacement in meters from the center of the arcade-machine model3D in order to 
 *  place the display-plane over the arcade-screen (Commonly: 8)
 * @returns {THREE.Mesh} PlaneGeometry + MeshBasicMaterial + texture
 */
PF_ModelDisplay.prototype.get_display_mesh = function (width, height, inclination_rads, displacement) {
    // geometry
    const geom = new THREE.PlaneGeometry(width, height, 2, 2);

    // texture: asssuming locally-hosted, load will not fail
    this.texture = new THREE.TextureLoader().load(PF_Common.URL_DISPLAY_TEMPLATE_TEXTURE);

    // sets texture in the middle of the plane-display
    this.texture.center.set(0.5, 0.5);
    // no offset needed
    this.texture.offset.set(0, 0);
    // ClampToEdgeWrapping will fill the empty space
    this.texture.wrapS = THREE.ClampToEdgeWrapping;
    this.texture.wrapT = THREE.ClampToEdgeWrapping;
    // anisotropy [1, 16], improves rendering of texture
    this.texture.anisotropy = PF_Common.RENDERER_MAX_ANISOTROPY;

    // attach texture to material. NOTE: MeshBasicMaterial is not affected by light
    const mat = new THREE.MeshBasicMaterial(
        {
            color: 0xffffff,
            map: this.texture,
            // default display-status is `off` then show reflective skycube
            envMap: PF_Common.SKYBOX_CUBE_TEXTURE
        }
    );

    // mesh
    const mesh = new THREE.Mesh(geom, mat);

    // display facing camera
    mesh.rotation.set(inclination_rads, 0, 0);
    // put the display-plane over the arcade-monitor
    mesh.position.set(0, 0, displacement);

    // disable shadows
    mesh.castShadow = false;
    mesh.receiveShadow = false;

    return mesh;
}

/**
 * @returns {Bool} true when flag `is_on` is true, false otherwise
 */
PF_ModelDisplay.prototype.check_is_on = function () {
    return this.is_on;
}

/**
 * - Sets flag `is_on = true`
 * - Removes skybox if exists
 */
PF_ModelDisplay.prototype.switch_on = function () {
    this.is_on = true;
    // remove skybox reflections
    if (this.mesh.material.envMap !== undefined) {
        this.mesh.material.envMap.dispose();
    }
}

/**
 * - Sets flag `is_on = false`
 * - Removes last texture if exists
 * - Sets template texture to be shown
 * - Adds skybox to be shown
 */
PF_ModelDisplay.prototype.switch_off = function () {
    this.is_on = false;

    // remove last texture
    if (this.mesh.material.map !== undefined) {
        this.mesh.material.map.dispose();
    }

    // sets template texture
    // texture: asssuming locally-hosted, load will not fail
    this.texture = new THREE.TextureLoader().load(PF_Common.URL_DISPLAY_TEMPLATE_TEXTURE);
    // sets texture in the middle of the plane-display
    this.texture.center.set(0.5, 0.5);
    // no offset needed
    this.texture.offset.set(0, 0);
    // ClampToEdgeWrapping will fill the empty space
    this.texture.wrapS = THREE.ClampToEdgeWrapping;
    this.texture.wrapT = THREE.ClampToEdgeWrapping;
    // anisotropy [1, 16], improves rendering of texture
    this.texture.anisotropy = PF_Common.RENDERER_MAX_ANISOTROPY;
    
    // set skybox reflections
    this.mesh.material.map = this.texture;

    // adds skybox
    this.mesh.material.envMap = PF_Common.SKYBOX_CUBE_TEXTURE;
}

/**
 * Based on the `wp_index` (waypoint-country index) received, it `increases` its current `pic_index` to show that specific picture
 * @param {Int} wp_index waypoint-country index to retrieve the set of pictures
 * @property {Dictionary} pictures Example: {paths: [], pic_index: 0}
 */
PF_ModelDisplay.prototype.set_next_image_index = function (wp_index) {
    const ps = PF_Common.FPATH_WPS[wp_index].pictures;
    if (ps.pic_index < ps.paths.length-1) {
        ps.pic_index++;
    }
}

/**
 * Based on the `wp_index` (waypoint-country index) received, it `reduces` its current `pic_index` to show that specific picture
 * @param {Int} wp_index waypoint-country index to retrieve the set of pictures
 * @property {Dictionary} pictures Example: {paths: [], pic_index: 0}
 */
PF_ModelDisplay.prototype.set_prev_image_index = function (wp_index) {
    const ps = PF_Common.FPATH_WPS[wp_index].pictures;
    if (ps.pic_index > 1) {
        ps.pic_index--;
    }
}

/**
 * @param {Int} wp_index waypoint-country index to retrieve the curren picture
 * @returns {String} url path of the current piture (`pic_index`) to be shown at the waypoint-country (`wp_index`)
 */
PF_ModelDisplay.prototype.get_current_image_url = function (wp_index) {
    const ps = PF_Common.FPATH_WPS[wp_index].pictures;
    const url = ps.paths[ps.pic_index];
    return url;
}

/**
 * 1. Checks the last picture-URL (string) loaded for the `wp_index`
 * 2. If picture-URL has changed (the user has swiped-right / or swiped-left to see other picture), then
 *      it loads a new picture as texture
 * - NOTE: Only loads a new texture when there is no loading-process ongoing
 * @param {Int} wp_index waypoint-country index to retrieve the set of pictures
 * @property {Bool} this.loading_texture true if there is a loading-process ongoing, false otherwise
 */
PF_ModelDisplay.prototype.show_picture = function (wp_index) {
    const url = this.get_current_image_url(wp_index);
    if (this.last_img_url === url) {
        return;
    }

    if (!this.loading_texture) {
        this.update_texture(url);
    }
}

/**
 * 1. Sets flag `this.loading_texture` to true in order to avoid several loads in parallel
 * 2. Triggers load of texture and attaches a `on_loaded_sequence` callback (center_texture) method to be
 *      executed when the texture finishes loading
 * 3. Resets flags: `this.loading_texture = false`, `this.last_img_url = url`
 * @param {String} url url path of the image to be loaded as texture
 */
PF_ModelDisplay.prototype.update_texture = function (url) {
    this.loading_texture = true;
    new THREE.TextureLoader().load(
        url,

        function on_loaded_sequence (tex_) {
            this.texture = tex_;
            this.center_texture();
            // reset flags
            this.loading_texture = false;
            this.last_img_url = url;
        }.bind(this),

        function on_loading(xhr) {
            console.debug("Texture loaded: " + (xhr.loaded / xhr.total * 100) + " %");
        }.bind(this),

        function on_error (err) {
            console.error(err);
            this.loading_texture = false;
        }.bind(this)
    );
}

/**
 * - It assumes `this.texture` is already set
 * - Centers the image in the middle of the display-plane
 * - Sets a `ratio of reference` depending on the orientation of the incoming image:
 *      - Incoming image is horizontal: ratio of refence is `ratio_w = geom.w / img.w`,
 *          because the `img.w` will fit exactly into the `geom.w`, and `img.h` will be scaled
 *      - Incoming image is vertical: ratio of reference is `ratio_h = geom.h / img.h`
 *          because the `img.h` will fit exaxtly into the `geom.h`, and `img.w` will be scaled
 * - It assumes the display-plane of the arcade-screen is vertical (Commonly: 54 x 67)
 * - Incoming images can be horizontal (ex: 1280 x 720) or vertical (ex: 1400 x 2100), so the `reduce_factor_w`,
 * or the `reduce_factor_h`, is calculated based on the `ratio of reference` and added to `texture.repeat(x,y)`
 * - NOTE: The display switches on / off depending how close is the drone to the display, when is off
 *  the skybox-texture is applied for reflections, so it needs to be removed when showing a picture (done at `show_picture`)
 */
PF_ModelDisplay.prototype.center_texture = function () {
    const img_w = this.texture.image.width;
    const img_h = this.texture.image.height;
    const geom_w = this.mesh.geometry.parameters.width;
    const geom_h = this.mesh.geometry.parameters.height;

    let reduce_factor_w = undefined;
    let reduce_factor_h = undefined;
    
    // img is horizontal
    if (img_w > img_h) {
        // reference ratio is ratio_w
        const r_w = geom_w / img_w;
        const scaled_h = r_w * img_h;
        reduce_factor_h = (geom_h - scaled_h) / geom_h;
        reduce_factor_w = 0;
    }
    // img is vertical
    else {
        // reference ratio is ratio_h
        const r_h = geom_h / img_h;
        const scaled_w = r_h * img_w;
        reduce_factor_w = (geom_w - scaled_w) / geom_w;
        reduce_factor_h = 0;
    }

    // scale the texture-image by adding reduce_factor as repeat_factor
    this.texture.repeat.set(1 + reduce_factor_w, 1 + reduce_factor_h);
    // sets texture in the middle of the plane-display
    this.texture.center.set(0.5, 0.5);
    // no offset needed
    this.texture.offset.set(0, 0);
    
    // ClampToEdgeWrapping will fill the empty space
    this.texture.wrapS = THREE.ClampToEdgeWrapping;
    this.texture.wrapT = THREE.ClampToEdgeWrapping;

    // improve quality: most of cases images will be mignified to fit into the small arcade-display-plane
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.minFilter = THREE.LinearMipmapLinearFilter;
    // anisotropy [1, 16], improves rendering of texture
    this.texture.anisotropy = PF_Common.RENDERER_MAX_ANISOTROPY;

    // update texture on the mesh
    this.mesh.material.map.dispose(); // remove previous from gpu
    this.mesh.material.map = this.texture;
    this.mesh.material.needsUpdate = true;
}

export default PF_ModelDisplay