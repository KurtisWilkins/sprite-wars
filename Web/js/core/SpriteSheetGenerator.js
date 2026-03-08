/**
 * SpriteSheetGenerator - Generates 4-direction walk cycle sprite sheets
 * from base body sprites (e.g. the Units body type sheet).
 *
 * Art style: flat cel-shaded, clean uniform-thickness black outlines,
 * chibi proportions (large head ~40% of body height, compact body),
 * hard-edged shading, simple dot eyes, vibrant saturated colours,
 * NO gradients, NO pixel art, NO wobbly/sketch lines.
 *
 * Output: 256x256 canvas (4 cols x 4 rows, 64x64 per frame)
 *   Row 0: facing down  (frames 0-3)
 *   Row 1: facing left  (frames 0-3)
 *   Row 2: facing right (frames 0-3)
 *   Row 3: facing up    (frames 0-3)
 *
 * Each frame draws a chibi character with procedural arms, legs, head,
 * and walk animation offsets using flat cel-shading.
 */

import { Renderer } from './Renderer.js';

export class SpriteSheetGenerator {

    // ---- Cel-shading drawing helpers (operate on a raw CanvasRenderingContext2D) ----

    /**
     * Draw a cel-shaded rectangle on a raw context.
     * Flat base fill, hard-edged shadow on bottom, highlight on top, clean outline.
     */
    static _celRect(ctx, x, y, w, h, baseColor, outlineColor = '#000000', outlineWidth = 2) {
        const { base, shadow, highlight } = Renderer.getCelShadedColors(baseColor);
        x = Math.floor(x);
        y = Math.floor(y);

        // Base fill
        ctx.fillStyle = base;
        ctx.fillRect(x, y, w, h);

        // Shadow strip — bottom 35%
        const shadowH = Math.max(1, Math.floor(h * 0.35));
        ctx.fillStyle = shadow;
        ctx.fillRect(x, y + h - shadowH, w, shadowH);

        // Highlight strip — top 25%
        const highlightH = Math.max(1, Math.floor(h * 0.25));
        ctx.fillStyle = highlight;
        ctx.fillRect(x, y, w, highlightH);

        // Clean uniform outline
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = outlineWidth;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeRect(x, y, w, h);
    }

    /**
     * Draw a cel-shaded ellipse / circle on a raw context.
     */
    static _celEllipse(ctx, cx, cy, rx, ry, baseColor, outlineColor = '#000000', outlineWidth = 2) {
        const { base, shadow, highlight } = Renderer.getCelShadedColors(baseColor);
        cx = Math.floor(cx);
        cy = Math.floor(cy);

        ctx.save();

        // Base fill
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = base;
        ctx.fill();

        // Shadow crescent — clip to ellipse, fill offset ellipse
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.clip();
        // Lower shadow zone
        ctx.fillStyle = shadow;
        ctx.fillRect(cx - rx, cy + ry * 0.3, rx * 2, ry);
        ctx.restore();

        // Highlight dot (upper-left)
        ctx.beginPath();
        ctx.ellipse(cx - rx * 0.25, cy - ry * 0.3, rx * 0.25, ry * 0.2, 0, 0, Math.PI * 2);
        ctx.fillStyle = highlight;
        ctx.fill();

        // Clean outline
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = outlineWidth;
        ctx.stroke();

        ctx.restore();
    }

