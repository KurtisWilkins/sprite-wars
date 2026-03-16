#!/usr/bin/env python3
"""
Sprite Wars — Sprite Assembly Pipeline
=======================================
Reads body-part PNGs, composites them per-race, generates missing race parts
procedurally, applies colour tinting, and outputs all 72 sprite forms
(24 races x 3 evolution stages).

Usage:
    python3 Tools/SpriteAssembler.py
"""

from __future__ import annotations

import json
import math
import os
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple

try:
    from PIL import Image, ImageDraw, ImageFilter, ImageChops
except ImportError:
    sys.exit("Pillow is required.  Install with:  pip install Pillow")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent.parent
BODY_PARTS_DIR = PROJECT_ROOT / "Sprites" / "Characters and Equipment" / "BodyParts"
OUTPUT_DIR = PROJECT_ROOT / "Sprites" / "Characters"
GENERATED_PARTS_DIR = PROJECT_ROOT / "Sprites" / "Characters and Equipment" / "BodyParts" / "Generated"
MAPPING_PATH = PROJECT_ROOT / "Tools" / "RaceBodyPartMapping.json"

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
BODY_SIZE = 512
FEATURE_SIZE = 256

LAYER_ORDER = [
    "shadow", "arm_back", "legs", "body", "ears", "head",
    "mouth", "eyes", "eyebrows", "hair", "beard", "arm_front", "weapon",
]

STAGE_SIZES = {1: 64, 2: 96, 3: 128}

# Head-to-body ratios per stage (head fraction of total height)
STAGE_HEAD_RATIO = {1: 1 / 1.5, 2: 1 / 2.0, 3: 1 / 2.5}


# ---------------------------------------------------------------------------
# Race definitions
# ---------------------------------------------------------------------------
@dataclass
class RacePalette:
    skin_override: Optional[str] = None
    accent: str = "#808080"
    hair: str = "#808080"
    eye: str = "#808080"


@dataclass
class RaceSpec:
    name: str
    index: int
    palette: RacePalette
    parts: Dict[str, Optional[str]] = field(default_factory=dict)
    base_type: str = "Basic"          # which existing base to derive from
    needs_generation: bool = False     # whether we must generate parts


def hex_to_rgb(h: str) -> Tuple[int, int, int]:
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


# --- Palette table --------------------------------------------------------
PALETTES: Dict[str, RacePalette] = {
    "BugMan":     RacePalette(accent="#c89858", hair="#483828", eye="#282828"),
    "BearMan":    RacePalette(accent="#e8a830", hair="#e8c848", eye="#3868b0"),
    "BirdMan":    RacePalette(accent="#e85040", hair="#c83030", eye="#c82020"),
    "Demon":      RacePalette(accent="#50b0e8", hair="#2898d8", eye="#2070b0"),
    "Devil":      RacePalette(accent="#68c870", hair="#40a858", eye="#308838"),
    "CatMan":     RacePalette(accent="#8888cc", hair="#b0b0d8", eye="#c060c0"),
    "Elf":        RacePalette(accent="#f0c030", hair="#f0d070", eye="#e8a020"),
    "Ent":        RacePalette(skin_override="#8b6840", accent="#5a8848"),
    "FishMan":    RacePalette(accent="#60d0e0", hair="#808890", eye="#40d0f0"),
    "Ghost":      RacePalette(skin_override="#c8c8e8", accent="#8888cc"),
    "Golem":      RacePalette(skin_override="#989088", accent="#b8a878"),
    "Human":      RacePalette(accent="#a0b0c8", hair="#c0c8d8", eye="#6888b0"),
    "LizardMan":  RacePalette(accent="#5a8848", hair="#5a8848", eye="#a0c040"),
    "Minotaur":   RacePalette(accent="#f09040", hair="#e87830", eye="#f06020"),
    "MonkeyMan":  RacePalette(accent="#b8a878", hair="#686058", eye="#e8c040"),
    "Mummy":      RacePalette(accent="#a02020", hair="#282838", eye="#e03030"),
    "Ork":        RacePalette(accent="#f0d860", hair="#f0e0a0", eye="#50a0f0"),
    "RatMan":     RacePalette(accent="#70b8e8", hair="#98d0f0", eye="#3888c8"),
    "Robot":      RacePalette(skin_override="#a0a8b8", accent="#60d0e0"),
    "SharkMan":   RacePalette(accent="#c89050", hair="#d0a870", eye="#885020"),
    "Skeleton":   RacePalette(skin_override="#e8e0d0", accent="#d8d0c0"),
    "TurtleMan":  RacePalette(accent="#7090b0", hair="#88a0b8", eye="#5078a0"),
    "WolfMan":    RacePalette(accent="#b878d0", hair="#a868c0", eye="#8040a0"),
    "Zombie":     RacePalette(accent="#50c8b8", hair="#38a0a0", eye="#20b0a0"),
}

