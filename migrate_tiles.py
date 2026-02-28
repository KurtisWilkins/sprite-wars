#!/usr/bin/env python3
"""
Tile Sprite Migration & Non-Image Cleanup Script
- Consolidates all tile PNGs from Tiles Sprites/ into Sprites/Tiles/
- Groups by descriptive theme names (Cavern, Forest, Overworld, etc.)
- Deletes all non-image files from the entire Sprites/ tree
- Preserves only .png, .jpg, .jpeg, .gif files
"""
import os
import shutil
import json

BASE = "/home/user/sprite-wars"
SPRITES = os.path.join(BASE, "Sprites")
DEST = os.path.join(SPRITES, "Tiles")
TILES_SRC = os.path.join(SPRITES, "Tiles Sprites")

# Track old->new path mappings for code reference updates
path_mapping = {}
files_copied = 0
files_deleted = 0
dirs_deleted = 0

# ============================================================
# TILE MIGRATION PLAN
# Flatten the deeply nested structure into clean themed folders
# ============================================================

def copy_tile(src, dest_subfolder, dest_filename=None):
    """Copy a tile PNG to the new Tiles/ structure."""
    global files_copied
    if not os.path.isfile(src):
        print(f"  WARNING: {src} not found, skipping")
        return
    dest_dir = os.path.join(DEST, dest_subfolder)
    os.makedirs(dest_dir, exist_ok=True)
    fname = dest_filename or os.path.basename(src)
    dest = os.path.join(dest_dir, fname)
    shutil.copy2(src, dest)
    files_copied += 1
    old_rel = os.path.relpath(src, BASE)
    new_rel = os.path.relpath(dest, BASE)
    path_mapping[old_rel] = new_rel

def copy_dir_pngs(src_dir, dest_subfolder, prefix_rename=None):
    """Copy all PNGs from a source dir to a dest subfolder."""
    if not os.path.isdir(src_dir):
        print(f"  WARNING: {src_dir} not found, skipping")
        return
    for f in sorted(os.listdir(src_dir)):
        if f.lower().endswith('.png'):
            new_name = f
            if prefix_rename:
                new_name = f.replace(prefix_rename[0], prefix_rename[1])
            copy_tile(os.path.join(src_dir, f), dest_subfolder, new_name)

def migrate_rogue_adventure():
    """Migrate Rogue Adventure tilesets — these are the 16 actively used ones."""
    print("\n--- Rogue Adventure Tilesets (USED IN CODE) ---")
    ra = os.path.join(TILES_SRC, "Rogue Adventure", "Tilesets")

    # Map each RA tileset region to a descriptive folder name
    ra_regions = {
        "Ancient Ruins":    "AncientRuins",
        "Atlantis":         "Atlantis",
        "Beast":            "BeastLair",
        "Caverns":          "Cavern",
        "Crypt":            "Crypt",
        "Graveyard":        "Graveyard",
        "Harbor":           "Harbor",
        "Hell":             "Hellfire",
        "Interior":         "Interior",
        "Jungle":           "Jungle",
        "Overworld":        "Overworld",
        "Pyramid":          "Pyramid",
        "Ruins":            "Ruins",
        "Sanctuary":        "Sanctuary",
        "Temple":           "Temple",
        "Village":          "Village",
        "Wastelands":       "Wasteland",
    }

    for src_name, dest_name in ra_regions.items():
        region_dir = os.path.join(ra, src_name)
        if not os.path.isdir(region_dir):
            continue
        dest_folder = f"RogueAdventure/{dest_name}"
        # Copy from Sprites/ subfolder
        sprites_dir = os.path.join(region_dir, "Sprites")
        if os.path.isdir(sprites_dir):
            copy_dir_pngs(sprites_dir, dest_folder)
        # Copy from Tiles/ subfolder (some have PNGs here too)
        tiles_dir = os.path.join(region_dir, "Tiles")
        if os.path.isdir(tiles_dir):
            for f in sorted(os.listdir(tiles_dir)):
                if f.lower().endswith('.png'):
                    copy_tile(os.path.join(tiles_dir, f), dest_folder)
        # Copy from Animated Water/ subfolder (Wastelands has this)
        anim_dir = os.path.join(region_dir, "Animated Water", "Sprites")
        if os.path.isdir(anim_dir):
            copy_dir_pngs(anim_dir, dest_folder)

    # Enemies
    enemies_dir = os.path.join(TILES_SRC, "Rogue Adventure", "Enemies")
    if os.path.isdir(enemies_dir):
        copy_dir_pngs(enemies_dir, "RogueAdventure/Enemies")

