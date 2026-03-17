# Sprite Wars — Head Sprite Art Style Guide

> Based on pixel-level analysis of the 4 approved reference heads:
> **Human**, **CatMan**, **Skeleton**, **Devil**

---

## 1. Canvas & Layout

| Property | Reference Value |
|---|---|
| Canvas size | **42x42 px** (nominal target; references range 41–46px) |
| Content bounding box | **37–42 px wide, 36–42 px tall** |
| Transparent padding | **2 px** on all sides minimum |
| Head fill ratio | **~85–90%** of canvas (head should feel snug, not floating) |
| Orientation | Front-facing, very slight ¾ bias (features not perfectly symmetric) |

**Key rule:** The head should nearly fill the canvas. Non-reference heads like WolfMan (28px content in 42px canvas = 67% fill) and LizardMan (26px content = 62% fill) are far too small. Aim for 85%+ fill.

---

## 2. Color Complexity

This is the single biggest gap between reference and non-reference heads.

| Metric | References | Non-References |
|---|---|---|
| Unique RGB colors | **470–600** | **6–9** |
| Colors per tonal zone | 30–80 (smooth gradients) | 1–2 (flat fills) |
| Color transitions | Smooth, sub-pixel blended | Hard-edged, 1px steps |

**Key rule:** Each surface area (skin, hair, eyes, etc.) should use **smooth color gradients** with dozens of intermediate tones — NOT flat fills with hard boundaries. Think "digital painting downscaled" not "pixel art built up from single pixels."

### How to achieve this
- Paint at 2–4x resolution with soft brushes, then downscale with bilinear filtering
- OR paint at 1x with anti-aliased brush tools (Photoshop/Krita/Procreate round brush at ~2–4px)
- Do NOT use the pencil/pixel tool for large fills — only for final pixel-level cleanup

---

## 3. Anti-Aliasing

| Metric | References | Non-References |
|---|---|---|
| Semi-transparent pixels | **115–161** (10.8–12.8% of visible pixels) | **0** (every pixel is fully opaque) |
| Edge treatment | Smooth, feathered into transparency | Hard staircase edges |

**Key rule:** **10–13% of all visible pixels should be semi-transparent**, creating soft feathered edges where the head meets the transparent background. This is what gives the references their smooth, professional silhouette.

### Anti-aliasing zones
- **Outer silhouette** — 1–2px feather into transparency
- **Curved edges** (top of head, chin, ears) — most AA concentrated here
- **Interior detail edges** (eye borders, mouth line) — subtle AA, less than outer edge

### What NOT to do
- No fully opaque pixel touching fully transparent pixel on curves (creates jaggies)
- No uniform alpha values — the AA gradient should vary (e.g. 30%, 60%, 80% stepping inward)

---

## 4. Outline Style

| Property | Reference Value |
|---|---|
| Outer outline color | **Near-black (0,0,0)** — dominant outline color in all 4 references |
| Outer outline weight | **~2px effective** (1px solid + 1px anti-aliased fringe) |
| Inner detail lines | **~1px**, softer than outer silhouette |
| Outline consistency | Uniform thickness; no thick-thin variation |

### Non-reference problem
Non-reference heads use **colored outlines** (brown, dark grey, dark green) instead of near-black. Some have no distinct outline at all.

**Key rule:** Outer silhouette = near-black `(0,0,0)` to `(10,10,10)`. Inner lines (eye outlines, mouth, nostrils) can be a **dark version of the local color** (e.g., dark brown for skin detail lines), but should be clearly darker than any fill color.

---

## 5. Shading & Lighting

### Light source
**Top-left**, consistent across all 4 references.

### Tonal zones per surface

Each colored area uses **4 tonal values**:

| Zone | Placement | Example (Human skin) |
|---|---|---|
| **Highlight** | Upper-left of convex forms | Bright peach/cream on forehead |
| **Base** | Center/majority fill | Medium skin tone |
| **Shadow** | Lower-right, under features | Darker peach under jaw, beside nose |
| **Deep shadow** | Recesses, undercuts | Dark tone inside ears, under hair overlap |

