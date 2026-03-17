#!/usr/bin/env python3
"""Generate unique pixel-art head PNGs for 19 Sprite Wars races using Pillow."""

import os
import shutil
from PIL import Image, ImageDraw

BASE_DIR = "/home/user/sprite-wars/Sprites/Characters"
W, H = 42, 42  # Match existing Human head dimensions


def px(draw, x, y, color):
    """Draw a single pixel."""
    draw.point((x, y), fill=color)


def rect(draw, x1, y1, x2, y2, color):
    """Draw a filled rectangle."""
    draw.rectangle([x1, y1, x2, y2], fill=color)


def ellipse(draw, x1, y1, x2, y2, color):
    """Draw a filled ellipse."""
    draw.ellipse([x1, y1, x2, y2], fill=color)


def outline_ellipse(draw, x1, y1, x2, y2, fill, outline):
    """Draw an ellipse with outline."""
    draw.ellipse([x1, y1, x2, y2], fill=fill, outline=outline)


def draw_elf(img, draw):
    skin = (255, 228, 196, 255)
    skin_dark = (230, 200, 170, 255)
    outline = (80, 60, 40, 255)
    hair = (220, 190, 100, 255)
    eye_w = (255, 255, 255, 255)
    eye_g = (50, 180, 80, 255)
    lip = (200, 140, 130, 255)

    # Face - slightly angular/narrow
    ellipse(draw, 10, 8, 31, 36, skin)
    # Outline
    outline_ellipse(draw, 10, 8, 31, 36, None, outline)

    # Pointed ears - LEFT
    for i in range(6):
        px(draw, 8 - i, 16 + i, skin)
        px(draw, 8 - i, 17 + i, skin)
        px(draw, 8 - i, 15 + i, outline)
        px(draw, 8 - i, 18 + i, outline)
    # RIGHT ear
    for i in range(6):
        px(draw, 33 + i, 16 + i, skin)
        px(draw, 33 + i, 17 + i, skin)
        px(draw, 33 + i, 15 + i, outline)
        px(draw, 33 + i, 18 + i, outline)

    # Hair on top
    ellipse(draw, 10, 4, 31, 16, hair)
    # Hair outline
    outline_ellipse(draw, 10, 4, 31, 16, None, outline)

    # Eyes - almond shaped
    rect(draw, 14, 19, 18, 22, eye_w)
    rect(draw, 16, 20, 17, 21, eye_g)
    rect(draw, 23, 19, 27, 22, eye_w)
    rect(draw, 25, 20, 26, 21, eye_g)

    # Eyebrows - angular
    for i in range(6):
        px(draw, 13 + i, 17, outline)
        px(draw, 23 + i, 17, outline)

    # Nose
    px(draw, 20, 25, skin_dark)
    px(draw, 21, 25, skin_dark)
    px(draw, 20, 26, outline)

    # Mouth
    rect(draw, 17, 30, 24, 30, lip)


def draw_demon(img, draw):
    skin = (160, 30, 30, 255)
    skin_dark = (120, 20, 20, 255)
    outline = (60, 10, 10, 255)
    horn = (40, 40, 40, 255)
    horn_tip = (80, 80, 80, 255)
    eye_glow = (255, 200, 0, 255)
    eye_bright = (255, 255, 100, 255)

    # Face
    ellipse(draw, 9, 10, 32, 38, skin)
    outline_ellipse(draw, 9, 10, 32, 38, None, outline)

    # Horns - LEFT
    for i in range(8):
        c = horn if i < 5 else horn_tip
        rect(draw, 10 - i, 10 - i, 13 - i, 12 - i, c)
    # RIGHT horn
    for i in range(8):
        c = horn if i < 5 else horn_tip
        rect(draw, 28 + i, 10 - i, 31 + i, 12 - i, c)

    # Glowing eyes
    rect(draw, 14, 20, 18, 24, eye_glow)
    rect(draw, 15, 21, 17, 23, eye_bright)
    rect(draw, 23, 20, 27, 24, eye_glow)
    rect(draw, 24, 21, 26, 23, eye_bright)

    # Brow ridge
    rect(draw, 13, 18, 19, 19, skin_dark)
    rect(draw, 22, 18, 28, 19, skin_dark)

    # Nose
    rect(draw, 19, 27, 22, 28, skin_dark)

    # Mouth - fangs
    rect(draw, 15, 32, 26, 33, outline)
    px(draw, 17, 34, (255, 255, 255, 255))
    px(draw, 24, 34, (255, 255, 255, 255))


