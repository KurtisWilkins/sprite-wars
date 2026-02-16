## CloudSyncManager -- Handles cloud save upload/download with exponential backoff.
## [P12-004] Manages the sync queue, retries with configurable backoff delays,
## and provides connectivity-aware cloud operations.
class_name CloudSyncManager
extends RefCounted


## ── Configuration ────────────────────────────────────────────────────────────────

## Base URL for the cloud save API.
var sync_endpoint: String = "https://api.spritewars.example.com/v1/saves"

## Bearer token for authenticated API calls.
var auth_token: String = ""

## Exponential backoff retry delays in seconds.
var retry_delays: Array = [2.0, 4.0, 8.0, 16.0]

## Maximum payload size in bytes (guard against absurd uploads).
const MAX_PAYLOAD_BYTES: int = 5_242_880  # 5 MB


## ── Sync Queue ──────────────────────────────────────────────────────────────────

## Pending sync operations: [{data: Dictionary, retries: int, queued_at: float}]
var _sync_queue: Array[Dictionary] = []

## Whether a sync operation is currently in flight.
var _is_syncing: bool = false


## ── Public API ──────────────────────────────────────────────────────────────────

## Upload save data to the cloud endpoint.
## Returns {success: bool, error: String, status_code: int}.
func upload_save(save_data: Dictionary) -> Dictionary:
	if sync_endpoint.is_empty():
		return {"success": false, "error": "Sync endpoint not configured.", "status_code": 0}

	if auth_token.is_empty():
		return {"success": false, "error": "Auth token not set.", "status_code": 0}

	var json_body := JSON.stringify(save_data)
	if json_body.length() > MAX_PAYLOAD_BYTES:
		return {"success": false, "error": "Payload exceeds maximum size.", "status_code": 0}

	# Attempt upload with exponential backoff retries.
	var last_error: String = ""
	var last_status: int = 0

	for attempt in range(retry_delays.size() + 1):
		var result := await _send_request("POST", sync_endpoint, json_body)

		if result["success"]:
			print("[CloudSyncManager] Upload succeeded on attempt %d." % (attempt + 1))
			return {"success": true, "error": "", "status_code": result["status_code"]}

		last_error = result["error"]
		last_status = result["status_code"]

		# Don't retry on client errors (4xx) -- these won't resolve with retries.
		if last_status >= 400 and last_status < 500:
			push_error("[CloudSyncManager] Client error %d, not retrying: %s" % [last_status, last_error])
			return {"success": false, "error": last_error, "status_code": last_status}

		# Retry with backoff for server errors (5xx) and network failures.
		if attempt < retry_delays.size():
			var delay: float = retry_delays[attempt]
			push_warning("[CloudSyncManager] Upload attempt %d failed (%s). Retrying in %.1fs..." % [
				attempt + 1, last_error, delay])
			await _wait(delay)

	push_error("[CloudSyncManager] Upload failed after %d attempts: %s" % [
		retry_delays.size() + 1, last_error])
	return {"success": false, "error": last_error, "status_code": last_status}


## Download the latest save from the cloud endpoint.
## Returns {success: bool, data: Dictionary, error: String}.
func download_save() -> Dictionary:
	if sync_endpoint.is_empty():
		return {"success": false, "data": {}, "error": "Sync endpoint not configured."}

	if auth_token.is_empty():
		return {"success": false, "data": {}, "error": "Auth token not set."}

	# Attempt download with exponential backoff retries.
	var last_error: String = ""

	for attempt in range(retry_delays.size() + 1):
		var result := await _send_request("GET", sync_endpoint, "")

		if result["success"]:
			# Parse response body as JSON.
			var json := JSON.new()
			var parse_err := json.parse(result["body"])
			if parse_err != OK:
				return {"success": false, "data": {}, "error": "Failed to parse cloud response as JSON."}

			var data = json.data
			if not data is Dictionary:
				return {"success": false, "data": {}, "error": "Cloud response is not a Dictionary."}

			print("[CloudSyncManager] Download succeeded on attempt %d." % (attempt + 1))
			return {"success": true, "data": data, "error": ""}

		last_error = result["error"]
		var status_code: int = result["status_code"]

		# Don't retry client errors.
		if status_code >= 400 and status_code < 500:
			return {"success": false, "data": {}, "error": last_error}

		if attempt < retry_delays.size():
			var delay: float = retry_delays[attempt]
			push_warning("[CloudSyncManager] Download attempt %d failed (%s). Retrying in %.1fs..." % [
				attempt + 1, last_error, delay])
			await _wait(delay)

	return {"success": false, "data": {}, "error": last_error}