    /**
     * Draw a simple filled dot eye.
     */
    static _dotEye(ctx, cx, cy, radius = 2) {
        ctx.beginPath();
        ctx.arc(Math.floor(cx), Math.floor(cy), radius, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.fill();
        // Tiny white highlight
        ctx.beginPath();
        ctx.arc(Math.floor(cx) - 0.5, Math.floor(cy) - 0.5, Math.max(0.5, radius * 0.35), 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
    }

    /**
     * Draw a cel-shaded limb (arm or leg) with clean outline and flat shading.
     */
    static _drawLimb(ctx, x, y, w, h, fillColor, outlineColor, direction, limbType) {
        const { base, shadow, highlight } = Renderer.getCelShadedColors(fillColor);
        x = Math.floor(x);
        y = Math.floor(y);

        // Rounded limb shape
        const radius = Math.min(w, h) * 0.3;
        ctx.save();

        // Base fill
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, radius);
        ctx.fillStyle = base;
        ctx.fill();

        // Shadow strip on lower portion
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, radius);
        ctx.clip();
        const shadowH = Math.max(1, Math.floor(h * 0.35));
        ctx.fillStyle = shadow;
        ctx.fillRect(x, y + h - shadowH, w, shadowH);
        ctx.restore();

        // Highlight on upper portion
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, radius);
        ctx.clip();
        ctx.fillStyle = highlight;
        ctx.fillRect(x, y, w, Math.max(1, Math.floor(h * 0.25)));
        ctx.restore();

