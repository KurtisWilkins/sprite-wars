/**
 * CharacterAppearanceData.js — Visual appearance configurations for trainers,
 * the player character, and generic NPCs.
 *
 * All colors are vibrant and saturated to match the cel-shaded chibi art style:
 * flat color fills, 2-3px uniform black outlines, hard-edged shading, dot eyes.
 * No gradients — every color here is a single flat hex value.
 *
 * Used by SkeletalAnimationSystem to render character visuals on the overworld
 * and in battle UI portraits.
 *
 * @typedef {Object} CharacterAppearance
 * @property {string} outfitColor    — Primary outfit color (hex).
 * @property {string} outfitAccent   — Secondary accent color (hex).
 * @property {string} hatStyle       — "cap" | "straw" | "bandana" | "hood" | "none"
 * @property {string} hatColor       — Hat color (hex).
 * @property {string} hairColor      — Hair color (hex).
 * @property {string} hairStyle      — "short" | "long" | "spiky" | "ponytail" | "bun"
 * @property {string} skinTone       — Skin base color (hex).
 * @property {string} accessory      — "backpack" | "net" | "glasses" | "scarf" | "cape" | "none"
 * @property {string} accessoryColor — Accessory color (hex).
 * @property {string} shoeColor      — Shoe color (hex).
 */

// ══════════════════════════════════════════════════════════════════════════════
//  TRAINER APPEARANCES — Keyed by trainer class title
// ══════════════════════════════════════════════════════════════════════════════

/** @type {{ [title: string]: CharacterAppearance }} */
export const TRAINER_APPEARANCES = {
	// Bug Catcher — green outdoorsy outfit, straw hat, carries a net
	"Bug Catcher": {
		outfitColor:    "#4CAF50",  // leafy green shirt
		outfitAccent:   "#C8B87A",  // khaki shorts
		hatStyle:       "straw",
		hatColor:       "#D4B864",  // golden straw
		hairColor:      "#8B5E3C",  // chestnut brown
		hairStyle:      "short",
		skinTone:       "#F5D0A9",  // light warm
		accessory:      "net",
		accessoryColor: "#E8E8E8",  // pale gray net
		shoeColor:      "#7A6842",  // muddy khaki boots
	},

	// Javelin — athletic red/white outfit, bandana, spiky competitive hair
	"Javelin": {
		outfitColor:    "#E53935",  // bold red jersey
		outfitAccent:   "#FFFFFF",  // white trim
		hatStyle:       "bandana",
		hatColor:       "#E53935",  // matching red bandana
		hairColor:      "#1A1A1A",  // jet black
		hairStyle:      "spiky",
		skinTone:       "#E8C196",  // medium warm
		accessory:      "none",
		accessoryColor: "#000000",
		shoeColor:      "#FFFFFF",  // white athletic shoes
	},

	// Youngster — casual blue/yellow, baseball cap, backpack full of snacks
	"Youngster": {
		outfitColor:    "#42A5F5",  // bright blue tee
		outfitAccent:   "#FFCA28",  // sunny yellow shorts
		hatStyle:       "cap",
		hatColor:       "#1E88E5",  // darker blue cap
		hairColor:      "#D4A24C",  // sandy blond
		hairStyle:      "short",
		skinTone:       "#FCDEC0",  // fair
		accessory:      "backpack",
		accessoryColor: "#FF7043",  // orange backpack
		shoeColor:      "#37474F",  // dark sneakers
	},

	// Lass — pretty pink/white outfit, long flowing hair, delicate scarf
	"Lass": {
		outfitColor:    "#F48FB1",  // soft pink dress
		outfitAccent:   "#FFFFFF",  // white lace trim
		hatStyle:       "none",
		hatColor:       "#000000",
		hairColor:      "#5D4037",  // warm brunette
		hairStyle:      "long",
		skinTone:       "#FFE0C2",  // light peach
		accessory:      "scarf",
		accessoryColor: "#CE93D8",  // lavender scarf
		shoeColor:      "#F8BBD0",  // pink shoes
	},

	// Hiker — rugged brown/olive gear, hooded cloak, heavy backpack
	"Hiker": {
		outfitColor:    "#6D4C41",  // rugged brown coat
		outfitAccent:   "#8D9B5A",  // olive green vest
		hatStyle:       "hood",
		hatColor:       "#5D4037",  // dark brown hood
		hairColor:      "#3E2723",  // dark brown
		hairStyle:      "short",
		skinTone:       "#D2A679",  // tanned
		accessory:      "backpack",
		accessoryColor: "#4E342E",  // worn leather backpack
		shoeColor:      "#3E2723",  // heavy dark boots
	},

	// Mystic — flowing purple/gold robes, hooded, billowing cape
	"Mystic": {
		outfitColor:    "#7B1FA2",  // deep purple robes
		outfitAccent:   "#FFD54F",  // gold embroidery
		hatStyle:       "hood",
		hatColor:       "#6A1B9A",  // darker purple hood
		hairColor:      "#B0BEC5",  // silvery blue-gray
		hairStyle:      "long",
		skinTone:       "#EED5C2",  // pale warm
		accessory:      "cape",
		accessoryColor: "#4A148C",  // deep violet cape
		shoeColor:      "#4A148C",  // matching dark boots
	},
};

