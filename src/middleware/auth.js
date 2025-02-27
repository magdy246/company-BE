import dotenv from 'dotenv';
import path from 'path';
import UsersModel from '../DB/models/users.model.js';
import { asyncHandler } from '../utils/error/index.js';
import { VerifyToken } from '../utils/index.js';

dotenv.config({ path: path.resolve("config/.env") });

export const roles = {
    user: "user",
    admin: "admin",
};

export const tokenTypes = {
    access: "access",
    refresh: "refresh",
};

export const decodedToken = async ({ token, tokenType, next }) => {
    if (!token) {
        return next(new Error("Authorization token is required"));
    }

    const [prefix, accessToken] = token.split(" ");

    if (!prefix || !accessToken) {
        return next(new Error("Invalid authorization token format"));
    }

    let ACCESS_SIGNATURE = undefined;
    let REFRESH_SIGNATURE = undefined;
    if (prefix === "Bearer") {
        ACCESS_SIGNATURE = process.env.SECRET_KEY_TOKEN_USER;
        REFRESH_SIGNATURE = process.env.SECRET_KEY_REFRESH_TOKEN_USER;
    } else if (prefix === "Admin") {
        ACCESS_SIGNATURE = process.env.SECRET_KEY_TOKEN_ADMIN;
        REFRESH_SIGNATURE = process.env.SECRET_KEY_REFRESH_TOKEN_ADMIN;
    } else {
        return next(new Error("Invalid authorization token prefix"));
    }

    const decoded = await VerifyToken({
        accessToken,
        SIGNATURE: tokenType === tokenTypes.access ? ACCESS_SIGNATURE : REFRESH_SIGNATURE
    });

    if (!decoded?.id) {
        return next(new Error("Invalid token payload"));
    }    

    const user = await UsersModel.findById(decoded.id);
    if (!user) {
        return next(new Error("User not found"));
    }

    if (user?.isDeleted) {
        return next(new Error("user deleted"));
    }

    if (parseInt(user?.passwordChangedAt?.getTime() / 1000) > decoded.iat) {
        return next(new Error("Token has expired due to password change."));
    }
    return user;
}

// Authentication Middleware
export const authentication = asyncHandler(async (req, res, next) => {
    const { token } = req.headers;
    const user = await decodedToken({ token, tokenType: tokenTypes.access, next });
    req.user = user;
    next();
});

// Authorization Middleware
export const authorization = (requiredRoles = []) => {
    return asyncHandler(async (req, res, next) => {
        const { user } = req;

        if (!requiredRoles.includes(user.role)) {
            return next(new Error("Access denied: insufficient permissions"));
        }

        next();
    })
};
