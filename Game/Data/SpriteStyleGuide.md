# [P10-001] Sprite Wars — Sprite Design Style Guide

> **Version:** 3.0
> **Last Updated:** 2026-03-09
> **Owner:** Art Lead
> **Engine:** Godot 4.2
> **Target Platforms:** Android / iOS (Mobile)

---

## 1. Overview

This document defines the **Flat Cel-Shaded Chibi** art direction for all 72 Sprite forms (24 races x 3 evolution stages) in Sprite Wars. The visual style is clean, professional, vibrant, and readable — a polished cel-shaded illustration style with chibi proportions.

### Core Style Characteristics
- **Clean uniform outlines (2px)** — perfectly straight, consistent thickness, crisp digital lines with no wobble or variation.
- **Clean digital lines** — no imperfections, no hand-drawn artifacts, no pen stroke texture.
- **Flat solid color fills with hard-edged shadow/highlight zones** — each color area has exactly one shadow zone and one highlight zone with sharp transitions (no gradients, no hatching, no cross-hatching).
- **Vibrant saturated fantasy color palette** — bold, vivid colors that pop on mobile screens.
- **Clean professional cel-shaded illustration** — every Sprite should look like a polished 2D game character with bold, readable shapes.

### Cel-Shading Principle
> One highlight zone and one shadow zone per color area, hard-edged transitions (no soft gradients). Shadow zones are approximately 25% darker than the base color. Highlight zones are approximately 20% lighter than the base color. Transitions between zones are pixel-sharp with no blending or feathering.

Every artist contributing character art must follow these standards to maintain a cohesive, readable, and mobile-optimized visual identity rooted in the Flat Cel-Shaded Chibi aesthetic.

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
- Use **hard pixel-perfect edges** on all outlines. The Flat Cel-Shaded Chibi style requires crisp, clean edges with no anti-aliasing blur on outlines. Internal color zone boundaries should also be hard-edged.

---

## 3. Color Palette

### Per-Sprite Limit
Each individual Sprite form uses a **maximum of 20 unique colors** (excluding full transparency). The cel-shaded style is efficient with colors since each area only needs base + shadow + highlight. This constraint ensures:
- Clean, readable silhouettes on mobile screens.
- Consistency with the Flat Cel-Shaded Chibi aesthetic.
- Efficient texture memory usage.

