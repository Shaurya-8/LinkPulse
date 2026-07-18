import { DeviceInfo, RefreshToken, SessionId, UserId } from ".";

declare global {
    namespace Express {
        interface Request {
            deviceInfo?: DeviceInfo;
            user?: {
                sub: UserId;
                email: string;
                refreshToken: RefreshToken;
                sessionId: SessionId;
            };
        }
    }
}

export { };