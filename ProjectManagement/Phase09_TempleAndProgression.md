# Phase 9: Temple & Progression System

**Focus:** 30 temples (14 elemental + 16 class-based), enemy scaling, team composition bonuses, temple rewards, and region exploration.

---

## Tasks

### [P9-001] Define Temple Data Schema
- **Description:** Design and implement the core data model for temples, including fields for temple ID, name, type (elemental vs. class-based), dominant element/class, secondary elements, difficulty tier, region reference, and reward tables.
- **Assigned:** Technical Director
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** None

### [P9-002] Implement Elemental Temple Definitions (14 Temples)
- **Description:** Author data entries for all 14 elemental temples (Fire, Water, Grass, Ice, Wind, Rock, Lightning, Dark, Light, Fairy, Lunar, Solar, and 2 hybrid-element temples), populating each with its dominant element, secondary elements, and placeholder reward references.
- **Assigned:** Lead Game Designer
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P9-001

### [P9-003] Implement Class-Based Temple Definitions (16 Temples)
- **Description:** Author data entries for all 16 class-based temples (Spearman, Archer, Wizard, Knight, etc.), populating each with its dominant class, secondary classes, and placeholder reward references.
- **Assigned:** Lead Game Designer
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P9-001

### [P9-004] Design Region Data Structure
- **Description:** Define the region model that ties each temple to 1–4 unique explorable areas, including fields for area name, area type, encounter table references, tileset reference, ambient audio reference, and NPC placement data.
- **Assigned:** Technical Director
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P9-001

### [P9-005] Populate Elemental Temple Regions (14 Regions)
- **Description:** For each of the 14 elemental temples, design and populate the 1–4 areas within its region, specifying dominant element distribution, secondary element mix ratios, encounter density, and area progression order.
- **Assigned:** Lead Game Designer
- **Priority:** P1
- **Complexity:** L
- **Dependencies:** P9-004, P9-002

### [P9-006] Populate Class-Based Temple Regions (16 Regions)
- **Description:** For each of the 16 class-based temples, design and populate the 1–4 areas within its region, specifying dominant class distribution, secondary class mix ratios, encounter density, and area progression order.
- **Assigned:** Lead Game Designer
- **Priority:** P1
- **Complexity:** L
- **Dependencies:** P9-004, P9-003

### [P9-007] Build Player Top-10 Average Level Calculator
- **Description:** Implement the function that scans the player's entire Sprite roster, identifies the 10 highest-leveled Sprites, and computes their average level. This value is the base input for all temple enemy scaling.
- **Assigned:** Gameplay Programmer (Battle)
- **Priority:** P0
- **Complexity:** S
- **Dependencies:** None

### [P9-008] Implement Per-Enemy Independent Scaling System
- **Description:** Build the enemy scaling engine that takes the player's top-10 average level as a base and applies per-enemy scaling offsets (defined in temple data) to compute each enemy's individual level, stats, and ability ranks independently.
- **Assigned:** Gameplay Programmer (Battle)
- **Priority:** P0
- **Complexity:** L
- **Dependencies:** P9-007, P9-001

### [P9-009] Design Scaling Curve Formulas Per Temple Tier
- **Description:** Define the mathematical scaling curves (stat multipliers, HP scaling, damage scaling) for each temple difficulty tier, ensuring early temples feel approachable while late-game temples remain challenging. Document formulas in a balance spreadsheet.
- **Assigned:** Lead Game Designer
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P9-008

### [P9-010] Implement Encounter Table Generator for Temple Areas
- **Description:** Build the system that reads a region area's encounter configuration and generates enemy teams with appropriate Sprite races, levels (from the scaling system), elements/classes, and abilities for each encounter within that area.
- **Assigned:** Gameplay Programmer (Battle)
- **Priority:** P0
- **Complexity:** L
- **Dependencies:** P9-008, P9-005, P9-006

