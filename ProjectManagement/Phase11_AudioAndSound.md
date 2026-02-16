# Phase 11: Audio & Sound

**Focus:** Music composition, SFX design, Sprite voices, audio systems, and mix balancing.

---

## Tasks

### [P11-001] Compose Title Screen Music Track
- **Description:** Compose and produce a title screen music track to replace the existing empty Title_Screen.wav. Should feel adventurous and inviting, loop seamlessly.
- **Assigned:** Sound Designer
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** None

### [P11-002] Define Audio Technical Spec and Format Standards
- **Description:** Document the audio pipeline: file formats (.wav for music, .ogg for SFX), sample rates, bit depths, loudness targets (LUFS), intro+loop naming convention, max file sizes for mobile, and audio channel budget.
- **Assigned:** Sound Designer
- **Priority:** P0
- **Complexity:** S
- **Dependencies:** None

### [P11-003] Implement Audio Manager System
- **Description:** Build the core audio manager: music playback with intro+loop support, SFX playback with channel pooling, ambient layer mixing, per-category volume controls, and crossfading between tracks during scene transitions.
- **Assigned:** Technical Director
- **Priority:** P0
- **Complexity:** L
- **Dependencies:** P11-002

### [P11-004] Compose Fire Region Ambient Theme
- **Description:** Compose a loopable ambient track for the Fire temple region evoking volcanic heat and molten caverns.
- **Assigned:** Sound Designer
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P11-002

### [P11-005] Compose Water Region Ambient Theme
- **Description:** Compose a loopable ambient track for the Water temple region evoking oceanic depths and flowing rivers.
- **Assigned:** Sound Designer
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P11-002

### [P11-006] Compose Grass Region Ambient Theme
- **Description:** Compose a loopable ambient track for the Grass temple region. Differentiate from existing Deep_Forest track.
- **Assigned:** Sound Designer
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P11-002

### [P11-007] Compose Ice Region Ambient Theme
- **Description:** Compose a loopable ambient track for the Ice temple region evoking frozen tundra and crystal caves.
- **Assigned:** Sound Designer
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P11-002

### [P11-008] Compose Wind, Rock, Lightning Region Ambient Themes
- **Description:** Compose 3 loopable ambient tracks for Wind (airy), Rock (deep earth), and Lightning (electric, stormy) regions.
- **Assigned:** Sound Designer
- **Priority:** P1
- **Complexity:** L
- **Dependencies:** P11-002

### [P11-009] Compose Dark, Light, Fairy Region Ambient Themes
- **Description:** Compose 3 loopable ambient tracks for Dark (ominous), Light (radiant), and Fairy (whimsical) regions.
- **Assigned:** Sound Designer
- **Priority:** P1
- **Complexity:** L
- **Dependencies:** P11-002

### [P11-010] Compose Lunar, Solar, Hybrid Region Ambient Themes
- **Description:** Compose 4 loopable ambient tracks for Lunar (nocturnal), Solar (warm), and 2 hybrid-element regions.
- **Assigned:** Sound Designer
- **Priority:** P1
- **Complexity:** L
- **Dependencies:** P11-002

### [P11-011] Compose Class-Based Temple Region Themes (Batch 1: 8 Tracks)
- **Description:** Compose 8 loopable ambient tracks for the first 8 class-based temple regions reflecting each class fantasy.
- **Assigned:** Sound Designer
- **Priority:** P1
- **Complexity:** XL
- **Dependencies:** P11-002

### [P11-012] Compose Class-Based Temple Region Themes (Batch 2: 8 Tracks)
- **Description:** Compose the remaining 8 loopable ambient tracks, completing all 30+ region themes.
- **Assigned:** Sound Designer
- **Priority:** P1
- **Complexity:** XL
- **Dependencies:** P11-002

### [P11-013] Design Fire/Ice/Lightning Ability SFX Set
- **Description:** Create SFX for Fire, Ice, and Lightning element abilities: fireballs, flame bursts, ice shards, blizzards, thunderbolts, chain lightning. ~40 unique SFX.
- **Assigned:** Sound Designer
- **Priority:** P1
- **Complexity:** L
- **Dependencies:** P11-002

### [P11-014] Design Water/Grass/Wind Ability SFX Set
- **Description:** Create SFX for Water, Grass, and Wind abilities: water jets, tidal waves, vine whips, leaf storms, gust slashes, tornados. ~40 unique SFX.
- **Assigned:** Sound Designer
- **Priority:** P1
- **Complexity:** L
- **Dependencies:** P11-002

### [P11-015] Design Rock/Dark/Light Ability SFX Set
- **Description:** Create SFX for Rock, Dark, and Light abilities: boulders, earthquakes, shadow bolts, dark pulses, holy beams. ~35 unique SFX.
- **Assigned:** Sound Designer
- **Priority:** P1
- **Complexity:** L
- **Dependencies:** P11-002

