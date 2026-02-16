## CrashReporter -- Collects breadcrumbs, captures state, and reports errors.
## [P12-009] Provides structured crash/error reporting with breadcrumb trails,
## device state capture, and severity-based filtering.
extends Node


## ── Configuration ────────────────────────────────────────────────────────────────

## Crash report endpoint.
@export var report_endpoint: String = "https://crashes.spritewars.example.com/v1/reports"

## Maximum breadcrumbs to retain (circular buffer).
@export var max_breadcrumbs: int = 50

## Whether to include full device info in reports.
@export var include_device_info: bool = true

## Minimum severity to actually send to the server. Anything below is only logged locally.
@export_enum("warning", "error", "fatal") var min_report_severity: String = "error"


## ── Severity Levels ─────────────────────────────────────────────────────────────

const SEVERITY_WARNING: String = "warning"
const SEVERITY_ERROR: String = "error"
const SEVERITY_FATAL: String = "fatal"

const SEVERITY_ORDER: Dictionary = {
	"warning": 0,
	"error": 1,
	"fatal": 2,
}


## ── State ────────────────────────────────────────────────────────────────────────

## Ring buffer of breadcrumbs for debugging context.
var breadcrumbs: Array[Dictionary] = []

## Total errors reported this session.
var _error_count: int = 0

## Session ID (shared with AnalyticsManager if available).
var _session_id: String = ""

## Pending reports that failed to send.
var _pending_reports: Array[Dictionary] = []


## ── Lifecycle ────────────────────────────────────────────────────────────────────

func _ready() -> void:
	_session_id = _generate_id()

	# Add initial breadcrumb marking app start.
	add_breadcrumb("lifecycle", "Application started", {
		"platform": OS.get_name(),
		"debug": OS.is_debug_build(),
	})

	# Attempt to load and resend any pending reports from last session.
	_load_pending_reports()

	print("[CrashReporter] Initialized. Session: %s" % _session_id)


func _notification(what: int) -> void:
	match what:
		NOTIFICATION_WM_CLOSE_REQUEST:
			add_breadcrumb("lifecycle", "Application closing", {})
			# Persist any unsent reports.
			_save_pending_reports()
		NOTIFICATION_APPLICATION_FOCUS_OUT:
			add_breadcrumb("lifecycle", "Application backgrounded", {})
		NOTIFICATION_APPLICATION_FOCUS_IN:
			add_breadcrumb("lifecycle", "Application foregrounded", {})


## ── Breadcrumbs ─────────────────────────────────────────────────────────────────

## Add a breadcrumb to the trail. Oldest breadcrumbs are discarded when the
## buffer is full.
func add_breadcrumb(category: String, message: String, data: Dictionary = {}) -> void:
	var breadcrumb := {
		"category": category,
		"message": message,
		"data": data,
		"timestamp": Time.get_unix_time_from_system(),
	}

	breadcrumbs.append(breadcrumb)

	# Trim to max size (ring buffer behavior).
	while breadcrumbs.size() > max_breadcrumbs:
		breadcrumbs.remove_at(0)


## Get the most recent N breadcrumbs.
func get_recent_breadcrumbs(count: int = 10) -> Array[Dictionary]:
	var start := maxi(0, breadcrumbs.size() - count)
	var result: Array[Dictionary] = []
	for i in range(start, breadcrumbs.size()):
		result.append(breadcrumbs[i])
	return result


## ── Error Reporting ─────────────────────────────────────────────────────────────

## Report an error with optional stack trace and severity level.
func report_error(error: String, stack_trace: String = "", severity: String = SEVERITY_ERROR) -> void:
	_error_count += 1

	# Always log locally.
	match severity:
		SEVERITY_FATAL:
			push_error("[CrashReporter][FATAL] %s" % error)
		SEVERITY_ERROR:
			push_error("[CrashReporter][ERROR] %s" % error)
		SEVERITY_WARNING:
			push_warning("[CrashReporter][WARN] %s" % error)

	# Add as breadcrumb too.
	add_breadcrumb("error", error, {"severity": severity})

	# Check if severity meets threshold for remote reporting.
	var severity_level: int = SEVERITY_ORDER.get(severity, 0)
	var threshold_level: int = SEVERITY_ORDER.get(min_report_severity, 1)
	if severity_level < threshold_level:
		return

	# Build and send the crash report.
	var report := format_crash_report(error)
	report["stack_trace"] = stack_trace
	report["severity"] = severity

	# Attempt to send.
	var sent := await _send_report(report)
	if not sent:
		_pending_reports.append(report)
		push_warning("[CrashReporter] Report queued for retry (pending: %d)." % _pending_reports.size())


## ── State Capture ───────────────────────────────────────────────────────────────

