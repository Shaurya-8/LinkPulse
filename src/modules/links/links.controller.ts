import { Request, Response, NextFunction } from "express";
import { LinkService } from "./links.service";
import { BadRequestError } from "../../common/errors/AppError";
import { DeviceInfo, JwtAccessPayload } from "../../types";
import { extractAccessToken } from "../../common/utils/cookies";
import { verifyToken } from "../../common/utils/jwt";
import { config } from "../../config";
import { errorResponse, successResponse } from "../../common/utils/response";

function getDevice(req: Request): DeviceInfo {
    const device = req.deviceInfo;
    if (!device) {
        throw new BadRequestError("Unable to get device");
    }
    return device
}

const linkService = new LinkService();
export async function create(req: Request, res: Response, next: NextFunction) {
    const device = getDevice(req);

    try {
        const result = await linkService.create(req.body, device, req.user?.sub);

        successResponse(res,
            result?.data,
            'link create successfull',
            201
        )
    } catch (err) {
        next(err);
    }
}
type RedirectParams = {
    shortCode: string
}
export async function redirect(
    req: Request<RedirectParams>,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { shortCode } = req.params;

        if (!shortCode) {
            errorResponse(res,
                "Short code is required",
                400
            )
            return;
        }

        // const device = getDevice(req);

        const result = await linkService.redirect(
            shortCode,
            res

        );

        // Permanent redirect
        res.redirect(301, result.longUrl);

        // If you need temporary redirects instead:
        // res.redirect(302, result.longUrl);
    } catch (error) {
        next(error);
    }
}

