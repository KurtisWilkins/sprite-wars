/**
 * Renderer - 2D Canvas rendering utilities
 * Replaces Godot's CanvasItem / draw_* functions
 */
export class Renderer {
    constructor(ctx, engine) {
        this.ctx = ctx;
        this.engine = engine;
        this._camera = { x: 0, y: 0 };
    }

    get camera() { return this._camera; }

    setCamera(x, y) {
        this._camera.x = x;
        this._camera.y = y;
    }

    // --- Drawing primitives ---

    clear(color = '#000000') {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(0, 0, this.engine.designWidth, this.engine.designHeight);
    }

    drawImage(image, x, y, w, h) {
        if (!image || !image.complete) return;
        const dx = x - this._camera.x;
        const dy = y - this._camera.y;
        if (w !== undefined && h !== undefined) {
            this.ctx.drawImage(image, dx, dy, w, h);
        } else {
            this.ctx.drawImage(image, dx, dy);
        }
    }

    drawImageRaw(image, x, y, w, h) {
        if (!image || !image.complete) return;
        if (w !== undefined && h !== undefined) {
            this.ctx.drawImage(image, x, y, w, h);
        } else {
            this.ctx.drawImage(image, x, y);
        }
    }

    drawSprite(image, sx, sy, sw, sh, dx, dy, dw, dh) {
        if (!image || !image.complete) return;
        this.ctx.drawImage(image,
            sx, sy, sw, sh,
            dx - this._camera.x, dy - this._camera.y, dw, dh
        );
    }

    drawSpriteRaw(image, sx, sy, sw, sh, dx, dy, dw, dh) {
        if (!image || !image.complete) return;
        this.ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
    }

    drawRect(x, y, w, h, color, fill = true) {
        const dx = x - this._camera.x;
        const dy = y - this._camera.y;
        if (fill) {
            this.ctx.fillStyle = color;
            this.ctx.fillRect(dx, dy, w, h);
        } else {
            this.ctx.strokeStyle = color;
            this.ctx.strokeRect(dx, dy, w, h);
        }
    }

    drawRectRaw(x, y, w, h, color, fill = true) {
        if (fill) {
            this.ctx.fillStyle = color;
            this.ctx.fillRect(x, y, w, h);
        } else {
            this.ctx.strokeStyle = color;
            this.ctx.strokeRect(x, y, w, h);
        }
    }

    drawCircle(x, y, radius, color, fill = true) {
        const dx = x - this._camera.x;
        const dy = y - this._camera.y;
        this.ctx.beginPath();
        this.ctx.arc(dx, dy, radius, 0, Math.PI * 2);
        if (fill) {
            this.ctx.fillStyle = color;
            this.ctx.fill();
        } else {
            this.ctx.strokeStyle = color;
            this.ctx.stroke();
        }
    }

