# Phase 5: Overworld & Exploration

**Focus:** Build the explorable overworld, region maps, NPC interactions, wild Sprite encounters, and navigation systems.

---

## Tasks

### [P5-001] Implement Overworld Tile Map Renderer
- **Description:** Build the 2D tile map rendering engine that loads tilesets, renders multi-layer tile maps (ground, decoration, collision, overhead), handles tile animations (water, lava, grass), and supports camera scrolling with the player character. Must leverage the existing 49,520+ tile assets in the repository.
- **Assigned:** Gameplay Programmer (World)
- **Priority:** P0
- **Complexity:** L
- **Dependencies:** None

### [P5-002] Implement Player Character Controller (Overworld)
- **Description:** Build the overworld player character: 4-directional movement on the tile grid, collision detection against impassable tiles and objects, interaction trigger zones (NPCs, objects, doors), and movement animation state machine (idle, walk in 4 directions).
- **Assigned:** Gameplay Programmer (World)
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P5-001

### [P5-003] Implement Camera System
- **Description:** Build the overworld camera that follows the player character with smooth lerp movement, respects map boundaries (doesn't show outside the map), supports zoom levels for different area types, and handles transitions between indoor and outdoor areas.
- **Assigned:** Gameplay Programmer (World)
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P5-002

### [P5-004] Design Starter Town Map
- **Description:** Design and build the first town area using existing town tilesets: layout the tile map with buildings (Sprite center, shop, player home), NPC placement locations, entrance/exit points, and decorative elements. This is the player's home base.
- **Assigned:** Environment Artist
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P5-001

### [P5-005] Design First Route / Overworld Path
- **Description:** Design the first explorable route connecting the starter town to the first temple region. Include terrain variety (paths, grass, bridges, obstacles), wild Sprite encounter zones (tall grass areas), item pickup locations, and trainer NPC battle positions.
- **Assigned:** Environment Artist
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P5-001

### [P5-006] Implement Wild Sprite Encounter System
- **Description:** Build the encounter trigger system: when the player walks through designated tall grass tiles, roll for a random encounter based on area encounter rate. Select a wild Sprite from the area's encounter table (species + level range). Transition to battle with the wild Sprite.
- **Assigned:** Gameplay Programmer (World)
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P5-002, P3-001

### [P5-007] Design Encounter Tables per Region Area
- **Description:** For each overworld route and region area, define the encounter table: which Sprite species appear, their level ranges, encounter rarity weights (common/uncommon/rare), and time-of-day variations if applicable. Ensure all 24 Sprite races are obtainable across the world.
- **Assigned:** Lead Game Designer
- **Priority:** P0
- **Complexity:** L
- **Dependencies:** P1-002 through P1-005

### [P5-008] Implement NPC Dialogue System
- **Description:** Build the dialogue engine: trigger dialogue when player interacts with an NPC, display dialogue in a text box with character portrait, support branching dialogue trees (choices), support conditional dialogue (changes based on quest state or progression), and handle dialogue-triggered events (give item, start quest).
- **Assigned:** Gameplay Programmer (World)
- **Priority:** P0
- **Complexity:** L
- **Dependencies:** P5-002

### [P5-009] Implement NPC Patrol and Behavior System
- **Description:** Build NPC overworld behaviors: standing in place with idle animation, patrolling a defined path, facing the player when spoken to, and trainer NPCs that challenge the player when line-of-sight is triggered (vision cone detection).
- **Assigned:** Gameplay Programmer (World)
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P5-008

### [P5-010] Implement Trainer NPC Battle System
- **Description:** Build the trainer battle flow: NPC detects player in vision range → exclamation mark animation → NPC walks to player → pre-battle dialogue → transition to battle with NPC's defined team → post-battle dialogue and rewards → NPC marked as defeated (won't re-trigger).
- **Assigned:** Gameplay Programmer (World)
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P5-009, P3-001

### [P5-011] Implement Scene/Area Transition System
- **Description:** Build the system that transitions between overworld areas: door entries (town → building interior), route connections (route 1 → route 2), and region entries (overworld → temple region). Handle loading new tile maps, repositioning the player, and transition animations (fade to black, slide).
- **Assigned:** Gameplay Programmer (World)
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P5-001, P5-002

### [P5-012] Implement Overworld Object Interaction
- **Description:** Build the interaction system for overworld objects: treasure chests (open → give item → mark as opened), save points (trigger save), signs (display text), breakable rocks / cuttable trees (require ability or tool), and switches/levers (toggle state, open doors/paths).
- **Assigned:** Gameplay Programmer (World)
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P5-002

### [P5-013] Implement Sprite Center (Healing Station)
- **Description:** Build the Sprite center interaction: player enters building → interacts with NPC → full heal of entire team with animation → NPC dialogue. Available in every town. Also serves as a respawn point after a team wipe.
- **Assigned:** Gameplay Programmer (World)
- **Priority:** P0
- **Complexity:** S
- **Dependencies:** P5-008, P5-011

### [P5-014] Implement Shop System
- **Description:** Build the shop interface and logic: display available items with prices, buy items (deduct currency, add to inventory), sell items (add currency, remove from inventory), shop inventory varies by location, and handle insufficient funds gracefully.
- **Assigned:** Gameplay Programmer (World)
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P5-008

### [P5-015] Implement Item Inventory System
- **Description:** Build the consumable item inventory: storage with categories (crystals, potions, key items, battle items), use item from menu or battle, item effect application, stack counts, and item capacity limits.
- **Assigned:** Gameplay Programmer (World)
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** None

### [P5-016] Implement Day/Night Cycle (Optional)
- **Description:** Build an in-game time system with day/night visual changes: tint overlay shifts, different encounter tables at night, NPC schedule changes, and certain events/Sprites only available at specific times.
- **Assigned:** Gameplay Programmer (World)
- **Priority:** P2
- **Complexity:** M
- **Dependencies:** P5-001, P5-006

### [P5-017] Implement Weather System (Overworld Visual)
- **Description:** Build the overworld weather effects using the existing weather assets (Leaves, RainDrop, RainSplash, SnowFlake): particle overlay system, per-area weather configuration, weather transitions, and weather affecting encounter rates or battle conditions.
- **Assigned:** Gameplay Programmer (World)
- **Priority:** P2
- **Complexity:** M
- **Dependencies:** P5-001

### [P5-018] Implement Minimap/Region Map
- **Description:** Build a minimap overlay showing the current area with the player's position, and a full region map accessible from the menu showing discovered areas, key landmarks, and the player's current location. Support fog-of-war for undiscovered areas.
- **Assigned:** UI/UX Programmer
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P5-001

### [P5-019] Test: Overworld Navigation and Collision
- **Description:** Test all overworld systems: walk through every area verifying no collision gaps, test all door/transition triggers, verify NPC interactions all work, test walking along map edges, test rapid direction changes, and verify no soft-locks from NPC positioning.
- **Assigned:** QA / Playtester
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P5-011, P5-012

### [P5-020] Test: Encounter Rate and Distribution
- **Description:** Run 1000+ encounter samples per area and verify: encounter rates match design targets, species distribution matches encounter tables, level ranges are correct, and rare Sprites actually appear at the intended rates.
- **Assigned:** QA / Playtester
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P5-006, P5-007

---

## Phase 5 Summary
| Metric | Count |
|---|---|
| Total Tasks | 20 |
| P0 (Critical) | 13 |
| P1 (High) | 3 |
| P2 (Medium) | 4 |
| Roles Involved | World Programmer, Environment Artist, Lead Game Designer, UI/UX Programmer, QA |
