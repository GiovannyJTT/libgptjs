/**
 * @module libgptjs Graphical Programming with ThreeJS (GPT)
 * @class PF_MoveFSM Finite state machine to control the move direction
 *  (forward, backward, hovering), and to trigger the appropriate updates
 * @member PF_DirState
 * @member PF_DirEvent
 */

import PF_Common from "./PF_Common";
import { lerp } from "three/src/math/MathUtils";

/**
 * States of the "drone movement / direction".
 * Object.freeze makes Enum objects to be immutable.
 * Symbol makes objects Enum objecst to be unique.
 */
const PF_DirState = Object.freeze(
    {
        // Flying and stying at the same position (propellers rotating)
        HOVERING: Symbol("hovering"),

        // Moving fordward to the next point (pointing drone-nose to it)
        FORWARD: Symbol("forward"),

        // Moving backward to the previous point (pointing drone-back to it, not nose)
        BACKWARD: Symbol("backward"),
    }
);

/**
 * Events the "drone movement" must listen to in order to change properly
 */
const PF_DirEvent = Object.freeze(
    {
        // User wants to move forward: "ArrowUp" pressed or "scroll-up" captured
        GO_FRONT: Symbol("go_forward"),

        // User wants to move backward: "ArrowDown" pressed or "scroll-down" captured
        GO_BACK: Symbol("go_backward"),

        // User wants to stop and hover: "Space" pressed or "click" captured
        GO_HOVER: Symbol("go_hover")
    }
);

const PF_DirTransitions = {
    // symbol as key-of-dictionary needs []
    [PF_DirState.HOVERING]: {
        [PF_DirEvent.GO_FRONT]: PF_DirState.FORWARD,
        [PF_DirEvent.GO_BACK]: PF_DirState.BACKWARD
    },

    [PF_DirState.FORWARD]: {
        [PF_DirEvent.GO_BACK]: PF_DirState.BACKWARD,
        [PF_DirEvent.GO_HOVER]: PF_DirState.HOVERING
    },

    [PF_DirState.BACKWARD]: {
        [PF_DirEvent.GO_FRONT]: PF_DirState.FORWARD,
        [PF_DirEvent.GO_HOVER]: PF_DirState.HOVERING
    }
}

class PF_MoveFSM {
    /**
     * - Finite state machine for drone-movement
     * - Initial state is `HOVERING`
     * @param {Dictionary} cbs_ dictionary containing callbacks to be called on_changed state
     * @property {PF_DirState} state current state
     * @property {PF_DirState} prev_state in previous frame
     * @property {PF_DirEvent} pending_event user-input event just captured, converte into a PF_DirEvent
     * and ready to be consumed by the state-machine update method
     * @property {Int} PX_PER_SEGMENT number of pixels corresponding to a segment between 2 points3D on the spline-curve
     * @property {Int} TOTAL_POINTS3D total number of points that form the spline-curve
     * @property {Float} SCROLL_INTERP_FACTOR_WHEN_DRONE_MOVING factor value to scroll up or down every frame while the drone is moving. Value of 0.25
     * is responsible enough but will miss some px to reach `goal_scroll`
     * @property {Float} SCROLL_INTERP_FACTOR_WHEN_DRONE_HOVERING factor value to complete the scroll to match the `goal_scroll` smoothly. Value of 0.08
     * is good to appreciate the smooth end and being fast enough
     */
    constructor (cbs_) {
        this.cbs = cbs_;
        if (undefined === this.cbs) {
            console.error("PF_MoveFSM: external callbacks 'cbs' is undefined");
            return;
        }

        // drone-move current and prev state
        this.state = PF_DirState.HOVERING;
        this.prev_state = undefined;
        
        // set user input events handling
        this.pending_event = undefined;
        this.set_input_control();

        this.PX_PER_SEGMENT = Math.floor(PF_Common.CONTAINER_HTML_HEIGHT_MAX_PX / PF_Common.FPATH_SPLINE_NUM_SEGMENTS);
        this.TOTAL_POINTS3D = PF_Common.FPATH_SPLINE_NUM_SEGMENTS + 1;
        this.SCROLL_INTERP_FACTOR_WHEN_DRONE_MOVING = 0.25;
        this.SCROLL_INTERP_FACTOR_WHEN_DRONE_HOVERING = 0.08;
    }
}