# --- Existing part mappings (relative to BODY_PARTS_DIR) ------------------
EXISTING_PARTS: Dict[str, Dict[str, Optional[str]]] = {
    "Human": {
        "body": "Body/Basic/Human.png",
        "head": "Head/Basic/Head.png",
        "ears": "Ears/Basic/HumanEars.png",
        "eyes": "Eyes/Basic/Male.png",
        "mouth": "Mouth/Basic/Normal.png",
        "hair": "Hair/Basic/ShortHair.png",
        "eyebrows": "Eyebrows/Basic/Eyebrows1.png",
    },
    "Elf": {
        "body": "Body/Basic/Human.png",
        "head": "Head/Basic/Head.png",
        "ears": "Ears/Basic/ElfEars.png",
        "eyes": "Eyes/Basic/Female.png",
        "hair": "Hair/Bonus/ElfaHair.png",
        "mouth": "Mouth/Basic/Smirk.png",
        "eyebrows": "Eyebrows/Basic/Eyebrows2.png",
    },
    "Demon": {
        "body": "Body/Demon/Demon1.png",
        "head": "Head/Demon/DemonHead1.png",
        "ears": "Ears/Demon/DemonEar1.png",
        "eyes": "Eyes/Demon/DemonEyes1.png",
        "mouth": "Mouth/Demon/DemonMouth1.png",
    },
    "Devil": {
        "body": "Body/Demon/Demon2.png",
        "head": "Head/Demon/DemonHead2.png",
        "ears": "Ears/Demon/DemonEar2.png",
        "eyes": "Eyes/Demon/DemonEyes2.png",
        "mouth": "Mouth/Demon/DemonMouth2.png",
    },
    "CatMan": {
        "body": "Body/Furry/FurryBody1.png",
        "head": "Head/Furry/WolfyHead1.png",
        "ears": "Ears/Furry/WolfyEars1.png",
        "eyes": "Eyes/Furry/FurryEyes1.png",
        "mouth": "Mouth/Furry/Smirk.png",
    },
    "BearMan": {
        "body": "Body/Furry/FurryBody3.png",
        "head": "Head/Furry/WolfyHead3.png",
        "ears": "Ears/Furry/WolfyEars3.png",
        "eyes": "Eyes/Furry/FurryEyes3.png",
        "mouth": "Mouth/Furry/Normal.png",
    },
    "WolfMan": {
        "body": "Body/Furry/FurryBody2.png",
        "head": "Head/Furry/WolfyHead2.png",
        "ears": "Ears/Furry/WolfyEars2.png",
        "eyes": "Eyes/Furry/FurryEyes2.png",
        "mouth": "Mouth/Furry/Normal.png",
    },
    "MonkeyMan": {
        "body": "Body/Furry/FurryBody4.png",
        "head": "Head/Furry/WolfyHead4.png",
        "ears": "Ears/Furry/WolfyEars4.png",
        "eyes": "Eyes/Furry/FurryEyes4.png",
        "mouth": "Mouth/Furry/Smirk.png",
    },
    "Mummy": {
        "body": "Body/Mummies/MummyBody1.png",
        "head": "Head/Mummies/MummyHead1.png",
        "ears": "Ears/Mummies/MummyEar1.png",
        "eyes": "Eyes/Mummies/GlowingEyes.png",
    },
    "Skeleton": {
        "body": "Body/Skeletons/Skeleton1.png",
        "head": "Head/Skeletons/Skeleton1.png",
        "eyes": "Eyes/Skeletons/Skeleton1Eyes.png",
    },
    "Zombie": {
        "body": "Body/Zombies/ZombieBody1.png",
        "head": "Head/Zombies/ZombieHead1.png",
        "ears": "Ears/Zombies/ZombieEar1.png",
        "eyes": "Eyes/Zombies/ZombieEyes1.png",
        "mouth": "Mouth/Zombies/ZombieMouth1.png",
        "hair": "Hair/Basic/ZombieShabby.png",
    },
}

# Races that need procedural generation and their base type
GENERATED_RACES: Dict[str, str] = {
    "BugMan":     "Furry",
    "BirdMan":    "Furry",
    "Ent":        "Basic",
    "FishMan":    "Furry",
    "Ghost":      "Basic",
    "Golem":      "Basic",
    "LizardMan":  "Furry",
    "Minotaur":   "Furry",
    "Ork":        "Basic",
    "RatMan":     "Furry",
    "Robot":      "Basic",
    "SharkMan":   "Furry",
    "TurtleMan":  "Furry",
}

# Base part paths used as starting points for generation
BASE_TEMPLATES: Dict[str, Dict[str, str]] = {
    "Basic": {
        "body": "Body/Basic/Human.png",
        "head": "Head/Basic/Head.png",
        "ears": "Ears/Basic/HumanEars.png",
        "eyes": "Eyes/Basic/Male.png",
        "mouth": "Mouth/Basic/Normal.png",
        "eyebrows": "Eyebrows/Basic/Eyebrows1.png",
    },
    "Furry": {
        "body": "Body/Furry/FurryBody1.png",
        "head": "Head/Furry/WolfyHead1.png",
        "ears": "Ears/Furry/WolfyEars1.png",
        "eyes": "Eyes/Furry/FurryEyes1.png",
        "mouth": "Mouth/Furry/Normal.png",
    },
}


# ---------------------------------------------------------------------------
# Procedural part generation
# ---------------------------------------------------------------------------

def _load_base(rel_path: str) -> Image.Image:
    """Load a base body-part image from the BodyParts directory."""
    full = BODY_PARTS_DIR / rel_path
    if full.exists():
        return Image.open(full).convert("RGBA")
    # Fallback: create blank canvas at expected size
    size = BODY_SIZE if "Body" in rel_path or "Head" in rel_path else FEATURE_SIZE
    return Image.new("RGBA", (size, size), (0, 0, 0, 0))


