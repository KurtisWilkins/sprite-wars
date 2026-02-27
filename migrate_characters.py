#!/usr/bin/env python3
"""
Character Sprite Migration Script
Consolidates characters from 3 source folders into Sprites/Characters/
with descriptive names for previously numbered sprites.
"""
import os
import shutil
import json

BASE = "/home/user/sprite-wars"
DEST = os.path.join(BASE, "Sprites", "Characters")

# ============================================================
# NAMING MAPS
# ============================================================

# 30 Villagers from Characters (No Faceset)
# Each has a subfolder with 26 action PNGs
VILLAGER_NAMES = {
    "Character01": "BlueCap_Toby",          # light skin boy, white/blue cap, orange shirt
    "Character02": "BlueCap_Marcus",         # dark skin boy, same white/blue cap outfit
    "Character03": "DarkLocks_Kira",         # dark hair, dark clothes, tan skin
    "Character04": "SunnyHat_Goldie",        # bright blonde hair, red tunic
    "Character05": "CrimsonHat_Miles",       # dark skin, red fedora, dark vest
    "Character06": "WoodlandTunic_Sage",     # brown skin, green shirt, red accents
    "Character07": "WildSpike_Blaze",        # spiky dark hair, red outfit, fierce look
    "Character08": "RedWrap_Jasper",         # dark skin, red headwrap, sturdy build
    "Character09": "SkyTurban_Cyrus",        # blue turban, tan skin, open vest
    "Character10": "GoldenPony_Rosie",       # blonde ponytail, red vest, blue skirt
    "Character11": "AuburnBob_Hector",       # auburn/brown hair, orange tunic
    "Character12": "PeachBonnet_Pippin",     # light peach skin, round bonnet hat, small
    "Character13": "RedBand_Kai",            # dark hair, red headband, blue vest
    "Character14": "FlameSpike_Flynn",       # wild orange-red hair, dark outfit
    "Character15": "GoldenBraid_Celeste",    # long flowing blonde hair, blue/red outfit
    "Character16": "RedCapRound_Porter",     # red cap, stocky/round, blue overalls
    "Character17": "RoseFluff_Plum",         # pink/rose poofy hair, round build
    "Character18": "MidnightHair_Violet",    # jet black long hair, magenta outfit
    "Character19": "CrimsonPuff_Ruby",       # dark crimson poofy hair, pink accents
    "Character20": "GreenVest_Forrest",      # green coat, crimson/brown hat, short
    "Character21": "PhantomCloak_Raven",     # nearly all black, shadowy, mysterious
    "Character22": "NightHelm_Ember",        # dark grey armor, pointed ears visible
    "Character23": "GingerSuit_Ashton",      # orange/ginger hair, dark grey suit
    "Character24": "GoldSuit_Sterling",      # blonde/gold hair, dark formal outfit
    "Character25": "TealShadow_Dusk",        # very dark body, teal-blue highlights
    "Character26": "DarkTeal_Storm",         # charcoal grey, teal accent marks
    "Character27": "GoldenArmor_Aurum",      # gold hair, dark armor, noble look
    "Character28": "MaroonHood_Jasmine",     # dark maroon cloak, teal accents
    "Character29": "CurlyAfro_Maggie",       # dark curly afro hair, pink shirt
    "Character30": "DarkRose_Hazel",         # dark brown, rose/magenta green accents
}