/**
 * 1. Disables user input events (zoom, scroll, copy, drag, etc.)
 * 2. Sets initial window values (scroll to 0,0)
 * 3. Installs our own handle of scroll up / down.
 * 4. We are scrolling the webpage based on current drone position on the flight-path (spline-curve)
 * @property {Float} sampling_period_ms 1000/60, used as period to capture the user-input-events (mobile or pc)
 * @property {Float} prevTS_sampling time stamp in milliseconds captured in the previous frame
 */
PF_MoveFSM.prototype.set_input_control = function () {
    this.disable_user_events();

    // scroll to top when loading / refreshing page
    window.onbeforeunload = function () {
        window.scrollTo(0, 0);
    }

    // 60 fps, period 16.6 ms, user-input sampling_period_ms
    this.sampling_period_ms = 1000 / 60;
    this.prevTS_sampling = performance.now();
    if (this.is_mobile_device()) {
        this.set_handle_input_mobile();
    }
    else {
        this.set_handle_input_pc();
    }
}

/**
 * Config user-input events allowed / blocked in mobile and pc
 * 1. Disable right click
 * 2. Disable text selection
 * 3. Disable text copy
 * 4. Disable text cut
 * 5. Disable text paste
 * 6. Disable items drag
 * 7. Disable items drop
 * 8. Disable zoom on pc: Ctrl + numpad
 * 9. Disable zoom on pc: Ctrl + wheel
 * 10. Disable zoom on mobile: meta viewport
 * 11. Disable scroll on pc and mobile: overflow hidden
 * 12. Trigger window.resize so webgl will update canvas-size to fill the removed-scroll-bar
 */
PF_MoveFSM.prototype.disable_user_events = function () {
    // disable right-click
    document.body.oncontextmenu = function (e_) {return false;}
    // disable selection
    document.body.onselectstart = function (e_) {return false;}
    // disable copy
    document.body.oncopy = function (e_) {return false;}
    // disable cut
    document.body.oncut = function (e_) {return false;}
    // disable paste
    document.body.onpaste = function (e_) {return false;}
    // disable items drag
    document.body.ondragstart = function (e_) {return false;}
    // disable items drop
    document.body.ondrop = function(e_) {return false;}

    // disable zoom on pc: Ctrl + numpad
    document.body.addEventListener("keydown",
        function (e_) {
            // ctrl-pressed and keydown-event
            if (e_.ctrlKey) {
                if (// numpad-subtract
                    e_.code == "NumpadSubtract" ||
                    // numpad-add
                    e_.code == "NumpadAdd" ||
                    // minus in the middle of keyboard
                    e_.code == "BracketRight" ||
                    // plus in the middle of keyboard
                    e_.code == "Slash") {
                    e_.preventDefault();
                }
            }
        }
    );

    // disable zoom on pc: Ctrl + wheel
    document.body.addEventListener(
        "wheel",
        function (e_) {
            // ctrl-pressed and wheel-event
            if (e_.ctrlKey) {
                e_.preventDefault();
            }
        },
        // needs passive false because we are calling preventDefault
        {passive: false}
    );

    // disable zoom on mobile
    const vp = document.getElementById("html_viewport_id");
    vp.setAttribute("content",
        "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0");

    // disable scroll on mobile and pc
    document.body.style.overflow = "hidden";
    document.body.style.userSelect = "none";

    // trigger window.resize so webgl will update canvas-size to fill the removed-scroll-bar
    setTimeout(
        () => { window.dispatchEvent(new Event('resize')); },
        100);
}

/**
 * - Installs callback to handle "touchmove" event on mobile
 * - Events will be rejected when previous is not consumed yet and depending on sampling rate to avoid bursts
 * - A new pending_envet will be enqueued to be consumed by the state machine
 * @property {Int} ini_touch_pos_y clientY value captured when starting the move
 * @property {Int} prev_touch_pos_y clientY value on the previous frame to detect moving up or down
 * @property {Float} min_delta min amount of pixels needed to consider to move trigger a move on the
 * drone. Value of `window.innerHeight/40` works smooth for most mobile screens
 */
