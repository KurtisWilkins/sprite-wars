#!/usr/bin/env python3
"""
Extract body parts from composite race sprite PNGs into individual part files.

Each race sprite contains separated body parts on transparent background.
This script identifies each connected component, classifies it by position
and size, and saves each as a separate PNG with anchor point metadata.

For merged parts (e.g., head+torso as one blob), the script attempts to
split them by finding the neck region.

Output structure:
  Sprites/Characters/{Race}/parts/
    {Race}_S{stage}_{partname}.png
    {Race}_S{stage}_skeleton.json
"""

import json
import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage


RACES = {
    1: 'Human', 2: 'Elf', 3: 'Demon', 4: 'Devil', 5: 'CatMan',
    6: 'BearMan', 7: 'WolfMan', 8: 'MonkeyMan', 9: 'BugMan', 10: 'BirdMan',
    11: 'Ent', 12: 'FishMan', 13: 'Ghost', 14: 'Golem', 15: 'LizardMan',
    16: 'Minotaur', 17: 'Mummy', 18: 'Ork', 19: 'RatMan', 20: 'Robot',
    21: 'Skeleton', 22: 'SharkMan', 23: 'TurtleMan', 24: 'Zombie',
}

STAGE_SIZES = {1: 64, 2: 96, 3: 128}

# Joint/anchor definitions
JOINT_DEFS = {
    'head':       {'parent': 'torso',     'anchor_rel': (0.5, 0.95)},
    'torso':      {'parent': None,        'anchor_rel': (0.5, 0.5)},
    'left_arm':   {'parent': 'torso',     'anchor_rel': (0.8, 0.1)},
    'right_arm':  {'parent': 'torso',     'anchor_rel': (0.2, 0.1)},
    'left_leg':   {'parent': 'torso',     'anchor_rel': (0.5, 0.1)},
    'right_leg':  {'parent': 'torso',     'anchor_rel': (0.5, 0.1)},
    'left_hand':  {'parent': 'left_arm',  'anchor_rel': (0.5, 0.1)},
    'right_hand': {'parent': 'right_arm', 'anchor_rel': (0.5, 0.1)},
    'left_foot':  {'parent': 'left_leg',  'anchor_rel': (0.5, 0.1)},
    'right_foot': {'parent': 'right_leg', 'anchor_rel': (0.5, 0.1)},
    'left_wing':  {'parent': 'torso',     'anchor_rel': (0.9, 0.3)},
    'right_wing': {'parent': 'torso',     'anchor_rel': (0.1, 0.3)},
    'tail':       {'parent': 'torso',     'anchor_rel': (0.5, 0.9)},
}

DRAW_ORDER = [
    'left_wing', 'right_wing', 'tail',
    'left_leg', 'right_leg', 'left_foot', 'right_foot',
    'torso', 'left_arm', 'right_arm',
    'left_hand', 'right_hand', 'head',
]


def extract_components(img_array, alpha_threshold=10):
    """Find connected components (body parts) in a sprite image."""
    alpha = img_array[:, :, 3]
    labeled, num_features = ndimage.label(alpha > alpha_threshold)

    components = []
    for i in range(1, num_features + 1):
        ys, xs = np.where(labeled == i)
        bbox = (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()))
        w = bbox[2] - bbox[0] + 1
        h = bbox[3] - bbox[1] + 1

        part_img = np.zeros((h, w, 4), dtype=np.uint8)
        mask = labeled[bbox[1]:bbox[3]+1, bbox[0]:bbox[2]+1] == i
        part_img[mask] = img_array[bbox[1]:bbox[3]+1, bbox[0]:bbox[2]+1][mask]

        components.append({
            'index': i,
            'bbox': bbox,
            'width': w,
            'height': h,
            'area': int(len(xs)),
            'cx': (bbox[0] + bbox[2]) / 2.0,
            'cy': (bbox[1] + bbox[3]) / 2.0,
            'image': part_img,
        })

    components.sort(key=lambda c: c['area'], reverse=True)
    return components


