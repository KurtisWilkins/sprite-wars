## MainQuestData — Static database of the first 10 main story quests.
## Each quest follows the QuestData schema: quest_id, title, description,
## quest_type, quest_giver_npc_id, objectives, prerequisite_quest_ids, rewards.
class_name MainQuestData
extends RefCounted


static func get_all_quests() -> Array[Dictionary]:
	return [
		# ── Quest 1: A New Journey ───────────────────────────────────────
		# Tutorial opener: meet the professor, receive your starter Sprite.
		{
			"quest_id": 1,
			"title": "A New Journey",
			"description": "Welcome to the world of Sprite Wars! Visit Professor Elm in Starter Town to receive your very first Sprite and begin your adventure.",
			"quest_type": "main",
			"quest_giver_npc_id": "professor_elm",
			"objectives": [
				{
					"type": "talk_to_npc",
					"target": "professor_elm",
					"count": 1,
					"description": "Talk to Professor Elm in Starter Town.",
				},
			],
			"prerequisite_quest_ids": [],
			"rewards": {
				"xp": 50,
				"currency": 100,
				"items": [
					{"item_id": 201, "count": 5},  # 5 Basic Crystals
				],
				"unlocks": ["route_1"],
			},
		},

		# ── Quest 2: First Steps ─────────────────────────────────────────
		# Venture out: travel to Route 1 and encounter your first wild Sprite.
		{
			"quest_id": 2,
			"title": "First Steps",
			"description": "Professor Elm mentioned wild Sprites can be found along Route 1. Head there and experience your first wild encounter!",
			"quest_type": "main",
			"quest_giver_npc_id": "professor_elm",
			"objectives": [
				{
					"type": "reach_area",
					"target": "route_1",
					"count": 1,
					"description": "Travel to Route 1.",
				},
				{
					"type": "win_battle_condition",
					"target": "any",
					"count": 1,
					"description": "Win your first battle against a wild Sprite.",
				},
			],
			"prerequisite_quest_ids": [1],
			"rewards": {
				"xp": 75,
				"currency": 50,
				"items": [
					{"item_id": 101, "count": 3},  # 3 Basic Potions
				],
				"unlocks": [],
			},
		},

		# ── Quest 3: Crystal Apprentice ──────────────────────────────────
		# First catch: use a Basic Crystal to capture a wild Sprite.
		{
			"quest_id": 3,
			"title": "Crystal Apprentice",
			"description": "Now that you have Basic Crystals, try catching a wild Sprite! Weaken it in battle first, then throw a Crystal to capture it.",
			"quest_type": "main",
			"quest_giver_npc_id": "professor_elm",
			"objectives": [
				{
					"type": "catch_sprite",
					"target": "any",
					"count": 1,
					"description": "Catch your first wild Sprite using a Basic Crystal.",
				},
			],
			"prerequisite_quest_ids": [2],
			"rewards": {
				"xp": 100,
				"currency": 75,
				"items": [
					{"item_id": 201, "count": 10},  # 10 Basic Crystals
				],
				"unlocks": [],
			},
		},

		# ── Quest 4: Team Builder ────────────────────────────────────────
		# Team assembly: build a team of 3 or more Sprites.
		{
			"quest_id": 4,
			"title": "Team Builder",
			"description": "A single Sprite cannot conquer the temples alone. Catch and train until you have a team of at least 3 Sprites ready for battle!",
			"quest_type": "main",
			"quest_giver_npc_id": "professor_elm",
			"objectives": [
				{
					"type": "catch_sprite",
					"target": "any",
					"count": 2,
					"description": "Catch 2 more wild Sprites (3 total team members).",
				},
			],
			"prerequisite_quest_ids": [3],
			"rewards": {
				"xp": 150,
				"currency": 150,
				"items": [
					{"item_id": 102, "count": 3},  # 3 Super Potions
				],
				"unlocks": ["fire_temple_region"],
			},
		},

		# ── Quest 5: The Fire Temple ─────────────────────────────────────
		# Temple introduction: travel to and enter the Fire Temple.
		{
			"quest_id": 5,
			"title": "The Fire Temple",
			"description": "The Fire Temple lies in the Volcanic Highlands to the east. It is the first of many temples that hold ancient power. Travel there and step inside to prove your worth.",
			"quest_type": "main",
			"quest_giver_npc_id": "temple_guide_kira",
			"objectives": [
				{
					"type": "reach_area",
					"target": "fire_temple_entrance",
					"count": 1,
					"description": "Travel to the Fire Temple entrance.",
				},
			],
			"prerequisite_quest_ids": [4],
			"rewards": {
				"xp": 100,
				"currency": 100,
				"items": [
					{"item_id": 101, "count": 5},  # 5 Basic Potions
					{"item_id": 301, "count": 2},  # 2 Burn Heals
				],
				"unlocks": [],
			},
		},

		# ── Quest 6: Trial by Fire ───────────────────────────────────────
		# Temple completion: clear all areas and defeat the Fire Temple boss.
		{
			"quest_id": 6,
			"title": "Trial by Fire",
			"description": "The Fire Temple is filled with powerful Fire-type Sprites. Navigate its chambers, defeat the guardians, and face the temple boss to claim the Flame Emblem!",
			"quest_type": "main",
			"quest_giver_npc_id": "temple_guide_kira",
			"objectives": [
				{
					"type": "complete_temple",
					"target": "1",  # Fire Temple ID
					"count": 1,
					"description": "Clear the Fire Temple and defeat its boss.",
				},
			],
			"prerequisite_quest_ids": [5],
			"rewards": {
				"xp": 500,
				"currency": 300,
				"items": [
					{"item_id": 202, "count": 5},  # 5 Great Crystals
				],
				"unlocks": [
					"bonus_1",   # Fire element composition bonus
					"route_3",
				],
			},
		},

		# ── Quest 7: Evolution Awakening ─────────────────────────────────
		# Evolution tutorial: evolve one Sprite to Stage 2.
		{
			"quest_id": 7,
			"title": "Evolution Awakening",
			"description": "Your Sprites grow stronger through evolution! Train one of your Sprites until it reaches the level threshold and triggers evolution to its Stage 2 form.",
			"quest_type": "main",
			"quest_giver_npc_id": "professor_elm",
			"objectives": [
				{
					"type": "win_battle_condition",
					"target": "any",
					"count": 10,
					"description": "Win 10 battles to level up your team.",
				},
			],
			"prerequisite_quest_ids": [6],
			"rewards": {
				"xp": 300,
				"currency": 200,
				"items": [
					{"item_id": 401, "count": 1},  # 1 Evolution Catalyst
				],
				"unlocks": [],
			},
		},

		# ── Quest 8: Elemental Explorer ──────────────────────────────────
		# Mid-game milestone: clear 3 different elemental temples.
		{
			"quest_id": 8,
			"title": "Elemental Explorer",
			"description": "The temples hold the keys to mastering the elements. Prove your versatility by clearing three different elemental temples across the world.",
			"quest_type": "main",
			"quest_giver_npc_id": "temple_guide_kira",
			"objectives": [
				{
					"type": "complete_temple",
					"target": "1",  # Fire Temple
					"count": 1,
					"description": "Clear the Fire Temple.",
				},
				{
					"type": "complete_temple",
					"target": "2",  # Water Temple
					"count": 1,
					"description": "Clear the Water Temple.",
				},
				{
					"type": "complete_temple",
					"target": "3",  # Nature Temple
					"count": 1,
					"description": "Clear the Nature Temple.",
				},
			],
			"prerequisite_quest_ids": [7],
			"rewards": {
				"xp": 750,
				"currency": 500,
				"items": [
					{"item_id": 203, "count": 3},  # 3 Ultra Crystals
					{"item_id": 103, "count": 5},  # 5 Max Potions
				],
				"unlocks": [
					"route_5",
					"bonus_2",   # Water element composition bonus
					"bonus_3",   # Nature element composition bonus
				],
			},
		},

		# ── Quest 9: The Rival Appears ───────────────────────────────────
		# Rival battle: defeat the rival trainer on Route 5.
		{
			"quest_id": 9,
			"title": "The Rival Appears",
			"description": "A powerful trainer named Vex has been challenging everyone on Route 5. Seek them out and prove you are the stronger Sprite commander!",
			"quest_type": "main",
			"quest_giver_npc_id": "traveler_npc",
			"objectives": [
				{
					"type": "reach_area",
					"target": "route_5",
					"count": 1,
					"description": "Travel to Route 5.",
				},
				{
					"type": "win_battle_condition",
					"target": "rival_battle",
					"count": 1,
					"description": "Defeat your rival, Vex, in battle.",
				},
			],
			"prerequisite_quest_ids": [8],
			"rewards": {
				"xp": 600,
				"currency": 400,
				"items": [
					{"item_id": 501, "count": 1},  # Rival's Badge (key item)
				],
				"unlocks": [
					"dark_temple_region",
				],
			},
		},

		# ── Quest 10: Dark Omens ─────────────────────────────────────────
		# Story hook: investigate strange activity at the Dark Temple entrance.
		{
			"quest_id": 10,
			"title": "Dark Omens",
			"description": "Villagers report eerie shadows and unnatural silence near the Dark Temple. Something sinister stirs within. Investigate the entrance and uncover the source of the disturbance.",
			"quest_type": "main",
			"quest_giver_npc_id": "village_elder",
			"objectives": [
				{
					"type": "reach_area",
					"target": "dark_temple_entrance",
					"count": 1,
					"description": "Reach the Dark Temple entrance.",
				},
				{
					"type": "talk_to_npc",
					"target": "dark_temple_guardian",
					"count": 1,
					"description": "Speak with the Dark Temple Guardian.",
				},
				{
					"type": "defeat_enemies",
					"target": "8",  # Gloomshade (Dark element, race_id 8)
					"count": 3,
					"description": "Defeat 3 corrupted Gloomshades near the entrance.",
				},
			],
			"prerequisite_quest_ids": [9],
			"rewards": {
				"xp": 800,
				"currency": 500,
				"items": [
					{"item_id": 203, "count": 5},  # 5 Ultra Crystals
					{"item_id": 103, "count": 5},  # 5 Max Potions
					{"item_id": 502, "count": 1},  # Dark Temple Key (key item)
				],
				"unlocks": [
					"dark_temple",
				],
			},
		},
	]


## ── Helpers ─────────────────────────────────────────────────────────────────

## Find a specific quest by ID.
static func get_quest(quest_id: int) -> Dictionary:
	var all_quests: Array[Dictionary] = get_all_quests()
	for quest: Dictionary in all_quests:
		if int(quest.get("quest_id", 0)) == quest_id:
			return quest
	return {}


## Get quests that are unlockable given a set of completed quest IDs.
static func get_available_quests(completed_ids: Array[int]) -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for quest: Dictionary in get_all_quests():
		var qid: int = int(quest.get("quest_id", 0))
		if qid in completed_ids:
			continue
		var prereqs: Array = quest.get("prerequisite_quest_ids", [])
		var all_met: bool = true
		for prereq_id in prereqs:
			if int(prereq_id) not in completed_ids:
				all_met = false
				break
		if all_met:
			result.append(quest)
	return result