def migrate_farm_game_world():
    """Migrate Farm Game World tilesets and supporting assets."""
    print("\n--- Farm Game World Tilesets ---")
    fgw = os.path.join(TILES_SRC, "Farm Game World")

    # Main tilesets
    tilesets_dir = os.path.join(fgw, "Tilesets")
    fg_regions = {
        "Abandoned Mines":  "AbandonedMines",
        "Cellar":           "Cellar",
        "Dark Castle":      "DarkCastle",
        "Extras":           "Extras",
        "Forest":           "Forest",
        "Fortress":         "Fortress",
        "Frozen Caves":     "FrozenCaves",
        "Grasslands":       "Grasslands",
        "Houses":           "Houses",
        "Interior":         "Interior",
        "Magma Dungeon":    "MagmaDungeon",
        "Marketplace":      "Marketplace",
        "Mountains":        "Mountains",
        "Village":          "Village",
    }

    for src_name, dest_name in fg_regions.items():
        region_dir = os.path.join(tilesets_dir, src_name)
        if not os.path.isdir(region_dir):
            continue
        dest_folder = f"FarmGameWorld/{dest_name}"
        # Walk all subdirs for PNGs (Sprites/, Animated Tiles/, Animated Objects/, etc.)
        for root, dirs, files in os.walk(region_dir):
            for f in sorted(files):
                if f.lower().endswith('.png'):
                    copy_tile(os.path.join(root, f), dest_folder)

    # Animals
    animals_dir = os.path.join(fgw, "Animals")
    if os.path.isdir(animals_dir):
        copy_dir_pngs(animals_dir, "FarmGameWorld/Animals")

    # Animated Trees (seasonal)
    trees_dir = os.path.join(fgw, "Animated Trees")
    if os.path.isdir(trees_dir):
        for root, dirs, files in os.walk(trees_dir):
            for f in sorted(files):
                if f.lower().endswith('.png'):
                    copy_tile(os.path.join(root, f), "FarmGameWorld/AnimatedTrees")

    # BackgroundHealth and other loose PNGs
    for f in sorted(os.listdir(fgw)):
        full = os.path.join(fgw, f)
        if os.path.isfile(full) and f.lower().endswith('.png'):
            copy_tile(full, "FarmGameWorld")

    # Characters (No Faceset) and Knights already migrated to Sprites/Characters/
    # Music .wav files will be deleted as non-image

def migrate_fantasy_dreamland():
    """Migrate Fantasy Dreamland tileset variants."""
    print("\n--- Fantasy Dreamland ---")
    fd = os.path.join(TILES_SRC, "Fantasy Dreamland")
    if os.path.isdir(fd):
        for root, dirs, files in os.walk(fd):
            for f in sorted(files):
                if f.lower().endswith('.png'):
                    copy_tile(os.path.join(root, f), "FantasyDreamland")

    fdr = os.path.join(TILES_SRC, "Fantasy Dreamland Reborn")
    if os.path.isdir(fdr):
        for root, dirs, files in os.walk(fdr):
            for f in sorted(files):
                if f.lower().endswith('.png'):
                    copy_tile(os.path.join(root, f), "FantasyDreamlandReborn")

