# Phase 4: Catching, Evolution & Progression

**Focus:** Crystal catching mechanic, evolution system, leveling/XP, and equipment systems.

---

## Tasks

### [P4-001] Design Crystal Catching Mechanic Data Model
- **Description:** Define the data structure for the crystal catching system: crystal types (with element affinities), catch rate formula inputs (target HP%, status effects, crystal type bonus, Sprite rarity modifier), catch attempt resolution states (shake, break free, success), and catch result rewards.
- **Assigned:** Lead Game Designer
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P1-001

### [P4-002] Implement Catch Rate Formula
- **Description:** Code the catch probability calculation: base catch rate × (1 - target HP%) × status bonus × crystal type multiplier × rarity modifier. Ensure the formula produces satisfying catch rates: common Sprites at full HP ≈ 40%, rare Sprites at low HP with status ≈ 70%, legendary Sprites at low HP ≈ 15%.
- **Assigned:** Gameplay Programmer (Battle)
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P4-001

### [P4-003] Implement Crystal Throw and Catch Sequence
- **Description:** Build the runtime catch sequence: player selects crystal → throw animation → crystal contacts target → shake sequence (1–3 shakes based on catch rate closeness) → success capture or break-free result. Wire into the battle flow as an action alternative to attacking.
- **Assigned:** Gameplay Programmer (Battle)
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P4-002

### [P4-004] Design Crystal Catching Animation Assets
- **Description:** Create the visual assets for the crystal catching sequence: crystal throw arc, crystal impact flash, crystal encapsulation effect, shake animation (with wobble), break-free shatter effect, and success glow/lock effect. Must work at mobile resolution.
- **Assigned:** 2D Animator
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P4-003

### [P4-005] Implement Caught Sprite Integration
- **Description:** After a successful catch: add the Sprite to the player's roster with its current stats/level, assign a default nickname, add to PC storage if team is full, award catch XP to the player's active team, and log the catch in the Pokédex-equivalent registry.
- **Assigned:** Gameplay Programmer (World)
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P4-003

### [P4-006] Define Crystal Types and Acquisition Sources
- **Description:** Design 5–8 crystal types with different catch rate bonuses: Basic Crystal (1x), Elemental Crystals per type (1.5x vs matching element), Master Crystal (3x, very rare), and specialty crystals (status crystal = bonus if target has status). Define where each crystal is obtained (shops, temple rewards, quest rewards).
- **Assigned:** Lead Game Designer
- **Priority:** P1
- **Complexity:** S
- **Dependencies:** P4-001

### [P4-007] Implement XP and Leveling System
- **Description:** Build the experience point system: XP gain formula from battles (based on enemy level relative to player level, battle performance), XP distribution across participating team members, level-up threshold curve (exponential), and stat recalculation on level-up.
- **Assigned:** Gameplay Programmer (Battle)
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P1-001

### [P4-008] Implement Level-Up Ability Learning
- **Description:** On level-up, check the Sprite's learnset for any abilities available at the new level. If a new ability is available and the Sprite has an open ability slot, learn it automatically. If all 4 slots are full, prompt the player to choose which ability to replace (or skip).
- **Assigned:** Gameplay Programmer (Battle)
- **Priority:** P0
- **Complexity:** S
- **Dependencies:** P4-007, P2-015, P2-016

### [P4-009] Implement Evolution Trigger System
- **Description:** Build the evolution check that runs after XP gain: if the Sprite meets its evolution conditions (level threshold, held item, special condition), trigger the evolution sequence. Support the three trigger types: level-based, item-based, and condition-based (e.g., win 10 battles).
- **Assigned:** Gameplay Programmer (Battle)
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P1-006, P4-007

### [P4-010] Implement Evolution Sequence and Stat Recalculation
- **Description:** When evolution triggers: play the evolution VFX sequence, swap the Sprite's visual form reference to the new stage, recalculate all stats using the new stage's base stats and growth rates, update the ability pool, and show the evolution result screen to the player.
- **Assigned:** Gameplay Programmer (Battle)
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P4-009

