import * as z from "zod";
import type { Request, Response, NextFunction } from "express"
import { ValidationAppError } from "../common/errors/AppError"
import { formatZodError } from "../common/utils/formatZodError"
type RequestPart = "body" | "params" | "query";

// export function validate<T extends z.ZodType>(schema: T, part: RequestPart) {
//     return function (req: Request, _res: Response, next: NextFunction) {
//         const result = schema.safeParse(req[part]);
//         console.log("from validate: ", req.params);
//         if (!result.success) {
//             const formatted = formatZodError(result.error);
//             return next(new ValidationAppError(formatted));
//         }
//         req.validated ??= {};
//         req.validated[part] = result.data;
//         next()
//     }
// }

type Schemas = {
  body?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
};

export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.validated ??= {};

    for (const part of ["body", "params", "query"] as const) {
      const schema = schemas[part];
      if (!schema) continue;

      const result = schema.safeParse(req[part]);

      if (!result.success) {
        return next(
          new ValidationAppError(formatZodError(result.error))
        );
      }

      req.validated[part] = result.data;
    }

    next();
  };
}