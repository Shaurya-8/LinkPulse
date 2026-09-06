import { prisma } from "../../../config/prisma";
import { DeviceInfo, UserId } from "../../../types";
import { CreateLinkDto } from "./../links.schema";
import { LinkRepository } from "./../links.repository";
import { normalizeUrl } from "./../utils/normalize-url"
import { validateUrl } from "./../utils/validate-url"
import { LinkFeatureResolver } from "./../features/link-feature.resolver.ts";
import { SubscriptionService } from "../../subscription/subscription.service.ts";

export class LinkService {

    subscriptionService = new SubscriptionService();

    async create(dto: CreateLinkDto, device?: DeviceInfo): Promise<String> {

        const validate = validateUrl(dto.longUrl);
        const normlizedUrl = normalizeUrl(dto.longUrl);
        await prisma.$transaction(async (tx) => {
            const subscription =
                await this.subscriptionService.getActive(dto.userId as UserId, tx);

            const feature =
                await this.featureRepository.findByKey("CREATE_LINK", tx);

            const limit =
                await featureLimitRepository.find(subscription.planId, feature.id, tx);

            const usage =
                await featureUsageRepository.find(subscription.id, feature.id, tx);

            createLinkAuthorization.authorize(
                subscription,
                feature,
                limit,
                usage
            );

            await featureUsageRepository.consume(
                subscription.id,
                feature.id,
                limit.limitValue,
                1,
                tx
            );

            return await linkRepository.create(linkData, tx);
        });

    }
}