# 96 Knights from Knights folder
# Pattern: 4 armor color blocks × 24 per block, pairs of skin tones
KNIGHT_NAMES = {
    # Block 1 (01-24): Dark/Iron Armor
    "Knight_01": "IronHelm_Knight_Roland",
    "Knight_02": "IronHelm_Knight_Garrett",
    "Knight_03": "EmberHelm_Knight_Silas",
    "Knight_04": "EmberHelm_Knight_Darius",
    "Knight_05": "CrimsonHelm_Knight_Victor",
    "Knight_06": "CrimsonHelm_Knight_Malcolm",
    "Knight_07": "GoldHelm_Knight_Arthur",
    "Knight_08": "GoldHelm_Knight_Cedric",
    "Knight_09": "IronCrest_Knight_Tristan",
    "Knight_10": "IronCrest_Knight_Orion",
    "Knight_11": "EmberCrest_Knight_Aldric",
    "Knight_12": "EmberCrest_Knight_Dorian",
    "Knight_13": "CrimsonCrest_Knight_Lysander",
    "Knight_14": "CrimsonCrest_Knight_Theron",
    "Knight_15": "GoldCrest_Knight_Percival",
    "Knight_16": "GoldCrest_Knight_Alaric",
    "Knight_17": "MaroonPlume_Knight_Rowan",
    "Knight_18": "MaroonPlume_Knight_Drake",
    "Knight_19": "GildedPlume_Knight_Everett",
    "Knight_20": "GildedPlume_Knight_Knox",
    "Knight_21": "ShadowBare_Knight_Callum",
    "Knight_22": "ShadowBare_Knight_Lennox",
    "Knight_23": "CopperBare_Knight_Desmond",
    "Knight_24": "CopperBare_Knight_Warren",
    # Block 2 (25-48): Scarlet/Red Armor
    "Knight_25": "ScarletTunic_Knight_Benedict",
    "Knight_26": "ScarletTunic_Knight_Jasper",
    "Knight_27": "ScarletHelm_Knight_Tobias",
    "Knight_28": "ScarletHelm_Knight_Nikolai",
    "Knight_29": "ScarletCrest_Knight_Hendrix",
    "Knight_30": "ScarletCrest_Knight_Magnus",
    "Knight_31": "GoldenScarlet_Knight_Leander",
    "Knight_32": "GoldenScarlet_Knight_Bruno",
    "Knight_33": "ScarletPlume_Knight_Caspian",
    "Knight_34": "ScarletPlume_Knight_Rafael",
    "Knight_35": "ScarletShield_Knight_Beckett",
    "Knight_36": "EmberScarlet_Knight_Felix",
    "Knight_37": "CrimsonScarlet_Knight_Oswald",
    "Knight_38": "CrimsonScarlet_Knight_Hugo",
    "Knight_39": "ScarletGuard_Knight_Lucius",
    "Knight_40": "ScarletGuard_Knight_Emeric",
    "Knight_41": "ScarletBlade_Knight_Hawthorne",
    "Knight_42": "MaroonScarlet_Knight_Ignatius",
    "Knight_43": "ScarletIron_Knight_Barrett",
    "Knight_44": "ScarletIron_Knight_Quentin",
    "Knight_45": "ScarletCopper_Knight_Vaughn",
    "Knight_46": "ScarletCopper_Knight_Ambrose",
    "Knight_47": "ScarletBare_Knight_Corbin",
    "Knight_48": "ScarletBare_Knight_Thaddeus",
    # Block 3 (49-72): Azure/Blue Armor
    "Knight_49": "AzureHelm_Knight_Edmund",
    "Knight_50": "AzureHelm_Knight_Prescott",
    "Knight_51": "AzureCrest_Knight_Mercer",
    "Knight_52": "AzureCrest_Knight_Sinclair",
    "Knight_53": "AzurePlume_Knight_Winston",
    "Knight_54": "CobaltHelm_Knight_Harding",
    "Knight_55": "CobaltCrest_Knight_Whitfield",
    "Knight_56": "CobaltCrest_Knight_Pembroke",
    "Knight_57": "SapphirePlume_Knight_Ellsworth",
    "Knight_58": "SapphirePlume_Knight_Montague",
    "Knight_59": "AzureGuard_Knight_Beaumont",
    "Knight_60": "AzureEmber_Knight_Alderton",
    "Knight_61": "AzureCrimson_Knight_Stafford",
    "Knight_62": "AzureCrimson_Knight_Thornton",
    "Knight_63": "CobaltPlume_Knight_Ashford",
    "Knight_64": "CobaltPlume_Knight_Langley",
    "Knight_65": "AzureBlade_Knight_Clifton",
    "Knight_66": "AzureBare_Knight_Hartford",
    "Knight_67": "AzureBare_Knight_Winslow",
    "Knight_68": "AzureShield_Knight_Bexley",
    "Knight_69": "SapphireGuard_Knight_Cavendish",
    "Knight_70": "SapphireGuard_Knight_Fairfax",
    "Knight_71": "CeruleanBare_Knight_Cromwell",
    "Knight_72": "CeruleanBare_Knight_Lowell",
    # Block 4 (73-96): Golden/Yellow Armor
    "Knight_73": "GoldenHelm_Knight_Galahad",
    "Knight_74": "GoldenHelm_Knight_Solomon",
    "Knight_75": "GoldenCrest_Knight_Leopold",
    "Knight_76": "GoldenCrest_Knight_Maximilian",
    "Knight_77": "GoldenPlume_Knight_Reginald",
    "Knight_78": "GoldenPlume_Knight_Mortimer",
    "Knight_79": "AmberHelm_Knight_Fitzgerald",
    "Knight_80": "AmberHelm_Knight_Bartholomew",
    "Knight_81": "AmberCrest_Knight_Constantine",
    "Knight_82": "AmberCrest_Knight_Beauregard",
    "Knight_83": "AmberPlume_Knight_Archibald",
    "Knight_84": "AmberPlume_Knight_Cornelius",
    "Knight_85": "GoldenShield_Knight_Nathaniel",
    "Knight_86": "GoldenShield_Knight_Alistair",
    "Knight_87": "GoldenGuard_Knight_Montgomery",
    "Knight_88": "GoldenGuard_Knight_Wellington",
    "Knight_89": "GoldenBlade_Knight_Pemberton",
    "Knight_90": "GoldenBare_Knight_Matthias",
    "Knight_91": "RadiantHelm_Knight_Augustus",
    "Knight_92": "RadiantCrest_Knight_Theodoric",
    "Knight_93": "RadiantPlume_Knight_Octavian",
    "Knight_94": "RadiantPlume_Knight_Cassander",
    "Knight_95": "SolarHelm_Knight_Valerian",
    "Knight_96": "SolarBare_Knight_Leonidas",
}

