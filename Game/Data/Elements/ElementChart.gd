## ElementChart — Full 14x14 element type effectiveness chart.
## [P1-010] Returns a nested Dictionary mapping attacking_element_id to
## {defending_element_id: multiplier}. Only non-1.0 values are stored;
## missing keys default to 1.0 (neutral).
##
## Design principles:
##   - No element is universally dominant
##   - Every element has 2-3 weaknesses and 2-3 resistances
##   - Some immunities exist (Electric immune to Electric)
##   - Super effective = 2.0, not very effective = 0.5, immune = 0.0
##   - Dual-type: multiply both matchups (handled by ElementData.get_effectiveness)
##
## Element IDs (matching ElementData.ELEMENT_NAMES order):
##   1=Fire, 2=Water, 3=Earth, 4=Air, 5=Light, 6=Dark,
##   7=Nature, 8=Electric, 9=Ice, 10=Metal, 11=Poison,
##   12=Psychic, 13=Spirit, 14=Chaos
class_name ElementChart
extends RefCounted

# Element name-to-ID mapping for convenience.
const ELEMENT_IDS: Dictionary = {
	"Fire": 1, "Water": 2, "Earth": 3, "Air": 4,
	"Light": 5, "Dark": 6, "Nature": 7, "Electric": 8,
	"Ice": 9, "Metal": 10, "Poison": 11, "Psychic": 12,
	"Spirit": 13, "Chaos": 14,
}

const ELEMENT_NAMES: Dictionary = {
	1: "Fire", 2: "Water", 3: "Earth", 4: "Air",
	5: "Light", 6: "Dark", 7: "Nature", 8: "Electric",
	9: "Ice", 10: "Metal", 11: "Poison", 12: "Psychic",
	13: "Spirit", 14: "Chaos",
}


## Return the full effectiveness chart as {attacking_element_id: {defending_element_id: multiplier}}.
## Only stores non-1.0 matchups; callers should treat missing keys as 1.0.
static func get_chart() -> Dictionary:
	return {
		# ── Fire (1) ──
		# Strong vs: Nature, Ice, Metal
		# Weak vs:   Water, Earth, Fire
		1: {
			7: 2.0,   # Fire > Nature
			9: 2.0,   # Fire > Ice
			10: 2.0,  # Fire > Metal
			2: 0.5,   # Fire < Water
			3: 0.5,   # Fire < Earth
			1: 0.5,   # Fire < Fire (resistance)
		},

		# ── Water (2) ──
		# Strong vs: Fire, Earth
		# Weak vs:   Nature, Electric, Poison
		2: {
			1: 2.0,   # Water > Fire
			3: 2.0,   # Water > Earth
			7: 0.5,   # Water < Nature
			8: 0.5,   # Water < Electric
			11: 0.5,  # Water < Poison
		},

		# ── Earth (3) ──
		# Strong vs: Fire, Electric, Metal, Poison
		# Weak vs:   Water, Nature, Ice
		# Immune:    (none)
		3: {
			1: 2.0,   # Earth > Fire
			8: 2.0,   # Earth > Electric
			10: 2.0,  # Earth > Metal
			11: 2.0,  # Earth > Poison
			2: 0.5,   # Earth < Water
			7: 0.5,   # Earth < Nature
			9: 0.5,   # Earth < Ice
		},

		# ── Air (4) ──
		# Strong vs: Nature, Poison
		# Weak vs:   Electric, Ice, Earth
		4: {
			7: 2.0,   # Air > Nature
			11: 2.0,  # Air > Poison
			8: 0.5,   # Air < Electric
			9: 0.5,   # Air < Ice
			3: 0.5,   # Air < Earth
		},

		# ── Light (5) ──
		# Strong vs: Dark, Poison, Spirit
		# Weak vs:   Dark (mutual), Chaos
		5: {
			6: 2.0,   # Light > Dark
			11: 2.0,  # Light > Poison
			13: 2.0,  # Light > Spirit
			14: 0.5,  # Light < Chaos
			5: 0.5,   # Light < Light (resistance)
		},

		# ── Dark (6) ──
		# Strong vs: Light, Psychic, Spirit
		# Weak vs:   Light (mutual), Psychic (mutual resistance)
		6: {
			5: 2.0,   # Dark > Light
			12: 2.0,  # Dark > Psychic
			13: 2.0,  # Dark > Spirit
			14: 0.5,  # Dark < Chaos
			6: 0.5,   # Dark < Dark (resistance)
		},

		# ── Nature (7) ──
		# Strong vs: Water, Earth
		# Weak vs:   Fire, Ice, Poison
		7: {
			2: 2.0,   # Nature > Water
			3: 2.0,   # Nature > Earth
			1: 0.5,   # Nature < Fire
			9: 0.5,   # Nature < Ice
			11: 0.5,  # Nature < Poison
		},

		# ── Electric (8) ──
		# Strong vs: Water, Air
		# Weak vs:   Earth
		# Immune to: Electric
		8: {
			2: 2.0,   # Electric > Water
			4: 2.0,   # Electric > Air
			3: 0.5,   # Electric < Earth
			8: 0.0,   # Electric immune to Electric
		},

		# ── Ice (9) ──
		# Strong vs: Nature, Air, Psychic, Earth
		# Weak vs:   Fire, Metal
		9: {
			7: 2.0,   # Ice > Nature
			4: 2.0,   # Ice > Air
			12: 2.0,  # Ice > Psychic
			3: 2.0,   # Ice > Earth
			1: 0.5,   # Ice < Fire
			10: 0.5,  # Ice < Metal
		},

		# ── Metal (10) ──
		# Strong vs: Ice, Psychic, Earth
		# Weak vs:   Fire, Electric
		10: {
			9: 2.0,   # Metal > Ice
			12: 2.0,  # Metal > Psychic
			3: 2.0,   # Metal > Earth
			1: 0.5,   # Metal < Fire
			8: 0.5,   # Metal < Electric
		},

		# ── Poison (11) ──
		# Strong vs: Nature, Psychic, Water
		# Weak vs:   Earth, Metal, Light
		11: {
			7: 2.0,   # Poison > Nature
			12: 2.0,  # Poison > Psychic
			2: 2.0,   # Poison > Water
			3: 0.5,   # Poison < Earth
			10: 0.5,  # Poison < Metal
			5: 0.5,   # Poison < Light
		},

		# ── Psychic (12) ──
		# Strong vs: Poison, Air
		# Weak vs:   Dark, Metal, Ice
		# Immune to: (none)
		12: {
			11: 2.0,  # Psychic > Poison
			4: 2.0,   # Psychic > Air
			6: 0.5,   # Psychic < Dark
			10: 0.5,  # Psychic < Metal
			9: 0.5,   # Psychic < Ice
		},

		# ── Spirit (13) ──
		# Strong vs: Light, Chaos
		# Weak vs:   Dark, Spirit (self-resist)
		13: {
			5: 2.0,   # Spirit > Light
			14: 2.0,  # Spirit > Chaos
			6: 0.5,   # Spirit < Dark
			13: 0.5,  # Spirit < Spirit (resistance)
		},

		# ── Chaos (14) ──
		# Strong vs: Dark, Light, Ice
		# Weak vs:   Spirit, Earth
		14: {
			6: 2.0,   # Chaos > Dark
			5: 2.0,   # Chaos > Light
			9: 2.0,   # Chaos > Ice
			13: 0.5,  # Chaos < Spirit
			3: 0.5,   # Chaos < Earth
		},
	}