def try_split_merged_head_torso(comp, img_size):
    """
    If the largest component spans >50% of the image height,
    it likely contains both head and torso merged. Try to split
    by finding the narrowest horizontal row (the neck).
    """
    h = comp['height']
    if h < img_size * 0.45:
        return None  # Not tall enough to be merged

    arr = comp['image']
    alpha = arr[:, :, 3]

    # Find width of non-transparent pixels at each row
    row_widths = []
    for y in range(h):
        non_transparent = np.where(alpha[y] > 10)[0]
        if len(non_transparent) > 0:
            row_widths.append(non_transparent[-1] - non_transparent[0] + 1)
        else:
            row_widths.append(0)

    # Look for the narrowest row in the middle 30-60% of height (neck region)
    search_start = int(h * 0.25)
    search_end = int(h * 0.55)

    if search_end <= search_start:
        return None

    min_width = float('inf')
    split_y = -1
    for y in range(search_start, search_end):
        if 0 < row_widths[y] < min_width:
            min_width = row_widths[y]
            split_y = y

    if split_y < 0 or min_width >= comp['width'] * 0.7:
        return None  # No clear neck found

    # Split into head (above) and torso (below)
    head_img = arr[:split_y].copy()
    torso_img = arr[split_y:].copy()

    # Trim transparent rows
    head_img = _trim_transparent(head_img)
    torso_img = _trim_transparent(torso_img)

    if head_img is None or torso_img is None:
        return None

    bbox = comp['bbox']
    head_h = head_img.shape[0]
    torso_h = torso_img.shape[0]

    head_comp = {
        'bbox': (bbox[0], bbox[1], bbox[0] + head_img.shape[1] - 1, bbox[1] + head_h - 1),
        'width': head_img.shape[1], 'height': head_h,
        'area': int(np.sum(head_img[:, :, 3] > 10)),
        'cx': bbox[0] + head_img.shape[1] / 2.0,
        'cy': bbox[1] + head_h / 2.0,
        'image': head_img,
    }

    torso_y_start = bbox[1] + split_y
    torso_comp = {
        'bbox': (bbox[0], torso_y_start, bbox[0] + torso_img.shape[1] - 1, torso_y_start + torso_h - 1),
        'width': torso_img.shape[1], 'height': torso_h,
        'area': int(np.sum(torso_img[:, :, 3] > 10)),
        'cx': bbox[0] + torso_img.shape[1] / 2.0,
        'cy': torso_y_start + torso_h / 2.0,
        'image': torso_img,
    }

    return head_comp, torso_comp


def _trim_transparent(arr):
    """Trim fully transparent rows/cols from edges."""
    if arr.size == 0:
        return None
    alpha = arr[:, :, 3]
    rows = np.any(alpha > 10, axis=1)
    cols = np.any(alpha > 10, axis=0)
    if not np.any(rows) or not np.any(cols):
        return None
    rmin, rmax = np.where(rows)[0][[0, -1]]
    cmin, cmax = np.where(cols)[0][[0, -1]]
    return arr[rmin:rmax+1, cmin:cmax+1].copy()


