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

/**
 * Generates an angle in the range [`DRONE_ROT_Y_MIN`, `DRONE_ROT_Y_MAX`] in a ping-pong way.
 * It will start increasing (adding) to the `current angle passed` until it reaches `DRONE_ROT_Y_MAX`,
 * then it will start decreasing (substracting) to the `current angle passed` until it reaches `DRONE_ROT_Y_MIN`
 * @param {float} current drone rotation on its Y axis in radians
 * @returns an angle in radians in [`DRONE_ROT_Y_MIN`, `DRONE_ROT_Y_MAX`]
 */
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
};

let fl_y_acc = 0.0;
let fr_y_acc = 0.0;
let rl_y_acc = 0.0;
let rr_y_acc = 0.0;

/**
 * Spins the propellers in their vertical axis (Y) in their local-space
 * - The propellers will spin `Clockwise` or `CounterClockwise` depending on their position on the drone
 * - FrontLeft (CW), FrontRight (CCW), RearLeft (CCW), RearRight (CW)
 * @returns {Dictionary} Example: `{"fl": 0.0, "fr": 0.0, "rl": 0.0, "rr": 0.0}`
 */
function get_propellers_spin () {
    // accumulate
    fl_y_acc += DRONE_PROPELERS_ROT_CW;
    fr_y_acc += DRONE_PROPELERS_ROT_CCW;
    rl_y_acc += DRONE_PROPELERS_ROT_CCW;
    rr_y_acc += DRONE_PROPELERS_ROT_CW;

    // clamp
    fl_y_acc = (fl_y_acc >= 2*Math.PI || fl_y_acc <= -2*Math.PI)? 0.0 : fl_y_acc;
    fr_y_acc = (fr_y_acc >= 2*Math.PI || fr_y_acc <= -2*Math.PI)? 0.0 : fr_y_acc;
    rl_y_acc = (rl_y_acc >= 2*Math.PI || rl_y_acc <= -2*Math.PI)? 0.0 : rl_y_acc;
    rr_y_acc = (rr_y_acc >= 2*Math.PI || rr_y_acc <= -2*Math.PI)? 0.0 : rr_y_acc;

    return {
        "fl": fl_y_acc,
        "fr": fr_y_acc,
        "rl": rl_y_acc,
        "rr": rr_y_acc
    }
}

const FLIGHT_PATH_NUM_LOCATIONS = 4
const FLIGHT_PATH_SPLINE_NUM_SEGMENTS = FLIGHT_PATH_NUM_LOCATIONS * 10
const FLIGHT_PATH_STEP_DURATION_MS = FLIGHT_PATH_SPLINE_NUM_SEGMENTS * 10

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
    get_drone_rot_y,
    get_propellers_spin,
    FLIGHT_PATH_SPLINE_NUM_SEGMENTS,
    FLIGHT_PATH_STEP_DURATION_MS
}