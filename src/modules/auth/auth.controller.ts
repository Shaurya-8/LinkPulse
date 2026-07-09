import { Request, Response, NextFunction } from "express";
import * as authService from "./auth.service";
import { successResponse } from "../../common/utils/response"
import { RegisterDto } from "./auth.schema";
import { AccessToken, AuthenticatedRequest, JwtAccessPayload } from "../../types";
import { DeviceInfo } from "../../types"
import { BadRequestError, UnauthorizedError } from "../../common/errors/AppError";
import { clearAuthCookies, extractAccessToken, extractRefreshToken, setAuthCookies } from "../../common/utils/cookies";
import { RefreshToken, UserId } from "../../types";
import { verifyToken } from "../../common/utils/jwt";
function requireDevice(req: Request): DeviceInfo {
    const device = req.deviceInfo;
    if (!device) {
        throw new BadRequestError('Device information could not be determined.');
    }
    return device;
}

function requireUser(req: Request): AuthenticatedRequest['user'] {
    const user = req.user;
    if (!user) {
        throw new BadRequestError('Authentication context missing.');
    }
    return user;
}


export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
    const dto = req.body as RegisterDto;
    try {
        const result = await authService.register(dto);
        successResponse(
            res,
            result,
            "User created successfully, please verfiy ",
            201,
        )
    } catch (err) {
        next(err);
    }
}

export async function login(req: Request, res: Response, next: NextFunction) {
    const device = requireDevice(req);
    try {
        const result = await authService.login(req.body, device);

        setAuthCookies(
            res, {
            accessToken: result.tokens.accessToken,
            refreshToken: result.tokens.refreshToken,
            sessionId: result.sessionId
        });
        successResponse(
            res,
            result.data,
            'User login Successfull',
            200
        );

    } catch (err) {
        next(err)
    }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
    try {
        const user = requireUser(req);
        const device = requireDevice(req);
        await authService.logout(user.id as UserId, user.refreshToken, device);
        clearAuthCookies(res);
        successResponse(res, null, 'User logout successfully', 204);
    } catch (err) {
        next(err)
    }
}

export async function resetPasswordRequest(req: Request, res: Response, next: NextFunction) {
    const token = extractAccessToken(req) as AccessToken;
    if (!token) throw new UnauthorizedError('user');
    const device = req.deviceInfo;
    try {
        const result = authService.resetPasswordRequest(req.body, token, device);
        successResponse(res, result, "Reset Password Email sent successfully", 201);
    } catch (err) {
        next(err)
    }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction) {
    const device = requireDevice(req);

    try {
        const extractedRefreshToken = extractRefreshToken(req);
        if (!extractedRefreshToken) {
            throw new BadRequestError("Session Expired, Please Login again");
        }
        const result = await authService.refreshToken(extractedRefreshToken as RefreshToken, device);
        setAuthCookies(
            res, {
            refreshToken: result.tokens.refreshToken,
            accessToken: result.tokens.accessToken,
            sessionId: result.sessionId
        });

        successResponse(res,
            { user: result.user, accessToken: result.tokens.accessToken },
            "Token Refreshed successfully",
            200
        );

    } catch (err) {
        next(err)
    }
}

export async function logoutAll(req: Request, res: Response, next: NextFunction) {
    const user = requireUser(req);
    try {
        const result = await authService.logoutAll(user.id);
        successResponse(res, result, "All sessions revoked successfully", 204);
    } catch (err) {
        next(err)
    }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction) {
    const device = requireDevice(req);
    try {
        const result = await authService.deleteUser(req.body);
        clearAuthCookies(res);
        successResponse(res, result, "User deleted successfully", 204);
    } catch (err) {
        next(err)
    }
}