/**
 * TrainerData.js — Trainer definitions for battlable NPCs.
 * Each trainer has an id matching the NPC id in region map data,
 * a team of Sprites, pre/post-battle dialogue, and rewards.
 *
 * team[].raceId references SpriteData.js race_id (1-24).
 * team[].stage: 0 = base, 1 = stage 2, 2 = stage 3.
 *
 * @typedef {Object} TrainerSprite
 * @property {number} raceId
 * @property {number} level
 * @property {number} stage
 *
 * @typedef {Object} TrainerDef
 * @property {string} id          — Must match the NPC id in region map data.
 * @property {string} name        — Display name.
 * @property {string} title       — Class/title shown in battle UI.
 * @property {TrainerSprite[]} team
 * @property {string[]} preDialogue   — Lines shown before battle.
 * @property {string[]} postDialogue  — Lines shown after defeat.
 * @property {number} goldReward
 * @property {number} xpBonus     — Bonus XP on top of normal battle XP.
 *
 * @typedef {{ [trainerId: string]: TrainerDef }} TrainerMap
 */

/** @type {TrainerMap} */
export const TRAINERS = {
	// ══════════════════════════════════════════════════════════════════════
	//  STARTER ROUTE TRAINERS — Early encounters, levels 3-7
	// ══════════════════════════════════════════════════════════════════════

	// Bug Catcher Tim — first trainer the player encounters on Verdant Route
	trainer_tim: {
		id: "trainer_tim",
		name: "Bug Catcher Tim",
		title: "Bug Catcher",
		team: [
			{ raceId: 3, level: 3, stage: 0 },  // Bird Man (Plant)
			{ raceId: 14, level: 4, stage: 0 },  // Minotaur (Poison)
		],
		preDialogue: [
			"Hey! You look like a new trainer!",
			"Let me show you what my Bug-type Sprites can do!",
		],
		postDialogue: [
			"Wow, you beat me fair and square!",
			"Your Sprites are tougher than they look. Keep it up!",
		],
		goldReward: 120,
		xpBonus: 25,
	},

	// Javelin Kai — patrols the Verdant Route, tougher than Tim
	trainer_kai: {
		id: "trainer_kai",
		name: "Javelin Kai",
		title: "Javelin",
		team: [
			{ raceId: 5, level: 5, stage: 0 },  // Devil (Wind)
			{ raceId: 3, level: 5, stage: 0 },  // Bird Man (Plant)
			{ raceId: 6, level: 6, stage: 0 },  // Cat Man (Earth)
		],
		preDialogue: [
			"Hold it right there, rookie!",
			"The wilds ahead are dangerous. Let me test if you are ready!",
		],
		postDialogue: [
			"Ha! You have got real talent.",
			"The path ahead leads to the forest. Stay sharp out there!",
		],
		goldReward: 200,
		xpBonus: 40,
	},

	// ══════════════════════════════════════════════════════════════════════
	//  STARTER TOWN TRAINERS — Optional battles near Willowshade
	// ══════════════════════════════════════════════════════════════════════

	// Youngster Pip — hangs around the town gate, eager to battle
	trainer_pip: {
		id: "trainer_pip",
		name: "Youngster Pip",
		title: "Youngster",
		team: [
			{ raceId: 1, level: 4, stage: 0 },  // Bug Man (Fire)
		],
		preDialogue: [
			"I just got my first Sprite yesterday!",
			"Wanna see how strong it is? Battle me!",
		],
		postDialogue: [
			"Aww, I lost... but my Bug Man tried its hardest!",
			"I will train harder and challenge you again someday!",
		],
		goldReward: 80,
		xpBonus: 15,
	},

	// Lass Fern — nature-lover trainer near the pond
	trainer_fern: {
		id: "trainer_fern",
		name: "Lass Fern",
		title: "Lass",
		team: [
			{ raceId: 2, level: 4, stage: 0 },  // Bear Man (Water)
			{ raceId: 3, level: 3, stage: 0 },  // Bird Man (Plant)
		],
		preDialogue: [
			"The Sprites near this pond are so graceful...",
			"Oh! A challenger? My Water-types won't go easy on you!",
		],
		postDialogue: [
			"You are really something! Your bond with your Sprites is strong.",
			"Come visit the pond again sometime. The sunsets here are beautiful.",
		],
		goldReward: 100,
		xpBonus: 20,
	},

	// ══════════════════════════════════════════════════════════════════════
	//  FOREST PATH TRAINERS — Mid-early area, levels 6-10
	// ══════════════════════════════════════════════════════════════════════

	// Hiker Gord — blocks the mountain trail, earth/metal specialist
	trainer_gord: {
		id: "trainer_gord",
		name: "Hiker Gord",
		title: "Hiker",
		team: [
			{ raceId: 6, level: 7, stage: 0 },   // Cat Man (Earth)
			{ raceId: 13, level: 7, stage: 0 },   // Lizard Man (Metal)
			{ raceId: 6, level: 8, stage: 0 },    // Cat Man (Earth)
		],
		preDialogue: [
			"You want to pass through here?",
			"Not until you prove you can handle the mountain trails!",
			"My Rock-solid Sprites will put you to the test!",
		],
		postDialogue: [
			"Bah! You crumbled my defenses...",
			"Fine, the trail is yours. Watch out for wild Sprites deeper in!",
		],
		goldReward: 280,
		xpBonus: 50,
	},

	// Mystic Lira — psychic-specialist found deep in the forest
	trainer_lira: {
		id: "trainer_lira",
		name: "Mystic Lira",
		title: "Mystic",
		team: [
			{ raceId: 10, level: 8, stage: 0 },  // Ghost (Fairy)
			{ raceId: 9, level: 8, stage: 0 },   // Fish Man (Light)
			{ raceId: 7, level: 9, stage: 0 },   // Elf (Electric)
		],
		preDialogue: [
			"I sensed your approach long before you arrived...",
			"The spirits whisper that you seek the temple. Interesting.",
			"Show me the strength of your conviction!",
		],
		postDialogue: [
			"Your spirit burns bright. The temple guardian awaits.",
			"Take this as a token of my respect. May the spirits guide you.",
		],
		goldReward: 320,
		xpBonus: 60,
	},
};

/**
 * Look up a trainer definition by NPC id.
 * @param {string} trainerId
 * @returns {TrainerDef|null}
 */
export function getTrainer(trainerId) {
	return TRAINERS[trainerId] || null;
}

/**
 * Get all trainer ids for a given region.
 * Useful for checking defeated state / region completion.
 * @param {string} regionId
 * @returns {string[]}
 */
export function getTrainersForRegion(regionId) {
	const regionTrainers = {
		starter_town: ["trainer_pip", "trainer_fern"],
		starter_route: ["trainer_tim", "trainer_kai"],
		forest_path: ["trainer_gord", "trainer_lira"],
	};
	return regionTrainers[regionId] || [];
}