### [P11-016] Design Fairy/Lunar/Solar Ability SFX Set
- **Description:** Create SFX for Fairy, Lunar, and Solar abilities: sparkle attacks, charm effects, moonbeams, solar flares. ~35 unique SFX.
- **Assigned:** Sound Designer
- **Priority:** P1
- **Complexity:** L
- **Dependencies:** P11-002

### [P11-017] Design Physical/Class Ability SFX Set
- **Description:** Create SFX for non-elemental class abilities: sword slashes, spear thrusts, arrow releases, shield blocks, buff/debuff casting. ~30 unique SFX.
- **Assigned:** Sound Designer
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P11-002

### [P11-018] Design Sprite Cries/Voices: Races 1–8 (All 3 Stages)
- **Description:** Create unique voice/cry SFX for races 1–8 across all 3 evolution stages (24 total cries). Each stage should show vocal maturation.
- **Assigned:** Sound Designer
- **Priority:** P1
- **Complexity:** L
- **Dependencies:** P11-002

### [P11-019] Design Sprite Cries/Voices: Races 9–16 (All 3 Stages)
- **Description:** Create 24 cries for races 9–16 across all stages.
- **Assigned:** Sound Designer
- **Priority:** P1
- **Complexity:** L
- **Dependencies:** P11-002

### [P11-020] Design Sprite Cries/Voices: Races 17–24 (All 3 Stages)
- **Description:** Create 24 cries for races 17–24, completing all 72 Sprite voice assets.
- **Assigned:** Sound Designer
- **Priority:** P1
- **Complexity:** L
- **Dependencies:** P11-002

### [P11-021] Design Battle Collision and Impact SFX
- **Description:** Create SFX for battle physics: projectile impacts, melee hit variations, knockback sliding, shield deflection, critical hit emphasis. ~20–25 unique SFX.
- **Assigned:** Sound Designer
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P11-002

### [P11-022] Design Environmental Ambient SFX
- **Description:** Create loopable ambient SFX: grass rustling, water flowing, wind gusting, lava bubbling, crystal humming, rain, footsteps on different terrain. ~15–20 loops.
- **Assigned:** Sound Designer
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P11-002

### [P11-023] Design UI Feedback Polish SFX
- **Description:** Expand existing 10 UI SFX with: equipment equip/unequip, evolution trigger, level up chime, bonus activation, chest opening, rare drop fanfare, temple unlock, quest complete, error buzz. ~15–20 new SFX.
- **Assigned:** Sound Designer
- **Priority:** P2
- **Complexity:** M
- **Dependencies:** P11-002

### [P11-024] Implement Ability SFX Trigger System
- **Description:** Build the system mapping each of the 160 abilities to its SFX asset and triggering playback at correct animation timeline moments. Support positional audio panning.
- **Assigned:** Gameplay Programmer (Battle)
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P11-003, P11-013

### [P11-025] Implement Sprite Cry Playback System
- **Description:** Build the system that plays the correct Sprite cry at game events: entering battle, evolution, catching, fainting, party inspection. Must select correct variant by race and stage.
- **Assigned:** Gameplay Programmer (Battle)
- **Priority:** P1
- **Complexity:** S
- **Dependencies:** P11-003, P11-018

### [P11-026] Implement Region Ambient Audio Layer System
- **Description:** Build ambient audio management: crossfading between region themes during area transitions, mixing environmental SFX on top of music, adjusting mix during encounters.
- **Assigned:** Gameplay Programmer (World)
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P11-003, P11-004, P11-022

### [P11-027] Implement Music Intro+Loop Playback for All Tracks
- **Description:** Ensure the audio manager correctly handles the intro+loop format used by existing and new tracks: intro plays once, loop section repeats seamlessly.
- **Assigned:** Technical Director
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P11-003

### [P11-028] Audio Mix Balance Pass
- **Description:** Full mix balance pass: consistent music levels across 30+ tracks, SFX audible during combat, ambient blends naturally, Sprite cries clear against battle audio. Test on phone speakers and headphones.
- **Assigned:** Sound Designer
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P11-013 through P11-023

### [P11-029] Test Audio Memory Footprint on Target Devices
- **Description:** Profile audio memory on mid-range 2022+ devices. Verify simultaneous loaded assets stay within budget. Flag tracks needing compression.
- **Assigned:** QA / Playtester
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P11-003, P11-028

### [P11-030] Implement Audio Settings UI (Volume Sliders, Mute Toggles)
- **Description:** Build audio settings screen with separate sliders for Music, SFX, Ambient, and Voice plus mute toggles. Persist settings and apply in real-time.
- **Assigned:** UI/UX Programmer
- **Priority:** P1
- **Complexity:** S
- **Dependencies:** P11-003

---

## Phase 11 Summary
| Metric | Count |
|---|---|
| Total Tasks | 30 |
| P0 (Critical) | 4 |
| P1 (High) | 24 |
| P2 (Medium) | 2 |
| Roles Involved | Sound Designer, Technical Director, Battle Programmer, World Programmer, UI/UX Programmer, QA |
