/**
 * @module libgptjs Graphical Programming with ThreeJS (GPT)
 * @class InputManager
 */

import { GUI } from 'dat.gui'
import Common from './Common';
import Stats from "three/examples/jsm/libs/stats.module"

/**
 * Manages input from UI or Keyboard and sends actions to update models
 * Creates `gui` controller independently if it is mobile or desktop device
 * Create `keyboard` controller when desktop device
 * @param {Dictionary} on_change_callbacks_ callback functions to fire when GUI elements change
 */
function InputManager(on_change_callbacks_) {

    this.cbs = on_change_callbacks_;
    if (this.cbs === undefined) {
        console.error("InputManager: on_change_callbacks is undefined");
        return;
    }

    this.is_mobile = this.check_is_mobile_device();
    if (!this.is_mobile) {
        this.keyboard = this.create_kb_controller();
    }

    // fills controllers with references to the GUI panels
    this.gui = null;
    this.controllers = null;
    this.create_ui_controller();
}

/**
 * @returns {Bool} true is mobile (android, etc), false when is desktop
 */
InputManager.prototype.check_is_mobile_device = function () {
    let check = false;

    // https://stackoverflow.com/questions/11381673/detecting-a-mobile-browser
    (function (a) { if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true; })(navigator.userAgent || navigator.vendor || window.opera);

    return check;
}

/**
 * dat.gui will store values in `effect` variables, then on Scene.update
 *      we will apply those values to the models
 * 
 * NOTE: dat.gui assumes the GUI type based on the target's initial value type:
 *      boolean: checkbox
 *      int / float: slider
 *      string: text input
 *      function: button
 * 
 * @attribute {Dictionary} this.cbs are the "on_change" callbacks to be triggered
 * @returns {Map} we save references to the gui.controllers for each gui item, so we can update them later
 */
InputManager.prototype.create_ui_controller = function () {
    this.gui = new GUI(); // this will create list of className 'dg' elements
 
    // a map to save the references to control several elements from SceneDragon.js
    this.controllers = new Map();

    // dragon
    // effect
    let _e = {
        status: "rotating",
        rot_angle: 0.0,
        smoothing: false,
    }

    // controller writes to effect variable
    let _f = this.gui.addFolder("dragon");

    let _c = _f.add(_e, "status").name("Status");

    this.controllers.set("dragon_status", _c);

    _c = _f.add(_e, "rot_angle", -3.0, 3.0, 1.0).name("RotY Angle")
        .onChange(
            // triggered when onChange event
            this.cbs.on_change_dragon_rot_angle
        )
        // trigger first event
        .setValue(1.0)

    this.controllers.set("dragon_rot_angle", _c);

    _c = _f.add(_e, "smoothing", false).name("Smoothing")
        .onChange(
            this.cbs.on_change_dragon_smoothing
        )
        .setValue(false);

    this.controllers.set("dragon_smoothing", _c);

    // robot
    _e = {
        status: "idle",
        power: 500,
        aim_angle: 0.0,
        // shoot: function () {} // button
    }

    _f = this.gui.addFolder("robot");

    _c = _f.add(_e, "status").name("Status");
    this.controllers.set("robot_status", _c);

    _c = _f.add(_e, "power",
        Common.TRAJECTORY_DIST_MIN, Common.TRAJECTORY_DIST_MAX, Common.TRAJECTORY_DIST_STEP)
        .name("Power")
        .setValue(Common.TRAJECTORY_DIST_MIN);
    this.controllers.set("robot_power", _c);

    _c = _f.add(_e, "aim_angle", 35.0, 80.0, 3.0).name("Aim Angle")
        .onChange(
            this.cbs.on_change_robot_aim_rotation
        )
        .setValue(45.0);
    this.controllers.set("robot_aim_angle", _c);

    // _c = _f.add(_e, "shoot").name("Shoot")
    //     .onChange(
    //         this.cbs.on_change_robot_shoot
    //     );

    _c = this.create_shoot_button_html();
    this.controllers.set("robot_shoot", _c);

    _c = this.create_stats_widget(Common.CANVAS_CONTAINER_NAME_FOR_THREEJS);
    this.controllers.set("stats", _c);

    // align elements in z-index
    const zI = document.getElementById(Common.CANVAS_CONTAINER_NAME_FOR_THREEJS).style.zIndex;
    this.gui.getRoot().domElement.style.zIndex = zI;
    
    // semi-transparent gui
    Array.from(document.getElementsByClassName('dg')).forEach(
        function (element, index, array) {
            element.style.opacity = 0.85;
            element.style.zIndex = "inherit";
        }
    );
}

/**
 * Creates "Shoot" button by html5 code and attaches it to dat.gui panels
 */
InputManager.prototype.create_shoot_button_html = function () {
    // create html5 button
    const _shoot_button = document.createElement("button");

    _shoot_button.innerHTML = "Shoot";
    _shoot_button.id = "shoot_button_id";

    // IMPORTANT: attach onclick callback to handle bullet trajectory
    _shoot_button.onclick = this.cbs.on_change_robot_shoot;

    // attach to dat.gui
    const _r = this.gui.getRoot();
    _r.domElement.appendChild(_shoot_button);

    // positioning
    _shoot_button.style.position = "relative";
    _shoot_button.style.width = "55px";
    _shoot_button.style.height = "45px";
    _shoot_button.style.borderRadius = "10px";
    _shoot_button.style.borderWidth = "5px";
    _shoot_button.style.borderColor = "white";
    _shoot_button.style.fontSize = "12px";
    _shoot_button.style.fontWeight = "bold";
    _shoot_button.style.backgroundColor = "#d18773";

    // offset from parent
    _shoot_button.style.top = "70px";
    _shoot_button.style.left = "190px";

    // z-index inherited form parent
    _shoot_button.style.zIndex = "inherit"

    return _shoot_button;
}

/**
 * Creates a Stats widget located at bottom-left corner of container
 * @returns Stats object to be updated every frame
 */
InputManager.prototype.create_stats_widget = function (_container_name) {
    const _stats = new Stats();

    // positioning at bottom-left
    _stats.dom.style.position = "absolute";
    _stats.dom.style.left = "0px";
    const _t = (window.innerHeight - 50).toString() + "px";
    _stats.dom.style.top = _t;

    const _r = this.gui.getRoot();
    _r.domElement.appendChild(_stats.dom);

    // update every frame into SceneDragon.js
    // _stats.update;

    // z-index inherited from parent
    _stats.dom.style.zIndex = "inherit";

    return _stats;
}

InputManager.prototype.create_kb_controller = function () {

}

export default InputManager