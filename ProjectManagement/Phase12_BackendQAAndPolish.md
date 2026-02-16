# Phase 12: Backend, QA & Polish

**Focus:** Cloud saves, analytics, CI/CD, performance optimization, device testing, balance testing, monetization, and final polish.

---

## Tasks

### [P12-001] Design Cloud Save Data Schema
- **Description:** Define the complete data schema for cloud saves: Sprite roster, levels, abilities, equipment, inventory, quest progress, temple completion, composition bonus unlocks, settings, and playtime. Include schema versioning.
- **Assigned:** Backend / DevOps
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** None

### [P12-002] Implement Cloud Save Serialization/Deserialization
- **Description:** Build the serialization layer converting in-memory game state to cloud save format and back. Handle all data types and nested objects with deterministic serialization.
- **Assigned:** Backend / DevOps
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P12-001

### [P12-003] Set Up Cloud Save Backend Service
- **Description:** Deploy and configure cloud save backend (Firebase, PlayFab, or custom) with authentication, save storage, rate limiting, data validation, and GDPR-compliant data handling.
- **Assigned:** Backend / DevOps
- **Priority:** P0
- **Complexity:** L
- **Dependencies:** P12-001

### [P12-004] Implement Cloud Save Sync Logic (Upload/Download)
- **Description:** Build client-side sync logic: upload at key checkpoints, download on login, retry with exponential backoff on failure.
- **Assigned:** Backend / DevOps
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P12-002, P12-003

### [P12-005] Implement Cloud Save Conflict Resolution
- **Description:** Build conflict resolution for local/cloud save divergence: timestamp-based auto-resolution with user prompt for ambiguous cases.
- **Assigned:** Backend / DevOps
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P12-004

### [P12-006] Implement Offline-First Save Architecture
- **Description:** Build local-first save system that always writes locally and queues cloud sync for when connectivity is available. Game must be fully playable offline.
- **Assigned:** Backend / DevOps
- **Priority:** P0
- **Complexity:** L
- **Dependencies:** P12-004

### [P12-007] Integrate Analytics SDK
- **Description:** Integrate analytics SDK and define core event taxonomy: session start/end, temple entered/completed, Sprite evolved, ability used, battle outcome, monetization events.
- **Assigned:** Backend / DevOps
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** None

### [P12-008] Implement Custom Analytics Events for Game Systems
- **Description:** Instrument all major systems with analytics: temple scaling metrics, composition bonus usage, ability frequency, equipment acceptance rates, progression velocity.
- **Assigned:** Backend / DevOps
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P12-007

### [P12-009] Integrate Crash Reporting SDK
- **Description:** Integrate crash reporting (Crashlytics, Sentry) with symbolication for iOS and Android. Configure crash grouping, severity levels, alerting, and breadcrumb logging.
- **Assigned:** Backend / DevOps
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** None

### [P12-010] Set Up CI/CD Pipeline for Android Builds
- **Description:** Configure CI/CD that builds Android APK/AAB on merge to main, runs tests, signs builds, and uploads to internal distribution.
- **Assigned:** Backend / DevOps
- **Priority:** P0
- **Complexity:** L
- **Dependencies:** None

### [P12-011] Set Up CI/CD Pipeline for iOS Builds
- **Description:** Configure CI/CD that builds iOS IPA on merge to main, runs tests, signs with provisioning profiles, and uploads to TestFlight.
- **Assigned:** Backend / DevOps
- **Priority:** P0
- **Complexity:** L
- **Dependencies:** None

### [P12-012] Set Up Automated Test Runner in CI
- **Description:** Integrate unit and integration test suites into CI pipeline, blocking merges on failure. Configure test reporting and coverage tracking.
- **Assigned:** Backend / DevOps
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P12-010, P12-011

### [P12-013] Profile and Optimize Rendering for 60 FPS Target
- **Description:** Profile rendering on mid-range 2022 devices and optimize draw calls, overdraw, shader complexity, and particles until 60 FPS is stable during 10v10 battles.
- **Assigned:** Technical Director
- **Priority:** P0
- **Complexity:** XL
- **Dependencies:** P10-046

### [P12-014] Implement LOD System for Sprite Animations
- **Description:** Build level-of-detail system reducing animation frame rate for background Sprites. Close-to-action Sprites play full rate; background uses simplified loops.
- **Assigned:** Technical Director
- **Priority:** P1
- **Complexity:** L
- **Dependencies:** P10-046

### [P12-015] Build Texture Atlas Optimization Pipeline
- **Description:** Implement automated texture atlas packing combining sprite sheets, UI, and effects into optimized atlases within mobile GPU limits (2048×2048 or 4096×4096).
- **Assigned:** Technical Director
- **Priority:** P0
- **Complexity:** L
- **Dependencies:** P10-044

### [P12-016] Optimize Memory Usage and Asset Loading
- **Description:** Profile heap memory during peak gameplay. Implement reference counting, lazy loading, and aggressive unloading. Target under 500MB on low-end devices.
- **Assigned:** Technical Director
- **Priority:** P0
- **Complexity:** L
- **Dependencies:** P12-013

