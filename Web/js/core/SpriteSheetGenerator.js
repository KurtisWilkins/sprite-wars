/**
 * SpriteSheetGenerator - Generates 4-direction walk cycle sprite sheets
 * from base body sprites (e.g. the Units body type sheet).
 *
 * Output: 256x256 canvas (4 cols x 4 rows, 64x64 per frame)
 *   Row 0: facing down  (frames 0-3)
 *   Row 1: facing left  (frames 0-3)
 *   Row 2: facing right (frames 0-3)
 *   Row 3: facing up    (frames 0-3)
 *
 * Each frame adds procedural arms and legs with walk animation offsets.
 */

export class SpriteSheetGenerator {
    /**
     * Generate a walk-cycle sprite sheet from a base body image.
     * @param {HTMLImageElement|HTMLCanvasElement} bodyImg - The base body sprite (single frame)
     * @param {object} opts - Options for generation
     * @param {number} opts.bodyW - Width of body in source image (default: auto-detect)
     * @param {number} opts.bodyH - Height of body in source image (default: auto-detect)
     * @param {number} opts.sx - Source X offset in bodyImg (default: 0)
     * @param {number} opts.sy - Source Y offset in bodyImg (default: 0)
     * @param {string} opts.skinColor - Skin/limb color (default: '#c8a882')
     * @param {string} opts.outlineColor - Limb outline color (default: '#6b5a4e')
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
        const outlineColor = opts.outlineColor || '#6b5a4e';

        // Create output sprite sheet
        const sheet = document.createElement('canvas');
        sheet.width = SHEET_SIZE;
        sheet.height = SHEET_SIZE;
        const ctx = sheet.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        // Body is drawn centered in a 64x64 frame, scaled to ~36x40 pixels
        // leaving room for limbs (arms: 6px each side, legs: 12px below)
        const scaledBodyW = Math.min(36, bodyW);
        const scaledBodyH = Math.min(36, bodyH);
        const bodyOffsetX = Math.floor((FRAME_SIZE - scaledBodyW) / 2);
        const bodyTopY = 8; // Leave room at top for head bob

        // Limb dimensions
        const armW = 6;
        const armH = 14;
        const legW = 6;
        const legH = 12;

        // Animation offsets per frame [idle, step1, idle2, step2]
        // Each direction has 4 frames of walk animation
        const walkCycle = [
            { armL: 0, armR: 0, legL: 0, legR: 0, bob: 0 },   // idle
            { armL: -3, armR: 3, legL: 5, legR: -2, bob: -2 }, // step left leg forward
            { armL: 0, armR: 0, legL: 0, legR: 0, bob: 0 },   // idle (passing)
            { armL: 3, armR: -3, legL: -2, legR: 5, bob: -2 }, // step right leg forward
        ];

        // Direction rows: down=0, left=1, right=2, up=3
        const directions = ['down', 'left', 'right', 'up'];

        for (let dirIdx = 0; dirIdx < 4; dirIdx++) {
            const dir = directions[dirIdx];

            for (let frame = 0; frame < 4; frame++) {
                const fx = frame * FRAME_SIZE;
                const fy = dirIdx * FRAME_SIZE;
                const anim = walkCycle[frame];

                // Body position with bob
                const bx = fx + bodyOffsetX;
                const by = fy + bodyTopY + anim.bob;

                // Draw legs first (behind body)
                const legBaseY = by + scaledBodyH - 2;
                const leftLegX = bx + Math.floor(scaledBodyW / 2) - legW - 1;
                const rightLegX = bx + Math.floor(scaledBodyW / 2) + 1;

                this._drawLimb(ctx, leftLegX, legBaseY + anim.legL,
                    legW, legH, skinColor, outlineColor, dir, 'leg');
                this._drawLimb(ctx, rightLegX, legBaseY + anim.legR,
                    legW, legH, skinColor, outlineColor, dir, 'leg');

                // Draw arms (behind body for side views, beside body for front/back)
                const armBaseY = by + 4;
                if (dir === 'left') {
                    // Left-facing: right arm visible behind, left arm in front
                    this._drawLimb(ctx, bx + scaledBodyW - 1, armBaseY + anim.armR,
                        armW, armH, skinColor, outlineColor, dir, 'arm');
                } else if (dir === 'right') {
                    // Right-facing: left arm visible behind, right arm in front
                    this._drawLimb(ctx, bx - armW + 1, armBaseY + anim.armL,
                        armW, armH, skinColor, outlineColor, dir, 'arm');
                } else {
                    // Front/back: both arms visible on sides
                    this._drawLimb(ctx, bx - armW, armBaseY + anim.armL,
                        armW, armH, skinColor, outlineColor, dir, 'arm');
                    this._drawLimb(ctx, bx + scaledBodyW, armBaseY + anim.armR,
                        armW, armH, skinColor, outlineColor, dir, 'arm');
                }

                // Draw body (on top of legs and behind-arms)
                ctx.drawImage(bodyImg,
                    sx, sy, bodyW, bodyH,
                    bx, by, scaledBodyW, scaledBodyH
                );

                // Draw front arms for side views (on top of body)
                if (dir === 'left') {
                    this._drawLimb(ctx, bx - armW + 1, armBaseY + anim.armL,
                        armW, armH, skinColor, outlineColor, dir, 'arm');
                } else if (dir === 'right') {
                    this._drawLimb(ctx, bx + scaledBodyW - 1, armBaseY + anim.armR,
                        armW, armH, skinColor, outlineColor, dir, 'arm');
                }
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

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const sx = col * (frameW + padding) + padding;
                const sy = row * (frameH + padding + 58) + padding + 10; // Account for variable row spacing

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
                const sheet = this.generate(unitsSheet, {
                    sx, sy, bodyW: frameW, bodyH: frameH,
                    skinColor,
                    outlineColor: '#5a4a3e',
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
     * Draw a limb (arm or leg) with outline.
     */
    static _drawLimb(ctx, x, y, w, h, fillColor, outlineColor, direction, limbType) {
        // Outline
        ctx.fillStyle = outlineColor;
        ctx.fillRect(Math.floor(x) - 1, Math.floor(y), w + 2, h + 2);

        // Fill
        ctx.fillStyle = fillColor;
        ctx.fillRect(Math.floor(x), Math.floor(y), w, h);

        // Highlight for depth
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(Math.floor(x), Math.floor(y), 2, h - 2);
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
