import { Request, Response, NextFunction } from "express";
import { LinkService } from "./links.service";
import { BadRequestError } from "../../common/errors/AppError";
import { AuthenticatedRequest, DeviceInfo } from "../../types";
import { successResponse } from "../../common/utils/response";
import asyncHandler from "../../common/utils/asyncHandler";
import { CreateLinkInput, GetLinksQuery, UpdateLinkInput } from "./links.schema";

function getDevice(req: Request): DeviceInfo {
    const device = req.deviceInfo;
    if (!device) {
        throw new BadRequestError("Unable to get device");
    }
    return device
}

const linkService = new LinkService();

export const linksController = {

    async create(req: Request, res: Response, next: NextFunction) {
        const device = getDevice(req);
        const user = (req as AuthenticatedRequest).user.sub;
        try {
            const result = await linkService.create(req.validated.body as CreateLinkInput, device, user);

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
        const result = await linkService.getLinks(user.sub, req.validated.query as GetLinksQuery);
        successResponse(res,
            result.data,
            'link sent successfully',
            200
        )
    }),

    getById: asyncHandler(async (req: Request, res: Response) => {
        const device = getDevice(req);
        const userId = (req as AuthenticatedRequest).user.sub;
        const result = await linkService.getLink(req.params.id as string, userId, device);
        successResponse(res,
            result.data,
            'Link updated successfully',
            200
        )
    }),

    update: asyncHandler(async (req: Request, res: Response) => {
        const device = getDevice(req);
        const user = (req as AuthenticatedRequest).user;
        const inputs = req.query;
        const result = await linkService.updateLink(
            req.params.id as string,
            {
                id: user.sub,
                role: user.role,
            },
            inputs as UpdateLinkInput,
            device
        );

        successResponse(res,
            result.data,
            'Link updated succefully',
            200
        )
    }),
    toggleStatus: asyncHandler(async (req: Request, res: Response) => {
        const device = getDevice(req);
        const userId = (req as AuthenticatedRequest).user.sub;
        const result = await linkService.toggleLinkIsActive(req.params.id as string, userId, device);
        successResponse(res,
            result,
            `Link ${result.data.isActive ? 'activated' : 'deactivated'}`,
            200
        );
    }),

    delete: asyncHandler(async (req: Request, res: Response) => {
        const device = getDevice(req);
        const userId = (req as AuthenticatedRequest).user.sub;
        const result = await linkService.deleteLink(req.params.id as string, userId);
        successResponse(res,
            {},
            "link deleted successfully",
            204
        )
    })


}