# Equipment System Design Document

**Game:** Sprite Wars
**Version:** 1.0
**Last Updated:** 2026-03-02
**Owner:** Lead Game Designer + Technical Director

---

## 1. System Overview

### Design Philosophy
Equipment is a core progression layer in Sprite Wars. Players collect, equip, and manage gear across 9 distinct slots to strengthen their sprites for battle. Equipment provides stat bonuses, element/class synergy multipliers, and visual changes directly on the sprite.

### Design Goals
- **Visual Impact**: Every equipped item is visible on the sprite — swords appear in hand, helmets on the head, rings glow on the finger
- **Meaningful Choices**: Element and class synergies reward strategic pairing of equipment with the right sprite
- **Clear Progression**: 5 rarity tiers from common (level 1) to legendary (level 45) give steady power growth
- **Mobile-First UX**: Equipment management screens use large touch targets (44px+), animated previews, and stat comparisons

### 9 Equipment Slots

| Slot | Description | Visual on Sprite | Primary Stats |
|------|-------------|-----------------|---------------|
| **Helmet** | Head protection | Rendered on head above face | DEF, HP |
| **Weapon** | Offensive tool | Held in front hand, 5 weapon types | ATK, SP_ATK |
| **Chest** | Body armor | Torso overlay, rarity-colored | DEF, HP |
| **Gloves** | Hand gear | Small overlay on hand (3px) | ATK, DEF |
| **Legs** | Leg armor | Upper leg overlay (6px) | DEF, SPD |
| **Boots** | Footwear | Lower leg overlay (3px) | SPD, DEF |
| **Ring** | Finger accessory | Glowing band on front hand with sparkle | SP_ATK, SP_DEF |
| **Amulet** | Neck pendant | V-chain with gem below head | HP, SP_DEF |
| **Crystal** | Floating shard | Diamond shape floating above shoulder | Mixed / SP_ATK |

---

## 2. Equipment Catalog

### Summary
- **Total Items**: 84 (54 base + 30 extended)
- **Items per slot**: 6-12 depending on slot
- **ID Ranges**: 1001-1086 (base), 1101-1184 (extended)

### Weapons (12 items)

| ID | Name | Rarity | Lvl | ATK | DEF | SPD | SP_ATK | Element | Class |
|----|------|--------|-----|-----|-----|-----|--------|---------|-------|
| 1001 | Iron Sword | Common | 1 | 5 | 0 | 0 | 0 | None | None |
| 1002 | Steel Blade | Common | 10 | 10 | 2 | 0 | 0 | None | None |
| 1003 | Flame Sword | Uncommon | 15 | 14 | 0 | 2 | 5 | Fire | Berserker |
| 1004 | Tempest Blade | Rare | 25 | 20 | 0 | 8 | 8 | Air | Assassin |
| 1005 | Shadow Edge | Epic | 35 | 30 | 0 | 10 | 15 | Dark | Assassin |
| 1006 | Excalibur | Legendary | 45 | 50 | 10 | 10 | 20 | Light | Guardian |
| 1101 | Bone Dagger | Common | 1 | 4 | 0 | 3 | 0 | Poison | Assassin |
| 1102 | Crystal Wand | Uncommon | 10 | 3 | 0 | 0 | 12 | Psychic | Wizard |
| 1103 | Thunder Hammer | Rare | 20 | 18 | 5 | -3 | 0 | Electric | Knight |
| 1104 | Nature's Bow | Rare | 20 | 15 | 0 | 5 | 8 | Nature | Archer |
| 1105 | Void Scythe | Epic | 30 | 28 | 0 | 5 | 18 | Dark | Berserker |
| 1106 | Celestial Blade | Legendary | 40 | 45 | 8 | 12 | 22 | Light | Guardian |

### Helmets (12 items): IDs 1011-1016, 1111-1116
### Chest Armor (12 items): IDs 1021-1026, 1121-1126
### Legs (6 items): IDs 1031-1036
### Boots (6 items): IDs 1041-1046
### Gloves (6 items): IDs 1051-1056
### Rings (10 items): IDs 1061-1066, 1161-1164
### Amulets (10 items): IDs 1071-1076, 1171-1174
### Crystals (10 items): IDs 1081-1086, 1181-1184

