## SaveSecurity -- Encryption, integrity hashing, and tamper detection for saves.
## [P12-047] Provides field-level AES-256-CBC encryption for sensitive values,
## HMAC-SHA256 integrity verification, and heuristic tamper detection.
class_name SaveSecurity
extends RefCounted


## ── Constants ────────────────────────────────────────────────────────────────────

## App-level secret mixed with the device unique ID to derive the encryption key.
## In production this would be obfuscated or fetched from a secure enclave.
const _APP_SECRET: String = "SpriteWars_2024_s3cr3t_k3y_d0_n0t_sh4r3"

## HMAC key prefix (combined with device ID at runtime).
const _HMAC_PREFIX: String = "SW_HMAC_"

## The key inside save data that stores the integrity hash.
const INTEGRITY_HASH_KEY: String = "_integrity_hash"

## ── Tamper Detection Thresholds ─────────────────────────────────────────────────

const MAX_CURRENCY: int = 999_999_999
const MAX_LEVEL: int = 100
const MAX_IV: int = 31
const MAX_TEAM_SIZE: int = 6
const MAX_STORAGE_SIZE: int = 500
const MAX_FORM_ID: int = 72
const MAX_PLAY_TIME_SECONDS: float = 10_000_000.0  # ~115 days -- generous cap


## ── Key Derivation ──────────────────────────────────────────────────────────────

## Derive a deterministic encryption key from the device's unique ID and the app
## secret. Returns a 32-byte hex string suitable for AES-256.
static func _derive_key() -> String:
	var device_id := OS.get_unique_id()
	if device_id.is_empty():
		# Fallback for editor / desktop where unique_id may be empty.
		device_id = "sprite_wars_dev_device"
	var raw := _APP_SECRET + device_id
	var ctx := HashingContext.new()
	ctx.start(HashingContext.HASH_SHA256)
	ctx.update(raw.to_utf8_buffer())
	var digest: PackedByteArray = ctx.finish()
	return digest.hex_encode()


## Derive an HMAC key (separate from encryption key for defense in depth).
static func _derive_hmac_key() -> String:
	var device_id := OS.get_unique_id()
	if device_id.is_empty():
		device_id = "sprite_wars_dev_device"
	var raw := _HMAC_PREFIX + device_id + _APP_SECRET
	var ctx := HashingContext.new()
	ctx.start(HashingContext.HASH_SHA256)
	ctx.update(raw.to_utf8_buffer())
	var digest: PackedByteArray = ctx.finish()
	return digest.hex_encode()


## ── Field Encryption ────────────────────────────────────────────────────────────

## Encrypt a string value using AES-256-CBC.  Returns a Base64-encoded
## ciphertext string.  The first 16 bytes of the ciphertext are the random IV.
static func encrypt_field(value: String) -> String:
	var key_hex := _derive_key()
	var key_bytes := key_hex.substr(0, 32).to_utf8_buffer()  # 32 bytes for AES-256

	# Generate random IV (16 bytes).
	var iv := Crypto.new().generate_random_bytes(16)

	var aes := AESContext.new()
	var err := aes.start(AESContext.MODE_CBC_ENCRYPT, key_bytes, iv)
	if err != OK:
		push_error("SaveSecurity: AES encrypt start failed: %s" % error_string(err))
		return ""

	# PKCS7 padding to 16-byte boundary.
	var plaintext := value.to_utf8_buffer()
	var pad_len := 16 - (plaintext.size() % 16)
	for i in pad_len:
		plaintext.append(pad_len)

	var ciphertext := aes.update(plaintext)
	aes.finish()

	# Prepend IV to ciphertext for storage.
	var combined := PackedByteArray()
	combined.append_array(iv)
	combined.append_array(ciphertext)
	return Marshalls.raw_to_base64(combined)


