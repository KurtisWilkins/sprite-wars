# Phase 3: Battle Engine

**Focus:** Build the core battle system — grid, turn order, damage formulas, physics, projectiles, status effects, and AI.

---

## Tasks

### [P3-001] Implement Battle Grid Data Structure
- **Description:** Build the 2D grid system that underlies all combat: grid dimensions (configurable, default 6×4 per side), tile state tracking (occupied, terrain effects), coordinate system, and adjacency/range query functions.
- **Assigned:** Gameplay Programmer (Battle)
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** None

### [P3-002] Implement Unit Placement and Grid Occupation
- **Description:** Build the system for placing Sprite units on the battle grid during the deployment phase. Handle grid cell occupation, collision with other units, and position validation. Support up to 10 units per side (10v10).
- **Assigned:** Gameplay Programmer (Battle)
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P3-001

### [P3-003] Implement Turn Order / Initiative System
- **Description:** Build the turn order calculator that determines action sequence based on Sprite speed stats, priority move modifiers, and status effect speed alterations. Support real-time auto-battle tick-based or phase-based resolution as specified in the GDD.
- **Assigned:** Gameplay Programmer (Battle)
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P1-001

### [P3-004] Implement Core Damage Formula
- **Description:** Code the central damage calculation: base power × (ATK or SP.ATK / DEF or SP.DEF) × element effectiveness × STAB bonus × random variance × critical hit multiplier × composition bonus modifiers. Ensure the formula produces meaningful damage across all level ranges.
- **Assigned:** Gameplay Programmer (Battle)
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P1-013, P2-001

### [P3-005] Implement Critical Hit System
- **Description:** Build the critical hit calculation: base crit rate, speed-based crit modifier, ability-specific crit bonuses, and critical damage multiplier. Crits should feel impactful but not dominate outcomes.
- **Assigned:** Gameplay Programmer (Battle)
- **Priority:** P0
- **Complexity:** S
- **Dependencies:** P3-004

### [P3-006] Implement Ability Execution Pipeline
- **Description:** Build the ability execution system: validate targeting, consume PP/cooldown, calculate damage or effect, apply to target(s), trigger status effects, play animation, and report results. This is the central pipeline that all 160 abilities flow through.
- **Assigned:** Gameplay Programmer (Battle)
- **Priority:** P0
- **Complexity:** L
- **Dependencies:** P3-004, P2-002

### [P3-007] Implement Status Effect Application and Tick System
- **Description:** Build the runtime status effect manager: apply effects on hit, track duration timers, process per-turn ticks (DoT damage, stat modifications), handle effect expiry, manage stacking/overwrite rules, and handle cleanse/dispel interactions.
- **Assigned:** Gameplay Programmer (Battle)
- **Priority:** P0
- **Complexity:** L
- **Dependencies:** P2-003, P3-006

### [P3-008] Implement Knockback Physics System
- **Description:** Build the knockback mechanic: certain abilities push targets back on the grid by 1–3 tiles. Handle collision with grid edges (wall damage), collision with other units (both take damage), and knockback resistance from high DEF stats.
- **Assigned:** Gameplay Programmer (Battle)
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P3-001, P3-002

### [P3-009] Implement Projectile System
- **Description:** Build the projectile framework for ranged abilities: projectile spawn at caster position, travel across grid tiles, hit detection on target tile, projectile speed variation by ability, and support for piercing projectiles (hit multiple units in a line).
- **Assigned:** Gameplay Programmer (Battle)
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P3-001, P3-006

### [P3-010] Implement Multi-Target Resolution
- **Description:** Build the system that resolves abilities affecting multiple targets: AoE patterns (cross, diamond, row, column), damage falloff for splash damage, and sequential vs. simultaneous hit resolution for targeting types that hit multiple cells.
- **Assigned:** Gameplay Programmer (Battle)
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P3-006, P2-002

### [P3-011] Implement Unit Defeat (Faint) System
- **Description:** Handle what happens when a unit's HP reaches 0: play faint animation, remove from grid, check for team wipe condition, trigger any on-faint effects or abilities, update turn order, and check win/loss conditions.
- **Assigned:** Gameplay Programmer (Battle)
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P3-006

