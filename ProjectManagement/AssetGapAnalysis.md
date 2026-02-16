# Sprite Wars — Asset Gap Analysis

**Date:** 2026-02-16
**Scope:** GDD requirements vs. existing repository assets
**Total assets in repository:** ~55,000+ files

---

## 1. What's Covered

These assets exist and align with GDD requirements with minimal additional work.

### Ability Icons
- **3,600 ability icon PNGs** across 54 themed sets in `Sprites/AbilityIcons/`
- GDD requires 160 abilities — **substantial surplus** for ability iconography
- Task is curation and assignment, not creation

### Attack/Battle Effects
- **1,344 attack effect PNGs** in `Sprites/AttackEffects/`
- **6 additional effects** in `Sprites/Effects/`: Enemy Hit, Flame, Freeze, Heal, Lightning, attack
- Strong coverage for projectile, elemental, and impact effects

### Buff/Debuff/Status Icons
- **48 Buff icons** in `AbilityIcons/Buffs/`
- **48 Curse/Debuff icons** in `AbilityIcons/Curse/`
- **48 Anti-buff icons** in `AbilityIcons/Anti-buffs/`
- **Status Effects spritesheet** in `Sprites/Icons/`
- GDD needs ~31 icons — **fully covered** with surplus (144 total)

### Core Music Tracks (16 tracks)
- Battle Theme (intro/loop), Boss Battle (intro/loop), Deep Forest, Evil Gloating (intro/loop), Game Over, Lullaby (intro/loop), Overworld Theme, Time Cave, Town Theme, Victory Fanfare (intro/loop)
- 3 additional tracks in `Tiles Sprites/Farm Game World/Music/`

### Menu Sound Effects (10 SFX)
- Hit, Item Confirm/Discard/Use, Menu Cancel/Confirm/Move, Open, Prompt, Recover

### UI Framework
- 8 UI elements: Arrow, buttons, panel through panel6

### Weather Effects
- 4 types: Leaves, RainDrop, RainSplash, SnowFlake (16 files)

### World Objects/Props (11 sprites)
- Block, Chest, Crates, Door, Indicator, Log, Mushrooms, Save Point, Switch, Witch Pot, items

### Weapon Visuals (28 themed sets)
- Aztec, Bone, Bug, Colonial, Demon, Desert, Dragon, Electric, Fairy, Fire, Forest, Golden Angel, Jester, Lunar, Ork, Pirate, Rock, Roman, Samurai, and more

### Class Icons
- `FinishedIcons.png` spritesheet

### Title Screen / Branding
- Logo, title backgrounds, app icons

---

## 2. What's Partially Covered

Assets exist but need significant expansion.

### Sprite Race Forms (CRITICAL)
- **GDD requires:** 72 unique forms (24 races x 3 stages) + 360+ animation sets
- **Exists:** 7 monsters (Bat, Bee, Bug, Crow, Gourmet, Slime, Snake) — static, no animations, no evolution stages
- **Usable reference:** 60 Farm Game World enemies, 18 Rogue Adventure enemies, 96 knights with walk/attack/dead states
- **Gap:** 65+ forms missing, 360+ animation sets missing — **largest art production gap**

### Battle Backgrounds
- **GDD requires:** 30+ region backgrounds
- **Exists:** 2 (Cave, Overworld)
- **Gap:** 28+ backgrounds needed

### Region Tilesets
- **GDD requires:** 30+ regions with distinct themes
- **Exists:** ~31 themes across Farm Game World (14), Rogue Adventure (17), base tilesets (4)
- **Gap:** Themes numerically covered but **art styles are inconsistent** across packs; need unification

### NPC Characters and Portraits
- **GDD requires:** ~150+ NPC portraits (5 types x 30+ regions)
- **Exists:** 2 portrait sheets, ~150 character sprites across various packs
- **Gap:** Significant portrait expansion needed

### Music / Region Themes
- **GDD requires:** 30+ region ambient themes
- **Exists:** 19 total tracks
- **Gap:** 15+ additional tracks needed; Sprite cries/voices entirely absent

### Equipment Visuals
- **GDD requires:** 9 slots across multiple tiers
- **Exists:** 28 weapon themes (weapon slot well-covered)
- **Gap:** 8 non-weapon equipment slot categories have **no dedicated visual assets**

### Element Icons
- **Exists:** 12 of 14 elements (see Section 4 for details)
- **Gap:** Metal and Poison icons missing; 3 icons need renaming

---

## 3. What's Missing

No existing counterpart — must be created from scratch.

