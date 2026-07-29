import { LinkService } from "./links.service";
import { BadRequestError } from "../../common/errors/AppError";
import { successResponse } from "../../common/utils/response";
import asyncHandler from "../../common/utils/asyncHandler";
function getDevice(req) {
    const device = req.deviceInfo;
    if (!device) {
        throw new BadRequestError("Unable to get device");
    }
    return device;
}
const linkService = new LinkService();
export const linksController = {
    async create(req, res, next) {
        const device = getDevice(req);
        const user = req.user.sub;
        try {
            const result = await linkService.create(req.validated.body, device, user);
            successResponse(res, result.data, 'link create successfull', 201);
        }
        catch (err) {
            next(err);
        }
    },
    getAll: asyncHandler(async (req, res) => {
        const user = req.user;
        const result = await linkService.getLinks(user.sub, req.validated.query);
        successResponse(res, result.data, 'link sent successfully', 200);
    }),
    getById: asyncHandler(async (req, res) => {
        const device = getDevice(req);
        const userId = req.user.sub;
        const result = await linkService.getLink(req.params.id, userId, device);
        successResponse(res, result.data, 'Link updated successfully', 200);
    }),
    update: asyncHandler(async (req, res) => {
        const device = getDevice(req);
        const user = req.user;
        const inputs = req.query;
        const result = await linkService.updateLink(req.params.id, {
            id: user.sub,
            role: user.role,
        }, inputs, device);
        successResponse(res, result.data, 'Link updated succefully', 200);
    }),
    toggleStatus: asyncHandler(async (req, res) => {
        const device = getDevice(req);
        const userId = req.user.sub;
        const result = await linkService.toggleLinkIsActive(req.params.id, userId, device);
        successResponse(res, result, `Link ${result.data.isActive ? 'activated' : 'deactivated'}`, 200);
    }),
    delete: asyncHandler(async (req, res) => {
        const device = getDevice(req);
        const userId = req.user.sub;
        const result = await linkService.deleteLink(req.params.id, userId);
        successResponse(res, {}, "link deleted successfully", 204);
    })
};
//# sourceMappingURL=links.controller.js.map