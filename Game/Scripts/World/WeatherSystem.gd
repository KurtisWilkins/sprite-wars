## WeatherSystem — Manages overworld weather effects including particles,
## overlays, transitions, encounter rate modifiers, and battle conditions.
## [P5-017] Supports 9 weather types with smooth transitions between states.
extends Node2D

## ── Configuration ───────────────────────────────────────────────────────────

## Currently active weather type.
var current_weather: String = "clear"

## Previous weather type (for transition blending).
var _previous_weather: String = "clear"

## ── Node References ─────────────────────────────────────────────────────────

## GPU particle system for weather effects (rain drops, snowflakes, etc.).
@onready var particle_emitter: GPUParticles2D = $GPUParticles2D if has_node("GPUParticles2D") else null

## Full-screen color overlay for fog, sandstorm tint, etc.
@onready var overlay: ColorRect = $Overlay if has_node("Overlay") else null

## ── Weather Type Definitions ────────────────────────────────────────────────

## Configuration for each weather type:
##   particle_texture: String — res:// path to the particle texture
##   color: Color — overlay tint color
##   overlay_alpha: float — overlay opacity
##   intensity: float — particle emission rate multiplier
##   wind: Vector2 — wind direction affecting particle movement
##   particle_amount: int — number of particles
##   particle_lifetime: float — particle lifetime in seconds
var weather_configs: Dictionary = {
	"clear": {
		"particle_texture": "",
		"color": Color(1, 1, 1, 0),
		"overlay_alpha": 0.0,
		"intensity": 0.0,
		"wind": Vector2.ZERO,
		"particle_amount": 0,
		"particle_lifetime": 1.0,
	},
	"rain": {
		"particle_texture": "res://Sprites/Weather/rain_drop.png",
		"color": Color(0.3, 0.35, 0.5, 0.15),
		"overlay_alpha": 0.15,
		"intensity": 1.0,
		"wind": Vector2(-30.0, 200.0),
		"particle_amount": 200,
		"particle_lifetime": 1.5,
	},
	"snow": {
		"particle_texture": "res://Sprites/Weather/snowflake.png",
		"color": Color(0.8, 0.85, 0.95, 0.1),
		"overlay_alpha": 0.1,
		"intensity": 0.7,
		"wind": Vector2(-10.0, 40.0),
		"particle_amount": 150,
		"particle_lifetime": 4.0,
	},
	"sandstorm": {
		"particle_texture": "res://Sprites/Weather/sand_particle.png",
		"color": Color(0.7, 0.55, 0.3, 0.3),
		"overlay_alpha": 0.3,
		"intensity": 1.5,
		"wind": Vector2(150.0, 20.0),
		"particle_amount": 300,
		"particle_lifetime": 2.0,
	},
	"fog": {
		"particle_texture": "",
		"color": Color(0.75, 0.78, 0.8, 0.4),
		"overlay_alpha": 0.4,
		"intensity": 0.0,
		"wind": Vector2(5.0, 0.0),
		"particle_amount": 0,
		"particle_lifetime": 1.0,
	},
	"leaves": {
		"particle_texture": "res://Sprites/Weather/leaf.png",
		"color": Color(0.9, 0.85, 0.7, 0.05),
		"overlay_alpha": 0.05,
		"intensity": 0.3,
		"wind": Vector2(40.0, 30.0),
		"particle_amount": 30,
		"particle_lifetime": 5.0,
	},
	"volcanic_ash": {
		"particle_texture": "res://Sprites/Weather/ash_particle.png",
		"color": Color(0.3, 0.25, 0.2, 0.35),
		"overlay_alpha": 0.35,
		"intensity": 1.2,
		"wind": Vector2(10.0, 50.0),
		"particle_amount": 250,
		"particle_lifetime": 3.0,
	},
	"fairy_sparkle": {
		"particle_texture": "res://Sprites/Weather/sparkle.png",
		"color": Color(0.9, 0.8, 1.0, 0.08),
		"overlay_alpha": 0.08,
		"intensity": 0.4,
		"wind": Vector2(0.0, -15.0),
		"particle_amount": 60,
		"particle_lifetime": 3.5,
	},
	"shadow_mist": {
		"particle_texture": "res://Sprites/Weather/shadow_wisp.png",
		"color": Color(0.15, 0.1, 0.2, 0.45),
		"overlay_alpha": 0.45,
		"intensity": 0.6,
		"wind": Vector2(0.0, -5.0),
		"particle_amount": 80,
		"particle_lifetime": 4.0,
	},
}

## ── Encounter Rate Modifiers ────────────────────────────────────────────────

## How each weather type modifies the base encounter rate.
## > 1.0 = more encounters, < 1.0 = fewer encounters.
var _encounter_rate_modifiers: Dictionary = {
	"clear": 1.0,
	"rain": 1.2,
	"snow": 0.8,
	"sandstorm": 1.5,
	"fog": 1.3,
	"leaves": 1.0,
	"volcanic_ash": 1.4,
	"fairy_sparkle": 0.7,
	"shadow_mist": 1.6,
}

## ── Battle Condition Data ───────────────────────────────────────────────────

