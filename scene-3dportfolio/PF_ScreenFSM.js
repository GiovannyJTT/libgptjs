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
        SHOWING_IMAGE: Symbol("showing_image"),

        // unloading the previous texture from the panel
        DISPOSING_PREV: Symbol("disposing_prev"),

        DISPOSED_PREV: Symbol("disposed_prev"),

        // loading the new texture onto the panel
        LOADING_NEW: Symbol("loading_new"),

        LOADED_NEW: Symbol("loaded_new")
    }
);

/**
 * Events the "arcade machine - screen" must listen to in order to change properly
 */
const PF_ScreenEvent = Object.freeze(
    {
        // a change of image has started
        DISPOSE_START: Symbol("dispose_start"),
        // previous texture is fully removed from panel
        DISPOSE_END: Symbol("dispose_end"),
        // a new texture has started loading
        LOAD_START: Symbol("load_start"),
        // new texture is fully loaded onto the panel
        LOAD_END: Symbol("load_end"),
        // 1
        SHOW: Symbol("SHOW")
    }
);

const PF_ScreenTransitions = {
    // symbol as key-of-dictionary needs []
    [PF_ScreenState.SHOWING_IMAGE]: {
        [PF_ScreenEvent.DISPOSE_START]: PF_ScreenState.DISPOSING_PREV
    },

    [PF_ScreenState.DISPOSING_PREV]: {
        [PF_ScreenEvent.DISPOSED_PREV]: PF_ScreenState.DISPOSED_PREV
    },

    [PF_ScreenState.DISPOSED_PREV]: {
        [PF_ScreenEvent.LOAD_START]: PF_ScreenState.LOADING_NEW
    },

    [PF_ScreenEvent.LOADING_NEW]: {
        [PF_ScreenEvent.LOAD_END]: PF_ScreenState.LOADED_NEW
    },

    [PF_ScreenState.LOADED_NEW]: {
        [PF_ScreenEvent.SHOW]: PF_ScreenState.SHOWING_IMAGE
    }
}

class PF_ScreenFSM {
    constructor () {
        this.state = PF_ScreenState.SHOWING_IMAGE;
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
            case PF_ScreenState.SHOWING_IMAGE:
                break;
            case PF_ScreenState.DISPOSED_PREV:
                break;
            case PF_ScreenState.LOADING_NEW:
                break;
            case PF_ScreenState.LOADED_NEW:
                break;
        }

        return true;
    }
}

/**
 * 1. Updates `prev_state` every-frame before handling combination `(incoming-event, current-state)`,
 * so `prev_state` will be equal to `state` most of frames except when it changes
 * 2. Performs actions that need to be repeated every-frame depending on current state
 */
PF_ScreenFSM.prototype.update_state = function () {
    // 1. update prev_state
    this.prev_state = this.state;

    // 2. handle EVERY-FRAME actions
    switch (this.state) {
        case PF_ScreenState.SHOWING_IMAGE:
            break;
        case PF_ScreenState.DISPOSED_PREV:
            break;
        case PF_ScreenState.LOADING_NEW:
            break;
        case PF_ScreenState.LOADED_NEW:
            break;
    }    
}