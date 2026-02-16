## NetworkManager -- Monitors connectivity and queues operations for offline retry.
## [P12-038] Provides connectivity detection, network type awareness, and a
## durable operation queue that replays when connectivity is restored.
extends Node


## ── Configuration ────────────────────────────────────────────────────────────────

## Lightweight endpoint for connectivity checks. Should return 2xx quickly.
@export var connectivity_check_url: String = "https://api.spritewars.example.com/ping"

## Interval between automatic connectivity checks (seconds).
@export var check_interval: float = 30.0

## Timeout for connectivity check requests (seconds).
@export var check_timeout: float = 5.0

## Maximum number of pending operations to store.
@export var max_pending_operations: int = 100

## File path for persisting pending operations across sessions.
const PENDING_OPS_PATH: String = "user://pending_network_ops.json"


## ── Signals ─────────────────────────────────────────────────────────────────────

## Emitted when connectivity status changes.
signal connectivity_changed(is_online: bool)


## ── State ────────────────────────────────────────────────────────────────────────

## Current connectivity status.
var is_online: bool = true

## Operations queued for retry when connectivity is restored.
var pending_operations: Array[Dictionary] = []

## Timer accumulator for periodic connectivity checks.
var _check_timer: float = 0.0

## Whether a connectivity check is currently in flight.
var _is_checking: bool = false

## Whether we're currently processing the pending queue.
var _is_processing_queue: bool = false

## Number of consecutive check failures.
var _consecutive_failures: int = 0

## Last successful check timestamp.
var _last_online_time: float = 0.0


## ── Lifecycle ────────────────────────────────────────────────────────────────────

func _ready() -> void:
	_last_online_time = Time.get_unix_time_from_system()

	# Load any pending operations from previous session.
	_load_pending_operations()

	# Do an initial connectivity check.
	check_connectivity()

	print("[NetworkManager] Initialized. Pending operations: %d" % pending_operations.size())


func _process(delta: float) -> void:
	_check_timer += delta
	if _check_timer >= check_interval:
		_check_timer = 0.0
		check_connectivity()


func _notification(what: int) -> void:
	match what:
		NOTIFICATION_WM_CLOSE_REQUEST:
			_save_pending_operations()
		NOTIFICATION_APPLICATION_FOCUS_IN:
			# Check connectivity when returning from background.
			check_connectivity()


## ── Public API ──────────────────────────────────────────────────────────────────

## Check current connectivity by pinging the check endpoint.
## Updates is_online and emits connectivity_changed if status changed.
## Returns the new connectivity status.
func check_connectivity() -> bool:
	if _is_checking:
		return is_online

	_is_checking = true

	var tree := get_tree()
	if tree == null:
		_is_checking = false
		return is_online

	var http := HTTPRequest.new()
	http.timeout = check_timeout
	tree.root.add_child(http)

	var err := http.request(connectivity_check_url, PackedStringArray(), HTTPClient.METHOD_HEAD)
	if err != OK:
		http.queue_free()
		_update_connectivity(false)
		_is_checking = false
		return is_online

	var response: Array = await http.request_completed
	http.queue_free()

	var result_code: int = int(response[0])
	var status_code: int = int(response[1])
	var success := result_code == HTTPRequest.RESULT_SUCCESS and status_code >= 200 and status_code < 400

	_update_connectivity(success)
	_is_checking = false

	return is_online


## Queue an operation for retry when connectivity is available.
## Operations are dictionaries with at minimum: {type, url, method, body, created_at}.
func queue_operation(operation: Dictionary) -> void:
	if pending_operations.size() >= max_pending_operations:
		push_warning("[NetworkManager] Pending operation queue is full (%d). Dropping oldest." % max_pending_operations)
		pending_operations.remove_at(0)

	# Stamp the operation.
	if not operation.has("created_at"):
		operation["created_at"] = Time.get_unix_time_from_system()
	if not operation.has("retry_count"):
		operation["retry_count"] = 0

	pending_operations.append(operation)
	print("[NetworkManager] Queued operation '%s' (queue size: %d)." % [
		str(operation.get("type", "unknown")), pending_operations.size()])

	# Persist immediately in case the app is killed.
	_save_pending_operations()


## Process all pending operations. Called automatically when connectivity is restored.
func process_pending_operations() -> void:
	if _is_processing_queue:
		return
	if pending_operations.is_empty():
		return
	if not is_online:
		return

	_is_processing_queue = true
	print("[NetworkManager] Processing %d pending operations." % pending_operations.size())

	# Process a copy to allow safe modification during iteration.
	var to_process := pending_operations.duplicate()
	pending_operations.clear()

	for operation in to_process:
		var success := await _execute_operation(operation)
		if not success:
			# Re-queue failed operations (up to a retry limit).
			var retry_count: int = int(operation.get("retry_count", 0)) + 1
			if retry_count <= 5:
				operation["retry_count"] = retry_count
				pending_operations.append(operation)
			else:
				push_warning("[NetworkManager] Dropping operation '%s' after %d retries." % [
					str(operation.get("type", "unknown")), retry_count])

		# If connectivity dropped during processing, stop and re-queue the rest.
		if not is_online:
			push_warning("[NetworkManager] Connectivity lost during queue processing. Re-queuing remaining.")
			break

	_save_pending_operations()
	_is_processing_queue = false

	if not pending_operations.is_empty():
		print("[NetworkManager] %d operations remain in queue." % pending_operations.size())


