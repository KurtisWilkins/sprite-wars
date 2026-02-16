## NotificationSystem — Toast notifications, item pickups, level-ups, and quest updates.
## [P8-012] Queues notifications and shows up to max_visible at a time with
## slide-in/slide-out animations from the top of the screen.
class_name NotificationSystem
extends CanvasLayer

## ── Constants ────────────────────────────────────────────────────────────────

const NOTIFICATION_HEIGHT: float = 80.0
const NOTIFICATION_MARGIN: float = 12.0
const NOTIFICATION_PADDING: float = 16.0
const SLIDE_DURATION: float = 0.3
const SAFE_AREA_TOP: float = 48.0

## Type-to-color mapping.
const TYPE_COLORS: Dictionary = {
	"info": Color(0.2, 0.5, 0.9, 1.0),
	"success": Color(0.2, 0.75, 0.35, 1.0),
	"warning": Color(0.9, 0.75, 0.15, 1.0),
	"error": Color(0.85, 0.2, 0.2, 1.0),
	"reward": Color(0.95, 0.75, 0.1, 1.0),
}

## ── Configuration ────────────────────────────────────────────────────────────

@export var max_visible: int = 3
@export var default_duration: float = 3.0

## ── State ────────────────────────────────────────────────────────────────────

var notification_queue: Array[Dictionary] = []
var active_notifications: Array[Control] = []

## ── Internal Nodes ───────────────────────────────────────────────────────────

var _container: VBoxContainer


## ── Lifecycle ────────────────────────────────────────────────────────────────

func _ready() -> void:
	layer = 90
	_build_ui()

	if EventBus:
		EventBus.notification_requested.connect(_on_notification_requested)
		EventBus.item_acquired.connect(_on_item_acquired)
		EventBus.level_up.connect(_on_level_up)
		EventBus.quest_objective_updated.connect(_on_quest_updated)


func _build_ui() -> void:
	_container = VBoxContainer.new()
	_container.name = "NotificationContainer"
	_container.set_anchors_preset(Control.PRESET_TOP_WIDE)
	_container.position = Vector2(0.0, SAFE_AREA_TOP)
	_container.size = Vector2(1080.0, 0.0)
	_container.add_theme_constant_override("separation", int(NOTIFICATION_MARGIN))
	_container.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_container)


## ── Public API ───────────────────────────────────────────────────────────────

## Show a simple toast notification.
func show_toast(message: String, type: String = "info", duration: float = 3.0) -> void:
	var data: Dictionary = {
		"message": message,
		"type": type,
		"duration": duration,
		"style": "toast",
	}
	_enqueue(data)


## Show an item-received notification with icon and quantity.
func show_item_received(item_name: String, icon: Texture2D, quantity: int = 1) -> void:
	var qty_text: String = " x%d" % quantity if quantity > 1 else ""
	var data: Dictionary = {
		"message": "Received: %s%s" % [item_name, qty_text],
		"type": "reward",
		"duration": default_duration,
		"style": "item",
		"icon": icon,
	}
	_enqueue(data)


## Show a level-up notification.
func show_level_up(sprite_name: String, new_level: int) -> void:
	var data: Dictionary = {
		"message": "%s reached Level %d!" % [sprite_name, new_level],
		"type": "success",
		"duration": default_duration + 1.0,
		"style": "level_up",
	}
	_enqueue(data)


## Show a quest update notification.
func show_quest_update(quest_title: String, update_text: String) -> void:
	var data: Dictionary = {
		"message": "%s — %s" % [quest_title, update_text],
		"type": "info",
		"duration": default_duration + 0.5,
		"style": "quest",
	}
	_enqueue(data)


## ── Queue Management ─────────────────────────────────────────────────────────

func _enqueue(data: Dictionary) -> void:
	notification_queue.append(data)
	_process_queue()


func _process_queue() -> void:
	while active_notifications.size() < max_visible and not notification_queue.is_empty():
		var data: Dictionary = notification_queue.pop_front()
		_spawn_notification(data)


## ── Notification Creation ────────────────────────────────────────────────────

func _spawn_notification(data: Dictionary) -> void:
	var notif := _create_notification_panel(data)
	_container.add_child(notif)
	active_notifications.append(notif)

	_animate_notification(notif, true)

	# Auto-dismiss after duration.
	var duration: float = data.get("duration", default_duration)
	var timer := get_tree().create_timer(duration)
	timer.timeout.connect(func() -> void:
		_dismiss_notification(notif)
	)


