## ElementEffectivenessLookup — High-level API for element type effectiveness queries.
## [Progression] Wraps the 14x14 ElementChart to provide dual-type effectiveness
## calculations, human-readable labels, and element weakness/resistance lookups.
## All data is loaded from ElementChart.gd at construction time.
class_name ElementEffectivenessLookup
extends RefCounted


## ── Constants ───────────────────────────────────────────────────────────────

## Effectiveness multiplier thresholds.
const IMMUNE_THRESHOLD: float = 0.01
const NOT_VERY_EFFECTIVE_THRESHOLD: float = 0.75
const SUPER_EFFECTIVE_THRESHOLD: float = 1.5

## Labels.
const LABEL_IMMUNE: String = "immune"
const LABEL_NOT_VERY_EFFECTIVE: String = "not_very_effective"
const LABEL_NEUTRAL: String = "neutral"
const LABEL_SUPER_EFFECTIVE: String = "super_effective"
const LABEL_ULTRA_EFFECTIVE: String = "ultra_effective"  # 4x vs dual-type


## ── Cached Data ─────────────────────────────────────────────────────────────

## The full 14x14 chart, loaded once on construction.
var _chart: Dictionary = {}

## Element name <-> ID mappings.
var _element_ids: Dictionary = {}
var _element_names: Dictionary = {}

## Ordered list of all element names.
var _all_elements: Array[String] = []


## ── Initialization ──────────────────────────────────────────────────────────

func _init() -> void:
	_chart = ElementChart.get_chart()
	_element_ids = ElementChart.ELEMENT_IDS.duplicate()
	_element_names = ElementChart.ELEMENT_NAMES.duplicate()

	# Build sorted element list.
	for eid: int in _element_names:
		_all_elements.append(str(_element_names[eid]))
	_all_elements.sort()


## ── Core Operations ─────────────────────────────────────────────────────────

## Get the combined effectiveness multiplier of an attacking element against
## one or more defending elements. For dual-type defenders, the multipliers
## are multiplied together (e.g., Fire vs Grass/Ice = 2.0 * 2.0 = 4.0).
##
## Parameters:
##   attacking — the attacking element name (e.g. "Fire")
##   defending — Array of defending element names (1 or 2 elements)
##
## Returns:
##   Combined effectiveness multiplier (0.0 for immune, through 4.0 for 4x).
func get_effectiveness(attacking: String, defending: Array[String]) -> float:
	if attacking.is_empty() or defending.is_empty():
		return 1.0

	var total: float = 1.0
	for def_elem: String in defending:
		total *= _get_single_effectiveness(attacking, def_elem)

	return total


## Get a human-readable label for a given effectiveness multiplier.
##
## Parameters:
##   multiplier — the effectiveness value
##
## Returns:
##   One of: "immune", "not_very_effective", "neutral", "super_effective",
##   "ultra_effective"
func get_label(multiplier: float) -> String:
	if multiplier < IMMUNE_THRESHOLD:
		return LABEL_IMMUNE
	elif multiplier < NOT_VERY_EFFECTIVE_THRESHOLD:
		return LABEL_NOT_VERY_EFFECTIVE
	elif multiplier > 3.5:
		return LABEL_ULTRA_EFFECTIVE
	elif multiplier > SUPER_EFFECTIVE_THRESHOLD:
		return LABEL_SUPER_EFFECTIVE
	else:
		return LABEL_NEUTRAL


## Get all elements that deal super-effective damage AGAINST the given element
## when it is defending. These are the defending element's weaknesses.
##
## Parameters:
##   element — the defending element name
##
## Returns:
##   Array of element names that are super effective when attacking this element.
func get_weaknesses(element: String) -> Array[String]:
	var weaknesses: Array[String] = []
	var def_id: int = _element_ids.get(element, 0)
	if def_id == 0:
		return weaknesses

	# Scan all attacking elements for super-effective matchups against this element.
	for atk_id: int in _chart:
		var matchups: Dictionary = _chart[atk_id]
		var mult: float = float(matchups.get(def_id, 1.0))
		if mult >= 2.0:
			var atk_name: String = str(_element_names.get(atk_id, ""))
			if not atk_name.is_empty():
				weaknesses.append(atk_name)

	return weaknesses


