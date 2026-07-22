import { Router } from 'express';
import { linkController } from './links.controller';
import { authenticate, optionalAuthenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { getLinks } from './links.schema';

const linkRouter = Router()

// linkRouter.use(optionalAuthenticate);

linkRouter.post('/create',
    optionalAuthenticate,
    linkController.create
)
linkRouter.get('/',
    authenticate,
    validate(getLinks, 'query'),
    linkController.getAll
)

export { linkRouter };