# ASAI characters - clean up filenames (remove parenthetical copy numbers)
# These already have descriptive names, just needs path consolidation
ASAI_RENAMES = {
    "AXEMAN1 (1).png": "Axeman1.png",
    "AXEMAN2 (1).png": "Axeman2.png",
    "AXEWOMAN1.png": "Axewoman1.png",
    "AXEWOMAN2.png": "Axewoman2.png",
    "AdeptWizard1.png": "AdeptWizard1.png",
    "AdeptWizard2.png": "AdeptWizard2.png",
    "BANDIMALE2 (2).png": "BanditMale2.png",
    "BANDITFEMAL2 (1).png": "BanditFemale2.png",
    "BANDITFEMAL3 (1).png": "BanditFemale3.png",
    "BANDITFEMALE1 (1).png": "BanditFemale1.png",
    "BANDITMALE1 (2).png": "BanditMale1.png",
    "BANDITMALE3 (1).png": "BanditMale3.png",
    "BISHOP (1).png": "Bishop.png",
    "Bandit 1.png": "Bandit1.png",
    "Clown1.png": "Clown1.png",
    "Clown2.png": "Clown2.png",
    "Cultist1.png": "Cultist1.png",
    "Cultist2.png": "Cultist2.png",
    "Cultist3.png": "Cultist3.png",
    "Cultist4.png": "Cultist4.png",
    "Cultist5.png": "Cultist5.png",
    "Cultist6.png": "Cultist6.png",
    "DRUNK (1).png": "Drunk.png",
    "DeathKnight.png": "DeathKnight.png",
    "DeathKnight2.png": "DeathKnight2.png",
    "ExpertWizard1.png": "ExpertWizard1.png",
    "ExpertWizard2.png": "ExpertWizard2.png",
    "Farmer 1.png": "Farmer1.png",
    "Farmer 2.png": "Farmer2.png",
    "Farmer 3.png": "Farmer3.png",
    "Farmer 4.png": "Farmer4.png",
    "Farmer 5.png": "Farmer5.png",
    "GrimReaper.png": "GrimReaper.png",
    "Jester.png": "Jester.png",
    "Jester2.png": "Jester2.png",
    "MONK1 (2).png": "Monk1.png",
    "MONK2 (1).png": "Monk2.png",
    "MasterWizard.png": "MasterWizard.png",
    "Merchant 1.png": "Merchant1.png",
    "Merchant 2.png": "Merchant2.png",
    "Miner1.png": "Miner1.png",
    "Miner2.png": "Miner2.png",
    "Miner3.png": "Miner3.png",
    "Miner4.png": "Miner4.png",
    "Miner5.png": "Miner5.png",
    "Miner6.png": "Miner6.png",
    "Miner_leader.png": "MinerLeader.png",
    "NOBLELADY1 (1).png": "NobleLady1.png",
    "NOBLELADY2 (2).png": "NobleLady2.png",
    "NOBLELADY3 (1).png": "NobleLady3.png",
    "NOBLEMAN1 (2).png": "NobleMan1.png",
    "NOBLEMAN2 (1).png": "NobleMan2.png",
    "NOBLEMAN3 (1).png": "NobleMan3.png",
    "NUN1 (1).png": "Nun1.png",
    "NUN2 (2).png": "Nun2.png",
    "NUN3 (2).png": "Nun3.png",
    "NUN4 (2).png": "Nun4.png",
    "NUN5 (2).png": "Nun5.png",
    "Necromancer.png": "Necromancer.png",
    "NoviceWizard1.png": "NoviceWizard1.png",
    "NoviceWizard2.png": "NoviceWizard2.png",
    "POPE (2).png": "Pope.png",
    "PRIEST (1).png": "Priest.png",
    "Peasant 1.png": "Peasant1.png",
    "Peasant 2.png": "Peasant2.png",
    "Peasant 3.png": "Peasant3.png",
    "Peasant 4.png": "Peasant4.png",
    "Peasant 5.png": "Peasant5.png",
    "Peasant 6.png": "Peasant6.png",
    "Peasant 7.png": "Peasant7.png",
    "Shop Keeper 1.png": "ShopKeeper1.png",
    "Shop keeper 2.png": "ShopKeeper2.png",
    "Shop Keeper 3.png": "ShopKeeper3.png",
    "Shop Keeper 4.png": "ShopKeeper4.png",
    "Shop Keeper 5.png": "ShopKeeper5.png",
    "Shop Keeper 6.png": "ShopKeeper6.png",
    "Skeleton1.png": "Skeleton1.png",
    "Skeleton2.png": "Skeleton2.png",
    "Sorcerer.png": "Sorcerer.png",
    "SpiderQueen.png": "SpiderQueen.png",
    "TAVERNKEEP (2).png": "TavernKeep.png",
    "TAVERNMAID (1).png": "TavernMaid.png",
    "TAVERNMAID2 (1).png": "TavernMaid2.png",
    "Theif 1.png": "Thief1.png",
    "Theif 2.png": "Thief2.png",
    "Theif 3.png": "Thief3.png",
    "Theif 4.png": "Thief4.png",
    "Theif 5.png": "Thief5.png",
    "Theif 6.png": "Thief6.png",
    "Theif 7.png": "Thief7.png",
    "Theif 8.png": "Thief8.png",
    "Theif 9.png": "Thief9.png",
    "Viking1.png": "Viking1.png",
    "Viking2.png": "Viking2.png",
    "Viking3.png": "Viking3.png",
    "Viking4.png": "Viking4.png",
    "Viking5.png": "Viking5.png",
    "Viking6.png": "Viking6.png",
    "Viking7.png": "Viking7.png",
    "Zombie1.png": "Zombie1.png",
    "Zombie2.png": "Zombie2.png",
    "circusringleader.png": "CircusRingleader.png",
    "dockmaster.png": "Dockmaster.png",
    "female_sewer_people1.png": "FewerSewerFolk1.png",
    "female_sewer_people2.png": "FemaleSewerFolk2.png",
    "female_sewer_people3.png": "FemaleSewerFolk3.png",
    "firebreather.png": "Firebreather.png",
    "firebreather2.png": "Firebreather2.png",
    "fortuneteller.png": "Fortuneteller.png",
    "hermit.png": "Hermit.png",
    "lion_tamer.png": "LionTamer.png",
    "magician1.png": "Magician1.png",
    "magician2.png": "Magician2.png",
    "male_sewer_people1.png": "MaleSewerFolk1.png",
    "male_sewer_people2.png": "MaleSewerFolk2.png",
    "male_sewer_people3.png": "MaleSewerFolk3.png",
    "sewer_people_leader.png": "SewerFolkLeader.png",
    "strongman.png": "Strongman.png",
    "trapeze1.png": "Trapeze1.png",
    "trapeze2.png": "Trapeze2.png",
}

