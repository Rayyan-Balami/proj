import userDAO from "@api/user/user.dao.js";
import {
  AdminSetPasswordDTO,
  AdminUpdateStorageDTO,
  CreateUserDTO,
  DeleteUserAccountDTO,
  JwtUserPayload,
  LoginUserDTO,
  UpdateUserDTO,
  UpdateUserPasswordDTO,
  UpdateUserRoleDTO,
  UserResponseDTO,
} from "@api/user/user.dto.js";
import { IUser } from "@api/user/user.model.js";
import { REFRESH_TOKEN_SECRET, DEFAULT_USER_AVATAR_URL } from "@config/constants.js";
import { ApiError } from "@utils/apiError.utils.js";
import { createUserDirectory, getUserDirectoryPath, removeDirectory } from "@utils/mkdir.utils.js";
import { sanitizeDocument } from "@utils/sanitizeDocument.utils.js";
import logger from "@utils/logger.utils.js";
import jwt from "jsonwebtoken";
import fileService from "@api/file/file.service.js";
import folderService from "@api/folder/folder.service.js";

/**
 * Business logic layer for user operations
 */
class UserService {
  /**
   * Generate auth token pair for user session
   * @param user - Target user
   * @returns Access and refresh tokens
   */
  async generateAccessAndRefreshTokens(user: IUser) {
    // Generate access token
    const accessToken = user.generateAccessToken();

    // Generate refresh token
    const refreshToken = user.generateRefreshToken();

    // Set refresh token for the user
    const updatedUser = await userDAO.setUserRefreshToken(
      user.id,
      refreshToken
    );

    // Check if user exists and refresh token was set
    if (!updatedUser || !updatedUser.refreshToken) {
      throw new ApiError(500, [{ auth: "Failed to create session" }]);
    }

    // Return tokens
    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Register user with auto-login
   * @param data - Registration data
   * @returns User data with auth tokens
   * @throws Email already registered
   */
  async registerUserWithTokens(data: CreateUserDTO): Promise<{
    user: UserResponseDTO;
    accessToken: string;
    refreshToken: string;
  }> {
    // Check if email is already in use
    const existingUser = await userDAO.getUserByEmail(data.email);
    if (existingUser) {
      throw new ApiError(409, [
        { email: "Email is already linked to an account." },
      ]);
    }

    // Create user with default storage limit
    const user = await userDAO.createUser(data);

    // Generate tokens
    const { accessToken, refreshToken } =
      await this.generateAccessAndRefreshTokens(user);

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Register user without auto-login
   * @param data - Registration data
   * @returns User data only
   * @throws Email already registered
   */
  async registerUser(data: CreateUserDTO): Promise<UserResponseDTO> {
    // Check if email is already in use
    const existingUser = await userDAO.getUserByEmail(data.email);
    if (existingUser) {
      throw new ApiError(409, [
        { email: "Email is already linked to an account." },
      ]);
    }

    // Create user with default storage limit
    const user = await userDAO.createUser(data);

    // Create user directory after user is created
    createUserDirectory(user.id);

    // Return only the user data, no tokens
    return this.sanitizeUser(user);
  }

  /**
   * Authenticate user login
   * @param credentials - Email and password
   * @returns User data with auth tokens
   * @throws Invalid credentials
   */
  async loginUser(credentials: LoginUserDTO): Promise<{
    user: UserResponseDTO;
    accessToken: string;
    refreshToken: string;
  }> {
    // Find user by email
    const user = await userDAO.getUserByEmail(credentials.email, {
      includePassword: true,
    });

    if (!user) {
      // Use a generic error message that doesn't reveal if the email exists
      throw new ApiError(401, [{ auth: "Invalid email or password" }]);
    }

    // Verify password
    const validPassword = await user.checkPassword(credentials.password);

    if (!validPassword) {
      // Use the same generic error message to prevent user enumeration
      throw new ApiError(401, [{ auth: "Invalid email or password" }]);
    }

    // Generate tokens
    const { accessToken, refreshToken } =
      await this.generateAccessAndRefreshTokens(user);

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * End user session
   * @param userId - User to logout
   * @returns Success status
   */
  async logoutUser(userId: string): Promise<boolean> {
    // Find user by ID
    const user = await userDAO.getUserById(userId);
    if (!user) {
      throw new ApiError(404, [{ id: "User not found" }]);
    }

    // Clear the refresh token
    const loggedOutUser = await userDAO.clearUserRefreshToken(userId);

    if (!loggedOutUser) {
      throw new ApiError(500, [{ logout: "Failed to logout user" }]);
    }
    return true;
  }

  /**
   * Get user by ID with options
   * @param id - Target user ID
   * @param options - Include refresh token/deleted
   * @throws User not found
   */
  async getUserById(
    id: string,
    options?: { includeRefreshToken?: boolean; deletedAt?: boolean }
  ): Promise<UserResponseDTO> {
    const user = await userDAO.getUserById(id, options);
    if (!user) {
      throw new ApiError(404, [{ id: "User not found" }]);
    }

    return this.sanitizeUser(user);
  }

  /**
   * Update user profile data
   * @param id - Target user ID
   * @param data - New user data
   * @throws User not found
   */
  async updateUser(id: string, data: UpdateUserDTO): Promise<UserResponseDTO> {
    const updatedUser = await userDAO.updateUser(id, data);
    if (!updatedUser) {
      throw new ApiError(404, [{ id: "User not found" }]);
    }

    return this.sanitizeUser(updatedUser);
  }

  /**
   * Update user avatar with old avatar cleanup
   * @param id - Target user ID
   * @param avatarUrl - New avatar URL
   * @throws User not found
   */
  async updateUserAvatar(id: string, avatarUrl: string): Promise<UserResponseDTO> {
    // Get current user to check existing avatar
    const currentUser = await userDAO.getUserById(id);
    if (!currentUser) {
      throw new ApiError(404, [{ id: "User not found" }]);
    }

    // Clean up old avatar if it's not the default
    if (currentUser.avatar && currentUser.avatar !== DEFAULT_USER_AVATAR_URL) {
      try {
        const { deleteAvatarFile } = await import("@middleware/avatar.middleware.js");
        await deleteAvatarFile(currentUser.avatar);
      } catch (error) {
        logger.warn("Failed to delete old avatar file:", error);
        // Continue with update even if cleanup fails
      }
    }

    // Update user with new avatar
    const updatedUser = await userDAO.updateUserAvatar(id, avatarUrl);
    if (!updatedUser) {
      throw new ApiError(500, [{ avatar: "Failed to update user avatar" }]);
    }

    return this.sanitizeUser(updatedUser);
  }

  /**
   * Change user password with verification
   * @param id - Target user ID
   * @param passwordData - Old and new passwords
   * @throws Invalid current password
   */
  async updateUserPassword(
    id: string,
    passwordData: UpdateUserPasswordDTO
  ): Promise<UserResponseDTO> {
    const updatedUser = await userDAO.updateUserPassword(id, passwordData);

    if (!updatedUser) {
      throw new ApiError(400, [
        { currentPassword: "Invalid current password or user not found" },
      ]);
    }

    return this.sanitizeUser(updatedUser);
  }

  /**
   * Admin: Set user password directly
   * @param id - Target user ID
   * @param passwordData - New password
   * @throws User not found
   */
  async adminSetUserPassword(
    id: string,
    passwordData: AdminSetPasswordDTO
  ): Promise<UserResponseDTO> {
    // Set the new password
    const updatedUser = await userDAO.adminSetUserPassword(
      id,
      passwordData.newPassword
    );

    if (!updatedUser) {
      throw new ApiError(404, [{ id: "User not found" }]);
    }

    return this.sanitizeUser(updatedUser);
  }

  /**
   * Admin: Change user role
   * @param userId - Target user ID
   * @param roleData - New role
   * @throws User not found
   */
  async updateUserRole(
    userId: string,
    roleData: UpdateUserRoleDTO
  ): Promise<UserResponseDTO> {
    // Ensure the user exists first
    const existingUser = await userDAO.getUserById(userId);
    if (!existingUser) {
      throw new ApiError(404, [{ id: "User not found" }]);
    }

    // Update the user role
    const updatedUser = await userDAO.updateUserRole(userId, roleData.role);

    if (!updatedUser) {
      throw new ApiError(500, [{ role: "Failed to update user role" }]);
    }

    return this.sanitizeUser(updatedUser);
  }

  /**
   * Move user to trash
   * @param id - Target user ID
   * @throws User not found
   */
  async softDeleteUser(id: string): Promise<UserResponseDTO> {
    const deletedUser = await userDAO.softDeleteUser(id);

    if (!deletedUser) {
      throw new ApiError(404, [{ id: "User not found" }]);
    }

    return this.sanitizeUser(deletedUser);
  }

  /**
   * Admin: List all users
   * @param includeDeleted - Include trashed users
   * @returns Array of users
   */
  async getAllUsers(
    includeDeleted: boolean = false
  ): Promise<UserResponseDTO[]> {
    const users = await userDAO.getAllUsers(includeDeleted);
    return users.map((user) => this.sanitizeUser(user));
  }

  /**
   * Update user's storage usage
   * @param userId - Target user ID
   * @param bytesToAdd - Bytes to add (positive) or subtract (negative)
   * @throws User not found
   */
  async updateUserStorageUsage(
    userId: string,
    bytesToAdd: number
  ): Promise<UserResponseDTO> {
    // First check if user exists
    const user = await userDAO.getUserById(userId);
    if (!user) {
      throw new ApiError(404, [{ id: "User not found" }]);
    }

    // Calculate new storage used
    const newStorageUsed = Math.max(0, user.storageUsed + bytesToAdd);

    // Update storage calculation
    const updatedUser = await userDAO.updateUser(userId, {
      storageUsed: newStorageUsed,
    });

    if (!updatedUser) {
      throw new ApiError(500, [{ storage: "Failed to update storage usage" }]);
    }

    return this.sanitizeUser(updatedUser);
  }

  /**
   * Get new token pair using refresh token
   * @param refreshToken - Valid refresh token
   * @returns User data with new tokens
   * @throws Invalid/expired token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    user: UserResponseDTO;
    newAccessToken: string;
    newRefreshToken: string;
  }> {
    // Verify refresh token
    const decoded = jwt.verify(
      refreshToken,
      REFRESH_TOKEN_SECRET
    ) as JwtUserPayload;

    // Find user by ID
    const user = await userDAO.getUserById(decoded.id, {
      includeRefreshToken: true,
    });
    if (!user) {
      throw new ApiError(401, [{ refreshToken: "Invalid refresh token" }]);
    }

    // Check if the refresh token matches the stored one
    if (user.refreshToken !== refreshToken) {
      throw new ApiError(401, [
        { refreshToken: "Expired or used refresh token" },
      ]);
    }

    // Generate new tokens
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      await this.generateAccessAndRefreshTokens(user);

    return {
      user: this.sanitizeUser(user),
      newAccessToken,
      newRefreshToken,
    };
  }

  /**
   * Admin: Set user's storage quota
   * @param userId - Target user ID
   * @param storageData - New storage limit
   * @throws Invalid limit or user not found
   */
  async updateUserStorageLimit(
    userId: string,
    storageData: AdminUpdateStorageDTO
  ): Promise<UserResponseDTO> {
    // First check if user exists
    const user = await userDAO.getUserById(userId);
    if (!user) {
      throw new ApiError(404, [{ id: "User not found" }]);
    }

    // Validate new storage limit
    if (storageData.maxStorageLimit < user.storageUsed) {
      throw new ApiError(400, [
        {
          maxStorageLimit:
            "New storage limit cannot be less than current storage used",
        },
      ]);
    }

    // Update the storage limit
    const updatedUser = await userDAO.updateUserStorageLimit(
      userId,
      storageData.maxStorageLimit
    );

    if (!updatedUser) {
      throw new ApiError(500, [{ storage: "Failed to update storage limit" }]);
    }

    return this.sanitizeUser(updatedUser);
  }

  /**
   * Admin: Restore user from trash
   * @param userId - Target user ID
   * @returns Restored user
   * @throws User not found or not deleted
   */
  async restoreUser(userId: string): Promise<UserResponseDTO> {
    // First check if user exists and is deleted
    const user = await userDAO.getUserById(userId, { deletedAt: true });
    if (!user) {
      throw new ApiError(404, [{ id: "User not found" }]);
    }

    if (!user.deletedAt) {
      throw new ApiError(400, [{ user: "User is not deleted" }]);
    }

    // Restore the user
    const restoredUser = await userDAO.restoreUser(userId);
    if (!restoredUser) {
      throw new ApiError(500, [{ restore: "Failed to restore user" }]);
    }

    return this.sanitizeUser(restoredUser);
  }

  /**
   * Permanently delete user account and all associated data
   * @param userId - Target user ID
   * @param deleteData - Password confirmation for security
   * @throws Invalid password or user not found
   */
  async deleteUserAccount(userId: string, deleteData: DeleteUserAccountDTO): Promise<void> {
    // Get user with password for verification
    const user = await userDAO.getUserById(userId, { includeRefreshToken: true });
    if (!user) {
      throw new ApiError(404, [{ id: "User not found" }]);
    }

    // Get user with password to verify the password
    const userWithPassword = await userDAO.getUserByEmail(user.email, { includePassword: true });
    if (!userWithPassword) {
      throw new ApiError(404, [{ id: "User not found" }]);
    }

    // Verify password
    const validPassword = await userWithPassword.checkPassword(deleteData.password);
    if (!validPassword) {
      throw new ApiError(401, [{ password: "Invalid password" }]);
    }

    try {
      logger.info(`Starting account deletion for user: ${userId}`);

      // 1. Delete all user files (both active and trashed) from database and storage
      await fileService.permanentDeleteAllDeletedFiles(userId);
      
      // Get and delete all active files
      const activeFiles = await fileService.getUserFilesByFolders(userId, undefined, false);
      for (const file of activeFiles) {
        await fileService.permanentDeleteFile(file.id, userId);
      }

      // 2. Delete all user folders (both active and trashed) from database
      await folderService.permanentDeleteAllDeletedFolders(userId);
      
      // Get and delete all active folders
      const activeFolders = await folderService.getUserFolders(userId, undefined, false);
      for (const folder of activeFolders) {
        await folderService.permanentDeleteFolder(folder.id, userId);
      }

      // 3. Remove user's upload directory entirely from server filesystem
      try {
        const userDirPath = getUserDirectoryPath(userId);
        const removed = removeDirectory(userDirPath);
        if (removed) {
          logger.info(`Removed user directory: ${userDirPath}`);
        } else {
          logger.warn(`Failed to remove user directory: ${userDirPath}`);
        }
      } catch (error) {
        logger.error(`Error removing user directory:`, error);
        // Continue with deletion even if directory removal fails
      }

      // 4. Delete user avatar file if not default
      if (user.avatar && user.avatar !== DEFAULT_USER_AVATAR_URL) {
        try {
          const { deleteAvatarFile } = await import("@middleware/avatar.middleware.js");
          await deleteAvatarFile(user.avatar);
          logger.info(`Deleted user avatar: ${user.avatar}`);
        } catch (error) {
          logger.warn("Failed to delete user avatar file:", error);
          // Continue with deletion even if avatar cleanup fails
        }
      }

      // 5. Permanently delete user record from database
      const deletionResult = await userDAO.permanentDeleteUser(userId);
      if (!deletionResult.acknowledged || deletionResult.deletedCount === 0) {
        throw new ApiError(500, [{ delete: "Failed to delete user account" }]);
      }

      logger.info(`Successfully deleted user account: ${userId}`);
    } catch (error) {
      logger.error(`Error during user account deletion for ${userId}:`, error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, [{ delete: "Failed to delete user account" }]);
    }
  }

  /**
   * Strip sensitive data from user object
   * @param user - Raw user document
   * @returns Client-safe user data
   */
  private sanitizeUser(user: IUser): UserResponseDTO {
    // First use the general sanitizer
    return sanitizeDocument<UserResponseDTO>(user, {
      excludeFields: ["password", "__v"],
      recursive: true,
    });
  }
}

export default new UserService();