PF_MoveFSM.prototype.set_handle_input_mobile = function () {
    this.ini_touch_pos_y = undefined; // on touch-start
    this.prev_touch_pos_y = undefined; // every touch-move
    this.min_delta = (window.innerHeight / 40); // 1/40 works smooth for most mobile-screens

    // mobile: capture touch-movements
    document.body.addEventListener(    
        "touchmove",
        function (event_) {
            if (!this.check_accept_event()) {
                return;
            }

            const new_pos_y = event_.changedTouches[0].clientY;
            const scrolling_up = (new_pos_y < this.ini_touch_pos_y);

            // reject when not enough delta
            let d = undefined;
            if (scrolling_up) {
                d = this.prev_touch_pos_y - new_pos_y;
            }
            else {
                d = new_pos_y - this.prev_touch_pos_y;
            }
            if (d <= this.min_delta) {
                return;
            }

            // delta accepted
            this.prev_touch_pos_y = new_pos_y;

            // move fw or bw
            if (scrolling_up) {
                this.pending_event = PF_DirEvent.GO_FRONT;
            }
            else {
                this.pending_event = PF_DirEvent.GO_BACK;
            }
        }.bind(this)
    );

    document.body.addEventListener("touchstart",
        function (event_) {
            this.ini_touch_pos_y = event_.changedTouches[0].clientY;
            this.prev_touch_pos_y = this.ini_touch_pos_y;
            console.debug(event_);
        }.bind(this)
    );
}

/**
 * - Installs callback to handle mouse "wheel" event on pc
 * - Events will be rejected when previous is not consumed yet and depending on sampling rate to avoid bursts
 * - A new pending_envet will be enqueued to be consumed by the state machine
 * - "wheel" event contains deltaY which value is 100 when wheel moved forward and -100 when moved backward
 */
PF_MoveFSM.prototype.set_handle_input_pc = function () {
    document.addEventListener("wheel",
        function (event_) {
            if (!this.check_accept_event()){
                return;
            }
            
            if (event_.deltaY > 0) {
                this.pending_event = PF_DirEvent.GO_FRONT;
            }
            else if (event_.deltaY < 0) {
                this.pending_event = PF_DirEvent.GO_BACK;
            }
        }.bind(this)
    );
}

/**
 * @returns true when no pending event and sampling rate is reached, false otherwise
 */
PF_MoveFSM.prototype.check_accept_event = function () {
    // reject: prev pending event being handled
    if (undefined !== this.pending_event) {
        return false;
    }

    // reject: avoid burst of events
    const elapsed = performance.now() - this.prevTS_sampling;
    if (elapsed < this.sampling_period_ms) {
        return false;
    }

    // accept and update time-stamp
    this.prevTS_sampling = performance.now();
    return true;
}

/**
 * @returns {Bool} true is mobile (android, etc), false when is desktop
 */
PF_MoveFSM.prototype.is_mobile_device = function () {
    let check = false;

    // https://stackoverflow.com/questions/11381673/detecting-a-mobile-browser
    (function (a) { if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true; })(navigator.userAgent || navigator.vendor || window.opera);

    return check;
}

/**
 * Scrolls-UP the page depending on the current drone position along the spline-curve while it is `moving forward`
 * @param {Int} i_target current point3D the drone is moving from towards the i_next (forward)
 * @param {Float} target_interp_elapsed factor interpolated between current i_target and i_next points
 * @property {Float} travelled factor [0, 1] that reflects the amount of points the drone has already travelled on the entire spline-curve
 * @property {Int} page_scroll number of pixels to be scrolled from top (y=0) based on the amount of points the drone has already travelled
 * @property {Int} section_scroll number of pixels to be scrolled based on current drone-position moving into the segment (between i_target and i_next)
 * @property {Int} target_scroll total pixels to be scrolled: `page_scroll + section_scroll`
 * @property {Int} i_scroll per-frame approximation to the target_scroll. Using interpolation for smooth displacement with factor SCROLL_INTERPOLATION_FACTOR
 */