# ============================================================
# SOURCE PATHS
# ============================================================
VILLAGER_SRC = os.path.join(BASE, "Sprites", "Tiles Sprites", "Farm Game World", "Characters (No Faceset)")
KNIGHT_SRC = os.path.join(BASE, "Sprites", "Tiles Sprites", "Farm Game World", "Knights")
ASAI_SRC = os.path.join(BASE, "Sprites", "Tiles Sprites", "Characters ASAI")

# Track old->new path mappings for code reference updates
path_mapping = {}

def migrate_subfolder_characters(src_base, name_map, label):
    """Migrate characters that have subfolders with action PNGs."""
    count = 0
    for old_prefix, new_name in name_map.items():
        old_dir = os.path.join(src_base, old_prefix)
        new_dir = os.path.join(DEST, new_name)

        if not os.path.isdir(old_dir):
            print(f"  WARNING: {old_dir} not found, skipping")
            continue

        os.makedirs(new_dir, exist_ok=True)

        for fname in sorted(os.listdir(old_dir)):
            if not fname.lower().endswith('.png'):
                continue

            # Replace old prefix with new name in filename
            # e.g. "Character01_Walk_Down.png" -> "BlueCap_Toby_Walk_Down.png"
            new_fname = fname.replace(old_prefix, new_name)

            old_path = os.path.join(old_dir, fname)
            new_path = os.path.join(new_dir, new_fname)

            shutil.copy2(old_path, new_path)
            count += 1

            # Store relative path mapping (from repo root)
            old_rel = os.path.relpath(old_path, BASE)
            new_rel = os.path.relpath(new_path, BASE)
            path_mapping[old_rel] = new_rel

    print(f"  {label}: copied {count} files")

