export type TimeSeriesPoint = {
  time: number;
  spotTemp: number;
  temp: number;
  meanTemp: number;
  profileTemp: number;
  profileROR: number;
  actualROR: number;
  desiredROR: number;
  powerKW: number;
  actualFanRPM: number;
};

export type CurvePoint = {
  time: number;
  temp: number;
};

export type FanCurvePoint = {
  time: number;
  rpm: number;
};

export interface ParsedKlog {
  roastDate: Date | null;
  ambientTemp: number | null;
  roastingLevel: number | null;
  tastingNotes: string | null;
  profileFileName: string | null;
  profileShortName: string | null;
  profileDesigner: string | null;

  colourChangeTime: number | null;
  firstCrackTime: number | null;
  roastEndTime: number | null;
  developmentPercent: number | null;

  colourChangeTemp: number | null;
  firstCrackTemp: number | null;
  roastEndTemp: number | null;

  totalDuration: number | null;
  developmentTime: number | null;

  timeSeriesData: TimeSeriesPoint[] | null;
  roastProfileCurve: CurvePoint[] | null;
  fanProfileCurve: FanCurvePoint[] | null;

  parseWarnings: string[];
}

export function parseHeaders(lines: string[]): Map<string, string> {
  const headers = new Map<string, string>();
  for (const line of lines) {
    if (line.trim() === "") break;
    if (line.startsWith("!")) continue;
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) break;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    headers.set(key, value);
  }
  return headers;
}

function parseRoastDate(raw: string): Date | null {
  // Format: DD/MM/YYYY HH:MM:SS UTC
  const match = raw.match(
    /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})\s+UTC$/,
  );
  if (!match) return null;
  const [, day, month, year, hour, minute, second] = match;
  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    ),
  );
}

