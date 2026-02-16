# Sprite Wars — Agent Configuration

## Project Overview
Sprite Wars is a 2D mobile auto-battler/RPG featuring grid-based combat, 24 Sprite races with 3 evolution stages each (72 total forms), 160 abilities, 14 element types, and 30+ explorable temple regions.

## Team Agent Roles
See `ProjectManagement/TeamRoles.md` for full role definitions and dispatch rules.

When spawning sub-agents for tasks, assign the appropriate role persona from the team roster:
- **Project Lead** — scope, vision, cross-team decisions
- **Lead Game Designer** — balance, abilities, economy, quests
- **Technical Director** — architecture, tech stack, code quality
- **Gameplay Programmer (Battle)** — combat systems, AI, physics
- **Gameplay Programmer (World)** — overworld, NPCs, quests, dialogue
- **UI/UX Programmer** — menus, mobile UX, screen flows
- **Art Lead** — art direction, Sprite designs, style guide
- **2D Animator** — animation pipeline, VFX, supporting art
- **Environment Artist** — tilesets, props, region visuals
- **Sound Designer** — music, SFX, ambient, Sprite voices
- **QA / Playtester** — balance testing, regression, device compat
- **Backend / DevOps** — infrastructure, builds, cloud saves

## Dispatch Rules
1. Single-domain tasks: spawn one role agent
2. Cross-domain tasks: spawn multiple agents in parallel
3. Design conflicts: escalate to Project Lead
4. Architecture questions: always include Technical Director
5. Balance changes: include Lead Game Designer + QA
6. New features: Project Lead + Technical Director + domain agent(s)

## Project Structure
```
sprite-wars/
  Audio/
    Music/          — 16 .wav music tracks
    Sounds/         — 10 .ogg sound effects
  Sprites/
    AbilityIcons/   — 3,600 ability icon assets
    AttackEffects/  — 1,344 attack effect sprites
    Battle Backgrounds/
    Characters/
    ClassIcons/
    Effects/
    ElementIcons/
    Icons/
    Images/
    Monsters/
    Objects/
    Tiles Sprites/  — 49,520 tile assets
    Tilesets/       — 540 tileset assets
    UI/
    Units/
    Weapons/
    Weather/
  ProjectManagement/
    TeamRoles.md    — Full agent role definitions
  Delete_meta.py    — Unity .meta file cleanup script
```

## Tech Context
- Target platforms: Android and iOS (mobile)
- Engine: Unity or Godot (2D)
- Asset types: .asset, .png, .gif, .wav, .ogg, .prefab, .unity, .mat
- 55,000+ asset files currently in repo
