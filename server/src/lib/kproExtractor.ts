import { parseHeaders } from "./klogParser.js";

const KPRO_KEYS = [
  "profile_short_name",
  "profile_designer",
  "profile_description",
  "profile_schema_version",
  "emulation_mode",
  "recommended_level",
  "expect_fc",
  "expect_colrchange",
  "preheat_power",
  "preheat_nominal_temperature",
  "preheat_min_power_offset",
  "preheat_min_time",
  "preheat_max_time",
  "preheat_check_gradient_time",
  "preheat_target_in_future",
  "preheat_mode",
  "preheat_end_detection_count",
  "preheat_temperature_proximity",
  "roast_required_power",
  "roast_min_desired_rate_of_rise",
  "roast_target_in_future",
  "roast_use_prediction_method",
  "roast_target_timeshift",
  "roast_end_by_time_ratio",
  "roast_PID_Kp",
  "roast_PID_Ki",
  "roast_PID_Kd",
  "roast_PID_min_i",
  "roast_PID_max_i",
  "roast_PID_iLimitApplyAtZero",
  "roast_PID_differentialOnError",
  "specific_heat_adj_upper_temperature_limit",
  "specific_heat_adj_lower_temperature_limit",
  "specific_heat_adj_multiplier_Kp",
  "specific_heat_adj_multiplier_Kd",
  "zone1_time_start",
  "zone1_time_end",
  "zone1_multiplier_Kp",
  "zone1_multiplier_Kd",
  "zone1_boost",
  "zone2_time_start",
  "zone2_time_end",
  "zone2_multiplier_Kp",
  "zone2_multiplier_Kd",
  "zone2_boost",
  "zone3_time_start",
  "zone3_time_end",
  "zone3_multiplier_Kp",
  "zone3_multiplier_Kd",
  "zone3_boost",
  "corner1_time_start",
  "corner1_time_end",
  "cooldown_hi_speed",
  "cooldown_lo_speed",
  "cooldown_lo_temperature",
  "roast_levels",
  "profile_modified",
  "roast_profile",
  "fan_profile",
] as const;

export function extractKproContent(fileContent: string): string | null {
  const lines = fileContent.split(/\r?\n/);
  const headers = parseHeaders(lines);

  if (!headers.has("profile_short_name")) {
    return null;
  }

  let output = "";
  for (const key of KPRO_KEYS) {
    if (headers.has(key)) {
      output += `${key}:${headers.get(key)!}\n`;
    }
  }

  return output;
}
