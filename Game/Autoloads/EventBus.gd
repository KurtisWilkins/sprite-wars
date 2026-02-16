## EventBus — Global signal hub for decoupled communication between systems.
extends Node

# Battle signals
signal battle_started(battle_data: Dictionary)
signal battle_ended(result: Dictionary)
signal turn_started(unit: Resource)
signal turn_ended(unit: Resource)
signal ability_used(caster: Resource, ability: Resource, targets: Array)
signal damage_dealt(attacker: Resource, defender: Resource, amount: int, is_crit: bool, effectiveness: float)
signal unit_fainted(unit: Resource)
signal status_applied(unit: Resource, effect: Resource)
signal status_expired(unit: Resource, effect: Resource)
signal knockback_occurred(unit: Resource, from_pos: Vector2i, to_pos: Vector2i)

# Catching signals
signal catch_attempted(crystal: Resource, target: Resource)
signal catch_succeeded(sprite_data: Resource)
signal catch_failed(sprite_data: Resource)

# Progression signals
signal xp_gained(sprite_data: Resource, amount: int)
signal level_up(sprite_data: Resource, new_level: int)
signal evolution_triggered(sprite_data: Resource, new_stage: int)
signal evolution_completed(sprite_data: Resource)
signal evolution_cancelled(sprite_data: Resource)
signal ability_learned(sprite_data: Resource, ability: Resource)

# Equipment signals
signal equipment_changed(sprite_data: Resource, slot: int, item: Resource)
signal item_acquired(item: Resource, quantity: int)
signal item_used(item: Resource)
signal currency_changed(amount: int)

# Quest signals
signal quest_available(quest: Resource)
signal quest_accepted(quest: Resource)
signal quest_objective_updated(quest: Resource, objective_index: int)
signal quest_completed(quest: Resource)
signal quest_reward_claimed(quest: Resource)

# Overworld signals
signal area_entered(area_id: String)
signal area_exited(area_id: String)
signal npc_interaction_started(npc_id: String)
signal npc_interaction_ended(npc_id: String)
signal encounter_triggered(encounter_data: Dictionary)
signal shop_opened(shop_id: String)

# Temple signals
signal temple_entered(temple_id: String)
signal temple_area_cleared(temple_id: String, area_index: int)
signal temple_boss_defeated(temple_id: String)
signal temple_completed(temple_id: String)
signal composition_bonus_activated(bonus: Resource)

# UI signals
signal screen_changed(screen_name: String)
signal notification_requested(message: String, type: String)
signal dialog_requested(title: String, message: String, callback: Callable)

# Save signals
signal save_requested()
signal save_completed(success: bool)
signal load_completed(success: bool)

# Audio signals
signal music_changed(track_name: String)
signal sfx_requested(sfx_name: String, position: Vector2)
