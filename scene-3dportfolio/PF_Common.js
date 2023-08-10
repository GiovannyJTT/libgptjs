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

// these coords are for src/resources/images/europe-map-1800x1800.jpg
const IMG_MAP_RESOLUTION = {x: 1800, y: 1800}
const IMG_MAP_COORDS_VALENCIA = {x: 532, y: 1560}
const IMG_MAP_COORDS_HELSINKI = {x: 1518, y: 460}
const IMG_MAP_COORDS_ODENSE = {x: 972, y: 720}
const IMG_MAP_COORDS_OSLO = {x: 980, y: 475}

const FPATH_WP_VALENCIA = imgcoords_to_worldspace(IMG_MAP_COORDS_VALENCIA);
const FPATH_WP_HELSINKI = imgcoords_to_worldspace(IMG_MAP_COORDS_HELSINKI);
const FPATH_WP_ODENSE = imgcoords_to_worldspace(IMG_MAP_COORDS_ODENSE);
const FPATH_WP_OSLO = imgcoords_to_worldspace(IMG_MAP_COORDS_OSLO);

function imgcoords_to_worldspace (img_coords) {
    const u = img_coords.x / IMG_MAP_RESOLUTION.x;
    const v = img_coords.y / IMG_MAP_RESOLUTION.y;

    // origin (0,0) is at center of image
    const c = {x: 0.5, y: 0.5}
    const cart = {x: undefined, y: undefined}
    cart.x = u < c.x? -(c.x - u) : (u - c.x);
    cart.y = v < c.y? -(c.y - v) : (v - c.y);

    // apply scale
    const ws = {x: cart.x * FLOOR_WIDTH, y: cart.y * FLOOR_WIDTH}
    return ws;
}

const FPATH_WPS = [
    {name: "VALENCIA", coords: FPATH_WP_VALENCIA, date: "2017-March"},
    {name: "HELSINKI", coords: FPATH_WP_HELSINKI, date: "2019-March"},
    {name: "ODENSE", coords: FPATH_WP_ODENSE, date: "2020-July"},
    {name: "OSLO", coords: FPATH_WP_OSLO, date:"2021-November"}
]

// Configure spline curve based on num locations
const FPATH_SPLINE_NUM_SEGMENTS = FPATH_WPS.length * 20
const FPATH_STEP_DURATION_MS = FPATH_SPLINE_NUM_SEGMENTS * 10 // 10 ms per segment
const FPATH_MIN_HEIGHT_MM = 44 // depends on drone scale
const FPATH_MAX_HEIGHT_MM = 200

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
    FPATH_SPLINE_NUM_SEGMENTS,
    FPATH_STEP_DURATION_MS,
    FPATH_MIN_HEIGHT_MM,
    FPATH_MAX_HEIGHT_MM,
    FPATH_WPS
}