/**
 * @module libgptjs Graphical Programming with ThreeJS (GPT)
 * @constant PF_Common constant values of 3DPorfolio project
 */

// config container for hmtl content
const CONTAINER_HTML_ID= "container-for-html";
const css_root = document.querySelector(":root");
let CONTAINER_HTML_HEIGHT_MAX_PX = getComputedStyle(css_root).getPropertyValue("--container-html-max-height-px");
CONTAINER_HTML_HEIGHT_MAX_PX = CONTAINER_HTML_HEIGHT_MAX_PX.substring(0, CONTAINER_HTML_HEIGHT_MAX_PX.length-2);
CONTAINER_HTML_HEIGHT_MAX_PX = parseInt(CONTAINER_HTML_HEIGHT_MAX_PX);

// config container for webgl content
const CONTAINER_THREEJS_ID = "container-for-threejs";
const posInfo = document.getElementById(CONTAINER_THREEJS_ID).getBoundingClientRect();
const CONTAINER_THREEJS_WIDTH = posInfo.width;
const CONTAINER_THREEJS_HEIGHT = posInfo.height;

// CONFIG TEXTURES

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

// DRONE CONFIG
const DRONE_OBJ_PATH = "./assets/models/drone-lowpoly/model.obj";
const DRONE_MTL_PATH = "./assets/models/drone-lowpoly/materials.mtl";
const DRONE_SCALE = 56.25
// displacement depens on scale
const DRONE_PROPELLERS_DISPLACEMENT_XZ = 12.1875
const DRONE_PROPELLERS_DISPLACEMENT_Y = 6.9375
const DRONE_BOUNDING_BOX_SIDE = 33

// drone propellers
const DRONE_PROPELERS_ROT_DEGREES = 20
const DRONE_PROPELERS_ROT_CW = DRONE_PROPELERS_ROT_DEGREES * Math.PI / 180.0 // RADS
const DRONE_PROPELERS_ROT_CCW = -DRONE_PROPELERS_ROT_CW

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

// waypoints (locations on the map)
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
console.debug(FPATH_WPS);

const FPATH_WPS_LIGHT_HEIGHT = DRONE_BOUNDING_BOX_SIDE * 3

// Flight path spline config
const FPATH_MIN_HEIGHT_MM = DRONE_BOUNDING_BOX_SIDE / 2.0
const FPATH_MAX_HEIGHT_MM = DRONE_BOUNDING_BOX_SIDE * 4
// Configure spline curve based on num locations
const FPATH_SPLINE_NUM_SEGMENTS = FPATH_WPS.length * 20
const FPATH_SPLINE_NUM_SEGMENTS_PER_WP = FPATH_SPLINE_NUM_SEGMENTS / FPATH_WPS.length

// configure speed
const FPATH_SEGMENT_DURATION_MIN_MS = 200 // faster move
const FPATH_SEGMENT_DURATION_MAX_MS = 1000 // slower move
const FPATH_SEGMENT_SPEED_STEP_MS = 50
let FPATH_SEGMENT_DURATION_MS = FPATH_SEGMENT_DURATION_MAX_MS // ms between 2 points

/**
 * @returns the updated duration in milliseconds of the segment
 */
function get_segment_duration () {
    return FPATH_SEGMENT_DURATION_MS;
}

function set_speed_faster() {
    FPATH_SEGMENT_DURATION_MS -= FPATH_SEGMENT_SPEED_STEP_MS;
    FPATH_SEGMENT_DURATION_MS = Math.max(FPATH_SEGMENT_DURATION_MS, FPATH_SEGMENT_DURATION_MIN_MS);
}

function set_speed_slower() {
    FPATH_SEGMENT_DURATION_MS += FPATH_SEGMENT_SPEED_STEP_MS;
    FPATH_SEGMENT_DURATION_MS = Math.min(FPATH_SEGMENT_DURATION_MS, FPATH_SEGMENT_DURATION_MAX_MS);
}

function is_speed_normal() {
    FPATH_SEGMENT_DURATION_MS == FPATH_SEGMENT_DURATION_MAX_MS;
}

// UFO CONFIG
const UFO_OBJ_PATH = "./assets/models/ufo-lowpoly/model.obj";
const UFO_MTL_PATH = "./assets/models/ufo-lowpoly/materials.mtl";
const UFO_SCALE = 50;

