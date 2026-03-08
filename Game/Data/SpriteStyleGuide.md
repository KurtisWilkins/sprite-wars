# [P10-001] Sprite Wars — Sprite Design Style Guide

> **Version:** 2.0
> **Last Updated:** 2026-03-08
> **Owner:** Art Lead
> **Engine:** Godot 4.2
> **Target Platforms:** Android / iOS (Mobile)

---

## 1. Overview

This document defines the **Color Doodle Chibi** art direction for all 72 Sprite forms (24 races x 3 evolution stages) in Sprite Wars. The visual style is hand-drawn, sketchy, colorful, and playful — evoking the feel of doodle art with chibi proportions.

### Core Style Characteristics
- **Thick uneven outlines** — as if drawn with a marker or crayon, never perfectly straight or uniform.
- **Visible pen strokes** — line work retains the energy and imperfection of hand-drawing.
- **Hand-drawn imperfections** — wobbly edges, overlapping strokes, and slight asymmetry are intentional and desirable.
- **Soft colorful fills with visible hatching/cross-hatching** — shading uses sketch techniques (hatching, cross-hatching, scribble fills) rather than smooth gradients.
- **Pastel-meets-vibrant color palette** — colors lean slightly desaturated and warm, but pop with vibrant accents.
- **Whimsical and playful feel** — every Sprite should look like it was lovingly doodled in a sketchbook and then colored in.

Every artist contributing character art must follow these standards to maintain a cohesive, readable, and mobile-optimized visual identity rooted in the Color Doodle Chibi aesthetic.

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
- Soft anti-aliasing is encouraged on all edges to support the hand-drawn doodle feel. The Color Doodle Chibi style does not require pixel-perfect hard edges.

---

## 3. Color Palette

### Per-Sprite Limit
Each individual Sprite form uses a **maximum of 24 unique colors** (excluding full transparency). The doodle style requires additional colors for sketch strokes, hatching lines, and color-bleed edges. This constraint ensures:
- Clean, readable silhouettes on mobile screens.
- Consistency with the Color Doodle Chibi aesthetic.
- Efficient texture memory usage.

### Color Breakdown per Sprite
| Allocation | Count | Purpose |
|-----------|-------|---------|
| Doodle ink outline | 2-3 | Wobbly outlines + sketch strokes |
| Primary body | 3-4 | Main body color + shading |
| Hatching/shading | 2-3 | Cross-hatch lines, scribble shading |
| Secondary feature | 2-3 | Accent markings, belly, mane |
| Element accent | 2-3 | Elemental glow, particles, aura |
| Eyes & details | 2-3 | Eyes, claws, teeth, gems |
| Color bleed edges | 1-2 | Soft bleed past outlines |
| Highlight/specular | 1-2 | White or near-white specular pop |
| Sketch marks | 1-2 | Blush circles, motion lines, decorative marks |

### Doodle Ink Colors
All Sprite outlines and sketch strokes should use one of these doodle ink colors rather than pure black. Choose based on the Sprite's overall warmth/coolness:

| Swatch | Hex | Usage |
|--------|-----|-------|
| Soft Black | `#2D2D2D` | Default outline for neutral/dark Sprites |
| Warm Brown | `#5C4033` | Outlines for warm-toned Sprites (Fire, Earth, Solar) |
| Dark Blue | `#2B3A67` | Outlines for cool-toned Sprites (Water, Ice, Lunar) |
| Soft Gray | `#7A7A7A` | Secondary sketch marks, hatching lines, motion lines |

### Doodle Color Treatment
> **Important:** All colors should appear **slightly desaturated/pastel** compared to standard pixel art. The Color Doodle Chibi style favors soft, crayon-like color fills over high-saturation digital color. Colors should show **visible color bleeding at edges** — fills intentionally extend slightly past outlines for that hand-colored feel.

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

All evolution stages use **chibi/doodle proportions** — even final forms remain cute and round. The style shifts from extra-chibi to slightly more detailed chibi, never reaching realistic proportions.

