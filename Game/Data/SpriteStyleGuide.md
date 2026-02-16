# [P10-001] Sprite Wars — Sprite Design Style Guide

> **Version:** 1.0
> **Last Updated:** 2026-02-16
> **Owner:** Art Lead
> **Engine:** Godot 4.2
> **Target Platforms:** Android / iOS (Mobile)

---

## 1. Overview

This document defines the visual art direction for all 72 Sprite forms (24 races x 3 evolution stages) in Sprite Wars. Every artist contributing character art must follow these standards to maintain a cohesive, readable, and mobile-optimized visual identity.

---

## 2. Sprite Dimensions

Each evolution stage uses a progressively larger canvas to reflect growing power and visual complexity.

| Stage | Canvas Size | Display Size (Battle Grid) | Display Size (UI Portrait) |
|-------|------------|---------------------------|---------------------------|
| **Stage 1** | 64 x 64 px | 64 x 64 px | 48 x 48 px |
| **Stage 2** | 96 x 96 px | 96 x 96 px | 64 x 64 px |
| **Stage 3** | 128 x 128 px | 128 x 128 px | 80 x 80 px |

### Canvas Rules
- All canvases must be **square** (1:1 aspect ratio).
- Sprites should fill **75-85%** of the canvas area; leave a small margin for visual breathing room and animation overshoot.
- Export as **PNG-32** (RGBA, 8 bits per channel) with transparent background.
- No anti-aliasing to external edges -- keep pixel-perfect outlines. Internal shading may use limited anti-aliasing between owned colors.

---

## 3. Color Palette

### Per-Sprite Limit
Each individual Sprite form uses a **maximum of 16 unique colors** (excluding full transparency). This constraint ensures:
- Clean, readable silhouettes on mobile screens.
- Consistency with the pixel art aesthetic.
- Efficient texture memory usage.

### Color Breakdown per Sprite
| Allocation | Count | Purpose |
|-----------|-------|---------|
| Outline | 1-2 | Dark outline + highlight edge |
| Primary body | 3-4 | Main body color + shading |
| Secondary feature | 2-3 | Accent markings, belly, mane |
| Element accent | 2-3 | Elemental glow, particles, aura |
| Eyes & details | 2-3 | Eyes, claws, teeth, gems |
| Highlight/specular | 1 | White or near-white specular pop |

### Element Color Palettes

Each of the 14 elements has a defined color family. Sprites of that element must draw their primary and accent colors from this palette. Secondary colors may pull from neutral tones.

#### Fire
| Swatch | Hex | Usage |
|--------|-----|-------|
| Deep Red | `#8B1A1A` | Dark shading, outline tint |
| Crimson | `#CC3333` | Primary body shadow |
| Flame Orange | `#E86A17` | Primary body |
| Warm Yellow | `#F5B731` | Highlights, flame tips |
| White-Hot | `#FFEEDD` | Specular, inner flame |

#### Water
| Swatch | Hex | Usage |
|--------|-----|-------|
| Deep Ocean | `#1A3A5C` | Dark shading |
| Royal Blue | `#2E6BAD` | Primary body shadow |
| Cerulean | `#4A9FD9` | Primary body |
| Sky Cyan | `#7DD4F0` | Highlights, water surface |
| White Foam | `#E8F4FA` | Specular, foam, bubbles |

#### Plant
| Swatch | Hex | Usage |
|--------|-----|-------|
| Dark Bark | `#3D2B1F` | Dark shading, wood |
| Forest Green | `#2D6E2D` | Primary body shadow |
| Leaf Green | `#4CAF50` | Primary body |
| Spring Green | `#8BC34A` | Highlights, new growth |
| Petal Yellow | `#FFE082` | Flowers, pollen accents |

#### Ice
| Swatch | Hex | Usage |
|--------|-----|-------|
| Glacier Blue | `#1B3A4B` | Deep shadow |
| Frost Blue | `#5B9BD5` | Primary body shadow |
| Ice Blue | `#A8D8EA` | Primary body |
| Pale Frost | `#D4EEF7` | Highlights |
| Crystal White | `#F0F8FF` | Specular, ice shards |

#### Wind
| Swatch | Hex | Usage |
|--------|-----|-------|
| Storm Gray | `#4A5568` | Dark shading |
| Sage Green | `#7B9E87` | Primary body shadow |
| Breeze Green | `#A8D5BA` | Primary body |
| Mist Gray | `#CBD5E0` | Cloud wisps |
| White Wisp | `#F7FAFC` | Specular, wind trails |

#### Earth
| Swatch | Hex | Usage |
|--------|-----|-------|
| Deep Soil | `#3E2723` | Dark shading |
| Clay Brown | `#795548` | Primary body shadow |
| Sandstone | `#A1887F` | Primary body |
| Tan | `#D7CCC8` | Highlights, sand |
| Moss Green | `#558B2F` | Vegetation accent |