## Get all elements that deal reduced (not very effective) damage AGAINST
## the given element when it is defending. These are the element's resistances.
##
## Parameters:
##   element — the defending element name
##
## Returns:
##   Array of element names that are not very effective when attacking this element.
func get_resistances(element: String) -> Array[String]:
	var resistances: Array[String] = []
	var def_id: int = _element_ids.get(element, 0)
	if def_id == 0:
		return resistances

	# Scan all attacking elements for resisted matchups against this element.
	for atk_id: int in _chart:
		var matchups: Dictionary = _chart[atk_id]
		var mult: float = float(matchups.get(def_id, 1.0))
		if mult > IMMUNE_THRESHOLD and mult <= 0.5:
			var atk_name: String = str(_element_names.get(atk_id, ""))
			if not atk_name.is_empty():
				resistances.append(atk_name)

	return resistances


## Get all elements that the given element is immune to when defending.
##
## Parameters:
##   element — the defending element name
##
## Returns:
##   Array of element names that deal 0 damage to this element.
func get_immunities(element: String) -> Array[String]:
	var immunities: Array[String] = []
	var def_id: int = _element_ids.get(element, 0)
	if def_id == 0:
		return immunities

	for atk_id: int in _chart:
		var matchups: Dictionary = _chart[atk_id]
		var mult: float = float(matchups.get(def_id, 1.0))
		if mult < IMMUNE_THRESHOLD:
			var atk_name: String = str(_element_names.get(atk_id, ""))
			if not atk_name.is_empty():
				immunities.append(atk_name)

	return immunities


## ── Offensive Queries ───────────────────────────────────────────────────────

## Get all elements that the given ATTACKING element is super effective against.
##
## Parameters:
##   element — the attacking element name
##
## Returns:
##   Array of element names that this element is super effective against.
func get_strengths(element: String) -> Array[String]:
	return ElementChart.get_strengths(element)


## Get all elements that the given ATTACKING element is resisted by.
##
## Parameters:
##   element — the attacking element name
##
## Returns:
##   Array of element names that resist this element's attacks.
func get_resisted_by(element: String) -> Array[String]:
	return ElementChart.get_weaknesses(element)


## ── Dual-Type Analysis ──────────────────────────────────────────────────────

## Get the full defensive profile for a dual-type Sprite.
##
## Parameters:
##   defending_elements — Array of 1-2 element names
##
## Returns:
##   Dictionary {
##     "weaknesses": Array[Dictionary],    — { "element": String, "multiplier": float }
##     "resistances": Array[Dictionary],   — { "element": String, "multiplier": float }
##     "immunities": Array[String],        — element names
##     "neutrals": Array[String],          — element names
##   }
func get_defensive_profile(defending_elements: Array[String]) -> Dictionary:
	var profile := {
		"weaknesses": [],
		"resistances": [],
		"immunities": [],
		"neutrals": [],
	}

	for atk_name: String in _all_elements:
		var mult: float = get_effectiveness(atk_name, defending_elements)

		if mult < IMMUNE_THRESHOLD:
			profile["immunities"].append(atk_name)
		elif mult < NOT_VERY_EFFECTIVE_THRESHOLD:
			profile["resistances"].append({
				"element": atk_name,
				"multiplier": mult,
			})
		elif mult > SUPER_EFFECTIVE_THRESHOLD:
			profile["weaknesses"].append({
				"element": atk_name,
				"multiplier": mult,
			})
		else:
			profile["neutrals"].append(atk_name)

	return profile


## ── Utility ─────────────────────────────────────────────────────────────────

## Get all 14 element names in sorted order.
func get_all_elements() -> Array[String]:
	return _all_elements.duplicate()


## Check if a string is a valid element name.
func is_valid_element(element: String) -> bool:
	return _element_ids.has(element)


## Get the element ID for a given name, or 0 if not found.
func get_element_id(element_name: String) -> int:
	return int(_element_ids.get(element_name, 0))


## Get the element name for a given ID, or "" if not found.
func get_element_name(element_id: int) -> String:
	return str(_element_names.get(element_id, ""))


## ── Internal Helpers ────────────────────────────────────────────────────────

## Get the single-element-vs-single-element multiplier.
func _get_single_effectiveness(attacking: String, defending: String) -> float:
	var atk_id: int = _element_ids.get(attacking, 0)
	var def_id: int = _element_ids.get(defending, 0)

	if atk_id == 0 or def_id == 0:
		return 1.0

	if not _chart.has(atk_id):
		return 1.0

	return float(_chart[atk_id].get(def_id, 1.0))
