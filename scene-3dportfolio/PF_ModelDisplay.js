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
        this.last_img_url = undefined;
    }
}

/**
 * - Creates a mesh (PlaneGeometry + MeshBasicMaterial)
 * - MeshBasicMaterial is not affected by light, so pictures will be displayed with good quality
 * - SkyBoxcube is applied as Environment map to simulate reflective screen
 * @param {Number} width 
 * @param {Number} height 
 * @param {Float} inclination_rads 
 * @param {Number} displacement 
 * @returns {THREE.Mesh}
 */
PF_ModelDisplay.prototype.get_display_mesh = function (width, height, inclination_rads, displacement) {
    // geometry
    const geom = new THREE.PlaneGeometry(width, height, 2, 2);

    // texture: asssuming locally-hosted, load will not fail
    const tex = new THREE.TextureLoader().load(PF_Common.URL_DISPLAY_TEMPLATE_TEXTURE);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 1);

    // attach texture to material. 
    // NOTE: MeshBasicMaterial is not affected by light
    const mat = new THREE.MeshBasicMaterial(
        {
            color: 0xffffff,
            map: tex,
            envMap: PF_Common.SKYBOX_CUBE_TEXTURE
        }
    );

    // mesh
    const mesh = new THREE.Mesh(geom, mat);

    // face camera
    mesh.rotation.set(inclination_rads, 0, 0);

    // place on top of monitor
    mesh.position.set(0, 0, displacement);

    // shadows
    mesh.castShadow = false;
    mesh.receiveShadow = false;

    return mesh;
}

PF_ModelDisplay.prototype.set_next_image_index = function (wp_index) {
    const ps = PF_Common.FPATH_WPS[wp_index].pictures;
    if (i < ps.paths.length) {
        ps.pic_index++;
    }
}

PF_ModelDisplay.prototype.set_prev_image_index = function (wp_index) {
    const ps = PF_Common.FPATH_WPS[wp_index].pictures;
    if (i > 0) {
        ps.pic_index--;
    }
}

PF_ModelDisplay.prototype.get_current_image_url = function (wp_index) {
    const ps = PF_Common.FPATH_WPS[wp_index].pictures;
    const url = ps.paths[ps.pic_index];
    return url;
}

PF_ModelDisplay.prototype.show_picture = function (wp_index) {
    const url = this.get_current_image_url(wp_index);
    if (this.last_img_url === url) {
        return;
    }

    // only once
    this.update_texture(url);
}

PF_ModelDisplay.prototype.update_texture = function (url) {
    this.mesh.material.map = new THREE.TextureLoader().load(url)
    this.mesh.material.needsUpdate = true;
    this.last_img_url = url;
}

export default PF_ModelDisplay