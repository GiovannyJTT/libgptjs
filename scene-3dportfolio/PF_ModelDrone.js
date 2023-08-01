/**
 * @module libgptjs Graphical Programming with ThreeJS (GPT)
 * @class PF_ModelDrone
 */

import PF_Common from "./PF_Common"
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader"

class PF_ModelDrone {
    constructor(on_loaded_ok_cb){
        const _loader = new OBJLoader();

        _loader.load(
            PF_Common.DRONE_MODEL_PATH,

            on_loaded_ok_cb,

            function on_loading(xhr) {
                console.info("Model loaded: " + (xhr.loaded / xhr.total * 100) + " %");
            },

            function on_error (err) {
                console.error(err);
            }
        );
    }
}

export default PF_ModelDrone