### [P9-011] Define Team Composition Bonus Data Model
- **Description:** Design the data schema for team composition bonuses: bonus ID, name, required element or class, threshold tiers (3, 5, 7 matching units), stat effects per tier, unlock conditions (quest/temple completion + minimum matching Sprites deployed), and stacking rules.
- **Assigned:** Technical Director
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** None

### [P9-012] Implement Element-Based Composition Bonus Detection
- **Description:** Build the runtime system that inspects the player's deployed team, counts Sprites matching each element type, and activates the appropriate tier bonus (3/5/7 thresholds) for each element that meets requirements. Must check prerequisite quest/temple completion.
- **Assigned:** Gameplay Programmer (Battle)
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P9-011

### [P9-013] Implement Class-Based Composition Bonus Detection
- **Description:** Build the runtime system that counts Sprites matching each class type and activates the appropriate tier bonus (3/5/7 thresholds). Must check prerequisite quest/temple completion.
- **Assigned:** Gameplay Programmer (Battle)
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P9-011

### [P9-014] Implement Bonus Stacking Logic (Element + Class)
- **Description:** Implement the logic that allows element bonuses and class bonuses to stack simultaneously. A Sprite contributing to an element bonus can also contribute to a class bonus. Multiple bonuses apply their stat effects additively or multiplicatively as designed.
- **Assigned:** Gameplay Programmer (Battle)
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P9-012, P9-013

### [P9-015] Design Mixed-Party Named Bonuses
- **Description:** Define 10–15 named mixed-composition bonuses (e.g., "Battle Formation" = 1 Spearman + 2 Archers + 1 Wizard) with specific Sprite composition requirements spanning multiple classes and/or elements.
- **Assigned:** Lead Game Designer
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P9-011

### [P9-016] Implement Mixed-Party Bonus Detection Engine
- **Description:** Build the system that evaluates the player's deployed team against all named mixed-party bonus definitions, detecting partial and full matches and activating the corresponding bonuses.
- **Assigned:** Gameplay Programmer (Battle)
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P9-015, P9-014

### [P9-017] Build Composition Bonus UI Display
- **Description:** Create the in-battle and pre-battle UI panel showing active team composition bonuses, their tier levels, stat effects, and visual indicators for bonuses close to the next tier threshold.
- **Assigned:** UI/UX Programmer
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P9-014, P9-016

### [P9-018] Design Temple Reward Pool Structure
- **Description:** Define the reward data model for temple completion: specialized themed equipment drops with element/class synergy bonuses, drop rate tables per temple tier, rare/epic/legendary drop tiers, and first-clear bonus rewards.
- **Assigned:** Lead Game Designer
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P9-001

### [P9-019] Implement Themed Equipment Generation System
- **Description:** Build the system that generates temple reward equipment with appropriate element/class synergy stats. Equipment from a Fire temple should roll fire-synergy bonuses; equipment from a Spearman temple should roll spear-class bonuses.
- **Assigned:** Gameplay Programmer (Battle)
- **Priority:** P1
- **Complexity:** L
- **Dependencies:** P9-018

### [P9-020] Build Temple Completion Reward Distribution
- **Description:** Implement the end-of-temple reward screen logic that rolls drops from the temple's reward pool, applies first-clear bonuses, presents loot to the player, and updates inventory.
- **Assigned:** Gameplay Programmer (World)
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P9-019

### [P9-021] Build Temple Reward UI Screen
- **Description:** Design and implement the post-temple reward presentation screen showing earned equipment, synergy stats, rarity indicators, and options to equip immediately or send to inventory.
- **Assigned:** UI/UX Programmer
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P9-020

### [P9-022] Implement Temple Selection Map Screen
- **Description:** Build the world map or temple selection interface where players browse and select from 30 temples, see completion status, recommended level, dominant element/class, and region preview.
- **Assigned:** UI/UX Programmer
- **Priority:** P0
- **Complexity:** L
- **Dependencies:** P9-002, P9-003, P9-004

