#!/usr/bin/env python3
"""
Generate best-guess tile metadata JSON for every tileset in Sprites/Tiles/.
Outputs files to Web/data/tile-metadata/ for use in the Tile Admin page.

Heuristics used:
  - Directory/filename keywords map to categories and theme tags
  - Pixel transparency analysis: fully transparent tiles → 'empty'
  - Tile position within the sheet (top rows tend to be roofs/canopy,
    bottom rows tend to be floors/ground for building/nature sets)
  - Edge/border detection for wall vs interior tiles
"""

import os
import sys
import json
import re
from PIL import Image

TILE_SIZE = 16
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
TILES_DIR = os.path.join(ROOT, 'Sprites', 'Tiles')
OUTPUT_DIR = os.path.join(ROOT, 'Web', 'data', 'tile-metadata')

# ── Keyword → category mapping ──────────────────────────────────────────

DIR_CATEGORY_MAP = {
    'buildings': 'wall',
    'houses': 'wall',
    'house': 'wall',
    'interior': 'furniture',
    'water': 'water',
    'flowers': 'nature',
    'forest': 'nature',
    'trees': 'nature',
    'animatedtrees': 'nature',
    'grasslands': 'floor',
    'grounds': 'floor',
    'mountains': 'nature',
    'village': 'prop',
    'marketplace': 'prop',
    'fortress': 'wall',
    'castle': 'wall',
    'darkcastle': 'wall',
    'dungeon': 'wall',
    'magmadungeon': 'wall',
    'caves': 'wall',
    'frozencaves': 'wall',
    'cellar': 'wall',
    'abandonedmines': 'wall',
    'icons': 'prop',
    'prefabtiles': 'prop',
    'extras': 'prop',
    'animals': 'nature',
}

FILENAME_CATEGORY_MAP = {
    'ground': 'floor',
    'floor': 'floor',
    'grass': 'floor',
    'dirt': 'floor',
    'sand': 'floor',
    'wall': 'wall',
    'brick': 'wall',
    'stone': 'wall',
    'roof': 'roof',
    'door': 'door',
    'window': 'window',
    'water': 'water',
    'ocean': 'water',
    'river': 'water',
    'lava': 'water',
    'poison': 'water',
    'tree': 'nature',
    'forest': 'nature',
    'flower': 'nature',
    'bush': 'nature',
    'plant': 'nature',
    'mushroom': 'nature',
    'path': 'path',
    'road': 'path',
    'bridge': 'bridge',
    'stair': 'stairs',
    'fence': 'fence',
    'sign': 'sign',
    'chest': 'chest',
    'torch': 'prop',
    'lamp': 'prop',
    'house': 'wall',
    'cottage': 'wall',
    'castle': 'wall',
    'fortress': 'wall',
    'dungeon': 'wall',
    'cave': 'wall',
    'mine': 'wall',
    'interior': 'furniture',
    'furniture': 'furniture',
    'table': 'furniture',
    'chair': 'furniture',
    'bed': 'furniture',
    'village': 'prop',
    'market': 'prop',
    'shop': 'prop',
    'animated': 'effect',
    'animation': 'effect',
    'effect': 'effect',
    'vfx': 'effect',
    'dream': 'effect',
    'icon': 'prop',
    'mountain': 'nature',
    'cliff': 'nature',
    'rock': 'nature',
    'snow': 'floor',
    'ice': 'floor',
    'frozen': 'floor',
    'fall': 'nature',
    'spring': 'nature',
    'summer': 'nature',
    'winter': 'nature',
    'pool': 'water',
    'cellar': 'wall',
    'extra': 'prop',
}

# Theme tags from directory/filename
THEME_KEYWORDS = {
    'forest': 'forest',
    'grassland': 'grassland',
    'village': 'village',
    'castle': 'castle',
    'dungeon': 'dungeon',
    'cave': 'cave',
    'mountain': 'mountain',
    'interior': 'interior',
    'water': 'water',
    'ocean': 'ocean',
    'farm': 'farm',
    'market': 'market',
    'fortress': 'fortress',
    'mine': 'mine',
    'cellar': 'cellar',
    'magma': 'magma',
    'lava': 'magma',
    'frozen': 'frozen',
    'snow': 'frozen',
    'ice': 'frozen',
    'winter': 'winter',
    'fall': 'fall',
    'spring': 'spring',
    'summer': 'summer',
    'dream': 'dreamland',
    'rogue': 'rogue',
    'dark': 'dark',
    'poison': 'poison',
}

