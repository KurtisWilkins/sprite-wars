/**
 * BattleUnit -- [P3-002] Runtime representation of a single unit in combat.
 * Wraps a SpriteInstance with battle-specific mutable state: HP, status effects,
 * cooldowns, stat modifiers, and grid position.
 *
 * Ported from Game/Scripts/Battle/BattleUnit.gd
 */
import { SPRITE_RACES } from '../../data/SpriteData.js';

export class BattleUnit {
    // -- Constants ----------------------------------------------------------------

    static COMBAT_STAT_KEYS = ['atk', 'def', 'spd', 'sp_atk', 'sp_def'];

    // -- Core References ----------------------------------------------------------

    /** The underlying Sprite data this unit is based on. */
    spriteInstance = null;

    /** Team assignment: 0 = player, 1 = enemy. */
    team = 0;

    /** Current position on the BattleGrid. @type {{x: number, y: number}} */
    gridPosition = { x: 0, y: 0 };

    /** Cached element types (set during init from SpriteRaceData). @type {string[]} */
    elementTypes = [];

    // -- Health -------------------------------------------------------------------

    currentHp = 0;
    maxHp = 0;

    // -- Stats --------------------------------------------------------------------

    /**
     * Effective combat stats after all modifiers.
     * Keys: atk, def, spd, sp_atk, sp_def.
     * @type {Object<string, number>}
     */
    effectiveStats = {
        atk: 0,
        def: 0,
        spd: 0,
        sp_atk: 0,
        sp_def: 0,
    };

    /**
     * Base stats from the SpriteInstance (before battle modifiers).
     * Used as the reference point for recalculating effectiveStats.
     * @type {Object<string, number>}
     */
    _baseBattleStats = {};

    /**
     * Active stat multipliers from buffs/debuffs. Maps stat_key -> Array<number>.
     * Each entry is a multiplier; they are compounded when calculating effective stats.
     * @type {Object<string, number[]>}
     */
    _statMultipliers = {
        atk: [],
        def: [],
        spd: [],
        sp_atk: [],
        sp_def: [],
    };

    // -- Status Effects -----------------------------------------------------------

    /**
     * Active status effects. Each entry:
     * {
     *   effectData: object (StatusEffectData),
     *   remainingTurns: number,
     *   stacks: number,
     * }
     * @type {Array<{effectData: object, remainingTurns: number, stacks: number}>}
     */
    activeStatusEffects = [];

    // -- Abilities ----------------------------------------------------------------

    /**
     * Maps abilityId -> turns_remaining until the ability is off cooldown.
     * Only contains entries for abilities currently on cooldown.
     * @type {Object<number, number>}
     */
    abilityCooldowns = {};

    /**
     * Maps abilityId -> current PP remaining.
     * @type {Object<number, number>}
     */
    abilityPp = {};

    /**
     * Ordered list of this unit's equipped AbilityData abilityIds.
     * @type {number[]}
     */
    equippedAbilities = [];

    // -- Derived State (getters) --------------------------------------------------

    /** Whether this unit is still alive (HP > 0). */
    get isAlive() {
        return this.currentHp > 0;
    }

    /**
     * Whether this unit can take an action this turn.
     * False if dead, stunned, frozen, or asleep.
     */
    get canAct() {
        if (!this.isAlive) return false;
        for (const effectEntry of this.activeStatusEffects) {
            const effectData = effectEntry.effectData;
            if (effectData != null && effectData.preventsAction) {
                return false;
            }
        }
        return true;
    }

    // -- Initialization -----------------------------------------------------------

