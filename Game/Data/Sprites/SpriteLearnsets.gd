## SpriteLearnsets — [P1-008] Maps each of the 24 Sprite races to their learnable abilities.
## Each entry: {ability_id, learn_level, is_starting} — ordered by learn_level.
## Races learn 8-12 abilities total, including element-matched and class-matched moves.
class_name SpriteLearnsets
extends RefCounted

static func get_all_learnsets() -> Dictionary:
	return {
		1: _emberpaw(),    # Fire / Berserker
		2: _tidalfin(),    # Water / Guardian
		3: _thornvine(),   # Plant / Ranger
		4: _frostfang(),   # Ice / Assassin
		5: _galecrest(),   # Wind / Striker
		6: _bouldrim(),    # Earth / Guardian
		7: _voltspark(),   # Electric / Striker
		8: _shadowmaw(),   # Dark / Assassin
		9: _luminara(),    # Light / Cleric
		10: _faewisp(),    # Fairy / Trickster
		11: _lunacrest(),  # Lunar / Sorcerer
		12: _solforge(),   # Solar / Berserker
		13: _ironhide(),   # Metal / Guardian
		14: _venomthorn(), # Poison / Ranger
		15: _embertide(),  # Fire+Water / Sorcerer
		16: _frostleaf(),  # Ice+Plant / Ranger
		17: _stormstone(),  # Electric+Earth / Berserker
		18: _shadowfae(),  # Dark+Fairy / Trickster
		19: _dawnmetal(),  # Light+Metal / Guardian
		20: _moonvenom(),  # Lunar+Poison / Assassin
		21: _solarwind(),  # Solar+Wind / Striker
		22: _celestara(),  # Light+Fairy / Cleric (Legendary)
		23: _voidrend(),   # Dark+Lunar / Sorcerer (Legendary)
		24: _prismadon(),  # All elements / Any (Legendary)
	}

static func get_learnset(race_id: int) -> Array:
	return get_all_learnsets().get(race_id, [])

# 1: Emberpaw — Fire / Berserker
static func _emberpaw() -> Array:
	return [
		{ability_id = 155, learn_level = 1, is_starting = true},   # Tackle
		{ability_id = 1, learn_level = 1, is_starting = true},     # Ember
		{ability_id = 2, learn_level = 5, is_starting = false},    # Flame Burst
		{ability_id = 160, learn_level = 8, is_starting = false},  # Rage
		{ability_id = 3, learn_level = 12, is_starting = false},   # Fire Spin
		{ability_id = 4, learn_level = 16, is_starting = false},   # Blazing Charge
		{ability_id = 5, learn_level = 20, is_starting = false},   # Inferno Wave
		{ability_id = 7, learn_level = 25, is_starting = false},   # Magma Eruption
		{ability_id = 158, learn_level = 28, is_starting = false}, # Focus Energy
		{ability_id = 8, learn_level = 32, is_starting = false},   # Wildfire
		{ability_id = 11, learn_level = 38, is_starting = false},  # Flame Vortex
	]

# 2: Tidalfin — Water / Guardian
static func _tidalfin() -> Array:
	return [
		{ability_id = 155, learn_level = 1, is_starting = true},   # Tackle
		{ability_id = 12, learn_level = 1, is_starting = true},    # Water Gun
		{ability_id = 13, learn_level = 5, is_starting = false},   # Aqua Jet
		{ability_id = 156, learn_level = 8, is_starting = false},  # Guard
		{ability_id = 14, learn_level = 12, is_starting = false},  # Tidal Surge
		{ability_id = 15, learn_level = 16, is_starting = false},  # Whirlpool
		{ability_id = 17, learn_level = 20, is_starting = false},  # Torrent Shield
		{ability_id = 18, learn_level = 25, is_starting = false},  # Hydro Cannon
		{ability_id = 90, learn_level = 28, is_starting = false},  # Divine Shield
		{ability_id = 22, learn_level = 34, is_starting = false},  # Abyssal Deluge
	]