### [P3-012] Implement Battle Win/Loss Condition Checker
- **Description:** Build the condition evaluator that checks after every action: all enemy units fainted (win), all player units fainted (loss), or special conditions like boss-specific win states. Trigger appropriate end-of-battle flow.
- **Assigned:** Gameplay Programmer (Battle)
- **Priority:** P0
- **Complexity:** S
- **Dependencies:** P3-011

### [P3-013] Implement Auto-Battle AI: Basic Enemy Behavior
- **Description:** Build the baseline AI that controls enemy Sprites during auto-battle: target selection (lowest HP, type advantage, random weighted), ability selection (highest damage available, status if target is vulnerable), and positioning preferences.
- **Assigned:** Gameplay Programmer (Battle)
- **Priority:** P0
- **Complexity:** L
- **Dependencies:** P3-006, P3-004

### [P3-014] Implement Auto-Battle AI: Player Auto-Mode
- **Description:** Build the player-side auto-battle AI that can be toggled during combat. Should make competent but not optimal decisions: prioritize type advantages, use healing when below 30% HP, and avoid wasting high-cooldown abilities on low-HP targets.
- **Assigned:** Gameplay Programmer (Battle)
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P3-013

### [P3-015] Implement Battle Speed Controls (1x, 2x, 4x)
- **Description:** Build the battle speed toggle that allows players to speed up auto-battle resolution. Animations play faster, turn ticks accelerate, but all calculations remain identical. UI shows current speed setting.
- **Assigned:** Gameplay Programmer (Battle)
- **Priority:** P1
- **Complexity:** S
- **Dependencies:** P3-003

### [P3-016] Implement Battle Event Log
- **Description:** Build an event logging system that records every action during battle: ability used, damage dealt, status applied, unit fainted, etc. Feed this into both the battle UI (scrolling text) and analytics for balance tracking.
- **Assigned:** Gameplay Programmer (Battle)
- **Priority:** P1
- **Complexity:** S
- **Dependencies:** P3-006

### [P3-017] Build Battle Replay Data Recorder
- **Description:** Implement a system that records all battle inputs and RNG seeds so a battle can be deterministically replayed. Store as compact data for sharing or review. This supports the spectate/review feature.
- **Assigned:** Gameplay Programmer (Battle)
- **Priority:** P2
- **Complexity:** M
- **Dependencies:** P3-006, P3-013

### [P3-018] Unit Test Suite: Damage Formula Edge Cases
- **Description:** Write comprehensive unit tests for the damage formula covering: minimum damage floor, maximum damage cap, 0 DEF edge case, immune matchup (0 multiplier), quad weakness (4x), critical + type advantage stacking, and negative stat modifiers from debuffs.
- **Assigned:** QA / Playtester
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P3-004, P3-005

### [P3-019] Unit Test Suite: Status Effect Interactions
- **Description:** Write tests for status effect edge cases: applying the same effect twice (stacking vs. refresh), conflicting effects (burn + freeze), cleansing specific vs. all effects, effects expiring mid-turn, and effects on fainted units.
- **Assigned:** QA / Playtester
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P3-007

### [P3-020] Unit Test Suite: Knockback Physics
- **Description:** Write tests for knockback scenarios: knockback into wall, knockback into another unit, chain knockback (A pushes B into C), knockback off grid edge, knockback while frozen (should it be blocked?), and simultaneous knockback resolution.
- **Assigned:** QA / Playtester
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P3-008

### [P3-021] Integration Test: Full 10v10 Battle Simulation
- **Description:** Run automated 10v10 battles with all systems active (damage, targeting, status, knockback, projectiles, AI) for 1,000 iterations. Verify no crashes, no infinite loops, no NaN damage values, and that all battles terminate within a reasonable turn count.
- **Assigned:** QA / Playtester
- **Priority:** P0
- **Complexity:** L
- **Dependencies:** P3-013

---

## Phase 3 Summary
| Metric | Count |
|---|---|
| Total Tasks | 21 |
| P0 (Critical) | 15 |
| P1 (High) | 4 |
| P2 (Medium) | 2 |
| Roles Involved | Battle Programmer, Technical Director, QA |
