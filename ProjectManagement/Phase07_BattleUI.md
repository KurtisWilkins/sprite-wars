# Phase 7: Battle UI & Deployment

**Focus:** All battle-related UI — deployment screen, battle HUD, targeting overlays, health bars, status indicators, and results screens.

---

## Tasks

### [P7-001] Design Battle UI Layout (Mobile-First)
- **Description:** Create the complete UI layout specification for the battle screen at mobile resolution: grid display area, unit health bars, ability bar placement, status effect indicators, turn order display, battle speed controls, and auto-battle toggle. Must accommodate 10v10 units without feeling cramped on a 5" screen.
- **Assigned:** UI/UX Programmer
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P3-001

### [P7-002] Implement Pre-Battle Deployment Screen
- **Description:** Build the deployment screen shown before each battle: display the battle grid with the player's deployable zone highlighted, let the player drag-and-drop Sprites from their team onto grid positions, show enemy team preview (silhouettes or full info based on game state), confirm button to start battle, and auto-deploy option.
- **Assigned:** UI/UX Programmer
- **Priority:** P0
- **Complexity:** L
- **Dependencies:** P3-002, P4-017

### [P7-003] Implement Battle Grid Visual Renderer
- **Description:** Build the visual representation of the battle grid: render grid cells with proper spacing, highlight cells for targeting, show terrain effects on cells, animate cell states (damaged, buffed zone), and handle responsive scaling for different screen sizes.
- **Assigned:** UI/UX Programmer
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P3-001

### [P7-004] Implement Unit Health Bar System
- **Description:** Build HP bars for all on-screen units: show current/max HP with smooth drain animation, color-coded by HP percentage (green/yellow/red), show damage numbers as floating text, and include a small level indicator. Must be readable with 20 units on screen.
- **Assigned:** UI/UX Programmer
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P3-004

### [P7-005] Implement Status Effect Icon Display
- **Description:** Build the per-unit status effect display: show small icons for each active status effect next to/below the unit, indicate remaining duration (turn counter or ticking timer), stack count for stackable effects, and tooltip on tap showing effect details.
- **Assigned:** UI/UX Programmer
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P3-007

### [P7-006] Implement Targeting Overlay System
- **Description:** Build the targeting visualization that appears when an ability is about to fire: highlight valid target cells based on the ability's targeting type, show the AoE pattern preview (for multi-target abilities), indicate friendly vs enemy targets with color coding, and show projected damage estimates if applicable.
- **Assigned:** UI/UX Programmer
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P2-002, P3-006

### [P7-007] Implement Turn Order / Timeline Display
- **Description:** Build the turn order UI element showing the sequence of upcoming unit actions: character portraits in order, highlight the currently acting unit, show speed-modified insertions (priority moves), and update dynamically when status effects change speed.
- **Assigned:** UI/UX Programmer
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P3-003

### [P7-008] Implement Battle Action Bar
- **Description:** Build the ability selection bar shown during the player's active units' turns: display 4 equipped abilities with icons and PP/cooldown status, highlight usable abilities vs grayed-out (on cooldown, no PP), show ability type/element indicator, and tap to select followed by targeting phase.
- **Assigned:** UI/UX Programmer
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P3-006

### [P7-009] Implement Crystal Throw UI (Catching)
- **Description:** Build the in-battle crystal selection and throwing UI: crystal inventory display, crystal type selection, throw button with target selection (tap on wild Sprite), and catch result animation integration.
- **Assigned:** UI/UX Programmer
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P4-003

### [P7-010] Implement Battle Results Screen
- **Description:** Build the post-battle results screen: victory/defeat banner, XP gained per Sprite (with level-up animation if applicable), items/equipment dropped, currency earned, evolution trigger notification, and continue/retry buttons.
- **Assigned:** UI/UX Programmer
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P3-012, P4-007

### [P7-011] Implement Battle Speed and Auto-Battle Toggle UI
- **Description:** Build the in-battle control panel: speed toggle button (1x → 2x → 4x cycling), auto-battle toggle with visual indicator (play/pause icon), and retreat/flee button with confirmation dialog.
- **Assigned:** UI/UX Programmer
- **Priority:** P1
- **Complexity:** S
- **Dependencies:** P3-014, P3-015

### [P7-012] Implement Damage Number Floating Text
- **Description:** Build the floating damage/heal numbers that appear above units when hit: damage numbers in red, heal numbers in green, critical hit numbers larger with burst effect, effectiveness indicator text ("Super Effective!", "Not Very Effective"), and smooth float-up-and-fade animation.
- **Assigned:** UI/UX Programmer
- **Priority:** P0
- **Complexity:** S
- **Dependencies:** P3-004

### [P7-013] Implement Battle Event Text Feed
- **Description:** Build the scrolling text feed at the bottom/top of the battle screen showing narration: "[Sprite] used [Ability]!", "It's super effective!", "[Sprite] fainted!", "A wild [Sprite] appeared!". Show the most recent 2–3 messages with auto-scroll.
- **Assigned:** UI/UX Programmer
- **Priority:** P1
- **Complexity:** S
- **Dependencies:** P3-016

### [P7-014] Implement Composition Bonus Display
- **Description:** Build the pre-battle and in-battle display showing active team composition bonuses: list active bonuses with tier level, show stat effects, indicate "almost active" bonuses (1 unit away from threshold), and animate bonus activation at battle start.
- **Assigned:** UI/UX Programmer
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P3-001

### [P7-015] Implement Battle Pause Menu
- **Description:** Build the pause overlay accessible during battle: resume button, settings shortcut (audio levels), party overview (current HP/status of all units), and forfeit/retreat option with confirmation.
- **Assigned:** UI/UX Programmer
- **Priority:** P1
- **Complexity:** S
- **Dependencies:** P7-001

### [P7-016] Test: Battle UI at All Screen Sizes
- **Description:** Test the battle UI on small (4.7"), standard (5.8"), and large (6.7") screen sizes: verify all elements are visible, touch targets are minimum 44pt, no text is clipped, 20 unit health bars are readable, and targeting overlay is accurate on all sizes.
- **Assigned:** QA / Playtester
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P7-001 through P7-014

### [P7-017] Test: Deployment Screen Usability
- **Description:** Test the deployment screen: drag-and-drop works on all screen sizes, units snap to grid correctly, can't place on invalid cells, auto-deploy produces reasonable formations, team preview is accurate, and battle starts correctly from deployment.
- **Assigned:** QA / Playtester
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P7-002

---

## Phase 7 Summary
| Metric | Count |
|---|---|
| Total Tasks | 17 |
| P0 (Critical) | 11 |
| P1 (High) | 6 |
| Roles Involved | UI/UX Programmer, QA |