# 3: Thornvine — Plant / Ranger
static func _thornvine() -> Array:
	return [
		{ability_id = 155, learn_level = 1, is_starting = true},   # Tackle
		{ability_id = 23, learn_level = 1, is_starting = true},    # Vine Whip
		{ability_id = 24, learn_level = 5, is_starting = false},   # Razor Leaf
		{ability_id = 25, learn_level = 10, is_starting = false},  # Thorn Barrage
		{ability_id = 26, learn_level = 14, is_starting = false},  # Root Snare
		{ability_id = 27, learn_level = 18, is_starting = false},  # Photosynthesis
		{ability_id = 144, learn_level = 22, is_starting = false}, # Toxic Spit
		{ability_id = 28, learn_level = 26, is_starting = false},  # Bloom Burst
		{ability_id = 30, learn_level = 30, is_starting = false},  # Overgrowth
		{ability_id = 33, learn_level = 36, is_starting = false},  # Forest Storm
	]

# 4: Frostfang — Ice / Assassin
static func _frostfang() -> Array:
	return [
		{ability_id = 155, learn_level = 1, is_starting = true},   # Tackle
		{ability_id = 34, learn_level = 1, is_starting = true},    # Ice Shard
		{ability_id = 35, learn_level = 6, is_starting = false},   # Frost Bite
		{ability_id = 85, learn_level = 10, is_starting = false},  # Backstab
		{ability_id = 36, learn_level = 14, is_starting = false},  # Blizzard Gust
		{ability_id = 37, learn_level = 18, is_starting = false},  # Glacial Spike
		{ability_id = 38, learn_level = 22, is_starting = false},  # Frozen Prison
		{ability_id = 82, learn_level = 26, is_starting = false},  # Shadow Veil
		{ability_id = 40, learn_level = 30, is_starting = false},  # Avalanche
		{ability_id = 44, learn_level = 36, is_starting = false},  # Absolute Zero
	]

# 5: Galecrest — Wind / Striker
static func _galecrest() -> Array:
	return [
		{ability_id = 155, learn_level = 1, is_starting = true},   # Tackle
		{ability_id = 45, learn_level = 1, is_starting = true},    # Gust
		{ability_id = 46, learn_level = 5, is_starting = false},   # Air Slash
		{ability_id = 157, learn_level = 8, is_starting = false},  # Quick Strike
		{ability_id = 47, learn_level = 12, is_starting = false},  # Tailwind
		{ability_id = 48, learn_level = 16, is_starting = false},  # Cyclone
		{ability_id = 49, learn_level = 20, is_starting = false},  # Wind Blade
		{ability_id = 50, learn_level = 25, is_starting = false},  # Tornado
		{ability_id = 53, learn_level = 30, is_starting = false},  # Sonic Boom
		{ability_id = 55, learn_level = 36, is_starting = false},  # Hurricane
	]

# 6: Bouldrim — Earth / Guardian
static func _bouldrim() -> Array:
	return [
		{ability_id = 155, learn_level = 1, is_starting = true},   # Tackle
		{ability_id = 56, learn_level = 1, is_starting = true},    # Rock Throw
		{ability_id = 57, learn_level = 6, is_starting = false},   # Mud Shot
		{ability_id = 156, learn_level = 9, is_starting = false},  # Guard
		{ability_id = 58, learn_level = 13, is_starting = false},  # Earthquake
		{ability_id = 59, learn_level = 17, is_starting = false},  # Stone Wall
		{ability_id = 60, learn_level = 21, is_starting = false},  # Boulder Toss
		{ability_id = 62, learn_level = 26, is_starting = false},  # Landslide
		{ability_id = 134, learn_level = 30, is_starting = false}, # Steel Barrier
		{ability_id = 66, learn_level = 36, is_starting = false},  # Tectonic Shift
	]

# 7: Voltspark — Electric / Striker
static func _voltspark() -> Array:
	return [
		{ability_id = 155, learn_level = 1, is_starting = true},   # Tackle
		{ability_id = 67, learn_level = 1, is_starting = true},    # Spark
		{ability_id = 68, learn_level = 5, is_starting = false},   # Thunder Jolt
		{ability_id = 157, learn_level = 8, is_starting = false},  # Quick Strike
		{ability_id = 69, learn_level = 12, is_starting = false},  # Lightning Bolt
		{ability_id = 70, learn_level = 16, is_starting = false},  # Static Field
		{ability_id = 71, learn_level = 20, is_starting = false},  # Chain Lightning
		{ability_id = 73, learn_level = 25, is_starting = false},  # Thunderclap
		{ability_id = 75, learn_level = 30, is_starting = false},  # Storm Surge
		{ability_id = 77, learn_level = 34, is_starting = false},  # Volt Tackle
	]

