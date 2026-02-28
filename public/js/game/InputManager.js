// ========================================
// INPUT MANAGER
// Tracks keyboard and mouse state
// ========================================

export class InputManager {
    constructor() {
        // Keyboard state
        this.keys = new Map();

        // Mouse button state
        this.mouseButtons = new Map();

        // Mouse movement delta (accumulated between frames)
        this.mouseDeltaX = 0;
        this.mouseDeltaY = 0;

        // Bind handlers so we can remove them later
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);
        this._onMouseDown = this._onMouseDown.bind(this);
        this._onMouseUp = this._onMouseUp.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onContextMenu = this._onContextMenu.bind(this);

        // Register listeners
        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup', this._onKeyUp);
        document.addEventListener('mousedown', this._onMouseDown);
        document.addEventListener('mouseup', this._onMouseUp);
        document.addEventListener('mousemove', this._onMouseMove);
        document.addEventListener('contextmenu', this._onContextMenu);
    }

    _onKeyDown(event) {
        this.keys.set(event.code, true);
    }

    _onKeyUp(event) {
        this.keys.set(event.code, false);
    }

    _onMouseDown(event) {
        this.mouseButtons.set(event.button, true);
    }

    _onMouseUp(event) {
        this.mouseButtons.set(event.button, false);
    }

    _onMouseMove(event) {
        this.mouseDeltaX += event.movementX || 0;
        this.mouseDeltaY += event.movementY || 0;
    }

    _onContextMenu(event) {
        // Prevent right-click context menu during gameplay
        event.preventDefault();
    }

    /**
     * Check if a key is currently held down.
     * @param {string} code - KeyboardEvent.code (e.g. 'KeyW', 'ShiftLeft')
     */
    isKeyDown(code) {
        return this.keys.get(code) === true;
    }

    /**
     * Check if a mouse button is currently held down.
     * @param {number} button - 0=left, 1=middle, 2=right
     */
    isMouseDown(button) {
        return this.mouseButtons.get(button) === true;
    }

    /**
     * Get accumulated mouse movement since last call.
     * Resets the delta after reading.
     */
    getMouseDelta() {
        const dx = this.mouseDeltaX;
        const dy = this.mouseDeltaY;
        this.mouseDeltaX = 0;
        this.mouseDeltaY = 0;
        return { x: dx, y: dy };
    }

    /**
     * Called each frame. Currently resets are handled in getMouseDelta,
     * but this is here for future per-frame cleanup.
     */
    update() {
        // No-op for now -- deltas are reset when consumed via getMouseDelta
    }

    /**
     * Clean up all event listeners.
     */
    dispose() {
        document.removeEventListener('keydown', this._onKeyDown);
        document.removeEventListener('keyup', this._onKeyUp);
        document.removeEventListener('mousedown', this._onMouseDown);
        document.removeEventListener('mouseup', this._onMouseUp);
        document.removeEventListener('mousemove', this._onMouseMove);
        document.removeEventListener('contextmenu', this._onContextMenu);
    }
}