## Decrypt a Base64-encoded ciphertext (IV prepended) back to a plaintext string.
static func decrypt_field(encrypted: String) -> String:
	if encrypted.is_empty():
		return ""

	var key_hex := _derive_key()
	var key_bytes := key_hex.substr(0, 32).to_utf8_buffer()

	var combined := Marshalls.base64_to_raw(encrypted)
	if combined.size() < 32:
		push_error("SaveSecurity: Encrypted data too short to contain IV + ciphertext.")
		return ""

	var iv := combined.slice(0, 16)
	var ciphertext := combined.slice(16)

	var aes := AESContext.new()
	var err := aes.start(AESContext.MODE_CBC_DECRYPT, key_bytes, iv)
	if err != OK:
		push_error("SaveSecurity: AES decrypt start failed: %s" % error_string(err))
		return ""

	var plaintext := aes.update(ciphertext)
	aes.finish()

	# Remove PKCS7 padding.
	if plaintext.size() == 0:
		return ""
	var pad_len: int = plaintext[plaintext.size() - 1]
	if pad_len < 1 or pad_len > 16:
		push_error("SaveSecurity: Invalid PKCS7 padding length: %d" % pad_len)
		return ""
	# Validate all padding bytes are consistent.
	for i in range(plaintext.size() - pad_len, plaintext.size()):
		if plaintext[i] != pad_len:
			push_error("SaveSecurity: Corrupted PKCS7 padding.")
			return ""

	return plaintext.slice(0, plaintext.size() - pad_len).get_string_from_utf8()


## ── Integrity Hashing ───────────────────────────────────────────────────────────

## Generate an HMAC-SHA256 integrity hash for the save data.
## The hash field itself is excluded from the computation.
static func generate_integrity_hash(save_data: Dictionary) -> String:
	var data_copy := save_data.duplicate(true)
	data_copy.erase(INTEGRITY_HASH_KEY)

	var json_string := JSON.stringify(data_copy, "", false)
	var hmac_key := _derive_hmac_key()

	# HMAC-SHA256: H((key XOR opad) || H((key XOR ipad) || message))
	# Godot 4 doesn't have built-in HMAC, so we implement it manually.
	return _hmac_sha256(hmac_key, json_string)


## Verify that the integrity hash matches the save data.
static func verify_integrity(save_data: Dictionary, hash_val: String) -> bool:
	var expected := generate_integrity_hash(save_data)
	# Constant-time comparison to prevent timing attacks.
	if expected.length() != hash_val.length():
		return false
	var result: int = 0
	for i in expected.length():
		result |= expected.unicode_at(i) ^ hash_val.unicode_at(i)
	return result == 0


## ── Tamper Detection ────────────────────────────────────────────────────────────

