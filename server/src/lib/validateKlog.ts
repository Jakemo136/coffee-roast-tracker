export function validateKlogFile(
  fileName: string,
  fileContent: string,
): { valid: boolean; error?: string } {
  // Check extension
  if (!fileName.toLowerCase().endsWith(".klog")) {
    return {
      valid: false,
      error: `Invalid file extension: expected .klog, got "${fileName.slice(fileName.lastIndexOf("."))}"`,
    };
  }

  // Check for at least one key:value header line
  const lines = fileContent.split(/\r?\n/);
  let hasHeader = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "") break;
    if (trimmed.startsWith("!")) continue;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx > 0 && colonIdx < trimmed.length - 1) {
      hasHeader = true;
      break;
    }
  }

  if (!hasHeader) {
    return {
      valid: false,
      error: "File does not contain any key:value header lines",
    };
  }

  // Check for tab-separated "time" header row
  const hasTimeHeader = lines.some(
    (l) => l.startsWith("time\t"),
  );

  if (!hasTimeHeader) {
    return {
      valid: false,
      error: "File does not contain a tab-separated time-series header row",
    };
  }

  return { valid: true };
}