# 8: Shadowmaw — Dark / Assassin
static func _shadowmaw() -> Array:
	return [
		{ability_id = 155, learn_level = 1, is_starting = true},   # Tackle
		{ability_id = 78, learn_level = 1, is_starting = true},    # Shadow Strike
		{ability_id = 85, learn_level = 6, is_starting = false},   # Backstab
		{ability_id = 86, learn_level = 10, is_starting = false},  # Hex Bolt
		{ability_id = 81, learn_level = 14, is_starting = false},  # Void Fang
		{ability_id = 82, learn_level = 18, is_starting = false},  # Shadow Veil
		{ability_id = 84, learn_level = 22, is_starting = false},  # Drain Life
		{ability_id = 88, learn_level = 26, is_starting = false},  # Shadow Snare
		{ability_id = 83, learn_level = 30, is_starting = false},  # Abyssal Blast
		{ability_id = 87, learn_level = 36, is_starting = false},  # Umbral Storm
	]

# 9: Luminara — Light / Cleric
static func _luminara() -> Array:
	return [
		{ability_id = 155, learn_level = 1, is_starting = true},   # Tackle
		{ability_id = 89, learn_level = 1, is_starting = true},    # Holy Beam
		{ability_id = 93, learn_level = 5, is_starting = false},   # Heal Light
		{ability_id = 91, learn_level = 10, is_starting = false},  # Purify
		{ability_id = 96, learn_level = 14, is_starting = false},  # Flash
		{ability_id = 90, learn_level = 18, is_starting = false},  # Divine Shield
		{ability_id = 94, learn_level = 22, is_starting = false},  # Smite
		{ability_id = 95, learn_level = 26, is_starting = false},  # Blessing Aura
		{ability_id = 97, learn_level = 30, is_starting = false},  # Judgement Ray
		{ability_id = 98, learn_level = 36, is_starting = false},  # Sanctuary
	]

# 10: Faewisp — Fairy / Trickster
static func _faewisp() -> Array:
	return [
		{ability_id = 155, learn_level = 1, is_starting = true},   # Tackle
		{ability_id = 100, learn_level = 1, is_starting = true},   # Pixie Dust
		{ability_id = 102, learn_level = 6, is_starting = false},  # Charm
		{ability_id = 103, learn_level = 10, is_starting = false}, # Fae Wind
		{ability_id = 105, learn_level = 14, is_starting = false}, # Enchant
		{ability_id = 108, learn_level = 18, is_starting = false}, # Dazzle
		{ability_id = 104, learn_level = 22, is_starting = false}, # Nature's Gift
		{ability_id = 106, learn_level = 26, is_starting = false}, # Sylph Rush
		{ability_id = 109, learn_level = 30, is_starting = false}, # Fae Barrage
		{ability_id = 110, learn_level = 36, is_starting = false}, # Dreamweave
	]

# 11: Lunacrest — Lunar / Sorcerer
static func _lunacrest() -> Array:
	return [
		{ability_id = 155, learn_level = 1, is_starting = true},   # Tackle
		{ability_id = 111, learn_level = 1, is_starting = true},   # Crescent Slash
		{ability_id = 112, learn_level = 6, is_starting = false},  # Lunar Tide
		{ability_id = 115, learn_level = 10, is_starting = false}, # Waning Light
		{ability_id = 113, learn_level = 14, is_starting = false}, # Moonrise
		{ability_id = 117, learn_level = 18, is_starting = false}, # Silver Fang
		{ability_id = 114, learn_level = 22, is_starting = false}, # Eclipse Ray
		{ability_id = 119, learn_level = 26, is_starting = false}, # Tidal Pull
		{ability_id = 116, learn_level = 30, is_starting = false}, # Moonfall
		{ability_id = 120, learn_level = 34, is_starting = false}, # Penumbra
		{ability_id = 121, learn_level = 38, is_starting = false}, # Lunar Blessing
	]

