## ConfirmationDialog — Reusable modal confirmation dialog with scale animation.
## [P8-013] Presents title, message, and confirm/cancel buttons.
## Use show_dialog() to present; the overlay blocks interaction behind it.
class_name ConfirmationDialogUI
extends CanvasLayer

## ── Constants ────────────────────────────────────────────────────────────────

const ANIM_DURATION: float = 0.2
const OVERLAY_COLOR: Color = Color(0.0, 0.0, 0.0, 0.6)
const PANEL_MIN_WIDTH: float = 600.0
const PANEL_MAX_WIDTH: float = 900.0
const BUTTON_MIN_HEIGHT: float = 56.0

## ── Internal Nodes ───────────────────────────────────────────────────────────

var _overlay: ColorRect
var panel: PanelContainer
var title_label: Label
var message_label: Label
var confirm_button: Button
var cancel_button: Button

## ── State ────────────────────────────────────────────────────────────────────

var callback: Callable


## ── Lifecycle ────────────────────────────────────────────────────────────────

func _ready() -> void:
	layer = 100
	visible = false
	_build_ui()

	# Listen for global dialog requests from EventBus.
	if EventBus:
		EventBus.dialog_requested.connect(_on_dialog_requested)


func _build_ui() -> void:
	# Semi-transparent background overlay.
	_overlay = ColorRect.new()
	_overlay.name = "Overlay"
	_overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	_overlay.color = OVERLAY_COLOR
	_overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(_overlay)

	# Centering container.
	var center := CenterContainer.new()
	center.name = "Center"
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(center)

	# Panel.
	panel = PanelContainer.new()
	panel.name = "Panel"
	panel.custom_minimum_size = Vector2(PANEL_MIN_WIDTH, 0.0)
	panel.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	panel.size_flags_vertical = Control.SIZE_SHRINK_CENTER

	var panel_style := StyleBoxFlat.new()
	panel_style.bg_color = Color(0.12, 0.12, 0.16, 1.0)
	panel_style.corner_radius_top_left = 16
	panel_style.corner_radius_top_right = 16
	panel_style.corner_radius_bottom_left = 16
	panel_style.corner_radius_bottom_right = 16
	panel_style.content_margin_left = 32.0
	panel_style.content_margin_right = 32.0
	panel_style.content_margin_top = 28.0
	panel_style.content_margin_bottom = 28.0
	panel_style.border_width_left = 2
	panel_style.border_width_right = 2
	panel_style.border_width_top = 2
	panel_style.border_width_bottom = 2
	panel_style.border_color = Color(0.3, 0.3, 0.4, 1.0)
	panel.add_theme_stylebox_override("panel", panel_style)
	center.add_child(panel)

	# VBox inside panel.
	var vbox := VBoxContainer.new()
	vbox.name = "VBox"
	vbox.add_theme_constant_override("separation", 20)
	panel.add_child(vbox)

	# Title.
	title_label = Label.new()
	title_label.name = "Title"
	title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title_label.add_theme_font_size_override("font_size", 28)
	title_label.add_theme_color_override("font_color", Color.WHITE)
	vbox.add_child(title_label)

	# Separator.
	var sep := HSeparator.new()
	sep.add_theme_stylebox_override("separator", StyleBoxLine.new())
	vbox.add_child(sep)

	# Message.
	message_label = Label.new()
	message_label.name = "Message"
	message_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	message_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	message_label.custom_minimum_size.x = PANEL_MIN_WIDTH - 80.0
	message_label.add_theme_font_size_override("font_size", 22)
	message_label.add_theme_color_override("font_color", Color(0.85, 0.85, 0.85))
	vbox.add_child(message_label)

	# Button row.
	var button_row := HBoxContainer.new()
	button_row.name = "ButtonRow"
	button_row.alignment = BoxContainer.ALIGNMENT_CENTER
	button_row.add_theme_constant_override("separation", 24)
	vbox.add_child(button_row)

	# Cancel button.
	cancel_button = Button.new()
	cancel_button.name = "CancelButton"
	cancel_button.custom_minimum_size = Vector2(200.0, BUTTON_MIN_HEIGHT)
	cancel_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL

	var cancel_style := StyleBoxFlat.new()
	cancel_style.bg_color = Color(0.25, 0.25, 0.3, 1.0)
	cancel_style.corner_radius_top_left = 12
	cancel_style.corner_radius_top_right = 12
	cancel_style.corner_radius_bottom_left = 12
	cancel_style.corner_radius_bottom_right = 12
	cancel_button.add_theme_stylebox_override("normal", cancel_style)
	cancel_button.add_theme_font_size_override("font_size", 22)
	cancel_button.pressed.connect(_on_cancel_pressed)
	button_row.add_child(cancel_button)

	# Confirm button.
	confirm_button = Button.new()
	confirm_button.name = "ConfirmButton"
	confirm_button.custom_minimum_size = Vector2(200.0, BUTTON_MIN_HEIGHT)
	confirm_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL

	var confirm_style := StyleBoxFlat.new()
	confirm_style.bg_color = Color(0.2, 0.5, 0.9, 1.0)
	confirm_style.corner_radius_top_left = 12
	confirm_style.corner_radius_top_right = 12
	confirm_style.corner_radius_bottom_left = 12
	confirm_style.corner_radius_bottom_right = 12
	confirm_button.add_theme_stylebox_override("normal", confirm_style)
	confirm_button.add_theme_font_size_override("font_size", 22)
	confirm_button.pressed.connect(_on_confirm_pressed)
	button_row.add_child(confirm_button)