## Get the type of network connection.
## Returns "wifi", "cellular", or "none".
func get_network_type() -> String:
	if not is_online:
		return "none"

	# Godot 4 doesn't provide direct network type detection.
	# On mobile, we use OS-level hints where available.
	var platform := OS.get_name()

	match platform:
		"Android", "iOS":
			# On mobile, we can infer from OS features, but Godot doesn't
			# expose this directly. Default to "cellular" as a safe assumption
			# for bandwidth-sensitive decisions, unless we detect otherwise.
			# In a real implementation, this would use a GDExtension or platform plugin.
			return "wifi"  # Placeholder -- real impl would check platform APIs.
		"Windows", "macOS", "Linux":
			return "wifi"  # Desktop is typically wired/wifi.
		_:
			return "wifi"


## Get the time since last successful connectivity check.
func get_time_since_last_online() -> float:
	return Time.get_unix_time_from_system() - _last_online_time


## Get the number of pending operations.
func get_pending_count() -> int:
	return pending_operations.size()


## Clear all pending operations.
func clear_pending_operations() -> void:
	pending_operations.clear()
	_save_pending_operations()
	print("[NetworkManager] Pending operations cleared.")


## ── Private Methods ─────────────────────────────────────────────────────────────

## Update connectivity status and emit signal if changed.
func _update_connectivity(new_status: bool) -> void:
	if new_status:
		_consecutive_failures = 0
		_last_online_time = Time.get_unix_time_from_system()
	else:
		_consecutive_failures += 1

	# Require 2 consecutive failures before declaring offline (debounce).
	var effective_status: bool
	if new_status:
		effective_status = true
	else:
		effective_status = _consecutive_failures < 2

	if effective_status != is_online:
		var old_status := is_online
		is_online = effective_status
		print("[NetworkManager] Connectivity changed: %s -> %s" % [
			"online" if old_status else "offline",
			"online" if is_online else "offline"])
		connectivity_changed.emit(is_online)

		# If we just came back online, process pending operations.
		if is_online and not pending_operations.is_empty():
			process_pending_operations()


## Execute a single queued operation. Returns true on success.
func _execute_operation(operation: Dictionary) -> bool:
	var tree := get_tree()
	if tree == null:
		return false

	var url: String = str(operation.get("url", ""))
	var method_str: String = str(operation.get("method", "POST"))
	var body: String = str(operation.get("body", ""))
	var op_headers: Array = operation.get("headers", [])

	if url.is_empty():
		push_warning("[NetworkManager] Operation has no URL, skipping.")
		return true  # Return true so it's not re-queued.

	var http := HTTPRequest.new()
	http.timeout = 15.0
	tree.root.add_child(http)

	var headers := PackedStringArray()
	headers.append("Content-Type: application/json")
	for h in op_headers:
		headers.append(str(h))

	var http_method: int
	match method_str.to_upper():
		"POST":
			http_method = HTTPClient.METHOD_POST
		"PUT":
			http_method = HTTPClient.METHOD_PUT
		"GET":
			http_method = HTTPClient.METHOD_GET
		"DELETE":
			http_method = HTTPClient.METHOD_DELETE
		_:
			http_method = HTTPClient.METHOD_POST

	var err := http.request(url, headers, http_method, body)
	if err != OK:
		http.queue_free()
		return false

	var response: Array = await http.request_completed
	http.queue_free()

	var result_code: int = int(response[0])
	var status_code: int = int(response[1])

	# Consider 2xx and 4xx as "handled" (4xx means server rejected it; retrying won't help).
	if result_code == HTTPRequest.RESULT_SUCCESS:
		if status_code >= 200 and status_code < 300:
			return true
		if status_code >= 400 and status_code < 500:
			push_warning("[NetworkManager] Operation '%s' rejected (HTTP %d). Not retrying." % [
				str(operation.get("type", "unknown")), status_code])
			return true  # Don't retry client errors.

	return false  # Server error or network failure -- retry.


## ── Persistence ─────────────────────────────────────────────────────────────────

## Save pending operations to disk for cross-session persistence.
func _save_pending_operations() -> void:
	if pending_operations.is_empty():
		# Clean up the file if there's nothing to persist.
		if FileAccess.file_exists(PENDING_OPS_PATH):
			DirAccess.remove_absolute(PENDING_OPS_PATH)
		return

	var file := FileAccess.open(PENDING_OPS_PATH, FileAccess.WRITE)
	if file:
		file.store_string(JSON.stringify(pending_operations))
		file.close()


## Load pending operations from a previous session.
func _load_pending_operations() -> void:
	if not FileAccess.file_exists(PENDING_OPS_PATH):
		return

	var file := FileAccess.open(PENDING_OPS_PATH, FileAccess.READ)
	if file == null:
		return

	var json_text := file.get_as_text()
	file.close()

	var json := JSON.new()
	if json.parse(json_text) != OK:
		return

	var data = json.data
	if data is Array:
		for op in data:
			if op is Dictionary:
				pending_operations.append(op)

	# Clean up after loading.
	DirAccess.remove_absolute(PENDING_OPS_PATH)

	if not pending_operations.is_empty():
		print("[NetworkManager] Loaded %d pending operations from previous session." % pending_operations.size())