#### Electric
| Swatch | Hex | Usage |
|--------|-----|-------|
| Thunder Dark | `#1A237E` | Dark shading |
| Storm Blue | `#3F51B5` | Primary body shadow |
| Volt Yellow | `#FFD600` | Primary body / energy |
| Lightning | `#FFFF00` | Bright sparks |
| Arc White | `#FFFFFF` | Specular, electric arcs |

#### Dark
| Swatch | Hex | Usage |
|--------|-----|-------|
| Void Black | `#1A1A2E` | Deep shadow, near-black |
| Shadow Purple | `#3D1F5C` | Primary body shadow |
| Dusk Purple | `#6A3D7D` | Primary body |
| Twilight | `#9C6DB8` | Highlights |
| Blood Red | `#8B0000` | Accent, eyes, markings |

#### Light
| Swatch | Hex | Usage |
|--------|-----|-------|
| Warm Gold | `#B8860B` | Dark shading |
| Bright Gold | `#DAA520` | Primary body shadow |
| Radiant White | `#FFF8DC` | Primary body |
| Halo Yellow | `#FFFACD` | Highlights, aura |
| Pure White | `#FFFFFF` | Specular, divine glow |

#### Fairy
| Swatch | Hex | Usage |
|--------|-----|-------|
| Deep Rose | `#8B2252` | Dark shading |
| Magenta Pink | `#D81B8C` | Primary body shadow |
| Fairy Pink | `#F48FB1` | Primary body |
| Lavender | `#CE93D8` | Secondary accent |
| Sparkle White | `#FCE4EC` | Specular, sparkle accents |

#### Lunar
| Swatch | Hex | Usage |
|--------|-----|-------|
| Night Sky | `#0D1B2A` | Deep shadow |
| Midnight Blue | `#1B2838` | Primary body shadow |
| Moonlight Silver | `#B0BEC5` | Primary body |
| Pale Lavender | `#B39DDB` | Accent, lunar glow |
| Moon White | `#ECEFF1` | Specular, crescent motifs |

#### Solar
| Swatch | Hex | Usage |
|--------|-----|-------|
| Corona Red | `#BF360C` | Dark shading |
| Solar Orange | `#FF6F00` | Primary body shadow |
| Sun Gold | `#FFB300` | Primary body |
| Flare Yellow | `#FFD54F` | Highlights, solar flare |
| Core White | `#FFF9C4` | Specular, inner glow |

#### Metal
| Swatch | Hex | Usage |
|--------|-----|-------|
| Dark Steel | `#263238` | Deep shadow |
| Gunmetal | `#455A64` | Primary body shadow |
| Silver | `#90A4AE` | Primary body |
| Bright Steel | `#CFD8DC` | Highlights |
| Chrome White | `#ECEFF1` | Specular, reflections |

#### Poison
| Swatch | Hex | Usage |
|--------|-----|-------|
| Toxic Black | `#1B0033` | Deep shadow |
| Dark Venom | `#4A148C` | Primary body shadow |
| Poison Purple | `#7B1FA2` | Primary body |
| Sickly Green | `#76FF03` | Accent, drip, ooze |
| Magenta Glow | `#EA80FC` | Highlights, toxic aura |

---

## 4. Proportions & Anatomy

Evolution stages use a consistent head-to-body ratio that shifts from cute to imposing.

### Stage 1 — Cute / Chibi
- **Head-to-body ratio:** 1:2 to 1:3 (large head, small body)
- **Eyes:** Large, round, expressive — take up ~30-40% of face area
- **Limbs:** Short, stubby, simplified
- **Details:** Minimal; 1-2 distinguishing features (e.g., a tail flame, ear tufts)
- **Personality:** Approachable, endearing, mascot-like
- **Pose:** Forward-facing, slightly tilted for charm

### Stage 2 — Balanced / Adolescent
- **Head-to-body ratio:** 1:3 to 1:4 (proportional head, defined body)
- **Eyes:** Medium, still expressive but more determined
- **Limbs:** Defined joints, claws/paws visible
- **Details:** Moderate; 3-4 features that build on Stage 1 (e.g., larger flame, mane growth)
- **Personality:** Confident, capable, growing
- **Pose:** Slight action stance, weight shifted

### Stage 3 — Imposing / Mature
- **Head-to-body ratio:** 1:4 to 1:5 (smaller head relative to powerful body)
- **Eyes:** Focused, intense, may have additional eye details (pupils, glow)
- **Limbs:** Fully articulated, muscular or sleek depending on species
- **Details:** Rich; 5+ features with intricate element-themed ornamentation
- **Personality:** Powerful, awe-inspiring, formidable
- **Pose:** Dynamic, commanding, may have spread wings/arms

---

## 5. The Silhouette Rule