## Battle conditions imposed by active weather. Empty dict for no effect.
## Keys may include: element_boost (String), element_nerf (String),
## accuracy_modifier (float), damage_modifier (float), status_chance_modifier (float).
var _battle_conditions: Dictionary = {
	"clear": {},
	"rain": {
		"element_boost": "Water",
		"element_nerf": "Fire",
		"accuracy_modifier": 0.95,
	},
	"snow": {
		"element_boost": "Ice",
		"element_nerf": "Nature",
		"speed_modifier": 0.9,
	},
	"sandstorm": {
		"element_boost": "Earth",
		"accuracy_modifier": 0.85,
		"dot_damage_per_turn": 5,
		"dot_immune_elements": ["Earth", "Steel", "Rock"],
	},
	"fog": {
		"accuracy_modifier": 0.80,
	},
	"leaves": {},
	"volcanic_ash": {
		"element_boost": "Fire",
		"element_nerf": "Nature",
		"accuracy_modifier": 0.90,
	},
	"fairy_sparkle": {
		"element_boost": "Fairy",
		"healing_modifier": 1.2,
	},
	"shadow_mist": {
		"element_boost": "Dark",
		"element_nerf": "Light",
		"accuracy_modifier": 0.85,
	},
}

## ── Internal State ──────────────────────────────────────────────────────────

var _transition_tween: Tween = null
var _is_transitioning: bool = false


## ── Signals ─────────────────────────────────────────────────────────────────

signal weather_changed(old_weather: String, new_weather: String)
signal weather_transition_started(target_weather: String)
signal weather_transition_completed(weather: String)


## ── Lifecycle ───────────────────────────────────────────────────────────────

func _ready() -> void:
	add_to_group("weather_system")
	_apply_weather_immediate(current_weather)


## ── Public API ──────────────────────────────────────────────────────────────

## Transitions to a new weather type over the specified duration.
## If transition_time is 0, the change is applied immediately.
func set_weather(weather_type: String, transition_time: float = 1.0) -> void:
	if weather_type == current_weather:
		return

	if not weather_configs.has(weather_type):
		push_warning("WeatherSystem: unknown weather type '%s'" % weather_type)
		return

	_previous_weather = current_weather
	current_weather = weather_type

	weather_changed.emit(_previous_weather, current_weather)

	if transition_time <= 0.0:
		_apply_weather_immediate(weather_type)
		return

	weather_transition_started.emit(weather_type)
	_is_transitioning = true

	# Kill any existing transition
	if _transition_tween and _transition_tween.is_valid():
		_transition_tween.kill()

	_transition_tween = create_tween()
	_transition_tween.set_parallel(true)

	var config: Dictionary = weather_configs[weather_type]

	# Transition overlay color
	if overlay:
		var target_color: Color = config.get("color", Color.TRANSPARENT)
		_transition_tween.tween_property(overlay, "color", target_color, transition_time) \
			.set_ease(Tween.EASE_IN_OUT).set_trans(Tween.TRANS_CUBIC)

	# Transition particle emission
	if particle_emitter:
		var target_amount: int = config.get("particle_amount", 0)
		if target_amount > 0:
			_configure_particles(config)
			particle_emitter.emitting = true
			_transition_tween.tween_property(
				particle_emitter, "amount", target_amount, transition_time
			)
		else:
			_transition_tween.tween_callback(func() -> void:
				particle_emitter.emitting = false
			).set_delay(transition_time)

	# Callback on completion
	_transition_tween.chain().tween_callback(func() -> void:
		_is_transitioning = false
		weather_transition_completed.emit(current_weather)
	)


## Returns the encounter rate modifier for the given weather type.
func get_encounter_rate_modifier(weather: String) -> float:
	return _encounter_rate_modifiers.get(weather, 1.0)


## Returns the battle condition Dictionary for the given weather type.
## Empty Dictionary means no weather-based battle modifiers.
func get_battle_condition(weather: String) -> Dictionary:
	return _battle_conditions.get(weather, {})


## Returns true if a weather transition is currently in progress.
func is_transitioning() -> bool:
	return _is_transitioning


## ── Internal: Immediate Application ─────────────────────────────────────────

func _apply_weather_immediate(weather_type: String) -> void:
	var config: Dictionary = weather_configs.get(weather_type, weather_configs["clear"])

	# Apply overlay
	if overlay:
		overlay.color = config.get("color", Color.TRANSPARENT)

	# Apply particles
	if particle_emitter:
		var amount: int = config.get("particle_amount", 0)
		if amount > 0:
			_configure_particles(config)
			particle_emitter.amount = amount
			particle_emitter.emitting = true
		else:
			particle_emitter.emitting = false


## ── Internal: Particle Configuration ────────────────────────────────────────

func _configure_particles(config: Dictionary) -> void:
	if not particle_emitter:
		return

	# Set particle texture
	var texture_path: String = config.get("particle_texture", "")
	if not texture_path.is_empty():
		var tex := load(texture_path) as Texture2D
		if tex and particle_emitter.process_material:
			# GPUParticles2D uses a ParticleProcessMaterial; texture is set on the
			# draw pass (mesh) or via the texture property on a CanvasItemMaterial.
			# For simplicity, we configure via the process material's direction.
			pass

	# Set wind / direction via process material
	if particle_emitter.process_material and particle_emitter.process_material is ParticleProcessMaterial:
		var mat: ParticleProcessMaterial = particle_emitter.process_material as ParticleProcessMaterial
		var wind: Vector2 = config.get("wind", Vector2.ZERO)
		mat.direction = Vector3(wind.x, wind.y, 0.0)
		mat.initial_velocity_min = config.get("intensity", 1.0) * 50.0
		mat.initial_velocity_max = config.get("intensity", 1.0) * 80.0

	particle_emitter.lifetime = config.get("particle_lifetime", 1.0)