# Categories that are typically collidable
COLLIDABLE_CATEGORIES = {'wall', 'fence', 'chest', 'furniture', 'prop', 'sign', 'structural'}

# Categories that are ground layer
GROUND_CATEGORIES = {'floor', 'water', 'path', 'empty'}


def sanitize_filename(name):
    """Match the JS sanitizeFilename behavior."""
    return re.sub(r'[\/\\:*?"<>|.\x00]', '_', name).strip('_')


def analyze_tile_transparency(img, col, row):
    """Check if a 16x16 tile is fully transparent or mostly transparent."""
    x0 = col * TILE_SIZE
    y0 = row * TILE_SIZE
    tile = img.crop((x0, y0, x0 + TILE_SIZE, y0 + TILE_SIZE))

    if tile.mode != 'RGBA':
        tile = tile.convert('RGBA')

    pixels = list(tile.getdata())
    total = len(pixels)
    transparent_count = sum(1 for p in pixels if p[3] < 10)
    mostly_transparent = transparent_count / total > 0.95
    fully_transparent = transparent_count == total
    return fully_transparent, mostly_transparent


def infer_category_from_path(tileset_path):
    """Infer the default category from directory and filename."""
    parts = tileset_path.replace(os.sep, '/').lower().split('/')

    # Check directory names
    for part in parts[:-1]:
        clean = part.replace('_', '').replace('-', '').replace(' ', '')
        for keyword, cat in DIR_CATEGORY_MAP.items():
            if keyword in clean:
                return cat

    # Check filename
    filename_lower = parts[-1].replace('.png', '').replace('_', ' ').replace('-', ' ').lower()
    for keyword, cat in FILENAME_CATEGORY_MAP.items():
        if keyword in filename_lower:
            return cat

    return 'prop'  # Default fallback


def infer_theme_tags(tileset_path):
    """Extract theme tags from the path."""
    tags = set()
    path_lower = tileset_path.lower().replace('_', ' ').replace('-', ' ')

    for keyword, theme in THEME_KEYWORDS.items():
        if keyword in path_lower:
            tags.add(theme)

    # Add the top-level group as a tag
    parts = tileset_path.replace(os.sep, '/').split('/')
    if len(parts) > 2:
        group = parts[2].lower()
        if group not in ('extras', 'icons', 'prefabtiles'):
            tags.add(group.replace('_', '-'))

    return sorted(tags)


def make_tile_name(base_category, index, col, row, filename_stem):
    """Generate a descriptive name for a tile."""
    cat_label = base_category.replace('_', ' ').title()
    return f"{cat_label} {index}"


def refine_category_by_position(base_category, row, total_rows, col, total_cols, is_building_set):
    """Refine category based on position in the tileset for building-type sets."""
    if not is_building_set:
        return base_category

    row_pct = row / max(total_rows - 1, 1)

    if row_pct < 0.25:
        return 'roof'
    elif row_pct < 0.55:
        return 'wall'
    elif row_pct < 0.75:
        return 'door' if col < total_cols * 0.4 else 'wall'
    else:
        return 'floor'