### Universal Doodle Body Rules (All Stages)
- **Rounded, blobby limbs** with no sharp angles — everything should look soft and squishy.
- **Hands** are simple mittens or circles (no individual fingers unless the Sprite specifically requires them for identity).
- **Feet** are round stubs — simple, chunky, and cute.
- **No hard geometric angles** on bodies — even armored or metallic Sprites should have rounded, doodled edges.

### Stage 1 — Extra Chibi / Baby Doodle
- **Head-to-body ratio:** 1:1.5 (very large, round head dominates the body)
- **Eyes:** Dot eyes or large sparkly eyes — take up ~40-50% of face area
- **Limbs:** Tiny, blobby nubs — barely visible
- **Details:** Minimal; 1-2 distinguishing features (e.g., a scribbled tail flame, tiny ear tufts)
- **Personality:** Maximum cute, baby-like, irresistible
- **Pose:** Forward-facing, slightly tilted for charm
- **Doodle feel:** Simplest sketch marks, minimal hatching, big round shapes

### Stage 2 — Chibi / Kid Doodle
- **Head-to-body ratio:** 1:2 (still chibi, cute with bigger features than realistic)
- **Eyes:** Large and expressive, still sparkly but more determined
- **Limbs:** Short and rounded, mitten hands slightly defined, stubby feet
- **Details:** Moderate; 3-4 features that build on Stage 1 (e.g., larger scribble flame, mane growth)
- **Personality:** Confident but still cute, capable little adventurer
- **Pose:** Slight action stance, weight shifted
- **Doodle feel:** More hatching detail, additional sketch marks, slightly more complex shapes

### Stage 3 — Chibi / Final Doodle Form
- **Head-to-body ratio:** 1:2.5 (still chibi even at final form, slightly more detailed)
- **Eyes:** Expressive and detailed, may have additional eye features (sparkle highlights, element-colored irises)
- **Limbs:** Rounded but slightly more defined, mitten hands may show claw shapes, feet slightly articulated
- **Details:** Rich; 5+ features with doodle-style element-themed ornamentation (scribbled flames, sketchy crystals, etc.)
- **Personality:** Powerful but still adorably chibi — formidable yet huggable
- **Pose:** Dynamic, commanding, may have spread wings/arms — but with rounded chibi proportions
- **Doodle feel:** Most detailed hatching and cross-hatching, elaborate sketch marks, decorative doodle effects

---

## 5. The Silhouette Rule

**Every Sprite must be instantly recognizable by its silhouette alone when viewed at 32x32 pixels.**

This is the single most important readability rule. On mobile screens, during fast-paced battle, players identify Sprites primarily by shape.

### Silhouette Testing Procedure
1. Flatten the Sprite to a solid black shape (all opaque pixels become `#000000`).
2. Scale down to 32x32 pixels using nearest-neighbor interpolation (no smoothing).
3. The Sprite must still be identifiable — distinguishable from every other Sprite in the game.
4. Key identifying features (horns, wings, tail shape, ear shape) must remain visible at this scale.

### Doodle Outline Note
In the Color Doodle Chibi style, outlines are **2-4px thick** and **slightly wobbly/uneven** to achieve the hand-drawn feel. This thicker, irregular outline actually aids silhouette readability at small sizes, as the heavier line weight makes shapes more distinct. When creating silhouette test sheets, the wobbly outline is part of the silhouette shape.

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
- **Outline width:** 2-4 pixels, **slightly uneven/wobbly** to achieve the hand-drawn doodle feel. Outlines should never be perfectly straight or uniform in thickness.
- **Outline color:** Use **Doodle Ink Colors** (see Section 3) — Soft Black, Warm Brown, Dark Blue, or Soft Gray depending on the Sprite's color temperature. Do not use pure black (`#000000`).
  - Example: For a Fire Sprite, use Warm Brown (`#5C4033`) for primary outlines.
- **Inner outlines:** Optional 1-2px inner lines to separate major body sections (head/body/limbs). These should use Soft Gray (`#7A7A7A`) or a lighter doodle ink.
- **No outline breaks:** The silhouette outline must be continuous -- no gaps where background shows through at the edge. Wobble is fine, gaps are not.
- **Soft edges:** The doodle style uses soft, slightly fuzzy edges rather than pixel-perfect hard edges. Anti-aliasing and soft edge treatment is encouraged to support the hand-drawn feel.