// rotate
const UFO_ROT_X_MAX = 10 * Math.PI / 180.0
const UFO_ROT_X_MIN = -UFO_ROT_X_MAX
const UFO_ROT_X_STEP = UFO_ROT_X_MAX / 20.0
let increasing_rot = true

/**
 * Generates an angle in the range [`UFO_ROT_X_MIN`, `UFO_ROT_X_MAX`] in a ping-pong way.
 * It will start increasing (adding) to the `current angle passed` until it reaches `UFO_ROT_X_MAX`,
 * then it will start decreasing (substracting) to the `current angle passed` until it reaches `UFO_ROT_X_MIN`
 * @param {float} current drone rotation on its `X` axis in radians
 * @returns an angle in radians in [`UFO_ROT_X_MIN`, `UFO_ROT_X_MAX`]
 */
function get_ufo_rot_x_pingpong (current) {
    if (increasing_rot) {
        if (current < UFO_ROT_X_MAX) {
            return current + UFO_ROT_X_STEP;
        }
        else {
            increasing_rot = false;
            return current;
        }    
    }
    else {
        if (current > UFO_ROT_X_MIN) {
            return current - UFO_ROT_X_STEP;
        }
        else {
            increasing_rot = true;
            return current;
        }
    }
};

// move up / down
const UFO_POS_Y_MAX = 3 * FPATH_MAX_HEIGHT_MM
const UFO_POS_Y_MIN = FPATH_MAX_HEIGHT_MM
const UFO_POS_Y_STEP = 1
let increasing_pos = true

/**
 * Idem to get_ufo_rot_x_pingpong but moving up and down
 */
function get_ufo_pos_y_pingpong (current) {
    if (increasing_pos) {
        if (current < UFO_POS_Y_MAX) {
            return current + UFO_POS_Y_STEP;
        }
        else {
            increasing_pos = false;
            return current;
        }    
    }
    else {
        if (current > UFO_POS_Y_MIN) {
            return current - UFO_POS_Y_STEP;
        }
        else {
            increasing_pos = true;
            return current;
        }
    }
}

// BILLBOARD CONFIG

const BILLBOARD_OBJ_PATH = "./assets/models/billboard-lowpoly/model.obj";
const BILLBOARD_MTL_PATH = "./assets/models/billboard-lowpoly/materials.mtl"
const BILLBOARD_SCALE = 100;

export default {
    CONTAINER_HTML_ID,
    CONTAINER_HTML_HEIGHT_MAX_PX,
    CONTAINER_THREEJS_ID,
    CONTAINER_THREEJS_WIDTH,
    CONTAINER_THREEJS_HEIGHT,
    FLOOR_WIDTH,
    SKYBOX_WIDTH,
    FLOOR_TEXTURE_PATH,
    FLOOR_NORMAL_MAP_PATH,
    SKYBOX_TEXTURE_PATH,
    SKYBOX_TEXTURE_IMAGE_PATHS,
    UFO_OBJ_PATH,
    UFO_MTL_PATH,
    UFO_SCALE,
    UFO_POS_Y_MIN,
    get_ufo_rot_x_pingpong,
    get_ufo_pos_y_pingpong,
    DRONE_OBJ_PATH,
    DRONE_MTL_PATH,
    DRONE_SCALE,
    DRONE_BOUNDING_BOX_SIDE,
    DRONE_PROPELLERS_DISPLACEMENT_XZ,
    DRONE_PROPELLERS_DISPLACEMENT_Y,
    DRONE_PROPELERS_ROT_CW,
    DRONE_PROPELERS_ROT_CCW,
    get_propellers_spin,
    FPATH_SPLINE_NUM_SEGMENTS,
    FPATH_SPLINE_NUM_SEGMENTS_PER_WP,
    get_segment_duration,
    set_speed_faster,
    set_speed_slower,
    is_speed_normal,
    FPATH_MIN_HEIGHT_MM,
    FPATH_MAX_HEIGHT_MM,
    FPATH_WPS,
    FPATH_WPS_LIGHT_HEIGHT,
    BILLBOARD_OBJ_PATH,
    BILLBOARD_MTL_PATH,
    BILLBOARD_SCALE
}