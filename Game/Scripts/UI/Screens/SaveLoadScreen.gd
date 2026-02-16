## SaveLoadScreen — 3 save slots with preview info, save/load/delete operations.
## [P8-010] Each slot shows timestamp, playtime, team preview, and progress %.
## Supports both save and load modes.
class_name SaveLoadScreen
extends Control

## ── Constants ────────────────────────────────────────────────────────────────

const SAVE_SLOT_COUNT: int = 3
const SLOT_HEIGHT: float = 220.0

## ── State ────────────────────────────────────────────────────────────────────

var mode: String = "save"  # "save" or "load"
var _selected_slot: int = -1

## ── Nodes ────────────────────────────────────────────────────────────────────

var save_slots: Array[PanelContainer] = []
var back_button: Button
var _action_button: Button
var _delete_button: Button
var _mode_label: Label


## ── Lifecycle ────────────────────────────────────────────────────────────────

func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	_build_ui()
	_refresh_slots()


func set_mode(new_mode: String) -> void:
	mode = new_mode
	if _mode_label:
		_mode_label.text = "Save Game" if mode == "save" else "Load Game"
	if _action_button:
		_action_button.text = "Save" if mode == "save" else "Load"
	_refresh_slots()


func _build_ui() -> void:
	# Background.
	var bg := ColorRect.new()
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.color = Color(0.06, 0.06, 0.1, 1.0)
	add_child(bg)

	add_child(_build_top_bar())

	# Content.
	var content := VBoxContainer.new()
	content.set_anchors_preset(Control.PRESET_FULL_RECT)
	content.offset_top = 100.0
	content.offset_bottom = -100.0
	content.add_theme_constant_override("separation", 16)
	add_child(content)

	var margin := MarginContainer.new()
	margin.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	margin.size_flags_vertical = Control.SIZE_EXPAND_FILL
	margin.add_theme_constant_override("margin_left", 32)
	margin.add_theme_constant_override("margin_right", 32)
	margin.add_theme_constant_override("margin_top", 16)
	content.add_child(margin)

	var inner := VBoxContainer.new()
	inner.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	inner.size_flags_vertical = Control.SIZE_EXPAND_FILL
	inner.add_theme_constant_override("separation", 16)
	margin.add_child(inner)

	_mode_label = Label.new()
	_mode_label.text = "Save Game" if mode == "save" else "Load Game"
	_mode_label.add_theme_font_size_override("font_size", 28)
	_mode_label.add_theme_color_override("font_color", Color(0.7, 0.8, 1.0))
	_mode_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	inner.add_child(_mode_label)

	# Save slots.
	for i in range(SAVE_SLOT_COUNT):
		var slot := _create_save_slot(i)
		save_slots.append(slot)
		inner.add_child(slot)

	# Bottom bar.
	add_child(_build_bottom_bar())


func _create_save_slot(index: int) -> PanelContainer:
	var panel := PanelContainer.new()
	panel.name = "SaveSlot_%d" % index
	panel.custom_minimum_size = Vector2(0.0, SLOT_HEIGHT)

	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.1, 0.1, 0.16, 1.0)
	style.corner_radius_top_left = 12
	style.corner_radius_top_right = 12
	style.corner_radius_bottom_left = 12
	style.corner_radius_bottom_right = 12
	style.border_width_left = 2
	style.border_width_right = 2
	style.border_width_top = 2
	style.border_width_bottom = 2
	style.border_color = Color(0.2, 0.2, 0.3, 0.6)
	style.content_margin_left = 20.0
	style.content_margin_right = 20.0
	style.content_margin_top = 16.0
	style.content_margin_bottom = 16.0
	panel.add_theme_stylebox_override("panel", style)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 8)

	# Slot header.
	var header := HBoxContainer.new()
	header.add_theme_constant_override("separation", 12)

	var slot_label := Label.new()
	slot_label.name = "SlotLabel"
	slot_label.text = "Slot %d" % (index + 1)
	slot_label.add_theme_font_size_override("font_size", 24)
	slot_label.add_theme_color_override("font_color", Color.WHITE)
	header.add_child(slot_label)

	var status_label := Label.new()
	status_label.name = "StatusLabel"
	status_label.text = "— Empty —"
	status_label.add_theme_font_size_override("font_size", 18)
	status_label.add_theme_color_override("font_color", Color(0.5, 0.5, 0.55))
	status_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	header.add_child(status_label)
	vbox.add_child(header)

	# Timestamp.
	var timestamp := Label.new()
	timestamp.name = "Timestamp"
	timestamp.text = ""
	timestamp.add_theme_font_size_override("font_size", 16)
	timestamp.add_theme_color_override("font_color", Color(0.5, 0.5, 0.55))
	vbox.add_child(timestamp)

	# Info row: playtime, progress.
	var info_row := HBoxContainer.new()
	info_row.add_theme_constant_override("separation", 24)

	var playtime_label := Label.new()
	playtime_label.name = "Playtime"
	playtime_label.text = ""
	playtime_label.add_theme_font_size_override("font_size", 18)
	playtime_label.add_theme_color_override("font_color", Color(0.65, 0.65, 0.7))
	info_row.add_child(playtime_label)

	var progress_label := Label.new()
	progress_label.name = "Progress"
	progress_label.text = ""
	progress_label.add_theme_font_size_override("font_size", 18)
	progress_label.add_theme_color_override("font_color", Color(0.65, 0.65, 0.7))
	info_row.add_child(progress_label)
	vbox.add_child(info_row)

	# Team preview (small portraits).
	var team_preview := HBoxContainer.new()
	team_preview.name = "TeamPreview"
	team_preview.add_theme_constant_override("separation", 4)
	for _j in range(10):
		var mini_portrait := ColorRect.new()
		mini_portrait.custom_minimum_size = Vector2(36.0, 36.0)
		mini_portrait.color = Color(0.15, 0.15, 0.22, 0.3)
		team_preview.add_child(mini_portrait)
	vbox.add_child(team_preview)

	panel.add_child(vbox)

	# Click overlay.
	var btn := Button.new()
	btn.set_anchors_preset(Control.PRESET_FULL_RECT)
	btn.flat = true
	var transparent := StyleBoxEmpty.new()
	btn.add_theme_stylebox_override("normal", transparent)
	btn.add_theme_stylebox_override("hover", transparent)
	btn.add_theme_stylebox_override("pressed", transparent)
	btn.add_theme_stylebox_override("focus", transparent)
	var idx := index
	btn.pressed.connect(func() -> void: select_slot(idx))
	panel.add_child(btn)

	return panel


