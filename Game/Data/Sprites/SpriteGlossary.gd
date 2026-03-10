## SpriteGlossary — Full glossary of all 336 Sprite variants (24 races x 14 elements).
## Every race can be paired with every element, producing a unique variant with
## combined lore and elemental flavor.
##
## Design notes:
##   - sprite_id = (race_id - 1) * 14 + element_index + 1  (1-336)
##   - Each entry combines race lore with element-specific flavor text
##   - Variant names follow the pattern "Element Race" (e.g. "Fire Bug Man")
class_name SpriteGlossary
extends RefCounted

# ──────────────────────────────────────────────────────────────────────────────
# CONSTANTS
# ──────────────────────────────────────────────────────────────────────────────

## All 24 Sprite race names keyed by race_id (1-24).
const RACE_NAMES: Dictionary = {
	1: "Bug Man",
	2: "Bear Man",
	3: "Bird Man",
	4: "Demon",
	5: "Devil",
	6: "Cat Man",
	7: "Elf",
	8: "Ent",
	9: "Fish Man",
	10: "Ghost",
	11: "Golem",
	12: "Human",
	13: "Lizard Man",
	14: "Minotaur",
	15: "Monkey Man",
	16: "Mummy",
	17: "Ork",
	18: "Rat Man",
	19: "Robot",
	20: "Shark Man",
	21: "Skeleton",
	22: "Turtle Man",
	23: "Wolf Man",
	24: "Zombie",
}

## All 14 element types in canonical order (index 0-13).
const ELEMENT_NAMES: Array = [
	"Fire",
	"Water",
	"Wind",
	"Earth",
	"Plant",
	"Metal",
	"Electric",
	"Dark",
	"Light",
	"Solar",
	"Lunar",
	"Fairy",
	"Poison",
	"Ice",
]

## Lore description for each race keyed by race_id (1-24).
const RACE_DESCRIPTIONS: Dictionary = {
	1: "Chitinous warriors with compound eyes and razor mandibles. Their exoskeletons harden with each evolution.",
	2: "Massive ursine fighters with tremendous strength. They hibernate to regenerate and awaken with renewed power.",
	3: "Swift aerial combatants with feathered wings. Masters of hit-and-run tactics from above.",
	4: "Infernal beings of pure malice from the dark realms. They feed on negative emotions to fuel their power.",
	5: "Cunning tricksters who bargain for power. More calculating than Demons, they prefer manipulation over brute force.",
	6: "Agile feline warriors with lightning reflexes. Their retractable claws strike with surgical precision.",
	7: "Ancient forest dwellers attuned to natural magic. Their long lives grant deep wisdom and powerful arcane knowledge.",
	8: "Living tree creatures rooted in primordial groves. Slow but incredibly durable, they command plant life itself.",
	9: "Aquatic warriors who breathe both water and air. They fight with tridents and the crushing pressure of the deep.",
	10: "Spectral beings that phase between the material and spirit planes. Immune to physical attacks in their ethereal state.",
	11: "Constructed warriors animated by ancient magic. Their bodies of stone, metal, or clay make them nearly indestructible.",
	12: "Versatile and adaptable fighters with no innate weakness. What they lack in specialization, they make up in determination.",
	13: "Cold-blooded reptilian warriors with regenerative abilities. Their scales provide natural armor in battle.",
	14: "Towering bull-headed warriors with devastating charge attacks. They navigate labyrinths with perfect spatial awareness.",
	15: "Acrobatic simian warriors who use agility and cunning. Masters of improvised weapons and unpredictable fighting styles.",
	16: "Preserved undead wrapped in enchanted bandages. Their curse magic drains life force from enemies over time.",
	17: "Brutal green-skinned warriors who live for battle. Their natural toughness and rage make them fearsome front-line fighters.",
	18: "Sneaky rodent warriors who fight dirty and fast. Their numbers and resourcefulness compensate for individual weakness.",
	19: "Mechanical constructs with precise, calculated combat routines. They upgrade components to adapt to any threat.",
	20: "Apex predators of both land and sea. Their bite force and frenzy state make them deadly at close range.",
	21: "Undead warriors held together by necromantic energy. Lightweight and tireless, they fight without fear or pain.",
	22: "Heavily armored reptilian defenders with retractable limbs. Their shells can withstand devastating blows.",
	23: "Pack-hunting lycanthropes who grow stronger in groups. Their howl buffs allies and terrifies enemies.",
	24: "Relentless undead that keep fighting through injuries. They spread infection and grow stronger from fallen enemies.",
}

