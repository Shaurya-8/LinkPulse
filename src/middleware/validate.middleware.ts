import * as z from "zod";
import type { Request, Response, NextFunction } from "express"
import { ValidationAppError } from "../common/errors/AppError"
import { formatZodError } from "../common/utils/formatZodError"
type RequestPart = "body" | "params" | "query";

export function validate<T extends z.ZodType>(schema: T, part: RequestPart) {
    return function (req: Request, _res: Response, next: NextFunction) {
        const result = schema.safeParse(req[part]);
        if (!result.success) {
            const formatted = formatZodError(result.error);
            return next(new ValidationAppError(formatted));
        }
        req[part] = result.data;
        next()
    }
}