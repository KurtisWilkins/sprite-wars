# [P11-002] Sprite Wars — Audio Technical Specification

> **Version:** 1.0
> **Last Updated:** 2026-02-16
> **Owner:** Sound Designer
> **Engine:** Godot 4.2 (GDScript)
> **Target Platforms:** Android / iOS (Mobile)

---

## 1. Overview

This document defines the complete audio pipeline for Sprite Wars, covering file formats, encoding standards, loudness targets, memory budgets, channel allocation, and naming conventions. All audio contributors and integrators must follow these specifications to ensure consistent quality and optimal mobile performance.

---

## 2. File Formats

| Category | Format | Import Mode | Rationale |
|----------|--------|-------------|-----------|
| Music (BGM) | `.wav` (PCM) | **Streaming** | Large files; stream from disk to avoid memory spikes |
| Ambient Loops | `.wav` (PCM) | **Streaming** | Continuous playback; same streaming rationale as music |
| Sound Effects (SFX) | `.ogg` (Vorbis) | **Preloaded** | Small files; preload for zero-latency playback |
| Sprite Cries | `.ogg` (Vorbis) | **Preloaded** | Short voice clips; must trigger instantly |
| UI Sounds | `.ogg` (Vorbis) | **Preloaded** | Immediate tactile feedback required |

### Godot Import Settings

```
# Music / Ambient (.wav)
[params]
loop=false            # Looping handled in code via intro+loop system
force/8_bit=false
force/mono=false
force/max_rate=false
force/max_rate_hz=44100
edit/trim=false
edit/normalize=false

# SFX / Cries / UI (.ogg)
[params]
loop=false
loop_offset=0
bpm=0
beat_count=0
bar_beats=4
```

---

## 3. Sample Rate & Bit Depth

| Category | Sample Rate | Bit Depth | Channels |
|----------|-------------|-----------|----------|
| Music | 44,100 Hz (44.1 kHz) | 16-bit | Stereo |
| Ambient | 44,100 Hz (44.1 kHz) | 16-bit | Stereo |
| SFX | 22,050 Hz (22.05 kHz) | 16-bit | Mono |
| Sprite Cries | 22,050 Hz (22.05 kHz) | 16-bit | Mono |
| UI Sounds | 22,050 Hz (22.05 kHz) | 16-bit | Mono |
| Voice / Dialogue | 22,050 Hz (22.05 kHz) | 16-bit | Mono |

### Rationale
- **44.1 kHz stereo** for music and ambient provides full-quality stereo field for immersion.
- **22.05 kHz mono** for SFX and voice reduces file size by ~75% versus stereo 44.1 kHz with negligible perceived quality loss on mobile speakers and earbuds.

---

## 4. Loudness Targets

All audio must be mastered to the following integrated loudness (LUFS) targets measured over the full duration of the asset. Use a loudness meter plugin (e.g., Youlean, dpMeter) during mastering.

| Category | Target (LUFS) | True Peak Ceiling | Notes |
|----------|---------------|-------------------|-------|
| Music | **-14 LUFS** | -1.0 dBTP | Consistent with mobile streaming standards |
| Ambient | **-18 LUFS** | -1.0 dBTP | Sits below music in the mix |
| SFX | **-10 LUFS** | -1.0 dBTP | Punchy, cuts through music layer |
| Sprite Cries | **-12 LUFS** | -1.0 dBTP | Prominent but not overpowering |
| Voice / Dialogue | **-12 LUFS** | -1.0 dBTP | Clear speech intelligibility |
| UI Sounds | **-10 LUFS** | -1.0 dBTP | Immediate tactile feedback |

### Dynamic Range
- Music: Allow 8-12 dB dynamic range (peaks to quiet). Battle music may be more compressed (6-8 dB range) for intensity.
- SFX: Compress to 3-6 dB dynamic range for consistent perceived volume.

---

## 5. Intro + Loop System

Music tracks that loop use a two-file system for seamless playback:

```
Audio/Music/
  Battle_Theme_Intro.wav    ← Plays once at start
  Battle_Theme_Loop.wav     ← Loops indefinitely after intro finishes
  Deep_Forest.wav           ← Single file, loops from start (no intro)
```

### Naming Convention

| Pattern | Behavior |
|---------|----------|
| `{TrackName}_Intro.wav` + `{TrackName}_Loop.wav` | Intro plays once, then loop starts and repeats |
| `{TrackName}.wav` (single file) | Entire track loops from beginning |

### Implementation Rules
1. `AudioManager` checks for `{track}_Intro.wav` first. If found, plays intro then queues loop.
2. If only `{track}.wav` exists, it loops the single file.
3. Crossfading always targets the loop portion, never the intro.
4. Intro files must end sample-accurately where the loop begins -- no silence padding.
5. Loop files must be sample-accurate at both head and tail for seamless looping.