## ── Public API ───────────────────────────────────────────────────────────────

## Show the dialog with custom text and a confirm callback.
func show_dialog(
	title: String,
	message: String,
	confirm_text: String = "Confirm",
	cancel_text: String = "Cancel",
	on_confirm: Callable = Callable()
) -> void:
	title_label.text = title
	message_label.text = message
	confirm_button.text = confirm_text
	cancel_button.text = cancel_text
	callback = on_confirm

	visible = true
	_animate_in()


## Close the dialog with a scale-down animation.
func close() -> void:
	_animate_out()


## ── Event Handlers ───────────────────────────────────────────────────────────

func _on_confirm_pressed() -> void:
	var cb := callback
	close()
	if cb.is_valid():
		cb.call()


func _on_cancel_pressed() -> void:
	close()


func _on_dialog_requested(title: String, message: String, on_confirm: Callable) -> void:
	show_dialog(title, message, "Confirm", "Cancel", on_confirm)


## ── Animations ───────────────────────────────────────────────────────────────

func _animate_in() -> void:
	panel.pivot_offset = panel.size / 2.0
	panel.scale = Vector2(0.7, 0.7)
	panel.modulate = Color(1.0, 1.0, 1.0, 0.0)
	_overlay.color = Color(0.0, 0.0, 0.0, 0.0)

	var tween := create_tween()
	tween.set_ease(Tween.EASE_OUT)
	tween.set_trans(Tween.TRANS_BACK)
	tween.set_parallel(true)
	tween.tween_property(panel, "scale", Vector2.ONE, ANIM_DURATION)
	tween.tween_property(panel, "modulate:a", 1.0, ANIM_DURATION * 0.6)
	tween.tween_property(_overlay, "color:a", OVERLAY_COLOR.a, ANIM_DURATION * 0.5)


func _animate_out() -> void:
	panel.pivot_offset = panel.size / 2.0

	var tween := create_tween()
	tween.set_ease(Tween.EASE_IN)
	tween.set_trans(Tween.TRANS_BACK)
	tween.set_parallel(true)
	tween.tween_property(panel, "scale", Vector2(0.7, 0.7), ANIM_DURATION)
	tween.tween_property(panel, "modulate:a", 0.0, ANIM_DURATION * 0.8)
	tween.tween_property(_overlay, "color:a", 0.0, ANIM_DURATION)
	tween.chain().tween_callback(func() -> void:
		visible = false
	)
