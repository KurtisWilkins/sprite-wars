# [P10-014] Sprite Wars — Animation Specification Sheet

> **Version:** 1.0
> **Last Updated:** 2026-02-16
> **Owner:** 2D Animator / Art Lead
> **Engine:** Godot 4.2 (SpriteFrames / AnimatedSprite2D)
> **Target Platforms:** Android / iOS (Mobile)

---

## 1. Overview

This document defines the animation pipeline for all 72 Sprite forms in Sprite Wars. It covers animation states, frame counts, frame rates, sprite sheet layout, naming conventions, pivot points, timing hooks (hit frames), and loop behavior. Animators must follow these specifications for consistency and correct integration with the battle and world systems.

**Total animation workload:** 72 forms x 6 core states = **432 animation clips** (minimum). Additional states (special abilities, emotes) may increase this count.

---

## 2. Animation States

Every Sprite form requires the following core animation states:

| State | Frames | FPS | Duration | Loop | Description |
|-------|--------|-----|----------|------|-------------|
| **Idle** | 4 | 8 | 0.50s | Yes | Resting pose with subtle motion (breathing, tail wag) |
| **Walk** | 6 x 4 dir | 10 | 0.60s | Yes | Movement cycle. 4 directional variants: down, up, left, right |
| **Attack** | 6 | 12 | 0.50s | No | Basic physical attack. Play once, return to idle |
| **Ability** | 8 | 12 | 0.67s | No | Special ability cast. Play once, return to idle |
| **Faint** | 4 | 8 | 0.50s | No | Defeat animation. Play once, hold last frame |
| **Hit** | 3 | 12 | 0.25s | No | Damage reaction. Play once, return to idle |

### Optional / Extended States

| State | Frames | FPS | Loop | When Used |
|-------|--------|-----|------|-----------|
| **Run** | 6 x 4 dir | 12 | Yes | Overworld sprint (if distinct from walk) |
| **Special** | 10 | 12 | No | Signature ability unique to the Sprite |
| **Evolution** | 12 | 10 | No | Played during evolution sequence |
| **Victory** | 6 | 8 | No | Celebration pose after winning a battle |
| **Sleep** | 4 | 6 | Yes | Resting in camp/sanctuary |
| **Emote** | 4 | 8 | No | Reaction during dialogue/interaction |

---

## 3. Frame Rate Standards

| Animation Type | Target FPS | Rationale |
|---------------|-----------|-----------|
| Idle, Faint, Sleep, Emote | **8 FPS** | Slow, ambient motion; conserves texture memory |
| Walk, Run | **10 FPS** | Smooth movement without excessive frames |
| Attack, Ability, Hit, Special, Victory | **12 FPS** | Snappy combat feel; responsive to input timing |
| Evolution | **10 FPS** | Dramatic but not too fast; allows player to appreciate the transformation |

### Mobile Performance Note
At these frame rates, the GPU load per Sprite is minimal. Even with 10 Sprites animating simultaneously in battle (5v5), the total frame update cost is negligible on modern mobile GPUs.

---

## 4. Sprite Sheet Layout

### Format
- **Horizontal strip:** Each animation state is a single horizontal strip of frames.
- **One file per state per form** (not one mega-sheet per form).
- **No padding between frames.** Frames are packed edge-to-edge.
- **Consistent frame size:** All frames within a strip use the stage's canvas size (64/96/128 px).

### Layout Diagram (Example: 6-frame attack at 64x64)
```
┌──────┬──────┬──────┬──────┬──────┬──────┐
│ F1   │ F2   │ F3   │ F4*  │ F5   │ F6   │
│64x64 │64x64 │64x64 │64x64 │64x64 │64x64 │
└──────┴──────┴──────┴──────┴──────┴──────┘
 * = Hit frame (frame 4 of 6)
Total image: 384 x 64 px
```

### Sheet Dimensions by State