Full item data is defined in `Web/js/data/EquipmentData.js`.

---

## 3. Rarity System

### 5 Rarity Tiers

| Rarity | Color Code | Border Color | Glow Effect | Level Range | Source |
|--------|-----------|-------------|-------------|-------------|--------|
| **Common** | `#888888` | Grey | None | 1-10 | Shop |
| **Uncommon** | `#33cc66` | Green | None | 10-15 | Shop, Dungeon |
| **Rare** | `#3399ff` | Blue | None | 15-25 | Dungeon Drop |
| **Epic** | `#aa44ff` | Purple | Pulsing purple glow (2s) | 25-35 | Boss Drop |
| **Legendary** | `#ffaa00` | Gold | Pulsing gold glow (1.5s) | 35-45 | Legendary Quest |

### Stat Budget by Rarity
- **Common**: 5-15 total stat points
- **Uncommon**: 15-30 total stat points
- **Rare**: 25-45 total stat points
- **Epic**: 40-65 total stat points
- **Legendary**: 60-100+ total stat points

### Visual Effects
- Epic items have `equip-slot-pulse-epic` CSS animation (purple glow)
- Legendary items have `equip-slot-pulse-legendary` CSS animation (gold glow with expanded shadow)
- High power score badges get `equip-power-shimmer` gradient animation

---

## 4. Synergy System

### Element Synergy
Each equipment item may have an `element_synergy` that provides bonus effectiveness when equipped to a sprite of the matching element type.

**14 Element Types**: Fire, Water, Nature, Ice, Air, Earth, Electric, Dark, Light, Psychic, Spirit, Chaos, Metal, Poison

**Synergy Multipliers by Rarity**:
| Rarity | Multiplier |
|--------|-----------|
| Common | 1.0 (no synergy) |
| Uncommon | 1.10-1.15 |
| Rare | 1.15-1.20 |
| Epic | 1.20-1.25 |
| Legendary | 1.25-1.30 |

**Example**: A Fire-element sprite equipping a Flame Sword (Fire synergy, 1.15x) gets a 15% bonus to matching stats.

### Class Synergy
Each equipment item may have a `class_synergy` for bonus effectiveness with matching class sprites.

**10 Class Types**: Berserker, Guardian, Ranger, Assassin, Archer, Knight, Wizard, Cleric, Summoner, Spearman

**Multiplier Range**: 1.10-1.25 (same scaling as element synergy)

### Dual-Element Races
6 races have dual element types. Synergy matches against either element:
- Pyrovolt (Fire + Electric), Venomthorn (Poison + Nature), Shadowflare (Dark + Fire)
- Crystalmist (Ice + Psychic), Ironstorm (Metal + Air), Spiritbloom (Spirit + Nature)
- Solarius (Light + Chaos), Eclipsar (Dark + Spirit)

### Synergy Display in UI
- Element synergy shown as colored badge: "FIRE SYNERGY ×1.2"
- Checkmark indicator when sprite's element matches
- Class synergy shown as gold badge: "BERSERKER SYNERGY ×1.15"

---

## 5. Equipment Slots & Visual Rendering

All 9 equipment slots render visually on the sprite via `HumanoidSpriteSystem.js`.

### Rendering Pipeline
1. **Composite Sheet Generation**: 128×128 canvas (4 dirs × 4 walk frames, 32×32 per frame)
2. **Cache Key**: Includes all 9 equipment slots for unique visual combinations
3. **Layer Order**: Back arm → Legs+Boots → Torso+Chest → Head+Helmet → Front arm+Weapon → Ring → Amulet → Crystal

### Per-Slot Rendering Details

**Helmet**: Theme sheet extraction → procedural fallback (visor with rarity coloring)
**Weapon**: Theme sheet extraction → procedural fallback (sword/axe/staff/spear/crossbow pixel art)
**Chest**: Theme sheet extraction → procedural fallback (armor plates with shine)
**Gloves**: Procedural 3px overlay on hand area, rarity-colored
**Legs**: Procedural 6px upper leg overlay, rarity-colored
**Boots**: Procedural 3px lower leg overlay, rarity-colored
**Ring**: 3px band on front hand with 1px sparkle gem and soft glow aura
**Amulet**: V-chain necklace with 3px diamond gem pendant, hidden when facing up
**Crystal**: 5px diamond shape floating above shoulder, element-based coloring, pulsing opacity per frame