# 12: Solforge — Solar / Berserker
static func _solforge() -> Array:
	return [
		{ability_id = 155, learn_level = 1, is_starting = true},   # Tackle
		{ability_id = 122, learn_level = 1, is_starting = true},   # Solar Flare
		{ability_id = 126, learn_level = 6, is_starting = false},  # Photon Strike
		{ability_id = 160, learn_level = 10, is_starting = false}, # Rage
		{ability_id = 128, learn_level = 14, is_starting = false}, # Heat Haze
		{ability_id = 123, learn_level = 18, is_starting = false}, # Sunbeam
		{ability_id = 125, learn_level = 22, is_starting = false}, # Corona Blast
		{ability_id = 127, learn_level = 26, is_starting = false}, # Solar Charge
		{ability_id = 129, learn_level = 30, is_starting = false}, # Prominence
		{ability_id = 131, learn_level = 36, is_starting = false}, # Supernova
	]

# 13: Ironhide — Metal / Guardian
static func _ironhide() -> Array:
	return [
		{ability_id = 155, learn_level = 1, is_starting = true},   # Tackle
		{ability_id = 133, learn_level = 1, is_starting = true},   # Iron Slam
		{ability_id = 137, learn_level = 6, is_starting = false},  # Rivet Shot
		{ability_id = 156, learn_level = 10, is_starting = false}, # Guard
		{ability_id = 134, learn_level = 14, is_starting = false}, # Steel Barrier
		{ability_id = 136, learn_level = 18, is_starting = false}, # Magnet Pull
		{ability_id = 138, learn_level = 22, is_starting = false}, # Alloy Crush
		{ability_id = 139, learn_level = 26, is_starting = false}, # Shrapnel Burst
		{ability_id = 141, learn_level = 30, is_starting = false}, # Iron Curtain
		{ability_id = 142, learn_level = 36, is_starting = false}, # Meltdown
	]

# 14: Venomthorn — Poison / Ranger
static func _venomthorn() -> Array:
	return [
		{ability_id = 155, learn_level = 1, is_starting = true},   # Tackle
		{ability_id = 144, learn_level = 1, is_starting = true},   # Toxic Spit
		{ability_id = 145, learn_level = 6, is_starting = false},  # Venom Fang
		{ability_id = 148, learn_level = 10, is_starting = false}, # Toxic Spore
		{ability_id = 147, learn_level = 14, is_starting = false}, # Acid Spray
		{ability_id = 150, learn_level = 18, is_starting = false}, # Corrosion
		{ability_id = 149, learn_level = 22, is_starting = false}, # Venomshock
		{ability_id = 152, learn_level = 26, is_starting = false}, # Toxic Needle
		{ability_id = 153, learn_level = 30, is_starting = false}, # Biohazard
		{ability_id = 154, learn_level = 35, is_starting = false}, # Noxious Bite
	]

# 15: Embertide — Fire+Water / Sorcerer (Dual-element)
static func _embertide() -> Array:
	return [
		{ability_id = 155, learn_level = 1, is_starting = true},   # Tackle
		{ability_id = 1, learn_level = 1, is_starting = true},     # Ember
		{ability_id = 12, learn_level = 4, is_starting = false},   # Water Gun
		{ability_id = 2, learn_level = 8, is_starting = false},    # Flame Burst
		{ability_id = 14, learn_level = 12, is_starting = false},  # Tidal Surge
		{ability_id = 5, learn_level = 16, is_starting = false},   # Inferno Wave
		{ability_id = 18, learn_level = 20, is_starting = false},  # Hydro Cannon
		{ability_id = 9, learn_level = 25, is_starting = false},   # Flamestrike
		{ability_id = 158, learn_level = 28, is_starting = false}, # Focus Energy
		{ability_id = 22, learn_level = 32, is_starting = false},  # Abyssal Deluge
		{ability_id = 11, learn_level = 38, is_starting = false},  # Flame Vortex
	]

# 16: Frostleaf — Ice+Plant / Ranger (Dual-element)
static func _frostleaf() -> Array:
	return [
		{ability_id = 155, learn_level = 1, is_starting = true},   # Tackle
		{ability_id = 34, learn_level = 1, is_starting = true},    # Ice Shard
		{ability_id = 23, learn_level = 4, is_starting = false},   # Vine Whip
		{ability_id = 24, learn_level = 8, is_starting = false},   # Razor Leaf
		{ability_id = 36, learn_level = 12, is_starting = false},  # Blizzard Gust
		{ability_id = 26, learn_level = 16, is_starting = false},  # Root Snare
		{ability_id = 27, learn_level = 20, is_starting = false},  # Photosynthesis
		{ability_id = 38, learn_level = 24, is_starting = false},  # Frozen Prison
		{ability_id = 40, learn_level = 28, is_starting = false},  # Avalanche
		{ability_id = 33, learn_level = 34, is_starting = false},  # Forest Storm
	]