def generate_metadata_for_tileset(tileset_path):
    """Generate full metadata JSON for one tileset."""
    abs_path = os.path.join(ROOT, tileset_path)
    filename = os.path.basename(tileset_path)
    filename_stem = os.path.splitext(filename)[0]

    try:
        img = Image.open(abs_path)
    except Exception as e:
        print(f"  ERROR: Cannot open {tileset_path}: {e}", file=sys.stderr)
        return None

    w, h = img.size
    cols = w // TILE_SIZE
    rows = h // TILE_SIZE
    total_tiles = cols * rows

    if cols == 0 or rows == 0:
        print(f"  SKIP: {tileset_path} too small ({w}x{h})", file=sys.stderr)
        return None

    base_category = infer_category_from_path(tileset_path)
    theme_tags = infer_theme_tags(tileset_path)
    is_building = base_category in ('wall', 'roof', 'door')

    # Check if the image has an alpha channel
    has_alpha = img.mode in ('RGBA', 'LA', 'PA')
    if not has_alpha:
        try:
            img = img.convert('RGBA')
            has_alpha = True
        except:
            pass

    tiles = []
    for i in range(total_tiles):
        c = i % cols
        r = i // cols

        # Check transparency
        is_empty = False
        is_mostly_transparent = False
        if has_alpha:
            is_empty, is_mostly_transparent = analyze_tile_transparency(img, c, r)

        if is_empty:
            category = 'empty'
            name = f"Empty {i}"
            description = "Fully transparent / unused tile"
            layer = 'ground'
            collidable = False
            tags = ['empty', 'transparent']
        elif is_mostly_transparent:
            category = 'decoration' if base_category not in ('nature', 'effect') else base_category
            name = f"{base_category.title()} Overlay {i}"
            description = f"Mostly transparent {base_category} element, suitable as overlay"
            layer = 'object'
            collidable = False
            tags = ['overlay', 'transparent']
        else:
            # Refine category by position for building sets
            category = refine_category_by_position(base_category, r, rows, c, cols, is_building)

            layer = 'ground' if category in GROUND_CATEGORIES else 'object'
            collidable = category in COLLIDABLE_CATEGORIES

            # Build a name
            cat_label = category.replace('_', ' ').title()
            position_desc = ''
            if rows > 2:
                row_pct = r / max(rows - 1, 1)
                if row_pct < 0.15:
                    position_desc = 'Top'
                elif row_pct > 0.85:
                    position_desc = 'Bottom'

                if cols > 2:
                    col_pct = c / max(cols - 1, 1)
                    if col_pct < 0.1:
                        position_desc += ' Left' if position_desc else 'Left'
                    elif col_pct > 0.9:
                        position_desc += ' Right' if position_desc else 'Right'

            name = f"{cat_label} {position_desc} {i}".replace('  ', ' ').strip()
            description = f"{cat_label} tile from {filename_stem}"
            if position_desc:
                description += f" ({position_desc.lower()} region)"

            tags = list(theme_tags)
            if category not in tags:
                tags.append(category)

        tile_entry = {
            'index': i,
            'name': name,
            'description': description,
            'category': category,
            'layer': layer,
            'collidable': collidable,
            'tags': tags
        }
        tiles.append(tile_entry)

    metadata = {
        'schemaVersion': '1.0.0',
        'tileset': {
            'filename': filename,
            'tileWidth': TILE_SIZE,
            'tileHeight': TILE_SIZE,
            'columns': cols,
            'rows': rows,
            'totalTiles': total_tiles,
            'themeTags': theme_tags,
            'notes': f'Auto-generated metadata for {filename}. Review and correct in Tile Admin.'
        },
        'tiles': tiles,
        'structures': []
    }

    return metadata


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Find all tilesets
    tilesets = []
    for root, dirs, files in os.walk(TILES_DIR):
        for f in sorted(files):
            if f.lower().endswith('.png'):
                full = os.path.join(root, f)
                rel = os.path.relpath(full, ROOT)
                tilesets.append(rel)

    tilesets.sort()
    print(f"Found {len(tilesets)} tilesets to process")

    generated = 0
    skipped = 0
    total_tiles = 0

    for i, ts in enumerate(tilesets):
        filename = os.path.basename(ts)
        sanitized = sanitize_filename(filename)
        out_path = os.path.join(OUTPUT_DIR, sanitized + '.json')

        sys.stdout.write(f"\r[{i+1}/{len(tilesets)}] {filename[:50]:50s}")
        sys.stdout.flush()

        metadata = generate_metadata_for_tileset(ts)
        if metadata is None:
            skipped += 1
            continue

        with open(out_path, 'w') as f:
            json.dump(metadata, f, indent=2)

        generated += 1
        total_tiles += metadata['tileset']['totalTiles']

    print(f"\n\nDone!")
    print(f"  Generated: {generated} metadata files")
    print(f"  Skipped:   {skipped}")
    print(f"  Total tiles annotated: {total_tiles}")
    print(f"  Output dir: {OUTPUT_DIR}")


if __name__ == '__main__':
    main()
