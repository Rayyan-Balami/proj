import express from "express";
import FileController from "@api/File/file.controller.js";
import { verifyAuth } from "@middleware/auth.middleware.js";
import { validateData } from "@middleware/validate.middleware.js";
import { renameFileSchema, moveFileSchema, updateFileSchema } from "./file.validator.js";

//=============================================================================
// ROUTE INITIALIZATION
//=============================================================================
const authRoutes = express.Router();

//=============================================================================
// AUTHENTICATED USER ROUTES - Requires valid auth token
//=============================================================================
// Apply middleware once at the router level
authRoutes.use(verifyAuth);

// File routes
authRoutes.post("/upload", FileController.uploadFiles); // Single unified upload endpoint
authRoutes.get("/:id", FileController.getFileById);
authRoutes.patch("/:id", validateData(updateFileSchema), FileController.updateFile);
authRoutes.delete("/:id", FileController.softDeleteFile);
authRoutes.post("/:id/rename", validateData(renameFileSchema), FileController.renameFile); // Rename a file
authRoutes.post("/:id/move", validateData(moveFileSchema), FileController.moveFile);     // Move a file to a different folder
authRoutes.delete("/:id/permanent", FileController.permanentDeleteFile);                // Permanently delete file
authRoutes.post("/:id/restore", FileController.restoreFile);                           // Restore a file from trash

//=============================================================================
// ROUTE REGISTRATION
//=============================================================================
const fileRoutes = express.Router();
fileRoutes.use("/files", authRoutes);

export default fileRoutes;