| State | Frames | Stage 1 (64px) | Stage 2 (96px) | Stage 3 (128px) |
|-------|--------|----------------|----------------|-----------------|
| Idle | 4 | 256 x 64 | 384 x 96 | 512 x 128 |
| Walk (per dir) | 6 | 384 x 64 | 576 x 96 | 768 x 128 |
| Attack | 6 | 384 x 64 | 576 x 96 | 768 x 128 |
| Ability | 8 | 512 x 64 | 768 x 96 | 1024 x 128 |
| Faint | 4 | 256 x 64 | 384 x 96 | 512 x 128 |
| Hit | 3 | 192 x 64 | 288 x 96 | 384 x 128 |

### Directional Walk Sheets
Walk animations have 4 directional variants. These can be organized as either:

**Option A: Separate files per direction (preferred)**
```
emberpaw_s1_walk_down.png     (6 frames, 384x64)
emberpaw_s1_walk_up.png       (6 frames, 384x64)
emberpaw_s1_walk_left.png     (6 frames, 384x64)
emberpaw_s1_walk_right.png    (6 frames, 384x64)
```

**Option B: Single file, 4 rows**
```
emberpaw_s1_walk.png          (6 columns x 4 rows = 384x256 for Stage 1)
Row 0 = Down, Row 1 = Up, Row 2 = Left, Row 3 = Right
```

Option A is preferred for easier iteration and selective loading. If Option B is used, document row order in the file name or a metadata sidecar.

---

## 5. Naming Convention

### File Naming
```
{race_name}_{stage}_{state}.png
```

| Component | Format | Examples |
|-----------|--------|---------|
| `race_name` | `snake_case`, lowercase | `emberpaw`, `tidalfin`, `thornsprout` |
| `stage` | `s1`, `s2`, `s3` | `s1` |
| `state` | `snake_case`, lowercase | `idle`, `walk_down`, `attack`, `ability`, `faint`, `hit` |

### Full Examples
```
emberpaw_s1_idle.png
emberpaw_s1_walk_down.png
emberpaw_s1_walk_up.png
emberpaw_s1_walk_left.png
emberpaw_s1_walk_right.png
emberpaw_s1_attack.png
emberpaw_s1_ability.png
emberpaw_s1_faint.png
emberpaw_s1_hit.png
blazefang_s2_idle.png
blazefang_s2_attack.png
infernowolf_s3_ability.png
infernowolf_s3_special.png
```

### Godot Resource Naming (SpriteFrames)
Within the SpriteFrames resource, animation names must match the state string:
```
idle
walk_down
walk_up
walk_left
walk_right
attack
ability
faint
hit
```

---

## 6. Pivot Points

The pivot point (origin) determines where the Sprite is anchored on the battle grid and in the world.

| Sprite Type | Pivot Position | Godot Offset |
|------------|----------------|--------------|
| **Grounded** | Center-bottom of canvas | `offset = Vector2(0, -height/2)` |
| **Flying** | Center of canvas | `offset = Vector2(0, 0)` |
| **Tall / Large** | Center-bottom | `offset = Vector2(0, -height/2)` |

### Visual Reference
```
Grounded Sprite (64x64):          Flying Sprite (64x64):
┌────────────────┐                ┌────────────────┐
│                │                │                │
│    Sprite      │                │    Sprite      │
│    Body        │                │   ●Body        │  ← Pivot at center
│                │                │                │
│       ●        │  ← Pivot       │                │
└────────────────┘    at bottom   └────────────────┘
```

### Alignment Rules
- All frames within an animation must share the same pivot point. The Sprite should not drift relative to its anchor across frames.
- Walk animations may shift the body up/down by 1-2 pixels for a bobbing effect, but the anchor (feet position) remains fixed.
- Attack animations may shift forward by up to 8 pixels on the hit frame to sell the impact, then return.

---

## 7. Hit Frame Timing

Attack and ability animations have designated **hit frames** -- the exact frame at which damage is calculated and applied by the battle system.