### Detail Line Rules
- **Minimum line width:** 1 pixel is acceptable for internal detail lines in the doodle style, as the sketchy aesthetic is more forgiving of fine lines.
- **2px recommended** for important feature-defining details that must read at small sizes.
- **Use hatching and sketch strokes** to add detail and shading rather than relying solely on color fills.

### Sketch Marks
The doodle aesthetic includes small **decorative sketch marks** near features that add personality and expressiveness:
- **Motion lines** — short parallel strokes near moving parts (tails, wings, flames).
- **Blush marks** — small pink/red circles on cheeks for cute expressions.
- **Sweat drops** — classic doodle sweat drop near the head for stressed/nervous expressions.
- **Sparkle marks** — tiny star/cross shapes near eyes or shiny surfaces.
- **Emphasis lines** — short radiating lines around important features.
These marks are part of the art style and should be included where appropriate — they are not optional decorations but core to the Color Doodle Chibi identity.

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

### Doodle Grid Lines
The battle grid itself should use **hand-drawn wobbly grid borders** rather than pixel-perfect straight lines. Grid lines should appear sketched with slight irregularity, matching the overall Color Doodle Chibi aesthetic. Use Soft Gray (`#7A7A7A`) at 40% opacity for grid lines.

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
- Portraits are displayed inside a **hand-drawn wobbly border** frame — the border should appear sketched with slight irregularity, not perfectly geometric. Use a **3px thick** uneven line in the element's primary doodle ink color.
- Frame corners should be rounded and slightly imperfect, as if drawn freehand.
- Background: **Colored fill** using the element's lightest palette color at 40% opacity, with visible soft color bleeding at the frame edges to match the doodle aesthetic.

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
- [ ] Maximum 24 unique colors (verify with indexed color count)
- [ ] Colors pull from the correct element palette with pastel/desaturated treatment
- [ ] Head-to-body ratio matches chibi stage guidelines (1:1.5 / 1:2 / 1:2.5)
- [ ] Passes silhouette test at 32x32 (submit silhouette sheet)
- [ ] Evolution continuity: shared features with previous/next stage
- [ ] 2-4px wobbly doodle outline is continuous with no gaps, uses doodle ink colors
- [ ] Hatching/cross-hatching used for shading (no smooth gradients)
- [ ] Color bleed present at select outline edges
- [ ] Sketch marks included where appropriate (motion lines, blush, sparkles)
- [ ] Readable at 50% zoom on a mobile device
- [ ] Contrast passes against all battle background types
- [ ] Shadow ellipse included for battle rendering
- [ ] Portrait crop looks good at 48x48
- [ ] File naming follows convention
- [ ] PNG-32 with transparent background, no pre-multiplied alpha

---

## 12. Element Visual Identity Summary

Quick reference for each element's visual motifs beyond color:

