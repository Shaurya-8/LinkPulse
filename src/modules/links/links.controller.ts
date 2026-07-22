import { Request, Response, NextFunction } from "express";
import { LinkService } from "./links.service";
import { BadRequestError } from "../../common/errors/AppError";
import { AuthenticatedRequest, DeviceInfo } from "../../types";
import { errorResponse, successResponse } from "../../common/utils/response";
import asyncHandler from "../../common/utils/asyncHandler";

function getDevice(req: Request): DeviceInfo {
    const device = req.deviceInfo;
    if (!device) {
        throw new BadRequestError("Unable to get device");
    }
    return device
}

const linkService = new LinkService();

export const linkController = {

    async create(req: Request, res: Response, next: NextFunction) {
        const device = getDevice(req);
        const user = (req as AuthenticatedRequest).user?.sub;
        try {
            const result = await linkService.create(req.body, device, user);

            successResponse(res,
                result.data,
                'link create successfull',
                201
            )
        } catch (err) {
            next(err);
        }
    },

    getAll: asyncHandler(async (req: Request, res: Response) => {
        const user = (req as AuthenticatedRequest).user;
        const result = await linkService.getLinks(user.sub, req.validated.query as never);
        successResponse(res,
            result.data,
            'link sent successfully'
        )
    })

}