function parseAmbientTemp(raw: string): number | null {
  // May have "(Mem) " prefix
  const cleaned = raw.replace(/^\(Mem\)\s*/, "");
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

function parseCurvePairs(
  raw: string,
): { time: number; value: number }[] | null {
  const parts = raw.split(",").map((s) => parseFloat(s.trim()));
  if (parts.length < 2 || parts.length % 2 !== 0) return null;

  const pairs: { time: number; value: number }[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    const time = parts[i];
    const value = parts[i + 1];
    if (time === undefined || value === undefined) continue;
    if (isNaN(time) || isNaN(value)) continue;
    pairs.push({ time, value });
  }

  // Remove sentinel pairs: index 1 (indices [2,3]) and the last pair
  // Sentinel at index 1 has time=0, value=0
  // Sentinel at end has time=0, value=0
  const filtered = pairs.filter((p, idx) => {
    // Skip index 1 if it's a 0,0 sentinel
    if (idx === 1 && p.time === 0 && p.value === 0) return false;
    // Skip last pair if it's a 0,0 sentinel
    if (idx === pairs.length - 1 && p.time === 0 && p.value === 0)
      return false;
    return true;
  });

  return filtered.length > 0 ? filtered : null;
}

function findTempAtTime(
  timeSeries: TimeSeriesPoint[],
  targetTime: number,
): number | null {
  if (timeSeries.length === 0) return null;

  let closest = timeSeries[0]!;
  let minDiff = Math.abs(closest.time - targetTime);

  for (const point of timeSeries) {
    const diff = Math.abs(point.time - targetTime);
    if (diff < minDiff) {
      minDiff = diff;
      closest = point;
    }
  }

  return closest.temp;
}

export function parseKlog(fileContent: string): ParsedKlog {
  const warnings: string[] = [];
  const lines = fileContent.split(/\r?\n/);

  // Parse headers
  const headers = parseHeaders(lines);

  // Find where data section starts (after blank line)
  let dataStartIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]!.trim() === "") {
      dataStartIdx = i + 1;
      break;
    }
  }

  // Check if we have recognizable content
  const hasHeaders = headers.size > 0;
  const hasTimeHeader = lines.some(
    (l) => l.startsWith("time\t") || l.startsWith("time "),
  );

  if (!hasHeaders && !hasTimeHeader) {
    throw new Error(
      "Unrecognizable .klog file: no key:value headers and no time-series header found",
    );
  }

  // Extract scalar fields from headers
  const roastDate = headers.has("roast_date")
    ? parseRoastDate(headers.get("roast_date")!)
    : null;

  const ambientTemp = headers.has("ambient_temperature")
    ? parseAmbientTemp(headers.get("ambient_temperature")!)
    : null;

  const roastingLevel = headers.has("roasting_level")
    ? parseFloat(headers.get("roasting_level")!) || null
    : null;

  const tastingNotes = headers.get("tasting_notes") ?? null;
  const profileFileName = headers.get("profile_file_name") ?? null;
  const profileShortName = headers.get("profile_short_name") ?? null;
  const profileDesigner = headers.get("profile_designer") ?? null;

  // Parse roast_profile curve
  let roastProfileCurve: CurvePoint[] | null = null;
  try {
    if (headers.has("roast_profile")) {
      const pairs = parseCurvePairs(headers.get("roast_profile")!);
      if (pairs) {
        roastProfileCurve = pairs.map((p) => ({ time: p.time, temp: p.value }));
      }
    }
  } catch {
    warnings.push("Failed to parse roast_profile curve data");
    roastProfileCurve = null;
  }

  // Parse fan_profile curve
  let fanProfileCurve: FanCurvePoint[] | null = null;
  try {
    if (headers.has("fan_profile")) {
      const pairs = parseCurvePairs(headers.get("fan_profile")!);
      if (pairs) {
        fanProfileCurve = pairs.map((p) => ({ time: p.time, rpm: p.value }));
      }
    }
  } catch {
    warnings.push("Failed to parse fan_profile curve data");
    fanProfileCurve = null;
  }

  // Parse time-series data and event markers
  let timeSeriesData: TimeSeriesPoint[] | null = null;
  let colourChangeTime: number | null = null;
  let firstCrackTime: number | null = null;
  let roastEndTime: number | null = null;
  let developmentPercent: number | null = null;

  try {
    if (dataStartIdx >= 0) {
      const dataLines = lines.slice(dataStartIdx);
      let headerFound = false;
      const points: TimeSeriesPoint[] = [];

      for (const line of dataLines) {
        const trimmed = line.trim();
        if (trimmed === "") continue;

        // Skip offsets row
        if (trimmed.startsWith("offsets")) continue;

        // Time-series header row
        if (trimmed.startsWith("time\t") || trimmed.startsWith("time ")) {
          headerFound = true;
          continue;
        }

        // Event markers
        if (trimmed.startsWith("!")) {
          const markerMatch = trimmed.match(/^!([^:]+):(.+)$/);
          if (markerMatch) {
            const key = markerMatch[1]!;
            const value = markerMatch[2]!.trim();

            switch (key) {
              case "colour_change":
                colourChangeTime = parseFloat(value);
                break;
              case "first_crack":
                firstCrackTime = parseFloat(value);
                break;
              case "roast_end":
                roastEndTime = parseFloat(value);
                break;
              case "development_percent":
                developmentPercent = parseFloat(value);
                break;
            }
          }
          continue;
        }

        // Data rows
        if (headerFound) {
          const cols = trimmed.split("\t");
          if (cols.length >= 14) {
            const time = parseFloat(cols[0]!);
            const spotTemp = parseFloat(cols[1]!);
            const temp = parseFloat(cols[2]!);
            const meanTemp = parseFloat(cols[3]!);
            const profileTemp = parseFloat(cols[4]!);
            const profileROR = parseFloat(cols[5]!);
            const actualROR = parseFloat(cols[6]!);
            const desiredROR = parseFloat(cols[7]!);
            const powerKW = parseFloat(cols[8]!);
            // cols[9] = volts, cols[10] = Kp, cols[11] = Ki, cols[12] = Kd — skip
            const actualFanRPM = parseFloat(cols[13]!);

            if (!isNaN(time)) {
              points.push({
                time,
                spotTemp: isNaN(spotTemp) ? 0 : spotTemp,
                temp: isNaN(temp) ? 0 : temp,
                meanTemp: isNaN(meanTemp) ? 0 : meanTemp,
                profileTemp: isNaN(profileTemp) ? 0 : profileTemp,
                profileROR: isNaN(profileROR) ? 0 : profileROR,
                actualROR: isNaN(actualROR) ? 0 : actualROR,
                desiredROR: isNaN(desiredROR) ? 0 : desiredROR,
                powerKW: isNaN(powerKW) ? 0 : powerKW,
                actualFanRPM: isNaN(actualFanRPM) ? 0 : actualFanRPM,
              });
            }
          }
        }
      }

      // Truncate data points after roastEndTime (cooldown data)
      const truncated =
        roastEndTime !== null
          ? points.filter((p) => p.time <= roastEndTime!)
          : points;

      timeSeriesData = truncated.length > 0 ? truncated : null;
      if (!timeSeriesData && headerFound) {
        warnings.push("Time-series header found but no valid data rows parsed");
      }
    }
  } catch {
    warnings.push("Failed to parse time-series data");
    timeSeriesData = null;
  }

  // Derive temperatures from time-series for event times
  const colourChangeTemp =
    colourChangeTime !== null && timeSeriesData
      ? findTempAtTime(timeSeriesData, colourChangeTime)
      : null;

  const firstCrackTemp =
    firstCrackTime !== null && timeSeriesData
      ? findTempAtTime(timeSeriesData, firstCrackTime)
      : null;

  const roastEndTemp =
    roastEndTime !== null && timeSeriesData
      ? findTempAtTime(timeSeriesData, roastEndTime)
      : null;

  // totalDuration = roastEndTime
  const totalDuration = roastEndTime;

  // developmentTime = roastEndTime - firstCrackTime
  const developmentTime =
    roastEndTime !== null && firstCrackTime !== null
      ? roastEndTime - firstCrackTime
      : null;

  return {
    roastDate,
    ambientTemp,
    roastingLevel,
    tastingNotes,
    profileFileName,
    profileShortName,
    profileDesigner,

    colourChangeTime,
    firstCrackTime,
    roastEndTime,
    developmentPercent,

    colourChangeTemp,
    firstCrackTemp,
    roastEndTemp,

    totalDuration,
    developmentTime,

    timeSeriesData,
    roastProfileCurve,
    fanProfileCurve,

    parseWarnings: warnings,
  };
}

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
