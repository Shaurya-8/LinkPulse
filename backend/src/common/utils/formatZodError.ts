import { ZodError } from "zod";
import { ValidationError } from "../../types";

export function formatZodError(error: ZodError): ValidationError[] {
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join(".") : "root",
    message: issue.message,
    code: issue.code,
  }));
}