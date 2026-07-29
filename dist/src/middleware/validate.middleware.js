import { ValidationAppError } from "../common/errors/AppError";
import { formatZodError } from "../common/utils/formatZodError";
export function validate(schemas) {
    return (req, _res, next) => {
        req.validated ??= {};
        for (const part of ["body", "params", "query"]) {
            const schema = schemas[part];
            if (!schema)
                continue;
            const result = schema.safeParse(req[part]);
            if (!result.success) {
                return next(new ValidationAppError(formatZodError(result.error)));
            }
            req.validated[part] = result.data;
        }
        next();
    };
}
//# sourceMappingURL=validate.middleware.js.map