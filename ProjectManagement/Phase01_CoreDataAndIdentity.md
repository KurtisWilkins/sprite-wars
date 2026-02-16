# Phase 1: Core Data & Identity

**Focus:** Establish the foundational data models for all 24 Sprite races, 72 evolution forms, 14 element types, and core identity systems.

---

## Tasks

### [P1-001] Define Sprite Race Base Data Schema
- **Description:** Design the core data model (JSON or ScriptableObject) for a Sprite race entry: race ID, race name, element type(s), class type, base stats (HP, ATK, DEF, SPD, SP.ATK, SP.DEF), growth rates per stat, evolution chain references, and lore/description text.
- **Assigned:** Technical Director
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** None

### [P1-002] Author Sprite Race Data: Races 1–6
- **Description:** Populate the first 6 Sprite race entries with balanced base stats, element/class assignments, growth curves, and placeholder lore. Ensure diversity across elements and classes in this first batch.
- **Assigned:** Lead Game Designer
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P1-001

### [P1-003] Author Sprite Race Data: Races 7–12
- **Description:** Populate Sprite race entries 7–12, continuing to distribute elements and classes evenly and ensuring no two races in the same element share identical stat profiles.
- **Assigned:** Lead Game Designer
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P1-001

### [P1-004] Author Sprite Race Data: Races 13–18
- **Description:** Populate Sprite race entries 13–18, introducing more dual-element or hybrid-class Sprites to increase team-building variety.
- **Assigned:** Lead Game Designer
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P1-001

### [P1-005] Author Sprite Race Data: Races 19–24
- **Description:** Populate the final batch of Sprite race entries 19–24, filling any remaining element/class gaps and including at least 2 "rare" races with unique stat distributions.
- **Assigned:** Lead Game Designer
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P1-001

### [P1-006] Define Evolution Stage Data Model
- **Description:** Extend the Sprite data schema to support 3 evolution stages per race (72 total forms). Each stage needs: stage number, stat multipliers or overrides, new/replaced abilities, visual form reference, and evolution trigger conditions (level threshold, item, or special condition).
- **Assigned:** Technical Director
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P1-001

### [P1-007] Author Evolution Data: Races 1–12 (Stages 2 & 3)
- **Description:** Define the stage 2 and stage 3 evolution data for the first 12 races: stat growth deltas per stage, evolution level thresholds (or item requirements), and ability changes upon evolving.
- **Assigned:** Lead Game Designer
- **Priority:** P0
- **Complexity:** L
- **Dependencies:** P1-006, P1-002, P1-003

### [P1-008] Author Evolution Data: Races 13–24 (Stages 2 & 3)
- **Description:** Define the stage 2 and stage 3 evolution data for races 13–24, completing all 72 evolution form definitions.
- **Assigned:** Lead Game Designer
- **Priority:** P0
- **Complexity:** L
- **Dependencies:** P1-006, P1-004, P1-005

### [P1-009] Define Element Type Data Schema
- **Description:** Build the data model for the 14 element types: element ID, element name, icon reference, color palette, and the 14×14 effectiveness matrix (super-effective, not-very-effective, neutral, immune). Include validation that the matrix is internally consistent.
- **Assigned:** Technical Director
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** None

### [P1-010] Design & Balance the 14×14 Element Matchup Chart
- **Description:** Design the full 196-cell effectiveness chart for all 14 elements. Balance for: no element is universally dominant, every element has at least 2 weaknesses and 2 resistances, dual-element interactions are clear, and the chart encourages diverse team composition.
- **Assigned:** Lead Game Designer
- **Priority:** P0
- **Complexity:** L
- **Dependencies:** P1-009

### [P1-011] Fix Element Icon Naming Discrepancies
- **Description:** Rename RockElement → EarthElement, GrassElement → PlantElement, LightingElement → ElectricElement (typo fix). Update all associated .asset files and references.
- **Assigned:** Technical Director
- **Priority:** P1
- **Complexity:** S
- **Dependencies:** P1-009

### [P1-012] Create Missing Element Icons (Metal, Poison)
- **Description:** Design and produce 2 new element icons for Metal and Poison, matching the visual style and dimensions of the existing 12 element icons. Create corresponding .asset files.
- **Assigned:** Art Lead
- **Priority:** P1
- **Complexity:** S
- **Dependencies:** P1-009

### [P1-013] Implement Element Effectiveness Lookup Function
- **Description:** Code the runtime function that takes an attacking element and defending element (or dual-elements) and returns the correct damage multiplier from the effectiveness matrix. Handle dual-type defenders by multiplying both matchups.
- **Assigned:** Gameplay Programmer (Battle)
- **Priority:** P0
- **Complexity:** S
- **Dependencies:** P1-010

### [P1-014] Build Sprite Data Validation Tool
- **Description:** Create an editor tool or script that validates all 72 Sprite form entries for: no missing fields, stat totals within expected ranges, evolution chains are complete (all 3 stages linked), abilities reference valid ability IDs, and element assignments match valid element IDs.
- **Assigned:** Technical Director
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P1-007, P1-008, P1-010

### [P1-015] Review & Sign-Off: Phase 1 Data Integrity
- **Description:** Comprehensive review of all Phase 1 deliverables: 24 race definitions, 72 evolution forms, 14 element types, effectiveness chart, and element icons. Verify cross-referential integrity and sign off for downstream consumption.
- **Assigned:** QA / Playtester
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P1-014

---

## Phase 1 Summary
| Metric | Count |
|---|---|
| Total Tasks | 15 |
| P0 (Critical) | 11 |
| P1 (High) | 4 |
| Roles Involved | Technical Director, Lead Game Designer, Art Lead, Battle Programmer, QA |
