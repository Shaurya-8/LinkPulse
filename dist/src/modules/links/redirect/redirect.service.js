import { verifyPassword } from "../../../common/utils/crypto";
import { Authorization } from "../../Authorization";
import { enqueueAnalytics } from "../../../jobs/queues/index";
import { Resolver } from "../Resolver";
import { logger } from "../../../common/utils/logger";
import { LinkService } from "../links.service";
import { BadRequestError } from "../../../common/errors/AppError";
import { RedirectType } from "../../../../generated/prisma/enums";
export class Redirect {
    linkService = new LinkService();
    async redirect(shortCode, context, opt) {
        const link = (await this.linkService.getLinkByShortCode(shortCode)).data;
        if (!link) {
            return this.redirectOnPage({ url: `/not-found` }, RedirectType.TEMPORARY);
        }
        ;
        return await this.authorizeAndRevolve(shortCode, link, context, false, opt);
    }
    async redirectPortectedLink(shortCode, password, context, opt) {
        const link = (await this.linkService.getLinkByShortCode(shortCode)).data;
        if (!link) {
            return this.redirectOnPage({ url: `/not-found` }, RedirectType.TEMPORARY);
        }
        if (!link.passwordHash) {
            return this.redirectOnPage({ url: `/${shortCode}` }, link.redirectType);
        }
        const verify = await verifyPassword(password, link.passwordHash);
        if (!verify) {
            throw new BadRequestError("Incorrect Password");
        }
        return await this.authorizeAndRevolve(shortCode, link, context, verify, opt);
    }
    async authorizeAndRevolve(shortCode, link, context, isPasswordVerified, opt) {
        const authorized = await new Authorization().redirectLinkAuthorization(link, isPasswordVerified);
        if (authorized) {
            return { data: { url: authorized, redirectType: RedirectType.TEMPORARY } };
        }
        const result = await new Resolver().resolveRedirectTarget(link, context);
        void enqueueAnalytics({
            linkId: link.id,
            shortCode,
            ...opt,
            clickedAt: new Date().toISOString(),
            variantId: result.variantId,
            abTestId: result.abTestId,
        }).catch(err => logger.error("Failed to enqueue analytics:", err));
        return this.redirectOnPage(result, link.redirectType);
    }
    redirectOnPage(data, redirectType) {
        return {
            data: {
                ...data,
                redirectType,
            }
        };
    }
}
//# sourceMappingURL=redirect.service.js.map