# 17: Stormstone — Electric+Earth / Berserker (Dual-element)
static func _stormstone() -> Array:
	return [
		{ability_id = 155, learn_level = 1, is_starting = true},   # Tackle
		{ability_id = 67, learn_level = 1, is_starting = true},    # Spark
		{ability_id = 56, learn_level = 4, is_starting = false},   # Rock Throw
		{ability_id = 160, learn_level = 8, is_starting = false},  # Rage
		{ability_id = 69, learn_level = 12, is_starting = false},  # Lightning Bolt
		{ability_id = 58, learn_level = 16, is_starting = false},  # Earthquake
		{ability_id = 71, learn_level = 20, is_starting = false},  # Chain Lightning
		{ability_id = 60, learn_level = 24, is_starting = false},  # Boulder Toss
		{ability_id = 75, learn_level = 30, is_starting = false},  # Storm Surge
		{ability_id = 66, learn_level = 36, is_starting = false},  # Tectonic Shift
	]

# 18: Shadowfae — Dark+Fairy / Trickster (Dual-element)
static func _shadowfae() -> Array:
	return [
		{ability_id = 155, learn_level = 1, is_starting = true},   # Tackle
		{ability_id = 78, learn_level = 1, is_starting = true},    # Shadow Strike
		{ability_id = 100, learn_level = 4, is_starting = false},  # Pixie Dust
		{ability_id = 102, learn_level = 8, is_starting = false},  # Charm
		{ability_id = 79, learn_level = 12, is_starting = false},  # Dark Pulse
		{ability_id = 108, learn_level = 16, is_starting = false}, # Dazzle
		{ability_id = 84, learn_level = 20, is_starting = false},  # Drain Life
		{ability_id = 105, learn_level = 24, is_starting = false}, # Enchant
		{ability_id = 83, learn_level = 28, is_starting = false},  # Abyssal Blast
		{ability_id = 110, learn_level = 34, is_starting = false}, # Dreamweave
	]

# 19: Dawnmetal — Light+Metal / Guardian (Dual-element)
static func _dawnmetal() -> Array:
	return [
		{ability_id = 155, learn_level = 1, is_starting = true},   # Tackle
		{ability_id = 89, learn_level = 1, is_starting = true},    # Holy Beam
		{ability_id = 133, learn_level = 4, is_starting = false},  # Iron Slam
		{ability_id = 156, learn_level = 8, is_starting = false},  # Guard
		{ability_id = 90, learn_level = 12, is_starting = false},  # Divine Shield
		{ability_id = 134, learn_level = 16, is_starting = false}, # Steel Barrier
		{ability_id = 94, learn_level = 20, is_starting = false},  # Smite
		{ability_id = 141, learn_level = 24, is_starting = false}, # Iron Curtain
		{ability_id = 97, learn_level = 28, is_starting = false},  # Judgement Ray
		{ability_id = 99, learn_level = 32, is_starting = false},  # Radiant Lance
		{ability_id = 143, learn_level = 38, is_starting = false}, # Titanium Fist
	]

# 20: Moonvenom — Lunar+Poison / Assassin (Dual-element)
static func _moonvenom() -> Array:
	return [
		{ability_id = 155, learn_level = 1, is_starting = true},   # Tackle
		{ability_id = 111, learn_level = 1, is_starting = true},   # Crescent Slash
		{ability_id = 144, learn_level = 4, is_starting = false},  # Toxic Spit
		{ability_id = 85, learn_level = 8, is_starting = false},   # Backstab
		{ability_id = 115, learn_level = 12, is_starting = false}, # Waning Light
		{ability_id = 145, learn_level = 16, is_starting = false}, # Venom Fang
		{ability_id = 117, learn_level = 20, is_starting = false}, # Silver Fang
		{ability_id = 146, learn_level = 24, is_starting = false}, # Miasma
		{ability_id = 114, learn_level = 28, is_starting = false}, # Eclipse Ray
		{ability_id = 154, learn_level = 34, is_starting = false}, # Noxious Bite
	]