PF_MoveFSM.prototype.scrollup_page_on_drone_fw = function (i_target, target_interp_elapsed) {
    const travelled = i_target / this.TOTAL_POINTS3D;
    const page_scroll = Math.floor(travelled * PF_Common.CONTAINER_HTML_HEIGHT_MAX_PX);
    const section_scroll = target_interp_elapsed * this.PX_PER_SEGMENT;
    this.goal_scroll = page_scroll + section_scroll;
    const i_scroll = lerp(document.documentElement.scrollTop, this.goal_scroll, this.SCROLL_INTERP_FACTOR_WHEN_DRONE_MOVING);
    window.scrollTo(0, i_scroll);
}

/**
 * Scrolls-DOWN the page depending on the current drone position along the spline-curve while it is `moving backward`
 * @param {Int} i_target current point3D the drone is moving from towards the i_next (backward)
 * @param {Float} target_interp_elapsed factor interpolated between current i_target and i_next points
 * @property {Float} travelled factor [0, 1] that reflects the amount of points the drone has already travelled on the entire spline-curve
 * @property {Int} page_scroll number of pixels to be scrolled from top (y=0) based on the amount of points the drone has already travelled
 * @property {Int} section_scroll number of pixels to be scrolled based on current drone-position moving into the segment (between i_target and i_next)
 * @property {Int} target_scroll total pixels to be scrolled: `page_scroll - section_scroll`
 * @property {Int} i_scroll per-frame approximation to the target_scroll. Using interpolation for smooth displacement with factor SCROLL_INTERPOLATION_FACTOR
 */
PF_MoveFSM.prototype.scrolldown_page_on_drone_bw = function (i_target, target_interp_elapsed) {
    const travelled = i_target / this.TOTAL_POINTS3D;
    const page_scroll = travelled * PF_Common.CONTAINER_HTML_HEIGHT_MAX_PX;
    const section_scroll = target_interp_elapsed * this.PX_PER_SEGMENT;
    this.goal_scroll = page_scroll - section_scroll;
    const i_scroll = lerp(document.documentElement.scrollTop, this.goal_scroll, this.SCROLL_INTERP_FACTOR_WHEN_DRONE_MOVING);
    window.scrollTo(0, i_scroll);
}

/**
 * It completes scrolling the page to match `goal_scroll` value smoothly by completing the interpolation while drone is in `hovering`
 */
PF_MoveFSM.prototype.scrollend_smooth_on_drone_hovering = function () {
    if (document.documentElement.scrollTop !== this.goal_scroll) {
        const i_scroll = lerp(document.documentElement.scrollTop, this.goal_scroll, this.SCROLL_INTERP_FACTOR_WHEN_DRONE_HOVERING);
        window.scrollTo(0, i_scroll);
    }
}

/**
 * Provides the `destination-state` by checking the transition from the `current-state` with the given `event_`
 * @param {PF_DirEvent} event_ 
 * @return {PF_DirState} destination_state or undefined if transition not possible
 */
PF_MoveFSM.prototype.get_dest_state = function (event_) {
    // get possible transitions from current state
    const _posible = PF_DirTransitions[this.state];

    if (undefined === _posible) {
        console.error("Unhandled state: " + this.state.description);
        return undefined;
    }
    else {
        // get destination-state using the event_
        const _dest = _posible[event_];
        if (undefined === _dest) {
            console.warn("Event not allowed: " + event_.description + "' in current state '" + this.state.description + "'");
        }
        return _dest;
    }
}

/**
 * Performs 3 operations:
 * 1. Gets the destination-state from the current-state given the event_
 * 2. Sets the current-state as destination-state retrieved
 * 3. Starts the corresponding timer / values / actions that need to be done only once at beginning of each state
 * @param {R_Events} event_ 
 * @return {Bool} true transited properly (`current_state` is now `destination_state`), false otherwise (`current_state` not updated)
 */
PF_MoveFSM.prototype.transit = function (event_) {
    console.debug("current_state: " + this.state.description);
    console.debug("input_event: " + event_.description);

    const _dest = this.get_dest_state(event_);
    if (undefined === _dest) {
        return false;
    }
    else {
        this.state = _dest;
        console.debug("destination_state: " + this.state.description);

        // ONLY-ONCE ACTIONS: when an specific state starts then start timers / values / actions depending on state 
        switch (this.state) {
            case PF_DirState.HOVERING:
                if (this.prev_is_forward()) {
                    this.cbs.on_forward_to_hovering();
                }
                else if (this.prev_is_backward()) {
                    this.cbs.on_backward_to_hovering();
                }
                break;
            case PF_DirState.FORWARD:
                if (this.prev_is_backward()){
                    this.cbs.on_backward_to_forward();
                }
                else if (this.prev_is_hovering()) {
                    this.cbs.on_hovering_to_forward();
                }
                break;
            case PF_DirState.BACKWARD:
                if (this.prev_is_forward()) {
                    this.cbs.on_forward_to_backward();
                }
                else if (this.prev_is_hovering()) {
                    this.cbs.on_hovering_to_backward();
                }
                break;
        }

        return true;
    }
}

