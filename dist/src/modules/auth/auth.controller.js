import * as authService from "./auth.service";
import { successResponse } from "../../common/utils/response";
import { BadRequestError, UnauthorizedError } from "../../common/errors/AppError";
import { clearAuthCookies, extractAccessToken, extractRefreshToken, setAuthCookies } from "../../common/utils/cookies";
function requireDevice(req) {
    const device = req.deviceInfo;
    if (!device) {
        throw new BadRequestError('Device information could not be determined.');
    }
    return device;
}
function requireUser(req) {
    const user = req.user;
    if (!user) {
        throw new BadRequestError('Authentication context missing.');
    }
    return user;
}
export async function register(req, res, next) {
    const dto = req.validated.body;
    try {
        const result = await authService.register(dto);
        successResponse(res, result, "User created successfully, please verfiy ", 201);
    }
    catch (err) {
        next(err);
    }
}
export async function login(req, res, next) {
    const device = requireDevice(req);
    try {
        const result = await authService.login(req.validated.body, device);
        setAuthCookies(res, {
            accessToken: result.tokens.accessToken,
            refreshToken: result.tokens.refreshToken,
            sessionId: result.sessionId
        });
        successResponse(res, result.data, 'User login Successfull', 200);
    }
    catch (err) {
        next(err);
    }
}
export async function logout(req, res, next) {
    try {
        const user = requireUser(req);
        const device = requireDevice(req);
        console.log("user: ", user);
        await authService.logout(user.sub, user.refreshToken, device);
        clearAuthCookies(res);
        successResponse(res, null, 'User logout successfully', 204);
    }
    catch (err) {
        next(err);
    }
}
export async function resetPasswordRequest(req, res, next) {
    const token = extractAccessToken(req);
    if (!token)
        throw new UnauthorizedError('user');
    const device = req.deviceInfo;
    try {
        const result = authService.resetPasswordRequest(req.body, token, device);
        successResponse(res, result, "Reset Password Email sent successfully", 201);
    }
    catch (err) {
        next(err);
    }
}
export async function refreshToken(req, res, next) {
    const device = requireDevice(req);
    try {
        const extractedRefreshToken = extractRefreshToken(req);
        if (!extractedRefreshToken) {
            throw new BadRequestError("Session Expired, Please Login again");
        }
        const result = await authService.refreshToken(extractedRefreshToken, device);
        setAuthCookies(res, {
            refreshToken: result.tokens.refreshToken,
            accessToken: result.tokens.accessToken,
            sessionId: result.sessionId
        });
        successResponse(res, { user: result.user, accessToken: result.tokens.accessToken }, "Token Refreshed successfully", 200);
    }
    catch (err) {
        next(err);
    }
}
export async function logoutAll(req, res, next) {
    const user = requireUser(req);
    try {
        const result = await authService.logoutAll(user.sub);
        successResponse(res, result, "All sessions revoked successfully", 204);
    }
    catch (err) {
        next(err);
    }
}
export async function deleteUser(req, res, next) {
    const device = requireDevice(req);
    try {
        const result = await authService.deleteUser(req.validated.body);
        clearAuthCookies(res);
        successResponse(res, result, "User deleted successfully", 204);
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=auth.controller.js.map