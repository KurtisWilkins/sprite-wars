# Phase 6: Quests & Story

**Focus:** Quest framework, main storyline, side quests, NPC quest givers, and narrative systems.

---

## Tasks

### [P6-001] Design Quest Data Schema
- **Description:** Define the data model for quests: quest ID, title, description, quest type (main/side/daily/temple), quest giver NPC reference, objectives list (each with type, target, count, and completion flag), prerequisite quests, reward definitions (XP, items, currency, unlocks), and quest state (locked/available/active/complete).
- **Assigned:** Technical Director
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** None

### [P6-002] Implement Quest State Machine
- **Description:** Build the runtime quest manager that tracks all quest states, activates quests when prerequisites are met, updates objective progress from game events (battle won, Sprite caught, item collected, area reached), checks completion conditions, and distributes rewards on completion.
- **Assigned:** Gameplay Programmer (World)
- **Priority:** P0
- **Complexity:** L
- **Dependencies:** P6-001

### [P6-003] Implement Quest Objective Types
- **Description:** Build handlers for all quest objective types: defeat N enemies of type X, catch a specific Sprite species, reach a specific area, collect N items, talk to a specific NPC, complete a specific temple, win a battle with specific conditions (e.g., no faints), and deliver an item to an NPC.
- **Assigned:** Gameplay Programmer (World)
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P6-002

### [P6-004] Design Main Story Quest Chain
- **Description:** Write the main storyline quest chain (20–30 quests) that guides the player from starter town through the first temple regions, introduces game mechanics progressively, establishes the world lore, introduces the antagonist, and culminates in the final temple/boss challenge.
- **Assigned:** Lead Game Designer
- **Priority:** P0
- **Complexity:** XL
- **Dependencies:** P6-001

### [P6-005] Implement Main Story Quest Data (Quests 1–10)
- **Description:** Author the data entries for the first 10 main story quests: quest definitions, objective configurations, prerequisite chains, rewards, and NPC dialogue scripts for quest givers. These cover the tutorial through the first few temples.
- **Assigned:** Lead Game Designer
- **Priority:** P0
- **Complexity:** L
- **Dependencies:** P6-004, P6-003

### [P6-006] Implement Main Story Quest Data (Quests 11–20)
- **Description:** Author data entries for main quests 11–20, covering the mid-game arc with temple progression, team composition bonus unlocks, and increasing difficulty.
- **Assigned:** Lead Game Designer
- **Priority:** P0
- **Complexity:** L
- **Dependencies:** P6-005

### [P6-007] Implement Main Story Quest Data (Quests 21–30)
- **Description:** Author data entries for the final main quests 21–30, covering the late-game arc, final boss build-up, and endgame unlock.
- **Assigned:** Lead Game Designer
- **Priority:** P1
- **Complexity:** L
- **Dependencies:** P6-006

### [P6-008] Design Side Quest Templates
- **Description:** Create 8–10 reusable side quest templates: "Catch and Deliver" (catch a specific Sprite for an NPC), "Bounty Hunt" (defeat a rare enemy), "Fetch Quest" (bring N items), "Escort" (protect NPC through area), "Puzzle" (solve environmental puzzle), "Collection" (catch all Sprites in a region), "Training" (win battles under restrictions), and "Explorer" (discover all areas in a region).
- **Assigned:** Lead Game Designer
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P6-003

### [P6-009] Author Side Quests: Starter Region (5–8 Quests)
- **Description:** Design 5–8 side quests available in and around the starter town and first routes. These teach secondary mechanics (catching, equipment, team building) and provide early-game rewards.
- **Assigned:** Lead Game Designer
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P6-008

### [P6-010] Author Side Quests: Temple Regions (20–30 Quests)
- **Description:** Design 20–30 side quests distributed across temple regions. Each temple region should have 1–2 unique side quests tied to its element/class theme. Include composition bonus unlock quests.
- **Assigned:** Lead Game Designer
- **Priority:** P1
- **Complexity:** L
- **Dependencies:** P6-008

