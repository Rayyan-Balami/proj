import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JwtUserPayload } from "@api/user/user.dto.js";
import userService from "@api/user/user.service.js";
import { ACCESS_TOKEN_SECRET } from "@config/constants.js";
import { ApiError } from "@utils/apiError.utils.js";
import { asyncHandler } from "@utils/asyncHandler.utils.js";

export const verifyGuest = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const token =
      req.cookies?.accessToken ||
      req.headers["authorization"]?.replace("Bearer ", "");

    if (!token) {
      return next(); // No token, treat as guest
    }

    try {
      const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtUserPayload;

      const refreshToken =
        req.cookies?.refreshToken || req.body?.refreshToken || "";
      const sessionId = req.cookies?.sessionId || req.body?.sessionId || "";

      const user = await userService.getUserById(decoded.id, {
        includeRefreshTokens: true,
        deletedAt: false,
      });

      const matched = user?.refreshTokens?.some(
        (t) => t.token === refreshToken && t.id === sessionId
      );

      // If a valid session exists, block guest access
      if (matched) {
        throw new ApiError(403, [
          { auth: "Already authenticated. Please logout first." },
        ]);
      }

      return next(); // Treat as guest if token or session doesn't match
    } catch (err) {
      // Treat all JWT errors as guest
      if (
        err instanceof jwt.TokenExpiredError ||
        err instanceof jwt.JsonWebTokenError ||
        err instanceof jwt.NotBeforeError
      ) {
        return next();
      }

      if (err instanceof ApiError) throw err;

      // Unknown errors still allow guest access
      return next();
    }
  }
);