/**
 * - 1. Updates `prev_state` every-frame before handling combination `(incoming-event, current-state)`,
 * so `prev_state` will be equal to `state` most of frames except when it changes
 * - 2. Performs actions that need to be repeated every-frame depending on current state
 * - 3. Handles the combination `(incoming-event, current-state)`.
 *      - `set_speed_faster` when incoming-event is `GO_FRONT` and current-state is `FORWARD`
 *      - `set_speed_faster` when incoming-event is `GO_BACK` and current-state is `BACKWARD`
 * - 4. Triggers state-transition `(current-drone-position, incoming-event)`
 *      - NOTE: depending on conditions some incomin-events can be rejected and transition will no be triggered
 */
PF_MoveFSM.prototype.update_state = function () {
    // 1. update prev_state
    this.prev_state = this.state;

    // 2. handle every-frame actioons
    switch (this.state) {
        case PF_DirState.HOVERING:
            if (!PF_Common.is_speed_normal()) {
                PF_Common.set_speed_slower();
            }
            break;
        case PF_DirState.FORWARD:
            break;
        case PF_DirState.BACKWARD:
            break;
    }

    // 3. handle (incoming-event, current-state)
    if (undefined !== this.pending_event) {
        switch (this.pending_event) {
            case PF_DirEvent.GO_HOVER: // state-machine event
                // 4. transit
                // this event is triggered by the state-machine when interpolation completed
                this.transit(PF_DirEvent.GO_HOVER);
                break;
            case PF_DirEvent.GO_FRONT: // user event
                if (this.is_forward()) {
                    PF_Common.set_speed_faster();
                }
                else if (this.is_backward()) {
                    // reverse direction
                    if (!this.cbs.target_is_last()) {
                        this.transit(PF_DirEvent.GO_FRONT);
                    }
                }
                else if (this.is_hovering()) {
                    // continue direction
                    if (!this.cbs.target_is_last()) {
                        this.transit(PF_DirEvent.GO_FRONT);
                    }
                }
                break;
            case PF_DirEvent.GO_BACK: // user event
                if (this.is_backward()) {
                    PF_Common.set_speed_faster();
                }
                else if (this.is_forward()) {
                    // reverse direction
                    if (!this.cbs.target_is_first()) {
                        this.transit(PF_DirEvent.GO_BACK);
                    }
                }
                else if (this.is_hovering()) {
                    // continue direction
                    if (!this.cbs.target_is_first()) {
                        this.transit(PF_DirEvent.GO_BACK);
                    }
                }
                break;
        }
        // consume it
        this.pending_event = undefined;
    }
}

PF_MoveFSM.prototype.trigger_go_hover = function () {
    this.pending_event = PF_DirEvent.GO_HOVER;
    console.debug("Externally triggered event: " + this.pending_event.description);
}

PF_MoveFSM.prototype.state_has_changed = function () {
    return this.prev_state != this.state;
}

PF_MoveFSM.prototype.is_hovering = function () {
    return this.state == PF_DirState.HOVERING;
}

PF_MoveFSM.prototype.is_forward = function () {
    return this.state == PF_DirState.FORWARD;
}

PF_MoveFSM.prototype.is_backward = function () {
    return this.state == PF_DirState.BACKWARD;
}

PF_MoveFSM.prototype.prev_is_hovering = function () {
    return this.prev_state == PF_DirState.HOVERING;
}

PF_MoveFSM.prototype.prev_is_forward = function () {
    return this.prev_state == PF_DirState.FORWARD;
}

PF_MoveFSM.prototype.prev_is_backward = function () {
    return this.prev_state == PF_DirState.BACKWARD;
}

export default PF_MoveFSM;