func _create_notification_panel(data: Dictionary) -> PanelContainer:
	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(1080.0 - 32.0, NOTIFICATION_HEIGHT)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.mouse_filter = Control.MOUSE_FILTER_IGNORE

	# Style the panel background.
	var type_str: String = data.get("type", "info")
	var base_color: Color = TYPE_COLORS.get(type_str, TYPE_COLORS["info"])

	var style := StyleBoxFlat.new()
	style.bg_color = Color(base_color.r * 0.3, base_color.g * 0.3, base_color.b * 0.3, 0.92)
	style.border_width_left = 4
	style.border_color = base_color
	style.corner_radius_top_left = 10
	style.corner_radius_top_right = 10
	style.corner_radius_bottom_left = 10
	style.corner_radius_bottom_right = 10
	style.content_margin_left = NOTIFICATION_PADDING
	style.content_margin_right = NOTIFICATION_PADDING
	style.content_margin_top = NOTIFICATION_PADDING * 0.5
	style.content_margin_bottom = NOTIFICATION_PADDING * 0.5
	panel.add_theme_stylebox_override("panel", style)

	# Content HBox.
	var hbox := HBoxContainer.new()
	hbox.add_theme_constant_override("separation", 12)
	hbox.alignment = BoxContainer.ALIGNMENT_BEGIN
	panel.add_child(hbox)

	# Type icon or item icon.
	var icon_texture: Texture2D = data.get("icon", null) as Texture2D
	if icon_texture:
		var icon_rect := TextureRect.new()
		icon_rect.texture = icon_texture
		icon_rect.custom_minimum_size = Vector2(48.0, 48.0)
		icon_rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		icon_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		hbox.add_child(icon_rect)

	# Style prefix for special types.
	var style_type: String = data.get("style", "toast")
	var prefix: String = ""
	match style_type:
		"level_up":
			prefix = "[LV UP] "
		"quest":
			prefix = "[QUEST] "
		"item":
			prefix = ""  # Item messages are already formatted.

	# Message label.
	var label := Label.new()
	label.text = prefix + data.get("message", "")
	label.add_theme_font_size_override("font_size", 20)
	label.add_theme_color_override("font_color", Color.WHITE)
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	hbox.add_child(label)

	return panel


## ── Dismissal ────────────────────────────────────────────────────────────────

func _dismiss_notification(notif: Control) -> void:
	if not is_instance_valid(notif):
		return
	if notif not in active_notifications:
		return

	_animate_notification(notif, false)

	var tween := create_tween()
	tween.tween_interval(SLIDE_DURATION)
	tween.tween_callback(func() -> void:
		active_notifications.erase(notif)
		if is_instance_valid(notif):
			notif.queue_free()
		_process_queue()
	)


## ── Animations ───────────────────────────────────────────────────────────────

## Slide notification in from the top (enter = true) or out upward (enter = false).
func _animate_notification(notif: Control, enter: bool) -> void:
	if not is_instance_valid(notif):
		return

	var tween := create_tween()
	tween.set_ease(Tween.EASE_OUT if enter else Tween.EASE_IN)
	tween.set_trans(Tween.TRANS_CUBIC)

	if enter:
		notif.modulate = Color(1.0, 1.0, 1.0, 0.0)
		notif.position = Vector2(0.0, -NOTIFICATION_HEIGHT)
		tween.set_parallel(true)
		tween.tween_property(notif, "modulate:a", 1.0, SLIDE_DURATION)
		tween.tween_property(notif, "position:y", 0.0, SLIDE_DURATION)
	else:
		tween.set_parallel(true)
		tween.tween_property(notif, "modulate:a", 0.0, SLIDE_DURATION)
		tween.tween_property(notif, "position:y", -NOTIFICATION_HEIGHT, SLIDE_DURATION)


## ── EventBus Handlers ────────────────────────────────────────────────────────

func _on_notification_requested(message: String, type: String) -> void:
	show_toast(message, type)


func _on_item_acquired(item: Resource, quantity: int) -> void:
	var item_name: String = item.get("item_name") if item.get("item_name") else "Unknown Item"
	var icon: Texture2D = null
	if item.get("icon_path"):
		icon = load(item.get("icon_path")) as Texture2D
	show_item_received(item_name, icon, quantity)


func _on_level_up(sprite_data: Resource, new_level: int) -> void:
	var sname: String = ""
	if sprite_data is SpriteInstance:
		var si := sprite_data as SpriteInstance
		sname = si.nickname if not si.nickname.is_empty() else "Sprite #%d" % si.instance_id
	else:
		sname = str(sprite_data)
	show_level_up(sname, new_level)


func _on_quest_updated(quest: Resource, _objective_index: int) -> void:
	var quest_title: String = quest.get("quest_title") if quest.get("quest_title") else "Quest"
	show_quest_update(quest_title, "Objective updated")
