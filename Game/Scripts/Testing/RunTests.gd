## RunTests — CLI entry point for headless data validation.
## Usage: godot --headless --script res://Scripts/Testing/RunTests.gd
extends SceneTree

func _init() -> void:
	# Wait one frame for autoloads to initialize
	await process_frame
	await process_frame

	print("")
	print("Starting Sprite Wars data validation...")
	print("")

	var runner := DataValidationRunner.new()
	var results := runner.run_all_validations()

	print("")
	if results.failed == 0:
		print("ALL TESTS PASSED (%d total)" % results.total)
	else:
		print("FAILURES: %d/%d tests failed" % [results.failed, results.total])

	# Generate balance report
	print("")
	print(BalanceAnalyzer.generate_report())

	quit(results.failed)
