import API from "@/lib/axios";
import { MoveFileDto, RenameFileDto, UpdateFileDto } from "@/types/file.dto";

/**
 * File API functions for authenticated users
 */
const fileApi = {
  // Upload files to the server
  uploadFiles: (files: File[], folderData?: { folderId?: string, workspaceId?: string }) => {
    const formData = new FormData();
    
    // Append each file to the form data
    files.forEach((file) => {
      formData.append("files", file);
    });
    
    // Add folder or workspace information if provided
    if (folderData?.folderId) {
      formData.append("folder", folderData.folderId);
    }
    
    if (folderData?.workspaceId) {
      formData.append("workspace", folderData.workspaceId);
    }
    
    return API.post("/file/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
  
  // Get a file by ID
  getFileById: (fileId: string) => 
    API.get(`/file/${fileId}`),
  
  // Update a file's properties
  updateFile: (fileId: string, data: UpdateFileDto) => 
    API.patch(`/file/${fileId}`, data),
  
  // Delete a file by ID
  deleteFile: (fileId: string) => 
    API.delete(`/file/${fileId}`),

  // Rename a file
  renameFile: (fileId: string, data: RenameFileDto) => 
    API.post(`/file/${fileId}/rename`, data),

  // Move a file to a different folder
  moveFile: (fileId: string, data: MoveFileDto) => 
    API.post(`/file/${fileId}/move`, data)
};

export default fileApi;
