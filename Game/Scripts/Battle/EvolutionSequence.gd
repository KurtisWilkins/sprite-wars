## EvolutionSequence — Executes or cancels an evolution transition.
## [Progression] When a Sprite evolves, this system updates its form_id,
## recalculates stats while preserving HP percentage, applies new abilities
## from the evolved form's learnset, and packages old/new state for UI display.
class_name EvolutionSequence
extends RefCounted


## ── Dependencies ────────────────────────────────────────────────────────────

var _ability_learner: AbilityLearner = AbilityLearner.new()


## ── Core Operations ─────────────────────────────────────────────────────────

## Execute a full evolution on a Sprite, transitioning it to the next form.
##
## Parameters:
##   sprite       — the SpriteInstance Resource to evolve
##   next_form    — Dictionary from EvolutionData describing the target form:
##     {
##       "form_id": int,
##       "stage_number": int,
##       "stat_multipliers": Dictionary,
##       "ability_changes": Array of {learn_level, ability_id, replaces_ability_id},
##       ...
##     }
##   race_data    — the SpriteRaceData for this Sprite's race (for stat recalc)
##   stage_data   — EvolutionStageData for the NEW form (for stat recalc)
##   equipment_list — Array of EquipmentData currently equipped (for stat recalc)
##   sprite_elements — the Sprite's element types
##   sprite_class    — the Sprite's class type
##
## Returns:
##   Dictionary {
##     "old_stats": Dictionary,       — stat values before evolution
##     "new_stats": Dictionary,       — stat values after evolution
##     "new_abilities": Array[int],   — ability IDs learned during evolution
##     "form_id": int,                — the new form_id
##     "old_form_id": int,            — the previous form_id
##     "stage_number": int,           — the new stage number
##   }
func execute_evolution(
	sprite: Resource,
	next_form: Dictionary,
	race_data: Resource = null,
	stage_data: Resource = null,
	equipment_list: Array = [],
	sprite_elements: Array[String] = [],
	sprite_class: String = "",
) -> Dictionary:
	var result := {
		"old_stats": {},
		"new_stats": {},
		"new_abilities": [],
		"form_id": 0,
		"old_form_id": 0,
		"stage_number": 0,
	}

	if sprite == null or not (sprite is SpriteInstance):
		push_warning("EvolutionSequence.execute_evolution: invalid sprite.")
		return result

	if next_form.is_empty():
		push_warning("EvolutionSequence.execute_evolution: empty next_form data.")
		return result

	var new_form_id: int = int(next_form.get("form_id", 0))
	if new_form_id <= 0:
		push_warning("EvolutionSequence.execute_evolution: invalid form_id in next_form.")
		return result

	# ── Snapshot old state ───────────────────────────────────────────────
	result["old_form_id"] = sprite.form_id

	# Calculate old stats if race/stage data is available.
	if race_data != null and race_data is SpriteRaceData:
		# Build a temporary EvolutionStageData for the old form if not provided.
		var old_stats: Dictionary = _calculate_stats_snapshot(
			sprite, race_data, null, equipment_list, sprite_elements, sprite_class
		)
		result["old_stats"] = old_stats

	# ── Preserve HP percentage ───────────────────────────────────────────
	var old_max_hp: int = maxi(1, int(result["old_stats"].get("hp", sprite.current_hp)))
	var hp_percentage: float = clampf(
		float(sprite.current_hp) / float(old_max_hp),
		0.0,
		1.0,
	)

	# ── Update form ──────────────────────────────────────────────────────
	sprite.form_id = new_form_id
	result["form_id"] = new_form_id
	result["stage_number"] = int(next_form.get("stage_number", 0))

	# ── Recalculate stats with new form ──────────────────────────────────
	if race_data != null and stage_data != null:
		var new_stats := sprite.calculate_all_effective_stats(
			race_data, stage_data, equipment_list, sprite_elements, sprite_class
		)
		result["new_stats"] = new_stats

		# Restore HP at the preserved percentage of new max.
		var new_max_hp: int = maxi(1, int(new_stats.get("hp", 1)))
		sprite.current_hp = maxi(1, int(float(new_max_hp) * hp_percentage))
	else:
		# Without full data, apply stat multipliers directly as ratios.
		var new_stats := _estimate_stats_from_multipliers(sprite, next_form)
		result["new_stats"] = new_stats

		# Rough HP preservation.
		var est_new_hp: int = maxi(1, int(new_stats.get("hp", sprite.current_hp)))
		sprite.current_hp = maxi(1, int(float(est_new_hp) * hp_percentage))

	# ── Learn new abilities from the evolved form ────────────────────────
	var ability_changes: Array = next_form.get("ability_changes", [])
	var new_abilities: Array[int] = []

	for change in ability_changes:
		var learn_level: int = int(change.get("learn_level", 0))
		var ability_id: int = int(change.get("ability_id", 0))
		var replaces: int = int(change.get("replaces_ability_id", -1))

		# Learn abilities whose level requirement has already been met.
		if learn_level <= sprite.level and ability_id > 0:
			var learn_result := _ability_learner.learn_ability_with_replace(
				sprite, ability_id, replaces
			)
			if learn_result.get("learned", false):
				new_abilities.append(ability_id)

	result["new_abilities"] = new_abilities

	return result