def classify_components(components, img_size, race_name):
    """
    Classify components into body parts using a scoring approach.
    Returns dict of part_name -> component.
    """
    assigned = {}
    unassigned = list(components)

    # Normalize positions
    for c in unassigned:
        c['nx'] = c['cx'] / img_size  # 0..1
        c['ny'] = c['cy'] / img_size
        c['na'] = c['area'] / (img_size * img_size)

    # Step 1: Find the head - largest component in upper half, or largest overall
    head_candidates = [c for c in unassigned if c['ny'] < 0.55]
    if head_candidates:
        head = max(head_candidates, key=lambda c: c['area'])
    else:
        head = unassigned[0]  # Largest component

    # Check if head+torso are merged (tall component spanning most of image)
    split_result = try_split_merged_head_torso(head, img_size)
    if split_result:
        head_part, torso_part = split_result
        head_part['nx'] = head_part['cx'] / img_size
        head_part['ny'] = head_part['cy'] / img_size
        head_part['na'] = head_part['area'] / (img_size * img_size)
        torso_part['nx'] = torso_part['cx'] / img_size
        torso_part['ny'] = torso_part['cy'] / img_size
        torso_part['na'] = torso_part['area'] / (img_size * img_size)
        assigned['head'] = head_part
        assigned['torso'] = torso_part
        unassigned.remove(head)
    else:
        assigned['head'] = head
        unassigned.remove(head)

    # Step 2: Find torso - second largest, should be below or near head
    if 'torso' not in assigned:
        torso_candidates = [c for c in unassigned if c['na'] > 0.005]
        if torso_candidates:
            # Prefer components that are below the head and near center
            head_cy = assigned['head']['ny']
            scored = []
            for c in torso_candidates:
                # Prefer below head, near center-x, large area
                below_score = 1.0 if c['ny'] > head_cy else 0.3
                center_score = 1.0 - abs(c['nx'] - 0.5) * 2
                area_score = c['na'] * 20
                scored.append((c, below_score + center_score + area_score))
            scored.sort(key=lambda x: x[1], reverse=True)
            assigned['torso'] = scored[0][0]
            unassigned.remove(scored[0][0])

    # Step 3: Classify remaining by position relative to head/torso
    ref_cx = assigned.get('torso', assigned['head'])['nx']
    ref_cy = assigned.get('torso', assigned['head'])['ny']

    # Define regions relative to reference point
    def classify_remaining(comp):
        dx = comp['nx'] - ref_cx
        dy = comp['ny'] - ref_cy

        # Is it on the left or right side?
        is_left = dx < -0.05
        is_right = dx > 0.05
        is_above = dy < -0.1
        is_below = dy > 0.1
        is_far_below = dy > 0.3

        # Large lateral components could be wings
        if comp['na'] > 0.03 and (is_left or is_right) and abs(dx) > 0.2:
            if race_name in ('BirdMan',):
                return 'left_wing' if is_left else 'right_wing'

        # Arm region: medium height, on sides
        if is_left and not is_far_below and comp['na'] > 0.002:
            if 'left_arm' not in assigned:
                return 'left_arm'
        if is_right and not is_far_below and comp['na'] > 0.002:
            if is_above and 'right_hand' not in assigned:
                return 'right_hand'
            if not is_above and 'right_arm' not in assigned:
                return 'right_arm'

        # Leg/foot region: below torso
        if is_far_below or (is_below and comp['ny'] > 0.7):
            if comp['nx'] < 0.5:
                if 'left_foot' not in assigned:
                    return 'left_foot'
                if 'left_leg' not in assigned:
                    return 'left_leg'
            else:
                if 'right_foot' not in assigned:
                    return 'right_foot'
                if 'right_leg' not in assigned:
                    return 'right_leg'

        # Hand/arm fallbacks
        if is_left:
            for part in ['left_arm', 'left_hand', 'left_leg', 'left_foot']:
                if part not in assigned:
                    return part
        if is_right:
            for part in ['right_hand', 'right_arm', 'right_leg', 'right_foot']:
                if part not in assigned:
                    return part

        return None

    # Sort remaining by area descending to classify larger parts first
    unassigned.sort(key=lambda c: c['area'], reverse=True)

    extras = []
    for comp in unassigned:
        part_name = classify_remaining(comp)
        if part_name and part_name not in assigned:
            assigned[part_name] = comp
        else:
            extras.append(comp)

    return assigned, extras


