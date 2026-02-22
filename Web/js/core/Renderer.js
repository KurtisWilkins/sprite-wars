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