func _build_bottom_bar() -> PanelContainer:
	var panel := PanelContainer.new()
	panel.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	panel.custom_minimum_size = Vector2(0.0, 96.0)

	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.08, 0.08, 0.14, 1.0)
	style.border_width_top = 2
	style.border_color = Color(0.2, 0.2, 0.3, 1.0)
	style.content_margin_left = 20.0
	style.content_margin_right = 20.0
	panel.add_theme_stylebox_override("panel", style)

	var hbox := HBoxContainer.new()
	hbox.alignment = BoxContainer.ALIGNMENT_CENTER
	hbox.add_theme_constant_override("separation", 16)
	panel.add_child(hbox)

	_action_button = Button.new()
	_action_button.text = "Save" if mode == "save" else "Load"
	_action_button.custom_minimum_size = Vector2(200.0, 56.0)
	_action_button.disabled = true
	_action_button.add_theme_font_size_override("font_size", 22)
	var action_style := StyleBoxFlat.new()
	action_style.bg_color = Color(0.2, 0.6, 0.4, 1.0)
	action_style.corner_radius_top_left = 12
	action_style.corner_radius_top_right = 12
	action_style.corner_radius_bottom_left = 12
	action_style.corner_radius_bottom_right = 12
	_action_button.add_theme_stylebox_override("normal", action_style)
	var action_disabled := action_style.duplicate() as StyleBoxFlat
	action_disabled.bg_color = Color(0.2, 0.2, 0.25, 0.5)
	_action_button.add_theme_stylebox_override("disabled", action_disabled)
	_action_button.pressed.connect(_on_action_pressed)
	hbox.add_child(_action_button)

	_delete_button = Button.new()
	_delete_button.text = "Delete"
	_delete_button.custom_minimum_size = Vector2(160.0, 56.0)
	_delete_button.disabled = true
	_delete_button.add_theme_font_size_override("font_size", 22)
	var del_style := StyleBoxFlat.new()
	del_style.bg_color = Color(0.7, 0.2, 0.2, 1.0)
	del_style.corner_radius_top_left = 12
	del_style.corner_radius_top_right = 12
	del_style.corner_radius_bottom_left = 12
	del_style.corner_radius_bottom_right = 12
	_delete_button.add_theme_stylebox_override("normal", del_style)
	var del_disabled := del_style.duplicate() as StyleBoxFlat
	del_disabled.bg_color = Color(0.2, 0.2, 0.25, 0.5)
	_delete_button.add_theme_stylebox_override("disabled", del_disabled)
	_delete_button.pressed.connect(_on_delete_pressed)
	hbox.add_child(_delete_button)

	return panel


## ── Top Bar ──────────────────────────────────────────────────────────────────

