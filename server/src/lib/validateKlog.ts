import { parseHeaders } from "./klogParser.js";

type ValidationResult =
  | { valid: true }
  | { valid: false; error: string };

export function validateKlogFile(
  fileName: string,
  fileContent: string,
): ValidationResult {
  if (!fileName.toLowerCase().endsWith(".klog")) {
    return {
      valid: false,
      error: `Invalid file extension: expected .klog, got "${fileName.slice(fileName.lastIndexOf("."))}"`,
    };
  }

  const lines = fileContent.split(/\r?\n/);
  const headers = parseHeaders(lines);
  if (headers.size === 0) {
    return {
      valid: false,
      error: "File does not contain any key:value header lines",
    };
  }

  const hasTimeHeader = lines.some((l) => l.startsWith("time\t"));
  if (!hasTimeHeader) {
    return {
      valid: false,
      error: "File does not contain a tab-separated time-series header row",
    };
  }

  return { valid: true };
}
