export type Mode = "commit" | "version";

export interface Manifest {
  app: string;
  mode: Mode;
  latest: string;
  files: string[];
  timestamp: number;
}

export interface ValidationError {
  field: string;
  message: string;
}

export type ValidationResult =
  | { valid: true; manifest: Manifest }
  | { valid: false; errors: ValidationError[] };

export function validateManifest(data: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (typeof data !== "object" || data === null) {
    return {
      valid: false,
      errors: [{ field: "", message: "Manifest must be a JSON object." }],
    };
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.app !== "string" || obj.app.trim() === "") {
    errors.push({ field: "app", message: "Must be a non-empty string." });
  }

  if (obj.mode !== "commit" && obj.mode !== "version") {
    errors.push({
      field: "mode",
      message: `Must be "commit" or "version", got "${String(obj.mode)}".`,
    });
  }

  if (typeof obj.latest !== "string" || obj.latest.trim() === "") {
    errors.push({ field: "latest", message: "Must be a non-empty string." });
  }

  if (!Array.isArray(obj.files)) {
    errors.push({ field: "files", message: "Must be an array of strings." });
  } else {
    const bad = (obj.files as unknown[]).filter((f) => typeof f !== "string");
    if (bad.length > 0) {
      errors.push({
        field: "files",
        message: `All items must be strings, found ${bad.length} non-string item(s).`,
      });
    }
  }

  if (typeof obj.timestamp !== "number" || !Number.isFinite(obj.timestamp)) {
    errors.push({ field: "timestamp", message: "Must be a finite number." });
  } else if (obj.timestamp <= 0) {
    errors.push({ field: "timestamp", message: "Must be a positive number." });
  }

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, manifest: data as Manifest };
}
