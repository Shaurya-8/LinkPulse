import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AuthenticatedRequest } from '../../types';


type AsyncRequestHandler = (
  req: Request | AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => Promise<void>;


const asyncHandler = (fn: AsyncRequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default asyncHandler;