### [P12-017] Implement Battery Consumption Optimization
- **Description:** Profile and reduce battery drain: frame rate throttling when idle, reduced GPU on menus, disabled background processing. Target <15% drain per hour.
- **Assigned:** Technical Director
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P12-013

### [P12-018] Implement Data Usage Optimization
- **Description:** Minimize cellular data: compress save payloads, batch analytics events, cache downloadable content, provide low-data mode. Target <1MB per hour.
- **Assigned:** Backend / DevOps
- **Priority:** P2
- **Complexity:** M
- **Dependencies:** P12-004, P12-007

### [P12-019] Device Compatibility Testing: Small Screens (4.7"–5.4")
- **Description:** Test all screens on small devices. Verify 44pt touch targets, readable text, usable battle grid, no notch/safe area clipping.
- **Assigned:** QA / Playtester
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P10-040

### [P12-020] Device Compatibility Testing: Standard Screens (5.5"–6.1")
- **Description:** Test all screens on standard devices. Verify layout scaling and aspect ratio handling.
- **Assigned:** QA / Playtester
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P10-040

### [P12-021] Device Compatibility Testing: Large Screens (6.2"–6.9")
- **Description:** Test all screens on large devices. Verify UI scales without stretching and extra space is used well.
- **Assigned:** QA / Playtester
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P10-040

### [P12-022] Device Compatibility Testing: Tablet Screens
- **Description:** Test on tablets. Document layout issues and determine if tablet-specific layouts are needed.
- **Assigned:** QA / Playtester
- **Priority:** P2
- **Complexity:** M
- **Dependencies:** P12-019, P12-020, P12-021

### [P12-023] Balance Test: All 160 Abilities
- **Description:** Test all 160 abilities for correct damage, status durations, cooldowns, targeting, and edge cases. Document outliers.
- **Assigned:** QA / Playtester
- **Priority:** P0
- **Complexity:** XL
- **Dependencies:** P11-024

### [P12-024] Balance Test: 14 Element Type Matchup Chart
- **Description:** Verify all 196 element interactions produce correct damage multipliers. Cross-reference with design spreadsheet.
- **Assigned:** QA / Playtester
- **Priority:** P0
- **Complexity:** L
- **Dependencies:** None

### [P12-025] Balance Test: Temple Scaling Curves (Early Game)
- **Description:** Play through the first 10 temples as a new player. Track time-to-clear, faints, and player level. Flag difficulty walls.
- **Assigned:** QA / Playtester
- **Priority:** P0
- **Complexity:** L
- **Dependencies:** P9-028, P9-029

### [P12-026] Balance Test: Temple Scaling Curves (Late Game)
- **Description:** Play through temples 20–30 with developed roster. Test optimized and non-optimized compositions. Verify re-run scaling.
- **Assigned:** QA / Playtester
- **Priority:** P0
- **Complexity:** L
- **Dependencies:** P9-028, P9-029, P9-032

### [P12-027] Damage Formula Verification Suite
- **Description:** Build automated test suite computing expected damage across a matrix of scenarios and comparing against actual results. Flag discrepancies >0.1%.
- **Assigned:** QA / Playtester
- **Priority:** P0
- **Complexity:** L
- **Dependencies:** P12-024

### [P12-028] Regression Test Suite: Battle Physics Edge Cases
- **Description:** Test: simultaneous knockbacks, projectile collisions, units pushed off grid, stacked units, 0 HP during knockback, status during physics resolution.
- **Assigned:** QA / Playtester
- **Priority:** P0
- **Complexity:** L
- **Dependencies:** None

### [P12-029] Regression Test Suite: Save/Load Integrity
- **Description:** Test: save mid-temple, save during battle, full inventory save, corrupt save recovery, cloud save schema migration.
- **Assigned:** QA / Playtester
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P12-006

### [P12-030] Regression Test: Evolution and Progression Systems
- **Description:** Test all 24 races × 3 stages: evolution triggers, stat recalculation, ability updates, visual form changes, mid-evolution interrupt recovery.
- **Assigned:** QA / Playtester
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P10-046

### [P12-031] Design Monetization Framework Architecture
- **Description:** Design the cosmetic-only monetization system: define purchasable items (skins, themes), explicitly excluded items (stats, abilities), purchase flow, receipt validation, and store integration.
- **Assigned:** Technical Director
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** None

### [P12-032] Implement In-App Purchase Integration (iOS)
- **Description:** Integrate Apple StoreKit, implement server-side receipt validation, handle purchase restoration, support cosmetic product catalog.
- **Assigned:** Backend / DevOps
- **Priority:** P1
- **Complexity:** L
- **Dependencies:** P12-031

### [P12-033] Implement In-App Purchase Integration (Android)
- **Description:** Integrate Google Play Billing Library, implement receipt validation, handle purchase restoration, support cosmetic catalog.
- **Assigned:** Backend / DevOps
- **Priority:** P1
- **Complexity:** L
- **Dependencies:** P12-031

