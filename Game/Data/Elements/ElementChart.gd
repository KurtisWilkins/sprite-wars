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
##   1=Fire, 2=Water, 3=Wind, 4=Earth, 5=Plant, 6=Metal,
##   7=Electric, 8=Dark, 9=Light, 10=Solar, 11=Lunar,
##   12=Fairy, 13=Poison, 14=Ice
class_name ElementChart
extends RefCounted

# Element name-to-ID mapping for convenience.
const ELEMENT_IDS: Dictionary = {
	"Fire": 1, "Water": 2, "Wind": 3, "Earth": 4,
	"Plant": 5, "Metal": 6, "Electric": 7, "Dark": 8,
	"Light": 9, "Solar": 10, "Lunar": 11, "Fairy": 12,
	"Poison": 13, "Ice": 14,
}

const ELEMENT_NAMES: Dictionary = {
	1: "Fire", 2: "Water", 3: "Wind", 4: "Earth",
	5: "Plant", 6: "Metal", 7: "Electric", 8: "Dark",
	9: "Light", 10: "Solar", 11: "Lunar", 12: "Fairy",
	13: "Poison", 14: "Ice",
}


## Return the full effectiveness chart as {attacking_element_id: {defending_element_id: multiplier}}.
## Only stores non-1.0 matchups; callers should treat missing keys as 1.0.
static func get_chart() -> Dictionary:
	return {
		# ── Fire (1) ──
		# Strong vs: Plant, Ice, Metal
		# Weak vs:   Water, Earth
		1: {
			5: 2.0,   # Fire > Plant
			14: 2.0,  # Fire > Ice
			6: 2.0,   # Fire > Metal
			2: 0.5,   # Fire < Water
			4: 0.5,   # Fire < Earth
		},

		# ── Water (2) ──
		# Strong vs: Fire, Earth
		# Weak vs:   Plant, Electric, Poison
		2: {
			1: 2.0,   # Water > Fire
			4: 2.0,   # Water > Earth
			5: 0.5,   # Water < Plant
			7: 0.5,   # Water < Electric
			13: 0.5,  # Water < Poison
		},

		# ── Wind (3) ──
		# Strong vs: Plant, Poison
		# Weak vs:   Electric, Ice, Earth
		3: {
			5: 2.0,   # Wind > Plant
			13: 2.0,  # Wind > Poison
			7: 0.5,   # Wind < Electric
			14: 0.5,  # Wind < Ice
			4: 0.5,   # Wind < Earth
		},

		# ── Earth (4) ──
		# Strong vs: Fire, Electric, Metal, Poison
		# Weak vs:   Water, Plant, Ice
		4: {
			1: 2.0,   # Earth > Fire
			7: 2.0,   # Earth > Electric
			6: 2.0,   # Earth > Metal
			13: 2.0,  # Earth > Poison
			2: 0.5,   # Earth < Water
			5: 0.5,   # Earth < Plant
			14: 0.5,  # Earth < Ice
		},

		# ── Plant (5) ──
		# Strong vs: Water, Earth
		# Weak vs:   Fire, Ice, Poison
		5: {
			2: 2.0,   # Plant > Water
			4: 2.0,   # Plant > Earth
			1: 0.5,   # Plant < Fire
			14: 0.5,  # Plant < Ice
			13: 0.5,  # Plant < Poison
		},

		# ── Metal (6) ──
		# Strong vs: Ice, Fairy, Earth
		# Weak vs:   Fire, Electric
		6: {
			14: 2.0,  # Metal > Ice
			12: 2.0,  # Metal > Fairy
			4: 2.0,   # Metal > Earth
			1: 0.5,   # Metal < Fire
			7: 0.5,   # Metal < Electric
		},

		# ── Electric (7) ──
		# Strong vs: Water, Wind
		# Weak vs:   Earth
		# Immune to: Electric
		7: {
			2: 2.0,   # Electric > Water
			3: 2.0,   # Electric > Wind
			4: 0.5,   # Electric < Earth
			7: 0.0,   # Electric immune to Electric
		},

		# ── Dark (8) ──
		# Strong vs: Light, Fairy, Solar
		# Weak to:   Light (via Light's row), Lunar (via Lunar's row)
		8: {
			9: 2.0,   # Dark > Light
			12: 2.0,  # Dark > Fairy
			10: 2.0,  # Dark > Solar
			11: 0.5,  # Dark < Lunar (attacks are resisted)
		},

		# ── Light (9) ──
		# Strong vs: Dark, Poison, Lunar
		# Weak to:   Dark (via Dark's row), Solar (via Solar's row)
		9: {
			8: 2.0,   # Light > Dark
			13: 2.0,  # Light > Poison
			11: 2.0,  # Light > Lunar
			10: 0.5,  # Light < Solar (attacks are resisted)
		},

		# ── Solar (10) ──
		# Strong vs: Plant, Ice, Lunar
		# Weak vs:   Dark, Light
		10: {
			5: 2.0,   # Solar > Plant
			14: 2.0,  # Solar > Ice
			11: 2.0,  # Solar > Lunar
			8: 0.5,   # Solar < Dark
			9: 0.5,   # Solar < Light
		},

		# ── Lunar (11) ──
		# Strong vs: Light, Dark, Fairy
		# Weak vs:   Solar, Poison
		11: {
			9: 2.0,   # Lunar > Light
			8: 2.0,   # Lunar > Dark
			12: 2.0,  # Lunar > Fairy
			10: 0.5,  # Lunar < Solar
			13: 0.5,  # Lunar < Poison
		},

		# ── Fairy (12) ──
		# Strong vs: Dark, Poison, Wind
		# Weak vs:   Metal, Ice
		12: {
			8: 2.0,   # Fairy > Dark
			13: 2.0,  # Fairy > Poison
			3: 2.0,   # Fairy > Wind
			6: 0.5,   # Fairy < Metal
			14: 0.5,  # Fairy < Ice
		},

		# ── Poison (13) ──
		# Strong vs: Plant, Fairy, Water
		# Weak vs:   Earth, Metal, Light
		13: {
			5: 2.0,   # Poison > Plant
			12: 2.0,  # Poison > Fairy
			2: 2.0,   # Poison > Water
			4: 0.5,   # Poison < Earth
			6: 0.5,   # Poison < Metal
			9: 0.5,   # Poison < Light
		},

		# ── Ice (14) ──
		# Strong vs: Plant, Wind, Earth, Fairy
		# Weak vs:   Fire, Metal
		14: {
			5: 2.0,   # Ice > Plant
			3: 2.0,   # Ice > Wind
			4: 2.0,   # Ice > Earth
			12: 2.0,  # Ice > Fairy
			1: 0.5,   # Ice < Fire
			6: 0.5,   # Ice < Metal
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
## Multiplies both matchups together (e.g., Fire vs Water/Plant = 0.5 * 2.0 = 1.0).
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
