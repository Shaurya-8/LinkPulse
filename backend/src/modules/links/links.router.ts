import { Router } from 'express';
import { linksController } from './links.controller';
import { authenticate, optionalAuthenticate, requirePremium } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as linkSchema from './links.schema';
import { limiter } from "../../middleware/rate-limiter"

const router = Router()

// router.use(optionalAuthenticate);

router.post('/create',
    optionalAuthenticate,
    validate({ body: linkSchema.createLink.shape.body }),
    linksController.create
)
router.get('/',
    authenticate,
    validate({ query: linkSchema.getLinks.shape.query }),
    linksController.getAll
)

router.get('/:id', authenticate, validate({ params: linkSchema.getLinkById.shape.params }), linksController.getById);
router.patch('/:id', authenticate, validate({ params: linkSchema.updateLink.shape.params, body: linkSchema.updateLink.shape.body }), linksController.update);
router.delete('/:id', authenticate, linksController.delete);
router.patch('/:id/toggle', authenticate, linksController.toggleStatus);


// Premium-only routes
router.put('/:id/rules', authenticate, requirePremium, validate({ params: linkSchema.redirectRule.shape.params, body: linkSchema.redirectRule.shape.body }), linksController.setRedirectRules);
router.post('/:id/ab-test', authenticate, requirePremium, validate({ params: linkSchema.abTest.shape.params, body: linkSchema.abTest.shape.body }), linksController.createAbTest);
router.post('/bulk', authenticate, requirePremium, validate({ body: linkSchema.bulkCreate.shape.body }), linksController.bulkCreate);


export { router as linkRouter };