### Gradient behavior
- Transitions between zones are **smooth gradients**, not hard cel-shade steps
- The gradient spans 20–50 intermediate color values (not 2–3 steps)
- Highlight should be clearly visible but not blown-out white (exception: specular eye highlight)

### Specific shading notes
- **Top of head/forehead:** Brightest area (closest to light)
- **Under-chin / jaw line:** Clear shadow zone
- **Eye sockets:** Subtle ambient occlusion (slightly darker ring around eyes)
- **Ears / horns / protrusions:** Lit on top-left edge, shadowed underneath
- **Hair / fur:** Highlight streaks following form direction

---

## 6. Face Proportions & Anatomy

### Standard humanoid head (Human, Elf, Demon, Mummy, Zombie, Ork, etc.)

```
    ┌──────────────────────┐
    │   ···· hair ····     │  ~15% — Crown / hair zone
    │  ┌──────────────┐    │
    │  │   forehead    │    │  ~15% — Forehead
    │  │ ○          ○  │    │  ~20% — EYE LINE at 50–55% from top
    │  │      │        │    │  ~15% — Nose bridge / mid-face
    │  │    ╰───╯      │    │  ~15% — Mouth
    │  │  ╰────────╯   │    │  ~15% — Chin / jaw
    │  └──────────────┘    │
    └──────────────────────┘
```

| Landmark | Vertical position (% from top of content) |
|---|---|
| Top of skull | 0% |
| Eye line (center of eyes) | **50–55%** |
| Nose tip | **65–70%** |
| Mouth center | **75–80%** |
| Chin bottom | **90–95%** |
| Bottom of content | 100% |

### Eyes
- **Size:** 4–6px wide, 3–4px tall
- **Spacing:** ~1 eye-width between eyes (game-proportioned, slightly wide)
- **Specular highlight:** 1px white dot, upper-left of each eye (matches light direction)
- **Iris/pupil:** Visible distinct colors; dark pupil + colored iris + white sclera

### Animal / creature head adjustments
For beast-race heads (BearMan, WolfMan, CatMan, etc.):
- Snout/muzzle **extends forward** from the standard face plane
- Eyes may sit **higher** (45–50%) to accommodate muzzle
- Ears are **larger and positioned higher** on skull
- Overall silhouette should still read as a "head" in the same canvas size
- DO NOT shrink the head to fit extra features — let ears/horns extend to canvas edge

### Non-humanoid adjustments
For Golem, Robot, Ent, Ghost:
- Maintain the **same canvas fill ratio** (85%+)
- Features should still have clear "eye" regions for readability
- Ghost: translucent body but still needs the tonal gradient structure

---

## 7. Rendering Style Definition

**The style is: "Miniature digital painting"** — NOT pixel art.

### What this means
- Work as if painting a portrait, then cropping it to 42x42
- Smooth brush strokes, not individual pixel placement
- Color mixing and blending, not palette-restricted flat fills
- The final image should look like a tiny painting, not a mosaic

### Style DO's
- Soft gradients across skin/surface
- Subtle color temperature shifts (warm highlights, cool shadows)
- Organic, slightly irregular edges (not mathematically perfect curves)
- Small intentional details (eye highlights, nostril dots, teeth edges)

### Style DON'Ts
- No visible individual pixel grid pattern
- No flat single-color fills larger than ~4px
- No hard dithering patterns (checkerboard, cross-hatch)
- No pure black fill areas (use very dark versions of the local color instead)
- No perfectly straight horizontal/vertical lines on organic forms

---

## 8. Per-Race Redraw Notes

Each of the 20 non-reference heads needs to be redrawn. Below are the specific issues and guidance for each:

### Humanoid Races

**Elf** (7 colors, 0 AA, content 36x33)
- Needs: smooth skin gradients, pointed ear detail with shading, hair highlight streaks
- Fix: currently flat peach fill with brown outline; add 100+ color gradient, AA edges
- Ears should extend to canvas edge, currently too small

**Demon** (8 colors, 0 AA, content 36x36)
- Needs: dark red/crimson skin gradient, horn shading, glowing eyes
- Fix: currently flat dark red; add volumetric shading, fiery highlights on horns
- Good canvas fill, maintain proportions

