import { Router } from 'express';
import { linksController } from './links.controller';
import { authenticate, optionalAuthenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createLink, getLinkById, getLinks, updateLink } from './links.schema';

const router = Router()

// router.use(optionalAuthenticate);

router.post('/create',
    optionalAuthenticate,
    validate({ body: createLink.shape.body }),
    linksController.create
)
router.get('/',
    authenticate,
    validate({ query: getLinks.shape.query }),
    linksController.getAll
)

router.get('/:id', authenticate, validate({ params: getLinkById.shape.params }), linksController.getById);
router.patch('/:id', authenticate, validate({ params: updateLink.shape.params, body: updateLink.shape.body }), linksController.update);
router.delete('/:id', authenticate, linksController.delete);
router.patch('/:id/toggle', authenticate, linksController.toggleStatus);


// Premium-only routes
// router.put('/:id/rules',    authenticate, requirePremium, validate({ params: redirectRuleSchema.shape.params, body: redirectRuleSchema.shape.body }), linksController.setRedirectRules);
// router.post('/:id/ab-test', authenticate, requirePremium, validate({ params: abTestSchema.shape.params, body: abTestSchema.shape.body }), linksController.createAbTest);
// router.post('/bulk',        authenticate, requirePremium, validate({ body: bulkCreateSchema.shape.body }), linksController.bulkCreate);


export { router as linkRouter };