## Capture the current application state for inclusion in crash reports.
func capture_state() -> Dictionary:
	var state := {
		"timestamp": Time.get_unix_time_from_system(),
		"session_id": _session_id,
		"error_count": _error_count,
	}

	# Current screen / scene.
	var tree := get_tree()
	if tree and tree.current_scene:
		state["current_scene"] = tree.current_scene.scene_file_path
		state["current_scene_name"] = tree.current_scene.name
	else:
		state["current_scene"] = "unknown"

	# Game state from GameManager.
	if is_instance_valid(GameManager):
		state["current_area"] = GameManager.current_area_id
		state["is_in_battle"] = GameManager.is_in_battle
		state["game_time"] = GameManager.game_time_seconds
		if GameManager.player_data:
			state["has_player_data"] = true
			var team: Array = GameManager.player_data.team if "team" in GameManager.player_data else []
			state["team_size"] = team.size()
		else:
			state["has_player_data"] = false

	# Memory usage.
	state["static_memory"] = Performance.get_monitor(Performance.MEMORY_STATIC)
	state["static_memory_max"] = Performance.get_monitor(Performance.MEMORY_STATIC_MAX)

	# FPS.
	state["fps"] = Performance.get_monitor(Performance.TIME_FPS)
	state["process_time"] = Performance.get_monitor(Performance.TIME_PROCESS)

	# Object count.
	state["object_count"] = Performance.get_monitor(Performance.OBJECT_COUNT)
	state["node_count"] = Performance.get_monitor(Performance.OBJECT_NODE_COUNT)

	return state


## ── Report Formatting ───────────────────────────────────────────────────────────

## Build a structured crash report dictionary.
func format_crash_report(error: String) -> Dictionary:
	var report := {
		"report_id": _generate_id(),
		"session_id": _session_id,
		"timestamp": Time.get_unix_time_from_system(),
		"error_message": error,
		"severity": SEVERITY_ERROR,
		"stack_trace": "",
		"breadcrumbs": breadcrumbs.duplicate(true),
		"state": capture_state(),
		"device": _get_device_info() if include_device_info else {},
		"app": _get_app_info(),
	}

	return report


## ── Device & App Info ───────────────────────────────────────────────────────────

func _get_device_info() -> Dictionary:
	return {
		"platform": OS.get_name(),
		"model": OS.get_model_name(),
		"locale": OS.get_locale(),
		"processor_count": OS.get_processor_count(),
		"processor_name": OS.get_processor_name(),
		"video_adapter": RenderingServer.get_video_adapter_name(),
		"screen_size": {
			"width": DisplayServer.window_get_size().x,
			"height": DisplayServer.window_get_size().y,
		},
		"is_debug": OS.is_debug_build(),
	}


func _get_app_info() -> Dictionary:
	return {
		"name": ProjectSettings.get_setting("application/config/name", "Sprite Wars"),
		"version": ProjectSettings.get_setting("application/config/version", "0.1.0"),
		"engine": "Godot %s" % Engine.get_version_info().get("string", "unknown"),
	}


## ── Sending Reports ─────────────────────────────────────────────────────────────

func _send_report(report: Dictionary) -> bool:
	var tree := get_tree()
	if tree == null:
		return false

	var http := HTTPRequest.new()
	http.timeout = 10.0
	tree.root.add_child(http)

	var headers := PackedStringArray([
		"Content-Type: application/json",
		"X-Crash-Reporter: SpriteWars/1.0",
	])

	var body := JSON.stringify(report)
	var err := http.request(report_endpoint, headers, HTTPClient.METHOD_POST, body)
	if err != OK:
		http.queue_free()
		return false

	var response: Array = await http.request_completed
	http.queue_free()

	var result_code: int = int(response[0])
	var status_code: int = int(response[1])

	return result_code == HTTPRequest.RESULT_SUCCESS and status_code >= 200 and status_code < 300


## ── Pending Report Persistence ──────────────────────────────────────────────────

const PENDING_REPORTS_PATH: String = "user://crash_reports_pending.json"

func _save_pending_reports() -> void:
	if _pending_reports.is_empty():
		return

	var file := FileAccess.open(PENDING_REPORTS_PATH, FileAccess.WRITE)
	if file:
		file.store_string(JSON.stringify(_pending_reports))
		file.close()


func _load_pending_reports() -> void:
	if not FileAccess.file_exists(PENDING_REPORTS_PATH):
		return

	var file := FileAccess.open(PENDING_REPORTS_PATH, FileAccess.READ)
	if file == null:
		return

	var json_text := file.get_as_text()
	file.close()

	var json := JSON.new()
	if json.parse(json_text) != OK:
		return

	var data = json.data
	if data is Array:
		for report in data:
			if report is Dictionary:
				_pending_reports.append(report)

	# Clean up the file after loading.
	DirAccess.remove_absolute(PENDING_REPORTS_PATH)

	if not _pending_reports.is_empty():
		print("[CrashReporter] Loaded %d pending reports from previous session." % _pending_reports.size())
		# Attempt to resend.
		_retry_pending_reports()


func _retry_pending_reports() -> void:
	var to_retry := _pending_reports.duplicate()
	_pending_reports.clear()
	for report in to_retry:
		var sent := await _send_report(report)
		if not sent:
			_pending_reports.append(report)


## ── Helpers ─────────────────────────────────────────────────────────────────────

func _generate_id() -> String:
	var crypto := Crypto.new()
	return crypto.generate_random_bytes(16).hex_encode()