def draw_bearman(img, draw):
    fur = (139, 90, 43, 255)
    fur_dark = (100, 65, 30, 255)
    fur_light = (170, 120, 70, 255)
    outline = (60, 35, 15, 255)
    snout = (180, 140, 100, 255)
    nose = (30, 20, 10, 255)
    eye = (20, 15, 10, 255)

    # Broad head
    ellipse(draw, 5, 8, 36, 38, fur)
    outline_ellipse(draw, 5, 8, 36, 38, None, outline)

    # Round ears
    ellipse(draw, 4, 4, 14, 14, fur)
    ellipse(draw, 6, 6, 12, 12, fur_light)
    ellipse(draw, 27, 4, 37, 14, fur)
    ellipse(draw, 29, 6, 35, 12, fur_light)
    # Ear outlines
    outline_ellipse(draw, 4, 4, 14, 14, None, outline)
    outline_ellipse(draw, 27, 4, 37, 14, None, outline)

    # Snout area
    ellipse(draw, 14, 24, 27, 36, snout)

    # Nose
    ellipse(draw, 18, 25, 23, 29, nose)

    # Eyes - small and dark
    ellipse(draw, 12, 18, 16, 22, eye)
    ellipse(draw, 25, 18, 29, 22, eye)
    # Eye shine
    px(draw, 13, 19, (255, 255, 255, 255))
    px(draw, 26, 19, (255, 255, 255, 255))

    # Mouth line
    rect(draw, 18, 32, 23, 32, fur_dark)