def migrate_other_folders():
    """Migrate smaller tile folders."""
    print("\n--- Other Tile Folders ---")

    # Buildings
    buildings = os.path.join(TILES_SRC, "Buildings")
    if os.path.isdir(buildings):
        for root, dirs, files in os.walk(buildings):
            for f in sorted(files):
                if f.lower().endswith('.png'):
                    copy_tile(os.path.join(root, f), "Buildings")

    # Extras (tree sheets)
    extras = os.path.join(TILES_SRC, "Extras")
    if os.path.isdir(extras):
        for root, dirs, files in os.walk(extras):
            for f in sorted(files):
                if f.lower().endswith('.png'):
                    copy_tile(os.path.join(root, f), "Extras")

    # Flowers
    flowers = os.path.join(TILES_SRC, "Flowers")
    if os.path.isdir(flowers):
        for root, dirs, files in os.walk(flowers):
            for f in sorted(files):
                if f.lower().endswith('.png'):
                    copy_tile(os.path.join(root, f), "Flowers")

    # Icons
    icons = os.path.join(TILES_SRC, "Icons")
    if os.path.isdir(icons):
        for root, dirs, files in os.walk(icons):
            for f in sorted(files):
                if f.lower().endswith('.png'):
                    copy_tile(os.path.join(root, f), "Icons")

    # Prefab Tiles
    prefab = os.path.join(TILES_SRC, "Prefab Tiles")
    if os.path.isdir(prefab):
        for root, dirs, files in os.walk(prefab):
            for f in sorted(files):
                if f.lower().endswith('.png'):
                    copy_tile(os.path.join(root, f), "PrefabTiles")

    # Water
    water = os.path.join(TILES_SRC, "Water")
    if os.path.isdir(water):
        for root, dirs, files in os.walk(water):
            for f in sorted(files):
                if f.lower().endswith('.png'):
                    copy_tile(os.path.join(root, f), "Water")

# ============================================================
# NON-IMAGE FILE CLEANUP
# ============================================================

IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif'}

def delete_non_image_files():
    """Delete all non-image files from the entire Sprites/ directory tree."""
    global files_deleted, dirs_deleted
    print("\n" + "=" * 60)
    print("CLEANING NON-IMAGE FILES")
    print("=" * 60)

    deleted_by_ext = {}

    for root, dirs, files in os.walk(SPRITES, topdown=False):
        for f in files:
            ext = os.path.splitext(f)[1].lower()
            if ext not in IMAGE_EXTENSIONS:
                filepath = os.path.join(root, f)
                os.remove(filepath)
                files_deleted += 1
                deleted_by_ext[ext] = deleted_by_ext.get(ext, 0) + 1

        # Remove empty directories after deleting files
        try:
            if not os.listdir(root) and root != SPRITES:
                os.rmdir(root)
                dirs_deleted += 1
        except OSError:
            pass

    print(f"\nDeleted files by type:")
    for ext, count in sorted(deleted_by_ext.items(), key=lambda x: -x[1]):
        print(f"  {ext or '(no ext)'}: {count}")
    print(f"  Total files deleted: {files_deleted}")
    print(f"  Empty directories removed: {dirs_deleted}")

# ============================================================
# CLEANUP: Remove old Tiles Sprites/ directory
# ============================================================

def remove_old_tiles_sprites():
    """Remove the old Tiles Sprites/ directory after migration."""
    global dirs_deleted
    print("\n--- Removing old Tiles Sprites/ directory ---")
    if os.path.isdir(TILES_SRC):
        # Walk and remove remaining empty dirs
        for root, dirs, files in os.walk(TILES_SRC, topdown=False):
            for f in files:
                # Any remaining files (should only be images at this point)
                os.remove(os.path.join(root, f))
            try:
                os.rmdir(root)
                dirs_deleted += 1
            except OSError:
                pass
        print("  Old Tiles Sprites/ removed")
    else:
        print("  Already removed")

# ============================================================
# MAIN
# ============================================================