### Color Breakdown per Sprite
| Allocation | Count | Purpose |
|-----------|-------|---------|
| Outline | 1 | Clean Black (#000000) for all outlines |
| Primary body | 3 | Base + shadow + highlight |
| Secondary feature | 3 | Accent markings (base + shadow + highlight) |
| Element accent | 3 | Elemental glow/particles (base + shadow + highlight) |
| Eyes & details | 2-3 | Dot eyes (black), teeth, gems, claws |
| Tertiary color | 3 | Additional color zone (base + shadow + highlight) |
| Specular pop | 1-2 | White or near-white specular highlight |

### Outline Color
All Sprite outlines use a single uniform color:

| Swatch | Hex | Usage |
|--------|-----|-------|
| Clean Black | `#000000` | All outlines — external silhouette and internal part separation |

### Cel-Shaded Color Treatment
> **Important:** All colors should be **vibrant and saturated** — bold fantasy colors that read clearly on small mobile screens. Each color zone consists of exactly three values: **base color**, **shadow** (base darkened ~25%), and **highlight** (base lightened ~20%). Transitions between these zones are hard-edged with no blending, gradients, or feathering. Colors must stay cleanly within outlines with no bleeding or overflow.

### Element Color Palettes

Each of the 14 elements has a defined color family. Sprites of that element must draw their primary and accent colors from this palette. Colors below use vibrant saturation to match the cel-shaded style.

#### Fire
| Swatch | Hex | Usage |
|--------|-----|-------|
| Deep Red | `#A01010` | Shadow zone |
| Crimson | `#E03030` | Base body color |
| Flame Orange | `#F07020` | Secondary / flame accent |
| Warm Yellow | `#F5C020` | Highlight zone |
| White-Hot | `#FFF0D0` | Specular pop |

#### Water
| Swatch | Hex | Usage |
|--------|-----|-------|
| Deep Ocean | `#104080` | Shadow zone |
| Royal Blue | `#2080D0` | Base body color |
| Cerulean | `#40B0F0` | Highlight zone |
| Sky Cyan | `#70D8FF` | Secondary accent |
| White Foam | `#E0F4FF` | Specular pop |

#### Plant
| Swatch | Hex | Usage |
|--------|-----|-------|
| Dark Bark | `#2E1A0E` | Dark shadow, wood |
| Forest Green | `#208020` | Shadow zone |
| Leaf Green | `#40C040` | Base body color |
| Spring Green | `#80E040` | Highlight zone |
| Petal Yellow | `#FFD860` | Flower/pollen accent |

#### Ice
| Swatch | Hex | Usage |
|--------|-----|-------|
| Glacier Blue | `#103848` | Deep shadow |
| Frost Blue | `#4898E0` | Shadow zone |
| Ice Blue | `#90D0F0` | Base body color |
| Pale Frost | `#C0E8F8` | Highlight zone |
| Crystal White | `#F0F8FF` | Specular pop |

#### Wind
| Swatch | Hex | Usage |
|--------|-----|-------|
| Storm Gray | `#3A4858` | Shadow zone |
| Sage Green | `#68A080` | Base body shadow |
| Breeze Green | `#90D0B0` | Base body color |
| Mist White | `#C0E8D8` | Highlight zone |
| White Wisp | `#F0FAF8` | Specular pop |

#### Earth
| Swatch | Hex | Usage |
|--------|-----|-------|
| Deep Soil | `#301E10` | Deep shadow |
| Clay Brown | `#785040` | Shadow zone |
| Sandstone | `#A88868` | Base body color |
| Tan | `#D0C0A8` | Highlight zone |
| Moss Green | `#409020` | Vegetation accent |

#### Electric
| Swatch | Hex | Usage |
|--------|-----|-------|
| Thunder Dark | `#101880` | Shadow zone |
| Storm Blue | `#3048C0` | Secondary accent |
| Volt Yellow | `#FFD800` | Base body / energy |
| Lightning | `#FFFF20` | Highlight zone |
| Arc White | `#FFFFFF` | Specular pop |

#### Dark
| Swatch | Hex | Usage |
|--------|-----|-------|
| Void Black | `#101028` | Deep shadow |
| Shadow Purple | `#381858` | Shadow zone |
| Dusk Purple | `#603080` | Base body color |
| Twilight | `#9060C0` | Highlight zone |
| Blood Red | `#C00000` | Accent, eyes, markings |

#### Light
| Swatch | Hex | Usage |
|--------|-----|-------|
| Warm Gold | `#C09010` | Shadow zone |
| Bright Gold | `#E8B820` | Base body shadow |
| Radiant White | `#FFF8D0` | Base body color |
| Halo Yellow | `#FFFAE0` | Highlight zone |
| Pure White | `#FFFFFF` | Specular pop |

#### Fairy
| Swatch | Hex | Usage |
|--------|-----|-------|
| Deep Rose | `#901850` | Shadow zone |
| Magenta Pink | `#E01890` | Base body shadow |
| Fairy Pink | `#FF70B0` | Base body color |
| Lavender | `#D880E0` | Highlight / secondary |
| Sparkle White | `#FFE0F0` | Specular pop |

#### Lunar
| Swatch | Hex | Usage |
|--------|-----|-------|
| Night Sky | `#081828` | Deep shadow |
| Midnight Blue | `#182838` | Shadow zone |
| Moonlight Silver | `#A0B8C8` | Base body color |
| Pale Lavender | `#A890D8` | Highlight / accent |
| Moon White | `#E8F0F8` | Specular pop |

#### Solar
| Swatch | Hex | Usage |
|--------|-----|-------|
| Corona Red | `#C83008` | Shadow zone |
| Solar Orange | `#FF7800` | Base body shadow |
| Sun Gold | `#FFC000` | Base body color |
| Flare Yellow | `#FFE040` | Highlight zone |
| Core White | `#FFFAC0` | Specular pop |

#### Metal
| Swatch | Hex | Usage |
|--------|-----|-------|
| Dark Steel | `#202830` | Deep shadow |
| Gunmetal | `#384858` | Shadow zone |
| Silver | `#8098B0` | Base body color |
| Bright Steel | `#C0D0E0` | Highlight zone |
| Chrome White | `#E8F0F8` | Specular pop |

#### Poison
| Swatch | Hex | Usage |
|--------|-----|-------|
| Toxic Black | `#180030` | Deep shadow |
| Dark Venom | `#401090` | Shadow zone |
| Poison Purple | `#7018B0` | Base body color |
| Sickly Green | `#60FF00` | Accent, drip, ooze |
| Magenta Glow | `#F070FF` | Highlight zone |

---

## 4. Proportions & Anatomy

All evolution stages use **chibi proportions** — even final forms remain cute and compact. The style shifts from extra-chibi to slightly more detailed chibi, never reaching realistic proportions.

### Universal Body Rules (All Stages)
- **Rounded, compact limbs** with smooth curves — everything should look clean and solid.
- **Hands** are simple mittens or circles (no individual fingers unless the Sprite specifically requires them for identity).
- **Feet** are round stubs — simple, chunky, and cute.
- **No overly complex geometry** on bodies — even armored or metallic Sprites should have rounded, clean edges with bold readable silhouettes.
- **Modular armor design** — armor pieces are clearly defined shapes with bold outlines, designed for easy visual parsing at small sizes.

### Stage 1 — Extra Chibi / Baby Form
- **Head-to-body ratio:** 1:1.5 (very large, round head dominates the body)
- **Eyes:** Simple dot eyes — small filled black circles, taking up ~20-30% of face area
- **Limbs:** Tiny, rounded nubs — barely visible
- **Details:** Minimal; 1-2 distinguishing features (e.g., a small tail flame, tiny ear tufts)
- **Personality:** Maximum cute, baby-like, irresistible
- **Pose:** Forward-facing, slightly tilted for charm
- **Cel-shading:** Simplest shading — large flat color zones, minimal shadow/highlight areas

### Stage 2 — Chibi / Kid Form
- **Head-to-body ratio:** 1:2 (still chibi, cute with bigger features than realistic)
- **Eyes:** Simple dot eyes — small filled black circles, slightly larger than Stage 1
- **Limbs:** Short and rounded, mitten hands slightly defined, stubby feet
- **Details:** Moderate; 3-4 features that build on Stage 1 (e.g., larger flame, mane growth)
- **Personality:** Confident but still cute, capable little adventurer
- **Pose:** Slight action stance, weight shifted
- **Cel-shading:** More defined shadow/highlight zones, additional color areas for detail

### Stage 3 — Chibi / Final Form
- **Head-to-body ratio:** 1:2.5 (still chibi even at final form, slightly more detailed)
- **Eyes:** Simple dot eyes — small filled black circles, may have a single white specular dot for emphasis
- **Limbs:** Rounded but slightly more defined, mitten hands may show claw shapes, feet slightly articulated
- **Details:** Rich; 5+ features with element-themed ornamentation (clean flame shapes, crystalline structures, etc.)
- **Personality:** Powerful but still adorably chibi — formidable yet huggable
- **Pose:** Dynamic, commanding, may have spread wings/arms — but with rounded chibi proportions
- **Cel-shading:** Most detailed shading with multiple color zones, crisp shadow/highlight areas on each section

---

## 5. The Silhouette Rule

**Every Sprite must be instantly recognizable by its silhouette alone when viewed at 32x32 pixels.**

This is the single most important readability rule. On mobile screens, during fast-paced battle, players identify Sprites primarily by shape.

### Silhouette Testing Procedure
1. Flatten the Sprite to a solid black shape (all opaque pixels become `#000000`).
2. Scale down to 32x32 pixels using nearest-neighbor interpolation (no smoothing).
3. The Sprite must still be identifiable — distinguishable from every other Sprite in the game.
4. Key identifying features (horns, wings, tail shape, ear shape) must remain visible at this scale.

### Outline Note
In the Flat Cel-Shaded Chibi style, outlines are **2px thick** and **perfectly uniform** — clean, straight, and consistent. This crisp outline creates strong silhouette readability at small sizes, as the consistent line weight provides a clear boundary between the Sprite and background. The clean outline is part of the silhouette shape.

### Silhouette Design Principles
- **Unique contour:** No two Sprites in the same stage should share the same general outline shape.
- **Asymmetric accents:** Add a feature that breaks symmetry (e.g., one horn longer, tail curving one direction) to aid recognition.
- **Avoid internal-only detail:** If a Sprite's only distinguishing feature is a pattern or color on its body, it will fail the silhouette test. The outline itself must be distinct.
- **Negative space:** Use gaps (between ears, legs, wings) to create recognizable negative space shapes.
- **Bold readable silhouettes:** Design armor and accessories as distinct shapes that contribute to the overall silhouette, not just surface decoration.

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
6. **Shading Complexity:** Shadow/highlight zones become more numerous and refined with each evolution stage.

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
- **Outline width:** 2 pixels, **perfectly uniform** — clean, crisp, and consistent thickness everywhere. No wobble, no variation, no taper.
- **Outline color:** Use **Clean Black** (`#000000`) for all outlines on all Sprites, regardless of element or color temperature.
- **Inner outlines:** 1-2px inner lines in Clean Black to separate major body sections (head/body/limbs) and armor pieces.
- **No outline breaks:** The silhouette outline must be continuous — no gaps where background shows through at the edge.
- **Hard edges:** The cel-shaded style uses crisp, pixel-perfect hard edges. No anti-aliasing, feathering, or soft edge treatment on outlines.

### Detail Line Rules
- **Minimum line width:** 1 pixel for fine internal detail lines.
- **2px recommended** for important feature-defining details that must read at small sizes.
- **Use flat color zones** for shading and detail — shadow zones and highlight zones with hard edges, not hatching or cross-hatching.

### Eyes
All Sprites use **simple dot eyes** — small filled black circles. This is a core part of the Flat Cel-Shaded Chibi identity:
- **Stage 1:** Small dot eyes (2-3px diameter), centered on face.
- **Stage 2:** Slightly larger dot eyes (3-4px diameter), positioned for expression.
- **Stage 3:** Dot eyes (3-4px diameter), may include a single 1px white specular dot for emphasis. No sparkle eyes, no detailed iris.

### Zoom Testing
Every Sprite must be reviewed at these zoom levels:
| Zoom Level | Use Case | Must Be Readable? |
|------------|----------|--------------------|
| 100% (native) | Asset editing | Yes (full detail) |
| 75% | Large screen tablets | Yes |
| 50% | Standard mobile phone | Yes (silhouette + major features) |
| 25% | Small phone / minimap icon | Silhouette recognizable only |

### Contrast Requirements
- Minimum contrast ratio of **4:1** between the Sprite outline (black) and the lightest expected battle background.
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

### Grid Lines
The battle grid uses **clean straight grid borders** with consistent line weight. Grid lines should be crisp and uniform, matching the overall Flat Cel-Shaded Chibi aesthetic. Use `#000000` at 15% opacity for grid lines.

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
- Portraits are displayed inside a **clean geometric border** frame — crisp, uniform line weight, perfectly straight edges. Use a **2px thick** line in Clean Black (`#000000`).
- Frame corners should be cleanly rounded (uniform radius).
- Background: **Flat color fill** using the element's lightest palette color at 40% opacity, with hard edges at the frame boundary.

---

## 10. File Naming & Organization

### Naming Convention
```
{RaceName}_{Stage}_{Asset}.png
```

| Component | Format | Example |
|-----------|--------|---------|
| RaceName | PascalCase, underscores for multi-word | `BugMan`, `BearMan`, `BirdMan` |
| Stage | `S1`, `S2`, `S3` | `S1` |
| Asset | Descriptive tag | `Idle`, `Portrait`, `Silhouette` |

### Examples
```
BugMan_S1_Idle.png
BugMan_S1_Portrait.png
BugMan_S2_Idle.png
BugMan_S2_Portrait.png
BugMan_S3_Idle.png
```

### Directory Structure
```
res://Sprites/Characters/
├── BugMan/
│   ├── BugMan_S1_Idle.png
│   ├── BugMan_S1_Walk.png
│   ├── BugMan_S1_Attack.png
│   ├── BugMan_S1_Portrait.png
│   ├── BugMan_S2_Idle.png
│   └── ...
├── BearMan/
│   └── ...
└── ...
```

---

## 11. Art Review Checklist

Before any Sprite art is approved for integration, it must pass this checklist:

- [ ] Canvas is correct size for stage (64/96/128 px square)
- [ ] Maximum 20 unique colors (verify with indexed color count)
- [ ] Colors pull from the correct element palette with vibrant saturated treatment
- [ ] Head-to-body ratio matches chibi stage guidelines (1:1.5 / 1:2 / 1:2.5)
- [ ] Passes silhouette test at 32x32 (submit silhouette sheet)
- [ ] Evolution continuity: shared features with previous/next stage
- [ ] 2px uniform Clean Black (#000000) outline is continuous with no gaps
- [ ] Flat cel-shaded coloring: one shadow zone + one highlight zone per color area, hard edges only
- [ ] No gradients, no hatching, no cross-hatching, no color bleed
- [ ] Simple dot eyes (small filled black circles), no sparkle eyes
- [ ] Readable at 50% zoom on a mobile device
- [ ] Contrast passes against all battle background types
- [ ] Shadow ellipse included for battle rendering
- [ ] Portrait crop looks good at 48x48
- [ ] File naming follows convention
- [ ] PNG-32 with transparent background, no pre-multiplied alpha

---

## 12. Element Visual Identity Summary

Quick reference for each element's visual motifs beyond color:

| Element | Shape Motifs | Texture Cues | Particle FX | Cel-Shaded Motif |
|---------|-------------|--------------|-------------|-------------------|
| Fire | Sharp angles, flame shapes | Flat warm fills, hard shadow edges | Rising sparks, heat haze | Bold flame silhouettes, sharp shadow/highlight zones |
| Water | Curves, wave shapes, droplets | Flat cool fills, crisp reflective highlight | Bubbles, water droplets | Clean wave shapes, single specular highlight per droplet |
| Plant | Organic curves, leaf shapes | Flat green fills, bark shadow zones | Floating leaves, pollen | Layered flat leaf shapes, clean vine silhouettes |
| Ice | Crystalline angles, hexagons | Flat cool fills, sharp facet highlights | Snowflakes, frost mist | Geometric facets with hard highlight edges |
| Wind | Flowing curves, spiral shapes | Semi-transparent flat fills | Swirling lines, feathers | Clean curved silhouettes, transparent layered zones |
| Earth | Blocky, angular, solid | Flat brown fills, hard crack lines | Dust clouds, pebbles | Bold rocky shapes, clean crack detail lines |
| Electric | Zigzag lines, bolt shapes | Bright flat fills, sharp energy edges | Sparks, arcing bolts | Clean zigzag bolt shapes, high-contrast glow zones |
| Dark | Pointed, angular, shadow wisps | Dark flat fills, deep shadow zones | Shadow tendrils, dark mist | Deep layered shadow zones, sharp wisp silhouettes |
| Light | Radial, starburst, halos | Bright flat fills, luminous highlights | Light rays, lens flares | Clean starburst shapes, bold halo outlines |
| Fairy | Rounded, heart/star shapes | Soft pink flat fills, sparkle highlights | Glitter, tiny stars | Clean heart/star shapes, pastel cel zones |
| Lunar | Crescent curves, orbital arcs | Pale flat fills, silver highlights | Moon dust, soft glow | Clean crescent shapes, cool-toned shadow zones |
| Solar | Radial spikes, corona shapes | Warm bright flat fills, hot highlights | Solar flares, heat lines | Bold radial spike shapes, warm highlight zones |
| Metal | Geometric, plated, rivets | Flat metallic fills, sharp specular | Metal shards, sparks | Clean plate shapes, crisp specular highlight zones |
| Poison | Dripping, bubbling, thorns | Flat toxic fills, vivid accent zones | Toxic drips, gas clouds | Bold drip silhouettes, high-contrast toxic green accents |

---

## 13. Cel-Shaded Art Style Rules

These rules define the core artistic principles of the Flat Cel-Shaded Chibi style. All artists must internalize these before creating Sprite assets.

### Line Quality
All outlines must be **clean, uniform, and digitally precise**. Lines are exactly 2px thick everywhere — no variation, no wobble, no taper. Every line should be perfectly straight or smoothly curved with no hand-drawn imperfections. Use Clean Black (#000000) for all outlines.

### Shading
Use **flat color zones with hard-edged transitions** for all shading. Each color area has exactly three values: base color, shadow (darker), and highlight (lighter). Shadow zones are ~25% darker than base. Highlight zones are ~20% lighter than base. Transitions between zones are pixel-sharp — no gradients, no feathering, no blending. Never use hatching, cross-hatching, or scribble fills.

### Color Fills
Colors must **stay cleanly within outlines** with no bleeding or overflow. Every color region is a flat, solid fill with hard edges. No texture, no grain, no pencil marks. Color zones should be clearly defined geometric or organic shapes, not loose or sketchy.

### Expressions
Chibi faces use **simple, clean features**:
- **Eyes:** Simple dot eyes (small filled black circles) at all stages. No sparkle eyes, no detailed iris, no colored eyes. Stage 3 may add a single 1px white specular dot.
- **Mouths:** Simple curved lines — a smile is a single clean arc, surprise is a small circle, determination is a flat dash. All in Clean Black.
- **No blush circles** — the cel-shaded style does not use blush marks.
- **Eyebrows:** Optional short clean strokes above eyes for emotion (anger, worry, surprise).

### Motion & Energy
Convey motion through **pose, squash/stretch, and VFX particles** rather than drawn motion lines. The cel-shaded style relies on dynamic poses and animation rather than static sketch marks for energy. Speed lines and impact effects should be separate VFX layers, not drawn onto the Sprite itself.

### Decorative Elements
Element-themed decorative elements should be **clean, geometric shapes**:
- **Stars** — clean 4- or 5-point star shapes near magical features.
- **Hearts** — smooth heart shapes for Fairy-type accents.
- **Circles** — clean circular particles for various element effects.
These elements should be flat-colored with hard edges, matching the overall cel-shaded aesthetic.

### Texture
Surfaces should be **perfectly smooth flat fills** with no pencil texture, no grain, and no hatching. Material differences (fur, scales, metal, stone) are communicated through **shape, color zone placement, and specular highlight shapes** rather than surface texture marks. Metal gets sharp angular highlights. Fur gets soft rounded shadow shapes. Stone gets blocky shadow edges.

### Backgrounds
Battle backgrounds use the **same flat cel-shaded treatment** with clean outlines and solid color fills. Background elements (grass, rocks, water, walls) should have clean outlines, flat colors, and hard-edged shadow/highlight zones. Backgrounds should feel like they belong in the same polished game world as the Sprites, maintaining visual cohesion across the entire game.

---

## 14. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-16 | Art Lead | Initial style guide |
| 2.0 | 2026-03-08 | Art Lead | Art direction changed to Color Doodle Chibi style |
| 3.0 | 2026-03-09 | Art Lead | Art direction changed to Flat Cel-Shaded Chibi style |