## Scan save data for impossible or suspicious values that indicate tampering.
## Returns an array of human-readable warning strings (empty = clean).
static func detect_tampering(save_data: Dictionary) -> Array[String]:
	var warnings: Array[String] = []

	# --- Currency ---
	var currency = save_data.get("currency", 0)
	if currency is int or currency is float:
		if int(currency) < 0:
			warnings.append("Negative currency detected: %d" % int(currency))
		if int(currency) > MAX_CURRENCY:
			warnings.append("Currency exceeds maximum: %d > %d" % [int(currency), MAX_CURRENCY])

	# --- Play time ---
	var play_time = save_data.get("play_time_seconds", 0.0)
	if play_time is float or play_time is int:
		if float(play_time) < 0.0:
			warnings.append("Negative play time: %f" % float(play_time))
		if float(play_time) > MAX_PLAY_TIME_SECONDS:
			warnings.append("Play time exceeds reasonable maximum: %f" % float(play_time))

	# --- Save timestamp ---
	var timestamp = save_data.get("save_timestamp", 0.0)
	var now := Time.get_unix_time_from_system()
	if timestamp is float or timestamp is int:
		if float(timestamp) > now + 86400.0:  # More than 1 day in the future.
			warnings.append("Save timestamp is in the future.")
		if float(timestamp) < 1_700_000_000.0:  # Before ~2023.
			warnings.append("Save timestamp predates game release.")

	# --- Team ---
	var team: Array = save_data.get("team", [])
	if team.size() > MAX_TEAM_SIZE:
		warnings.append("Team size exceeds maximum: %d > %d" % [team.size(), MAX_TEAM_SIZE])

	# --- Storage ---
	var storage: Array = save_data.get("storage", [])
	if storage.size() > MAX_STORAGE_SIZE:
		warnings.append("Storage size exceeds maximum: %d > %d" % [storage.size(), MAX_STORAGE_SIZE])

	# --- Individual sprite checks ---
	var all_sprites: Array = team + storage
	var seen_instance_ids: Dictionary = {}
	for sprite_dict in all_sprites:
		if not sprite_dict is Dictionary:
			continue
		var s: Dictionary = sprite_dict
		var iid = s.get("instance_id", 0)

		# Duplicate instance IDs.
		if seen_instance_ids.has(iid):
			warnings.append("Duplicate instance_id: %d" % int(iid))
		seen_instance_ids[iid] = true

		# Level range.
		var lv = s.get("level", 1)
		if lv is int or lv is float:
			if int(lv) < 1 or int(lv) > MAX_LEVEL:
				warnings.append("Sprite %d has impossible level: %d" % [int(iid), int(lv)])

		# Form ID range.
		var fid = s.get("form_id", 1)
		if fid is int or fid is float:
			if int(fid) < 1 or int(fid) > MAX_FORM_ID:
				warnings.append("Sprite %d has impossible form_id: %d" % [int(iid), int(fid)])

		# IV range checks.
		var ivs = s.get("iv_stats", {})
		if ivs is Dictionary:
			for stat_key in ivs:
				var iv_val = ivs[stat_key]
				if iv_val is int or iv_val is float:
					if int(iv_val) < 0 or int(iv_val) > MAX_IV:
						warnings.append("Sprite %d has impossible IV '%s': %d" % [int(iid), str(stat_key), int(iv_val)])

	# --- Sprite registry ---
	var registry: Dictionary = save_data.get("sprite_registry", {})
	for key in registry:
		var val = registry[key]
		if val != "seen" and val != "caught":
			warnings.append("Invalid sprite_registry entry '%s': '%s'" % [str(key), str(val)])

	return warnings


## ── Private: HMAC-SHA256 Implementation ─────────────────────────────────────────

static func _hmac_sha256(key_str: String, message: String) -> String:
	var block_size := 64  # SHA-256 block size in bytes.
	var key_bytes := key_str.to_utf8_buffer()

	# If key is longer than block size, hash it first.
	if key_bytes.size() > block_size:
		var ctx := HashingContext.new()
		ctx.start(HashingContext.HASH_SHA256)
		ctx.update(key_bytes)
		key_bytes = ctx.finish()

	# Pad key to block size.
	while key_bytes.size() < block_size:
		key_bytes.append(0)

	# Inner and outer padded keys.
	var i_key_pad := PackedByteArray()
	var o_key_pad := PackedByteArray()
	i_key_pad.resize(block_size)
	o_key_pad.resize(block_size)
	for i in block_size:
		i_key_pad[i] = key_bytes[i] ^ 0x36
		o_key_pad[i] = key_bytes[i] ^ 0x5C

	# Inner hash: SHA256(i_key_pad || message).
	var inner_ctx := HashingContext.new()
	inner_ctx.start(HashingContext.HASH_SHA256)
	inner_ctx.update(i_key_pad)
	inner_ctx.update(message.to_utf8_buffer())
	var inner_hash: PackedByteArray = inner_ctx.finish()

	# Outer hash: SHA256(o_key_pad || inner_hash).
	var outer_ctx := HashingContext.new()
	outer_ctx.start(HashingContext.HASH_SHA256)
	outer_ctx.update(o_key_pad)
	outer_ctx.update(inner_hash)
	var outer_hash: PackedByteArray = outer_ctx.finish()

	return outer_hash.hex_encode()