def draw_wolfman(img, draw):
    fur = (140, 140, 150, 255)
    fur_dark = (100, 100, 110, 255)
    fur_light = (180, 180, 190, 255)
    outline = (50, 50, 55, 255)
    nose = (30, 20, 20, 255)
    eye = (200, 180, 50, 255)  # Yellow wolf eyes

    # Head - slightly elongated
    ellipse(draw, 8, 10, 33, 38, fur)
    outline_ellipse(draw, 8, 10, 33, 38, None, outline)

    # Pointed ears - LEFT
    for i in range(8):
        w = max(1, 4 - i // 2)
        rect(draw, 10 - w // 2, 10 - i, 10 + w // 2, 10 - i, fur)
    for i in range(8):
        px(draw, 10 - max(1, 4 - i // 2) // 2 - 1, 10 - i, outline)
        px(draw, 10 + max(1, 4 - i // 2) // 2 + 1, 10 - i, outline)

    # RIGHT ear
    for i in range(8):
        w = max(1, 4 - i // 2)
        rect(draw, 31 - w // 2, 10 - i, 31 + w // 2, 10 - i, fur)
    for i in range(8):
        px(draw, 31 - max(1, 4 - i // 2) // 2 - 1, 10 - i, outline)
        px(draw, 31 + max(1, 4 - i // 2) // 2 + 1, 10 - i, outline)

    # Snout - elongated forward
    ellipse(draw, 14, 25, 27, 38, fur_light)
    outline_ellipse(draw, 14, 25, 27, 38, None, outline)

    # Nose
    ellipse(draw, 18, 26, 23, 30, nose)

    # Eyes - fierce yellow
    rect(draw, 12, 18, 17, 22, eye)
    rect(draw, 14, 19, 15, 21, (30, 30, 30, 255))
    rect(draw, 24, 18, 29, 22, eye)
    rect(draw, 26, 19, 27, 21, (30, 30, 30, 255))

    # Mouth with teeth
    rect(draw, 16, 34, 25, 35, outline)
    px(draw, 18, 36, (255, 255, 255, 255))
    px(draw, 20, 36, (255, 255, 255, 255))
    px(draw, 23, 36, (255, 255, 255, 255))


def draw_monkeyman(img, draw):
    fur = (150, 100, 50, 255)
    fur_dark = (120, 75, 35, 255)
    skin = (220, 180, 140, 255)
    outline = (60, 40, 20, 255)
    eye = (50, 30, 15, 255)

    # Round head
    ellipse(draw, 8, 8, 33, 36, fur)
    outline_ellipse(draw, 8, 8, 33, 36, None, outline)

    # Face area - lighter skin
    ellipse(draw, 12, 14, 29, 34, skin)

    # Small ears on sides
    ellipse(draw, 4, 16, 10, 24, skin)
    outline_ellipse(draw, 4, 16, 10, 24, None, outline)
    ellipse(draw, 31, 16, 37, 24, skin)
    outline_ellipse(draw, 31, 16, 37, 24, None, outline)

    # Large eyes
    ellipse(draw, 13, 17, 19, 24, (255, 255, 255, 255))
    ellipse(draw, 15, 19, 18, 23, eye)
    px(draw, 16, 19, (255, 255, 255, 255))

    ellipse(draw, 22, 17, 28, 24, (255, 255, 255, 255))
    ellipse(draw, 24, 19, 27, 23, eye)
    px(draw, 25, 19, (255, 255, 255, 255))

    # Nose - wide nostrils
    px(draw, 18, 26, outline)
    px(draw, 23, 26, outline)

    # Mouth
    ellipse(draw, 16, 28, 25, 33, skin)
    rect(draw, 17, 30, 24, 31, outline)

    # Tuft of hair on top
    for i in range(5):
        rect(draw, 18 + i, 6 + abs(i - 2), 19 + i, 10, fur_dark)


def draw_bugman(img, draw):
    shell = (40, 100, 40, 255)
    shell_dark = (30, 70, 30, 255)
    shell_light = (60, 140, 60, 255)
    outline = (20, 50, 20, 255)
    eye_red = (200, 50, 50, 255)
    eye_bright = (255, 100, 100, 255)
    antenna = (50, 80, 50, 255)

    # Head - somewhat angular
    ellipse(draw, 8, 12, 33, 38, shell)
    outline_ellipse(draw, 8, 12, 33, 38, None, outline)

    # Exoskeleton ridge
    rect(draw, 18, 10, 23, 14, shell_dark)
    rect(draw, 16, 12, 25, 16, shell_dark)

    # Compound eyes - large, bulging
    ellipse(draw, 7, 16, 18, 28, eye_red)
    outline_ellipse(draw, 7, 16, 18, 28, None, outline)
    ellipse(draw, 10, 19, 15, 25, eye_bright)
    # Grid pattern on compound eye
    for i in range(9, 17, 2):
        for j in range(18, 27, 2):
            px(draw, i, j, (180, 40, 40, 255))

    ellipse(draw, 23, 16, 34, 28, eye_red)
    outline_ellipse(draw, 23, 16, 34, 28, None, outline)
    ellipse(draw, 26, 19, 31, 25, eye_bright)
    for i in range(24, 33, 2):
        for j in range(18, 27, 2):
            px(draw, i, j, (180, 40, 40, 255))

    # Mandibles
    rect(draw, 14, 32, 17, 38, shell_dark)
    rect(draw, 24, 32, 27, 38, shell_dark)
    outline_ellipse(draw, 13, 31, 18, 39, None, outline)
    outline_ellipse(draw, 23, 31, 28, 39, None, outline)

    # Antennae
    for i in range(8):
        px(draw, 14 - i // 2, 12 - i, antenna)
        px(draw, 15 - i // 2, 12 - i, antenna)
        px(draw, 27 + i // 2, 12 - i, antenna)
        px(draw, 26 + i // 2, 12 - i, antenna)
    # Antenna tips
    ellipse(draw, 9, 2, 13, 6, shell_light)
    ellipse(draw, 28, 2, 32, 6, shell_light)


def draw_birdman(img, draw):
    feather = (180, 130, 60, 255)
    feather_dark = (140, 100, 40, 255)
    feather_light = (220, 180, 100, 255)
    outline = (80, 55, 20, 255)
    beak = (255, 180, 30, 255)
    beak_dark = (220, 140, 20, 255)
    eye = (30, 30, 30, 255)

    # Head - round
    ellipse(draw, 8, 8, 33, 34, feather)
    outline_ellipse(draw, 8, 8, 33, 34, None, outline)

    # Feather tuft on top
    for i in range(5):
        x = 17 + i * 2
        rect(draw, x, 4 - i % 3, x + 1, 10, feather_dark)

    # Eye circles - white ring around
    ellipse(draw, 11, 15, 19, 23, (255, 255, 255, 255))
    ellipse(draw, 14, 17, 17, 21, eye)
    px(draw, 15, 18, (255, 255, 255, 255))

    ellipse(draw, 22, 15, 30, 23, (255, 255, 255, 255))
    ellipse(draw, 25, 17, 28, 21, eye)
    px(draw, 26, 18, (255, 255, 255, 255))

    # Beak - triangular pointing down
    # Upper beak
    for i in range(6):
        w = 5 - i // 2
        rect(draw, 20 - w, 25 + i, 21 + w, 25 + i, beak)
    # Lower beak
    for i in range(4):
        w = 4 - i
        rect(draw, 20 - w, 28 + i, 21 + w, 28 + i, beak_dark)
    # Beak outline
    for i in range(6):
        w = 5 - i // 2
        px(draw, 20 - w - 1, 25 + i, outline)
        px(draw, 21 + w + 1, 25 + i, outline)

    # Nostril dots on beak
    px(draw, 19, 27, outline)
    px(draw, 22, 27, outline)


def draw_ent(img, draw):
    bark = (110, 75, 40, 255)
    bark_dark = (80, 50, 25, 255)
    bark_light = (140, 100, 55, 255)
    outline = (50, 30, 15, 255)
    leaf = (60, 150, 40, 255)
    leaf_dark = (40, 110, 30, 255)
    eye_glow = (200, 220, 100, 255)

    # Head - rough, bark-textured rectangle-ish
    rect(draw, 8, 12, 33, 38, bark)
    # Rough edges
    for y in range(12, 38):
        off = (y * 7 + 3) % 3
        px(draw, 8 - off, y, bark_dark)
        px(draw, 33 + off, y, bark_dark)

    # Bark texture - wood grain lines
    for y in range(14, 36, 3):
        for x in range(10, 32, 2):
            if (x + y) % 5 < 2:
                px(draw, x, y, bark_dark)
            elif (x + y) % 7 < 1:
                px(draw, x, y, bark_light)

    # Outline
    rect(draw, 7, 12, 7, 38, outline)
    rect(draw, 34, 12, 34, 38, outline)
    rect(draw, 7, 12, 34, 12, outline)
    rect(draw, 7, 38, 34, 38, outline)

    # Leaf crown on top
    for i in range(7):
        x = 8 + i * 4
        ellipse(draw, x - 2, 6 - (i % 3) * 2, x + 4, 14, leaf)
    for i in range(5):
        x = 10 + i * 5
        ellipse(draw, x - 1, 3 - (i % 2) * 3, x + 3, 10, leaf_dark)

    # Hollow eyes - glowing
    rect(draw, 13, 20, 18, 26, outline)
    rect(draw, 14, 21, 17, 25, eye_glow)

    rect(draw, 23, 20, 28, 26, outline)
    rect(draw, 24, 21, 27, 25, eye_glow)

    # Mouth - knot hole
    ellipse(draw, 17, 30, 24, 36, outline)
    ellipse(draw, 18, 31, 23, 35, bark_dark)


def draw_fishman(img, draw):
    scales = (50, 140, 160, 255)
    scales_dark = (30, 100, 120, 255)
    scales_light = (80, 180, 200, 255)
    outline = (20, 60, 80, 255)
    belly = (150, 200, 210, 255)
    eye = (220, 220, 50, 255)
    fin = (40, 120, 140, 255)

    # Head
    ellipse(draw, 8, 10, 33, 38, scales)
    outline_ellipse(draw, 8, 10, 33, 38, None, outline)

    # Scale pattern
    for y in range(12, 36, 3):
        for x in range(10, 32, 4):
            off = 2 if (y // 3) % 2 else 0
            px(draw, x + off, y, scales_dark)
            px(draw, x + off + 1, y + 1, scales_light)

    # Belly/chin area
    ellipse(draw, 14, 28, 27, 38, belly)

    # Dorsal fin on top
    for i in range(10):
        h = 8 - abs(i - 5)
        rect(draw, 16 + i, 4 - h + 8, 17 + i, 10, fin)
    for i in range(10):
        h = 8 - abs(i - 5)
        px(draw, 16 + i, 4 - h + 7, outline)

    # Large round eyes
    ellipse(draw, 10, 16, 18, 24, (255, 255, 255, 255))
    ellipse(draw, 12, 18, 16, 22, eye)
    ellipse(draw, 13, 19, 15, 21, (30, 30, 30, 255))

    ellipse(draw, 23, 16, 31, 24, (255, 255, 255, 255))
    ellipse(draw, 25, 18, 29, 22, eye)
    ellipse(draw, 26, 19, 28, 21, (30, 30, 30, 255))

    # Small mouth
    rect(draw, 18, 32, 23, 33, outline)

    # Gills
    for i in range(3):
        rect(draw, 8, 26 + i * 3, 11, 26 + i * 3, scales_dark)
        rect(draw, 30, 26 + i * 3, 33, 26 + i * 3, scales_dark)


def draw_ghost(img, draw):
    body = (200, 210, 240, 140)  # Translucent
    body_light = (230, 235, 255, 160)
    outline = (150, 160, 200, 180)
    eye_dark = (40, 30, 80, 220)
    eye_glow = (100, 120, 255, 200)

    # Ghostly head shape - wispy at bottom
    ellipse(draw, 8, 6, 33, 30, body)
    # Wispy lower part
    for x in range(8, 34):
        for y in range(28, 40):
            wave = int(2 * ((x + y) % 4 > 1))
            alpha = max(0, 140 - (y - 28) * 12 + wave * 10)
            if alpha > 20:
                px(draw, x, y + wave, (200, 210, 240, alpha))

    # Lighter face area
    ellipse(draw, 12, 10, 29, 26, body_light)

    # Hollow dark eyes
    ellipse(draw, 12, 14, 19, 22, eye_dark)
    ellipse(draw, 22, 14, 29, 22, eye_dark)
    # Eye glow
    px(draw, 15, 17, eye_glow)
    px(draw, 16, 17, eye_glow)
    px(draw, 25, 17, eye_glow)
    px(draw, 26, 17, eye_glow)

    # Mouth - open O shape
    ellipse(draw, 17, 24, 24, 30, eye_dark)
    ellipse(draw, 18, 25, 23, 29, (160, 170, 210, 100))

    # Outline - partial, ghostly
    for x in range(10, 31):
        px(draw, x, 6, outline)
    for y in range(8, 28):
        px(draw, 8, y, outline)
        px(draw, 33, y, outline)


def draw_golem(img, draw):
    stone = (140, 140, 150, 255)
    stone_dark = (100, 100, 110, 255)
    stone_light = (170, 170, 180, 255)
    outline = (60, 60, 70, 255)
    eye_glow = (50, 200, 255, 255)
    crack = (80, 80, 90, 255)

    # Blocky head shape
    rect(draw, 6, 8, 35, 38, stone)
    # Outline
    rect(draw, 5, 7, 36, 7, outline)
    rect(draw, 5, 39, 36, 39, outline)
    rect(draw, 5, 7, 5, 39, outline)
    rect(draw, 36, 7, 36, 39, outline)

    # Stone texture - blocky
    for y in range(9, 38, 4):
        off = 3 if (y // 4) % 2 else 0
        for x in range(7, 35, 6):
            rect(draw, x + off, y, x + off, y + 2, crack)
    rect(draw, 6, 20, 35, 20, crack)
    rect(draw, 6, 28, 35, 28, crack)

    # Light/dark variation
    rect(draw, 8, 9, 18, 19, stone_light)
    rect(draw, 20, 22, 34, 27, stone_dark)

    # Glowing rectangular eyes
    rect(draw, 10, 22, 17, 26, outline)
    rect(draw, 11, 23, 16, 25, eye_glow)

    rect(draw, 24, 22, 31, 26, outline)
    rect(draw, 25, 23, 30, 25, eye_glow)

    # Mouth - rectangular gap
    rect(draw, 14, 32, 27, 35, outline)
    rect(draw, 15, 33, 26, 34, stone_dark)

    # Cracks
    for i in range(6):
        px(draw, 20 + i, 10 + i, crack)
        px(draw, 21 + i, 10 + i, crack)
    for i in range(4):
        px(draw, 12, 30 + i, crack)
        px(draw, 13, 30 + i, crack)


def draw_lizardman(img, draw):
    scales = (60, 140, 50, 255)
    scales_dark = (40, 100, 35, 255)
    scales_light = (90, 180, 70, 255)
    outline = (25, 60, 20, 255)
    eye = (255, 200, 0, 255)
    eye_slit = (30, 30, 10, 255)
    belly = (140, 180, 100, 255)

    # Head - slightly elongated
    ellipse(draw, 8, 10, 33, 36, scales)
    outline_ellipse(draw, 8, 10, 33, 36, None, outline)

    # Scale pattern
    for y in range(12, 34, 3):
        for x in range(10, 32, 3):
            off = 1 if (y // 3) % 2 else 0
            px(draw, x + off, y, scales_dark)

    # Ridges on top
    for i in range(5):
        x = 14 + i * 3
        rect(draw, x, 7, x + 2, 12, scales_dark)
        px(draw, x + 1, 6, outline)

    # Reptilian eyes - with vertical slit
    ellipse(draw, 11, 17, 18, 24, eye)
    rect(draw, 14, 17, 15, 24, eye_slit)
    outline_ellipse(draw, 11, 17, 18, 24, None, outline)

    ellipse(draw, 23, 17, 30, 24, eye)
    rect(draw, 26, 17, 27, 24, eye_slit)
    outline_ellipse(draw, 23, 17, 30, 24, None, outline)

    # Snout
    ellipse(draw, 14, 26, 27, 36, belly)

    # Nostrils
    px(draw, 18, 28, outline)
    px(draw, 23, 28, outline)

    # Mouth
    rect(draw, 14, 33, 27, 34, outline)


def draw_minotaur(img, draw):
    fur = (130, 80, 40, 255)
    fur_dark = (100, 60, 30, 255)
    outline = (50, 30, 15, 255)
    horn = (220, 200, 160, 255)
    horn_dark = (180, 160, 120, 255)
    snout = (170, 130, 90, 255)
    nose_ring = (200, 180, 50, 255)
    eye = (180, 30, 30, 255)

    # Broad head
    ellipse(draw, 6, 12, 35, 38, fur)
    outline_ellipse(draw, 6, 12, 35, 38, None, outline)

    # Horns - curved outward - LEFT
    for i in range(10):
        x = 8 - i
        y = 12 - i + (i * i) // 8
        rect(draw, x - 1, y - 1, x + 1, y + 1, horn)
        px(draw, x - 2, y, outline)
    # RIGHT horn
    for i in range(10):
        x = 33 + i
        y = 12 - i + (i * i) // 8
        rect(draw, x - 1, y - 1, x + 1, y + 1, horn)
        px(draw, x + 2, y, outline)

    # Horn texture
    for i in range(10):
        x = 8 - i
        y = 12 - i + (i * i) // 8
        if i % 2 == 0:
            px(draw, x, y, horn_dark)

    for i in range(10):
        x = 33 + i
        y = 12 - i + (i * i) // 8
        if i % 2 == 0:
            px(draw, x, y, horn_dark)

    # Eyes - red, angry
    rect(draw, 12, 18, 17, 22, eye)
    px(draw, 14, 19, (255, 255, 255, 255))
    rect(draw, 24, 18, 29, 22, eye)
    px(draw, 26, 19, (255, 255, 255, 255))

    # Brow ridge
    rect(draw, 10, 16, 18, 17, fur_dark)
    rect(draw, 23, 16, 31, 17, fur_dark)

    # Broad snout
    ellipse(draw, 12, 25, 29, 37, snout)
    outline_ellipse(draw, 12, 25, 29, 37, None, outline)

    # Nostrils
    ellipse(draw, 15, 28, 19, 32, outline)
    ellipse(draw, 22, 28, 26, 32, outline)

    # Nose ring
    for i in range(5):
        px(draw, 18 + i, 33, nose_ring)
        px(draw, 18 + i, 34, nose_ring)
    px(draw, 20, 35, nose_ring)
    px(draw, 21, 35, nose_ring)


def draw_mummy(img, draw):
    bandage = (210, 195, 160, 255)
    bandage_dark = (180, 165, 130, 255)
    bandage_light = (230, 215, 180, 255)
    outline = (120, 105, 75, 255)
    eye_glow = (100, 220, 100, 255)
    eye_bright = (150, 255, 150, 255)
    shadow = (80, 70, 50, 255)

    # Head shape
    ellipse(draw, 8, 8, 33, 38, bandage)
    outline_ellipse(draw, 8, 8, 33, 38, None, outline)

    # Bandage wrap lines - horizontal
    for y in range(9, 37, 3):
        rect(draw, 9, y, 32, y, bandage_dark)
        # Slight variation
        if y % 6 == 0:
            rect(draw, 9, y + 1, 32, y + 1, bandage_light)

    # Cross wraps
    for i in range(15):
        px(draw, 12 + i, 10 + i, bandage_dark)
        px(draw, 13 + i, 10 + i, bandage_dark)
    for i in range(15):
        px(draw, 29 - i, 10 + i, bandage_dark)
        px(draw, 28 - i, 10 + i, bandage_dark)

    # Eye gaps - dark with glow
    rect(draw, 12, 18, 18, 24, shadow)
    rect(draw, 13, 19, 17, 23, (40, 35, 25, 255))
    # Glowing eyes
    rect(draw, 14, 20, 16, 22, eye_glow)
    px(draw, 15, 21, eye_bright)

    rect(draw, 23, 18, 29, 24, shadow)
    rect(draw, 24, 19, 28, 23, (40, 35, 25, 255))
    rect(draw, 25, 20, 27, 22, eye_glow)
    px(draw, 26, 21, eye_bright)

    # Mouth gap - partially wrapped
    rect(draw, 16, 30, 25, 33, shadow)
    # Bandage across mouth
    rect(draw, 14, 31, 27, 32, bandage_dark)


def draw_ork(img, draw):
    skin = (80, 140, 50, 255)
    skin_dark = (60, 110, 35, 255)
    skin_light = (100, 170, 70, 255)
    outline = (30, 60, 20, 255)
    eye_red = (220, 40, 40, 255)
    tusk = (240, 230, 200, 255)
    jaw_dark = (50, 90, 30, 255)

    # Broad head
    ellipse(draw, 5, 8, 36, 38, skin)
    outline_ellipse(draw, 5, 8, 36, 38, None, outline)

    # Heavy brow
    rect(draw, 8, 14, 33, 18, skin_dark)

    # Small angry eyes - red
    rect(draw, 12, 19, 17, 22, (255, 255, 255, 255))
    rect(draw, 14, 19, 16, 22, eye_red)
    rect(draw, 24, 19, 29, 22, (255, 255, 255, 255))
    rect(draw, 26, 19, 28, 22, eye_red)

    # Flat wide nose
    rect(draw, 17, 24, 24, 28, skin_dark)
    px(draw, 18, 27, outline)
    px(draw, 23, 27, outline)

    # Broad jaw
    rect(draw, 8, 30, 33, 36, skin_dark)
    rect(draw, 8, 30, 33, 30, outline)

    # Tusks - jutting upward from lower jaw
    rect(draw, 12, 26, 14, 32, tusk)
    rect(draw, 11, 26, 11, 30, outline)
    rect(draw, 15, 26, 15, 32, outline)

    rect(draw, 27, 26, 29, 32, tusk)
    rect(draw, 26, 26, 26, 30, outline)
    rect(draw, 30, 26, 30, 32, outline)

    # Mouth
    rect(draw, 15, 32, 26, 33, outline)

    # Small ears
    ellipse(draw, 2, 16, 7, 24, skin)
    outline_ellipse(draw, 2, 16, 7, 24, None, outline)
    ellipse(draw, 34, 16, 39, 24, skin)
    outline_ellipse(draw, 34, 16, 39, 24, None, outline)


def draw_ratman(img, draw):
    fur = (160, 155, 150, 255)
    fur_dark = (130, 125, 120, 255)
    outline = (70, 65, 60, 255)
    skin = (230, 180, 170, 255)
    nose = (240, 150, 150, 255)
    eye = (30, 20, 20, 255)
    whisker = (100, 95, 90, 255)

    # Head - narrower, ratlike
    ellipse(draw, 10, 10, 31, 36, fur)
    outline_ellipse(draw, 10, 10, 31, 36, None, outline)

    # Large round ears
    ellipse(draw, 2, 2, 14, 14, skin)
    outline_ellipse(draw, 2, 2, 14, 14, None, outline)
    ellipse(draw, 4, 4, 12, 12, (240, 190, 180, 255))

    ellipse(draw, 27, 2, 39, 14, skin)
    outline_ellipse(draw, 27, 2, 39, 14, None, outline)
    ellipse(draw, 29, 4, 37, 12, (240, 190, 180, 255))

    # Eyes - beady
    ellipse(draw, 13, 18, 18, 23, eye)
    px(draw, 14, 19, (255, 255, 255, 255))
    ellipse(draw, 23, 18, 28, 23, eye)
    px(draw, 24, 19, (255, 255, 255, 255))

    # Snout area
    ellipse(draw, 15, 24, 26, 33, fur_dark)

    # Pink nose
    ellipse(draw, 18, 25, 23, 29, nose)
    outline_ellipse(draw, 18, 25, 23, 29, None, outline)

    # Whiskers - LEFT
    for i in range(8):
        px(draw, 10 - i, 26, whisker)
        px(draw, 10 - i, 28, whisker)
        px(draw, 10 - i, 30, whisker)
    # RIGHT
    for i in range(8):
        px(draw, 31 + i, 26, whisker)
        px(draw, 31 + i, 28, whisker)
        px(draw, 31 + i, 30, whisker)

    # Teeth
    px(draw, 19, 31, (255, 255, 255, 255))
    px(draw, 22, 31, (255, 255, 255, 255))
    px(draw, 19, 32, (255, 255, 255, 255))
    px(draw, 22, 32, (255, 255, 255, 255))


def draw_robot(img, draw):
    metal = (170, 180, 200, 255)
    metal_dark = (120, 130, 150, 255)
    metal_light = (200, 210, 230, 255)
    outline = (60, 65, 80, 255)
    visor = (50, 180, 255, 255)
    visor_light = (100, 220, 255, 255)
    antenna_c = (200, 200, 50, 255)
    rivet = (80, 85, 100, 255)

    # Angular/blocky head
    rect(draw, 7, 10, 34, 38, metal)
    # Outline
    rect(draw, 6, 9, 35, 9, outline)
    rect(draw, 6, 39, 35, 39, outline)
    rect(draw, 6, 9, 6, 39, outline)
    rect(draw, 35, 9, 35, 39, outline)

    # Top panel
    rect(draw, 8, 10, 33, 14, metal_dark)
    rect(draw, 7, 14, 34, 15, outline)

    # Visor eyes - single band
    rect(draw, 10, 20, 31, 26, outline)
    rect(draw, 11, 21, 30, 25, (30, 30, 50, 255))
    # Left eye glow
    rect(draw, 13, 22, 18, 24, visor)
    px(draw, 15, 22, visor_light)
    px(draw, 16, 22, visor_light)
    # Right eye glow
    rect(draw, 23, 22, 28, 24, visor)
    px(draw, 25, 22, visor_light)
    px(draw, 26, 22, visor_light)

    # Mouth grill
    for y in range(30, 36, 2):
        rect(draw, 14, y, 27, y, metal_dark)
        rect(draw, 14, y + 1, 27, y + 1, metal_light)

    # Antenna
    rect(draw, 20, 2, 21, 9, metal_dark)
    ellipse(draw, 18, 0, 23, 5, antenna_c)
    outline_ellipse(draw, 18, 0, 23, 5, None, outline)

    # Rivets/bolts
    for pos in [(9, 11), (32, 11), (9, 36), (32, 36)]:
        px(draw, pos[0], pos[1], rivet)
        px(draw, pos[0] + 1, pos[1], rivet)

    # Side panels
    rect(draw, 7, 18, 9, 28, metal_dark)
    rect(draw, 32, 18, 34, 28, metal_dark)


def draw_sharkman(img, draw):
    skin = (110, 130, 160, 255)
    skin_dark = (80, 100, 130, 255)
    skin_light = (140, 160, 190, 255)
    outline = (40, 50, 70, 255)
    belly = (190, 200, 210, 255)
    eye = (10, 10, 15, 255)
    teeth = (255, 255, 255, 255)

    # Head - slightly angular, shark-like
    ellipse(draw, 7, 10, 34, 38, skin)
    outline_ellipse(draw, 7, 10, 34, 38, None, outline)

    # Dorsal fin on top
    for i in range(8):
        w = max(1, 4 - i)
        rect(draw, 20 - w, 4 + i, 21 + w, 4 + i, skin_dark)
    for i in range(8):
        w = max(1, 4 - i)
        px(draw, 20 - w - 1, 4 + i, outline)
        px(draw, 21 + w + 1, 4 + i, outline)

    # Belly area
    ellipse(draw, 13, 25, 28, 38, belly)

    # Black eyes - cold, beady
    ellipse(draw, 10, 17, 17, 24, eye)
    px(draw, 12, 19, (80, 80, 90, 255))
    ellipse(draw, 24, 17, 31, 24, eye)
    px(draw, 26, 19, (80, 80, 90, 255))

    # Gills
    for i in range(3):
        rect(draw, 7, 26 + i * 3, 11, 26 + i * 3, outline)
    for i in range(3):
        rect(draw, 30, 26 + i * 3, 34, 26 + i * 3, outline)

    # Wide mouth with sharp teeth
    rect(draw, 12, 32, 29, 33, outline)
    # Upper teeth
    for i in range(6):
        px(draw, 14 + i * 3, 34, teeth)
        px(draw, 14 + i * 3, 35, teeth)
    # Lower teeth
    for i in range(5):
        px(draw, 15 + i * 3, 31, teeth)

    # Nose
    px(draw, 19, 28, outline)
    px(draw, 22, 28, outline)


def draw_turtleman(img, draw):
    skin = (70, 150, 80, 255)
    skin_dark = (50, 120, 60, 255)
    outline = (30, 70, 35, 255)
    shell = (120, 90, 50, 255)
    shell_dark = (90, 65, 35, 255)
    shell_light = (150, 120, 70, 255)
    eye = (50, 40, 30, 255)
    eye_w = (255, 255, 255, 255)

    # Face - round, green
    ellipse(draw, 9, 14, 32, 38, skin)
    outline_ellipse(draw, 9, 14, 32, 38, None, outline)

    # Shell dome on top
    ellipse(draw, 6, 4, 35, 22, shell)
    outline_ellipse(draw, 6, 4, 35, 22, None, outline)

    # Shell pattern - hexagonal plates
    ellipse(draw, 14, 6, 27, 16, shell_light)
    outline_ellipse(draw, 14, 6, 27, 16, None, shell_dark)
    # Side plates
    ellipse(draw, 7, 10, 16, 20, shell_light)
    outline_ellipse(draw, 7, 10, 16, 20, None, shell_dark)
    ellipse(draw, 25, 10, 34, 20, shell_light)
    outline_ellipse(draw, 25, 10, 34, 20, None, shell_dark)

    # Gentle eyes - large, round
    ellipse(draw, 12, 20, 19, 28, eye_w)
    ellipse(draw, 14, 22, 17, 26, eye)
    px(draw, 15, 23, eye_w)

    ellipse(draw, 22, 20, 29, 28, eye_w)
    ellipse(draw, 24, 22, 27, 26, eye)
    px(draw, 25, 23, eye_w)

    # Gentle smile
    for i in range(8):
        y_off = 1 if i < 2 or i > 5 else 0
        px(draw, 16 + i, 32 + y_off, skin_dark)

    # Nostrils
    px(draw, 19, 29, outline)
    px(draw, 22, 29, outline)

    # Slight cheek color
    ellipse(draw, 10, 28, 14, 32, (100, 170, 110, 255))
    ellipse(draw, 27, 28, 31, 32, (100, 170, 110, 255))


RACE_DRAWERS = {
    "Elf": draw_elf,
    "Demon": draw_demon,
    "BearMan": draw_bearman,
    "WolfMan": draw_wolfman,
    "MonkeyMan": draw_monkeyman,
    "BugMan": draw_bugman,
    "BirdMan": draw_birdman,
    "Ent": draw_ent,
    "FishMan": draw_fishman,
    "Ghost": draw_ghost,
    "Golem": draw_golem,
    "LizardMan": draw_lizardman,
    "Minotaur": draw_minotaur,
    "Mummy": draw_mummy,
    "Ork": draw_ork,
    "RatMan": draw_ratman,
    "Robot": draw_robot,
    "SharkMan": draw_sharkman,
    "TurtleMan": draw_turtleman,
}


def main():
    for race, drawer in RACE_DRAWERS.items():
        img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        drawer(img, draw)

        parts_dir = os.path.join(BASE_DIR, race, "parts")
        os.makedirs(parts_dir, exist_ok=True)

        s3_path = os.path.join(parts_dir, f"{race}_S3_head.png")
        img.save(s3_path)
        print(f"Saved: {s3_path}")

        # Copy to S1 and S2
        for stage in ("S1", "S2"):
            stage_path = os.path.join(parts_dir, f"{race}_{stage}_head.png")
            shutil.copy2(s3_path, stage_path)
            print(f"Copied: {stage_path}")

    print(f"\nDone! Generated heads for {len(RACE_DRAWERS)} races (3 stages each = {len(RACE_DRAWERS) * 3} files).")


if __name__ == "__main__":
    main()
