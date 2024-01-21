/**
 * @module libgptjs Graphical Programming with ThreeJS (GPT)
 * @class PF_ScreenFSM Finite state machine to control the handling of swipe left or right:
 *  (unload the current texture, load the new texture, and render it onto the screen panel)
 * @member PF_ScreenState
 * @member PF_ScreenEvent
 */

/**
 * States of the "arcade machine - screen".
 * Object.freeze makes Enum objects to be immutable.
 * Symbol makes objects Enum objecst to be unique.
 */
const PF_ScreenState = Object.freeze(
    {
        // a texture was loaded onto the panel and is being shown
        SHOWING: Symbol("showing_image"),
        // unloading the previous texture from the panel
        DISPOSING: Symbol("disposing_prev"),
        DISPOSED: Symbol("disposed_prev"),
        // loading the new texture onto the panel
        LOADING: Symbol("loading_new"),
        LOADED: Symbol("loaded_new")
    }
);

/**
 * Events the "arcade machine - screen" must listen to in order to change properly
 */
const PF_ScreenEvent = Object.freeze(
    {
        // start removing previously loaded texture
        DISPOSE_START: Symbol("dispose_start"),
        // previous texture is fully removed from the screen-panel
        DISPOSE_END: Symbol("dispose_end"),
        // start loading a new texture onto the screen-panel
        LOAD_START: Symbol("load_start"),
        // new texture is fully loaded onto the screen-panel
        LOAD_END: Symbol("load_end"),
        // start showing it onto the screen-panel
        SHOW: Symbol("show"),
    }
);

const PF_ScreenTransitions = {
    // symbol as key-of-dictionary needs []

    [PF_ScreenState.SHOWING]: {
        [PF_ScreenEvent.DISPOSE_START]: PF_ScreenState.DISPOSING
    },

    [PF_ScreenState.DISPOSING]: {
        [PF_ScreenEvent.DISPOSE_END]: PF_ScreenState.DISPOSED
    },

    [PF_ScreenState.DISPOSED]: {
        [PF_ScreenEvent.LOAD_START]: PF_ScreenState.LOADING
    },

    [PF_ScreenState.LOADING]: {
        [PF_ScreenEvent.LOAD_END]: PF_ScreenState.LOADED
    },

    [PF_ScreenState.LOADED]: {
        [PF_ScreenEvent.SHOW]: PF_ScreenState.SHOWING
    }
}

class PF_ScreenFSM {
    constructor (cbs_) {
        this.cbs = cbs_
        if (undefined === this.cbs) {
            console.error("PF_ScreenFSM: external callbacks undefined");
            return;
        }

        // init
        this.state = PF_ScreenState.SHOWING;
        this.prev_state = undefined;
    }
}

/**
 * Provides the `destination-state` by checking the transition from the `current-state` with the given `event_`
 * @param {PF_DirEvent} event_ 
 * @return {PF_DirState} destination_state or undefined if transition not possible
 */
PF_ScreenFSM.prototype.get_dest_state = function (event_) {
    const _possible = PF_ScreenTransitions[this.state];
    
    if (undefined === _possible) {
        console.error("Unhandled state: " + this.state.description);
        return undefined;
    }
    else {
        const _dest = _possible[event_];
        if (undefined === _dest) {
            console.warn("Event not allowed: '" + event_.description + "' in current state '" + this.state.description + "'");
        }
        return _dest;
    }
}

/**
 * Performs 3 operations:
 * 1. Gets the destination-state from the current-state given the event_
 * 2. Sets the current-state as destination-state retrieved
 * 3. Triggers initial-action needed to be done once at beginning of a state: timer / values / actions
 * @param {PF_ScreenEvent} event_ 
 * @return {Bool} true transited properly (`current_state` is now `destination_state`), false otherwise (`current_state` not updated)
 */
PF_ScreenFSM.prototype.transit = function (event_) {
    console.debug("current state: " + this.state.description);
    console.debug("input_event: " + event_.description);

    const _dest = this.get_dest_state(event_);
    if (undefined === _dest) {
        return false;
    }
    else {
        this.state = _dest;
        console.debug("destination_state: " + this.state.description);

        // ONLY ONCE ACTIONS
        switch (this.state) {
            case PF_ScreenState.SHOWING:
                if (this.prev_is_loaded()) {
                    this.cbs.on_loaded_to_showing();
                }
                break;
            case PF_ScreenState.DISPOSING:
                if (this.prev_is_showing()) {
                    this.cbs.on_showing_to_disposing();
                }
                break;
            case PF_ScreenState.DISPOSED:
                if (this.prev_is_disposing()) {
                    this.cbs.on_disposing_to_disposed();
                }
                break;
            case PF_ScreenState.LOADING:
                if (this.prev_is_disposed()) {
                    this.cbs.on_disposed_to_loading();
                }
                break;
            case PF_ScreenState.LOADED:
                if (this.prev_is_loading()) {
                    this.cbs.on_loading_to_loaded();
                }
                break;
        }

        return true;
    }
}

/**
 * 1. Updates `prev_state` every frame before handling combination `(incoming-event, current-state)`,
 * so `prev_state` will be equal to `state` most of frames except when it changes
 * 2. Performs actions that need to be repeated every-frame depending on current state (PER-FRAME actions)
 * 3. Handles the combination `(incoming-event, current-state)`
 */
PF_ScreenFSM.prototype.update_state = function () {
    // 1. update prev_state
    this.prev_state = this.state;

    // 2. handle PER-FRAME actions
    switch (this.state) {
        case PF_ScreenState.SHOWING:
            break;
        case PF_ScreenState.DISPOSING:
            break;
        case PF_ScreenState.DISPOSED:
            break;
        case PF_ScreenState.LOADING:
            break;
        case PF_ScreenState.LOADED:
            break;
    }

    // 3. handle (incoming-event, current-state)
    if (undefined !== this.pending_event) {
        this.transit(this.pending_event);
        // consume event
        this.pending_event = undefined;
    }
}

PF_ScreenFSM.prototype.prev_is_showing = function () {
    return this.prev_state == PF_ScreenState.SHOWING;
}

PF_ScreenFSM.prototype.prev_is_disposing = function () {
    return this.prev_state == PF_ScreenState.DISPOSING;
}

PF_ScreenFSM.prototype.prev_is_disposed = function () {
    return this.prev_state == PF_ScreenState.DISPOSED;
}

PF_ScreenFSM.prototype.prev_is_loading = function () {
    return this.prev_state == PF_ScreenState.LOADING;
}

PF_ScreenFSM.prototype.prev_is_loaded = function () {
    return this.prev_state == PF_ScreenState.LOADED;
}

PF_ScreenFSM.prototype.curr_is_showing = function () {
    return this.state == PF_ScreenState.SHOWING;
}

PF_ScreenFSM.prototype.curr_is_disposing = function () {
    return this.state == PF_ScreenState.DISPOSING;
}

PF_ScreenFSM.prototype.curr_is_disposed = function () {
    return this.state == PF_ScreenState.DISPOSED;
}

PF_ScreenFSM.prototype.curr_is_loading = function () {
    return this.state == PF_ScreenState.LOADING;
}

PF_ScreenFSM.prototype.curr_is_loaded = function () {
    return this.state == PF_ScreenState.LOADED;
}

export default PF_ScreenFSM