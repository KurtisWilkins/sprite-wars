## AssassinTeleportSystem — Handles the teleport mechanic for Assassin-class
## units. Allows teleporting behind a target on the battle grid before
## striking, granting bonus damage and guaranteed critical hit chance.
##
## Teleport is available to Assassin-class units as a special ability modifier.
## When an Assassin uses certain abilities, they can teleport to an adjacent
## cell behind the target before the attack resolves.
##
## Grid rules:
##   - Teleport destination is the cell directly behind the target (relative
##     to the attacker's original position).
##   - If that cell is occupied or off-grid, try adjacent alternatives.
##   - After the attack, the Assassin remains at the teleport destination
##     (they do NOT return to their original position).
class_name AssassinTeleportSystem
extends RefCounted


## ── Constants ────────────────────────────────────────────────────────────────

## Bonus critical hit rate when teleport-striking.
const TELEPORT_CRIT_BONUS: float = 0.25

## Damage multiplier for teleport backstab.
const BACKSTAB_DAMAGE_MULTIPLIER: float = 1.3

## Class types that can use teleport.
const TELEPORT_CLASS_TYPES: PackedStringArray = PackedStringArray(["Assassin"])

## Ability targeting types that support teleport.
const TELEPORT_TARGETING_TYPES: PackedStringArray = PackedStringArray([
	"single", "pierce",
])


## ── Teleport Eligibility ────────────────────────────────────────────────────

## Check if a unit can perform a teleport strike.
## Requires: Assassin class, single-target damaging ability, target is alive.
static func can_teleport(
	caster: BattleUnit,
	ability: AbilityData,
	target: BattleUnit,
) -> bool:
	if caster == null or target == null:
		return false
	if not caster.is_alive or not target.is_alive:
		return false

	# Check class eligibility via class_type string.
	var caster_class_type: String = ""
	if caster.sprite_instance != null:
		caster_class_type = caster.sprite_instance.class_type
	if caster_class_type not in TELEPORT_CLASS_TYPES:
		return false

	# Must be a damaging ability.
	if not ability.is_damaging():
		return false

	# Must use a compatible targeting type.
	if ability.targeting_type not in TELEPORT_TARGETING_TYPES:
		return false

	return true


## ── Teleport Execution ──────────────────────────────────────────────────────

## Calculate the teleport destination and execute the grid move.
##
## [caster] -- The Assassin unit teleporting.
## [target] -- The target being backstabbed.
## [grid]   -- The BattleGrid for position queries and movement.
##
## Returns:
## {
##   success: bool,           -- Whether the teleport was executed
##   from_pos: Vector2i,      -- Original grid position
##   to_pos: Vector2i,        -- New grid position after teleport
##   crit_bonus: float,       -- Additional crit rate from backstab
##   damage_multiplier: float -- Damage multiplier from backstab
## }
static func execute_teleport(
	caster: BattleUnit,
	target: BattleUnit,
	grid: BattleGrid,
) -> Dictionary:
	var result := {
		"success": false,
		"from_pos": caster.grid_position,
		"to_pos": caster.grid_position,
		"crit_bonus": 0.0,
		"damage_multiplier": 1.0,
	}

	# Calculate "behind" direction: opposite of the direction from caster to target.
	var attack_dir: Vector2i = target.grid_position - caster.grid_position
	if attack_dir == Vector2i.ZERO:
		return result

	var behind_dir: Vector2i = Vector2i(signi(attack_dir.x), signi(attack_dir.y))
	var behind_pos: Vector2i = target.grid_position + behind_dir

	# Try the ideal position first, then fallback positions.
	var destination: Vector2i = _find_teleport_destination(behind_pos, target.grid_position, grid)

	# Validate the destination is a valid empty cell (not the caster's current pos).
	if not grid.is_valid_position(destination) or not grid.is_cell_empty(destination):
		return result
	if destination == caster.grid_position:
		return result

	# Save origin before the grid move updates caster.grid_position.
	var origin_pos: Vector2i = caster.grid_position

	# Execute the grid move.
	grid.remove_unit(origin_pos)
	grid.place_unit(caster, destination)

	result["success"] = true
	result["from_pos"] = origin_pos
	result["to_pos"] = destination
	result["crit_bonus"] = TELEPORT_CRIT_BONUS
	result["damage_multiplier"] = BACKSTAB_DAMAGE_MULTIPLIER

	return result


## ── Destination Finding ─────────────────────────────────────────────────────

## Find a valid empty cell for the teleport. Tries the ideal position first,
## then adjacent cells around the target.
static func _find_teleport_destination(
	ideal_pos: Vector2i,
	target_pos: Vector2i,
	grid: BattleGrid,
) -> Vector2i:
	# Try ideal position (directly behind target).
	if grid.is_valid_position(ideal_pos) and grid.is_cell_empty(ideal_pos):
		return ideal_pos

	# Try adjacent cells around the target (excluding target's cell).
	var adjacent: Array[Vector2i] = grid.get_adjacent_cells(target_pos)
	for cell in adjacent:
		if grid.is_cell_empty(cell):
			return cell

	# No valid position found.
	return ideal_pos  # Will fail the success check in caller.


## ── Utility ─────────────────────────────────────────────────────────────────

## Get the visual description for a teleport action (for event log).
static func get_teleport_description(caster_name: String) -> String:
	return "%s vanishes into shadow and reappears behind the target!" % caster_name