def main():
    print("=" * 60)
    print("Tile Sprite Migration & Cleanup")
    print("=" * 60)

    os.makedirs(DEST, exist_ok=True)
    print(f"Destination: {DEST}")

    # Step 1: Migrate all tile PNGs to new structure
    print("\n" + "=" * 60)
    print("STEP 1: MIGRATE TILE PNGs")
    print("=" * 60)

    migrate_rogue_adventure()
    migrate_farm_game_world()
    migrate_fantasy_dreamland()
    migrate_other_folders()

    print(f"\nTotal tile PNGs copied: {files_copied}")

    # Step 2: Delete all non-image files from Sprites/
    delete_non_image_files()

    # Step 3: Remove old Tiles Sprites/ (now empty or redundant)
    remove_old_tiles_sprites()

    # Also remove Tilesets/ top level if it exists
    tilesets_top = os.path.join(SPRITES, "Tilesets")
    if os.path.isdir(tilesets_top):
        shutil.rmtree(tilesets_top)
        print("  Removed top-level Tilesets/")

    # Save mapping
    mapping_path = os.path.join(BASE, "tile_migration_map.json")
    with open(mapping_path, 'w') as f:
        json.dump(path_mapping, f, indent=2)
    print(f"\nPath mapping saved to: {mapping_path}")

    # Print the code-referenced paths that changed
    print("\n" + "=" * 60)
    print("CODE-REFERENCED TILESET PATH CHANGES:")
    print("=" * 60)

    code_refs = [
        "Sprites/Tiles Sprites/Rogue Adventure/Tilesets/Ancient Ruins/Sprites/RA_Ancient.png",
        "Sprites/Tiles Sprites/Rogue Adventure/Tilesets/Atlantis/Sprites/RA_Atlantis.png",
        "Sprites/Tiles Sprites/Rogue Adventure/Tilesets/Beast/Sprites/RA_Beast.png",
        "Sprites/Tiles Sprites/Rogue Adventure/Tilesets/Caverns/Sprites/RA_Cavern.png",
        "Sprites/Tiles Sprites/Rogue Adventure/Tilesets/Crypt/Sprites/RA_Crypt.png",
        "Sprites/Tiles Sprites/Rogue Adventure/Tilesets/Graveyard/Sprites/RA_Graveyard.png",
        "Sprites/Tiles Sprites/Rogue Adventure/Tilesets/Hell/Sprites/RA_Hell.png",
        "Sprites/Tiles Sprites/Rogue Adventure/Tilesets/Interior/Sprites/RA_Interior.png",
        "Sprites/Tiles Sprites/Rogue Adventure/Tilesets/Jungle/Sprites/RA_Jungle.png",
        "Sprites/Tiles Sprites/Rogue Adventure/Tilesets/Overworld/Sprites/RA_Overworld.png",
        "Sprites/Tiles Sprites/Rogue Adventure/Tilesets/Pyramid/Sprites/RA_Pyramid.png",
        "Sprites/Tiles Sprites/Rogue Adventure/Tilesets/Ruins/Sprites/RA_Ruins.png",
        "Sprites/Tiles Sprites/Rogue Adventure/Tilesets/Sanctuary/Sprites/RA_Sanctuary.png",
        "Sprites/Tiles Sprites/Rogue Adventure/Tilesets/Temple/Sprites/RA_Temple.png",
        "Sprites/Tiles Sprites/Rogue Adventure/Tilesets/Village/Sprites/RA_Village.png",
        "Sprites/Tiles Sprites/Rogue Adventure/Tilesets/Wastelands/Sprites/RA_Wasteland.png",
    ]

    for old in code_refs:
        new = path_mapping.get(old, "NOT FOUND")
        print(f"  {old}")
        print(f"    -> {new}")

    # Final summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    remaining_dirs = []
    for d in sorted(os.listdir(SPRITES)):
        full = os.path.join(SPRITES, d)
        if os.path.isdir(full):
            count = sum(1 for r, ds, fs in os.walk(full) for f in fs)
            remaining_dirs.append((d, count))

    print("Remaining Sprites/ structure:")
    for d, count in remaining_dirs:
        print(f"  {d}/  ({count} files)")

if __name__ == "__main__":
    main()