### Attack Animation (6 frames at 12 FPS)
```
Frame:   1      2      3      4*     5      6
Time:  0.00s  0.08s  0.17s  0.25s  0.33s  0.42s
         ↑                    ↑              ↑
      Wind-up            HIT FRAME       Recovery
```
**Hit frame = Frame 4 (at 0.25s / 250ms into the animation)**

### Ability Animation (8 frames at 12 FPS)
```
Frame:   1      2      3      4      5*     6      7      8
Time:  0.00s  0.08s  0.17s  0.25s  0.33s  0.42s  0.50s  0.58s
         ↑                           ↑                    ↑
      Cast start               HIT FRAME              Cooldown
```
**Hit frame = Frame 5 (at 0.33s / 333ms into the animation)**

### Integration with Battle System
The battle system reads hit frame metadata to:
1. **Trigger damage calculation** at the exact hit frame.
2. **Spawn hit VFX** on the target at the hit frame.
3. **Play hit SFX** (via AbilitySFXSystem) at the hit frame.
4. **Apply knockback** starting from the hit frame.

### Hit Frame Metadata
Each animation resource stores its hit frame index. In GDScript:
```gdscript
## Example: Setting hit frame metadata on an AnimatedSprite2D
var hit_frames: Dictionary = {
    "attack": 3,    # 0-indexed: frame 4 of 6
    "ability": 4,   # 0-indexed: frame 5 of 8
    "special": 5,   # 0-indexed: frame 6 of 10
}
```

---

## 8. Loop Rules

| State | Looping | End Behavior |
|-------|---------|-------------|
| **Idle** | Loop continuously | -- |
| **Walk** (all directions) | Loop continuously | -- |
| **Attack** | Play once | Return to idle |
| **Ability** | Play once | Return to idle |
| **Faint** | Play once | **Hold last frame** (do not return to idle) |
| **Hit** | Play once | Return to idle |
| **Run** | Loop continuously | -- |
| **Special** | Play once | Return to idle |
| **Evolution** | Play once | Transition to new form's idle |
| **Victory** | Play once | Hold last frame or return to idle |
| **Sleep** | Loop continuously | -- |

### Transition Rules
- When a "play once" animation finishes, the system automatically transitions to `idle`.
- Exception: `faint` holds its last frame until the Sprite is removed from the scene.
- Interruptions: `hit` can interrupt `attack` or `ability` if damage is received mid-animation. The interrupted animation is cancelled, `hit` plays, then `idle` resumes.
- `evolution` is uninterruptible once started.

---

## 9. Animation State Machine

The Sprite animation controller follows this state machine:

```
                    ┌──────────────┐
                    │              │
              ┌────►│    IDLE      │◄────────────────┐
              │     │              │                  │
              │     └──┬───┬───┬──┘                  │
              │        │   │   │                     │
          (finished)   │   │   │                (finished)
              │        │   │   │                     │
              │   move │   │   │ attack/ability      │
              │        │   │   │                     │
              │   ┌────▼┐  │  ┌▼─────────┐    ┌─────┴────┐
              │   │WALK │  │  │ ATTACK / │    │   HIT    │
              │   │     │  │  │ ABILITY  │    │          │
              │   └──┬──┘  │  └────┬─────┘    └──────────┘
              │      │     │       │                ▲
              │  stop │     │  hit frame            │
              │      │     │       │           (damaged)
              │      │     │       ▼                │
              │      │     │  [Damage Applied]──────┘
              │      │     │
              │      │     │  fainted
              │      │     │
              │      │     ▼
              │      │  ┌──────────┐
              └──────┘  │  FAINT   │
                        │ (hold)   │
                        └──────────┘
```

---

## 10. VFX Animation Guidelines

Attack effect animations (hit sparks, elemental bursts) follow separate but related standards:

| Property | Specification |
|----------|--------------|
| Canvas size | 64 x 64 px (element-agnostic), up to 128 x 128 for large AoE |
| Frame count | 4-8 frames |
| FPS | 12-15 FPS (snappier than character anims) |
| Format | Horizontal strip PNG, same as character sheets |
| Loop | Never (play once and destroy) |
| Naming | `vfx_{element}_{type}.png` (e.g., `vfx_fire_hit.png`, `vfx_water_splash.png`) |
| Colors | Must use the element's palette from the Style Guide |