**Every Sprite must be instantly recognizable by its silhouette alone when viewed at 32x32 pixels.**

This is the single most important readability rule. On mobile screens, during fast-paced battle, players identify Sprites primarily by shape.

### Silhouette Testing Procedure
1. Flatten the Sprite to a solid black shape (all opaque pixels become `#000000`).
2. Scale down to 32x32 pixels using nearest-neighbor interpolation (no smoothing).
3. The Sprite must still be identifiable — distinguishable from every other Sprite in the game.
4. Key identifying features (horns, wings, tail shape, ear shape) must remain visible at this scale.

### Silhouette Design Principles
- **Unique contour:** No two Sprites in the same stage should share the same general outline shape.
- **Asymmetric accents:** Add a feature that breaks symmetry (e.g., one horn longer, tail curving one direction) to aid recognition.
- **Avoid internal-only detail:** If a Sprite's only distinguishing feature is a pattern or color on its body, it will fail the silhouette test. The outline itself must be distinct.
- **Negative space:** Use gaps (between ears, legs, wings) to create recognizable negative space shapes.

### Silhouette Checksheet
For each new Sprite, create a 4-up comparison sheet:
```
[Full Color 64px] [Silhouette 64px] [Full Color 32px] [Silhouette 32px]
```
This must be submitted alongside the art asset for review.

---

## 6. Evolution Visual Progression

Each 3-stage evolution line must feel like a natural progression while maintaining clear lineage.

### Continuity Rules
1. **Shared Core Feature:** At least one prominent feature (e.g., tail shape, ear style, eye color) must persist across all 3 stages in a recognizable form.
2. **Additive Complexity:** Each stage adds detail; never remove a defining feature without replacing it with a clear evolution of that feature.
3. **Color Consistency:** The dominant color hue shifts no more than 30 degrees on the color wheel between stages. Saturation and value may change more freely.
4. **Size Progression:** Each stage must visually read as larger and more powerful than the previous.
5. **Element Intensification:** Elemental visual effects (flames, water drops, leaf patterns) become more prominent and elaborate with each stage.

### Progression Examples
| Feature | Stage 1 | Stage 2 | Stage 3 |
|---------|---------|---------|---------|
| Fire tail | Small flame tuft | Flickering flame tail | Blazing inferno mane/tail |
| Water fins | Tiny ear fins | Dorsal fin + side fins | Full fin crest + flowing tail |
| Plant growth | Single leaf sprout | Vine wrapping + flowers | Full canopy / floral armor |

### What to Avoid
- Stage 3 looking like a completely different creature unrelated to Stage 1.
- Regression: Stage 2 looking simpler or less detailed than Stage 1.
- Color clash: Introducing a color in Stage 3 that was not hinted at in Stages 1 or 2.
- Scale confusion: Stage 2 appearing larger than Stage 3 due to pose/proportion choices.

---

## 7. Mobile Readability Standards

All art must pass readability checks on actual mobile devices (or accurate emulators) at target resolution.

### Outline Requirements
- **Outline width:** 1-2 pixels of dark outline on all Sprites.
- **Outline color:** Use a darkened, desaturated version of the adjacent body color (not pure black unless the Sprite itself is very dark).
  - Example: For a Fire Sprite with body color `#E86A17`, outline could be `#5C2A0A`.
- **Inner outlines:** Optional 1px inner outlines to separate major body sections (head/body/limbs). These should be lighter than the external outline.
- **No outline breaks:** The silhouette outline must be continuous -- no gaps where background shows through at the edge.

### Detail Line Rules
- **Minimum line width:** 2 pixels for any visible detail line at native resolution.
- **No 1px internal detail lines** -- these become invisible or noisy on mobile displays.
- **Use color contrast** instead of thin lines to delineate features where possible.

### Zoom Testing
Every Sprite must be reviewed at these zoom levels:
| Zoom Level | Use Case | Must Be Readable? |
|------------|----------|--------------------|
| 100% (native) | Asset editing | Yes (full detail) |
| 75% | Large screen tablets | Yes |
| 50% | Standard mobile phone | Yes (silhouette + major features) |
| 25% | Small phone / minimap icon | Silhouette recognizable only |

### Contrast Requirements
- Minimum contrast ratio of **3:1** between the Sprite outline and the lightest expected battle background.
- Minimum contrast ratio of **2:1** between adjacent color regions within the Sprite.
- Test against all battle background types: grass, sand, water, cave, temple stone, snow.

---

## 8. Battle Grid Rendering

### Grid Cell Sizing
| Grid | Cell Size | Sprite Padding |
|------|-----------|----------------|
| Battle (5x5) | 128 x 128 px | 8 px per side |
| Overworld (tiles) | 64 x 64 px | 4 px per side |