## Get the multiplier for a single attacker element vs a single defender element.
static func get_multiplier(attacking_element: String, defending_element: String) -> float:
	var atk_id: int = ELEMENT_IDS.get(attacking_element, 0)
	var def_id: int = ELEMENT_IDS.get(defending_element, 0)
	if atk_id == 0 or def_id == 0:
		return 1.0
	var chart := get_chart()
	if not chart.has(atk_id):
		return 1.0
	return float(chart[atk_id].get(def_id, 1.0))


## Get the combined multiplier for a single attacker element vs a dual-type defender.
## Multiplies both matchups together (e.g., Fire vs Water/Nature = 0.5 * 2.0 = 1.0).
static func get_multiplier_vs_dual(
	attacking_element: String,
	defending_elements: Array,
) -> float:
	var total: float = 1.0
	for def_elem: String in defending_elements:
		total *= get_multiplier(attacking_element, def_elem)
	return total


## Get a human-readable label for a multiplier value.
static func get_effectiveness_label(multiplier: float) -> String:
	if multiplier < 0.01:
		return "immune"
	elif multiplier < 0.75:
		return "not_very_effective"
	elif multiplier > 1.5:
		return "super_effective"
	else:
		return "neutral"


## Get all elements that the given attacking element is super effective against.
static func get_strengths(attacking_element: String) -> Array[String]:
	var result: Array[String] = []
	var atk_id: int = ELEMENT_IDS.get(attacking_element, 0)
	if atk_id == 0:
		return result
	var chart := get_chart()
	if not chart.has(atk_id):
		return result
	for def_id: int in chart[atk_id]:
		if float(chart[atk_id][def_id]) >= 2.0:
			result.append(ELEMENT_NAMES.get(def_id, "Unknown"))
	return result


## Get all elements that the given attacking element is weak against.
static func get_weaknesses(attacking_element: String) -> Array[String]:
	var result: Array[String] = []
	var atk_id: int = ELEMENT_IDS.get(attacking_element, 0)
	if atk_id == 0:
		return result
	var chart := get_chart()
	if not chart.has(atk_id):
		return result
	for def_id: int in chart[atk_id]:
		var mult: float = float(chart[atk_id][def_id])
		if mult > 0.0 and mult <= 0.5:
			result.append(ELEMENT_NAMES.get(def_id, "Unknown"))
	return result


## Get all elements that the given element is immune to when defending.
## (Checks all rows for 0.0 multiplier against this element's ID.)
static func get_immunities(defending_element: String) -> Array[String]:
	var result: Array[String] = []
	var def_id: int = ELEMENT_IDS.get(defending_element, 0)
	if def_id == 0:
		return result
	var chart := get_chart()
	for atk_id: int in chart:
		if float(chart[atk_id].get(def_id, 1.0)) < 0.01:
			result.append(ELEMENT_NAMES.get(atk_id, "Unknown"))
	return result


## Validate that no element has more than 4 super-effective matchups (balance check).
static func validate_balance() -> Array[String]:
	var warnings: Array[String] = []
	var chart := get_chart()
	for atk_id: int in chart:
		var strong_count: int = 0
		var weak_count: int = 0
		for def_id: int in chart[atk_id]:
			var mult: float = float(chart[atk_id][def_id])
			if mult >= 2.0:
				strong_count += 1
			elif mult > 0.0 and mult <= 0.5:
				weak_count += 1
		var name: String = ELEMENT_NAMES.get(atk_id, "ID:%d" % atk_id)
		if strong_count > 4:
			warnings.append("%s has %d super-effective matchups (max recommended: 4)." % [name, strong_count])
		if weak_count < 1:
			warnings.append("%s has no weaknesses." % name)
		if strong_count < 1:
			warnings.append("%s has no strengths." % name)
	return warnings