| Element | Shape Motifs | Texture Cues | Particle FX | Doodle Motif |
|---------|-------------|--------------|-------------|--------------|
| Fire | Sharp angles, flame shapes | Crackled, ember texture | Rising sparks, heat haze | Crayon scribble flames, zigzag heat lines |
| Water | Curves, wave shapes, droplets | Glossy, reflective highlights | Bubbles, water droplets | Wavy doodle lines, sketched splash drops |
| Plant | Organic curves, leaf shapes | Bark texture, vein patterns | Floating leaves, pollen | Scribbly vine curls, doodled leaf spirals |
| Ice | Crystalline angles, hexagons | Frosted, semi-transparent | Snowflakes, frost mist | Sketched snowflake stars, hatched ice shards |
| Wind | Flowing curves, spiral shapes | Wispy, semi-transparent | Swirling lines, feathers | Loose spiral doodles, quick-stroke breeze lines |
| Earth | Blocky, angular, solid | Rough stone, cracked dirt | Dust clouds, pebbles | Cross-hatched rock texture, scribbled cracks |
| Electric | Zigzag lines, bolt shapes | Crackling, bright edges | Sparks, arcing bolts | Jagged crayon bolts, scribble spark bursts |
| Dark | Pointed, angular, shadow wisps | Smoky, void-like | Shadow tendrils, dark mist | Heavy ink scribble shadows, scribbly wisps |
| Light | Radial, starburst, halos | Smooth, luminous | Light rays, lens flares | Doodled starburst rays, sketched halo rings |
| Fairy | Rounded, heart/star shapes | Sparkly, iridescent | Glitter, tiny stars | Doodled hearts and stars, sparkle pen marks |
| Lunar | Crescent curves, orbital arcs | Pale, ethereal | Moon dust, soft glow | Sketched crescent moons, soft pencil glow lines |
| Solar | Radial spikes, corona shapes | Warm, pulsing brightness | Solar flares, heat lines | Crayon sun rays, scribbled corona spikes |
| Metal | Geometric, plated, rivets | Polished, reflective | Metal shards, sparks | Hatched metal plates, doodled rivet circles |
| Poison | Dripping, bubbling, thorns | Slimy, corroded | Toxic drips, gas clouds | Scribbly drip lines, doodled bubble clusters |

---

## 13. Doodle Art Style Rules

These rules define the core artistic principles of the Color Doodle Chibi style. All artists must internalize these before creating Sprite assets.

### Line Quality
All outlines must appear **hand-drawn** with slight wobble and irregularity. No perfectly straight lines anywhere — even horizontal and vertical edges should have subtle organic waviness. Lines may vary in thickness along their length, as a real pen or marker stroke would.

### Shading
Use **hatching, cross-hatching, and scribble fills** instead of flat color fills or smooth gradients. Shading should look loose and sketchy, as if applied with colored pencils. Keep hatching strokes visible — they are a feature, not a flaw. Vary stroke density to control value (tighter hatching = darker, looser = lighter).

### Color Fills
Colors should **slightly bleed past outlines** for that hand-colored feel. This means color regions extend 1-2px beyond the outline boundary in places, creating the look of a coloring page filled in with markers or crayons. Not every edge needs bleed — use it selectively for organic, natural-feeling results.

### Expressions
Chibi faces use **simple but expressive features**:
- **Eyes:** Dot eyes (Stage 1) or large sparkle eyes (Stages 2-3) — always oversized relative to face.
- **Mouths:** Simple curved lines — a smile is a single arc, surprise is a small circle, determination is a flat dash.
- **Blush circles:** Small pink/red circles on cheeks — use liberally for cute expressions.
- **Eyebrows:** Optional short strokes above eyes for emotion (anger, worry, surprise).

### Motion
Add **doodle motion lines** (short parallel strokes) around moving parts to convey energy and action. These are 2-4 short lines in Soft Gray or the Sprite's outline color, placed near tails, wings, flames, or any animated feature. Motion lines are essential during attack and ability animations.

### Decorative
Small **doodle decorative marks** add charm and emphasis:
- **Stars** — tiny 4- or 5-point stars near shiny or magical features.
- **Hearts** — small hearts for Fairy-type or affection-related expressions.
- **Spirals** — loose spiral doodles for confusion, wind, or whimsy.
- **Scribble clouds** — small scribbly cloud puffs for dust, smoke, or comedic emphasis.
These marks should be used where appropriate to enhance personality without cluttering the silhouette.

### Texture
Surfaces should have **visible pencil/pen texture marks** rather than being perfectly smooth. Even flat color areas benefit from subtle hatching or crayon-grain texture. This applies to all materials — fur, scales, metal, stone, water — everything should feel hand-drawn and tactile.

### Backgrounds
Battle backgrounds use the **same doodle/sketch treatment** with colored pencil fills. Background elements (grass, rocks, water, walls) should have visible sketch strokes, hatching, and wobbly outlines. Backgrounds should feel like they belong in the same sketchbook as the Sprites, maintaining visual cohesion across the entire game.

---

## 14. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-16 | Art Lead | Initial style guide |
| 2.0 | 2026-03-08 | Art Lead | Art direction changed to Color Doodle Chibi style |
