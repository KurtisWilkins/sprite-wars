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
            this.ctx.lineWidth = Renderer.CEL_OUTLINE_WIDTH;
            this.ctx.lineJoin = 'round';
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
            this.ctx.lineWidth = Renderer.CEL_OUTLINE_WIDTH;
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

    drawBar(x, y, w, h, ratio, fgColor, bgColor = 'rgba(0,0,0,0.5)', borderColor = '#000000') {
        const ctx = this.ctx;
        // Background
        ctx.fillStyle = bgColor;
        ctx.fillRect(x, y, w, h);

        // Foreground with cel-shaded highlight/shadow strips
        const fillW = w * Math.max(0, Math.min(1, ratio));
        if (fillW > 0) {
            const { base, shadow, highlight } = Renderer.getCelShadedColors(fgColor);
            ctx.fillStyle = base;
            ctx.fillRect(x, y, fillW, h);
            // Highlight strip (top 30%)
            ctx.fillStyle = highlight;
            ctx.fillRect(x, y, fillW, Math.max(1, h * 0.30));
            // Shadow strip (bottom 25%)
            const shadowH = Math.max(1, h * 0.25);
            ctx.fillStyle = shadow;
            ctx.fillRect(x, y + h - shadowH, fillW, shadowH);
        }

        // Clean uniform outline
        if (borderColor) {
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = Renderer.CEL_OUTLINE_WIDTH;
            ctx.lineJoin = 'round';
            ctx.strokeRect(x, y, w, h);
        }
    }

    // --- Cel-shaded art style drawing utilities ---
    // Flat cel-shaded style: clean uniform-thickness black outlines,
    // hard-edged shadow/highlight per color zone, no gradients, vibrant
    // saturated colors.  These replace the previous doodle/wobbly methods.

    // ---- Static colour helpers (usable without a Renderer instance) ----

    /**
     * Parse a hex colour string into { r, g, b } (0-255).
     * Accepts '#RGB', '#RRGGBB', or '#RRGGBBAA'.
     */
    static parseHex(hex) {
        let h = hex.replace('#', '');
        if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
        return {
            r: parseInt(h.substring(0, 2), 16),
            g: parseInt(h.substring(2, 4), 16),
            b: parseInt(h.substring(4, 6), 16),
        };
    }

    /** Convert { r, g, b } back to a '#RRGGBB' string. */
    static rgbToHex(r, g, b) {
        const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
        return '#' + [r, g, b].map(v => clamp(v).toString(16).padStart(2, '0')).join('');
    }

    /**
     * Return cel-shading colour triplet for any base colour.
     * All three are flat hex colours — NO gradients.
     *   base      – the original colour
     *   shadow    – darkened by ~30 %
     *   highlight – lightened by ~35 %
     * @param {string} baseHex - '#RRGGBB' base colour
     * @returns {{ base: string, shadow: string, highlight: string }}
     */
    static getCelShadedColors(baseHex) {
        const { r, g, b } = Renderer.parseHex(baseHex);
        return {
            base: baseHex,
            shadow: Renderer.rgbToHex(r * 0.70, g * 0.70, b * 0.70),
            highlight: Renderer.rgbToHex(
                r + (255 - r) * 0.35,
                g + (255 - g) * 0.35,
                b + (255 - b) * 0.35
            ),
        };
    }

    // ---- Instance drawing methods ----

    /** Default outline thickness used by cel-shaded helpers. */
    static get CEL_OUTLINE_WIDTH() { return 2.5; }

    /**
     * Draw a clean, uniform-width outline around a rectangular path.
     * No wobble, no randomness — perfectly straight edges.
     */
    drawUniformOutline(x, y, w, h, color = '#000000', lineWidth = Renderer.CEL_OUTLINE_WIDTH) {
        this.ctx.save();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.lineJoin = 'round';
        this.ctx.lineCap = 'round';
        this.ctx.strokeRect(x, y, w, h);
        this.ctx.restore();
    }

    /**
     * Draw a shape with flat cel-shading: base fill, a hard-edged shadow
     * zone on the lower-right portion, a hard-edged highlight zone on the
     * upper-left portion, and a clean uniform black outline.
     *
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {string} baseColor   - '#RRGGBB'
     * @param {object} [options]
     * @param {string} options.outlineColor  - outline colour (default '#000000')
     * @param {number} options.outlineWidth  - outline thickness (default CEL_OUTLINE_WIDTH)
     * @param {number} options.shadowRatio   - fraction of area covered by shadow (0-1, default 0.4)
     * @param {number} options.highlightRatio - fraction covered by highlight (0-1, default 0.25)
     */
    drawCelShadedRect(x, y, w, h, baseColor, {
        outlineColor = '#000000',
        outlineWidth = Renderer.CEL_OUTLINE_WIDTH,
        shadowRatio = 0.4,
        highlightRatio = 0.25,
    } = {}) {
        const { base, shadow, highlight } = Renderer.getCelShadedColors(baseColor);
        const ctx = this.ctx;
        ctx.save();

        // 1. Base fill (entire rect)
        ctx.fillStyle = base;
        ctx.fillRect(x, y, w, h);

        // 2. Shadow zone — hard-edged rectangle on bottom-right
        const sx = x + w * (1 - shadowRatio);
        const sy = y + h * (1 - shadowRatio);
        ctx.fillStyle = shadow;
        // L-shaped shadow: bottom strip + right strip
        ctx.fillRect(x, sy, w, h * shadowRatio);          // bottom strip
        ctx.fillRect(sx, y, w * shadowRatio, h);           // right strip

        // 3. Highlight zone — hard-edged rectangle on top-left
        ctx.fillStyle = highlight;
        ctx.fillRect(x, y, w * highlightRatio, h * highlightRatio);

        // 4. Clean uniform outline
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = outlineWidth;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeRect(x, y, w, h);

        ctx.restore();
    }

    /**
     * Draw a circle with flat cel-shading: base fill, hard-edged shadow
     * crescent, highlight dot, and clean uniform outline.
     */
    drawCelShadedCircle(cx, cy, radius, baseColor, {
        outlineColor = '#000000',
        outlineWidth = Renderer.CEL_OUTLINE_WIDTH,
    } = {}) {
        const { base, shadow, highlight } = Renderer.getCelShadedColors(baseColor);
        const ctx = this.ctx;
        ctx.save();

        // Base fill
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = base;
        ctx.fill();

        // Shadow crescent (clip to circle, draw offset circle)
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.beginPath();
        ctx.arc(cx + radius * 0.3, cy + radius * 0.3, radius * 0.85, 0, Math.PI * 2);
        ctx.fillStyle = shadow;
        ctx.fill();
        // Re-fill base in center to create crescent effect
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.82, 0, Math.PI * 2);
        ctx.fillStyle = base;
        ctx.fill();
        ctx.restore();

        // Highlight dot (upper-left)
        ctx.beginPath();
        ctx.arc(cx - radius * 0.3, cy - radius * 0.3, radius * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = highlight;
        ctx.fill();

        // Clean outline
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = outlineWidth;
        ctx.stroke();

        ctx.restore();
    }

    /**
     * Draw a cel-shaded rectangle — drop-in replacement for drawDoodleRect.
     * Same parameter signature for backward compatibility.
     */
    drawDoodleRect(x, y, width, height, fillColor, strokeColor = '#000000', lineWidth = Renderer.CEL_OUTLINE_WIDTH) {
        this.drawCelShadedRect(x, y, width, height, fillColor, {
            outlineColor: strokeColor,
            outlineWidth: lineWidth,
        });
    }

    /**
     * Cel-shaded stat/health bar — drop-in replacement for drawDoodleBar.
     * Flat fill with hard-edged highlight strip and clean outline (no hatching).
     */
    drawDoodleBar(x, y, width, height, fillPercent, fillColor, bgColor = '#E8E0D0', strokeColor = '#000000') {
        // Background bar with outline
        const ctx = this.ctx;
        ctx.save();
        ctx.fillStyle = bgColor;
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = Renderer.CEL_OUTLINE_WIDTH;
        ctx.lineJoin = 'round';
        ctx.strokeRect(x, y, width, height);

        // Filled portion
        if (fillPercent > 0) {
            const fillWidth = width * Math.min(1, fillPercent);
            const { base, shadow, highlight } = Renderer.getCelShadedColors(fillColor);

            // Base fill
            ctx.fillStyle = base;
            ctx.fillRect(x + 1, y + 1, fillWidth - 2, height - 2);

            // Highlight strip across top 30 %
            ctx.fillStyle = highlight;
            ctx.fillRect(x + 1, y + 1, fillWidth - 2, Math.max(1, (height - 2) * 0.30));

            // Shadow strip across bottom 25 %
            const shadowH = Math.max(1, (height - 2) * 0.25);
            ctx.fillStyle = shadow;
            ctx.fillRect(x + 1, y + height - 1 - shadowH, fillWidth - 2, shadowH);
        }
        ctx.restore();
    }

    /**
     * Draw text with clean bold style — drop-in replacement for drawDoodleText.
     * Uses a clean sans-serif font, no rotation, no wobble.
     */
    drawDoodleText(text, x, y, color = '#2D2D2D', size = 16, align = 'left') {
        this.ctx.save();
        this.ctx.font = `bold ${size}px 'Nunito', 'Segoe UI', sans-serif`;
        this.ctx.fillStyle = color;
        this.ctx.textAlign = align;
        this.ctx.textBaseline = 'alphabetic';
        // Clean text shadow for readability (no rotation)
        this.ctx.fillStyle = '#000000';
        this.ctx.fillText(text, x + 1, y + 1);
        this.ctx.fillStyle = color;
        this.ctx.fillText(text, x, y);
        this.ctx.restore();
    }

    /**
     * Cel-shaded circle — drop-in replacement for drawDoodleCircle.
     */
    drawDoodleCircle(cx, cy, radius, fillColor, strokeColor = '#000000', lineWidth = Renderer.CEL_OUTLINE_WIDTH) {
        this.drawCelShadedCircle(cx, cy, radius, fillColor, {
            outlineColor: strokeColor,
            outlineWidth: lineWidth,
        });
    }

    /**
     * Clean straight line — drop-in replacement for drawDoodleLine.
     * Uniform thickness, no waviness.
     */
    drawDoodleLine(x1, y1, x2, y2, color = '#000000', lineWidth = Renderer.CEL_OUTLINE_WIDTH) {
        this.ctx.save();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
        this.ctx.restore();
    }

    /**
     * Draw a simple filled dot eye (for chibi characters).
     * @param {number} cx - centre X
     * @param {number} cy - centre Y
     * @param {number} radius - eye radius (default 2)
     * @param {string} color - fill colour (default '#000000')
     */
    drawDotEye(cx, cy, radius = 2, color = '#000000') {
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
    }

    /**
     * Draw a generic convex polygon with cel-shading.
     * Points is an array of { x, y }.
     */
    drawCelShadedPolygon(points, baseColor, {
        outlineColor = '#000000',
        outlineWidth = Renderer.CEL_OUTLINE_WIDTH,
    } = {}) {
        if (!points || points.length < 3) return;
        const { base, shadow } = Renderer.getCelShadedColors(baseColor);
        const ctx = this.ctx;
        ctx.save();

        // Build path
        const buildPath = () => {
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.closePath();
        };

        // Base fill
        buildPath();
        ctx.fillStyle = base;
        ctx.fill();

        // Shadow on lower half (clip to polygon, fill lower rect)
        ctx.save();
        buildPath();
        ctx.clip();
        let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
        for (const p of points) {
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
        }
        const midY = minY + (maxY - minY) * 0.6;
        ctx.fillStyle = shadow;
        ctx.fillRect(minX, midY, maxX - minX, maxY - midY);
        ctx.restore();

        // Outline
        buildPath();
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = outlineWidth;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.restore();
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