### Current Intro+Loop Tracks
| Track | Intro File | Loop File |
|-------|-----------|-----------|
| Battle Theme | `Battle_Theme_Intro.wav` | `Battle_Theme_Loop.wav` |
| Boss Battle | `Boss_Battle_Intro.wav` | `Boss_Battle_Loop.wav` |
| Evil Gloating | `Evil_Gloating_Intro.wav` | `Evil_Gloating_Loop.wav` |
| Lullaby | `Lullaby_Intro.wav` | `Lullaby_Loop.wav` |
| Victory Fanfare | `Victory_Fanfare_Intro.wav` | `Victory_Fanfare_Loop.wav` |

### Single-File Loop Tracks
| Track | File |
|-------|------|
| Deep Forest | `Deep_Forest.wav` |
| Game Over | `Game Over.wav` |
| Overworld Theme | `Overworld_Theme.wav` |
| Time Cave | `Time_Cave.wav` |
| Title Screen | `Title_Screen.wav` |
| Town Theme | `Town_Theme.wav` |

---

## 6. Maximum File Sizes

Enforced per-file limits to keep the build size mobile-friendly:

| Category | Max File Size | Typical Range |
|----------|---------------|---------------|
| Music (single file) | **5 MB** (after Vorbis export compression) | 2-5 MB |
| Music (intro file) | **2 MB** | 100 KB - 2 MB |
| Music (loop file) | **5 MB** | 2-5 MB |
| Ambient loops | **3 MB** | 1-3 MB |
| SFX | **200 KB** | 5-100 KB |
| Sprite Cries | **100 KB** | 10-50 KB |
| UI Sounds | **100 KB** | 3-30 KB |
| Voice clips | **100 KB** | 20-80 KB |

> **Note:** Source `.wav` files in the repo may exceed these limits. The limits apply to the final compressed output after Godot's Vorbis import. Monitor exported `.pck` sizes during builds.

---

## 7. Audio Channel Budget

Simultaneous audio channel allocation for mobile performance:

| Channel Type | Count | Bus | Purpose |
|-------------|-------|-----|---------|
| Music | **1** | `Music` | Current BGM track |
| Ambient | **1** | `Ambient` | Environmental loop (wind, rain, cave echo) |
| SFX | **8** | `SFX` | Ability sounds, hits, UI, world interactions |
| Voice | **1** | `Voice` | Sprite cries, NPC barks |
| **Total** | **11** | | Maximum simultaneous streams |

### Priority Rules
When all 8 SFX channels are occupied:
1. **Steal the oldest playing channel** that has been playing longest.
2. If multiple channels started at the same time, steal the one with the lowest priority.
3. SFX priority tiers (highest to lowest):
   - **Critical:** Player hit, player ability cast, evolution jingle
   - **High:** Enemy ability, item use, catch attempt
   - **Normal:** Environmental SFX, footsteps, ambient one-shots
   - **Low:** Distant effects, flavor sounds

---

## 8. Audio Bus Layout

```
Master
├── Music        (default: 0 dB)
├── Ambient      (default: -6 dB)
├── SFX          (default: 0 dB)
└── Voice        (default: 0 dB)
```

### Bus Configuration

| Bus | Volume | Effects | Notes |
|-----|--------|---------|-------|
| Master | 0 dB | Limiter (-0.3 dB ceiling) | Prevents clipping on any device |
| Music | 0 dB | Low-pass filter (optional, for muffled indoor effect) | Ducked during voice playback |
| Ambient | -6 dB | Reverb (small room, optional per region) | Blends beneath music |
| SFX | 0 dB | None | Clean and punchy |
| Voice | 0 dB | None | Cries and dialogue |

### Music Ducking
When a Sprite cry or voice line plays, the Music bus is temporarily reduced by **-6 dB** over **0.2s**, then restored over **0.5s** after the voice clip finishes.

---

## 9. Compression & Mobile Export

### Godot Export Settings (Mobile)

| Format | Vorbis Quality | Notes |
|--------|---------------|-------|
| Music `.wav` → Vorbis | **Quality 6** (≈128 kbps) | Good quality-to-size ratio for music |
| Ambient `.wav` → Vorbis | **Quality 5** (≈112 kbps) | Slightly lower; ambient is less detail-critical |
| SFX `.ogg` | **Quality 4** (≈96 kbps) | Already Vorbis; re-encoded at build |
| Cries `.ogg` | **Quality 3** (≈80 kbps) | Short clips; size matters more than fidelity |

### Platform Notes
- **Android:** Vorbis (.ogg) natively supported. No additional transcoding needed.
- **iOS:** Godot handles Vorbis decoding in software. No AAC conversion required.
- Enable `textures/vram_compression/import_etc2_astc` in project settings (already set).