### Layering & Z-Order
- Sprites on higher grid rows (further from camera) render behind sprites on lower rows.
- Flying Sprites render at +1 z-layer above grounded Sprites in the same row.
- Attack VFX render at +2 z-layers above the attacker.

### Shadow
- All grounded Sprites have a simple **elliptical shadow** beneath them: 60% of Sprite width, 20% of Sprite height, color `#00000040` (black at 25% opacity).
- Flying Sprites have the same shadow but positioned at ground level (offset downward).

---

## 9. UI Portrait Guidelines

Sprites appear in UI contexts (team roster, collection, shop) as portrait thumbnails.

### Portrait Specs
| Context | Size | Crop |
|---------|------|------|
| Team slot | 48 x 48 px | Head + upper body |
| Collection grid | 64 x 64 px | Full Sprite (scaled down) |
| Detail view | 128 x 128 px | Full Sprite at native or scaled |
| Evolution preview | 96 x 96 px | Full Sprite centered |

### Portrait Frame
- Portraits are displayed inside a rounded-rectangle frame with a **2px border** colored by element.
- Background: Subtle gradient using the element's darkest and lightest palette colors at 30% opacity.

---

## 10. File Naming & Organization

### Naming Convention
```
{RaceName}_{Stage}_{Asset}.png
```

| Component | Format | Example |
|-----------|--------|---------|
| RaceName | PascalCase, no spaces | `Emberpaw`, `Tidalfin`, `Thornsprout` |
| Stage | `S1`, `S2`, `S3` | `S1` |
| Asset | Descriptive tag | `Idle`, `Portrait`, `Silhouette` |

### Examples
```
Emberpaw_S1_Idle.png
Emberpaw_S1_Portrait.png
Emberpaw_S2_Idle.png
Blazefang_S2_Portrait.png
Infernowolf_S3_Idle.png
```

### Directory Structure
```
res://Sprites/Characters/
├── Emberpaw/
│   ├── Emberpaw_S1_Idle.png
│   ├── Emberpaw_S1_Walk.png
│   ├── Emberpaw_S1_Attack.png
│   ├── Emberpaw_S1_Portrait.png
│   ├── Emberpaw_S2_Idle.png
│   └── ...
├── Tidalfin/
│   └── ...
└── ...
```

---

## 11. Art Review Checklist

Before any Sprite art is approved for integration, it must pass this checklist:

- [ ] Canvas is correct size for stage (64/96/128 px square)
- [ ] Maximum 16 unique colors (verify with indexed color count)
- [ ] Colors pull from the correct element palette
- [ ] Head-to-body ratio matches stage guidelines
- [ ] Passes silhouette test at 32x32 (submit silhouette sheet)
- [ ] Evolution continuity: shared features with previous/next stage
- [ ] 1-2px dark outline is continuous with no gaps
- [ ] No internal detail lines thinner than 2px
- [ ] Readable at 50% zoom on a mobile device
- [ ] Contrast passes against all battle background types
- [ ] Shadow ellipse included for battle rendering
- [ ] Portrait crop looks good at 48x48
- [ ] File naming follows convention
- [ ] PNG-32 with transparent background, no pre-multiplied alpha

---

## 12. Element Visual Identity Summary

Quick reference for each element's visual motifs beyond color:

| Element | Shape Motifs | Texture Cues | Particle FX |
|---------|-------------|--------------|-------------|
| Fire | Sharp angles, flame shapes | Crackled, ember texture | Rising sparks, heat haze |
| Water | Curves, wave shapes, droplets | Glossy, reflective highlights | Bubbles, water droplets |
| Plant | Organic curves, leaf shapes | Bark texture, vein patterns | Floating leaves, pollen |
| Ice | Crystalline angles, hexagons | Frosted, semi-transparent | Snowflakes, frost mist |
| Wind | Flowing curves, spiral shapes | Wispy, semi-transparent | Swirling lines, feathers |
| Earth | Blocky, angular, solid | Rough stone, cracked dirt | Dust clouds, pebbles |
| Electric | Zigzag lines, bolt shapes | Crackling, bright edges | Sparks, arcing bolts |
| Dark | Pointed, angular, shadow wisps | Smoky, void-like | Shadow tendrils, dark mist |
| Light | Radial, starburst, halos | Smooth, luminous | Light rays, lens flares |
| Fairy | Rounded, heart/star shapes | Sparkly, iridescent | Glitter, tiny stars |
| Lunar | Crescent curves, orbital arcs | Pale, ethereal | Moon dust, soft glow |
| Solar | Radial spikes, corona shapes | Warm, pulsing brightness | Solar flares, heat lines |
| Metal | Geometric, plated, rivets | Polished, reflective | Metal shards, sparks |
| Poison | Dripping, bubbling, thorns | Slimy, corroded | Toxic drips, gas clouds |

---

## 13. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-16 | Art Lead | Initial style guide |