def save_parts(assigned, extras, race_name, stage, img_size, base_dir):
    """Save extracted parts as PNGs and generate skeleton JSON."""
    parts_dir = os.path.join(base_dir, 'Sprites', 'Characters', race_name, 'parts')
    os.makedirs(parts_dir, exist_ok=True)

    skeleton = {
        'race': race_name,
        'stage': stage,
        'source_size': img_size,
        'parts': {},
        'bones': {},
        'draw_order': [p for p in DRAW_ORDER if p in assigned],
    }

    for part_name, comp in assigned.items():
        filename = f'{race_name}_S{stage}_{part_name}.png'
        filepath = os.path.join(parts_dir, filename)

        part_img = Image.fromarray(comp['image'])
        # Add 2px padding for rotation anti-aliasing
        padded = Image.new('RGBA', (comp['width'] + 4, comp['height'] + 4), (0, 0, 0, 0))
        padded.paste(part_img, (2, 2))
        padded.save(filepath)

        # Compute anchor
        joint_def = JOINT_DEFS.get(part_name, {'anchor_rel': (0.5, 0.5)})
        rel = joint_def.get('anchor_rel', (0.5, 0.5))
        anchor = {
            'x': int(comp['width'] * rel[0]) + 2,
            'y': int(comp['height'] * rel[1]) + 2,
        }

        # Expand source_bbox by 2px padding to match the padded PNG dimensions
        padded_bbox = (
            max(0, comp['bbox'][0] - 2),
            max(0, comp['bbox'][1] - 2),
            min(img_size - 1, comp['bbox'][2] + 2),
            min(img_size - 1, comp['bbox'][3] + 2),
        )
        skeleton['parts'][part_name] = {
            'file': filename,
            'width': comp['width'] + 4,
            'height': comp['height'] + 4,
            'source_bbox': list(padded_bbox),
            'source_center': [round(comp['cx'], 1), round(comp['cy'], 1)],
            'anchor': anchor,
        }

        parent = joint_def.get('parent') if part_name in JOINT_DEFS else 'torso'
        skeleton['bones'][part_name] = {
            'parent': parent,
            'offset_x': round(comp['cx'] / img_size, 3),
            'offset_y': round(comp['cy'] / img_size, 3),
            'rotation': 0,
            'scale': 1.0,
        }

    # Save extras
    for idx, comp in enumerate(extras):
        filename = f'{race_name}_S{stage}_extra_{idx}.png'
        filepath = os.path.join(parts_dir, filename)
        part_img = Image.fromarray(comp['image'])
        padded = Image.new('RGBA', (comp['width'] + 4, comp['height'] + 4), (0, 0, 0, 0))
        padded.paste(part_img, (2, 2))
        padded.save(filepath)

        skeleton['parts'][f'extra_{idx}'] = {
            'file': filename,
            'width': comp['width'] + 4,
            'height': comp['height'] + 4,
            'source_bbox': comp['bbox'],
            'source_center': [round(comp['cx'], 1), round(comp['cy'], 1)],
            'anchor': {'x': comp['width'] // 2 + 2, 'y': comp['height'] // 2 + 2},
            'attach_to': 'head',
        }

    # Save skeleton JSON
    skel_path = os.path.join(parts_dir, f'{race_name}_S{stage}_skeleton.json')
    with open(skel_path, 'w') as f:
        json.dump(skeleton, f, indent=2)

    return skeleton


def process_sprite(race_name, stage, base_dir):
    """Process a single race/stage sprite."""
    src = os.path.join(base_dir, 'Sprites', 'Characters', race_name,
                       f'{race_name}_S{stage}_Idle.png')
    if not os.path.exists(src):
        return None

    img = Image.open(src)
    arr = np.array(img)
    img_size = img.size[0]

    components = extract_components(arr)
    assigned, extras = classify_components(components, img_size, race_name)

    result = save_parts(assigned, extras, race_name, stage, img_size, base_dir)

    parts_str = ', '.join(sorted(assigned.keys()))
    print(f'  S{stage} ({img_size}px): {len(assigned)} parts [{parts_str}] + {len(extras)} extras')
    return result


def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    print('=== Body Part Extraction Tool v2 ===\n')

    all_results = {}
    total_parts = 0
    total_sprites = 0

    for race_id, race_name in sorted(RACES.items()):
        print(f'{race_name} (Race {race_id}):')
        race_results = {}
        for stage in [1, 2, 3]:
            result = process_sprite(race_name, stage, base_dir)
            if result:
                race_results[stage] = result
                total_parts += len(result['parts'])
                total_sprites += 1
        all_results[race_name] = race_results

    # Write manifest
    manifest = {
        'version': 2,
        'total_races': len(RACES),
        'total_sprites': total_sprites,
        'total_parts_extracted': total_parts,
        'races': {}
    }
    for race_name, stages in all_results.items():
        manifest['races'][race_name] = {
            'stages': {
                str(s): {
                    'skeleton': f'Sprites/Characters/{race_name}/parts/{race_name}_S{s}_skeleton.json',
                    'parts_dir': f'Sprites/Characters/{race_name}/parts/',
                    'num_parts': len(d['parts']),
                }
                for s, d in stages.items()
            }
        }

    manifest_path = os.path.join(base_dir, 'Sprites', 'Characters', 'skeletal_manifest.json')
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)

    print(f'\n=== Complete: {total_sprites} sprites, {total_parts} parts ===')
    print(f'Manifest: {manifest_path}')

    # Validation report
    print('\n=== Validation Report ===')
    expected_core = ['head', 'torso']
    expected_limbs = ['left_arm', 'right_arm']
    expected_lower = ['left_foot', 'right_foot']
    warnings = []

    for race_name, stages in all_results.items():
        for s, data in stages.items():
            parts = set(data['parts'].keys())
            for p in expected_core:
                if p not in parts:
                    warnings.append(f'{race_name} S{s}: missing {p}')
            has_arms = any(p in parts for p in expected_limbs)
            has_wings = any(p in parts for p in ['left_wing', 'right_wing'])
            if not has_arms and not has_wings:
                warnings.append(f'{race_name} S{s}: missing arms/wings')

    if warnings:
        print(f'{len(warnings)} warnings:')
        for w in warnings:
            print(f'  {w}')
    else:
        print('All races have core body parts!')


if __name__ == '__main__':
    main()