### Theme Sheet System
- 26 weapon theme sprite sheets (1691×1039px each)
- 14 equipment piece types in `EQUIPMENT_ROWS` with sprite sheet coordinates
- 24 races mapped to themes via `RACE_THEME_MAP`
- Evolution stage determines armor tier: Stage 1→Light, Stage 2→Medium, Stage 3→Heavy

---

## 6. Stat Calculation

### Formula
```
Final Stat = Base Stat + Equipment Bonus + (Synergy Multiplier if matching)

Where:
  Base Stat = (race_base_stat + growth_rate × level) × evolution_multiplier
  Equipment Bonus = SUM(all equipped item stat bonuses for this stat)
  Synergy Multiplier = element_synergy_multiplier × class_synergy_multiplier (if matching)
```

### Stat Keys
| Key | Full Name | Primary Equipment Sources |
|-----|-----------|-------------------------|
| `hp` | Hit Points | Chest, Amulet, Helmet |
| `atk` | Attack | Weapon, Gloves |
| `def` | Defense | Chest, Helmet, Legs |
| `spd` | Speed | Boots, Legs |
| `sp_atk` | Special Attack | Weapon (wands/staves), Ring, Crystal |
| `sp_def` | Special Defense | Amulet, Ring |

### Power Score Formula
```
Power Score = (ATK × 1.2) + (SP_ATK × 1.2) + (SPD × 1.1) + (DEF × 1.0) + (SP_DEF × 1.0) + (HP × 0.5)
```
Displayed in equipment summary with color coding: Gold (100+), Purple (50+), Blue (20+)

---

## 7. Acquisition Paths

### Shop (Level 1-10, Common/Uncommon)
- 18 items available from game start
- Basic equipment for all 9 slots
- Affordable pricing for early game

### Dungeon Drops (Level 15-25, Uncommon/Rare)
- 18 items from temple exploration
- Element-themed drops matching temple type
- Random drop chance on encounter victory

### Boss Drops (Level 25-35, Rare/Epic)
- 9 items from temple boss defeats
- Guaranteed drop on first clear
- Higher rarity with class synergies

### Legendary Quests (Level 45, Legendary)
- 9 items from endgame quest chains
- Highest stat budgets in the game
- Unique visual effects (golden glow)
- Examples: Excalibur, Crown of the Ancients, Aegis of Solarius

### Enemy Equipment Generation
When enemies lack equipment, `RTSBattleScene._generateEquipmentForLevel()` auto-generates level-appropriate gear:
- Picks best items per slot matching level requirement
- Prefers element synergy matches with the enemy's race
- Covers weapon, helmet, chest, boots slots

---

## 8. UI Screens

### Equipment Management (SpriteCenterScene → Equipment Tab)

**Paper-Doll Layout**:
```
         [Helmet]
[Weapon] [PREVIEW] [Chest]
[Gloves] [PREVIEW] [Ring]
         [Legs]
[Boots]  [Amulet]  [Crystal]
```

**Features**:
- 128×128 animated sprite preview (walk frame cycling at ~5.5 FPS)
- Tap preview to cycle facing direction (down → left → right → up)
- Rarity-colored slot borders with epic/legendary pulse animations
- Empty slots show dashed border with "+" icon
- Stat tooltips on slot hover showing bonuses
- Equipment power score with shimmer animation

**Equipment Slot Popup**:
- Sort controls: Rarity (default), Stats, Level
- Currently equipped item with mini sprite preview
- Available items from inventory with:
  - Mini sprite preview showing hypothetical loadout
  - Full stat comparison: Current → New with green/red delta
  - Element synergy badge with match indicator
  - Class synergy badge with match indicator
- 44px+ touch targets for mobile

**Equipment Summary Panel**:
- Total stat bonuses from all equipment
- Active synergy list with colored badges
- Power score badge (color-coded by tier)

### Deployment Screen (DeploymentScene)
- Grid cells render sprites with full equipment via HumanoidSpriteSystem
- Level badge (top-left corner)
- Element color badge (bottom-right corner)
- Detail panel shows sprite preview with equipment, stats, abilities
- Drag-and-drop repositioning with equipment-equipped ghost sprite