def _draw_outline(draw: ImageDraw.ImageDraw, coords, width: int = 3):
    """Draw a shape with black outline (our art style)."""
    draw.line(coords, fill=(40, 40, 40, 255), width=width)


def _draw_poly_outline(draw: ImageDraw.ImageDraw, coords, fill=(180, 180, 180, 255),
                       outline=(40, 40, 40, 255), width: int = 2):
    """Draw a filled polygon with outline."""
    draw.polygon(coords, fill=fill, outline=outline)


def _draw_ellipse_outline(draw: ImageDraw.ImageDraw, bbox, fill=(180, 180, 180, 255),
                          outline=(40, 40, 40, 255), width: int = 2):
    """Draw a filled ellipse with outline."""
    draw.ellipse(bbox, fill=fill, outline=outline)


def generate_race_parts(race_name: str, base_type: str) -> Dict[str, str]:
    """
    Generate body-part PNGs for a race that lacks pre-made assets.
    Returns a dict of layer-name -> file path (relative to BODY_PARTS_DIR).
    """
    out_dir = GENERATED_PARTS_DIR / race_name
    out_dir.mkdir(parents=True, exist_ok=True)

    templates = BASE_TEMPLATES[base_type]
    generated: Dict[str, str] = {}

    # Helper to save and register
    def _save(layer: str, img: Image.Image):
        fname = f"{race_name}_{layer}.png"
        path = out_dir / fname
        img.save(path, "PNG")
        rel = f"Generated/{race_name}/{fname}"
        generated[layer] = rel

    # --- Body ---
    body = _load_base(templates["body"])
    body_draw = ImageDraw.Draw(body)

    # --- Head ---
    head = _load_base(templates["head"])
    head_draw = ImageDraw.Draw(head)

    # --- Eyes ---
    eyes = _load_base(templates["eyes"])
    eyes_draw = ImageDraw.Draw(eyes)

    # --- Mouth ---
    mouth = _load_base(templates.get("mouth", templates["eyes"]))
    mouth_draw = ImageDraw.Draw(mouth)

    # --- Ears ---
    ears = _load_base(templates.get("ears", templates["head"]))
    ears_draw = ImageDraw.Draw(ears)

    # Greyscale fill colours (will be tinted later)
    GREY_LIGHT = (200, 200, 200, 255)
    GREY_MID = (160, 160, 160, 255)
    GREY_DARK = (120, 120, 120, 255)
    GREY_VDARK = (80, 80, 80, 255)
    BLACK = (40, 40, 40, 255)
    WHITE_A = (220, 220, 220, 255)

    # Apply race-specific modifications
    if race_name == "BugMan":
        # Antennae on head
        cx, cy = 256, 80
        for dx in (-50, 50):
            _draw_outline(head_draw, [(cx + dx, cy + 60), (cx + dx, cy), (cx + dx + dx // 2, cy - 30)], 4)
            _draw_ellipse_outline(head_draw, [cx + dx + dx // 2 - 8, cy - 38, cx + dx + dx // 2 + 8, cy - 22],
                                  fill=GREY_LIGHT)
        # Exoskeleton segments on body
        for y in range(160, 420, 50):
            body_draw.arc([180, y, 332, y + 45], 0, 180, fill=BLACK, width=2)
        # Wing stubs
        for dx in (-1, 1):
            wing_x = 256 + dx * 140
            _draw_poly_outline(body_draw,
                               [(wing_x, 150), (wing_x + dx * 60, 120), (wing_x + dx * 50, 200), (wing_x, 190)],
                               fill=(200, 200, 200, 100))

    elif race_name == "BirdMan":
        # Beak (replace mouth area)
        mouth = Image.new("RGBA", (FEATURE_SIZE, FEATURE_SIZE), (0, 0, 0, 0))
        mouth_draw = ImageDraw.Draw(mouth)
        # Triangular beak
        _draw_poly_outline(mouth_draw, [(100, 120), (156, 140), (100, 160)], fill=GREY_LIGHT, outline=BLACK)
        _draw_outline(mouth_draw, [(110, 138), (150, 140)], 2)
        # Feather crest on head
        for i in range(5):
            bx = 220 + i * 18
            _draw_poly_outline(head_draw, [(bx, 90), (bx + 8, 40 - i * 3), (bx + 16, 90)],
                               fill=GREY_MID)
        # Wing-arm shapes on body
        for dx in (-1, 1):
            wx = 256 + dx * 130
            pts = [(wx, 180), (wx + dx * 80, 150), (wx + dx * 90, 250),
                   (wx + dx * 60, 300), (wx, 280)]
            _draw_poly_outline(body_draw, pts, fill=GREY_MID)

    elif race_name == "Ent":
        # Bark texture lines on body
        for y in range(140, 440, 25):
            x_off = (y % 50) * 2
            body_draw.line([(190 + x_off, y), (310 - x_off, y + 10)], fill=(100, 100, 100, 180), width=2)
        # Leaf crown on head
        for i in range(8):
            angle = math.pi * (0.2 + i * 0.08)
            lx = int(256 + 100 * math.cos(angle))
            ly = int(100 - 40 * math.sin(angle))
            _draw_poly_outline(head_draw, [(lx, ly), (lx - 12, ly - 25), (lx + 12, ly - 25)],
                               fill=(150, 180, 150, 220))
        # Root feet
        for dx in (-60, 0, 60):
            body_draw.line([(256 + dx, 460), (256 + dx - 15, 500), (256 + dx + 15, 500)],
                           fill=BLACK, width=3)
        # Branch arms
        for dx in (-1, 1):
            bx = 256 + dx * 150
            body_draw.line([(256 + dx * 100, 200), (bx, 180), (bx + dx * 30, 160)],
                           fill=GREY_DARK, width=6)
            body_draw.line([(bx, 180), (bx + dx * 20, 150)], fill=GREY_DARK, width=4)

    elif race_name == "FishMan":
        # Dorsal fin on head
        _draw_poly_outline(head_draw, [(256, 30), (230, 100), (282, 100)], fill=GREY_MID)
        # Gill marks on head
        for side in (-1, 1):
            for i in range(3):
                gx = 256 + side * 90
                gy = 250 + i * 20
                head_draw.line([(gx - 10, gy), (gx + 10, gy)], fill=GREY_DARK, width=2)
        # Webbed hands hint on body sides
        for dx in (-1, 1):
            hx = 256 + dx * 140
            for i in range(4):
                body_draw.line([(hx, 300 + i * 8), (hx + dx * 15, 295 + i * 8)],
                               fill=GREY_MID, width=2)

    elif race_name == "Ghost":
        # Make lower body fade to transparent (wispy trail)
        for y in range(280, 512):
            alpha_factor = max(0, 1.0 - (y - 280) / 200.0)
            for x in range(512):
                r, g, b, a = body.getpixel((x, y))
                if a > 0:
                    new_a = int(a * alpha_factor)
                    # Add waviness
                    wave = int(15 * math.sin((x + y * 0.3) * 0.05))
                    new_a = max(0, min(255, new_a + wave))
                    body.putpixel((x, y), (r, g, b, new_a))
        # Refresh draw after pixel manipulation
        body_draw = ImageDraw.Draw(body)
        # No ears/mouth for ghost
        ears = Image.new("RGBA", (FEATURE_SIZE, FEATURE_SIZE), (0, 0, 0, 0))
        mouth = Image.new("RGBA", (FEATURE_SIZE, FEATURE_SIZE), (0, 0, 0, 0))
        ears_draw = ImageDraw.Draw(ears)
        mouth_draw = ImageDraw.Draw(mouth)
        # Glowing eyes
        eyes = Image.new("RGBA", (FEATURE_SIZE, FEATURE_SIZE), (0, 0, 0, 0))
        eyes_draw = ImageDraw.Draw(eyes)
        _draw_ellipse_outline(eyes_draw, [85, 110, 115, 140], fill=(230, 230, 255, 220), outline=BLACK)
        _draw_ellipse_outline(eyes_draw, [141, 110, 171, 140], fill=(230, 230, 255, 220), outline=BLACK)

    elif race_name == "Golem":
        # Blocky angular shape — draw cracks on body
        for _ in range(12):
            cx = 180 + int(150 * (hash(f"golem_crack_{_}") % 1000) / 1000)
            cy = 150 + int(300 * (hash(f"golem_cracky_{_}") % 1000) / 1000)
            body_draw.line([(cx, cy), (cx + 20, cy + 15), (cx + 10, cy + 30)],
                           fill=GREY_DARK, width=2)
        # Angular plates on body
        body_draw.rectangle([200, 180, 312, 280], outline=BLACK, width=3)
        body_draw.rectangle([210, 290, 302, 380], outline=BLACK, width=3)
        # Rune marks
        for (rx, ry) in [(230, 210), (270, 210), (250, 320)]:
            body_draw.ellipse([rx - 6, ry - 6, rx + 6, ry + 6], outline=GREY_LIGHT, width=2)
            body_draw.line([(rx, ry - 6), (rx, ry + 6)], fill=GREY_LIGHT, width=1)
        # Blocky head modifications
        head_draw.rectangle([190, 130, 322, 340], outline=BLACK, width=3)
        # No ears, no hair
        ears = Image.new("RGBA", (FEATURE_SIZE, FEATURE_SIZE), (0, 0, 0, 0))
        ears_draw = ImageDraw.Draw(ears)

    elif race_name == "LizardMan":
        # Spine ridge on head
        for i in range(6):
            sx = 240 + i * 8
            sy = 60 + i * 5
            _draw_poly_outline(head_draw, [(sx, sy), (sx + 4, sy - 15), (sx + 8, sy)], fill=GREY_MID)
        # Scale pattern on body
        for row in range(8):
            for col in range(5):
                scx = 195 + col * 28 + (row % 2) * 14
                scy = 160 + row * 35
                body_draw.arc([scx, scy, scx + 22, scy + 18], 0, 180, fill=GREY_DARK, width=1)
        # Thick tail
        tail_pts = [(310, 400), (340, 420), (380, 430), (400, 450), (390, 460),
                    (360, 450), (330, 440), (300, 420)]
        _draw_poly_outline(body_draw, tail_pts, fill=GREY_MID)

    elif race_name == "Minotaur":
        # Large curved horns
        for dx in (-1, 1):
            hx = 256 + dx * 70
            pts = [(hx, 110), (hx + dx * 40, 70), (hx + dx * 60, 40), (hx + dx * 50, 30)]
            head_draw.line(pts, fill=GREY_DARK, width=8)
            head_draw.line(pts, fill=BLACK, width=2)  # outline
        # Broad snout
        _draw_ellipse_outline(mouth_draw, [95, 115, 161, 160], fill=GREY_MID)
        mouth_draw.ellipse([110, 130, 120, 140], fill=BLACK)
        mouth_draw.ellipse([136, 130, 146, 140], fill=BLACK)
        # Make body bulkier — draw extra mass
        body_draw.ellipse([160, 150, 352, 420], fill=GREY_LIGHT, outline=BLACK, width=2)
        # Hooves at bottom
        for dx in (-50, 50):
            body_draw.rectangle([240 + dx - 20, 460, 240 + dx + 20, 500],
                                fill=GREY_DARK, outline=BLACK, width=2)

    elif race_name == "Ork":
        # Broader body
        body_draw.ellipse([155, 155, 357, 430], fill=GREY_LIGHT, outline=BLACK, width=2)
        # Tusks on mouth
        for dx in (-20, 20):
            mx = 128 + dx
            _draw_poly_outline(mouth_draw, [(mx, 140), (mx - 5, 160), (mx + 5, 160)],
                               fill=WHITE_A, outline=BLACK)
        # Underbite jaw
        mouth_draw.arc([90, 130, 166, 170], 0, 180, fill=BLACK, width=3)
        # Heavier brow on head
        head_draw.rectangle([195, 185, 317, 200], fill=GREY_DARK, outline=BLACK, width=2)

    elif race_name == "RatMan":
        # Large round ears
        ears = Image.new("RGBA", (FEATURE_SIZE, FEATURE_SIZE), (0, 0, 0, 0))
        ears_draw = ImageDraw.Draw(ears)
        _draw_ellipse_outline(ears_draw, [30, 50, 90, 120], fill=GREY_LIGHT)
        _draw_ellipse_outline(ears_draw, [166, 50, 226, 120], fill=GREY_LIGHT)
        # Whiskers on head
        for side in (-1, 1):
            wx = 256 + side * 100
            for i in range(3):
                wy = 260 + i * 15
                head_draw.line([(wx, wy), (wx + side * 60, wy - 10 + i * 10)],
                               fill=BLACK, width=1)
        # Buck teeth on mouth
        for dx in (-6, 6):
            mouth_draw.rectangle([128 + dx - 5, 125, 128 + dx + 5, 145],
                                 fill=WHITE_A, outline=BLACK, width=1)
        # Thin tail on body
        tail_pts = [(310, 420), (350, 440), (390, 460), (420, 470), (430, 465)]
        body_draw.line(tail_pts, fill=GREY_MID, width=3)
        body_draw.line(tail_pts, fill=BLACK, width=1)

    elif race_name == "Robot":
        # Angular plates on body
        body_draw.rectangle([190, 155, 322, 290], fill=GREY_MID, outline=BLACK, width=3)
        body_draw.rectangle([200, 300, 312, 420], fill=GREY_MID, outline=BLACK, width=3)
        # Rivets
        for (rx, ry) in [(200, 165), (312, 165), (200, 280), (312, 280),
                         (210, 310), (302, 310), (210, 410), (302, 410)]:
            body_draw.ellipse([rx - 4, ry - 4, rx + 4, ry + 4], fill=GREY_DARK, outline=BLACK)
        # Antenna on head
        head_draw.line([(256, 100), (256, 50)], fill=BLACK, width=3)
        _draw_ellipse_outline(head_draw, [249, 40, 263, 54], fill=GREY_LIGHT)
        # Visor eyes
        eyes = Image.new("RGBA", (FEATURE_SIZE, FEATURE_SIZE), (0, 0, 0, 0))
        eyes_draw = ImageDraw.Draw(eyes)
        eyes_draw.rectangle([70, 115, 186, 140], fill=(180, 220, 220, 255), outline=BLACK, width=2)
        eyes_draw.line([(128, 115), (128, 140)], fill=BLACK, width=2)
        # Angular head
        head_draw.rectangle([185, 120, 327, 340], outline=BLACK, width=3)
        # No ears
        ears = Image.new("RGBA", (FEATURE_SIZE, FEATURE_SIZE), (0, 0, 0, 0))
        ears_draw = ImageDraw.Draw(ears)

    elif race_name == "SharkMan":
        # Dorsal fin on head
        _draw_poly_outline(head_draw, [(256, 40), (235, 110), (277, 110)], fill=GREY_MID)
        # Gill slits on head
        for side in (-1, 1):
            for i in range(3):
                gx = 256 + side * 95
                gy = 250 + i * 18
                head_draw.line([(gx - 12, gy), (gx + 12, gy)], fill=GREY_DARK, width=2)
        # Wide jaw with teeth on mouth
        mouth_draw.arc([75, 110, 181, 170], 0, 180, fill=BLACK, width=3)
        for i in range(8):
            tx = 85 + i * 13
            _draw_poly_outline(mouth_draw, [(tx, 148), (tx + 5, 158), (tx + 10, 148)],
                               fill=WHITE_A, outline=BLACK)

    elif race_name == "TurtleMan":
        # Shell dome on back (drawn on body layer)
        body_draw.ellipse([170, 160, 342, 400], fill=GREY_MID, outline=BLACK, width=3)
        # Shell segments
        body_draw.line([(256, 170), (256, 390)], fill=BLACK, width=2)
        for y in (230, 290, 350):
            body_draw.line([(185, y), (327, y)], fill=BLACK, width=2)
        # Make body bulkier
        body_draw.ellipse([175, 155, 337, 420], outline=BLACK, width=2)
        # Beak snout on mouth
        mouth = Image.new("RGBA", (FEATURE_SIZE, FEATURE_SIZE), (0, 0, 0, 0))
        mouth_draw = ImageDraw.Draw(mouth)
        _draw_poly_outline(mouth_draw, [(108, 125), (148, 135), (108, 150)], fill=GREY_LIGHT, outline=BLACK)
        # Hooves
        for dx in (-50, 50):
            body_draw.ellipse([240 + dx - 18, 460, 240 + dx + 18, 495],
                              fill=GREY_DARK, outline=BLACK, width=2)

    # Normalize feature parts to 256x256 if they inherited 512x512 from base
    for feature_img_ref, name in [(eyes, "eyes_ref"), (mouth, "mouth_ref"), (ears, "ears_ref")]:
        pass  # handled below

    if eyes.size[0] > FEATURE_SIZE:
        eyes = eyes.resize((FEATURE_SIZE, FEATURE_SIZE), Image.LANCZOS)
    if mouth.size[0] > FEATURE_SIZE:
        mouth = mouth.resize((FEATURE_SIZE, FEATURE_SIZE), Image.LANCZOS)
    if ears.size[0] > FEATURE_SIZE:
        ears = ears.resize((FEATURE_SIZE, FEATURE_SIZE), Image.LANCZOS)

    # Save all generated parts
    _save("body", body)
    _save("head", head)
    _save("eyes", eyes)
    _save("mouth", mouth)
    _save("ears", ears)

    return generated


# ---------------------------------------------------------------------------
# Image processing utilities
# ---------------------------------------------------------------------------

def tint_image(img: Image.Image, tint_color: Tuple[int, int, int]) -> Image.Image:
    """
    Tint a greyscale+alpha image with the given colour.
    Preserves luminance variation: dark outlines stay dark, light fills get tinted.
    """
    img = img.convert("RGBA")
    r_t, g_t, b_t = tint_color
    pixels = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            # Use luminance of the original pixel as intensity
            lum = (r + g + b) / (3 * 255.0)
            # Very dark pixels (outlines) stay dark
            if lum < 0.2:
                continue
            # Blend: lerp from original towards tinted, proportional to luminance
            blend = min(1.0, lum * 1.2)
            nr = int(r * (1 - blend) + r_t * lum * blend)
            ng = int(g * (1 - blend) + g_t * lum * blend)
            nb = int(b * (1 - blend) + b_t * lum * blend)
            pixels[x, y] = (min(255, nr), min(255, ng), min(255, nb), a)
    return img


def tint_image_fast(img: Image.Image, tint_color: Tuple[int, int, int]) -> Image.Image:
    """
    Fast tinting using PIL channel operations instead of per-pixel loops.
    Preserves black outlines, tints grey areas.
    """
    img = img.convert("RGBA")
    r_ch, g_ch, b_ch, a_ch = img.split()

    # Create luminance mask (average of RGB)
    lum = ImageChops.add(ImageChops.add(r_ch, g_ch), b_ch)
    # lum is roughly 3x too bright, but we use it as relative intensity

    r_t, g_t, b_t = tint_color

    # For each channel: new = original * (1-blend) + tint * luminance * blend
    # Simplified: multiply original by tint ratio
    def _tint_channel(ch: Image.Image, tint_val: int) -> Image.Image:
        # Scale factor: tint_val / 192 (midpoint grey)
        factor = tint_val / 192.0
        factor = max(0.3, min(2.0, factor))
        return ch.point(lambda p: min(255, max(0, int(p * factor))) if p > 50 else p)

    new_r = _tint_channel(r_ch, r_t)
    new_g = _tint_channel(g_ch, g_t)
    new_b = _tint_channel(b_ch, b_t)

    return Image.merge("RGBA", (new_r, new_g, new_b, a_ch))


def apply_skin_override(img: Image.Image, skin_color: Tuple[int, int, int]) -> Image.Image:
    """Replace all non-outline pixels with skin_color, preserving luminance variation."""
    return tint_image_fast(img, skin_color)


def composite_layers(layers: Dict[str, Optional[Image.Image]], canvas_size: int) -> Image.Image:
    """
    Composite body-part layers onto a single canvas.
    Body/head are 512x512 source; features are 256x256 source.
    All are centred on a working 512x512 canvas before final resize.
    """
    working = Image.new("RGBA", (BODY_SIZE, BODY_SIZE), (0, 0, 0, 0))

    for layer_name in LAYER_ORDER:
        layer_img = layers.get(layer_name)
        if layer_img is None:
            continue

        # Ensure RGBA
        layer_img = layer_img.convert("RGBA")

        # If the part is smaller than canvas, centre it
        if layer_img.size[0] < BODY_SIZE or layer_img.size[1] < BODY_SIZE:
            temp = Image.new("RGBA", (BODY_SIZE, BODY_SIZE), (0, 0, 0, 0))
            offset_x = (BODY_SIZE - layer_img.size[0]) // 2
            offset_y = (BODY_SIZE - layer_img.size[1]) // 2
            temp.paste(layer_img, (offset_x, offset_y), layer_img)
            layer_img = temp

        working = Image.alpha_composite(working, layer_img)

    # Resize to target
    result = working.resize((canvas_size, canvas_size), Image.LANCZOS)
    return result


def apply_stage_proportions(layers: Dict[str, Optional[Image.Image]],
                            stage: int) -> Dict[str, Optional[Image.Image]]:
    """
    Adjust head/body proportions for the evolution stage.
    Stage 1: extra chibi with huge head
    Stage 2: moderate chibi
    Stage 3: standard chibi
    """
    head_ratio = STAGE_HEAD_RATIO[stage]
    adjusted = {}

    head_layers = {"head", "eyes", "mouth", "ears", "eyebrows", "hair", "beard"}
    body_layers = {"body", "legs", "arm_back", "arm_front", "shadow", "weapon"}

    # Scale head group larger for chibier stages
    head_scale = 1.0 + (head_ratio - 0.4) * 1.5  # stage1 ~1.25, stage3 ~1.0
    head_scale = max(0.9, min(1.5, head_scale))

    # Vertical offset: push head up, body down for chibi effect
    head_offset_y = int(-30 * (head_ratio - 0.4) * 5)  # negative = up

    for layer_name, img in layers.items():
        if img is None:
            adjusted[layer_name] = None
            continue

        img = img.convert("RGBA")

        if layer_name in head_layers and stage < 3:
            # Scale head up for chibi
            new_size = int(img.size[0] * head_scale)
            scaled = img.resize((new_size, new_size), Image.LANCZOS)
            # Re-centre
            canvas = Image.new("RGBA", img.size, (0, 0, 0, 0))
            ox = (img.size[0] - new_size) // 2
            oy = (img.size[1] - new_size) // 2 + head_offset_y
            canvas.paste(scaled, (ox, oy), scaled)
            adjusted[layer_name] = canvas
        elif layer_name in body_layers and stage == 1:
            # Slightly shrink body for stage 1
            scale = 0.85
            new_size = int(img.size[0] * scale)
            scaled = img.resize((new_size, new_size), Image.LANCZOS)
            canvas = Image.new("RGBA", img.size, (0, 0, 0, 0))
            ox = (img.size[0] - new_size) // 2
            oy = (img.size[1] - new_size) // 2 + 20  # push body down
            canvas.paste(scaled, (ox, oy), scaled)
            adjusted[layer_name] = canvas
        else:
            adjusted[layer_name] = img

    return adjusted


# ---------------------------------------------------------------------------
# Assembly pipeline
# ---------------------------------------------------------------------------

def build_race_specs() -> List[RaceSpec]:
    """Build the complete list of 24 RaceSpecs."""
    all_names = [
        "BugMan", "BearMan", "BirdMan", "Demon", "Devil", "CatMan", "Elf",
        "Ent", "FishMan", "Ghost", "Golem", "Human", "LizardMan", "Minotaur",
        "MonkeyMan", "Mummy", "Ork", "RatMan", "Robot", "SharkMan",
        "Skeleton", "TurtleMan", "WolfMan", "Zombie",
    ]

    specs: List[RaceSpec] = []
    for idx, name in enumerate(all_names, 1):
        palette = PALETTES[name]
        if name in EXISTING_PARTS:
            spec = RaceSpec(
                name=name, index=idx, palette=palette,
                parts=dict(EXISTING_PARTS[name]),
                needs_generation=False,
            )
        elif name in GENERATED_RACES:
            spec = RaceSpec(
                name=name, index=idx, palette=palette,
                base_type=GENERATED_RACES[name],
                needs_generation=True,
            )
        else:
            # Should not happen
            spec = RaceSpec(name=name, index=idx, palette=palette, needs_generation=True, base_type="Basic")
        specs.append(spec)

    return specs


def save_race_mapping(specs: List[RaceSpec]):
    """Save the race -> body-part mapping as JSON for external tools."""
    mapping = {}
    for spec in specs:
        mapping[spec.name] = {
            "index": spec.index,
            "parts": spec.parts,
            "generated": spec.needs_generation,
        }
    MAPPING_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(MAPPING_PATH, "w") as f:
        json.dump(mapping, f, indent=2)
    print(f"  Saved race mapping to {MAPPING_PATH}")


def assemble_race(spec: RaceSpec) -> List[str]:
    """
    Assemble all 3 evolution stages for a single race.
    Returns list of output file paths created.
    """
    created: List[str] = []
    palette = spec.palette

    # Determine tint colours
    accent_rgb = hex_to_rgb(palette.accent)
    hair_rgb = hex_to_rgb(palette.hair) if palette.hair != "#808080" else accent_rgb
    eye_rgb = hex_to_rgb(palette.eye) if palette.eye != "#808080" else accent_rgb
    skin_rgb = hex_to_rgb(palette.skin_override) if palette.skin_override else None

    # Load body parts
    raw_layers: Dict[str, Optional[Image.Image]] = {}
    parts = spec.parts

    for layer_name in LAYER_ORDER:
        rel_path = parts.get(layer_name)
        if rel_path is None:
            raw_layers[layer_name] = None
            continue
        full_path = BODY_PARTS_DIR / rel_path
        if full_path.exists():
            raw_layers[layer_name] = Image.open(full_path).convert("RGBA")
        else:
            print(f"    WARNING: Missing asset {full_path}")
            raw_layers[layer_name] = None

    # Apply colour tinting
    tinted_layers: Dict[str, Optional[Image.Image]] = {}
    skin_layers = {"body", "head", "ears", "legs", "arm_back", "arm_front"}
    hair_layers = {"hair", "beard", "eyebrows"}
    eye_layers = {"eyes"}

    for layer_name, img in raw_layers.items():
        if img is None:
            tinted_layers[layer_name] = None
            continue

        if layer_name in skin_layers:
            if skin_rgb:
                tinted_layers[layer_name] = tint_image_fast(img, skin_rgb)
            else:
                tinted_layers[layer_name] = tint_image_fast(img, accent_rgb)
        elif layer_name in hair_layers:
            tinted_layers[layer_name] = tint_image_fast(img, hair_rgb)
        elif layer_name in eye_layers:
            tinted_layers[layer_name] = tint_image_fast(img, eye_rgb)
        else:
            # mouth, shadow, weapon — light tint or keep as-is
            tinted_layers[layer_name] = tint_image_fast(img, accent_rgb)

    # Output directory
    race_dir = OUTPUT_DIR / spec.name
    race_dir.mkdir(parents=True, exist_ok=True)

    # Generate 3 stages
    for stage in (1, 2, 3):
        target_size = STAGE_SIZES[stage]

        # Apply stage proportions
        stage_layers = apply_stage_proportions(tinted_layers, stage)

        # Composite
        result = composite_layers(stage_layers, target_size)

        # Save
        filename = f"{spec.name}_S{stage}_Idle.png"
        out_path = race_dir / filename
        result.save(out_path, "PNG")
        created.append(str(out_path))

    return created


def main():
    print("=" * 60)
    print("  Sprite Wars — Sprite Assembly Pipeline")
    print("=" * 60)
    start_time = time.time()

    # Verify source directory
    if not BODY_PARTS_DIR.exists():
        sys.exit(f"ERROR: Body parts directory not found: {BODY_PARTS_DIR}")

    # Create output directories
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    GENERATED_PARTS_DIR.mkdir(parents=True, exist_ok=True)

    # Build race specs
    print("\n[1/5] Building race specifications...")
    specs = build_race_specs()
    print(f"  Defined {len(specs)} races")

    # Generate missing parts
    print("\n[2/5] Generating body parts for missing races...")
    gen_count = 0
    for spec in specs:
        if spec.needs_generation:
            print(f"  Generating parts for {spec.name} (base: {spec.base_type})...")
            generated_parts = generate_race_parts(spec.name, spec.base_type)
            spec.parts = generated_parts
            gen_count += 1
    print(f"  Generated parts for {gen_count} races")

    # Save mapping
    print("\n[3/5] Saving race body-part mapping...")
    save_race_mapping(specs)

    # Assemble all sprites
    print("\n[4/5] Assembling sprites...")
    total_created: List[str] = []
    for spec in specs:
        print(f"  Assembling {spec.name} (race #{spec.index})...")
        files = assemble_race(spec)
        total_created.extend(files)
        for f in files:
            print(f"    -> {Path(f).name}")

    # Report
    elapsed = time.time() - start_time
    print("\n[5/5] Assembly Report")
    print("-" * 40)
    print(f"  Races processed:    {len(specs)}")
    print(f"  Sprites created:    {len(total_created)}")
    print(f"  Expected:           72 (24 x 3)")
    print(f"  Output directory:   {OUTPUT_DIR}")
    print(f"  Generated parts:    {GENERATED_PARTS_DIR}")
    print(f"  Mapping file:       {MAPPING_PATH}")
    print(f"  Time elapsed:       {elapsed:.1f}s")
    print()

    if len(total_created) == 72:
        print("  STATUS: ALL 72 SPRITES CREATED SUCCESSFULLY")
    else:
        print(f"  STATUS: {len(total_created)}/72 sprites created")
        missing = set()
        for spec in specs:
            for stage in (1, 2, 3):
                fname = f"{spec.name}_S{stage}_Idle.png"
                expected = OUTPUT_DIR / spec.name / fname
                if str(expected) not in total_created:
                    missing.add(fname)
        if missing:
            print(f"  Missing: {', '.join(sorted(missing))}")

    print("\n" + "=" * 60)
    print("  Pipeline complete.")
    print("=" * 60)

    # Write summary report file
    report_path = OUTPUT_DIR / "_assembly_report.txt"
    with open(report_path, "w") as f:
        f.write("Sprite Assembly Report\n")
        f.write(f"Generated: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Races: {len(specs)}\n")
        f.write(f"Sprites: {len(total_created)}\n\n")
        for path in sorted(total_created):
            f.write(f"  {path}\n")
    print(f"\n  Report saved to {report_path}")


if __name__ == "__main__":
    main()