# 21: Solarwind — Solar+Wind / Striker (Dual-element)
static func _solarwind() -> Array:
	return [
		{ability_id = 155, learn_level = 1, is_starting = true},   # Tackle
		{ability_id = 122, learn_level = 1, is_starting = true},   # Solar Flare
		{ability_id = 45, learn_level = 4, is_starting = false},   # Gust
		{ability_id = 157, learn_level = 8, is_starting = false},  # Quick Strike
		{ability_id = 126, learn_level = 12, is_starting = false}, # Photon Strike
		{ability_id = 48, learn_level = 16, is_starting = false},  # Cyclone
		{ability_id = 123, learn_level = 20, is_starting = false}, # Sunbeam
		{ability_id = 50, learn_level = 24, is_starting = false},  # Tornado
		{ability_id = 132, learn_level = 28, is_starting = false}, # Light Spear
		{ability_id = 55, learn_level = 34, is_starting = false},  # Hurricane
		{ability_id = 131, learn_level = 40, is_starting = false}, # Supernova
	]

# 22: Celestara — Light+Fairy / Cleric (Legendary)
static func _celestara() -> Array:
	return [
		{ability_id = 155, learn_level = 1, is_starting = true},   # Tackle
		{ability_id = 89, learn_level = 1, is_starting = true},    # Holy Beam
		{ability_id = 100, learn_level = 5, is_starting = false},  # Pixie Dust
		{ability_id = 93, learn_level = 10, is_starting = false},  # Heal Light
		{ability_id = 102, learn_level = 14, is_starting = false}, # Charm
		{ability_id = 91, learn_level = 18, is_starting = false},  # Purify
		{ability_id = 92, learn_level = 22, is_starting = false},  # Radiant Burst
		{ability_id = 107, learn_level = 26, is_starting = false}, # Fairy Ring
		{ability_id = 95, learn_level = 30, is_starting = false},  # Blessing Aura
		{ability_id = 104, learn_level = 34, is_starting = false}, # Nature's Gift
		{ability_id = 98, learn_level = 38, is_starting = false},  # Sanctuary
		{ability_id = 110, learn_level = 42, is_starting = false}, # Dreamweave
	]

# 23: Voidrend — Dark+Lunar / Sorcerer (Legendary)
static func _voidrend() -> Array:
	return [
		{ability_id = 155, learn_level = 1, is_starting = true},   # Tackle
		{ability_id = 78, learn_level = 1, is_starting = true},    # Shadow Strike
		{ability_id = 111, learn_level = 5, is_starting = false},  # Crescent Slash
		{ability_id = 79, learn_level = 10, is_starting = false},  # Dark Pulse
		{ability_id = 112, learn_level = 14, is_starting = false}, # Lunar Tide
		{ability_id = 80, learn_level = 18, is_starting = false},  # Nightmare
		{ability_id = 114, learn_level = 22, is_starting = false}, # Eclipse Ray
		{ability_id = 83, learn_level = 26, is_starting = false},  # Abyssal Blast
		{ability_id = 116, learn_level = 30, is_starting = false}, # Moonfall
		{ability_id = 84, learn_level = 34, is_starting = false},  # Drain Life
		{ability_id = 120, learn_level = 38, is_starting = false}, # Penumbra
		{ability_id = 87, learn_level = 42, is_starting = false},  # Umbral Storm
	]

# 24: Prismadon — All elements / Any (Legendary)
static func _prismadon() -> Array:
	return [
		{ability_id = 155, learn_level = 1, is_starting = true},   # Tackle
		{ability_id = 158, learn_level = 1, is_starting = true},   # Focus Energy
		{ability_id = 1, learn_level = 5, is_starting = false},    # Ember
		{ability_id = 12, learn_level = 8, is_starting = false},   # Water Gun
		{ability_id = 34, learn_level = 11, is_starting = false},  # Ice Shard
		{ability_id = 67, learn_level = 14, is_starting = false},  # Spark
		{ability_id = 89, learn_level = 18, is_starting = false},  # Holy Beam
		{ability_id = 78, learn_level = 22, is_starting = false},  # Shadow Strike
		{ability_id = 111, learn_level = 26, is_starting = false}, # Crescent Slash
		{ability_id = 122, learn_level = 30, is_starting = false}, # Solar Flare
		{ability_id = 133, learn_level = 34, is_starting = false}, # Iron Slam
		{ability_id = 144, learn_level = 38, is_starting = false}, # Toxic Spit
	]
