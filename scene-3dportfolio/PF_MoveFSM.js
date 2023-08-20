/**
 * @module libgptjs Graphical Programming with ThreeJS (GPT)
 * @class PF_MoveFSM Finite state machine to control the move direction
 *  (forward, backward, hovering), and to trigger the appropriate updates
 * @member PF_DirState
 * @member PF_DirEvent
 */

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
 * - It will accept event only while it is at `HOVERING` state
 * - It rejects incoming-events when previous-event is not consumed yet in order to
 * avoid fast changes fw-bw-fw, bw-fw-bw
 */
PF_MoveFSM.prototype.set_input_control = function () {
    document.addEventListener("keydown",
        function (event_) {
            if (undefined !== this.pending_event) {
                return;
            }
            switch(event_.code) {
                case "ArrowUp":
                    if (this.is_forward()) {
                        // TODO: increase drone-speed positive
                    }
                    else if (this.is_hovering()) {
                        // continue
                        this.pending_event = PF_DirEvent.GO_FRONT;
                    }
                    else if (this.is_backward()) {
                        // reverse dir
                        this.pending_event = PF_DirEvent.GO_FRONT;
                    }
                    break;
                case "ArrowDown":
                    if (this.is_backward()) {
                        // TODO: increase drone-speed negative
                    }
                    else if (this.is_hovering()) {
                        // continue
                        this.pending_event = PF_DirEvent.GO_BACK;
                    }
                    else if (this.is_forward()) {
                        // reverse dir
                        this.pending_event = PF_DirEvent.GO_BACK;
                    }
                    break;
            }
        }.bind(this)
    );
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
 * - Transits between states when input-events are received (ex. "ArrowUp", "ScrollUp")
 * - Updates `prev_state` every-frame before calling `transit()`, so `prev_state` will be
 * equal to `state` most of frames except when it changes
 */
PF_MoveFSM.prototype.update_state = function () {
    this.prev_state = this.state;

    if (undefined !== this.pending_event) {
        switch (this.pending_event) {
            case PF_DirEvent.GO_HOVER:
                this.transit(PF_DirEvent.GO_HOVER);
                break;
            case PF_DirEvent.GO_FRONT:
                if (!this.cbs.target_is_last()) {
                    this.transit(PF_DirEvent.GO_FRONT);
                }
                break;
            case PF_DirEvent.GO_BACK:
                if (!this.cbs.target_is_first()) {
                    this.transit(PF_DirEvent.GO_BACK);
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
    return PF_DirState.HOVERING == this.state;
}

PF_MoveFSM.prototype.is_forward = function () {
    return PF_DirState.FORWARD == this.state;
}

PF_MoveFSM.prototype.is_backward = function () {
    return PF_DirState.BACKWARD == this.state;
}

PF_MoveFSM.prototype.prev_is_hovering = function () {
    return PF_DirState.HOVERING == this.prev_state;
}

PF_MoveFSM.prototype.prev_is_forward = function () {
    return PF_DirState.FORWARD == this.prev_state;
}

PF_MoveFSM.prototype.prev_is_backward = function () {
    return PF_DirState.BACKWARD == this.prev_state;
}

export default PF_MoveFSM;