### [P9-023] Implement Temple Unlock Progression Logic
- **Description:** Build the system that gates temple access behind progression milestones (story completion, level thresholds, prerequisite temple clears). Define and enforce the unlock order.
- **Assigned:** Gameplay Programmer (World)
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P9-022

### [P9-024] Build Temple Area Transition System
- **Description:** Implement logic for transitioning between the 1–4 areas within a temple region, including area completion checks, transition animations, and state persistence for partially completed temples.
- **Assigned:** Gameplay Programmer (World)
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P9-005, P9-006

### [P9-025] Implement Temple Boss Encounters
- **Description:** Build the boss encounter system for each temple's final area: boss-specific scaling (harder than regular enemies), unique boss abilities tied to the temple's element/class, and boss defeat triggers for temple completion.
- **Assigned:** Gameplay Programmer (Battle)
- **Priority:** P0
- **Complexity:** L
- **Dependencies:** P9-010

### [P9-026] Design Temple Boss Rosters (30 Bosses)
- **Description:** Define the boss Sprite, level scaling offset, ability loadout, and AI behavior profile for each of the 30 temple bosses. Each boss should embody its temple's element/class theme.
- **Assigned:** Lead Game Designer
- **Priority:** P1
- **Complexity:** L
- **Dependencies:** P9-025

### [P9-027] Implement Temple Progress Save/Load
- **Description:** Build persistence for temple progress: which areas have been cleared, current area state, enemy defeat tracking, and the ability to resume a partially completed temple run.
- **Assigned:** Gameplay Programmer (World)
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P9-024

### [P9-028] Balance Pass on Elemental Temple Scaling (14 Temples)
- **Description:** Playtest and tune the scaling curves, encounter difficulty, and reward rates for all 14 elemental temples.
- **Assigned:** QA / Playtester
- **Priority:** P1
- **Complexity:** L
- **Dependencies:** P9-009, P9-010, P9-019

### [P9-029] Balance Pass on Class-Based Temple Scaling (16 Temples)
- **Description:** Playtest and tune the scaling curves, encounter difficulty, and reward rates for all 16 class-based temples.
- **Assigned:** QA / Playtester
- **Priority:** P1
- **Complexity:** L
- **Dependencies:** P9-009, P9-010, P9-019

### [P9-030] Test Team Composition Bonus Edge Cases
- **Description:** Systematically test all bonus interactions: stacking limits, mixed-party overlaps, 10-unit deployment with maximum simultaneous bonuses, and bonuses activating/deactivating mid-battle if a Sprite faints.
- **Assigned:** QA / Playtester
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P9-014, P9-016

### [P9-031] Implement Composition Bonus Prerequisite Quest Hooks
- **Description:** Wire the team composition bonus unlock system into the quest completion framework. Include UI indicators showing locked vs. unlocked bonuses.
- **Assigned:** Gameplay Programmer (World)
- **Priority:** P1
- **Complexity:** S
- **Dependencies:** P9-012, P9-013, P9-023

### [P9-032] Build Temple Re-Run System with Increased Difficulty
- **Description:** Implement the ability to replay completed temples at higher difficulty tiers with increased scaling multipliers and improved reward pools.
- **Assigned:** Gameplay Programmer (Battle)
- **Priority:** P2
- **Complexity:** M
- **Dependencies:** P9-027, P9-008

### [P9-033] Integration Test: Full Temple Run End-to-End
- **Description:** Execute a complete end-to-end test: select temple, enter region, traverse areas, fight encounters with scaling, defeat boss, receive themed rewards, update completion state, verify composition bonus unlock.
- **Assigned:** QA / Playtester
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P9-025, P9-020, P9-027, P9-031

---

## Phase 9 Summary
| Metric | Count |
|---|---|
| Total Tasks | 33 |
| P0 (Critical) | 15 |
| P1 (High) | 15 |
| P2 (Medium) | 3 |
| Roles Involved | Technical Director, Lead Game Designer, Battle Programmer, World Programmer, UI/UX Programmer, QA |