### VFX Timing
- VFX spawns on the target at the attacker's **hit frame**.
- VFX playback duration should not exceed **0.5s** (6 frames at 12 FPS).
- VFX fades to transparent on the last 1-2 frames (no hard cut).

---

## 11. Sprite Sheet Export Pipeline

### Step-by-Step Workflow
1. **Animate** in your tool of choice (Aseprite, Piskel, Photoshop, etc.).
2. **Export** as horizontal strip PNG at 1x native resolution.
3. **Verify** frame size matches stage canvas (64/96/128 px).
4. **Name** according to the convention: `{race_name}_{stage}_{state}.png`.
5. **Place** in the correct directory: `res://Sprites/Characters/{RaceName}/`.
6. **Import** in Godot: The `.import` file will be auto-generated. Verify `filter` is set to `false` (nearest neighbor) for pixel art.
7. **Create SpriteFrames**: Add the strip to a SpriteFrames resource, configure frame count, FPS, and loop settings.
8. **Set hit frame metadata** in the animation controller script.
9. **Test** all states play correctly with transitions.

### Godot Import Preset for Pixel Art
```
[remap]
importer="texture"
type="CompressedTexture2D"

[params]
compress/mode=0          # Lossless
compress/high_quality=false
compress/lossy_quality=0.7
compress/normal_map=0
mipmaps/generate=false
mipmaps/limit=-1
roughness/mode=0
process/fix_alpha_border=false
process/premult_alpha=false
process/normal_map_invert_y=false
process/hdr_as_srgb=false
detect_3d/compress_to=0
```

---

## 12. Memory Budget Per Sprite

Estimated VRAM usage per fully-loaded Sprite form (all core states):

| State | Frames | Stage 1 (64px) | Stage 2 (96px) | Stage 3 (128px) |
|-------|--------|----------------|----------------|-----------------|
| Idle | 4 | 64 KB | 144 KB | 256 KB |
| Walk (4 dirs) | 24 | 384 KB | 864 KB | 1,536 KB |
| Attack | 6 | 96 KB | 216 KB | 384 KB |
| Ability | 8 | 128 KB | 288 KB | 512 KB |
| Faint | 4 | 64 KB | 144 KB | 256 KB |
| Hit | 3 | 48 KB | 108 KB | 192 KB |
| **Total** | **49** | **784 KB** | **1,764 KB** | **3,136 KB** |

> Calculations assume RGBA8 (4 bytes per pixel), uncompressed in VRAM.

### Battle Scene Budget (5v5)
- 10 Sprites loaded simultaneously.
- Worst case (all Stage 3): 10 x 3,136 KB = **~31 MB** VRAM for character animations.
- Typical case (mixed stages): ~15-20 MB.
- This is well within mobile GPU VRAM limits (typically 1-4 GB).

---

## 13. Animation Delivery Checklist

Before submitting animation assets for integration:

- [ ] All 6 core states are present (idle, walk x4, attack, ability, faint, hit)
- [ ] Frame counts match specification
- [ ] Canvas size matches stage (64/96/128 px)
- [ ] Horizontal strip layout, no padding
- [ ] Pivot point is consistent across all frames
- [ ] No Sprite drift (feet stay anchored) across walk cycle
- [ ] Hit frame is clearly designated (documented in delivery notes)
- [ ] Faint animation holds last frame (no return to frame 1)
- [ ] PNG-32 with transparency, no background color
- [ ] Naming convention followed exactly
- [ ] File placed in correct `res://Sprites/Characters/{RaceName}/` directory
- [ ] Godot import settings verified (nearest neighbor, no mipmaps)
- [ ] All transitions tested in-engine (idle ↔ walk, idle → attack → idle, etc.)

---

## 14. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-16 | 2D Animator / Art Lead | Initial specification |
