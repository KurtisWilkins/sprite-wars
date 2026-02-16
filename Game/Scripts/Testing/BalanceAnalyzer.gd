## BalanceAnalyzer — [P11-002] Generates balance reports for abilities, stat curves,
## and type matchups. Helps designers spot outliers without manually checking each entry.
class_name BalanceAnalyzer
extends RefCounted

## Analyze ability DPS tiers and flag outliers
static func analyze_ability_balance() -> Dictionary:
	var abilities := DataLoader.abilities
	var dps_data := AbilityDataValidator.calculate_dps_curves(abilities)

	var tier_counts := {"S": 0, "A": 0, "B": 0, "C": 0, "D": 0}
	var element_avg_dps := {}
	var outliers: Array[Dictionary] = []

	for entry in dps_data:
		tier_counts[entry.tier] += 1

		var elem: String = entry.element
		if elem not in element_avg_dps:
			element_avg_dps[elem] = {"total_dps": 0.0, "count": 0}
		element_avg_dps[elem].total_dps += entry.effective_dps
		element_avg_dps[elem].count += 1

	# Calculate element averages
	var element_averages := {}
	for elem in element_avg_dps:
		var data = element_avg_dps[elem]
		element_averages[elem] = data.total_dps / float(data.count) if data.count > 0 else 0.0

	# Find outliers (abilities >2 std deviations from their element's mean)
	for entry in dps_data:
		var elem_avg: float = element_averages.get(entry.element, 50.0)
		if entry.effective_dps > elem_avg * 1.8 or entry.effective_dps < elem_avg * 0.3:
			outliers.append(entry)

	return {
		"tier_distribution": tier_counts,
		"element_averages": element_averages,
		"outliers": outliers,
		"total_damaging_abilities": dps_data.size(),
	}

## Analyze Sprite stat totals across rarities
static func analyze_stat_distribution() -> Dictionary:
	var races = DataLoader.races
	var race_list: Array = races.values() if races is Dictionary else races
	var stat_keys := ["hp", "atk", "def", "spd", "sp_atk", "sp_def"]

	var rarity_stats := {}
	for race in race_list:
		var rarity: String = race.get("rarity", "common")
		if rarity not in rarity_stats:
			rarity_stats[rarity] = {"totals": [], "min": 9999, "max": 0}

		var total := 0
		for key in stat_keys:
			total += race.get("base_stats", {}).get(key, 0)
		rarity_stats[rarity].totals.append(total)
		rarity_stats[rarity].min = mini(rarity_stats[rarity].min, total)
		rarity_stats[rarity].max = maxi(rarity_stats[rarity].max, total)

	var result := {}
	for rarity in rarity_stats:
		var totals: Array = rarity_stats[rarity].totals
		var avg := 0.0
		for t in totals:
			avg += t
		avg /= float(totals.size()) if totals.size() > 0 else 1.0
		result[rarity] = {
			"count": totals.size(),
			"avg_total": avg,
			"min_total": rarity_stats[rarity].min,
			"max_total": rarity_stats[rarity].max,
		}

	return result

## Analyze type chart for symmetry and balance
static func analyze_type_chart() -> Dictionary:
	var chart := DataLoader.element_chart
	var offensive_scores := {}
	var defensive_scores := {}

	for atk_elem in chart:
		var total_offense := 0.0
		for def_elem in chart[atk_elem]:
			total_offense += chart[atk_elem][def_elem]
		offensive_scores[atk_elem] = total_offense / float(chart.size())

	for def_elem in chart:
		var total_defense := 0.0
		for atk_elem in chart:
			total_defense += chart[atk_elem].get(def_elem, 1.0)
		defensive_scores[def_elem] = total_defense / float(chart.size())

	return {
		"offensive_averages": offensive_scores,
		"defensive_averages": defensive_scores,
	}

## Generate a full balance report as formatted text
static func generate_report() -> String:
	var report := "=== SPRITE WARS BALANCE REPORT ===\n\n"

	# Ability balance
	var ability_data := analyze_ability_balance()
	report += "--- Ability DPS Tiers ---\n"
	for tier in ["S", "A", "B", "C", "D"]:
		report += "  Tier %s: %d abilities\n" % [tier, ability_data.tier_distribution.get(tier, 0)]
	report += "  Total damaging: %d\n\n" % ability_data.total_damaging_abilities

	if not ability_data.outliers.is_empty():
		report += "--- DPS Outliers ---\n"
		for o in ability_data.outliers:
			report += "  %s (ID %d): DPS %.1f [%s]\n" % [o.ability_name, o.ability_id, o.effective_dps, o.tier]
		report += "\n"

	# Stat distribution
	var stat_data := analyze_stat_distribution()
	report += "--- Stat Distribution by Rarity ---\n"
	for rarity in ["common", "uncommon", "rare", "legendary"]:
		if rarity in stat_data:
			var d = stat_data[rarity]
			report += "  %s: count=%d, avg=%.0f, range=[%d, %d]\n" % [rarity, d.count, d.avg_total, d.min_total, d.max_total]
	report += "\n"

	# Type chart
	var type_data := analyze_type_chart()
	report += "--- Type Chart Balance ---\n"
	report += "  Offensive averages:\n"
	for elem in type_data.offensive_averages:
		report += "    %s: %.2f\n" % [elem, type_data.offensive_averages[elem]]
	report += "  Defensive averages:\n"
	for elem in type_data.defensive_averages:
		report += "    %s: %.2f\n" % [elem, type_data.defensive_averages[elem]]

	report += "\n=== END REPORT ===\n"
	return report