### Battle Screen (RTSBattleScene)
- Units render with full equipment via RTSBattleRenderer → HumanoidSpriteSystem
- Tap unit to see info panel with stats, abilities, targeting, evolution
- Selection highlight: pulsing golden ring + bouncing arrow above unit
- Equipment visuals persist through all animations (idle, walk, attack, cast)

---

## 9. Balance Framework

### Power Progression Curve

| Level | Expected Equipment | Rarity | Total Stat Budget | Power Score |
|-------|-------------------|--------|-------------------|-------------|
| 1-5 | 2-3 common items | Common | 10-30 | 5-20 |
| 5-10 | 4-5 common items | Common | 30-60 | 20-40 |
| 10-15 | Mixed common/uncommon | Uncommon | 60-100 | 40-70 |
| 15-25 | Full uncommon set | Rare | 100-180 | 70-120 |
| 25-35 | Mixed rare/epic | Epic | 180-300 | 120-200 |
| 35-45 | Full rare + 1-2 epic | Epic | 300-450 | 200-300 |
| 45+ | Epic/Legendary mix | Legendary | 450-700+ | 300-500+ |

### Balance Rules
1. No single item should provide more than 50 points in any one stat
2. Legendary items should be ~3× the stat budget of common items at equivalent level
3. Negative stats are allowed sparingly (e.g., heavy armor reducing SPD)
4. Synergy multipliers are multiplicative, not additive
5. Equipment stat bonuses should not exceed 40% of base stats at equal level

---

## 10. QA Checklist

### Equipment Management
- [ ] All 9 slots equip/unequip correctly
- [ ] Equipment popup only shows owned inventory items
- [ ] Level requirement enforcement prevents equipping high-level gear
- [ ] Stat bonuses apply correctly to effective stats
- [ ] Equipment changes persist across scene transitions
- [ ] Sprite preview updates immediately on equip/unequip
- [ ] Cache invalidation triggers on equipment change

### Visual Rendering
- [ ] Helmet renders on head in all 4 directions
- [ ] Weapon renders in hand with correct positioning per direction
- [ ] Chest armor renders on torso with rarity coloring
- [ ] Gloves render on hands (both arms)
- [ ] Legs render as upper leg overlay
- [ ] Boots render at foot level
- [ ] Ring renders as glowing band on front hand
- [ ] Amulet renders as pendant below head (hidden when facing up)
- [ ] Crystal renders as floating diamond above shoulder with pulsing opacity
- [ ] All equipment respects rarity coloring

### Cross-Screen Consistency
- [ ] Equipment visuals match between Sprite Center, Deployment, and Battle
- [ ] Element colors are consistent (Air not Wind, Chaos included)
- [ ] Equipment stat bonuses reflected in battle unit stats

### Synergy System
- [ ] Element synergy badges display correctly with match indicators
- [ ] Class synergy badges display correctly
- [ ] Dual-element races match against either element
- [ ] Synergy multipliers apply to stat calculations

### Edge Cases
- [ ] Unequipping returns item to inventory
- [ ] Re-equipping doesn't duplicate items
- [ ] Empty equipment slots render default sprite (no crash)
- [ ] Level 1 sprites can equip level 1 items
- [ ] Enemy units generate appropriate equipment for their level

---

## File References

| File | Purpose |
|------|---------|
| `Web/js/data/EquipmentData.js` | 84 equipment item definitions |
| `Web/js/data/WeaponThemeData.js` | Theme sheets, equipment rows, race mappings |
| `Web/js/data/SpriteData.js` | 24 races, 72 forms, element/class types |
| `Web/js/systems/rendering/HumanoidSpriteSystem.js` | Visual equipment rendering engine |
| `Web/js/scenes/SpriteCenterScene.js` | Equipment management UI |
| `Web/js/scenes/DeploymentScene.js` | Pre-battle equipment display |
| `Web/js/scenes/RTSBattleScene.js` | Battle equipment visuals + unit info panel |
| `Web/js/systems/rendering/RTSBattleRenderer.js` | Battle sprite renderer with selection highlight |
| `Web/js/systems/ui/UnitRenderer.js` | Unit card renderer with equipment display |
| `Web/js/systems/battle/RTSUnit.js` | Unit data with equipment field |