    /**
     * Set up the BattleUnit from a SpriteInstance and pre-calculated stats.
     * @param {object} instance - The SpriteInstance data resource.
     * @param {Object<string, number>} stats - Full stat dictionary from SpriteInstance.calculateAllEffectiveStats().
     * @param {number} teamId - 0 for player, 1 for enemy.
     * @param {Array} abilities - Array of AbilityData resources this unit can use.
     * @param {string[]} elemTypes - Element types from the SpriteRaceData for this unit.
     */
    initialize(instance, stats, teamId, abilities, elemTypes = []) {
        this.spriteInstance = instance;
        this.team = teamId;
        this.elementTypes = [...elemTypes];

        // Set HP from the full stat dict (HP is computed differently from combat stats).
        this.maxHp = Math.floor(stats.hp || 1);
        this.currentHp = this.maxHp;

        // Store base combat stats.
        for (const key of BattleUnit.COMBAT_STAT_KEYS) {
            const val = Math.floor(stats[key] || 1);
            this._baseBattleStats[key] = val;
            this.effectiveStats[key] = val;
        }

        // Initialize ability PP and cooldowns.
        this.equippedAbilities = [];
        this.abilityPp = {};
        this.abilityCooldowns = {};
        for (const ability of abilities) {
            if (ability != null && ability.abilityId !== undefined) {
                this.equippedAbilities.push(ability.abilityId);
                this.abilityPp[ability.abilityId] = ability.ppMax;
            }
        }

        // Clear status effects.
        this.activeStatusEffects = [];
        this._resetMultipliers();
    }

    // -- Stat Modification --------------------------------------------------------

    /** Recalculate effective stats from base + all active multipliers. */
    calculateEffectiveStats() {
        for (const key of BattleUnit.COMBAT_STAT_KEYS) {
            const baseVal = this._baseBattleStats[key] || 1;
            let combinedMult = 1.0;
            const mults = this._statMultipliers[key] || [];
            for (const mult of mults) {
                combinedMult *= mult;
            }
            // Clamp multiplier to prevent stats from going below 25% or above 400%.
            combinedMult = Math.min(Math.max(combinedMult, 0.25), 4.0);
            this.effectiveStats[key] = Math.max(1, Math.floor(baseVal * combinedMult));
        }
    }

    /**
     * Add a multiplicative stat modifier (e.g. 1.5 for +50%, 0.75 for -25%).
     * @param {string} stat
     * @param {number} multiplier
     */
    applyStatModifier(stat, multiplier) {
        if (!(stat in this._statMultipliers)) {
            console.warn(`BattleUnit: Invalid stat key '${stat}' for modifier.`);
            return;
        }
        this._statMultipliers[stat].push(multiplier);
        this.calculateEffectiveStats();
    }

    /**
     * Remove a specific stat modifier. Removes the first matching value.
     * @param {string} stat
     * @param {number} multiplier
     */
    removeStatModifier(stat, multiplier) {
        if (!(stat in this._statMultipliers)) return;
        const mults = this._statMultipliers[stat];
        const idx = mults.indexOf(multiplier);
        if (idx >= 0) {
            mults.splice(idx, 1);
        }
        this.calculateEffectiveStats();
    }

    /** Clear all stat multipliers (used on battle end or full cleanse). */
    _resetMultipliers() {
        for (const key of BattleUnit.COMBAT_STAT_KEYS) {
            this._statMultipliers[key] = [];
        }
    }

    // -- Damage & Healing ---------------------------------------------------------

    /**
     * Apply damage to this unit. Returns a result dictionary.
     * @param {number} amount
     * @returns {{actualDamage: number, isFainted: boolean}}
     */
    takeDamage(amount) {
        const actual = Math.max(0, amount);
        const wasAlive = this.isAlive;
        this.currentHp = Math.max(0, this.currentHp - actual);
        const fainted = wasAlive && !this.isAlive;
        return {
            actualDamage: actual,
            isFainted: fainted,
        };
    }

    /**
     * Heal this unit. Returns the actual amount healed (capped at max HP).
     * @param {number} amount
     * @returns {number}
     */
    heal(amount) {
        if (!this.isAlive) return 0;
        const healAmount = Math.max(0, amount);
        const oldHp = this.currentHp;
        this.currentHp = Math.min(this.currentHp + healAmount, this.maxHp);
        return this.currentHp - oldHp;
    }

    // -- Cooldown Management ------------------------------------------------------

    /** Reduce all ability cooldowns by 1 turn. Called at the start of this unit's turn. */
    reduceCooldowns() {
        const toRemove = [];
        for (const abilityId in this.abilityCooldowns) {
            this.abilityCooldowns[abilityId] -= 1;
            if (this.abilityCooldowns[abilityId] <= 0) {
                toRemove.push(abilityId);
            }
        }
        for (const abilityId of toRemove) {
            delete this.abilityCooldowns[abilityId];
        }
    }

