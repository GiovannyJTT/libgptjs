/**
 * @module libgptjs Graphical Programming with ThreeJS (GPT)
 * @class PF_MoveFSM Finite state machine to control the move direction
 *  (forward, backward, hovering), and to trigger the appropriate updates
 * @member PF_DirState
 * @member PF_DirEvent
 */

import PF_Common from "./PF_Common";

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
     * - Finite state machine for drone-movementç
     * - Initial state is `HOVERING`
     * @param {Dictionary} cbs_ dictionary containing callbacks to be called on_changed state
     */
    constructor (cbs_) {
        this.cbs = cbs_;
        if (undefined === this.cbs) {
            console.error("PF_MoveFSM: external callbacks 'cbs' is undefined");
            return;
        }

        this.state = PF_DirState.HOVERING;
        this.prev_state = undefined;
        this.pending_event = undefined;

        this.set_input_control();
    }
}

/**
 * - Configures the capturing of input events
 * - It rejects incoming-events when previous-event is not consumed yet in order to
 * avoid fast changes fw-bw-fw, bw-fw-bw, in 2 frames
 */
PF_MoveFSM.prototype.set_input_control = function () {
    // Config user-input events allowed / blocked
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
    // disable body scroll
    document.body.onwheel = function(e_) {return false;}
    // disable zoom on mobile
    const vp = document.getElementById("html_viewport_id");
    vp.setAttribute("content", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0")

    // scroll to top when loading / refreshing page
    window.onbeforeunload = function () {
        window.scrollTo(0, 0);
    }

    // Config input-events to move the drone
    this.prev_scroll_top = 0;
    // 60 fps, period 16.6 ms, user-input sampling_period_ms 16.6 * 3 (49.8 ms)
    this.sampling_period_ms = 16.6;

    this.prevTS = performance.now();
    if (this.is_mobile_device()) {
        this.set_handle_input_mobile();
    }
    else {
        this.set_handle_input_pc();
    }
}

PF_MoveFSM.prototype.set_handle_input_mobile = function () {
    // mobile: capture touch-movements
    document.addEventListener(    
        "touchmove",
        function (event_) {
            if (!this.check_accept_event()) {
                return;
            }

            const st = document.documentElement.scrollTop;
            if (st > this.prev_scroll_top) {
                this.pending_event = PF_DirEvent.GO_FRONT;
            }
            else if (st < this.prev_scroll_top) {
                this.pending_event = PF_DirEvent.GO_BACK;
            }
            // update because the element was scrolled anyways
            this.prev_scroll_top = st;
        }.bind(this)
    );
}

PF_MoveFSM.prototype.set_handle_input_pc = function () {
    // pc: capture from keyboard and mousewheel
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
PF_MoveFSM.prototype.check_accept_event = function () {
    // reject: prev pending event being handled
    if (undefined !== this.pending_event) {
        return false;
    }

    // reject: avoid burst of events
    const elapsed = performance.now() - this.prevTS;
    if (elapsed < this.sampling_period_ms) {
        return false;
    }

    // accept and update time-stamp
    this.prevTS = performance.now();
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