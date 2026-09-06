import { Links, Subscriptions, UserRole, Users } from "../../../generated/prisma/client";
import { UpdateLinkInput } from "../links/links.schema";

export class UpdataLinkAuthorization {
    constructor(private readonly link: Links) { }
    authorize(subscription: Subscriptions, role: UserRole, intput: UpdateLinkInput) {

        return true
    }
}