    drawLine(x1, y1, x2, y2, color, width = 1) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.beginPath();
        this.ctx.moveTo(x1 - this._camera.x, y1 - this._camera.y);
        this.ctx.lineTo(x2 - this._camera.x, y2 - this._camera.y);
        this.ctx.stroke();
        this.ctx.lineWidth = 1;
    }

    drawText(text, x, y, {
        color = '#ffffff',
        font = '14px sans-serif',
        align = 'left',
        baseline = 'top',
        shadow = false,
        shadowColor = '#000000',
        maxWidth = undefined
    } = {}) {
        this.ctx.font = font;
        this.ctx.textAlign = align;
        this.ctx.textBaseline = baseline;
        if (shadow) {
            this.ctx.fillStyle = shadowColor;
            this.ctx.fillText(text, x + 1, y + 1, maxWidth);
        }
        this.ctx.fillStyle = color;
        this.ctx.fillText(text, x, y, maxWidth);
    }

    drawBar(x, y, w, h, ratio, fgColor, bgColor = 'rgba(0,0,0,0.5)', borderColor = null) {
        this.ctx.fillStyle = bgColor;
        this.ctx.fillRect(x, y, w, h);
        this.ctx.fillStyle = fgColor;
        this.ctx.fillRect(x, y, w * Math.max(0, Math.min(1, ratio)), h);
        if (borderColor) {
            this.ctx.strokeStyle = borderColor;
            this.ctx.strokeRect(x, y, w, h);
        }
    }

    // --- Doodle / chibi art style drawing variants ---
    // These render hand-drawn, wobbly, sketch-like shapes on top of the
    // pixel-art base.  imageSmoothingEnabled should remain false for the
    // base sprite layer; doodle overlays intentionally use anti-aliased
    // strokes for a softer, hand-drawn look.

    /**
     * Draw a doodle-style rectangle with wobbly edges.
     */
    drawDoodleRect(x, y, width, height, fillColor, strokeColor = '#2D2D2D', lineWidth = 2.5) {
        this.ctx.save();
        this.ctx.fillStyle = fillColor;
        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = lineWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        // Draw wobbly rectangle path
        this.ctx.beginPath();
        const wobble = 1.5;
        const segments = 8;

        // Top edge
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const px = x + width * t + (Math.random() - 0.5) * wobble;
            const py = y + (Math.random() - 0.5) * wobble;
            if (i === 0) this.ctx.moveTo(px, py);
            else this.ctx.lineTo(px, py);
        }
        // Right edge
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const px = x + width + (Math.random() - 0.5) * wobble;
            const py = y + height * t + (Math.random() - 0.5) * wobble;
            this.ctx.lineTo(px, py);
        }
        // Bottom edge
        for (let i = segments; i >= 0; i--) {
            const t = i / segments;
            const px = x + width * t + (Math.random() - 0.5) * wobble;
            const py = y + height + (Math.random() - 0.5) * wobble;
            this.ctx.lineTo(px, py);
        }
        // Left edge
        for (let i = segments; i >= 0; i--) {
            const t = i / segments;
            const px = x + (Math.random() - 0.5) * wobble;
            const py = y + height * t + (Math.random() - 0.5) * wobble;
            this.ctx.lineTo(px, py);
        }

        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.restore();
    }

    /**
     * Draw a doodle-style health/stat bar with hatching overlay.
     */
    drawDoodleBar(x, y, width, height, fillPercent, fillColor, bgColor = '#FEF3D0', strokeColor = '#2D2D2D') {
        // Background
        this.drawDoodleRect(x, y, width, height, bgColor, strokeColor, 2);
        // Fill
        if (fillPercent > 0) {
            const fillWidth = width * Math.min(1, fillPercent);
            this.ctx.save();
            this.ctx.fillStyle = fillColor;
            this.ctx.fillRect(x + 1, y + 1, fillWidth - 2, height - 2);
            // Add hatching overlay
            this.ctx.globalAlpha = 0.15;
            this.ctx.strokeStyle = strokeColor;
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            for (let offset = 0; offset < fillWidth + height; offset += 4) {
                this.ctx.moveTo(x + offset, y);
                this.ctx.lineTo(x + offset - height, y + height);
            }
            this.ctx.stroke();
            this.ctx.restore();
        }
    }

    /**
     * Draw text with doodle hand-drawn style using a handwriting font.
     */
    drawDoodleText(text, x, y, color = '#2D2D2D', size = 16, align = 'left') {
        this.ctx.save();
        this.ctx.font = `${size}px 'Patrick Hand', 'Comic Sans MS', cursive`;
        this.ctx.fillStyle = color;
        this.ctx.textAlign = align;
        // Slight rotation for hand-drawn feel
        this.ctx.translate(x, y);
        this.ctx.rotate((Math.random() - 0.5) * 0.02);
        this.ctx.fillText(text, 0, 0);
        this.ctx.restore();
    }

    /**
     * Draw a doodle-style circle with wobbly edges.
     */
    drawDoodleCircle(cx, cy, radius, fillColor, strokeColor = '#2D2D2D', lineWidth = 2) {
        this.ctx.save();
        this.ctx.fillStyle = fillColor;
        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = lineWidth;
        this.ctx.lineCap = 'round';

        const wobble = 1.2;
        const segments = 16;
        this.ctx.beginPath();
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const r = radius + (Math.random() - 0.5) * wobble;
            const px = cx + Math.cos(angle) * r;
            const py = cy + Math.sin(angle) * r;
            if (i === 0) this.ctx.moveTo(px, py);
            else this.ctx.lineTo(px, py);
        }
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.restore();
    }

    /**
     * Draw a doodle-style line with slight waviness.
     */
    drawDoodleLine(x1, y1, x2, y2, color = '#2D2D2D', lineWidth = 2) {
        this.ctx.save();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.lineCap = 'round';

        const wobble = 1.0;
        const segments = 6;
        this.ctx.beginPath();
        this.ctx.moveTo(x1 + (Math.random() - 0.5) * wobble, y1 + (Math.random() - 0.5) * wobble);
        for (let i = 1; i <= segments; i++) {
            const t = i / segments;
            const px = x1 + (x2 - x1) * t + (Math.random() - 0.5) * wobble;
            const py = y1 + (y2 - y1) * t + (Math.random() - 0.5) * wobble;
            this.ctx.lineTo(px, py);
        }
        this.ctx.stroke();
        this.ctx.restore();
    }

    // --- Tilemap rendering ---

    drawTile(tileset, tileIndex, tileSize, x, y, drawSize) {
        if (!tileset || !tileset.complete) return;
        const cols = Math.floor(tileset.width / tileSize);
        const sx = (tileIndex % cols) * tileSize;
        const sy = Math.floor(tileIndex / cols) * tileSize;
        const size = drawSize || tileSize;
        this.ctx.drawImage(tileset,
            sx, sy, tileSize, tileSize,
            x - this._camera.x, y - this._camera.y, size, size
        );
    }

    // --- State management ---

    save() { this.ctx.save(); }
    restore() { this.ctx.restore(); }

    setAlpha(alpha) { this.ctx.globalAlpha = alpha; }
    resetAlpha() { this.ctx.globalAlpha = 1.0; }

    setBlendMode(mode) { this.ctx.globalCompositeOperation = mode; }
    resetBlendMode() { this.ctx.globalCompositeOperation = 'source-over'; }

    clip(x, y, w, h) {
        this.ctx.beginPath();
        this.ctx.rect(x, y, w, h);
        this.ctx.clip();
    }

    // --- Utility ---

    measureText(text, font = '14px sans-serif') {
        this.ctx.font = font;
        return this.ctx.measureText(text);
    }

    screenToWorld(sx, sy) {
        return { x: sx + this._camera.x, y: sy + this._camera.y };
    }

    worldToScreen(wx, wy) {
        return { x: wx - this._camera.x, y: wy - this._camera.y };
    }

    isOnScreen(x, y, w, h) {
        const sx = x - this._camera.x;
        const sy = y - this._camera.y;
        return sx + w > 0 && sx < this.engine.designWidth &&
               sy + h > 0 && sy < this.engine.designHeight;
    }
}