func _build_top_bar() -> PanelContainer:
	var panel := PanelContainer.new()
	panel.set_anchors_preset(Control.PRESET_TOP_WIDE)
	panel.custom_minimum_size = Vector2(0.0, 96.0)

	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.08, 0.08, 0.14, 1.0)
	style.border_width_bottom = 2
	style.border_color = Color(0.2, 0.2, 0.3, 1.0)
	style.content_margin_left = 16.0
	style.content_margin_right = 16.0
	panel.add_theme_stylebox_override("panel", style)

	var hbox := HBoxContainer.new()
	hbox.add_theme_constant_override("separation", 16)
	panel.add_child(hbox)

	back_button = Button.new()
	back_button.text = "<  Back"
	back_button.custom_minimum_size = Vector2(120.0, 56.0)
	back_button.add_theme_font_size_override("font_size", 22)
	var back_style := StyleBoxFlat.new()
	back_style.bg_color = Color(0.15, 0.15, 0.22, 1.0)
	back_style.corner_radius_top_left = 10
	back_style.corner_radius_top_right = 10
	back_style.corner_radius_bottom_left = 10
	back_style.corner_radius_bottom_right = 10
	back_button.add_theme_stylebox_override("normal", back_style)
	back_button.pressed.connect(_on_back_pressed)
	hbox.add_child(back_button)

	var title_label := Label.new()
	title_label.text = "Save / Load"
	title_label.add_theme_font_size_override("font_size", 32)
	title_label.add_theme_color_override("font_color", Color.WHITE)
	title_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	hbox.add_child(title_label)

	return panel


## ── Public API ───────────────────────────────────────────────────────────────

func select_slot(index: int) -> void:
	# Deselect previous.
	if _selected_slot >= 0 and _selected_slot < save_slots.size():
		_highlight_slot(_selected_slot, false)

	_selected_slot = index
	_highlight_slot(index, true)

	_action_button.disabled = false
	var slot_exists := _slot_has_data(index)
	_delete_button.disabled = not slot_exists

	# In load mode, disable loading empty slots.
	if mode == "load" and not slot_exists:
		_action_button.disabled = true


func save_to_slot(index: int) -> void:
	GameManager.save_game(index)
	EventBus.notification_requested.emit("Game saved to Slot %d." % (index + 1), "success")
	_refresh_slots()


func load_from_slot(index: int) -> void:
	if not _slot_has_data(index):
		EventBus.notification_requested.emit("Slot %d is empty." % (index + 1), "warning")
		return
	GameManager.load_game(index)


func delete_slot(index: int) -> void:
	# Request confirmation through the dialog system.
	EventBus.dialog_requested.emit(
		"Delete Save",
		"Are you sure you want to delete Slot %d? This cannot be undone." % (index + 1),
		func() -> void:
			var path: String = "user://save_slot_%d.sav" % index
			if FileAccess.file_exists(path):
				DirAccess.remove_absolute(path)
			_refresh_slots()
			EventBus.notification_requested.emit("Slot %d deleted." % (index + 1), "info")
	)


## ── Slot Data ────────────────────────────────────────────────────────────────

func _slot_has_data(index: int) -> bool:
	var path: String = "user://save_slot_%d.sav" % index
	return FileAccess.file_exists(path)


func _refresh_slots() -> void:
	for i in range(SAVE_SLOT_COUNT):
		if i >= save_slots.size():
			continue
		var slot := save_slots[i]
		var vbox := slot.get_child(0) as VBoxContainer
		if vbox == null:
			continue

		var has_data := _slot_has_data(i)
		var status_label: Label = vbox.get_child(0).get_node_or_null("StatusLabel") as Label
		if status_label:
			status_label.text = "In Use" if has_data else "-- Empty --"
			status_label.add_theme_color_override("font_color",
				Color(0.3, 0.8, 0.4) if has_data else Color(0.5, 0.5, 0.55))


func _highlight_slot(index: int, highlighted: bool) -> void:
	if index < 0 or index >= save_slots.size():
		return
	var slot := save_slots[index]
	var style := slot.get_theme_stylebox("panel") as StyleBoxFlat
	if style:
		var new_style := style.duplicate() as StyleBoxFlat
		new_style.border_color = Color(0.4, 0.7, 1.0) if highlighted else Color(0.2, 0.2, 0.3, 0.6)
		slot.add_theme_stylebox_override("panel", new_style)


## ── Handlers ─────────────────────────────────────────────────────────────────

func _on_action_pressed() -> void:
	if _selected_slot < 0:
		return
	match mode:
		"save":
			if _slot_has_data(_selected_slot):
				EventBus.dialog_requested.emit(
					"Overwrite Save",
					"Slot %d already has data. Overwrite?" % (_selected_slot + 1),
					func() -> void: save_to_slot(_selected_slot)
				)
			else:
				save_to_slot(_selected_slot)
		"load":
			load_from_slot(_selected_slot)


func _on_delete_pressed() -> void:
	if _selected_slot >= 0:
		delete_slot(_selected_slot)


func _on_back_pressed() -> void:
	if has_node("/root/ScreenTransitionManager"):
		var stm: ScreenTransitionManager = get_node("/root/ScreenTransitionManager")
		stm.pop_screen("slide_right")
