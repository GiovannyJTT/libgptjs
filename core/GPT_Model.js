/**
 * @module libgptjs Graphical Programming with ThreeJS (GPT)
 * @class GPT_Model
 * @summary
 *      A model is an object containing all the meshes that form the "3D object" and share the same coordinates system
 *      It can contain several "Mesh" objects. Every Mesh has to have 2 objects: Geometry and Material
 */

/**
 * Importing object THREE from our costumized global script
 */
import THREE from '../external-libs/three-global'

/**
 * Constructs a Model object. Saves the reference to individual geometry and material, and
 * creates the THREE.Mesh
 */
function GPT_Model() {
    this.geometry = this.get_geometry();
    if (this.geometry === undefined) {
        console.error("Geometry undefined when constructing model");
        return;
    }

    this.material = this.get_material();
    if (this.material === undefined) {
        console.error("Material undefined when constructing model");
        return;
    }

    this.mesh = new THREE.Mesh(this.geometry, this.material);
}

/**
 * Override this method for creating the geometry
 */
GPT_Model.prototype.get_geometry = function () {
    console.error("GPT_Model.get_geometry: Not implemented");
}

/**
 * Overrid this method for creating the material
 */
GPT_Model.prototype.get_material = function () {
    console.error("GPT_Model.get_material: Not implemented");
}

/**
 * When called ensures to free gl buffers of geometry / material
 * 
 * For extending in children use:
 * 
 *      EXAMPLECHILD.prototype.dispose_buffers = function () {
 *          GPT_Model.prototype.dispose_buffers.call(this);
 *          ...
 *      }
 */
GPT_Model.prototype.dispose_buffers = function () {
    this.geometry.dispose();
    this.material.dispose();
    this.geometry = null;
    this.material = null;
    this.mesh = null;
}

export default GPT_Model;