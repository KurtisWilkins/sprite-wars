# Phase 2: Abilities & Combat Data

**Focus:** Define all 160 abilities, targeting types, status effects, and the combat data layer that feeds into the battle engine.

---

## Tasks

### [P2-001] Define Ability Base Data Schema
- **Description:** Design the data model for abilities: ability ID, name, element type, class affinity, targeting type (from the 15 targeting types), base power, accuracy, PP/cooldown, priority speed modifier, status effect references, animation/VFX reference, SFX reference, and description text.
- **Assigned:** Technical Director
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P1-009

### [P2-002] Define the 15 Targeting Type Schemas
- **Description:** Implement data definitions for all 15 targeting types: 10 enemy-targeting (single, row, column, AoE, random, etc.) and 5 friendly-targeting (self, single ally, all allies, adjacent allies, etc.). Each needs a targeting pattern, valid tile mask, and UI highlight rule.
- **Assigned:** Technical Director
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** None

### [P2-003] Design Status Effect Data Model
- **Description:** Define the data schema for status effects: effect ID, name, type (buff/debuff/condition), duration (turns), stat modifiers, damage-over-time values, special behavior flags (prevents action, forces movement, etc.), stacking rules, and icon/VFX references.
- **Assigned:** Technical Director
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** None

### [P2-004] Author Ability Data: Fire Element Abilities (10–12)
- **Description:** Design and balance 10–12 Fire-element abilities spanning physical attacks, special attacks, status inflictors, and buffs. Distribute across single-target, multi-target, and AoE targeting types. Assign to appropriate Sprite races.
- **Assigned:** Lead Game Designer
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P2-001, P2-002, P2-003

### [P2-005] Author Ability Data: Water Element Abilities (10–12)
- **Description:** Design and balance 10–12 Water-element abilities with appropriate variety in targeting, power levels, and status effects.
- **Assigned:** Lead Game Designer
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P2-001

### [P2-006] Author Ability Data: Grass/Plant Element Abilities (10–12)
- **Description:** Design and balance 10–12 Plant-element abilities emphasizing healing, damage-over-time (poison/leech), and terrain control effects.
- **Assigned:** Lead Game Designer
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P2-001

### [P2-007] Author Ability Data: Ice Element Abilities (10–12)
- **Description:** Design and balance 10–12 Ice-element abilities emphasizing slowing, freezing, and area denial.
- **Assigned:** Lead Game Designer
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P2-001

### [P2-008] Author Ability Data: Wind Element Abilities (10–12)
- **Description:** Design and balance 10–12 Wind-element abilities emphasizing speed manipulation, knockback, and evasion buffs.
- **Assigned:** Lead Game Designer
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P2-001

### [P2-009] Author Ability Data: Rock/Earth Element Abilities (10–12)
- **Description:** Design and balance 10–12 Earth-element abilities emphasizing defense, shields, and ground-based AoE attacks.
- **Assigned:** Lead Game Designer
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P2-001

### [P2-010] Author Ability Data: Lightning/Electric Element Abilities (10–12)
- **Description:** Design and balance 10–12 Electric-element abilities emphasizing chain damage, stun effects, and high-priority strikes.
- **Assigned:** Lead Game Designer
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P2-001

### [P2-011] Author Ability Data: Dark Element Abilities (10–12)
- **Description:** Design and balance 10–12 Dark-element abilities emphasizing debuffs, life drain, and fear/confusion status effects.
- **Assigned:** Lead Game Designer
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P2-001

### [P2-012] Author Ability Data: Light Element Abilities (10–12)
- **Description:** Design and balance 10–12 Light-element abilities emphasizing healing, cleansing debuffs, and radiant burst damage.
- **Assigned:** Lead Game Designer
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P2-001

### [P2-013] Author Ability Data: Fairy, Lunar, Solar, Metal, Poison Abilities (30–36)
- **Description:** Design and balance the remaining element ability sets: Fairy (charm, illusion), Lunar (night power, sleep), Solar (burn, daylight boost), Metal (defense, pierce), Poison (DoT, debuff stacking). 6–8 abilities per element.
- **Assigned:** Lead Game Designer
- **Priority:** P0
- **Complexity:** L
- **Dependencies:** P2-001

### [P2-014] Author Ability Data: Class-Specific Non-Elemental Abilities (20–25)
- **Description:** Design abilities that are class-locked rather than element-locked: Spearman thrust combos, Archer multi-shot, Wizard arcane blasts, Knight shield abilities, etc. These provide class identity beyond elemental affinity.
- **Assigned:** Lead Game Designer
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P2-001

### [P2-015] Assign Abilities to Sprite Learnsets (Races 1–12)
- **Description:** For each of the first 12 Sprite races, define which abilities they learn at each level and evolution stage. Ensure each Sprite has 8–12 total learnable abilities with a mix of element-matching and coverage moves.
- **Assigned:** Lead Game Designer
- **Priority:** P0
- **Complexity:** L
- **Dependencies:** P2-004 through P2-014, P1-007

### [P2-016] Assign Abilities to Sprite Learnsets (Races 13–24)
- **Description:** Define ability learnsets for the remaining 12 Sprite races, completing all 24 learnset definitions.
- **Assigned:** Lead Game Designer
- **Priority:** P0
- **Complexity:** L
- **Dependencies:** P2-004 through P2-014, P1-008

### [P2-017] Map Ability Icons from Existing 3,600 Assets
- **Description:** Curate and assign icons from the existing 3,600 ability icon assets to each of the 160 abilities. Create a mapping table (ability ID → icon asset path) and flag any abilities that need custom icons.
- **Assigned:** Art Lead
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P2-004 through P2-014

### [P2-018] Build Ability Data Validation Tool
- **Description:** Create an editor tool that validates all 160 ability entries: no missing fields, targeting types reference valid schemas, status effects reference valid effect IDs, power/accuracy within design bounds, and every ability is assigned to at least one Sprite's learnset.
- **Assigned:** Technical Director
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P2-015, P2-016

### [P2-019] Balance Review: Ability DPS Curves
- **Description:** Calculate and chart the DPS (damage per second/turn) for all 160 abilities factoring in base power, accuracy, cooldown, and element effectiveness. Identify outliers that are significantly above or below the expected curve for their tier.
- **Assigned:** QA / Playtester
- **Priority:** P1
- **Complexity:** L
- **Dependencies:** P2-018

### [P2-020] Balance Review: Status Effect Durations and Stacking
- **Description:** Review all status effects for duration balance: ensure no single status effect creates an unbreakable lockdown, stacking rules prevent infinite scaling, and cleanse abilities can address every debuff category.
- **Assigned:** QA / Playtester
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P2-018

---

## Phase 2 Summary
| Metric | Count |
|---|---|
| Total Tasks | 20 |
| P0 (Critical) | 16 |
| P1 (High) | 4 |
| Roles Involved | Technical Director, Lead Game Designer, Art Lead, Battle Programmer, QA |