### [P12-034] Build Cosmetic Shop UI
- **Description:** Design and implement the in-game cosmetic shop showing available items, previews, prices, and purchase flow.
- **Assigned:** UI/UX Programmer
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P12-031, P12-032, P12-033

### [P12-035] Implement Cosmetic Skin Application System
- **Description:** Build the system applying purchased skins to Sprites, replacing default sprite sheets while maintaining animations and gameplay.
- **Assigned:** Gameplay Programmer (Battle)
- **Priority:** P2
- **Complexity:** M
- **Dependencies:** P12-034, P10-046

### [P12-036] Performance Stress Test: Maximum Complexity Battle
- **Description:** Run 10v10 with stage 3 Sprites, simultaneous abilities, max projectiles, max status effects, weather, and composition VFX. Verify 60 FPS on target devices.
- **Assigned:** QA / Playtester
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P12-013, P12-014, P12-015

### [P12-037] Implement App Lifecycle Handling (Background/Resume)
- **Description:** Build robust handling: backgrounding mid-battle, resuming after extended background, incoming calls, low-memory warnings, force-quit recovery.
- **Assigned:** Technical Director
- **Priority:** P0
- **Complexity:** M
- **Dependencies:** P12-006

### [P12-038] Implement Network Connectivity Handling
- **Description:** Build network state manager: detect connectivity changes, gracefully degrade features offline, queue pending operations, show status indicators.
- **Assigned:** Backend / DevOps
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P12-006

### [P12-039] Implement Loading Screen System with Progress Indicators
- **Description:** Build loading screens with progress bars, loading tips, and correct display across all screen sizes.
- **Assigned:** UI/UX Programmer
- **Priority:** P1
- **Complexity:** S
- **Dependencies:** None

### [P12-040] Build Automated Screenshot Test Suite
- **Description:** Implement screenshot comparison tests for every major screen at multiple resolutions to catch visual regressions.
- **Assigned:** QA / Playtester
- **Priority:** P2
- **Complexity:** M
- **Dependencies:** P12-012

### [P12-041] Final Full Regression Test Pass
- **Description:** Complete end-to-end regression: new game through 5 temples, evolution, equipment, bonuses, all UI flows, save/load, audio, monetization. Document all issues with severity.
- **Assigned:** QA / Playtester
- **Priority:** P0
- **Complexity:** XL
- **Dependencies:** P12-023 through P12-030, P12-036

### [P12-042] Bug Fix Sprint: P0 Critical Issues
- **Description:** Triage and fix all P0 bugs from final regression: crashes, data loss, progression blockers, gameplay-breaking issues.
- **Assigned:** Technical Director
- **Priority:** P0
- **Complexity:** XL
- **Dependencies:** P12-041

### [P12-043] Bug Fix Sprint: P1 High-Priority Issues
- **Description:** Triage and fix all P1 bugs: visual glitches, audio issues, balance outliers, UX friction.
- **Assigned:** Technical Director
- **Priority:** P1
- **Complexity:** L
- **Dependencies:** P12-042

### [P12-044] Prepare App Store Submission Materials
- **Description:** Prepare all required materials: app icons, screenshots, descriptions, keywords, age ratings, privacy policy, data safety declarations.
- **Assigned:** Project Lead
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P12-041

### [P12-045] Configure Production Analytics Dashboards
- **Description:** Set up dashboards: DAU/MAU, session length, temple completion rates, crash-free rate, monetization metrics. Configure automated alerts.
- **Assigned:** Backend / DevOps
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P12-007, P12-008

### [P12-046] Implement Remote Configuration System
- **Description:** Set up remote config (Firebase Remote Config) for tuning balance parameters without app updates. Include staged rollout and emergency kill switches.
- **Assigned:** Backend / DevOps
- **Priority:** P2
- **Complexity:** M
- **Dependencies:** P12-003

### [P12-047] Security Audit: Save File Tampering Prevention
- **Description:** Implement anti-tampering: checksum validation, encryption of sensitive fields. Test against common save editing tools.
- **Assigned:** Backend / DevOps
- **Priority:** P1
- **Complexity:** M
- **Dependencies:** P12-006

### [P12-048] Final Performance Certification on Target Devices
- **Description:** Run complete game on full device matrix (3+ Android, 3+ iOS): certify 60 FPS battles, <3s load times, no memory crashes after 1 hour, battery drain within target.
- **Assigned:** QA / Playtester
- **Priority:** P0
- **Complexity:** L
- **Dependencies:** P12-036, P12-042

---

## Phase 12 Summary
| Metric | Count |
|---|---|
| Total Tasks | 48 |
| P0 (Critical) | 22 |
| P1 (High) | 18 |
| P2 (Medium) | 8 |
| Roles Involved | Backend/DevOps, Technical Director, QA, UI/UX Programmer, Battle Programmer, Project Lead |
