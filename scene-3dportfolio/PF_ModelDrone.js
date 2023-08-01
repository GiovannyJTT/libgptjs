/**
 * @module libgptjs Graphical Programming with ThreeJS (GPT)
 * @class PF_ModelDrone
 */

import PF_Common from "./PF_Common"
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader"
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader";

class PF_ModelDrone {
    constructor(on_loaded_ok_cb){
        // 1. materials first
        const _lm = new MTLLoader();
        _lm.load(
            PF_Common.DRONE_MTL_PATH,

            function on_loaded_ok (materials_) {
                materials_.preload();
                
                // 2. load obj and attach materials
                load_obj(materials_)  
            },
            function on_loading(xhr) {
                console.info("Material loaded: " + (xhr.loaded / xhr.total * 100) + " %");
            },
            function on_error (err) {
                console.error(err);
            }    
        );

        function load_obj (mats_) {
            const _lo = new OBJLoader();
            _lo.setMaterials(mats_);
    
            _lo.load(
                PF_Common.DRONE_OBJ_PATH,
    
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
}

export default PF_ModelDrone