/**
 * InputManager - Unified touch/mouse/keyboard input
 * Ported from Game/Scripts/UI/TouchInputSystem.gd
 */
export class InputManager {
    constructor(canvas, engine) {
        this.engine = engine;
        this.canvas = canvas;

        // Mouse / touch state
        this.pointerDown = false;
        this.pointerJustPressed = false;
        this.pointerJustReleased = false;
        this.pointerPos = { x: 0, y: 0 };
        this.pointerStartPos = { x: 0, y: 0 };
        this.pointerDelta = { x: 0, y: 0 };
        this.isDragging = false;
        this.dragThreshold = 10;

        // Tap detection
        this._tapStartTime = 0;
        this._tapMaxDuration = 300; // ms

        // Keyboard state
        this._keys = {};
        this._keysJustPressed = {};
        this._keysJustReleased = {};

        // Swipe detection
        this.swipeDirection = null;
        this._swipeMinDistance = 50;

        // Virtual D-pad state (set by mobile controls)
        this._virtualDpadDir = { x: 0, y: 0 };

        this._bindEvents();
    }

    _bindEvents() {
        // Pointer events (unified mouse + touch)
        this.canvas.addEventListener('pointerdown', (e) => this._onPointerDown(e));
        this.canvas.addEventListener('pointermove', (e) => this._onPointerMove(e));
        this.canvas.addEventListener('pointerup', (e) => this._onPointerUp(e));
        this.canvas.addEventListener('pointercancel', (e) => this._onPointerUp(e));

        // Prevent context menu on long press
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Keyboard
        window.addEventListener('keydown', (e) => {
            if (!this._keys[e.code]) {
                this._keysJustPressed[e.code] = true;
            }
            this._keys[e.code] = true;
        });

        window.addEventListener('keyup', (e) => {
            this._keys[e.code] = false;
            this._keysJustReleased[e.code] = true;
        });

        // Prevent default touch behaviors
        this.canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    }

    _onPointerDown(e) {
        this.pointerDown = true;
        this.pointerJustPressed = true;
        const pos = this.engine.getMousePos(e.clientX, e.clientY);
        this.pointerPos = pos;
        this.pointerStartPos = { ...pos };
        this.pointerDelta = { x: 0, y: 0 };
        this.isDragging = false;
        this._tapStartTime = performance.now();
    }

    _onPointerMove(e) {
        const pos = this.engine.getMousePos(e.clientX, e.clientY);
        if (this.pointerDown) {
            this.pointerDelta.x = pos.x - this.pointerPos.x;
            this.pointerDelta.y = pos.y - this.pointerPos.y;
            const dist = Math.hypot(pos.x - this.pointerStartPos.x, pos.y - this.pointerStartPos.y);
            if (dist > this.dragThreshold) {
                this.isDragging = true;
            }
        }
        this.pointerPos = pos;
    }

    _onPointerUp(e) {
        this.pointerDown = false;
        this.pointerJustReleased = true;

        // Detect swipe
        const dx = this.pointerPos.x - this.pointerStartPos.x;
        const dy = this.pointerPos.y - this.pointerStartPos.y;
        const dist = Math.hypot(dx, dy);

        if (dist > this._swipeMinDistance) {
            if (Math.abs(dx) > Math.abs(dy)) {
                this.swipeDirection = dx > 0 ? 'right' : 'left';
            } else {
                this.swipeDirection = dy > 0 ? 'down' : 'up';
            }
        }

        this.isDragging = false;
    }

    // --- Query methods ---

    isPressed() { return this.pointerDown; }
    justPressed() { return this.pointerJustPressed; }
    justReleased() { return this.pointerJustReleased; }

    isTap() {
        return this.pointerJustReleased &&
               !this.isDragging &&
               (performance.now() - this._tapStartTime) < this._tapMaxDuration;
    }

    getSwipe() {
        const dir = this.swipeDirection;
        this.swipeDirection = null;
        return dir;
    }

    isKeyDown(code) { return !!this._keys[code]; }
    isKeyJustPressed(code) { return !!this._keysJustPressed[code]; }
    isKeyJustReleased(code) { return !!this._keysJustReleased[code]; }

    // Directional helpers (arrow keys, WASD, or virtual D-pad)
    getDirection() {
        let dx = this._virtualDpadDir.x, dy = this._virtualDpadDir.y;
        if (this._keys['ArrowLeft'] || this._keys['KeyA']) dx -= 1;
        if (this._keys['ArrowRight'] || this._keys['KeyD']) dx += 1;
        if (this._keys['ArrowUp'] || this._keys['KeyW']) dy -= 1;
        if (this._keys['ArrowDown'] || this._keys['KeyS']) dy += 1;
        return { x: Math.max(-1, Math.min(1, dx)), y: Math.max(-1, Math.min(1, dy)) };
    }

    // Set the virtual D-pad direction (called by mobile controls)
    setVirtualDpadDirection(x, y) {
        this._virtualDpadDir = { x, y };
    }

    // Simulate a key press for one frame (used by mobile interact button)
    triggerVirtualButton(buttonName) {
        this._keysJustPressed[buttonName] = true;
        this._keys[buttonName] = true;
        // Auto-release next frame
        setTimeout(() => {
            this._keys[buttonName] = false;
            this._keysJustReleased[buttonName] = true;
        }, 100);
    }

    // Check if point is within a rectangle
    isPointerInRect(x, y, w, h) {
        return this.pointerPos.x >= x && this.pointerPos.x <= x + w &&
               this.pointerPos.y >= y && this.pointerPos.y <= y + h;
    }

    endFrame() {
        this.pointerJustPressed = false;
        this.pointerJustReleased = false;
        this.pointerDelta = { x: 0, y: 0 };
        this._keysJustPressed = {};
        this._keysJustReleased = {};
    }
}
