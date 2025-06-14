import mongoose from "mongoose";

type SanitizeOptions = {
  excludeFields?: string[];
  includeFields?: string[];
  idField?: string; // default: "id"
  recursive?: boolean; // default: true
};

/**
 * Utility to clean and format Mongoose documents for safe JSON output by removing unwanted fields,
 * converting MongoDB-specific types, and optionally recursively processing nested data.
 *
 * @template T - Expected return type after sanitization
 * @param doc - Mongoose document or plain object to sanitize
 * @param options - Sanitization options (excludeFields, includeFields, idField, recursive)
 * @returns Sanitized plain object of type T
 */
export function sanitizeDocument<T>(
  doc: any,
  options: SanitizeOptions = {}
): T {
  const {
    excludeFields = ["__v"],
    includeFields = [],
    idField = "id",
    recursive = true,
  } = options;

  if (!doc) return null as any;

  if (Array.isArray(doc)) {
    return doc.map((item) => sanitizeDocument(item, options)) as any;
  }

  const obj = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  const sanitized: Record<string, any> = {};

  for (const key in obj) {
    if (excludeFields.includes(key)) continue;
    if (
      includeFields.length > 0 &&
      !includeFields.includes(key) &&
      key !== "_id"
    )
      continue;

    const value = obj[key];

    if (key === "_id") {
      sanitized[idField] = value.toString();
    } else if (value instanceof mongoose.Types.ObjectId) {
      sanitized[key] = value.toString();
    } else if (Buffer.isBuffer(value)) {
      sanitized[key] = value.toString("hex");
    } else if (value instanceof Date) {
      sanitized[key] = value.toISOString();
    } else if (recursive && typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeDocument(value, options);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}
