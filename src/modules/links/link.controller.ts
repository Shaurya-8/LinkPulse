import { Request, Response, NextFunction } from "express";
import { requireDevice } from "./utils";
import * as link from "./link.service";
import { extractAccessToken } from "../../common/utils/cookies";
import { verifyToken } from "../../common/utils/jwt";
import { JwtAccessPayload, UserId } from "../../types";
import { config } from "../../config";

export function create(req: Request, Res: Response, next: NextFunction) {
    const device = requireDevice(req);
    const accessToken = extractAccessToken(req);
    let sub: UserId | undefined;
    if (accessToken) {
        sub = verifyToken<JwtAccessPayload>(accessToken, config.jwt.accessSecret, 'api').sub;
    }
    const result = link.create(req.body, device, sub);

}