| Missing Asset | Priority | Description |
|---|---|---|
| Crystal Catching Animation | HIGH | Full catch sequence (throw, absorb, shake, success/fail) |
| Temple Interior Environments | HIGH | 30 unique temple interiors reflecting element/class themes |
| Evolution Stage Visuals | HIGH | Transformation VFX, stage progression effects |
| Battle Grid UI | HIGH | Grid cells, highlight states, overlay system |
| Deployment Screen UI | HIGH | Grid overlay, formation preview, placement system |
| Ability Sound Effects | HIGH | 20-30+ archetypal sounds (fire blast, water splash, etc.) |
| Sprite Cries/Voices | MEDIUM | 24-72 voice clips (1 per race minimum) |
| Quest UI Elements | MEDIUM | Quest log, tracker, notifications, completion screens |
| PC Storage Interface | MEDIUM | Storage grid, thumbnails, transfer UI |
| Shop Interface Assets | MEDIUM | Shop panels, currency display, purchase flow |
| Sprite Inspection Panel | MEDIUM | Stat bars, ability displays, equipment slots |
| Targeting Type Icons | MEDIUM | 15 icons (10 enemy + 5 friendly targeting types) |
| Region Ambient SFX | MEDIUM | 10-15 ambient loops (cave drips, forest birds, etc.) |
| Overworld Tall Grass | LOW | Animated encounter trigger zones |
| Trainer Vision Cone | LOW | Visual indicator for NPC detection range |
| Title Screen Music | LOW | Current file is 0 bytes (empty!) |

---

## 4. Element Icon Discrepancy

### GDD: 14 Elements → Repository: 12 Icons

| GDD Element | Repo Icon | Status |
|---|---|---|
| Fire | FireElement.png | **Match** |
| Water | WaterElement.png | **Match** |
| Wind | WindElement.png | **Match** |
| Earth | RockElement.png | **Rename** → EarthElement |
| Plant | GrassElement.png | **Rename** → PlantElement |
| Metal | — | **MISSING** — create new |
| Electric | LightingElement.png | **Rename** → ElectricElement (fix typo) |
| Dark | DarkElement.png | **Match** |
| Light | LightElement.png | **Match** |
| Solar | SolarElement.png | **Match** |
| Lunar | LunarElement.png | **Match** |
| Fairy | FairyElement.png | **Match** |
| Poison | — | **MISSING** — create new |
| Ice | IceElement.png | **Match** |

**Actions Required:**
1. Create 2 new icons: Metal, Poison
2. Rename 3 icons: Rock→Earth, Grass→Plant, Lighting→Electric
3. Update associated `.asset` files

---

## 5. Priority Summary

### CRITICAL (Blocks Core Gameplay)
| Gap | Required | Current | Delta |
|---|---|---|---|
| Sprite Race Forms | 72 forms | 7 monsters | 65 missing |
| Sprite Animations | 360+ sets | 0 purpose-built | 360+ missing |
| Battle Grid UI | Required | None | Full system |
| Crystal Catching | Core mechanic | None | Full animation |
| Element Icons | 14 | 12 | Metal, Poison |

### HIGH (Blocks Content Completeness)
| Gap | Required | Current | Delta |
|---|---|---|---|
| Battle Backgrounds | 30+ | 2 | 28+ missing |
| Temple Interiors | 30 temples | ~2 tilesets | 28+ missing |
| NPC Portraits | 150+ est. | 2 sheets | Major expansion |
| Ability SFX | 160 abilities | 1 hit sound | 20-30+ minimum |
| Equipment Visuals | 9 slot types | Weapons only | 8 categories |

### MEDIUM (Affects Polish)
| Gap | Required | Current | Delta |
|---|---|---|---|
| Region Music | 30+ themes | 19 tracks | 15+ needed |
| Targeting Icons | 15 | 1 | 14 needed |
| Quest UI | Full system | Basic panels | Full design |
| Sprite Cries | 24-72 clips | 0 | All missing |
| Ambient SFX | 10-15 loops | 0 | All missing |

---

## 6. Recommended Production Order

1. **Element icon fixes** — rename 3, create 2 (quick win)
2. **Sprite race concept art** — 24 races x 3 stages (unblocks largest pipeline)
3. **Battle grid UI + deployment screen** (unblocks core gameplay testing)
4. **Crystal catching animation** (unblocks signature mechanic)
5. **Battle backgrounds** (composite from existing tilesets where possible)
6. **Temple interiors** (extend existing tileset themes)
7. **Equipment icons** for non-weapon slots
8. **Ability SFX + ambient audio**
9. **NPC portrait expansion + quest UI**
10. **Polish**: evolution VFX, Sprite cries, title screen music, vision cones