## Cancel an in-progress evolution, reverting the Sprite to its original form.
## This should be called before any permanent side effects (like saving) occur.
##
## Parameters:
##   sprite           — the SpriteInstance Resource
##   original_form_id — the form_id to revert to
func cancel_evolution(sprite: Resource, original_form_id: int) -> void:
	if sprite == null or not (sprite is SpriteInstance):
		push_warning("EvolutionSequence.cancel_evolution: invalid sprite.")
		return

	if original_form_id <= 0:
		push_warning("EvolutionSequence.cancel_evolution: invalid original_form_id.")
		return

	sprite.form_id = original_form_id


## ── Stat Comparison ─────────────────────────────────────────────────────────

## Get a stat comparison between current and evolved forms for UI display.
##
## Parameters:
##   old_stats — Dictionary of stat_key → int for the current form
##   new_stats — Dictionary of stat_key → int for the evolved form
##
## Returns:
##   Dictionary of stat_key → {
##     "old": int, "new": int, "diff": int, "label": String
##   }
func compare_stats(old_stats: Dictionary, new_stats: Dictionary) -> Dictionary:
	var comparison := {}

	for key in SpriteInstance.STAT_KEYS:
		var old_val: int = int(old_stats.get(key, 0))
		var new_val: int = int(new_stats.get(key, 0))
		var diff: int = new_val - old_val
		var label: String = ""
		if diff > 0:
			label = "increased"
		elif diff < 0:
			label = "decreased"
		else:
			label = "unchanged"

		comparison[key] = {
			"old": old_val,
			"new": new_val,
			"diff": diff,
			"label": label,
		}

	return comparison


## ── Internal Helpers ────────────────────────────────────────────────────────

## Calculate a stat snapshot for the current Sprite state.
func _calculate_stats_snapshot(
	sprite: SpriteInstance,
	race_data: Resource,
	_stage_data: Resource,
	equipment_list: Array,
	sprite_elements: Array[String],
	sprite_class: String,
) -> Dictionary:
	# If we have proper stage data, use the full calculation.
	# Otherwise, build an approximate result from base stats + level.
	if race_data is SpriteRaceData:
		var stats := {}
		for key in SpriteInstance.STAT_KEYS:
			var base_at_level: int = race_data.get_stat_at_level(key, sprite.level)
			var iv_bonus: int = int(sprite.iv_stats.get(key, 0))
			var equip_bonus: int = 0
			for equip in equipment_list:
				if equip is EquipmentData:
					var bonuses: Dictionary = equip.get_effective_stat_bonuses(
						sprite_elements, sprite_class
					)
					equip_bonus += int(bonuses.get(key, 0))
			var total: int = base_at_level + iv_bonus + equip_bonus
			if key == "hp":
				total += sprite.level + 10
			stats[key] = maxi(1, total)
		return stats
	return {}


## Estimate stats using the new form's stat multipliers applied to
## a rough base (level * 5 as placeholder when race_data is not available).
func _estimate_stats_from_multipliers(
	sprite: SpriteInstance,
	next_form: Dictionary,
) -> Dictionary:
	var multipliers: Dictionary = next_form.get("stat_multipliers", {})
	var stats := {}
	for key in SpriteInstance.STAT_KEYS:
		var rough_base: float = float(sprite.level) * 5.0
		var mult: float = float(multipliers.get(key, 1.0))
		var iv_bonus: int = int(sprite.iv_stats.get(key, 0))
		var total: int = int(rough_base * mult) + iv_bonus
		if key == "hp":
			total += sprite.level + 10
		stats[key] = maxi(1, total)
	return stats