**Ork** (6 colors, 0 AA, content 38x31)
- Needs: green skin with warm shadow tones, tusks with individual shading, brow ridge shadow
- Fix: currently flat green blocks; add muscular/rough skin texture through shading
- Content too short (31px) — extend chin/jaw area to fill canvas

**Mummy** (8 colors, 0 AA, content 26x31)
- Needs: wrapped bandage texture with subtle highlight/shadow per band, visible eyes through wraps
- Fix: way too small (26x31 in 42x42 = 62% fill); scale up, add bandage shading detail
- Bandage wraps should have individual highlight/shadow per strip

**Zombie** (637 colors, 142 AA — already close to reference quality!)
- Needs: verify proportions and canvas fill match references
- This head already has correct color count and AA — may only need minor proportion tweaks
- Content 37x40 = good fill ratio

### Beast Races

**BearMan** (8 colors, 0 AA, content 34x35)
- Needs: brown fur gradient (warm highlights, cool shadows), rounded ears with pink inner ear
- Fix: flat brown; add fur texture through directional shading strokes
- Snout highlight, nose detail, small dark eyes

**WolfMan** (7 colors, 0 AA, content 28x36)
- Needs: grey fur with silver highlights, pointed ears, longer snout than BearMan
- Fix: too narrow (28px); widen head to ~36px, add fur shading
- Should look leaner than BearMan — angular jaw, sharper features

**MonkeyMan** (6 colors, 0 AA, content 34x31)
- Needs: tan/brown fur, prominent brow ridge, rounded ears, peach face area
- Fix: flat brown circle; add face/fur color separation, brow shadow
- Content too short — extend, add defined jaw

**BirdMan** (7 colors, 0 AA, content 26x33)
- Needs: beak (hard surface with highlight), feather texture around head, alert eyes
- Fix: way too small (26px wide); beak + crest should extend silhouette wider
- Feathers rendered as overlapping shaded shapes, not flat color

**LizardMan** (6 colors, 0 AA, content 26x31)
- Needs: scaled texture through subtle repeated shading pattern, slit pupils, jaw ridge
- Fix: tiny (26x31); enlarge significantly, add scale texture, snout
- Scales = rows of tiny highlight/shadow crescents

**FishMan** (9 colors, 0 AA, content 26x36)
- Needs: wet/glossy shading (strong specular highlights), fins as silhouette extensions, big round eyes
- Fix: too narrow (26px); widen with fin/gill detail, add gloss
- Blue-green skin with iridescent highlight shifts

**SharkMan** (7 colors, 0 AA, content 28x35)
- Needs: grey skin with lighter underbelly gradient, wide jaw, small dark eyes, fin on top
- Fix: too narrow; widen jaw, add dorsal fin extending to canvas top
- Skin should have smooth grey gradient, not flat

**RatMan** (9 colors, 0 AA, content 38x35)
- Needs: grey-brown fur, large round ears (pink inside), long snout, whiskers, small beady eyes
- Fix: good width but flat colors; add fur gradient, ear shading
- Whiskers as subtle 1px lines extending from snout

**TurtleMan** (9 colors, 0 AA, content 30x35)
- Needs: green skin, beak-like mouth, wide flat head, possibly shell edge visible behind
- Fix: too narrow (30px); widen, add skin texture shading
- Leathery skin rendered with warm green gradient

**Minotaur** (9 colors, 0 AA, content 42x30)
- Needs: broad bull head, large horns curving outward, ring in nose, bovine snout
- Fix: full width but too short (30px); horns should extend vertically
- Brown fur with darker mane area, horn shading (bone-colored gradient)

### Undead / Elemental / Construct Races

**Ghost** (6 colors, 718 AA px — unique case)
- Needs: all pixels are semi-transparent (correct for ghost), but only 6 colors
- Fix: add gradient shading within the translucent form; currently flat fills through transparency
- Should have subtle face features visible through ethereal glow
- Add 50+ color gradient within the semi-transparent range