// ══════════════════════════════════════════════════════════════════════════════
//  PLAYER APPEARANCE — The protagonist's default look
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Default player character appearance.
 * Young adventurer: red jacket, dark hair, blue jeans, backpack, ready for action.
 * @type {CharacterAppearance}
 */
export const PLAYER_APPEARANCE = {
	outfitColor:    "#D32F2F",  // bold red jacket
	outfitAccent:   "#1565C0",  // blue jeans
	hatStyle:       "none",
	hatColor:       "#000000",
	hairColor:      "#212121",  // dark black hair
	hairStyle:      "spiky",
	skinTone:       "#F5D0A9",  // light warm
	accessory:      "backpack",
	accessoryColor: "#455A64",  // charcoal gray backpack
	shoeColor:      "#D84315",  // red-orange sneakers
};

// ══════════════════════════════════════════════════════════════════════════════
//  NPC APPEARANCES — Generic NPC archetypes for the overworld
// ══════════════════════════════════════════════════════════════════════════════

/**
 * @typedef {CharacterAppearance & { smallProportion?: boolean }} NPCAppearance
 */

/** @type {{ [type: string]: NPCAppearance }} */
export const NPC_APPEARANCES = {
	// Villager — simple neutral clothes, friendly townsfolk
	villager: {
		outfitColor:    "#A1887F",  // warm taupe shirt
		outfitAccent:   "#8D6E63",  // brown trousers
		hatStyle:       "none",
		hatColor:       "#000000",
		hairColor:      "#5D4037",  // natural brown
		hairStyle:      "short",
		skinTone:       "#FCDEC0",  // fair
		accessory:      "none",
		accessoryColor: "#000000",
		shoeColor:      "#4E342E",  // plain brown shoes
	},

	// Shopkeeper — warm apron, inviting colors, trustworthy look
	shopkeeper: {
		outfitColor:    "#FF8F00",  // warm amber shirt
		outfitAccent:   "#EFEBE9",  // cream apron
		hatStyle:       "none",
		hatColor:       "#000000",
		hairColor:      "#4E342E",  // dark brown
		hairStyle:      "short",
		skinTone:       "#E8C196",  // medium warm
		accessory:      "glasses",
		accessoryColor: "#FFD54F",  // gold-rimmed glasses
		shoeColor:      "#5D4037",  // brown work shoes
	},

	// Elder — dignified gray-haired sage in flowing robes
	elder: {
		outfitColor:    "#546E7A",  // muted slate blue robes
		outfitAccent:   "#B0BEC5",  // silver-gray sash
		hatStyle:       "none",
		hatColor:       "#000000",
		hairColor:      "#BDBDBD",  // gray
		hairStyle:      "long",
		skinTone:       "#DEC3A0",  // aged warm
		accessory:      "none",
		accessoryColor: "#000000",
		shoeColor:      "#37474F",  // dark formal shoes
	},

	// Guard — armor-tinted outfit with helmet, imposing stance
	guard: {
		outfitColor:    "#37474F",  // dark steel-gray armor
		outfitAccent:   "#78909C",  // lighter steel pauldrons
		hatStyle:       "cap",      // helmet rendered as cap variant
		hatColor:       "#455A64",  // steel helmet
		hairColor:      "#3E2723",  // dark brown (barely visible)
		hairStyle:      "short",
		skinTone:       "#D2A679",  // tanned
		accessory:      "none",
		accessoryColor: "#000000",
		shoeColor:      "#263238",  // dark iron boots
	},

	// Child — bright cheerful colors, smaller proportions
	child: {
		outfitColor:    "#FFEE58",  // sunny yellow shirt
		outfitAccent:   "#66BB6A",  // green shorts
		hatStyle:       "none",
		hatColor:       "#000000",
		hairColor:      "#8D6E63",  // light brown
		hairStyle:      "short",
		skinTone:       "#FFE0C2",  // light peach
		accessory:      "none",
		accessoryColor: "#000000",
		shoeColor:      "#42A5F5",  // bright blue shoes
		smallProportion: true,
	},
};

// ══════════════════════════════════════════════════════════════════════════════
//  LOOKUP HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Look up a trainer's visual appearance by class title.
 * Titles must match the `title` field in TrainerData.js (e.g. "Bug Catcher", "Mystic").
 * @param {string} title — Trainer class title.
 * @returns {CharacterAppearance|null} Appearance config, or null if not found.
 */
export function getTrainerAppearance(title) {
	return TRAINER_APPEARANCES[title] || null;
}

/**
 * Return the player character's default appearance config.
 * @returns {CharacterAppearance}
 */
export function getPlayerAppearance() {
	return PLAYER_APPEARANCE;
}

/**
 * Look up a generic NPC's visual appearance by archetype.
 * @param {string} type — NPC type key: "villager", "shopkeeper", "elder", "guard", "child".
 * @returns {NPCAppearance|null} Appearance config, or null if not found.
 */
export function getNPCAppearance(type) {
	return NPC_APPEARANCES[type] || null;
}
