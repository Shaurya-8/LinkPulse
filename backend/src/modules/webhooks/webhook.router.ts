import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware"
import { validate } from "../../middleware/validate.middleware"
import * as schema from "./webhooks.schema"
import { webhooksController } from "./webhooks.controller"


const router = Router();

router.use(authenticate);

router.get('/events',
    webhooksController.listEvents
);

router.get('/stats',
    webhooksController.getStats
);

router.get('/',
    webhooksController.list
);

router.post('/',
    validate({ body: schema.createWebhookSchema.shape.body }),
    webhooksController.create
);

router.get(
    '/:webhookId',
    validate({ params: schema.webhookIdParamSchema.shape.params }),
    webhooksController.getById
);

router.patch(
    '/:webhookId',
    validate({
        params: schema.updateWebhookSchema.shape.params,
        body: schema.updateWebhookSchema.shape.body
    }),
    webhooksController.update
);

router.delete(
    '/:webhookId',
    validate({ params: schema.webhookIdParamSchema.shape.params }),
    webhooksController.delete
);

router.post(
    '/:webhookId/rotate-secret',
    validate({ params: schema.webhookIdParamSchema.shape.params }),
    webhooksController.rotateSecret
);

router.get(
    '/:webhookId/deliveries',
    validate({
        params: schema.webhookDeliveriesQuerySchema.shape.params,
        query: schema.webhookDeliveriesQuerySchema.shape.query
    }),
    webhooksController.getDeliveries
);
router.post(
    '/deliveries/:deliveryId/retry',
    webhooksController.retryDelivery
);

export { router as webhooksRouter };