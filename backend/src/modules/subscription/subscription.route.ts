import Router from 'express';
import { subscriptionController } from './subscription.controller';
import { authenticate, requirePremium } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as subscriptionSchema from './subscription.schema.ts';

const router = Router();

router.post('/buy',
    authenticate,
    validate({ body: subscriptionSchema.subscriptionSchema.shape.body }),
    subscriptionController.buySubscription
);

router.get('/active',
    authenticate,
    subscriptionController.getActiveSubscription
);

router.get('/user',
    authenticate,
    subscriptionController.getUserSubscriptions
);

router.patch('/change-plan/:subscriptionId',
    authenticate,
    validate({ params: subscriptionSchema.changePlanSchema.shape.params, body: subscriptionSchema.changePlanSchema.shape.body }),
    subscriptionController.changePlan
);

router.patch('/renew/:subscriptionId',
    authenticate,
    validate({ params: subscriptionSchema.renewSubscriptionSchema.shape.params }),
    subscriptionController.renewSubscription
);

router.patch('/cancel/:subscriptionId',
    authenticate,
    validate({ params: subscriptionSchema.cancelSubscriptionSchema.shape.params }),
    subscriptionController.cancelSubscription
);

export { router as subscriptionRouter };