        // Clean outline
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, radius);
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.restore();
    }

    /**
     * Generate a walk-cycle sprite sheet from a base body image.
     * @param {HTMLImageElement|HTMLCanvasElement} bodyImg - The base body sprite (single frame)
     * @param {object} opts - Options for generation
     * @param {number} opts.bodyW - Width of body in source image (default: auto-detect)
     * @param {number} opts.bodyH - Height of body in source image (default: auto-detect)
     * @param {number} opts.sx - Source X offset in bodyImg (default: 0)
     * @param {number} opts.sy - Source Y offset in bodyImg (default: 0)
     * @param {string} opts.skinColor - Skin/limb color (default: '#c8a882')
     * @param {string} opts.outlineColor - Limb outline color (default: '#000000')
     * @param {string} opts.hairColor - Hair color (default: '#5A3825')
     * @returns {HTMLCanvasElement} 256x256 sprite sheet canvas
     */
    static generate(bodyImg, opts = {}) {
        const FRAME_SIZE = 64;
        const SHEET_SIZE = 256; // 4 frames x 64px

        const sx = opts.sx || 0;
        const sy = opts.sy || 0;
        const bodyW = opts.bodyW || bodyImg.width;
        const bodyH = opts.bodyH || bodyImg.height;
        const skinColor = opts.skinColor || '#c8a882';
        const outlineColor = opts.outlineColor || '#000000';
        const hairColor = opts.hairColor || '#5A3825';

        // Create output sprite sheet
        const sheet = document.createElement('canvas');
        sheet.width = SHEET_SIZE;
        sheet.height = SHEET_SIZE;
        const ctx = sheet.getContext('2d');
        // Smooth rendering for clean cel-shaded style (NOT pixel art)
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // --- Chibi proportions ---
        // Head is ~40% of total character height
        // Total character height fits in ~56px (leaving 4px margin top/bottom)
        const totalH = 54;
        const headH = Math.floor(totalH * 0.40);   // ~22px
        const headW = Math.floor(headH * 1.05);     // slightly wider than tall
        const torsoH = Math.floor(totalH * 0.28);   // ~15px
        const torsoW = Math.floor(headW * 0.75);    // narrower than head
        const legH = totalH - headH - torsoH;       // ~17px
        const legW = 7;
        const armW = 6;
        const armH = Math.floor(torsoH * 0.85);

        // Body sprite is drawn onto the torso area
        const scaledBodyW = Math.min(torsoW, bodyW);
        const scaledBodyH = Math.min(torsoH, bodyH);

        // Animation offsets per frame [idle, step1, idle2, step2]
        const walkCycle = [
            { armL: 0, armR: 0, legL: 0, legR: 0, bob: 0 },
            { armL: -3, armR: 3, legL: 4, legR: -2, bob: -1 },
            { armL: 0, armR: 0, legL: 0, legR: 0, bob: 0 },
            { armL: 3, armR: -3, legL: -2, legR: 4, bob: -1 },
        ];

        // Direction rows: down=0, left=1, right=2, up=3
        const directions = ['down', 'left', 'right', 'up'];

        for (let dirIdx = 0; dirIdx < 4; dirIdx++) {
            const dir = directions[dirIdx];

            for (let frame = 0; frame < 4; frame++) {
                const fx = frame * FRAME_SIZE;
                const fy = dirIdx * FRAME_SIZE;
                const anim = walkCycle[frame];

                // Character centered horizontally in the 64px frame
                const charCenterX = fx + FRAME_SIZE / 2;
                const charTopY = fy + 4 + anim.bob; // 4px top margin + bob

                // --- Positions ---
                const headCX = charCenterX;
                const headCY = charTopY + headH / 2;

                const torsoCX = charCenterX;
                const torsoTopY = charTopY + headH - 2; // slight overlap with head

                const legBaseY = torsoTopY + torsoH;
                const leftLegX = charCenterX - legW - 1;
                const rightLegX = charCenterX + 1;

                const armBaseY = torsoTopY + 2;

                // --- Draw order: legs, arms-behind, torso+body, head, arms-front, eyes ---

                // 1. Legs
                this._drawLimb(ctx, leftLegX, legBaseY + anim.legL,
                    legW, legH, skinColor, outlineColor, dir, 'leg');
                this._drawLimb(ctx, rightLegX, legBaseY + anim.legR,
                    legW, legH, skinColor, outlineColor, dir, 'leg');

                // 2. Arms behind body (for side views)
                if (dir === 'left') {
                    this._drawLimb(ctx, charCenterX + torsoW / 2 - 1, armBaseY + anim.armR,
                        armW, armH, skinColor, outlineColor, dir, 'arm');
                } else if (dir === 'right') {
                    this._drawLimb(ctx, charCenterX - torsoW / 2 - armW + 1, armBaseY + anim.armL,
                        armW, armH, skinColor, outlineColor, dir, 'arm');
                } else {
                    // Front/back: draw both arms
                    this._drawLimb(ctx, charCenterX - torsoW / 2 - armW, armBaseY + anim.armL,
                        armW, armH, skinColor, outlineColor, dir, 'arm');
                    this._drawLimb(ctx, charCenterX + torsoW / 2, armBaseY + anim.armR,
                        armW, armH, skinColor, outlineColor, dir, 'arm');
                }

                // 3. Torso (cel-shaded rect) with body sprite overlay
                this._celRect(ctx,
                    torsoCX - torsoW / 2, torsoTopY,
                    torsoW, torsoH,
                    skinColor, outlineColor, 2);

                // Draw body sprite image on top of torso
                ctx.drawImage(bodyImg,
                    sx, sy, bodyW, bodyH,
                    Math.floor(torsoCX - scaledBodyW / 2), torsoTopY,
                    scaledBodyW, scaledBodyH
                );

                // 4. Head (cel-shaded ellipse — large chibi head)
                this._celEllipse(ctx, headCX, headCY,
                    Math.floor(headW / 2), Math.floor(headH / 2),
                    skinColor, outlineColor, 2);

                // 5. Hair tuft on top (simple cel-shaded arc)
                if (dir !== 'up') {
                    ctx.save();
                    ctx.beginPath();
                    ctx.ellipse(headCX, charTopY + 2, headW / 2 + 1, headH * 0.3, 0, Math.PI, 0);
                    const { base: hairBase } = Renderer.getCelShadedColors(hairColor);
                    ctx.fillStyle = hairBase;
                    ctx.fill();
                    ctx.strokeStyle = outlineColor;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    ctx.restore();
                }

                // 6. Front arms for side views (on top of body)
                if (dir === 'left') {
                    this._drawLimb(ctx, charCenterX - torsoW / 2 - armW + 1, armBaseY + anim.armL,
                        armW, armH, skinColor, outlineColor, dir, 'arm');
                } else if (dir === 'right') {
                    this._drawLimb(ctx, charCenterX + torsoW / 2 - 1, armBaseY + anim.armR,
                        armW, armH, skinColor, outlineColor, dir, 'arm');
                }

                // 7. Face (dot eyes + simple mouth) — only for front and side views
                if (dir === 'down') {
                    // Front-facing: two dot eyes
                    const eyeY = headCY + 1;
                    const eyeSpacing = Math.floor(headW * 0.18);
                    this._dotEye(ctx, headCX - eyeSpacing, eyeY, 2);
                    this._dotEye(ctx, headCX + eyeSpacing, eyeY, 2);
                    // Small mouth
                    ctx.beginPath();
                    ctx.arc(headCX, eyeY + 5, 1.5, 0, Math.PI);
                    ctx.strokeStyle = outlineColor;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                } else if (dir === 'left') {
                    // Side-facing left: one dot eye
                    this._dotEye(ctx, headCX - Math.floor(headW * 0.12), headCY + 1, 2);
                } else if (dir === 'right') {
                    // Side-facing right: one dot eye
                    this._dotEye(ctx, headCX + Math.floor(headW * 0.12), headCY + 1, 2);
                }
                // 'up' direction: no face visible
            }
        }

        return sheet;
    }

    /**
     * Extract all body types from the Units sprite sheet and generate walk sheets.
     * @param {HTMLImageElement} unitsSheet - The full units body types sheet (550x260)
     * @param {object} opts - Options
     * @param {number} opts.frameW - Width per body in source (default: 22)
     * @param {number} opts.frameH - Height per body in source (default: 26)
     * @param {number} opts.cols - Number of columns (default: auto from sheet width)
     * @param {number} opts.rows - Number of rows (default: 3)
     * @returns {HTMLCanvasElement[]} Array of 256x256 sprite sheet canvases
     */
    static generateFromSheet(unitsSheet, opts = {}) {
        const frameW = opts.frameW || 22;
        const frameH = opts.frameH || 26;
        const padding = opts.padding || 2;
        const rows = opts.rows || 3;
        const cols = opts.cols || Math.floor(unitsSheet.width / (frameW + padding));

        const sheets = [];
        const skinColors = [
            '#c8a882', '#d4b896', '#a87c5a', '#e8ccaa',
            '#b89878', '#c4a070', '#dcc0a0', '#9a6e4a',
        ];
        const hairColors = [
            '#5A3825', '#2C1810', '#8B4513', '#D4A574',
            '#3D2B1F', '#654321', '#C4956A', '#1A1A2E',
        ];

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const sx = col * (frameW + padding) + padding;
                const sy = row * (frameH + padding + 58) + padding + 10;

                // Skip if out of bounds
                if (sx + frameW > unitsSheet.width || sy + frameH > unitsSheet.height) continue;

                // Check if this region has actual content (not blank)
                const testCanvas = document.createElement('canvas');
                testCanvas.width = frameW;
                testCanvas.height = frameH;
                const testCtx = testCanvas.getContext('2d');
                testCtx.drawImage(unitsSheet, sx, sy, frameW, frameH, 0, 0, frameW, frameH);
                const data = testCtx.getImageData(0, 0, frameW, frameH).data;
                let hasContent = false;
                for (let i = 3; i < data.length; i += 4) {
                    if (data[i] > 30) { hasContent = true; break; }
                }
                if (!hasContent) continue;

                const skinColor = skinColors[sheets.length % skinColors.length];
                const hairColor = hairColors[sheets.length % hairColors.length];
                const sheet = this.generate(unitsSheet, {
                    sx, sy, bodyW: frameW, bodyH: frameH,
                    skinColor,
                    outlineColor: '#000000',
                    hairColor,
                });
                sheets.push(sheet);
            }
        }

        return sheets;
    }

    /**
     * Generate a single walk-cycle sheet for a character sprite
     * (already has directions but may need enhanced limb animation).
     * Returns the original sheet since character sprites already have walk cycles.
     * @param {HTMLImageElement} charSheet - 128x128 character sprite sheet
     * @returns {HTMLImageElement} Same image (sprites already animated)
     */
    static enhanceAsaiSheet(charSheet) {
        // Character sprites already have proper 4-dir walk cycles
        // Return as-is since they already have arms and legs in their animation
        return charSheet;
    }

    /**
     * Convert a canvas sprite sheet to an Image for use with the renderer.
     * @param {HTMLCanvasElement} canvas
     * @returns {Promise<HTMLImageElement>}
     */
    static toImage(canvas) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = canvas.toDataURL();
        });
    }
}