**Golem** (6 colors, 0 AA, content 32x33)
- Needs: stone/rock texture with cracks, glowing eyes/rune, heavy angular construction
- Fix: too small, flat grey blocks; add stone texture through light/shadow
- Cracks rendered as dark lines with bright edge (light catching crack lip)
- Surfaces should have rough stone gradient, not smooth

**Robot** (9 colors, 0 AA, content 30x40)
- Needs: metallic shading (strong highlight/shadow contrast), panel lines, visor/eye glow
- Fix: too narrow, flat color panels; add metallic gradients
- Metal surfaces need specular highlights (near-white spots) and reflected light (subtle light on shadow side)
- Panel lines as subtle 1px dark lines between sections

**Ent** (7 colors, 0 AA, content 31x39)
- Needs: bark texture (rough, grooved), leaf/moss detail at top, knot-hole eyes
- Fix: too narrow, flat brown/green; add bark grain through shading
- Bark = vertical dark grooves with lit ridges between
- Leaf crown with individual leaf shading

---

## 9. Quality Checklist

Before considering a head sprite complete, verify:

- [ ] Canvas is ~42x42 px
- [ ] Content fills 85%+ of canvas
- [ ] 2px transparent padding on all sides
- [ ] **400+ unique RGB colors** (smooth gradients, not flat fills)
- [ ] **10–13% of visible pixels are semi-transparent** (anti-aliased edges)
- [ ] Outer silhouette outlined in near-black (0,0,0)
- [ ] Inner detail lines are ~1px, dark version of local color
- [ ] 4 tonal zones visible: highlight, base, shadow, deep shadow
- [ ] Light source is **top-left** (highlight upper-left, shadow lower-right)
- [ ] Eye line sits at 50–55% from top of head content
- [ ] Eyes have visible specular highlight dot (1px white, upper-left)
- [ ] No flat-color areas larger than ~4x4 px
- [ ] No visible pixel grid / staircase edges on curves
- [ ] Head reads clearly at 1x and at 2–3x display scale
- [ ] Placed next to Human/CatMan/Skeleton/Devil references, it looks like the same game

---

## 10. File Specifications

| Property | Value |
|---|---|
| Format | PNG-32 (RGBA) |
| Color depth | 8-bit per channel |
| Transparency | Alpha channel, smooth (not 1-bit) |
| Naming | `{Race}_S1_head.png` |
| Location | `Sprites/Characters/{Race}/parts/` |
| Compression | Standard PNG, no interlacing |

---

## Appendix: Reference Head Color Palette Samples

### Human
- Skin highlight: `rgb(255, 230, 210)` — warm cream
- Skin base: `rgb(220, 185, 160)` — medium peach
- Skin shadow: `rgb(170, 130, 105)` — warm brown
- Hair: `rgb(80, 75, 70)` to `rgb(45, 40, 38)` — dark brown range
- Eye: white sclera, dark iris, 1px white specular
- Outline: `rgb(0, 0, 0)` — pure black

### CatMan
- Fur highlight: `rgb(130, 110, 170)` — light purple
- Fur base: `rgb(90, 70, 130)` — medium purple
- Fur shadow: `rgb(55, 40, 90)` — deep purple
- Inner ear: `rgb(160, 120, 150)` — pink-purple
- Eyes: bright yellow-green with slit pupil
- Outline: `rgb(0, 0, 0)` — pure black

### Skeleton
- Bone highlight: `rgb(255, 255, 255)` — near white
- Bone base: `rgb(220, 215, 200)` — warm ivory
- Bone shadow: `rgb(160, 150, 135)` — tan-grey
- Eye sockets: `rgb(20, 15, 10)` — near black void
- Teeth: `rgb(240, 235, 220)` — off-white
- Outline: `rgb(0, 0, 0)` — pure black

### Devil
- Skin highlight: `rgb(210, 130, 80)` — bright orange-brown
- Skin base: `rgb(160, 85, 50)` — reddish-brown
- Skin shadow: `rgb(100, 45, 25)` — dark red-brown
- Horn: lighter bone tones transitioning to dark tips
- Eyes: glowing green `rgb(80, 180, 60)`
- Outline: `rgb(0, 0, 0)` — near black (with slight warm cast `rgb(9,0,0)`)
