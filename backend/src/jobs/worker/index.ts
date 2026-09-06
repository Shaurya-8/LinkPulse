import { createEmailWorker, closeEmailWorker } from './email.worker';
import { createAnalyticsWorker, closeAnalyticWorker } from './analytic.worker';
// import {}from './bulk.work';
import { createWebhookWorker, closeWebhookWorker } from './webhook.worker';

export {
    createEmailWorker, closeEmailWorker,
    createAnalyticsWorker, closeAnalyticWorker,
    createWebhookWorker, closeWebhookWorker
}