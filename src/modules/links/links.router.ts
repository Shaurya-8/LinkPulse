import { Router } from 'express';
import * as controller from './links.controller';
import { optionalAuthenticate } from '../../middleware/auth.middleware';

const linkRouter = Router()

linkRouter.use(optionalAuthenticate);

linkRouter.post('/create',
    controller.create
)

export { linkRouter };