    /**
     * Consume 1 PP for an ability. If PP reaches 0, start the cooldown.
     * @param {object} ability - AbilityData object with abilityId, ppMax, cooldownTurns.
     */
    consumePp(ability) {
        const aid = ability.abilityId;
        if (aid in this.abilityPp) {
            this.abilityPp[aid] = Math.max(0, this.abilityPp[aid] - 1);
            if (this.abilityPp[aid] <= 0 && ability.cooldownTurns > 0) {
                this.abilityCooldowns[aid] = ability.cooldownTurns;
                // PP will be restored when cooldown expires.
            }
        }
    }

    /**
     * Restore PP for an ability that has come off cooldown.
     * @param {object} ability - AbilityData object with abilityId, ppMax.
     */
    restorePp(ability) {
        this.abilityPp[ability.abilityId] = ability.ppMax;
    }

    /**
     * Whether an ability is currently usable (has PP and is not on cooldown).
     * @param {object} ability - AbilityData object with abilityId.
     * @returns {boolean}
     */
    canUseAbility(ability) {
        const aid = ability.abilityId;
        if (aid in this.abilityCooldowns) return false;
        return (this.abilityPp[aid] || 0) > 0;
    }

    // -- Status Effect Queries ----------------------------------------------------

    /**
     * Check if this unit has a specific status effect by effectId.
     * @param {number} effectId
     * @returns {boolean}
     */
    hasStatusEffect(effectId) {
        for (const entry of this.activeStatusEffects) {
            const ed = entry.effectData;
            if (ed != null && ed.effectId === effectId) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get the status effect entry for a given effectId, or null.
     * @param {number} effectId
     * @returns {object|null}
     */
    getStatusEffectEntry(effectId) {
        for (const entry of this.activeStatusEffects) {
            const ed = entry.effectData;
            if (ed != null && ed.effectId === effectId) {
                return entry;
            }
        }
        return null;
    }

    /**
     * Whether this unit is immune to a given effect type.
     * Certain element types grant natural immunity to specific status conditions.
     * @param {string} effectType
     * @returns {boolean}
     */
    isStatusImmune(effectType) {
        // Fire-type Sprites are immune to burn.
        if (effectType === 'burn' && this.elementTypes.includes('Fire')) return true;
        // Ice-type Sprites are immune to freeze.
        if (effectType === 'freeze' && this.elementTypes.includes('Ice')) return true;
        // Poison-type Sprites are immune to poison.
        if (effectType === 'poison' && this.elementTypes.includes('Poison')) return true;
        // Electric-type Sprites are immune to paralysis.
        if (effectType === 'paralysis' && this.elementTypes.includes('Electric')) return true;
        return false;
    }

    // -- Display Helpers ----------------------------------------------------------

    /**
     * Get the display name for this unit.
     * @returns {string}
     */
    getDisplayName() {
        if (this.spriteInstance == null) return 'Unknown';
        if (this.spriteInstance.nickname && this.spriteInstance.nickname.length > 0) {
            return this.spriteInstance.nickname;
        }
        const race = SPRITE_RACES.find(r => r.race_id === this.spriteInstance.raceId);
        return race ? race.race_name : `Sprite #${this.spriteInstance.raceId}`;
    }

    /**
     * Get the current HP as a fraction of max (0.0 - 1.0).
     * @returns {number}
     */
    getHpFraction() {
        if (this.maxHp <= 0) return 0.0;
        return this.currentHp / this.maxHp;
    }

    /**
     * Get the unit's level.
     * @returns {number}
     */
    getLevel() {
        if (this.spriteInstance == null) return 1;
        return this.spriteInstance.level || 1;
    }

    /**
     * Get the unit's element types (cached from race data at init time).
     * @returns {string[]}
     */
    getElementTypes() {
        return this.elementTypes;
    }

    /**
     * Whether this unit has a specific element.
     * @param {string} elementName
     * @returns {boolean}
     */
    hasElement(elementName) {
        return this.elementTypes.includes(elementName);
    }
}
