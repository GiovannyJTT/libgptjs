/**
 * @module libgptjs Graphical Programming with ThreeJS (GPT)
 * @constant PF_Common constant values of 3DPorfolio project
 */

/**
 * Floor width in cm
 */
const FLOOR_WIDTH = 1000;

/**
 * Skybox width is 5 times floor width 
 */
const SKYBOX_WIDTH = 5 * FLOOR_WIDTH;
const FLOOR_TEXTURE_PATH = "./assets/images/europe-map-1800x1800.jpg";
const FLOOR_NORMAL_MAP_PATH = "./assets/images/europe-map-1800x1800-normal-map.jpg";

const SKYBOX_TEXTURE_PATH = "./assets/images/Forest/";
const SKYBOX_TEXTURE_IMAGES_NAMES = [
    "posx.jpg",
    "negx.jpg",
    "posy.jpg",
    "negy.jpg",
    "posz.jpg",
    "negz.jpg",
]

const SKYBOX_TEXTURE_IMAGE_PATHS = []
for(let i=0; i < SKYBOX_TEXTURE_IMAGES_NAMES.length; i++) {
    SKYBOX_TEXTURE_IMAGE_PATHS.push(SKYBOX_TEXTURE_PATH + SKYBOX_TEXTURE_IMAGES_NAMES[i]);
}

const CANVAS_CONTAINER_NAME_FOR_THREEJS = "container-for-threejs"
const posInfo = document.getElementById(CANVAS_CONTAINER_NAME_FOR_THREEJS).getBoundingClientRect();
const CANVAS_CONTAINER_WIDTH = posInfo.width;
const CANVAS_CONTAINER_HEIGHT = posInfo.height;

const DRONE_OBJ_PATH = "./assets/models/drone-lowpoly/model.obj";
const DRONE_MTL_PATH = "./assets/models/drone-lowpoly/materials.mtl";
const DRONE_SCALE = 150;
const DRONE_PROPELLERS_DISPLACEMENT_XZ = 32.5
const DRONE_PROPELLERS_DISPLACEMENT_Y = 18.5
const DRONE_PROPELERS_ROT_DEGREES = 20
const DRONE_PROPELERS_ROT_CW = DRONE_PROPELERS_ROT_DEGREES * Math.PI / 180.0 // RADS
const DRONE_PROPELERS_ROT_CCW = -DRONE_PROPELERS_ROT_CW
const DRONE_ROT_Y_MAX = 45 * Math.PI / 180.0
const DRONE_ROT_Y_MIN = -DRONE_ROT_Y_MAX
const DRONE_ROT_Y_STEP = DRONE_ROT_Y_MAX / 100.0

let increasing = true
function get_drone_rot_y (current) {
    if (increasing) {
        if (current < DRONE_ROT_Y_MAX) {
            return current + DRONE_ROT_Y_STEP;
        }
        else {
            increasing = false;
            return current;
        }    
    }
    else {
        if (current > DRONE_ROT_Y_MIN) {
            return current - DRONE_ROT_Y_STEP;
        }
        else {
            increasing = true;
            return current;
        }
    }
}

export default {
    FLOOR_WIDTH,
    SKYBOX_WIDTH,
    FLOOR_TEXTURE_PATH,
    FLOOR_NORMAL_MAP_PATH,
    SKYBOX_TEXTURE_PATH,
    SKYBOX_TEXTURE_IMAGE_PATHS,
    CANVAS_CONTAINER_NAME_FOR_THREEJS,
    CANVAS_CONTAINER_WIDTH,
    CANVAS_CONTAINER_HEIGHT,
    DRONE_OBJ_PATH,
    DRONE_MTL_PATH,
    DRONE_SCALE,
    DRONE_PROPELLERS_DISPLACEMENT_XZ,
    DRONE_PROPELLERS_DISPLACEMENT_Y,
    DRONE_PROPELERS_ROT_CW,
    DRONE_PROPELERS_ROT_CCW,
    get_drone_rot_y
}