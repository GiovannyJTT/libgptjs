/**
 * @module libgptjs Graphical Programming with ThreeJS (GPT)
 * @class PF_ModelTrajectory
 */

import * as THREE from "three"
import GPT_Model from "../core/GPT_Model"
import PF_Common from "./PF_Common";

class PF_ModelFlightPath {
    constructor () {
        // 1. Interpolate more vertices from control points
        this.waypoints = this.get_waypoints();
        this.spline_points3D = undefined;

        // 2. call parent class constructor (in order to construct geometry and mesh)
        GPT_Model.call(this);

        // 3. Pass the geometry and material constructed to create line-mesh
        this.mesh = new THREE.Line(this.geometry, this.material);

        // 4. For dashed-line-material
        this.mesh.computeLineDistances();
    }
};

/**
 * @return {[THREE.Vector3]} Array of Vector3 containing coordinates of control-points
 * in world-space that match several countries on the europe-map on the floor-texture.
 * It also takes into account `take-off` and `land` waypoints
 */
PF_ModelFlightPath.prototype.get_waypoints = function () {
    const res = []
    const _wps = PF_Common.FPATH_WPS;

    for (let i=0; i < _wps.length; i++) {
        let _wp = _wps[i];
        let _p_ground = new THREE.Vector3(_wp.coords.x, PF_Common.FPATH_MIN_HEIGHT_MM, _wp.coords.y);
        let _p_altitude = new THREE.Vector3(_wp.coords.x, PF_Common.FPATH_MAX_HEIGHT_MM, _wp.coords.y);

        /*
        if (0 == i) {
            res.push(_p_ground);
            res.push(_p_altitude);
        }
        else {
            // landing
            res.push(_p_altitude);
            res.push(_p_ground);
            
            if (i < _wps.length-2) {
                // taking-off next step
                res.push(_p_altitude);
            }
        }
        */
        res.push(_p_altitude);
        res.push(_p_ground);
        res.push(_p_altitude);
    }
    return res;
}

/**
 * Override
 */
PF_ModelFlightPath.prototype.get_geometry = function () {
    const _spline = this.get_spline_points_and_colors();
    const _vertices = _spline["positions"];
    const _colors = _spline["colors"];

    // save to be used to update drone position
    this.spline_points3D = _spline["spline_points3D"];

    const _geom = new THREE.BufferGeometry();

    _geom.setAttribute(
        "position",
        new THREE.BufferAttribute(_vertices, 3)
    );

    _geom.setAttribute(
        "color",
        new THREE.BufferAttribute(_colors, 3)
    );
    
    return _geom;
}

/**
 * Override
 * - Due to limitations of the OpenGL Core Profile with the WebGL rendere 
 * on most platforms linewidth will always be 1 regardless of the set value.
 * - On Android linewidth works, but we will use 1 so we will have same rendering
 */
PF_ModelFlightPath.prototype.get_material = function () {
    const _mat = new THREE.LineDashedMaterial({
        vertexColors: true,
        linewidth: 2,
        gapSize: 10.0,
        dashSize: 10.0
    });

    return _mat;
}

/**
 * Creates a Spline using catmull-rom method and `this.waypoints` as control points
 * - Using PF_Common.FLIGH_PATH_NUM_SEGMENTS
 * - Saves final `spline_points3D` to be used later to move the drone along
 * @param {Array} this.waypoints must be already set to be used as contorl points to build the spline
 * @returns {Dictionar} `{"positions": Float32Array, "colors": Float32Array, "spline_points3D": Array of Vector3}`
 */
PF_ModelFlightPath.prototype.get_spline_points_and_colors = function () {
    if (this.waypoints === undefined) {
        console.error("waypoints is undefined");
        return undefined;
    }

    const _spline_points3D = [];
    const _spline_control_points = new THREE.CatmullRomCurve3(this.waypoints);
    const _positions = new Float32Array(PF_Common.FPATH_SPLINE_NUM_SEGMENTS * 3); // 3 floats per each vertex
    const _colors = new Float32Array(_positions.length);
    const _tmp_color = new THREE.Color();

    for (let i=0, c=0; i < PF_Common.FPATH_SPLINE_NUM_SEGMENTS; i++, c += 3) {
        const _t = i / PF_Common.FPATH_SPLINE_NUM_SEGMENTS

        // get point from spline (extrapolated coordnates) out of the control-points that form the curve (waypoints)
        const _p = new THREE.Vector3();
        _spline_control_points.getPoint(_t, _p);

        // save spline points
        _spline_points3D.push(_p)

        // prepare for geometry buffer
        _positions[c] = _p.x;
        _positions[c + 1] = _p.y;
        _positions[c + 2] = _p.z;

        // prepare for color buffer
        _tmp_color.setHSL(_t, 1.0, 0.5);
        _colors[c] = _tmp_color.r;
        _colors[c + 1] = _tmp_color.g;
        _colors[c + 2] = _tmp_color.b;
    }

    const res = {
        // size = 3 floats * FLIGHT_PATH_NUM_SEGMENTS
        "positions": _positions,
        "colors": _colors,
        "spline_points3D": _spline_points3D
    }

    return res;
}
/**
 * Extending method (calling parent method and performing pre / post operations)
 */
PF_ModelFlightPath.prototype.dispose_buffers = function () {

    GPT_Model.prototype.dispose_buffers.call(this);
    this.waypoints = null;
    this.spline_points3D = null;

    console.debug("PF_ModelFlightPath: dispose_buffers()");
}

export default PF_ModelFlightPath