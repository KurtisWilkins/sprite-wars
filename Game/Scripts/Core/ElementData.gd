## ElementData — Data schema for one of the 14 element types.
## [P1-009] Stores element identity, visual data, and the full type effectiveness
## chart. Includes a static helper for computing multiplied effectiveness
## against dual-type defenders.
class_name ElementData
extends Resource

## ── Identity ──────────────────────────────────────────────────────────────────

@export var element_id: int = 0
@export var element_name: String = ""

## ── Presentation ──────────────────────────────────────────────────────────────

@export_file("*.png,*.tres") var icon_path: String = ""
@export var color: Color = Color.WHITE

## ── Type Effectiveness ────────────────────────────────────────────────────────

## Maps defending element_id (int) → damage multiplier (float).
## Typical values: 2.0 (super effective), 1.0 (neutral), 0.5 (not very effective),
## 0.0 (immune). Missing keys default to 1.0 (neutral).
@export var effectiveness_chart: Dictionary = {}


## ── Constants ─────────────────────────────────────────────────────────────────

## The 14 canonical element names used across the game.
const ELEMENT_NAMES: PackedStringArray = PackedStringArray([
	"Fire", "Water", "Earth", "Air",
	"Light", "Dark", "Nature", "Electric",
	"Ice", "Metal", "Poison", "Psychic",
	"Spirit", "Chaos",
])

const SUPER_EFFECTIVE_THRESHOLD: float = 1.5
const NOT_EFFECTIVE_THRESHOLD: float = 0.75
const IMMUNE_THRESHOLD: float = 0.01


## ── Instance Helpers ──────────────────────────────────────────────────────────

## Get the raw multiplier when this element attacks a single defending element.
func get_multiplier_against(defending_element_id: int) -> float:
	return float(effectiveness_chart.get(defending_element_id, 1.0))


## ── Static Helpers ────────────────────────────────────────────────────────────

## Calculate the total effectiveness multiplier when an attack of
## [attacking_element_id] hits a defender with one or more element IDs.
## For dual-type defenders the multipliers are multiplied together:
##   e.g. Fire vs Water/Nature → 0.5 * 2.0 = 1.0
##
## [element_registry] is a Dictionary mapping element_id → ElementData resource.
## This avoids a singleton dependency and keeps the function pure.
static func get_effectiveness(
	attacking_element_id: int,
	defending_element_ids: Array,
	element_registry: Dictionary,
) -> float:
	var attacker: ElementData = element_registry.get(attacking_element_id) as ElementData
	if attacker == null:
		push_warning("ElementData.get_effectiveness: unknown attacking_element_id %d" % attacking_element_id)
		return 1.0

	var total_mult: float = 1.0
	for def_id in defending_element_ids:
		var mult: float = attacker.get_multiplier_against(int(def_id))
		total_mult *= mult

	return total_mult


## Convenience: determine the human-readable category string for a multiplier.
static func effectiveness_label(multiplier: float) -> String:
	if multiplier < IMMUNE_THRESHOLD:
		return "immune"
	elif multiplier < NOT_EFFECTIVE_THRESHOLD:
		return "not_very_effective"
	elif multiplier > SUPER_EFFECTIVE_THRESHOLD:
		return "super_effective"
	else:
		return "neutral"


## ── Validation ────────────────────────────────────────────────────────────────

func validate() -> Array[String]:
	var errors: Array[String] = []
	if element_id <= 0:
		errors.append("element_id must be a positive integer.")
	if element_name.is_empty():
		errors.append("element_name is required.")
	if element_name not in ELEMENT_NAMES:
		errors.append("element_name '%s' is not in ELEMENT_NAMES." % element_name)
	for key in effectiveness_chart:
		var val = effectiveness_chart[key]
		if not (val is float or val is int):
			errors.append("effectiveness_chart[%s] must be numeric." % str(key))
		elif float(val) < 0.0:
			errors.append("effectiveness_chart[%s] must be >= 0." % str(key))
	return errors
