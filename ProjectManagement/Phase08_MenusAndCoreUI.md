# Phase 8: Menus & Core UI

**Focus:** Main menu, team management, inventory, settings, and all non-battle UI screens.

---

## Tasks

### [P8-001] Implement Main Menu Screen
- **Description:** Build the main menu with options: Continue (load last save), New Game, Settings, and Credits. Show game logo, background artwork, and version number. Handle first-launch state (no Continue option available).
- **Assigned:** UI/UX Programmer
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** None

### [P8-002] Implement Team Management Screen
- **Description:** Build the team management UI: display current team (up to 10 Sprites) with portraits, level, HP bar, and element icon. Support drag-and-drop reordering, tap to view Sprite detail, swap button to access PC storage, and visual indicator for empty team slots.
- **Assigned:** UI/UX Programmer
- **Priority:** P0
- **Complexity:** L
- **Dependencies:** P4-017

### [P8-003] Implement Sprite Detail / Inspection Screen
- **Description:** Build the Sprite detail screen showing: full sprite art, name/nickname (editable), level and XP progress bar, all 6 base stats with equipment bonuses shown separately, element type(s) with icon, class type, 4 equipped abilities with details on tap, 9 equipment slots with equipped items, and evolution stage indicator.
- **Assigned:** UI/UX Programmer
- **Priority:** P0
- **Complexity:** L
- **Dependencies:** P4-013, P4-008

### [P8-004] Implement Ability Management Sub-Screen
- **Description:** Build the ability management UI accessible from Sprite detail: show 4 equipped ability slots, list all learned abilities (may exceed 4), tap to view ability details (power, accuracy, targeting, description), drag to swap equipped abilities, and lock indicator for abilities that can't be forgotten.
- **Assigned:** UI/UX Programmer
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P8-003

### [P8-005] Implement Equipment Management Sub-Screen
- **Description:** Build the equipment UI accessible from Sprite detail: show 9 equipment slots in a paper-doll layout, tap slot to see equippable items from inventory, show stat comparison (current vs. candidate equipment), equip/unequip actions, and element/class synergy indicators.
- **Assigned:** UI/UX Programmer
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P8-003, P4-013

### [P8-006] Implement Item Inventory Screen
- **Description:** Build the inventory screen: tabbed categories (consumables, crystals, equipment, key items, materials), grid or list view toggle, item count display, use/equip action buttons, item detail popup with description and stats, and sort/filter options (by rarity, element, type).
- **Assigned:** UI/UX Programmer
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P5-015

### [P8-007] Implement PC Storage Browser Screen
- **Description:** Build the PC storage screen: browse stored Sprites in a grid view with sorting (by level, element, class, name), search/filter capabilities, tap to view Sprite detail, withdraw to team / deposit from team actions, and multi-select for batch operations.
- **Assigned:** UI/UX Programmer
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P4-016

### [P8-008] Implement Sprite Registry (Dex) Screen
- **Description:** Build the registry/dex UI: scrollable list of all 72 Sprite forms grouped by race, seen Sprites show silhouette with ??? name, caught Sprites show full art and stats, completion counter (caught X of 72), and filter by element/class/caught status.
- **Assigned:** UI/UX Programmer
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P4-018

### [P8-009] Implement Settings Screen
- **Description:** Build the settings UI with sections: Audio (music/SFX/ambient volume sliders, mute toggles), Display (battle speed default, animation toggle), Account (cloud save status, link/unlink), Language (if applicable), and About (version, credits link, privacy policy link).
- **Assigned:** UI/UX Programmer
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** None

### [P8-010] Implement Save/Load Screen
- **Description:** Build the save management UI: display save slots with timestamp, playtime, team preview, and progression percentage. Support save to slot, load from slot, delete save with confirmation, and cloud save sync status indicator per slot.
- **Assigned:** UI/UX Programmer
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P4-017

### [P8-011] Implement In-Game Pause/Menu Overlay
- **Description:** Build the in-game pause menu accessible during overworld exploration: Team, Inventory, Registry, Quests, Map, Settings, Save, and Return to Title options. Should overlay on the game without a full scene transition.
- **Assigned:** UI/UX Programmer
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P8-002, P8-006, P8-009

### [P8-012] Implement Notification/Toast System
- **Description:** Build a reusable notification system for game-wide events: item received toast, quest update notification, level up popup, achievement unlocked banner, and system messages (save complete, network status). Notifications should queue and not overlap.
- **Assigned:** UI/UX Programmer
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** None

### [P8-013] Implement Confirmation Dialog System
- **Description:** Build a reusable confirmation dialog for destructive or important actions: "Are you sure?" with Yes/No buttons, used for: overwriting saves, selling items, releasing Sprites, abandoning quests, and exiting to title. Customizable title, message, and button labels.
- **Assigned:** UI/UX Programmer
- **Priority:** P0
- **Complexity:** S
- **Dependencies:** None

### [P8-014] Implement Screen Transition System
- **Description:** Build smooth transitions between UI screens: slide left/right for navigation depth, fade for modal overlays, and scale-up for popups. Maintain a navigation stack so the back button always returns to the previous screen correctly.
- **Assigned:** UI/UX Programmer
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** None

### [P8-015] Implement Touch Input System (Mobile UX)
- **Description:** Build the core mobile input handling: tap detection with 44pt minimum touch targets, drag-and-drop for team reordering and deployment, swipe navigation between screens/tabs, long-press for tooltips/details, and pinch-to-zoom on maps. Handle multi-touch edge cases.
- **Assigned:** UI/UX Programmer
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** None

### [P8-016] Implement Accessibility Features
- **Description:** Build accessibility support: scalable text size (small/medium/large), high-contrast mode for UI elements, colorblind-friendly element indicators (icons + text, not just color), screen reader tag support for key UI elements, and haptic feedback option for touch interactions.
- **Assigned:** UI/UX Programmer
- **Priority:** P2
- **Complexity:** M
- **Dependencies:** P8-015

### [P8-017] Test: Full UI Flow Navigation
- **Description:** Test complete UI navigation: every screen is reachable, back button works from every screen, no dead ends or missing back paths, all tabs and sub-screens load correctly, and no state leaks between screens (e.g., inventory showing stale data after buying items).
- **Assigned:** QA / Playtester
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P8-011

### [P8-018] Test: Touch Target Sizes and Mobile UX
- **Description:** Verify all interactive elements meet the 44pt minimum touch target size on the smallest supported device (4.7" screen). Test that no buttons overlap, drag-and-drop is responsive, and all gestures feel natural on both Android and iOS.
- **Assigned:** QA / Playtester
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P8-015

---

## Phase 8 Summary
| Metric | Count |
|---|---|
| Total Tasks | 18 |
| P0 (Critical) | 12 |
| P1 (High) | 4 |
| P2 (Medium) | 2 |
| Roles Involved | UI/UX Programmer, QA |
