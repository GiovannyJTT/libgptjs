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

export default {
    FLOOR_WIDTH,
    SKYBOX_WIDTH,
    FLOOR_TEXTURE_PATH,
    FLOOR_NORMAL_MAP_PATH,
    SKYBOX_TEXTURE_PATH,
    SKYBOX_TEXTURE_IMAGE_PATHS,
    CANVAS_CONTAINER_NAME_FOR_THREEJS,
    CANVAS_CONTAINER_WIDTH,
    CANVAS_CONTAINER_HEIGHT
}