def migrate_asai_characters():
    """Migrate ASAI characters (flat files) into Characters folder."""
    count = 0
    for old_fname, new_fname in ASAI_RENAMES.items():
        old_path = os.path.join(ASAI_SRC, old_fname)
        new_path = os.path.join(DEST, new_fname)

        if not os.path.isfile(old_path):
            print(f"  WARNING: {old_path} not found, skipping")
            continue

        shutil.copy2(old_path, new_path)
        count += 1

        old_rel = os.path.relpath(old_path, BASE)
        new_rel = os.path.relpath(new_path, BASE)
        path_mapping[old_rel] = new_rel

    print(f"  ASAI Characters: copied {count} files")

def main():
    print("=" * 60)
    print("Character Sprite Migration")
    print("=" * 60)

    # Create destination
    os.makedirs(DEST, exist_ok=True)
    print(f"\nDestination: {DEST}")

    # Migrate each source
    print("\nMigrating villagers (Characters No Faceset)...")
    migrate_subfolder_characters(VILLAGER_SRC, VILLAGER_NAMES, "Villagers")

    print("\nMigrating knights...")
    migrate_subfolder_characters(KNIGHT_SRC, KNIGHT_NAMES, "Knights")

    print("\nMigrating ASAI characters...")
    migrate_asai_characters()

    # Save mapping for code reference updates
    mapping_path = os.path.join(BASE, "character_migration_map.json")
    with open(mapping_path, 'w') as f:
        json.dump(path_mapping, f, indent=2)
    print(f"\nPath mapping saved to: {mapping_path}")
    print(f"Total files migrated: {len(path_mapping)}")

    # Print ASAI mappings specifically (these need code updates)
    print("\n" + "=" * 60)
    print("ASAI PATH CHANGES (need code updates):")
    print("=" * 60)
    for old, new in sorted(path_mapping.items()):
        if "Characters ASAI" in old:
            print(f"  {old}")
            print(f"    -> {new}")

if __name__ == "__main__":
    main()