## Element-specific flavor prefixes used when building variant descriptions.
const ELEMENT_FLAVOR_PREFIXES: Dictionary = {
	"Fire": "Wreathed in flames,",
	"Water": "Blessed by tidal currents,",
	"Wind": "Swift as the gale,",
	"Earth": "Grounded in ancient stone,",
	"Plant": "Entwined with living vines,",
	"Metal": "Forged in steel,",
	"Electric": "Crackling with voltage,",
	"Dark": "Cloaked in shadow,",
	"Light": "Radiant with holy energy,",
	"Solar": "Empowered by the sun,",
	"Lunar": "Touched by moonlight,",
	"Fairy": "Enchanted by fae magic,",
	"Poison": "Dripping with toxins,",
	"Ice": "Encased in frost,",
}


# ──────────────────────────────────────────────────────────────────────────────
# PUBLIC METHODS
# ──────────────────────────────────────────────────────────────────────────────

## Return all 336 glossary entries (24 races x 14 elements).
## Each entry is a Dictionary with keys:
##   sprite_id, race_id, race_name, element, sprite_variant_name, description
static func get_all_glossary_entries() -> Array[Dictionary]:
	var entries: Array[Dictionary] = []
	for race_id: int in range(1, 25):
		var race_name: String = RACE_NAMES[race_id]
		var race_lore: String = RACE_DESCRIPTIONS[race_id]
		for element_index: int in range(ELEMENT_NAMES.size()):
			var element: String = ELEMENT_NAMES[element_index]
			var sprite_id: int = (race_id - 1) * 14 + element_index + 1
			var variant_name: String = "%s %s" % [element, race_name]
			var flavor_prefix: String = ELEMENT_FLAVOR_PREFIXES[element]
			var description: String = "%s %s" % [
				flavor_prefix,
				race_lore[0].to_lower() + race_lore.substr(1),
			]
			entries.append({
				"sprite_id": sprite_id,
				"race_id": race_id,
				"race_name": race_name,
				"element": element,
				"sprite_variant_name": variant_name,
				"description": description,
			})
	return entries


## Return all 14 element variants for a given race.
static func get_entries_by_race(race_id: int) -> Array[Dictionary]:
	var entries: Array[Dictionary] = []
	if not RACE_NAMES.has(race_id):
		return entries
	var race_name: String = RACE_NAMES[race_id]
	var race_lore: String = RACE_DESCRIPTIONS[race_id]
	for element_index: int in range(ELEMENT_NAMES.size()):
		var element: String = ELEMENT_NAMES[element_index]
		var sprite_id: int = (race_id - 1) * 14 + element_index + 1
		var variant_name: String = "%s %s" % [element, race_name]
		var flavor_prefix: String = ELEMENT_FLAVOR_PREFIXES[element]
		var description: String = "%s %s" % [
			flavor_prefix,
			race_lore[0].to_lower() + race_lore.substr(1),
		]
		entries.append({
			"sprite_id": sprite_id,
			"race_id": race_id,
			"race_name": race_name,
			"element": element,
			"sprite_variant_name": variant_name,
			"description": description,
		})
	return entries


## Return all 24 race variants for a given element.
static func get_entries_by_element(element: String) -> Array[Dictionary]:
	var entries: Array[Dictionary] = []
	var element_index: int = ELEMENT_NAMES.find(element)
	if element_index == -1:
		return entries
	for race_id: int in range(1, 25):
		var race_name: String = RACE_NAMES[race_id]
		var race_lore: String = RACE_DESCRIPTIONS[race_id]
		var sprite_id: int = (race_id - 1) * 14 + element_index + 1
		var variant_name: String = "%s %s" % [element, race_name]
		var flavor_prefix: String = ELEMENT_FLAVOR_PREFIXES[element]
		var description: String = "%s %s" % [
			flavor_prefix,
			race_lore[0].to_lower() + race_lore.substr(1),
		]
		entries.append({
			"sprite_id": sprite_id,
			"race_id": race_id,
			"race_name": race_name,
			"element": element,
			"sprite_variant_name": variant_name,
			"description": description,
		})
	return entries


## Return a single glossary entry for a specific race + element combination.
## Returns an empty Dictionary if the race_id or element is invalid.
static func get_entry(race_id: int, element: String) -> Dictionary:
	if not RACE_NAMES.has(race_id):
		return {}
	var element_index: int = ELEMENT_NAMES.find(element)
	if element_index == -1:
		return {}
	var race_name: String = RACE_NAMES[race_id]
	var race_lore: String = RACE_DESCRIPTIONS[race_id]
	var sprite_id: int = (race_id - 1) * 14 + element_index + 1
	var variant_name: String = "%s %s" % [element, race_name]
	var flavor_prefix: String = ELEMENT_FLAVOR_PREFIXES[element]
	var description: String = "%s %s" % [
		flavor_prefix,
		race_lore[0].to_lower() + race_lore.substr(1),
	]
	return {
		"sprite_id": sprite_id,
		"race_id": race_id,
		"race_name": race_name,
		"element": element,
		"sprite_variant_name": variant_name,
		"description": description,
	}
