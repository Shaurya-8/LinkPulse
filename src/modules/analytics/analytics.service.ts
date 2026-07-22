import { cache, cacheKeys } from "../../config/redis";
import { UserId } from "../../types";
import { LinkService } from "../links/links.service";

export class AnalyticsService {

    private _linkService?: LinkService;

    private get linkService() {
        return this._linkService ??= new LinkService();
    }

    
    
 
}