### [P4-011] Implement Evolution Cancellation
- **Description:** Allow the player to cancel an evolution in progress (during the VFX sequence) by tapping a cancel button. The Sprite retains its current form but can evolve again after the next level-up. Track cancelled evolutions for re-prompting.
- **Assigned:** Gameplay Programmer (Battle)
- **Priority:** P1
- **Complexity:** S
- **Dependencies:** P4-010

### [P4-012] Design Equipment Data Schema
- **Description:** Define the equipment data model: equipment ID, name, slot type (9 slots: weapon, helmet, chest, legs, boots, gloves, ring, amulet, crystal), rarity tier (common/uncommon/rare/epic/legendary), base stat bonuses, element synergy bonuses, class synergy bonuses, level requirement, and source reference.
- **Assigned:** Technical Director
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** None

### [P4-013] Implement Equipment Inventory and Slot System
- **Description:** Build the inventory system for equipment: storage with configurable capacity, equip/unequip to the 9 slots per Sprite, stat recalculation when equipment changes, equipment comparison UI data, and stacking rules for identical items.
- **Assigned:** Gameplay Programmer (World)
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P4-012

### [P4-014] Implement Equipment Stat Application
- **Description:** When a Sprite equips or unequips gear, recalculate all derived stats: add equipment stat bonuses, apply element synergy multipliers if the equipment element matches the Sprite's element, and apply class synergy multipliers for class-matched gear.
- **Assigned:** Gameplay Programmer (Battle)
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P4-013

### [P4-015] Design Equipment Drop Tables
- **Description:** Create drop table configurations for equipment: which equipment can drop where (overworld, temples, bosses, quests), drop rates per rarity tier, level-scaling for dropped equipment stats, and first-clear guaranteed drops.
- **Assigned:** Lead Game Designer
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P4-012

### [P4-016] Implement PC Storage System
- **Description:** Build the Sprite storage system (analogous to PC boxes): store Sprites beyond the active team of 10, browse stored Sprites with sorting/filtering, swap between team and storage, and display Sprite summary data (level, element, stats preview).
- **Assigned:** Gameplay Programmer (World)
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P1-001

### [P4-017] Implement Team Management Screen Logic
- **Description:** Build the team management screen's backend logic: reorder team members (drag and drop), swap team members with storage, view detailed Sprite stats, change equipped abilities (from learned pool), and change equipment loadout.
- **Assigned:** Gameplay Programmer (World)
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P4-013, P4-016

### [P4-018] Implement Sprite Registry (Dex) System
- **Description:** Build the Sprite registry that tracks: which Sprites the player has seen (silhouette entry), which have been caught (full entry), total caught count, evolution chain completion tracking, and per-Sprite best stats/level records.
- **Assigned:** Gameplay Programmer (World)
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P4-005

### [P4-019] Test: Catching System Edge Cases
- **Description:** Test catch mechanics: catching at exactly 0% and 100% catch rates, catching a Sprite that faints from status damage the same turn, using the last crystal in inventory, catching when team and storage are both full, and catching during a boss fight (should be blocked).
- **Assigned:** QA / Playtester
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P4-005

### [P4-020] Test: Evolution System Edge Cases
- **Description:** Test evolution: evolving at max level, evolving with full ability slots, cancelling and re-triggering evolution, item-based evolution when item is consumed, evolving multiple Sprites in the same battle, and stat continuity across evolution (HP% should be preserved).
- **Assigned:** QA / Playtester
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P4-010

### [P4-021] Test: Equipment Stat Stacking
- **Description:** Test equipment interactions: equipping 9 items simultaneously and verifying all stats stack correctly, swapping equipment and verifying old bonuses are fully removed, element synergy bonus activation/deactivation, and equipping gear above level requirement (should be blocked).
- **Assigned:** QA / Playtester
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P4-014

---

## Phase 4 Summary
| Metric | Count |
|---|---|
| Total Tasks | 21 |
| P0 (Critical) | 14 |
| P1 (High) | 5 |
| P2 (Medium) | 2 |
| Roles Involved | Battle Programmer, World Programmer, Lead Game Designer, Technical Director, 2D Animator, QA |
