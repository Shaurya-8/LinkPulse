import { AuthenticatedUser, DeviceInfo, RefreshToken, SessionId, UserId } from ".";

declare global {
    namespace Express {
        interface Request {
            deviceInfo?: DeviceInfo;
            validated: Partial<{
                query: unknown;
                body: unknown;
                params: unknown;
            }>;
            user?: AuthenticatedUser;
        }
    }
}

export { };