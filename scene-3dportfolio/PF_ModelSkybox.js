/**
 * @module libgptjs Graphical Programming with ThreeJS (GPT)
 * @class PF_ModelSkybox
 */

import * as THREE from 'three'
import GPT_Model from "../core/GPT_Model"
import PF_Common from "./PF_Common"

/**
 * Creates a Model of Skybox with a cube and environment map texture
 * Inherits from GPT_Model
 */
function PF_ModelSkybox() {
    // 1. Call parent object
    GPT_Model.call(this);
}

// 2. Extend from parent object prototype (keep proto clean)
PF_ModelSkybox.prototype = Object.create(GPT_Model.prototype);

// 3. Repair the inherited constructor
PF_ModelSkybox.prototype.constructor = PF_ModelSkybox

/**
 * Overriding in this child object
 */
PF_ModelSkybox.prototype.get_geometry = function () {
    const _geom = new THREE.BoxGeometry(PF_Common.SKYBOX_WIDTH, PF_Common.SKYBOX_WIDTH, PF_Common.SKYBOX_WIDTH, 2, 2, 2);

    _geom.needsUpdate = true;
    return _geom;
}

/**
 * Overriding in this child object
 * Attaches textures into the Skybox side with separated materials instead of single material
 * (same images of skybox are being used on the dragon as cubeTexture to simulate reflections)
 */
PF_ModelSkybox.prototype.get_material = function () {
    const _cubeFacesMaterials = [];
    const _loader = new THREE.TextureLoader();

    for (let i = 0; i < PF_Common.SKYBOX_TEXTURE_IMAGE_PATHS.length; i++) {
        const _img_path = PF_Common.SKYBOX_TEXTURE_IMAGE_PATHS[i];
        _cubeFacesMaterials.push(
            new THREE.MeshBasicMaterial({
                map: _loader.load(_img_path),
                color: 0xffffff, // white
                side: THREE.BackSide // inside the cube
            })
        );
    }

    return _cubeFacesMaterials;
}

export default PF_ModelSkybox