---

## 10. Memory Budget

**Total audio memory budget: 50 MB RAM**

| Category | Budget | Strategy |
|----------|--------|----------|
| Music (streaming) | **~0 MB** | Streamed from disk; only decode buffer in RAM (~256 KB) |
| Ambient (streaming) | **~0 MB** | Streamed from disk; ~256 KB decode buffer |
| SFX (preloaded) | **15 MB** | All UI + common battle SFX cached at startup |
| Sprite Cries (preloaded) | **20 MB** | Current party cries + recently encountered |
| Dynamic / Reserve | **15 MB** | Ability SFX loaded on demand per battle |

### Preload Strategy
1. **At startup:** Preload all UI sounds (~1 MB) and common battle SFX (~5 MB).
2. **On area load:** Preload region-specific ambient one-shots and environmental SFX.
3. **On battle start:** Preload ability SFX for all Sprites in the current battle.
4. **On battle end:** Unload battle-specific SFX not needed in the overworld.
5. **Sprite cries:** Keep current party cries loaded. Load encounter cries on demand.

### Memory Monitoring
- Use `Performance.get_monitor(Performance.AUDIO_OUTPUT_LATENCY)` for latency checks.
- Track loaded audio resources via `ResourceLoader` reference counting.
- Log warnings if audio memory exceeds 45 MB (90% threshold).

---

## 11. Asset Delivery Checklist

Before submitting any audio asset, verify:

- [ ] Correct sample rate (44.1 kHz music / 22.05 kHz SFX)
- [ ] Correct bit depth (16-bit)
- [ ] Correct channel count (stereo music / mono SFX)
- [ ] Loudness within 1 LUFS of target
- [ ] True peak below -1.0 dBTP
- [ ] No DC offset
- [ ] No audible clicks or pops at loop boundaries
- [ ] File size within limits (check compressed output)
- [ ] Naming convention followed exactly
- [ ] Silence trimmed from head and tail (except intentional pre-delay)
- [ ] Intro+Loop files are sample-accurate at the splice point
- [ ] Tested playback in Godot editor on mobile preview

---

## 12. Directory Structure

```
res://Audio/
├── Music/
│   ├── Battle_Theme_Intro.wav
│   ├── Battle_Theme_Loop.wav
│   ├── Boss_Battle_Intro.wav
│   ├── Boss_Battle_Loop.wav
│   ├── Deep_Forest.wav
│   ├── Evil_Gloating_Intro.wav
│   ├── Evil_Gloating_Loop.wav
│   ├── Game Over.wav
│   ├── Lullaby_Intro.wav
│   ├── Lullaby_Loop.wav
│   ├── Overworld_Theme.wav
│   ├── Time_Cave.wav
│   ├── Title_Screen.wav
│   ├── Town_Theme.wav
│   ├── Victory_Fanfare_Intro.wav
│   └── Victory_Fanfare_Loop.wav
├── Sounds/
│   ├── Hit.ogg
│   ├── Item Confirm.ogg
│   ├── Item Discard.ogg
│   ├── Item Use.ogg
│   ├── Menu Cancel.ogg
│   ├── Menu Confirm.ogg
│   ├── Menu Move.ogg
│   ├── Open.ogg
│   ├── Prompt.ogg
│   └── Recover.ogg
├── Ambient/          ← Future: region ambient loops
├── Cries/            ← Future: Sprite cry clips (72 forms)
└── Voice/            ← Future: NPC dialogue barks
```

---

## 13. Naming Conventions

### Music Files
```
{Context}_{Variant}.wav          — Single-loop tracks
{Context}_{Variant}_Intro.wav    — Intro portion
{Context}_{Variant}_Loop.wav     — Looping portion
```
Examples: `Battle_Theme_Intro.wav`, `Deep_Forest.wav`, `Town_Theme.wav`

### SFX Files
```
{Category}_{Action}.ogg
```
Examples: `Menu_Confirm.ogg`, `Hit.ogg`, `Item_Use.ogg`

### Sprite Cries
```
{RaceName}_S{Stage}_Cry.ogg
```
Examples: `Emberpaw_S1_Cry.ogg`, `Blazefang_S2_Cry.ogg`, `Infernowolf_S3_Cry.ogg`

### Ability SFX
```
Ability_{ElementOrName}_{Phase}.ogg
```
Phases: `Cast`, `Travel`, `Hit`
Examples: `Ability_Fire_Cast.ogg`, `Ability_Water_Hit.ogg`, `Ability_ThunderStrike_Travel.ogg`

### Ambient
```
Amb_{Region}_{Layer}.wav
```
Examples: `Amb_Forest_Wind.wav`, `Amb_Cave_Drip.wav`, `Amb_Town_Crowd.wav`

---

## 14. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-16 | Sound Designer | Initial specification |