### [P6-011] Implement Quest Journal UI
- **Description:** Build the quest journal screen: list of active quests with objective progress, completed quests log, quest detail view with description and rewards preview, quest tracking toggle (show tracked quest objectives on HUD), and quest category tabs (main/side/daily).
- **Assigned:** UI/UX Programmer
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P6-002

### [P6-012] Implement Quest HUD Tracker
- **Description:** Build the on-screen quest tracker that shows the currently tracked quest's name and active objective with live progress (e.g., "Defeat Fire Sprites: 3/5"). Update in real-time as progress is made. Allow tap to expand/collapse.
- **Assigned:** UI/UX Programmer
- **Priority:** P1
- **Complexity:** S
- **Dependencies:** P6-011

### [P6-013] Implement Quest Notification System
- **Description:** Build the notification system for quest events: new quest available popup, objective completed toast, quest completed fanfare with reward display, and quest chain progression notification (next quest in chain now available).
- **Assigned:** UI/UX Programmer
- **Priority:** P1
- **Complexity:** S
- **Dependencies:** P6-002

### [P6-014] Implement Quest Reward Distribution
- **Description:** Build the reward distribution system that triggers on quest completion: award XP to team, add items/equipment to inventory, add currency, unlock composition bonuses or new areas, and display the reward summary screen.
- **Assigned:** Gameplay Programmer (World)
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P6-002, P5-015

### [P6-015] Implement Tutorial Quest Sequence
- **Description:** Build the special tutorial quest sequence that guides new players through: first movement, first NPC interaction, first wild battle, first catch, first team management, first equipment, and first shop purchase. Use quest objectives to gate progression and ensure players learn each system.
- **Assigned:** Gameplay Programmer (World)
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P6-005

### [P6-016] Write NPC Dialogue Scripts: Main Story NPCs
- **Description:** Write all dialogue for the main story NPC cast (15–20 characters): quest giver lines, response variations based on quest state, lore exposition, and character personality. Include dialogue for pre-quest, during-quest, and post-quest states.
- **Assigned:** Lead Game Designer
- **Priority:** P0
- **Complexity:** L
- **Dependencies:** P6-004

### [P6-017] Write NPC Dialogue Scripts: Side Quest NPCs
- **Description:** Write dialogue for side quest NPC givers (20–30 characters): quest introduction, hint dialogue during quest, and completion/thanks dialogue. Keep side quest dialogue concise compared to main story.
- **Assigned:** Lead Game Designer
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P6-009, P6-010

### [P6-018] Implement Quest Save/Load Integration
- **Description:** Ensure all quest state persists correctly through save/load: active quest progress, completed quests, available quests, quest-triggered world changes (NPCs moved, areas unlocked), and pending rewards. Test save mid-quest and reload.
- **Assigned:** Gameplay Programmer (World)
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P6-002

### [P6-019] Test: Main Story Quest Chain Playthrough
- **Description:** Play through the entire main story quest chain from start to finish, verifying: all quests activate correctly in sequence, all objectives are completable, all rewards distribute properly, dialogue plays correctly, and the story is coherent with no gaps or contradictions.
- **Assigned:** QA / Playtester
- **Priority:** P0
- **Complexity:** L
- **Dependencies:** P6-005, P6-006, P6-007

### [P6-020] Test: Side Quest Completion and Edge Cases
- **Description:** Test all side quests for: objective tracking accuracy, reward distribution, interaction with main quest state, ability to abandon and re-accept quests, completing objectives out of order, and edge cases like completing a quest objective before accepting the quest.
- **Assigned:** QA / Playtester
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P6-009, P6-010

---

## Phase 6 Summary
| Metric | Count |
|---|---|
| Total Tasks | 20 |
| P0 (Critical) | 10 |
| P1 (High) | 8 |
| P2 (Medium) | 2 |
| Roles Involved | World Programmer, Lead Game Designer, Technical Director, UI/UX Programmer, QA |
