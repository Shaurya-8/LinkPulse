export function formatZodError(error) {
    return error.issues.map((issue) => ({
        field: issue.path.length > 0 ? issue.path.join(".") : "root",
        message: issue.message,
        code: issue.code,
    }));
}
//# sourceMappingURL=formatZodError.js.map