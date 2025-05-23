import { z } from "zod";

// Reusable folder name schema
const folderNameSchema = z
  .string()
  .min(1, { message: "Folder name is required" })
  .max(255, { message: "Folder name must be at most 255 characters" })
  .regex(
    /^(?!\.{1,2}$)(?!\s*$)(?!.*\/)[a-zA-Z0-9 _\-.]+$/,
    "Folder name contains invalid characters"
  );

const folderParentSchema = z.string().nullable().optional();

// Validation schema for creating a folder
export const createFolderSchema = z.object({
  name: folderNameSchema,
  parent: folderParentSchema,
});

// Validation schema for updating a folder
export const updateFolderSchema = z.object({
  name: folderNameSchema.optional(),
  parent: folderParentSchema,
  workspace: z.string().nullable().optional(),
  isPinned: z.boolean().optional(),
  path: z.string().optional(),
  pathSegments: z
    .array(z.object({ name: z.string(), id: z.string() }))
    .optional(),
  items: z.number().optional(),
});

// Validation schema for renaming a folder
export const renameFolderSchema = z.object({
  name: folderNameSchema.refine(
    (name) => name.trim().length > 0,
    { message: "Folder name cannot be empty" }
  ),
});

// Validation schema for moving a folder
export const moveFolderSchema = z.object({
  parent: z.string().nullable(),
});