## Check whether the cloud service is reachable.
## Returns true if the endpoint responds with any 2xx status.
func check_cloud_status() -> bool:
	if sync_endpoint.is_empty():
		return false

	# Use HEAD or a lightweight health-check path.
	var health_url := sync_endpoint.get_base_dir() + "/health"
	var result := await _send_request("GET", health_url, "")
	return result["success"]


## Queue a save for cloud sync. Called by SaveManager when is_cloud_available.
func queue_sync(save_data: Dictionary) -> void:
	_sync_queue.append({
		"data": save_data.duplicate(true),
		"retries": 0,
		"queued_at": Time.get_unix_time_from_system(),
	})
	print("[CloudSyncManager] Queued sync (queue size: %d)." % _sync_queue.size())


## Process pending sync operations. Call this periodically (e.g., from a timer
## or after network connectivity is restored).
func process_sync_queue() -> void:
	if _is_syncing:
		return
	if _sync_queue.is_empty():
		return

	_is_syncing = true

	# Process the oldest entry first (FIFO).
	var entry: Dictionary = _sync_queue[0]
	var result := await upload_save(entry["data"])

	if result["success"]:
		_sync_queue.remove_at(0)
		print("[CloudSyncManager] Sync queue entry processed. Remaining: %d" % _sync_queue.size())
	else:
		# Move failed entry to the back of the queue if under retry limit.
		_sync_queue.remove_at(0)
		entry["retries"] = int(entry.get("retries", 0)) + 1
		if entry["retries"] <= retry_delays.size():
			_sync_queue.append(entry)
			push_warning("[CloudSyncManager] Sync failed, re-queued (retry %d/%d)." % [
				entry["retries"], retry_delays.size()])
		else:
			push_error("[CloudSyncManager] Sync entry exhausted retries, discarding.")

	_is_syncing = false


## Get the current queue size.
func get_queue_size() -> int:
	return _sync_queue.size()


## Clear all pending sync operations.
func clear_queue() -> void:
	_sync_queue.clear()
	print("[CloudSyncManager] Sync queue cleared.")


## ── Private: HTTP Request ───────────────────────────────────────────────────────

## Send an HTTP request and return a result dictionary.
## This creates a temporary HTTPRequest node, which is necessary because
## CloudSyncManager is a RefCounted (not a Node). We attach to the scene tree
## temporarily.
func _send_request(method_str: String, url: String, body: String) -> Dictionary:
	var tree := Engine.get_main_loop() as SceneTree
	if tree == null:
		return {"success": false, "error": "No SceneTree available.", "status_code": 0, "body": ""}

	var http := HTTPRequest.new()
	http.timeout = 15.0  # 15-second timeout per request.
	tree.root.add_child(http)

	var headers: PackedStringArray = PackedStringArray([
		"Content-Type: application/json",
		"Authorization: Bearer %s" % auth_token,
		"X-Client-Version: 1.0",
	])

	var http_method: int
	match method_str:
		"POST":
			http_method = HTTPClient.METHOD_POST
		"PUT":
			http_method = HTTPClient.METHOD_PUT
		"GET":
			http_method = HTTPClient.METHOD_GET
		"DELETE":
			http_method = HTTPClient.METHOD_DELETE
		_:
			http_method = HTTPClient.METHOD_GET

	var err := http.request(url, headers, http_method, body)
	if err != OK:
		http.queue_free()
		return {
			"success": false,
			"error": "HTTP request failed to start: %s" % error_string(err),
			"status_code": 0,
			"body": "",
		}

	# Wait for the request to complete.
	var response: Array = await http.request_completed
	http.queue_free()

	# response = [result, response_code, headers, body]
	var result_code: int = int(response[0])
	var status_code: int = int(response[1])
	var response_body: String = (response[3] as PackedByteArray).get_string_from_utf8()

	if result_code != HTTPRequest.RESULT_SUCCESS:
		return {
			"success": false,
			"error": "HTTP request error (result: %d, status: %d)" % [result_code, status_code],
			"status_code": status_code,
			"body": response_body,
		}

	var is_success := status_code >= 200 and status_code < 300
	return {
		"success": is_success,
		"error": "" if is_success else "HTTP %d: %s" % [status_code, response_body.left(200)],
		"status_code": status_code,
		"body": response_body,
	}


## Async wait helper. Creates a timer in the scene tree.
func _wait(seconds: float) -> void:
	var tree := Engine.get_main_loop() as SceneTree
	if tree:
		await tree.create_timer(seconds).timeout
